'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fixture}=require('./cloudflare-fixture');
(async()=>{
  const {mf,db,base}=await fixture(false,'0001_feedback.sql');
  try{
    const {validate}=await import('../cloudflare/worker.mjs');
    const id=crypto.randomUUID(),time='2026-10-19T01:00:00.000Z';
    const payload={schemaVersion:1,submissionId:id,consent:true,record:{version:'1.7.0',source:'manual-feedback',participant:'LEGACY',exportedAt:time,feedback:{clarity:'4',readability:'4',visuals:'4',enjoyment:'4',continue:'Yes'},events:[]}};
    const json=JSON.stringify(validate(payload).record),hash=crypto.createHash('sha256').update(json).digest('hex');
    await db.prepare('INSERT INTO feedback_submissions VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,hash,time,'LEGACY','1.7.0','manual-feedback',4,4,4,4,'Yes',json).run();
    const migration=['0002_feedback_kind.sql','0003_feedback_attachments.sql'].map(file=>fs.readFileSync(path.join(__dirname,'../cloudflare/migrations',file),'utf8')).join('\n');
    await db.batch(migration.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
    const row=await db.prepare('SELECT * FROM feedback_submissions WHERE submission_id=?').bind(id).first();
    assert.equal(row.record_json,json);assert.equal(row.payload_hash,hash);assert.equal(row.test_type,'unverified');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM human_feedback_submissions').first()).n,0);
    const response=await mf.dispatchFetch(base+'/api/feedback',{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true,receipt:id,receivedAt:time});
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
    console.log('PASS: existing D1 feedback, payload hashes and retry receipts survive classification and attachment migrations');
  }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
