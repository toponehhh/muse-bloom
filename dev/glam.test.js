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
 const images=await page.locator('.home-art .editorial-art').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.editorial,loaded:n.complete&&n.naturalWidth===896&&n.naturalHeight===1200,embedded:n.src.startsWith('data:image/webp;base64,'),visible:n.checkVisibility({checkOpacity:true})})));
 assert.deepEqual(images.map(i=>i.name),['rose-studio','golden-hour','city-muse']);
 assert.ok(images.every(i=>i.loaded&&i.embedded&&i.visible),'Editorial art missing, hidden or requesting the network');
}
async function layout(page,label){
 const failure=await page.evaluate(()=>{
  if(document.documentElement.scrollWidth>innerWidth+1)return 'horizontal overflow';
  const header=document.querySelector('.app-header'),brand=header.querySelector('.brand').getBoundingClientRect(),right=header.querySelector('.header-right').getBoundingClientRect();
  if(brand.right>right.left)return 'overlapping header';
  for(const n of header.querySelectorAll('button')){if(!n.checkVisibility())continue;const r=n.getBoundingClientRect();if(r.left<0||r.right>innerWidth+1)return 'offscreen header button';}
  if(document.body.dataset.screen==='dressing'){
   const score=document.querySelector('[data-action="score"]').getBoundingClientRect(),stage=document.querySelector('.fitting-stage').getBoundingClientRect(),grid=document.querySelector('#item-grid').getBoundingClientRect();
   if(score.bottom>innerHeight+1||score.top<0)return 'score button below viewport';
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
  await page.goto(base);await page.locator('.campaign-main img').evaluate(n=>n.decode());await editorialCheck(page);await layout(page,'home '+viewport.width);
  assert.equal(await page.locator('html').evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(11, 13, 25)');
  await page.screenshot({path:path.join(out,`home-${viewport.width}.png`),fullPage:true});
  if(viewport.width===1440){
   await page.locator('.campaign-main img').evaluate(n=>{window.__oldArt=n.src;n.src='data:image/webp;base64,broken';});
   await assert.rejects(()=>editorialCheck(page),/Editorial art/);await page.locator('.campaign-main img').evaluate(n=>{n.src=window.__oldArt;return n.decode();});
   pass('Missing editorial-image negative control is detected');
   await page.locator('[data-action="studio"]').click();
  }else await page.locator('[data-action="play"]').click();
  assert.equal(await page.locator('#avatar-slot [data-layer="hair_sporty_04"]').count(),1);
  await layout(page,'dressing '+viewport.width);await wardrobeContrast(page);await page.screenshot({path:path.join(out,`studio-${viewport.width}.png`)});
  if(viewport.width===1440){await page.locator('.item-name').first().evaluate(n=>n.style.color='#27283c');await assert.rejects(()=>wardrobeContrast(page),/contrast/);await page.locator('.item-name').first().evaluate(n=>n.style.removeProperty('color'));pass('Wardrobe text meets 4.5:1 contrast; low-contrast negative control is detected');}
  const first=page.locator('#item-grid [data-action="equip"]').first();await first.click();await first.click();assert.ok(await page.locator('#avatar-slot [data-layer="base"]').isVisible());
  await page.locator('[data-action="settings"]').click();assert.ok(await page.locator('dialog').isVisible());await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('[data-action="clear"]').click();await page.locator('[data-action="score"]').click();assert.equal(await page.locator('#score-number').innerText(),'0');await layout(page,'result '+viewport.width);
  await page.screenshot({path:path.join(out,`result-${viewport.width}.png`),fullPage:true});
  await page.locator('[data-action="lookbook"]').click();await layout(page,'lookbook '+viewport.width);
  await page.locator('[data-action="collection"]').click();await layout(page,'collection '+viewport.width);
  await page.locator('[data-action="home"]').click();await page.locator('[data-action="map"]').click();await layout(page,'map '+viewport.width);
  if(viewport.width===1440){await page.locator('[data-action="studio"]').click();await page.locator('[data-action="nav-map"]').click();assert.ok(await page.locator('.map-screen').isVisible());pass('Desktop salon/challenge navigation works with populated defaults');}
  report.viewports.push(viewport);await page.close();
 }
 pass('Seven viewport sizes: home, studio, results, collection, lookbook, challenges and settings remain usable');
 pass('All three supplied illustrations are embedded, decoded and visible; no external asset requests');
 assert.deepEqual(report.errors,[]);pass('No browser runtime errors');
})().catch(e=>{report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,`report-${channel}.json`),JSON.stringify(report,null,2));});
