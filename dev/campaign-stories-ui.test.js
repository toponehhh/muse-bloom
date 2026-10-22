'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const out=path.resolve(__dirname,'../artifacts/campaign-stories'),server=createServer();fs.mkdirSync(out,{recursive:true});
const report={kind:'automated-check',startedAt:new Date().toISOString(),platform:process.platform,checks:[],errors:[]};let browser;
const pass=message=>{report.checks.push(message);console.log('PASS: '+message);};
async function ready(page,url){await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:60000});}
async function picker(page,count,current){
  await page.locator('#map-open').click();assert.equal(await page.locator('[data-level]').count(),36);
  assert.equal(await page.locator('[data-level]:enabled').count(),count);
  assert.equal(await page.locator('[data-level][aria-current=true]').getAttribute('data-level'),String(current));
}
async function select(page,level){await page.locator(`[data-level="${level}"]`).click();assert.equal(await page.locator('#journey').evaluate(e=>e.open),false);assert.match(await page.locator('#level-number').innerText(),new RegExp('^'+String(level).padStart(2,'0')));}
(async()=>{
  const {campaignStorageKeys,campaignOptions,SAVE_KEY,LOOK_KEY}=await import('../demos/style-lab/src/campaign-state.mjs');
  const qaKeys=campaignStorageKeys(campaignOptions('?qa=1'));
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,url=base+'/dist/style-room-pages/index.html';
  report.sourceCommit=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dist/style-room-pages/build.json'),'utf8')).sourceCommit;
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});report.browser=browser.version();
  for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
    const context=await browser.newContext({viewport,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(30000);
    page.on('pageerror',e=>report.errors.push(e.message));
    try{
      await ready(page,url);await picker(page,1,1);assert.equal(await page.locator('#qa-notice').isVisible(),false);await page.keyboard.press('Escape');
      const original=await page.evaluate(({SAVE_KEY,LOOK_KEY})=>{localStorage.setItem(LOOK_KEY,'{}');return{save:localStorage.getItem(SAVE_KEY),looks:localStorage.getItem(LOOK_KEY)};},{SAVE_KEY,LOOK_KEY});
      await ready(page,url+'?qa=1');assert.equal(await page.evaluate(()=>typeof window.__campaign),'undefined');
      assert.equal(await page.locator('#qa-notice').isVisible(),true);await picker(page,36,1);
      await page.screenshot({path:path.join(out,`picker-${viewport.width}.png`)});await select(page,2);
      assert.equal(await page.locator('#brief-name').innerText(),'The gallery opening');
      await picker(page,36,2);await select(page,36);await picker(page,36,36);await select(page,1);await picker(page,36,1);await select(page,2);
      const untouched=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).save.levels,qaKeys.save);assert.deepEqual(untouched,{});
      await ready(page,url+'?qa=1');assert.match(await page.locator('#level-number').innerText(),/^02/);
      await page.locator('#reveal').click();assert.equal(await page.locator('#result').evaluate(e=>e.open),true);
      await page.locator('#retry-look').click();
      await ready(page,url+'?qa=1');assert.match(await page.locator('#level-number').innerText(),/^02/);
      const qaSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).save,qaKeys.save);assert.deepEqual(Object.keys(qaSave.levels),['coffee_run']);
      await picker(page,36,2);await page.keyboard.press('Escape');
      const after=await page.evaluate(({SAVE_KEY,LOOK_KEY})=>({save:localStorage.getItem(SAVE_KEY),looks:localStorage.getItem(LOOK_KEY)}),{SAVE_KEY,LOOK_KEY});assert.deepEqual(after,original);
      await ready(page,url);await picker(page,1,1);await page.keyboard.press('Escape');
      await ready(page,url+'?qa=1&progression=normal');await picker(page,1,1);assert.match(await page.locator('#story-availability').innerText(),/1 of 36/);await page.keyboard.press('Escape');
      await ready(page,url+'?qa=1');await picker(page,36,2);await page.keyboard.press('Escape');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      pass(`${viewport.width} × ${viewport.height}: all stories selectable in QA, repeated switches and reload work, real progress is isolated`);
      await page.evaluate(key=>localStorage.setItem(key,'{broken'),qaKeys.save);await ready(page,url+'?qa=1');await picker(page,36,1);await select(page,2);
      pass(`${viewport.width}: corrupt QA save recovers without locking the picker`);
    }finally{await context.close();}
  }
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked for test');}}));
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  try{await ready(page,url+'?qa=1');await picker(page,36,1);await select(page,2);pass('Unavailable storage still permits QA story switching');}finally{await context.close();}
  assert.deepEqual(report.errors,[]);
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{report.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();});
