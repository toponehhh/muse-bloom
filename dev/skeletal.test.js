'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('./server');
const out=path.join(__dirname,'../artifacts/skeletal');fs.mkdirSync(out,{recursive:true});
const report={kind:'automated-browser-check',humanParticipants:0,checks:[],combinations:[],layouts:[],errors:[]};
const pass=message=>{report.checks.push(message);console.log('PASS:',message);};
const server=createServer();let browser;

// Sample the actual rendered WebGL pixels at anatomical contacts. This deliberately
// does not read the author's weight field: it catches holes even with valid JSON.
async function contacts(page) {
  return page.evaluate(()=>{
    const {app,display}=window.__atelier;
    const image=app.renderer.extract.pixels({target:app.stage,frame:app.screen,resolution:1});
    const bone=name=>display.armature.getBone(name).globalTransformMatrix;
    const sample=(name,x,y)=>{
      const sx=Math.round(display.x+x*display.scale.x),sy=Math.round(display.y+y*display.scale.y);
      let alpha=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++) {
        const px=sx+dx,py=sy+dy;
        if(px>=0&&py>=0&&px<image.width&&py<image.height)alpha=Math.max(alpha,image.pixels[(py*image.width+px)*4+3]);
      }
      return {name,alpha};
    };
    const samples=[];
    for(const name of ['neck','chest','hips','upperL','upperR','lowerL','lowerR','handL','handR','shinL','shinR','footL','footR']) {
      const p=bone(name);samples.push(sample(name,p.tx,p.ty));
    }
    const p=bone('hips');
    for(const dx of [-70,-35,35,70])samples.push(sample('waist '+dx,p.tx+dx,p.ty+8));
    const empty=[[700,590],[720,620],[730,660]].map(([x,y])=>sample('armpit '+x+','+y,x,y));
    return {samples,empty};
  });
}
async function load(page,url) {
  page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined);
  browser=await chromium.launch({headless:true,...(channel&&channel!=='chromium'?{channel}:{})});
  const page=await browser.newPage({viewport:{width:1380,height:940},deviceScaleFactor:1});
  const external=[];page.on('request',request=>{if(/^https?:/.test(request.url())&&!request.url().startsWith(base))external.push(request.url());});
  await load(page,base+'/demos/skeletal/index.html?test=1');
  assert.equal(await page.evaluate(()=>window.__atelier.snapshot().pixi),'8.22.0');
  assert.equal(await page.evaluate(()=>window.__atelier.display.armature.getBones().length),20);
  assert.equal(external.length,0,'Demo must boot without a runtime CDN');
  pass('PixiJS 8.22.0, 20 DragonBones bones and all local assets boot in a real browser');

  // Actual joint movement must occur over time, and pause must stop it.
  await page.locator('[data-motion="wave"]').click();
  const before=await page.evaluate(()=>window.__atelier.snapshot());
  await page.waitForTimeout(700);
  const after=await page.evaluate(()=>window.__atelier.snapshot());
  const hand=s=>s.bones.find(b=>b.name==='handR');
  assert.ok(Math.hypot(hand(after).x-hand(before).x,hand(after).y-hand(before).y)>45,'Waving must move the wrist relative to the body');
  assert.notDeepEqual(after.slots.find(s=>s.name==='top').vertices,before.slots.find(s=>s.name==='top').vertices,'Sleeve mesh must deform');
  await page.locator('#pause').click();
  const stopped=await page.evaluate(()=>window.__atelier.snapshot().frame);await page.waitForTimeout(180);
  assert.equal(await page.evaluate(()=>window.__atelier.snapshot().frame),stopped);
  pass('Live wrist movement and garment deformation; pause stops the animation clock');

  for(let top=0;top<3;top++)for(let bottom=0;bottom<3;bottom++) {
    await page.locator('[data-category="tops"]').click();await page.locator(`[data-item="${top}"]`).click();
    // Active-item clicks must never turn into an empty outfit.
    await page.locator(`[data-item="${top}"]`).click();
    await page.locator('[data-category="bottoms"]').click();await page.locator(`[data-item="${bottom}"]`).click();
    await page.locator(`[data-item="${bottom}"]`).click();
    for(const [motion,time] of [['idle',0],['idle',2.4],['wave',.65],['wave',1.7],['wave',2.9],['pose',1.6],['pose',3.8]]) {
      await page.evaluate(([motion,time])=>window.__atelier.seek(motion,time),[motion,time]);
      const snapshot=await page.evaluate(()=>window.__atelier.snapshot());
      assert.equal(snapshot.slots.find(s=>s.name==='top').index,top);
      assert.equal(snapshot.slots.find(s=>s.name==='bottom').index,bottom);
      assert.ok(snapshot.slots.every(s=>(s.visible||(s.name==='arms'&&top===1))&&s.vertices.length&&s.vertices.every(Number.isFinite)),'Native meshes must remain drawable');
      assert.equal(snapshot.slots.find(s=>s.name==='arms').visible,top!==1,'Long sleeves must occlude covered skin');
      const coverage=await contacts(page);
      assert.ok(coverage.samples.every(s=>s.alpha>170),`${top}/${bottom}/${motion}/${time} contact holes: ${JSON.stringify(coverage.samples.filter(s=>s.alpha<=170))}`);
      if(motion==='wave'&&time===1.7)assert.ok(coverage.empty.every(s=>s.alpha<35),`Arm mesh stretched into the armpit: ${JSON.stringify(coverage.empty)}`);
      report.combinations.push({top,bottom,motion,time,contacts:coverage.samples.length,minAlpha:Math.min(...coverage.samples.map(s=>s.alpha))});
    }
    await page.evaluate(()=>window.__atelier.seek('wave',1.7));
    await page.locator('.scene').screenshot({path:path.join(out,`fit-${top}-${bottom}.png`)});
  }
  pass('9 outfit combinations × 7 animation samples: neck, shoulder, elbow, wrist, waist, knee and ankle coverage; no elbow spikes');

  // Prove that the coverage test can fail for a real missing garment.
  await page.evaluate(()=>{window.__atelier.display.armature.getSlot('top').display.visible=false;window.__atelier.app.render();});
  const missing=await contacts(page);assert.ok(missing.samples.find(s=>s.name==='chest').alpha<100);
  await page.evaluate(()=>{window.__atelier.display.armature.getSlot('top').display.visible=true;window.__atelier.app.render();});
  pass('Negative control: the pixel coverage check detects a deliberately hidden top');

  await page.locator('[data-look="coffee"]').click();await page.locator('[data-motion="wave"]').click();
  await page.waitForFunction(()=>window.__atelier.state.motion==='idle',{timeout:6500});
  assert.equal(await page.evaluate(()=>window.__atelier.state.top),1);assert.equal(await page.evaluate(()=>window.__atelier.display.armature.getSlot('top').displayIndex),1);
  pass('Wave returns to breathing without resetting the selected clothes');
  await page.locator('#pause').click();
  await page.locator('.rig-panel summary').click();await page.locator('#show-rig').check();
  await page.locator('.scene').screenshot({path:path.join(out,'bones.png')});await page.locator('#show-rig').uncheck();
  await page.locator('#speed').selectOption('0.5');assert.equal(await page.evaluate(()=>window.__atelier.state.speed),.5);
  await page.locator('.rig-panel summary').click();
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-pressed'),'true');await page.locator('#sound').click();
  const download=page.waitForEvent('download');await page.locator('#photo').click();const portrait=await download;
  const portraitPath=path.join(out,'portrait.png');await portrait.saveAs(portraitPath);
  const png=fs.readFileSync(portraitPath);assert.equal(png.readUInt32BE(16),900);assert.equal(png.readUInt32BE(20),1200);
  pass('Bone overlay, slow motion, opt-in sound and 900 × 1200 portrait export');

  await page.locator('[data-category="tops"]').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-category="bottoms"]').getAttribute('aria-selected'),'true');
  pass('Keyboard arrow navigation between wardrobe tabs');
  const thumbnail=await page.locator('[data-item="1"] img').evaluate(async img=>{
    await img.decode();const canvas=document.createElement('canvas');canvas.width=220;canvas.height=240;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    return {edge:ctx.getImageData(18,68,1,1).data[3],skirt:ctx.getImageData(110,105,1,1).data[3]};
  });
  assert.ok(thumbnail.edge<10&&thumbnail.skirt>200,'Skirt thumbnail must exclude neighboring pink cardigan cuffs');
  pass('Wardrobe thumbnail excludes adjacent garments from the source sheet');
  for(const [width,height] of [[1440,1000],[1024,768],[800,600],[390,844],[320,568],[667,375]]) {
    await page.setViewportSize({width,height});await page.waitForTimeout(120);
    const layout=await page.evaluate(()=>{
      const rect=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height};};
      const stage=rect(document.querySelector('#stage')),heading=rect(document.querySelector('.scene-heading')),wardrobe=rect(document.querySelector('.wardrobe'));
      const {display}=window.__atelier;const scale=display.scale.x;
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,stage,heading,wardrobe,
        head:stage.top+display.y+12*scale,feet:stage.top+display.y+1486*scale,
        controlOverlap:innerWidth<=760&&wardrobe.top<stage.bottom,
        controls:[...document.querySelectorAll('[data-motion]')].every(button=>button.getBoundingClientRect().width>=44),
      };
    });
    assert.equal(layout.overflow,false);assert.ok(layout.head>layout.heading.bottom,'Heading must not cover head');
    assert.ok(layout.feet<layout.stage.bottom,'Both shoes must stay inside the canvas');assert.equal(layout.controlOverlap,false);assert.ok(layout.controls);
    report.layouts.push({width,height,...layout});
    await page.screenshot({path:path.join(out,`layout-${width}x${height}.png`),fullPage:true});
  }
  pass('6 desktop/phone layouts: no horizontal overflow, head/feet visible and wardrobe below the mobile stage');

  const reduced=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await load(reduced,base+'/dist/skeletal-demo/index.html?test=1');
  assert.equal(await reduced.evaluate(()=>window.__atelier.state.paused),true);
  const f=await reduced.evaluate(()=>window.__atelier.snapshot().frame);await reduced.waitForTimeout(120);
  assert.equal(await reduced.evaluate(()=>window.__atelier.snapshot().frame),f);
  await reduced.locator('[data-motion="wave"]').click();await reduced.waitForTimeout(150);
  assert.ok(await reduced.evaluate(()=>window.__atelier.snapshot().frame)>f);
  await reduced.close();pass('Packaged demo works under a URL subpath; reduced motion is paused until explicit play');

  const offline=await browser.newPage();await offline.route('**/nora_ske.json',route=>route.fulfill({status:404,body:'Missing test asset'}));
  await offline.goto(base+'/demos/skeletal/index.html');await offline.waitForFunction(()=>document.documentElement.dataset.ready==='error');
  assert.equal(await offline.locator('#retry').isVisible(),true);await offline.unroute('**/nora_ske.json');await offline.locator('#retry').click();
  await offline.waitForFunction(()=>document.documentElement.dataset.ready==='true');await offline.close();
  pass('Missing skeleton produces an actionable error and Retry recovers');
  assert.deepEqual(report.errors,[],'Unexpected browser errors');
  report.passed=true;
})().catch(error=>{report.failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();await new Promise(resolve=>server.close(resolve));
});
