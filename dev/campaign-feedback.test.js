'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{fixture}=require('./cloudflare-fixture');
const release=require('../demos/style-lab/release.json');
const live=process.env.MUSE_FEEDBACK_URL;
const out=path.resolve(process.env.MUSE_FEEDBACK_ARTIFACTS||path.join(__dirname,'../artifacts/campaign-feedback'+(live?'-live':'')));
const report={kind:'automated-check',startedAt:new Date().toISOString(),version:release.version,scope:live?'hosted frontend with intercepted API responses; no live submissions':'isolated Pages/Worker/D1',checks:[],errors:[]};
let browser,runtime,base;
const pass=message=>{report.checks.push(message);console.log('PASS:',message);};
async function fill(page){
  for(const name of ['clarity','readability','visuals','enjoyment'])await page.locator(`[name="${name}"]`).selectOption('4');
  await page.locator('[name="continue"]').selectOption('Maybe');
  await page.locator('[name="friction"]').fill('Automated modal regression, not a human playtest.');
}
async function dismissed(page,receipt,width){
  await page.waitForFunction(()=>document.querySelector('.feedback-status')?.dataset.state==='success');
  await page.screenshot({path:path.join(out,`response-${width}.png`)});
  await page.waitForFunction(()=>!document.querySelector('#feedback').open,null,{timeout:5000});
  assert.equal(await page.locator('#feedback').isVisible(),false,'Closed dialog must also be visually hidden');
  assert.equal(await page.locator('dialog:modal').count(),0,'No modal remains in the top layer');
  assert.match(await page.locator('#feedback-receipt').innerText(),new RegExp(receipt.receipt));
  assert.equal(await page.locator('#feedback-receipt').getAttribute('role'),'status');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'feedback-open','Focus returns to the enabled opener');
  assert.equal(await page.locator('#feedback form').getAttribute('aria-busy'),null);
  await page.locator('[data-category="bottom"]').click();
  assert.equal(await page.locator('[data-category="bottom"]').getAttribute('aria-pressed'),'true','No invisible backdrop intercepts game controls');
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  if(live){base=new URL(live).origin;assert.equal(new URL(base).protocol,'https:');}
  else{process.env.MUSE_CF_TARGET='pages';runtime=await fixture(true,'9999','dist/style-room-pages');base=runtime.base;}
  report.url=base;
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
  report.browser=browser.version();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();
    page.setDefaultTimeout(30000);page.on('pageerror',error=>report.errors.push(error.message));
    let mode='failure',posts=0,releaseRequest,startedRequest;
    const started=new Promise(resolve=>{startedRequest=resolve;});
    const held=new Promise(resolve=>{releaseRequest=resolve;});
    // Even hosted runs intercept every API write. Only the local fixture receives real POSTs.
    await page.route('**/api/**',async route=>{
      assert.equal(new URL(route.request().url()).pathname,'/api/feedback');
      assert.equal(route.request().method(),'POST');posts++;
      const body=route.request().postDataJSON();
      if(mode==='failure')return route.fulfill({status:503,json:{error:'Synthetic failure'}});
      if(mode==='invalid')return route.fulfill({status:200,json:{ok:true,receipt:'wrong-id',receivedAt:new Date().toISOString()}});
      if(mode==='pending'){startedRequest();await held;}
      if(live)return route.fulfill({status:mode==='success-200'?200:201,json:{ok:true,receipt:body.submissionId,receivedAt:new Date().toISOString()}});
      return route.continue();
    });
    try{
      await page.goto(base+'/?qa=1');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
      assert.equal(await page.evaluate(()=>typeof window.__campaign),'undefined');
      const build=await(await context.request.get(base+'/build.json')).json();
      assert.equal(build.version,release.version);report.sourceCommit=build.sourceCommit;
      report.serviceWorkers=await page.evaluate(async()=>({registered:(await navigator.serviceWorker.getRegistrations()).length,controlled:!!navigator.serviceWorker.controller,cacheKeys:await caches.keys()}));
      assert.equal(report.serviceWorkers.registered,0);assert.equal(report.serviceWorkers.controlled,false);
      await page.locator('#feedback-open').click();await fill(page);
      const submit=page.locator('#feedback [type=submit]');
      await submit.click();assert.match(await page.locator('.feedback-status').innerText(),/consent/);assert.equal(posts,0);
      await page.locator('[name=consent]').check();await submit.click();
      await page.locator('.feedback-status[data-state=error]').waitFor();
      assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true);
      assert.equal(await page.locator('[name=clarity]').inputValue(),'4');
      mode='invalid';await submit.click();await page.locator('.feedback-status[data-state=error]').waitFor();
      assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true,'Unvalidated 200 must not dismiss');
      assert.equal(await page.locator('#feedback-receipt').isVisible(),false);
      mode='pending';const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/feedback'&&[200,201].includes(r.status()));
      await submit.click();await started;
      assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true);assert.equal(await submit.isDisabled(),true);
      releaseRequest();const receipt=await(await response).json();
      await dismissed(page,receipt,viewport.width);
      pass(`${viewport.width}: valid receipt closes the modal, removes backdrop, preserves visible receipt and restores focus; pending/error/invalid receipts stay open`);
      await page.locator('#feedback-open').click();assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true);
      assert.equal(await page.locator('[name=clarity]').inputValue(),'4');
      const before=posts;await submit.click();await dismissed(page,receipt,viewport.width);assert.equal(posts,before,'Confirmed duplicate uses the stored receipt');
      await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
      await page.locator('#feedback-open').click();assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true,'Restored receipt must not close while reading it');
      await page.locator('[name=consent]').check();await submit.click();await dismissed(page,receipt,viewport.width);assert.equal(posts,before);
      await page.locator('#feedback-open').click();await page.locator('[name=favorite]').fill('Revised automated answer');
      mode='success-200';const updated=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/feedback'&&[200,201].includes(r.status()));
      await submit.click();const newReceipt=await(await updated).json();assert.notEqual(newReceipt.receipt,receipt.receipt);await dismissed(page,newReceipt,viewport.width);
      pass(`${viewport.width}: reopening, stored-receipt resubmission, reload and edited-answer submission remain usable without duplicates`);
      if(runtime){const row=await runtime.db.prepare('SELECT game_version,test_type FROM feedback_submissions WHERE submission_id = ?').bind(newReceipt.receipt).first();assert.deepEqual({...row},{game_version:release.version,test_type:'automated'});}
    }finally{releaseRequest();await context.close();}
  }
  if(runtime){
    assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,4);
    const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true}),page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    await page.route(base+'/?qa=1',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace('<meta name="muse-feedback-endpoint" content="/api/feedback">','')});});
    try{
      await page.goto(base+'/?qa=1');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
      await page.locator('#feedback-open').click();await fill(page);
      const download=page.waitForEvent('download');await page.locator('#feedback [type=submit]').click();await download;
      assert.equal(await page.locator('#feedback').evaluate(el=>el.open),true);assert.equal(await page.locator('.feedback-status').getAttribute('data-state'),'downloaded');
      assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,4);
      pass('Offline JSON export stays open and creates no submission; local successful retries persist exactly four automated records');
    }finally{await context.close();}
  }
  assert.deepEqual(report.errors,[]);report.result='passed';
})().catch(error=>{report.result='failed';report.failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
  report.finishedAt=new Date().toISOString();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await browser?.close();await runtime?.mf.dispose();
});
