'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{fixture}=require('./cloudflare-fixture');
const out=path.resolve(__dirname,'../artifacts/feedback-uploads');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvN8AAAAASUVORK5CYII=','base64');
const picture={name:'screenshot.png',mimeType:'image/png',buffer:png};
let runtime,browser;const errors=[],checks=[];
const pass=message=>{checks.push(message);console.log('PASS:',message);};
(async()=>{
  fs.mkdirSync(out,{recursive:true});runtime=await fixture(true);const {db,bucket,base}=runtime;
  const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
  browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});
  page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/playtest/?qa=1');
  const picker=page.locator('input[type=file]'),submit=page.locator('#fallback [type=submit]');
  await picker.setInputFiles(Array.from({length:4},(_,i)=>({...picture,name:'shot'+i+'.png'})));
  await page.waitForFunction(()=>document.querySelector('.feedback-upload-status').textContent.includes('最多'));
  assert.equal(await page.locator('.feedback-attachment-list li').count(),0);
  await picker.setInputFiles({...picture,buffer:Buffer.alloc(5*1024*1024+1)});
  await page.waitForFunction(()=>document.querySelector('.feedback-upload-status').textContent.includes('5 MB'));
  await picker.setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  await page.waitForFunction(()=>document.querySelector('.feedback-upload-status').textContent.includes('请选择'));
  await picker.setInputFiles(picture);await page.locator('.feedback-attachment-list img').waitFor();
  await page.locator('.feedback-remove').click();assert.equal(await page.locator('.feedback-attachment-list li').count(),0);
  await picker.setInputFiles(picture);await page.locator('.feedback-attachment-list img').waitFor();
  // Generate an actual short playable screen-like recording, not a fake MIME header.
  const bytes=await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;
    const ctx=canvas.getContext('2d'),stream=canvas.captureStream(10),chunks=[];
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});
    const finished=new Promise(resolve=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onstop=resolve;});
    recorder.start();ctx.fillStyle='#ae3e6c';ctx.fillRect(0,0,160,90);ctx.fillStyle='white';ctx.fillText('Automated upload check',10,40);
    await new Promise(resolve=>setTimeout(resolve,350));recorder.stop();await finished;stream.getTracks().forEach(track=>track.stop());
    return [...new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())];
  });
  const recording={name:'screen.webm',mimeType:'video/webm',buffer:Buffer.from(bytes)};
  await picker.setInputFiles(recording);await page.locator('.feedback-attachment-list video').waitFor();
  assert.equal(await page.locator('.feedback-attachment-list li').count(),2);
  assert.equal(await page.locator('.feedback-attachment-list video').getAttribute('autoplay'),null);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  for(const key of ['clarity','readability','visuals','enjoyment'])await page.locator('[name='+key+']').selectOption('4');
  await page.locator('[name=continue]').selectOption('Maybe');await page.locator('[name=friction]').fill('Automated attachment retry test.');
  await submit.click();assert.match(await page.locator('.feedback-status').innerText(),/勾选/);
  assert.equal((await bucket.list()).objects.length,0);pass('Mobile file count/size/type validation, previews, removal, readable layout and consent before upload');
  let failVideo=true,dropReceipt=true,puts=0;
  await page.route('**/api/feedback/uploads/*/*',async route=>{
    puts++;
    if(route.request().headers()['content-type']==='video/webm'&&failVideo){failVideo=false;return route.fulfill({status:503,contentType:'application/json',body:'{"error":"test failure"}'});}
    return route.continue();
  });
  await page.route('**/api/feedback',async route=>{
    if(dropReceipt){dropReceipt=false;const response=await route.fetch();assert.equal(response.status(),201);return route.abort('failed');}
    return route.continue();
  });
  const send=async()=>{await page.locator('[name=consent]').check();await submit.click();};
  await send();await page.locator('.feedback-status[data-state=error]').waitFor();
  assert.equal((await bucket.list()).objects.length,1);assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,0);
  await page.reload();await send();await page.locator('.feedback-status[data-state=error]').waitFor();
  assert.match(await page.locator('.feedback-status').innerText(),/重新选择/);assert.equal(puts,2);
  await picker.setInputFiles(recording);await page.locator('.feedback-attachment-list video').waitFor();
  await send();await page.locator('.feedback-status[data-state=error]').waitFor();
  assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM feedback_submissions').first()).n,1);
  await page.reload();await send();await page.locator('.feedback-status[data-state=success]').waitFor();
  assert.equal(puts,3);assert.equal((await bucket.list()).objects.length,2);
  const saved=(await db.prepare('SELECT * FROM feedback_submissions').first());
  assert.equal(saved.test_type,'automated');assert.equal(JSON.parse(saved.record_json).attachments.length,2);
  assert.match(await page.locator('.feedback-status').innerText(),new RegExp(saved.submission_id));
  const backup=page.waitForEvent('download');await page.locator('.feedback-backup').click();
  const text=fs.readFileSync(await (await backup).path(),'utf8');assert.equal(JSON.parse(text).attachments.length,2);assert.ok(!text.includes('uploadToken'));
  pass('Partial failure, refresh, reselect only missing video, lost final response and retry preserve one D1 report and two R2 objects; backup contains no upload token');
  await page.screenshot({path:path.join(out,'mobile-feedback.png'),fullPage:true});
  // Exercise the same uploader inside the game dialog and its fixed action footer.
  for(const [width,height] of [[320,568],[667,375],[1280,800]]){
    const game=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});game.on('pageerror',e=>errors.push(e.message));
    await game.goto(base+'/?playtest=1&qa=1');await game.locator('[data-action=feedback]').first().click();
    await game.locator('input[type=file]').setInputFiles(picture);await game.locator('.feedback-attachment-list img').waitFor();
    assert.ok(await game.evaluate(()=>{
      const r=document.querySelector('#playtest-feedback [type=submit]').getBoundingClientRect();
      return document.documentElement.scrollWidth<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;
    }));
    await game.screenshot({path:path.join(out,'dialog-'+width+'x'+height+'.png')});await game.close();
  }
  pass('Game upload dialog retains visible submit actions at 320px, landscape mobile and desktop');
  assert.deepEqual(errors,[]);
})().catch(error=>{errors.push(error.stack);console.error(error);process.exitCode=1;}).finally(async()=>{
  await browser?.close();await runtime?.mf.dispose();fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({target:'isolated local D1/R2',checks,errors,status:errors.length?'failed':'passed'},null,2));
});
