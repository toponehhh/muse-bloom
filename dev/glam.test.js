'use strict';
// UI-level contracts for the supplied Stitch assets and real interactive screens.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
const {createServer}=require('./server');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/glam');
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const report={version:require('../package.json').version,channel,checks:[],errors:[],viewports:[]};
fs.mkdirSync(out,{recursive:true});
let browser;const server=createServer();
function pass(s){report.checks.push(s);console.log('PASS:',s);}
async function editorialCheck(page){
 const images=await page.locator('.home-look [data-layer="base"] [data-character-art]').evaluateAll(async nodes=>Promise.all(nodes.map(async n=>{const im=new Image();im.src=n.getAttribute('href');try{await im.decode();}catch{}return im.complete&&im.naturalWidth===768&&im.naturalHeight===1152&&im.src.startsWith('data:image/webp;base64,');})));
 assert.ok(images.length===1&&images.every(Boolean),'Editorial art missing, hidden or requesting the network');
}
async function layout(page,label){
 const failure=await page.evaluate(()=>{
  if(document.documentElement.scrollWidth>innerWidth+1)return 'horizontal overflow';
  const header=document.querySelector('.app-header'),brand=header.querySelector('.brand').getBoundingClientRect(),right=header.querySelector('.header-right').getBoundingClientRect();
  if(brand.right>right.left)return 'overlapping header';
  for(const n of header.querySelectorAll('button')){if(!n.checkVisibility())continue;const r=n.getBoundingClientRect();if(r.left<0||r.right>innerWidth+1)return 'offscreen header button';}
  if(document.body.dataset.screen==='dressing'){
   const score=document.querySelector('[data-action="score"]').getBoundingClientRect(),stage=document.querySelector('.fitting-stage').getBoundingClientRect(),grid=document.querySelector('#item-grid').getBoundingClientRect();
   if(score.width<120||score.height<40)return 'reveal action collapsed';
   if(stage.height<170||grid.height<55)return 'stage or wardrobe collapsed';
  }
  return null;
 });assert.equal(failure,null,label);
}
async function wardrobeContrast(page){
 const ratios=await page.evaluate(()=>{
  const luminance=css=>{const rgb=css.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  return [...document.querySelectorAll('.item-card:not(.locked) .item-name,.item-card:not(.locked) .item-tags>span')].map(n=>{
   const fg=luminance(getComputedStyle(n).color),bg=luminance(getComputedStyle(n.matches('.item-name')?n.closest('.item-card'):n).backgroundColor);
   return (Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05);
  });
 });assert.ok(ratios.length>0&&ratios.every(r=>r>=4.5),'Wardrobe labels below 4.5:1 contrast');
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});report.browser=browser.version();
 const base='http://127.0.0.1:'+server.address().port;
 for(const viewport of [{width:320,height:568},{width:375,height:667},{width:390,height:844},{width:667,height:375},{width:768,height:1024},{width:1024,height:768},{width:1440,height:900}]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith('http')&&!url.startsWith(base)){report.errors.push('Unexpected external request: '+url);return route.abort();}return route.continue();});
  await page.goto(base);await editorialCheck(page);await layout(page,'home '+viewport.width);
  assert.equal(await page.locator('html').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(251, 245, 239)');
  await page.screenshot({path:path.join(out,`home-${viewport.width}.png`),fullPage:true});
  if(viewport.width===1440){
   await page.locator('.home-look [data-layer="base"] [data-character-art]').evaluate(n=>{window.__oldArt=n.getAttribute('href');n.setAttribute('href','data:image/webp;base64,broken');});
   await assert.rejects(()=>editorialCheck(page),/Editorial art/);await page.locator('.home-look [data-layer="base"] [data-character-art]').evaluate(n=>{n.setAttribute('href',window.__oldArt);});
   pass('Missing editorial-image negative control is detected');
   await page.locator('[data-action="studio"]').click();
  }else await page.locator('[data-action="play"]').click();
  assert.equal(await page.locator('#avatar-slot [data-character-art="bella"]').count(),1);
  await layout(page,'dressing '+viewport.width);await wardrobeContrast(page);await page.screenshot({path:path.join(out,`studio-${viewport.width}.png`)});
  if(viewport.width===1440){await page.locator('.item-name').first().evaluate(n=>n.style.color='#fffaf7');await assert.rejects(()=>wardrobeContrast(page),/contrast/);await page.locator('.item-name').first().evaluate(n=>n.style.removeProperty('color'));pass('Wardrobe text meets 4.5:1 contrast; low-contrast negative control is detected');}
  const first=page.locator('#item-grid [data-action="equip"]').first();await first.click();await first.click();assert.ok(await page.locator('#avatar-slot [data-layer="base"]').isVisible());
  await page.locator('[data-action="settings"]').click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('[data-action="clear"]').click();
  for(const [category,id] of [['dress','dress_cute_01'],['shoes','shoes_casual_01'],['hair','hair_casual_01']]){await page.locator('[data-action="category"][data-category="'+category+'"]').click();await page.locator('[data-item="'+id+'"]').click();}
  await page.locator('[data-action="score"]').click();assert.equal(await page.locator('#score-number').innerText(),'94');await layout(page,'result '+viewport.width);
  await page.screenshot({path:path.join(out,`result-${viewport.width}.png`),fullPage:true});
  await page.locator('.app-header [data-action="lookbook"]').click();await layout(page,'lookbook '+viewport.width);
  await page.locator('[data-action="settings"]').click();await page.locator('#dialog [data-action="collection"]').click();await layout(page,'collection '+viewport.width);
  await page.locator('[data-action="home"]').click();await page.locator('[data-action="play"]').click();await page.locator('[data-action="settings"]').click();await page.locator('#dialog [data-action="nav-map"]').click();await layout(page,'map '+viewport.width);
  if(viewport.width===1440){await page.locator('[data-action="studio"]').click();await page.locator('.studio-nav [data-action="nav-map"]').click();assert.ok(await page.locator('.map-screen').isVisible());pass('Desktop salon/challenge navigation works with populated defaults');}
  report.viewports.push(viewport);await page.close();
 }
 pass('Seven viewport sizes: home, studio, results, collection, lookbook, challenges and settings remain usable');
 pass('Homepage uses the playable painted character; no external asset requests');
 assert.deepEqual(report.errors,[]);pass('No browser runtime errors');
})().catch(e=>{report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,`report-${channel}.json`),JSON.stringify(report,null,2));});
