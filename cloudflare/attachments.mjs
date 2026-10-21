import '../js/feedback-attachments.js';

const A=globalThis.MuseFeedbackAttachments;
const DAY=24*60*60*1000;
export class InputError extends Error {
  constructor(message,status=400){super(message);this.status=status;}
}
export const sha256=async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
const hashText=value=>sha256(new TextEncoder().encode(value));
export async function readBytes(request,max){
  if(Number(request.headers.get('Content-Length'))>max)throw new InputError('Request is too large',413);
  const reader=request.body?.getReader();
  if(!reader)throw new InputError('Request body is required');
  const chunks=[];let size=0;
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;
    if(size>max){await reader.cancel();throw new InputError('Request is too large',413);}
    chunks.push(value);
  }
  const bytes=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return bytes;
}
function requireStorage(env){if(!env.FEEDBACK_FILES)throw new InputError('Attachment uploads are temporarily unavailable',503);}
function describe(input,record){
  if(!A.uuid.test(input.uploadToken))throw new InputError('An upload token is required');
  let files;
  try{files=A.manifest(input.attachments);}catch(error){throw new InputError('Invalid attachments: '+error.code,['size','total','count'].includes(error.code)?413:400);}
  return {files,canonical:JSON.stringify({record,attachments:files})};
}
const objectKey=(id,file)=>'feedback/'+id+'/'+file.id+'.'+A.types[file.type];
async function authorize(env,id,token){
  if(!A.uuid.test(token||''))throw new InputError('Invalid upload authorization',403);
  const batch=await env.DB.prepare('SELECT * FROM feedback_upload_batches WHERE submission_id=?').bind(id).first();
  if(!batch||batch.token_hash!==await hashText(token))throw new InputError('Invalid upload authorization',403);
  if(!batch.committed_at&&Date.parse(batch.expires_at)<=Date.now())throw new InputError('Upload session expired. Submit again with a new session.',410);
  return batch;
}
export async function prepareUploads(input,record,env){
  requireStorage(env);
  const {files,canonical}=describe(input,record),id=input.submissionId.toLowerCase();
  const hash=await hashText(canonical),tokenHash=await hashText(input.uploadToken);
  const now=new Date().toISOString(),expiry=new Date(Date.now()+DAY).toISOString();
  await env.DB.prepare(`INSERT INTO feedback_upload_batches
    (submission_id,token_hash,manifest_hash,manifest_json,created_at,expires_at) SELECT ?,?,?,?,?,?
    WHERE NOT EXISTS (SELECT 1 FROM feedback_submissions WHERE submission_id=?)
    ON CONFLICT(submission_id) DO NOTHING`).bind(id,tokenHash,hash,JSON.stringify(files),now,expiry,id).run();
  const batch=await authorize(env,id,input.uploadToken);
  if(batch.manifest_hash!==hash)throw new InputError('Upload session does not match this feedback',409);
  const uploaded=await env.DB.prepare('SELECT attachment_id FROM feedback_attachments WHERE submission_id=?').bind(id).all();
  return {ok:true,submissionId:id,expiresAt:batch.expires_at,uploaded:uploaded.results.map(row=>row.attachment_id)};
}
export async function uploadFile(request,id,fileId,env){
  requireStorage(env);
  const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
  const batch=await authorize(env,id,token),file=JSON.parse(batch.manifest_json).find(f=>f.id===fileId);
  if(!file)throw new InputError('Unknown attachment',404);
  const type=request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();
  if(type!==file.type)throw new InputError('File type does not match',415);
  const bytes=await readBytes(request,file.size);
  if(bytes.byteLength!==file.size)throw new InputError('Incomplete attachment');
  if(!A.matches(bytes,type))throw new InputError('File content does not match its type',415);
  if(await sha256(bytes)!==file.sha256)throw new InputError('Attachment checksum does not match');
  // Completed objects are immutable; validating retries must never overwrite them.
  if(batch.committed_at)return {ok:true,id:file.id};
  if(Date.parse(batch.expires_at)<=Date.now())throw new InputError('Upload session expired',410);
  const key=objectKey(id,file);
  await env.FEEDBACK_FILES.put(key,bytes,{
    onlyIf:{etagDoesNotMatch:'*'},sha256:file.sha256,
    httpMetadata:{contentType:type,contentDisposition:'attachment; filename="'+file.id+'.'+A.types[type]+'"',cacheControl:'private, no-store'},
    customMetadata:{submissionId:id,sha256:file.sha256}
  });
  // A lost response or D1 failure can be retried against the same immutable key.
  const object=await env.FEEDBACK_FILES.head(key);
  if(!object||object.size!==file.size||object.customMetadata?.sha256!==file.sha256)throw new Error('Attachment storage did not confirm');
  await env.DB.prepare(`INSERT INTO feedback_attachments
    (submission_id,attachment_id,object_key,original_name,content_type,size_bytes,sha256,uploaded_at)
    VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(submission_id,attachment_id) DO NOTHING`)
    .bind(id,file.id,key,file.name,type,file.size,file.sha256,new Date().toISOString()).run();
  return {ok:true,id:file.id};
}
export async function attachToRecord(input,record,env){
  if(input.attachments===undefined){
    if(input.uploadToken!==undefined)throw new InputError('Missing attachment manifest');
    const reserved=await env.DB.prepare('SELECT 1 FROM feedback_upload_batches WHERE submission_id=?').bind(input.submissionId.toLowerCase()).first();
    if(reserved)throw new InputError('This submission has reserved attachments. Use a new ID to submit without files.',409);
    return record;
  }
  requireStorage(env);
  const {files,canonical}=describe(input,record),id=input.submissionId.toLowerCase();
  const batch=await authorize(env,id,input.uploadToken);
  if(batch.manifest_hash!==await hashText(canonical))throw new InputError('Upload session does not match this feedback',409);
  const rows=await env.DB.prepare('SELECT * FROM feedback_attachments WHERE submission_id=?').bind(id).all();
  if(rows.results.length!==files.length)throw new InputError('Upload all attachments before submitting',409);
  for(const file of files){
    const object=await env.FEEDBACK_FILES.head(objectKey(id,file));
    if(!object||object.size!==file.size||object.customMetadata?.sha256!==file.sha256)throw new InputError('An attachment could not be confirmed. Please retry.',503);
  }
  return {...record,attachments:files.map(file=>({...file,objectKey:objectKey(id,file)}))};
}
export async function cleanupUploads(env,now=Date.now()){
  requireStorage(env);
  // The extra day gives in-flight requests a full grace period. Never delete a
  // finalized report's files, even if a prior finalize response was lost.
  const batches=await env.DB.prepare(`SELECT submission_id,manifest_json FROM feedback_upload_batches b
    WHERE committed_at IS NULL AND expires_at < ?
    AND NOT EXISTS (SELECT 1 FROM feedback_submissions s WHERE s.submission_id=b.submission_id)
    ORDER BY expires_at LIMIT 100`).bind(new Date(now-DAY).toISOString()).all();
  for(const batch of batches.results){
    await env.FEEDBACK_FILES.delete(JSON.parse(batch.manifest_json).map(file=>objectKey(batch.submission_id,file)));
    await env.DB.prepare('DELETE FROM feedback_upload_batches WHERE submission_id=? AND committed_at IS NULL').bind(batch.submission_id).run();
  }
  return batches.results.length;
}
