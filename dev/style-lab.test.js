'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const out=path.resolve(__dirname,'../artifacts/style-lab');fs.mkdirSync(out,{recursive:true});
const report={kind:'automated-browser-check',humanParticipants:0,checks:[],fits:[],layouts:[],errors:[]};
const pass=text=>{report.checks.push(text);console.log('PASS: '+text);};
let browser;const server=createServer();
async function load(page,url){await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',{},{timeout:30000});}
async function contacts(page){return page.evaluate(()=>{
  const {app,display}=window.__styleLab;
  // Extract ONLY the character: the room background cannot hide transparent holes.
  const pixels=app.renderer.extract.pixels({target:display,resolution:1}),bounds=display.getLocalBounds();
  const pts=[['neck',515,346],['left sleeve',380,463],['right sleeve',652,463],['left elbow',367,577],['right elbow',658,577],['waist centre',515,575],['waist left',445,584],['waist right',589,584],['left knee',445,1060],['right knee',610,1060],['left wrist',316,767],['right wrist',716,767]];
  return pts.map(([name,x,y])=>{
    // Runtime extraction is in local pixels with the display transform removed.
    const px=Math.round(x-bounds.x),py=Math.round(y-bounds.y);let alpha=0;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const a=pixels.pixels[((py+dy)*pixels.width+px+dx)*4+3];alpha=Math.max(alpha,a||0);}
    return {name,alpha};
  });
});}
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference',acceptDownloads:true});
  const page=await context.newPage(),external=[];
  page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  // Test the actual review package at a non-root path, not only source files.
  const url=base+'/dist/style-lab/index.html?test=1';await load(page,url);
  assert.equal(await page.evaluate(()=>window.__styleLab.snapshot().pixi),'8.22.0');assert.equal(external.length,0);
  pass('Review bundle boots from a subpath using only local assets');
  const before=await page.evaluate(()=>window.__styleLab.bones());await page.waitForTimeout(1100);const after=await page.evaluate(()=>window.__styleLab.bones());
  const by=(list,name)=>list.find(b=>b.name===name);
  assert.ok(Math.hypot(by(after,'head').x-by(before,'head').x,by(after,'head').y-by(before,'head').y)>.1);
  assert.deepEqual(by(before,'hips'),by(after,'hips'),'Feet/hips must remain planted');
  for(const name of ['elbowL','elbowR','wristL','wristR'])assert.ok(Math.hypot(by(after,name).x-by(before,name).x,by(after,name).y-by(before,name).y)<8,'Relaxed arms must not swing into a puppet pose');
  await page.locator('#motion').click();const stopped=await page.evaluate(()=>window.__styleLab.snapshot().clock);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>window.__styleLab.snapshot().clock),stopped);
  pass('Breathing and head movement run; hips stay planted; arm motion is bounded; pause freezes time');
  for(let top=0;top<3;top++)for(let bottom=0;bottom<3;bottom++){
    await page.locator('[data-tab="tops"]').click();await page.locator(`[data-item="${top}"]`).click();await page.locator(`[data-item="${top}"]`).click();
    await page.locator('[data-tab="bottoms"]').click();await page.locator(`[data-item="${bottom}"]`).click();await page.locator(`[data-item="${bottom}"]`).click();
    for(const time of [0,1.5,3,4.5]){
      await page.evaluate(t=>window.__styleLab.seek(t),time);
      const state=await page.evaluate(()=>window.__styleLab.snapshot());assert.equal(state.state.top,top);assert.equal(state.state.bottom,bottom);
      assert.equal(state.slots.find(s=>s.name==='body').index,bottom===2?1:0);
      assert.ok(state.slots.every(s=>s.vertices.length>10&&s.vertices.every(Number.isFinite)),'Every visible mesh has valid vertices');
      const samples=await contacts(page);report.fits.push({top,bottom,time,samples});assert.ok(samples.every(s=>s.alpha>=230),JSON.stringify({top,bottom,time,samples}));
    }
    if(bottom===2){
      const bluePixels=await page.evaluate(()=>{
        const {app,display}=window.__styleLab,p=app.renderer.extract.pixels({target:display,resolution:1}),b=display.getLocalBounds();let n=0;
        for(let y=625;y<838;y++)for(let x=335;x<695;x++){
          const i=(Math.round(y-b.y)*p.width+Math.round(x-b.x))*4,[r,g,bl,a]=p.pixels.slice(i,i+4);
          if(a>200&&r<160&&g>r*1.1&&bl>r*1.15&&bl>=g)n++;
        }return n;
      });
      assert.equal(bluePixels,0,'The original denim skirt must not leak around trousers');
    }
    await page.locator('#stage').screenshot({path:path.join(out,`fit-${top}-${bottom}.png`)});
  }
  pass('All 9 outfits at 4 animation times keep 432 rendered neckline, sleeve, waist and limb samples covered; selecting an active item never clears clothing');
  await page.locator('#undo').click();assert.notDeepEqual(await page.evaluate(()=>[window.__styleLab.state.top,window.__styleLab.state.bottom]),[2,2]);
  await page.locator('#reset').click();assert.deepEqual(await page.evaluate(()=>[window.__styleLab.state.top,window.__styleLab.state.bottom]),[0,0]);
  await page.locator('[data-theme="1"]').click();assert.equal(await page.locator('#goal-count').innerText(),'0 / 2 notes');
  await page.evaluate(()=>window.__styleLab.setOutfit(1,1));assert.equal(await page.locator('#goal-count').innerText(),'2 / 2 notes');
  await page.locator('#detail-view').click();await page.locator('#save').click();await page.locator('#result[open]').waitFor();
  assert.equal(await page.locator('#result-title').innerText(),'Mood, captured.');
  const image=await page.locator('#result-image').getAttribute('src');fs.writeFileSync(path.join(out,'saved-look.jpg'),Buffer.from(image.split(',')[1],'base64'));
  const download=page.waitForEvent('download');await page.locator('#download').click();await(await download).saveAs(path.join(out,'downloaded-look.jpg'));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#result').evaluate(n=>n.open),false);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');assert.equal(await page.locator('#saved-count').innerText(),'1');
  await page.locator('[data-tab="saved"]').click();await page.locator('[data-saved="0"]').click();assert.equal(await page.locator('#result-title').innerText(),'Mood, captured.');await page.locator('#keep-styling').click();
  pass('Undo, reset, theme notes, full portrait export from detail view, download, dialog dismissal and Lookbook reload work');
  for(const [width,height] of [[1440,1000],[1024,768],[800,600],[390,844],[320,568],[667,375]]){
    await page.setViewportSize({width,height});await page.locator('[data-tab="tops"]').click();await page.evaluate(()=>{window.__styleLab.setOutfit(1,1);window.__styleLab.setView('full');window.__styleLab.setPause(true);});await page.waitForTimeout(100);
    const layout=await page.evaluate(()=>{const r=document.querySelector('#stage').getBoundingClientRect(),a=window.__styleLab.display,b=a.getBounds();return {scroll:document.documentElement.scrollWidth,width:innerWidth,stage:{x:r.x,y:r.y,w:r.width,h:r.height},figure:{x:b.x,y:b.y,w:b.width,h:b.height},buttons:[...document.querySelectorAll('.scene-tools button')].map(n=>({name:n.textContent,y:n.getBoundingClientRect().y}))};});
    assert.ok(layout.scroll<=width+1,'No horizontal overflow');assert.ok(layout.figure.y>=-1&&layout.figure.y+layout.figure.h<=layout.stage.h+1,'Hair and shoes must stay inside the full-look canvas');
    assert.ok(layout.buttons.every(b=>b.y>=layout.stage.y+layout.stage.h),'Controls must sit below the figure, not over shoes');
    const cardsFit=await page.locator('#items').evaluate(n=>n.scrollHeight<=n.clientHeight+2);
    assert.ok(cardsFit,'A full row of clothing cards, including names, must fit without an internally clipped row');
    report.layouts.push({width,height,...layout});await page.screenshot({path:path.join(out,`layout-${width}x${height}.png`),fullPage:true});
    if(width===390||width===320){await page.locator('[data-item="2"]').click();const r=await page.locator('#stage').boundingBox();assert.ok(r.y>=0&&r.y+r.height<height,'The figure must stay in view while selecting clothes on a phone');await page.screenshot({path:path.join(out,`phone-select-${width}.png`)});}
  }
  pass('Six desktop/mobile/landscape layouts preserve the full figure and keep controls outside its canvas');
  const reducedPage=await context.newPage();await reducedPage.emulateMedia({reducedMotion:'reduce'});await load(reducedPage,url);assert.equal(await reducedPage.evaluate(()=>window.__styleLab.state.paused),true);await reducedPage.locator('[data-item="1"]').click();assert.equal(await reducedPage.locator('.spark').count(),0);await reducedPage.close();
  const broken=await context.newPage();await broken.route('**/assets/mira.png',r=>r.abort());await broken.goto(url);await broken.waitForFunction(()=>document.documentElement.dataset.ready==='error');assert.equal(await broken.locator('#retry').isVisible(),true);await broken.close();
  assert.deepEqual(report.errors,[]);assert.equal(external.length,0);pass('Reduced motion disables idle/particles, missing art shows retry, and normal play has no JavaScript errors or external requests');
})().catch(e=>{report.failure=e.stack;console.error(e);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();});
