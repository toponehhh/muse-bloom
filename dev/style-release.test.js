'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{fixture}=require('./cloudflare-fixture');
const release=require('../demos/style-lab/release.json');
const live=process.env.MUSE_STYLE_URL;
const out=path.resolve(__dirname,'../artifacts/style-release'+(live?'-live':''));
const checks=[],errors=[];let browser,runtime,receipt,base;
const pass=message=>{checks.push(message);console.log('PASS: '+message);};
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvN8AAAAASUVORK5CYII=','base64');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  if(live){base=new URL(live).origin;assert.equal(new URL(base).protocol,'https:');}
  else {process.env.MUSE_CF_TARGET='pages';runtime=await fixture(true,'9999','dist/style-room-pages');base=runtime.base;}
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/?test=1&qa=1');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  const build=await(await context.request.get(base+'/build.json')).json();assert.equal(build.version,release.version);assert.equal(build.channel,'style-room');
  assert.equal(await page.evaluate(()=>window.MuseFeedback.online),true);
  // A custom look is savable, but cannot complete an unrelated theme.
  await page.locator('[data-theme="1"]').click();await page.locator('#save').click();
  assert.match(await page.locator('#result-progress').innerText(),/0 of 3/);await page.locator('#keep-styling').click();
  for(let theme=0;theme<3;theme++){
    await page.locator(`[data-theme="${theme}"]`).click();
    await page.locator('[data-tab="tops"]').click();await page.locator(`[data-item="${theme}"]`).click();
    await page.locator('[data-tab="bottoms"]').click();await page.locator(`[data-item="${theme}"]`).click();
    await page.locator('#save').click();
    assert.equal((await page.evaluate(()=>window.__styleLab.snapshot().completed)).length,theme+1);
    if(theme<2){await page.locator('#next-theme').click();assert.equal(await page.locator('#brief-name').innerText(),theme===0?'Pastel hour':'Gallery day');}
    else{assert.equal(await page.locator('#next-theme').isVisible(),false);await page.screenshot({path:path.join(out,'completed-edit.png')});await page.locator('#keep-styling').click();}
  }
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  assert.deepEqual(await page.evaluate(()=>{const s=window.__styleLab.snapshot();return [s.state.top,s.state.bottom,s.completed.length];}),[2,2,3]);
  await page.locator('[data-tab="saved"]').click();await page.locator('[data-saved="1"]').click();await page.locator('#wear-look').click();
  assert.deepEqual(await page.evaluate(()=>[window.__styleLab.state.top,window.__styleLab.state.bottom,window.__styleLab.state.theme]),[1,1,1]);
  const count=await page.locator('#saved-count').innerText();await page.locator('#save').click();await page.locator('#keep-styling').click();assert.equal(await page.locator('#saved-count').innerText(),count);
  pass('Three themes, completion without false awards, next-theme flow, outfit/progress reload, wear saved looks and duplicate-save handling');
  await page.screenshot({path:path.join(out,'desktop-release.png'),fullPage:true});
  await page.locator('#feedback-open').click();
  for(const [width,height] of [[1440,1000],[800,600],[390,844],[320,568],[667,375]]){
    await page.setViewportSize({width,height});
    const box=await page.locator('#feedback [type=submit]').boundingBox();
    assert.ok(box.y>=0&&box.y+box.height<=height,'Feedback actions must remain in view');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(out,`feedback-${width}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  const picker=page.locator('input[type=file]'),submit=page.locator('#feedback [type=submit]');
  await picker.setInputFiles({name:'too-large.png',mimeType:'image/png',buffer:Buffer.alloc(5*1024*1024+1)});
  await page.waitForFunction(()=>document.querySelector('.feedback-upload-status').textContent.includes('5 MB'));
  assert.equal(await page.locator('.feedback-attachment-list li').count(),0);
  await picker.setInputFiles([
    {name:'automated-style-check.png',mimeType:'image/png',buffer:png},
    {name:'automated-style-check.webm',mimeType:'video/webm',buffer:fs.readFileSync(path.join(__dirname,'fixtures/feedback-valid.webm'))}
  ]);
  await page.waitForFunction(()=>document.querySelectorAll('.feedback-attachment-list li').length===2);
  for(const field of ['clarity','readability','visuals','enjoyment'])await page.locator(`[name="${field}"]`).selectOption('4');
  await page.locator('[name="continue"]').selectOption('Maybe');
  await page.locator('[name="friction"]').fill('Automated Style Room deployment check, not a real player review.');
  await submit.click();assert.match(await page.locator('.feedback-status').innerText(),/consent/);
  assert.equal(await page.locator('[name=testType]').inputValue(),'automated');
  await page.locator('[name=consent]').check();
  // Local fault injection proves drafts/retries; live verification sends one synthetic record.
  if(!live){await page.route('**/api/feedback',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));await submit.click();await page.locator('.feedback-status[data-state=error]').waitFor();await page.unroute('**/api/feedback');}
  const saved=page.waitForResponse(r=>r.url()===base+'/api/feedback'&&r.request().method()==='POST'&&[200,201].includes(r.status()),{timeout:90000});
  await submit.click();receipt=await(await saved).json();
  await page.locator('.feedback-status[data-state=success]').waitFor();assert.equal(receipt.ok,true);
  await page.screenshot({path:path.join(out,'feedback-receipt.png')});
  if(runtime){
    const row=await runtime.db.prepare('SELECT game_version,test_type FROM feedback_submissions WHERE submission_id = ?').bind(receipt.receipt).first();
    assert.equal(row.game_version,release.version);assert.equal(row.test_type,'automated');
    const attachments=await runtime.db.prepare('SELECT object_key,size_bytes FROM feedback_attachments WHERE submission_id = ?').bind(receipt.receipt).all();
    assert.equal(attachments.results.length,2);for(const item of attachments.results)assert.equal((await runtime.bucket.head(item.object_key)).size,item.size_bytes);
    await submit.click();assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
  }
  pass('Responsive feedback, oversized-file rejection, consent, screenshot/recording upload and confirmed receipt'+(runtime?' through isolated Pages → Worker → D1/R2, retry and idempotency':''));
  await page.locator('#close-feedback').click();await page.locator('[data-tab="bottoms"]').click();await page.locator('[data-item="2"]').click();
  assert.equal(await page.evaluate(()=>window.__styleLab.state.bottom),2);assert.deepEqual(errors,[]);
  pass('Game continues after feedback with no page errors');
})().catch(error=>{console.error(error);errors.push(error.stack);process.exitCode=1;}).finally(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({kind:'automated-check',humanParticipants:0,version:release.version,url:base,checks,errors,receipt},null,2));
  await browser?.close();await runtime?.mf.dispose();
});
