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
  await page.goto(base+'/?test=1&qa=1&progression=normal');await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  const build=await(await context.request.get(base+'/build.json')).json();assert.equal(build.version,release.version);assert.equal(build.channel,'production');
  assert.equal(await page.evaluate(()=>window.MuseFeedback.online),true);
  assert.equal(build.themes,36);assert.equal(build.pieces,122);
  // Exercise real clothing controls on the exact Pages artifact and live host.
  const looks=[[
    ['hair','hair_casual_01']
  ],[
    ['dress','dress_elegant_02'],['shoes','shoes_cute_02']
  ],[
    ['top','top_casual_01'],['bottom','bottom_casual_01'],['shoes','shoes_casual_01'],['accessory','accessory_casual_01']
  ]];
  for(let theme=0;theme<3;theme++){
    for(const [category,id]of looks[theme]){await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-item="${id}"]`).click();}
    await page.locator('#reveal').click();assert.equal(await page.locator('#rank').innerText(),'S');assert.equal(await page.locator('#score').innerText(),'94');
    assert.equal(await page.evaluate(()=>window.__campaign.snapshot().completed),theme+1);
    await page.locator('#next-level').click();
  }
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
  assert.equal(await page.evaluate(()=>window.__campaign.snapshot().completed),3);assert.equal(await page.evaluate(()=>window.__campaign.state.level),4);
  await page.locator('#book-open').click();await page.locator('[data-saved="2"]').click();
  assert.equal(await page.evaluate(()=>window.__campaign.state.outfit.dress),'dress_elegant_02');
  const count=await page.locator('#saved-count').innerText();await page.locator('#reveal').click();await page.locator('#retry-look').click();assert.equal(await page.locator('#saved-count').innerText(),count);
  pass('Full 36-level/122-item artifact: first three challenges earn S through real controls, progression reloads and saved looks restore');
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
  await page.waitForFunction(()=>document.querySelector('.feedback-status')?.dataset.state==='success'&&!document.querySelector('#feedback').open);assert.equal(receipt.ok,true);
  assert.equal(await page.locator('#feedback').isVisible(),false);assert.match(await page.locator('#feedback-receipt').innerText(),new RegExp(receipt.receipt));
  await page.screenshot({path:path.join(out,'feedback-receipt.png')});
  if(runtime){
    const row=await runtime.db.prepare('SELECT game_version,test_type FROM feedback_submissions WHERE submission_id = ?').bind(receipt.receipt).first();
    assert.equal(row.game_version,release.version);assert.equal(row.test_type,'automated');
    const attachments=await runtime.db.prepare('SELECT object_key,size_bytes FROM feedback_attachments WHERE submission_id = ?').bind(receipt.receipt).all();
    assert.equal(attachments.results.length,2);for(const item of attachments.results)assert.equal((await runtime.bucket.head(item.object_key)).size,item.size_bytes);
    await page.locator('#feedback-open').click();await submit.click();
    assert.equal(await page.locator('#feedback').evaluate(el=>el.open),false);assert.equal((await runtime.db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
  }
  pass('Responsive feedback, oversized-file rejection, consent, screenshot/recording upload and confirmed receipt'+(runtime?' through isolated Pages → Worker → D1/R2, retry and idempotency':''));
  await page.locator('[data-category="top"]').click();await page.locator('[data-item="top_casual_01"]').click();
  assert.equal(await page.evaluate(()=>window.__campaign.state.outfit.top),'top_casual_01');assert.deepEqual(errors,[]);
  pass('Game continues after feedback with no page errors');
})().catch(error=>{console.error(error);errors.push(error.stack);process.exitCode=1;}).finally(async()=>{
  fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({kind:'automated-check',humanParticipants:0,version:release.version,url:base,checks,errors,receipt},null,2));
  await browser?.close();await runtime?.mf.dispose();
});
