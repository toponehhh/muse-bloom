'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const release=require('../demos/style-lab/release.json');
const out=path.resolve(__dirname,'../artifacts/campaign');fs.mkdirSync(out,{recursive:true});
const report={kind:'automated-check',humanParticipants:0,checks:[],levels:[],fits:[],layouts:[],errors:[]};
const pass=text=>{report.checks.push(text);console.log('PASS: '+text);};
let browser;const server=createServer();
async function load(page,url){await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:60000});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,url=base+'/dist/style-room-pages/index.html?test=1&qa=1';
 browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true}),page=await context.newPage(),external=[];
 page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
 await load(page,url);assert.equal(await page.locator('#release-version').innerText(),'STYLE STORIES · '+release.version);
 await page.locator('#map-open').click();assert.equal(await page.locator('[data-level]').count(),36);assert.equal(await page.locator('[data-level]:disabled').count(),35);await page.keyboard.press('Escape');
 assert.equal(await page.locator('#items [data-item]:disabled').count(),18);
 await page.locator('[data-item="top_casual_01"]').click();assert.equal(await page.evaluate(()=>window.__campaign.state.outfit.top),'top_casual_01');
 await page.locator('[data-goal="2"]').click();assert.equal(await page.locator('[data-category=hair]').getAttribute('aria-pressed'),'true');await page.locator('[data-item="hair_casual_01"]').click();
 await page.locator('#reveal').click();assert.equal(await page.locator('#score').innerText(),'94');assert.equal(await page.locator('#rank').innerText(),'S');assert.match(await page.locator('#reward-list').innerText(),/new/);
 const download=page.waitForEvent('download');await page.locator('#download').click();await(await download).saveAs(path.join(out,'level-1.jpg'));await page.locator('#retry-look').click();
 pass('Direct playable entry, 36-level map locks, owned-item locks, hints, repeat selection, S score, rewards and portrait download');
 await page.locator('#motion').click();
 for(let level=1;level<=36;level++){
  const expected=await page.evaluate(level=>{const t=window.__campaign;t.selectLevel(level);const solution=t.G.solveTheme(t.D.themes[level-1],t.D.items.filter(i=>t.state.save.unlockedItems.includes(i.id)&&i.unlockType!=='streak'));const outfit=t.G.emptyOutfit();for(const i of solution.items)if(i.category==='accessory')outfit.accessory.push(i.id);else outfit[i.category]=i.id;t.setOutfit(outfit);return {score:solution.score,outfit};},level);
  await page.locator('#reveal').click();assert.equal(await page.locator('#score').innerText(),String(expected.score));assert.equal(await page.locator('#rank').innerText(),'S');assert.doesNotMatch(await page.locator('#score-breakdown').innerText(),/undefined|NaN/);
  const snapshot=await page.evaluate(()=>window.__campaign.snapshot());assert.equal(snapshot.completed,level);report.levels.push({level,score:expected.score,owned:snapshot.owned});
  if([1,6,18,31,36].includes(level))await page.screenshot({path:path.join(out,`result-${level}.png`)});
  await page.locator('#next-level').click();if(level<36)assert.equal(await page.evaluate(()=>window.__campaign.state.level),level+1);else await page.keyboard.press('Escape');
 }
 assert.equal(await page.evaluate(()=>window.__campaign.snapshot().owned),122);await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await page.evaluate(()=>window.__campaign.snapshot().completed),36);
 await page.locator('#book-open').click();assert.equal(await page.locator('[data-saved]').count(),36);await page.locator('[data-saved="2"]').click();assert.equal(await page.evaluate(()=>window.__campaign.state.level),2);
 const saved=await page.evaluate(()=>window.__campaign.snapshot());assert.deepEqual(saved.outfit,saved.save.levels.coffee_run.look.outfit);
 await page.locator('#reset').click();await page.locator('#reveal').click();assert.ok(Number(await page.locator('#score').innerText())<94);assert.equal(await page.evaluate(()=>window.__campaign.state.save.levels.coffee_run.best),94);await page.locator('#retry-look').click();await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>window.__campaign.snapshot().outfit),saved.outfit);
 pass('Every original challenge completes through the reveal/next UI, all 122 pieces unlock, 36 best looks survive reload and low-score replay preserves bests');
 // Test the actual meshes and body, with the room excluded from pixel extraction.
 const items=await page.evaluate(()=>window.__campaign.D.items.map(i=>({id:i.id,category:i.category,shape:i.shape})));
 const seen=new Set();
 for(const item of items){
  const fit=await page.evaluate(item=>{const t=window.__campaign,r=t.renderer;r.paused=true;t.setOutfit({top:'top_casual_01',bottom:'bottom_casual_01',shoes:'shoes_casual_01'});t.equip(item.id);
   const p={x:r.model.x,y:r.model.y,s:r.model.scale.x};r.model.position.set(0,0);r.model.scale.set(1);
   const points=[['neck',515,346],['waist',515,575],['hip left',449,650],['hip right',581,650],['left knee',445,1060],['right knee',610,1060],['left wrist',316,767],['right wrist',716,767],['left shoe',449,1435],['right shoe',641,1435]];
   const samples=[];let valid=true;
   for(const time of [0,1.5,3,4.5]){r.seek(time);const px=r.app.renderer.extract.pixels({target:r.model,resolution:1}),b=r.model.getLocalBounds();
    samples.push(...points.map(([name,x,y])=>{let alpha=0;for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)alpha=Math.max(alpha,px.pixels[((Math.round(y-b.y)+dy)*px.width+Math.round(x-b.x)+dx)*4+3]||0);return{name,time,alpha};}));
    valid&&=r.active.every(a=>a.position.every(Number.isFinite));
   }
   r.model.position.set(p.x,p.y);r.model.scale.set(p.s);r.app.render();return{valid,samples};
  },item);
  assert.equal(fit.valid,true,item.id);assert.ok(fit.samples.every(s=>s.alpha>=220),JSON.stringify({item,fit}));report.fits.push({id:item.id,...fit});
  const key=item.category+'-'+item.shape;if(!seen.has(key)){seen.add(key);await page.locator('#stage').screenshot({path:path.join(out,key+'.png')});}
 }
 pass('All 122 wearable items render finite meshes at four animation times and cover 4,880 body/garment contact samples; screenshots cover every silhouette');
 for(const [width,height]of [[1440,1000],[1024,768],[800,600],[390,844],[320,568],[667,375]]){
  await page.setViewportSize({width,height});await page.locator('#reset').click();await page.locator('[data-category=top]').click();await page.locator('[data-item=top_cozy_02]').click();
  const layout=await page.evaluate(()=>{const r=window.__campaign.renderer,s=document.querySelector('#stage').getBoundingClientRect(),b=r.model.getBounds();return{scroll:document.documentElement.scrollWidth,stage:{y:s.y,h:s.height},figure:{y:b.y,h:b.height},tools:[...document.querySelectorAll('.scene-tools button')].map(n=>n.getBoundingClientRect().y)};});
  assert.ok(layout.scroll<=width,'Horizontal overflow');assert.ok(layout.figure.y>=-2&&layout.figure.y+layout.figure.h<=layout.stage.h+2,'Full body stays in canvas');assert.ok(layout.tools.every(y=>y>=layout.stage.y+layout.stage.h),'Controls remain below shoes');
  if(width<=390)assert.ok(layout.stage.y>=0&&layout.stage.y+layout.stage.h<height,'Phone keeps figure visible when selecting items');
  await page.locator('#reveal').click();await page.locator('#next-level').scrollIntoViewIfNeeded();assert.equal(await page.locator('#next-level').isVisible(),true);await page.keyboard.press('Escape');
  report.layouts.push({width,height,...layout});await page.screenshot({path:path.join(out,`layout-${width}.png`),fullPage:true});
 }
 pass('Six desktop, mobile and landscape layouts keep clothing selectable, reveal usable, full character visible and controls below shoes');
 const reduced=await context.newPage();await reduced.emulateMedia({reducedMotion:'reduce'});await load(reduced,url);assert.equal(await reduced.evaluate(()=>window.__campaign.state.paused),true);await reduced.close();
 const broken=await context.newPage();await broken.route('**/assets/campaign-dresses.png',r=>r.abort());await broken.goto(url);await broken.waitForFunction(()=>document.documentElement.dataset.ready==='error');assert.equal(await broken.locator('#retry').isVisible(),true);await broken.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(external,[]);pass('Reduced motion, missing-asset retry, offline assets and error-free normal gameplay');
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();});
