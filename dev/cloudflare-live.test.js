'use strict';
// Explicit opt-in: this creates ONE clearly automated feedback row on the live site.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/cloudflare-live');
const input=process.env.MUSE_CF_URL;
if(!input||new URL(input).protocol!=='https:')throw new Error('Set MUSE_CF_URL to the deployed HTTPS Pages origin.');
const base=new URL(input).origin,manifest=JSON.parse(fs.readFileSync(path.join(root,'dist/cloudflare-pages/build.json'),'utf8'));
const report={source:'automated-check',target:base,sourceCommit:manifest.sourceCommit,version:manifest.version,checks:[],errors:[]};
let browser;
const pass=message=>{report.checks.push(message);console.log('PASS:',message);};
async function dress(page){
  await page.locator('.salon-home').waitFor();
  await page.locator('.home-actions [data-action="play"]').click();
  for(const [category,id] of [['top','top_cozy_02'],['bottom','bottom_casual_01'],['shoes','shoes_casual_01'],['hair','hair_casual_01']]){
    await page.locator('[data-action="category"][data-category="'+category+'"]').click();
    await page.locator('[data-action="equip"][data-item="'+id+'"]').click();
  }
  await page.locator('[data-action="score"]').click();await page.locator('#score-number').waitFor();
  assert.equal(await page.locator('#score-number').innerText(),'94');
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
  browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const metadata=await context.request.get(base+'/build.json');assert.equal(metadata.status(),200);
  assert.deepEqual(await metadata.json(),manifest,'Live Pages build must exactly match the tested artifact');
  for(const file of manifest.files){
    const result=await context.request.get(base+'/'+file.file);assert.equal(result.status(),200);
    assert.equal(crypto.createHash('sha256').update(await result.body()).digest('hex'),file.sha256);
  }
  pass('Live version, source commit and all three public file hashes match the deployment artifact');
  for(const [width,height] of [[1440,900],[390,844]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.goto(base+'/');await dress(page);
    assert.equal(await page.evaluate(()=>MusePlaytest.active),false);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,'game-'+width+'.png'),fullPage:true});await page.close();
  }
  pass('Live desktop and phone layouts launch and complete a 94-point outfit');
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(base+'/playtest/Muse-Bloom.html?playtest=1&fresh=1&qa=1');await dress(page);
  await page.locator('[data-action="feedback"]').first().click();
  for(const key of ['clarity','readability','visuals','enjoyment'])await page.locator('[name="'+key+'"]').selectOption('4');
  await page.locator('[name="continue"]').selectOption('Maybe');
  await page.locator('[name="favorite"]').fill('Automated deployment verification; not human feedback.');
  await page.locator('[name="consent"]').check();
  const sent=page.waitForRequest(request=>request.url()===base+'/api/feedback'&&request.method()==='POST');
  const received=page.waitForResponse(response=>response.url()===base+'/api/feedback'&&response.request().method()==='POST');
  await page.locator('#playtest-feedback [type="submit"]').click();
  const request=await sent,response=await received,payload=request.postDataJSON();
  assert.equal(response.status(),201,await response.text());
  const receipt=await response.json();assert.equal(receipt.receipt,payload.submissionId);
  await page.locator('.feedback-status[data-state="success"]').waitFor();
  assert.match(await page.locator('.feedback-status').innerText(),new RegExp(receipt.receipt));
  assert.equal(payload.record.source,'automated-check');assert.equal(payload.record.testType,'automated');
  assert.ok(payload.record.events.some(event=>event.action==='goal-met'));
  const retry=await context.request.post(base+'/api/feedback',{headers:{Origin:base},data:payload});
  assert.equal(retry.status(),200);assert.deepEqual(await retry.json(),receipt);
  report.receipt=receipt.receipt;report.participant=payload.record.participant;
  report.eventCount=payload.record.events.length;
  pass('Live feedback returns a receipt, retains goal events and repeats the same receipt on retry');
  await page.screenshot({path:path.join(out,'feedback-receipt.png'),fullPage:true});
  const guide=await context.newPage();await guide.setViewportSize({width:390,height:844});
  await guide.goto(base+'/playtest/?qa=1');await guide.locator('#fallback').waitFor();
  assert.equal(await guide.evaluate(()=>MuseFeedback.online),true);
  assert.equal(await guide.locator('[name="testType"]').inputValue(),'automated');
  assert.ok(await guide.locator('[name="consent"]').isVisible());
  await guide.screenshot({path:path.join(out,'feedback-guide-mobile.png'),fullPage:true});
  assert.deepEqual(report.errors,[]);report.status='passed';
  console.log('Live automated receipt:',report.receipt);
})().catch(error=>{report.status='failed';report.errors.push(error.stack);console.error(error);process.exitCode=1;})
  .finally(async()=>{await browser?.close();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));});
