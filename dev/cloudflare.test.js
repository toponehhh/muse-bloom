'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{fixture}=require('./cloudflare-fixture');
const out=path.resolve(__dirname,'../artifacts/cloudflare');
const report={target:'local Cloudflare Worker, static assets and isolated D1',checks:[],errors:[]};
const pass=message=>{report.checks.push(message);console.log('PASS:',message);};
const fill=async page=>{
  for(const key of ['clarity','readability','visuals','enjoyment'])await page.locator('[name="'+key+'"]').selectOption('4');
  await page.locator('[name="continue"]').selectOption('Maybe');
};
let runtime,browser;
(async()=>{
  fs.mkdirSync(out,{recursive:true});runtime=await fixture(true);
  const {db,base}=runtime;
  const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
  browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  let posts=0;page.on('request',r=>{if(r.url().endsWith('/api/feedback')&&r.method()==='POST')posts++;});
  await page.goto(base+'/playtest/?qa=1');await fill(page);
  await page.locator('[name="friction"]').fill('测试：断线后保留答案 <script>not executable</script>');
  await page.locator('#fallback [type="submit"]').click();
  assert.match(await page.locator('.feedback-status').innerText(),/勾选/);assert.equal(posts,0);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  pass('Mobile feedback guide restores a draft and requires consent before any upload');
  let attempt=0;
  await page.route('**/api/feedback',async route=>{
    attempt++;
    if(attempt===1)return route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'});
    if(attempt===2){const response=await route.fetch();if(response.status()!==201)console.error('Unexpected server response:',response.status(),await response.text());return route.abort('failed');} // D1 commit succeeds, response is lost.
    return route.continue();
  });
  const send=async()=>{await page.locator('[name="consent"]').check();await page.locator('#fallback [type="submit"]').click();};
  await send();await page.locator('.feedback-status[data-state="error"]').waitFor();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,0);
  await page.reload();assert.match(await page.locator('[name="friction"]').inputValue(),/断线/);
  await send();await page.locator('.feedback-status[data-state="error"]').waitFor();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
  await page.reload();await send();await page.locator('.feedback-status[data-state="success"]').waitFor();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
  const before=posts;await page.locator('#fallback [type="submit"]').click();assert.equal(posts,before);
  const row=await db.prepare('SELECT * FROM feedback_submissions').first();
  assert.equal(row.source,'automated-check');assert.equal(row.clarity,4);
  assert.match(await page.locator('.feedback-status').innerText(),new RegExp(row.submission_id));
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'下载备份 JSON'}).click();
  const download=await downloading,record=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.match(record.feedback.friction,/<script>/);assert.equal(record.source,'automated-check');
  await page.screenshot({path:path.join(out,'feedback-mobile.png'),fullPage:true});
  pass('503 and lost response keep answers across reloads; retry writes exactly one D1 row; receipt and JSON backup work');
  await context.close();
  const desktop=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const game=await desktop.newPage();game.on('pageerror',e=>report.errors.push(e.message));
  await game.goto(base+'/');await game.locator('.salon-home').waitFor();
  assert.equal(await game.evaluate(()=>MusePlaytest.active),false);
  await game.evaluate(()=>localStorage.setItem('muse_bloom_save_v1','REGULAR-SAVE-CONTROL'));
  await game.goto(base+'/playtest/Muse-Bloom.html?playtest=1&fresh=1&qa=1');
  await game.locator('.salon-home').waitFor();
  await game.locator('.home-actions [data-action="play"]').click();
  for(const [category,id] of [['top','top_cozy_02'],['bottom','bottom_casual_01'],['shoes','shoes_casual_01'],['hair','hair_casual_01']]){
    await game.locator('[data-action="category"][data-category="'+category+'"]').click();await game.locator('[data-action="equip"][data-item="'+id+'"]').click();
  }
  await game.locator('[data-action="score"]').click();await game.locator('#score-number').waitFor();assert.equal(await game.locator('#score-number').innerText(),'94');
  await game.locator('[data-action="feedback"]').first().click();await fill(game);
  await game.locator('[name="favorite"]').fill('The first look');await game.locator('[name="consent"]').check();
  await game.locator('#playtest-feedback [type="submit"]').click();await game.locator('.feedback-status[data-state="success"]').waitFor();
  const pid=await game.evaluate(()=>MusePlaytest.snapshot().participant);
  const actual=await db.prepare('SELECT record_json FROM feedback_submissions WHERE participant_id=?').bind(pid).first();
  const stored=JSON.parse(actual.record_json);assert.ok(stored.events.some(e=>e.action==='look-complete'&&e.score===94));assert.equal(stored.feedback.favorite,'The first look');
  assert.equal(await game.evaluate(()=>localStorage.getItem('muse_bloom_save_v1')),'REGULAR-SAVE-CONTROL');
  await game.screenshot({path:path.join(out,'feedback-desktop.png'),fullPage:true});
  await game.locator('[name="favorite"]').fill('Updated answer');await game.locator('#playtest-feedback [type="submit"]').click();await game.locator('.feedback-status[data-state="success"]').waitFor();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions WHERE participant_id=?').bind(pid).first()).n,2);
  pass('Published game completes a 94-point outfit, submits its action log, preserves regular saves and accepts revised answers');
  await desktop.close();
  assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{
  await browser?.close();await runtime?.mf.dispose();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
});
