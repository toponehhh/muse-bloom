'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture}=require('./cloudflare-fixture'),A=require('../js/feedback-attachments');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvN8AAAAASUVORK5CYII=','base64');
// This fixture exercises the MP4 container signature, not playback/codec validation.
const mp4=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(12)]);
const descriptor=(bytes,type='image/png',name='issue.png')=>({id:crypto.randomUUID(),name,type,size:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
const payload=(files=[descriptor(png)])=>({schemaVersion:1,submissionId:crypto.randomUUID(),uploadToken:crypto.randomUUID(),consent:true,attachments:files,record:{version:'1.8.0',source:'automated-check',testType:'automated',participant:'QA-FILES',exportedAt:new Date().toISOString(),feedback:{clarity:'4',readability:'4',visuals:'4',enjoyment:'4',continue:'Maybe'},events:[]}});
(async()=>{
  const {readBytes,cleanupUploads,uploadFile}=await import('../cloudflare/attachments.mjs');
  for(const [files,code] of [
    [[{type:'image/png',size:0}],'empty'],[[{type:'image/svg+xml',size:10}],'type'],
    [[{type:'image/png',size:A.limits.image+1}],'size'],[[{type:'video/mp4',size:A.limits.video+1}],'size'],
    [Array(4).fill({type:'image/png',size:1}),'count'],[Array(2).fill({type:'video/mp4',size:A.limits.video}),'total']
  ])assert.throws(()=>A.checkFiles(files),e=>e.code===code);
  A.checkFiles([{type:'image/png',size:A.limits.image},{type:'image/jpeg',size:A.limits.image},{type:'video/mp4',size:A.limits.video}]);
  assert.equal(A.fileType({type:'',name:'iPhone.MOV'}),'video/quicktime');
  let cancelled=false;
  const stream=new ReadableStream({pull(controller){controller.enqueue(new Uint8Array(5));},cancel(){cancelled=true;}});
  await assert.rejects(()=>readBytes(new Request('https://example.invalid',{method:'PUT',body:stream,duplex:'half'}),4),e=>e.status===413);
  assert.equal(cancelled,true,'Chunked uploads must enforce the byte limit and stop reading');
  const {mf,db,bucket,base}=await fixture();let ip=0,checks=8;
  const headers=()=>({Origin:base,'CF-Connecting-IP':'192.0.2.'+(++ip)});
  const post=(body,path='/api/feedback',extra={})=>mf.dispatchFetch(base+path,{method:'POST',headers:{...headers(),'Content-Type':'application/json',...extra},body:JSON.stringify(body)});
  const put=(p,bytes,index=0,extra={})=>mf.dispatchFetch(base+'/api/feedback/uploads/'+p.submissionId+'/'+p.attachments[index].id,{method:'PUT',headers:{...headers(),'Content-Type':p.attachments[index].type,Authorization:'Bearer '+p.uploadToken,...extra},body:bytes});
  const status=async(promise,expected)=>{const r=await promise;assert.equal(r.status,expected,await r.clone().text());checks++;return r;};
  const prepare=p=>status(post(p,'/api/feedback/uploads'),200);
  const key=(p,i=0)=>'feedback/'+p.submissionId+'/'+p.attachments[i].id+'.'+A.types[p.attachments[i].type];
  try{
    const p=payload([descriptor(png),descriptor(mp4,'video/mp4','screen.mp4')]);
    await status(post(p),403);
    await status(post({...p,consent:false},'/api/feedback/uploads'),400);
    for(const files of [[{...p.attachments[0],size:A.limits.image+1}],Array(4).fill(p.attachments[0])])await status(post(payload(files),'/api/feedback/uploads'),413);
    for(const files of [[{...p.attachments[0],name:'../secret.png'}],[p.attachments[0],p.attachments[0]],[{...p.attachments[0],type:'text/html'}]])await status(post(payload(files),'/api/feedback/uploads'),400);
    await prepare(p);await prepare(p);
    const withoutFiles={...p};delete withoutFiles.attachments;delete withoutFiles.uploadToken;
    await status(post(withoutFiles),409);
    await status(post({...p,uploadToken:crypto.randomUUID()},'/api/feedback/uploads'),403);
    await status(post({...p,record:{...p.record,feedback:{...p.record.feedback,clarity:'1'}}},'/api/feedback/uploads'),409);
    await status(post(p),409);
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,0);
    await status(put(p,png,0,{Authorization:'Bearer '+crypto.randomUUID()}),403);
    await status(put(p,png,0,{Origin:'https://foreign.invalid'}),403);
    await status(put(p,png,0,{'Content-Type':'text/plain'}),415);
    await status(put(p,Buffer.concat([png,Buffer.from('extra')])),413);
    await status(put(p,png.subarray(1)),400);
    await status(put(p,Buffer.alloc(png.length)),415);
    const corrupted=Buffer.from(png);corrupted[30]^=1;await status(put(p,corrupted),400);
    await status(put(p,png),200);
    assert.equal((await bucket.head(key(p))).httpMetadata.contentType,'image/png');
    assert.deepEqual(Buffer.from(await (await bucket.get(key(p))).arrayBuffer()),png);
    const progress=await (await prepare(p)).json();assert.deepEqual(progress.uploaded,[p.attachments[0].id]);
    await status(post(p),409,'A partial attachment set is not a submitted report');
    await status(put(p,mp4,1),200);
    const receipts=await Promise.all(Array.from({length:5},()=>post(p)));
    assert.equal(receipts.filter(r=>r.status===201).length,1);assert.equal(receipts.filter(r=>r.status===200).length,4);checks+=2;
    const row=await db.prepare('SELECT * FROM feedback_submissions WHERE submission_id=?').bind(p.submissionId).first();
    const saved=JSON.parse(row.record_json);assert.equal(saved.attachments.length,2);assert.equal(saved.attachments[0].objectKey,key(p));
    assert.ok(!row.record_json.includes(p.uploadToken));assert.equal(row.test_type,'automated');
    const etag=(await bucket.head(key(p))).etag;await status(put(p,png),200);assert.equal((await bucket.head(key(p))).etag,etag);
    await status(post({...p,attachments:[{...p.attachments[0],name:'changed.png'},p.attachments[1]]}),409);
    await status(mf.dispatchFetch(base+'/api/feedback/uploads/'+p.submissionId+'/'+p.attachments[0].id),405);
    // Fail after R2 succeeds; retry must repair D1 without duplicating the object.
    const retry=payload();await prepare(retry);
    await db.prepare(`CREATE TRIGGER fail_attachment BEFORE INSERT ON feedback_attachments
      WHEN NEW.submission_id='${retry.submissionId}' BEGIN SELECT RAISE(ABORT,'test unavailable'); END`).run();
    await status(put(retry,png),503);assert.ok(await bucket.head(key(retry)));
    await db.prepare('DROP TRIGGER fail_attachment').run();await status(put(retry,png),200);
    await db.prepare(`CREATE TRIGGER fail_feedback BEFORE INSERT ON feedback_submissions
      WHEN NEW.submission_id='${retry.submissionId}' BEGIN SELECT RAISE(ABORT,'test unavailable'); END`).run();
    await status(post(retry),503);
    assert.equal((await db.prepare('SELECT committed_at FROM feedback_upload_batches WHERE submission_id=?').bind(retry.submissionId).first()).committed_at,null);
    await db.prepare('DROP TRIGGER fail_feedback').run();await status(post(retry),201);
    // An R2 outage must not create a successful attachment row.
    const broken=payload();await prepare(broken);
    await assert.rejects(()=>uploadFile(new Request(base,{method:'PUT',headers:{Authorization:'Bearer '+broken.uploadToken,'Content-Type':'image/png'},body:png}),broken.submissionId,broken.attachments[0].id,{DB:db,FEEDBACK_FILES:{put(){throw new Error('unavailable');}}}));
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_attachments WHERE submission_id=?').bind(broken.submissionId).first()).n,0);
    // Expired uploads are rejected, then cleaned after a grace day; committed files survive.
    const abandoned=payload();await prepare(abandoned);await status(put(abandoned,png),200);
    const old=new Date(Date.now()-3*86400000).toISOString();
    await db.prepare('UPDATE feedback_upload_batches SET expires_at=?').bind(old).run();
    await status(put(abandoned,png),410);await status(post(abandoned),410);
    await status(post(p),200);await prepare(p);
    assert.equal(await cleanupUploads({DB:db,FEEDBACK_FILES:bucket}),2);
    assert.equal(await bucket.head(key(abandoned)),null);assert.ok(await bucket.head(key(p)));assert.ok(await bucket.head(key(retry)));
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_attachments WHERE submission_id=?').bind(abandoned.submissionId).first()).n,0);
    // Per-IP upload-session allowance is separate from the ordinary text endpoint.
    let limited;
    for(let i=0;i<7;i++){limited=await post(payload(),'/api/feedback/uploads',{'CF-Connecting-IP':'198.51.100.10'});if(limited.status===429)break;}
    assert.equal(limited.status,429);checks++;
    console.log('PASS: '+checks+' attachment checks: limits, signatures, authorization, private R2/D1 linkage, partial failures, idempotency, expiry and cleanup ('+(process.env.MUSE_CF_TARGET||'worker')+')');
  }finally{await mf.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1;});
