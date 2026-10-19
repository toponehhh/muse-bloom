'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {fixture}=require('./cloudflare-fixture');
const payload=()=>({schemaVersion:1,submissionId:crypto.randomUUID(),consent:true,record:{version:'1.7.0',source:'automated-check',participant:'QA-API',exportedAt:new Date().toISOString(),feedback:{clarity:'4',readability:'3',visuals:'5',enjoyment:'4',continue:'Maybe',friction:"'); DROP TABLE feedback_submissions; --",favorite:'<script>alert(1)</script>'},events:[{action:'session-open',at:new Date().toISOString(),viewport:{width:390,height:844},reducedMotion:true},{action:'look-complete',at:new Date().toISOString(),level:1,score:94,items:['top_cozy_02']}]}});
(async()=>{
  const {mf,db,base}=await fixture();let ip=0,checks=0;
  const post=(body,headers={})=>mf.dispatchFetch(base+'/api/feedback',{method:'POST',headers:{Origin:base,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.'+(++ip),...headers},body:typeof body==='string'?body:JSON.stringify(body)});
  const status=async(response,expected)=>{assert.equal(response.status,expected,await response.clone().text());checks++;return response;};
  try{
    const body=payload();
    const receipts=await Promise.all(Array.from({length:5},()=>post(body)));
    assert.equal(receipts.filter(r=>r.status===201).length,1);
    assert.equal(receipts.filter(r=>r.status===200).length,4);
    const saved=await db.prepare('SELECT * FROM feedback_submissions').all();assert.equal(saved.results.length,1);
    assert.equal(saved.results[0].clarity,4);assert.equal(JSON.parse(saved.results[0].record_json).feedback.friction,body.record.feedback.friction);
    const receipt=await receipts[0].json();assert.equal(receipt.receipt,body.submissionId);assert.ok(Date.parse(receipt.receivedAt));checks+=4;
    body.record.feedback.clarity='1';await status(await post(body),409);
    for(const modify of [p=>{p.consent=false;},p=>{p.record.feedback.clarity=6;},p=>{p.record.feedback.enjoyment={};},p=>{delete p.record.participant;},p=>{p.record.feedback.friction='x'.repeat(2001);},p=>{p.record.events=Array(2001).fill(p.record.events[0]);},p=>{p.record.events[0].at='bad';},p=>{p.record.events[1].level=37;},p=>{p.record.source='human-but-unverified';},p=>{p.record.feedback.continue='Absolutely';}]){
      const invalid=payload();modify(invalid);await status(await post(invalid),400);
    }
    await status(await post('{'),400);
    await status(await post(payload(),{Origin:'https://foreign.example'}),403);
    await status(await post(payload(),{Origin:'null'}),403);
    await status(await post(payload(),{'Sec-Fetch-Site':'cross-site'}),403);
    await status(await post(payload(),{'Content-Type':'text/plain'}),415);
    await status(await post(' '.repeat(512*1024+1)),413);
    await status(await mf.dispatchFetch(base+'/api/feedback'),405);
    await status(await mf.dispatchFetch(base+'/api/unknown'),404);
    const extra=payload();extra.record.email='not-for-storage@example.invalid';extra.record.events[0].ip='not-for-storage';
    const accepted=await status(await post(extra),201);assert.equal(accepted.headers.get('Cache-Control'),'no-store');assert.equal(accepted.headers.get('Access-Control-Allow-Origin'),null);
    const stored=await db.prepare('SELECT record_json FROM feedback_submissions WHERE submission_id=?').bind(extra.submissionId).first();assert.ok(!stored.record_json.includes('not-for-storage'));checks++;
    // Exercise the configured limiter without storing 60 extra records.
    let limited;
    for(let i=0;i<65;i++){limited=await post('{',{'CF-Connecting-IP':'192.0.2.250'});if(limited.status===429)break;}
    await status(limited,429);assert.equal(limited.headers.get('Retry-After'),'60');
    await db.prepare('DROP TABLE feedback_submissions').run();
    const unavailable=await status(await post(payload()),503);assert.ok(!(await unavailable.text()).includes('no such table'));
    console.log('PASS: '+checks+' Worker/D1 API assertions; concurrent retries, validation, origin, size, rate limit and storage failure');
  }finally{await mf.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
