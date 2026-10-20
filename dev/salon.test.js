'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{createServer}=require('./server');
const D=require('../js/data'),G=require('../js/game'),E=require('../js/edit');
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const out=path.join(__dirname,'../artifacts/studio');fs.mkdirSync(out,{recursive:true});
const report={version:require('../package.json').version,channel,source:'automated-check',checks:[],errors:[],layouts:[],humanParticipants:0};
report.scope=process.argv.includes('--wardrobe-only')?'wardrobe-and-layout':'full';
const pass=s=>{report.checks.push(s);console.log('PASS:',s);};
const save=G.newSave();for(const t of D.themes)save.levels[t.id]={best:94,rank:'S'};
save.unlockedItems=D.items.map(i=>i.id);save.onboardingDone=true;
const server=createServer();let browser;
async function equip(page,id){
  await page.locator('[data-action="category"][data-category="'+G.byId[id].category+'"]').click();
  await page.locator('[data-action="equip"][data-item="'+id+'"]').click();
}
async function waitResult(page){await page.locator('.salon-result').waitFor();await page.locator('#score-number').waitFor();}
function watch(page){page.on('pageerror',e=>report.errors.push(e.message));}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});report.browser=browser.version();
 if(report.scope==='full'){
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});watch(page);
 await page.goto(url);await page.locator('.home-actions [data-action="play"]').click();
 assert.match(await page.locator('.coach-strip').innerText(),/Choose a top/);
 await page.locator('[data-action="score"]').click();assert.ok(await page.locator('.salon-dressing').isVisible());
 assert.match(await page.locator('#toast').innerText(),/then shoes/);
 await equip(page,'top_cozy_02');assert.match(await page.locator('.coach-strip').innerText(),/choose a bottom/);
 await equip(page,'bottom_casual_01');assert.match(await page.locator('.coach-strip').innerText(),/pair of shoes/);
 await equip(page,'shoes_casual_01');assert.match(await page.locator('.coach-strip').innerText(),/look is ready/);
 await equip(page,'hair_casual_01');
 assert.equal(await page.locator('[data-painted-material]').count(),4);
 await page.locator('.brief-actions [data-action="style-brief"]').click();
 assert.equal(await page.locator('#dialog .style-goals .done').count(),3);
 await page.locator('#dialog [data-action="close"]').click();
 await page.locator('[data-action="score"]').click();await waitResult(page);
 assert.equal(await page.locator('#score-number').innerText(),'94');
 await page.locator('[data-action="compare-before"]').click();assert.equal(await page.locator('#avatar-slot [data-painted-material]').count(),0);
 await page.locator('[data-action="compare-after"]').click();assert.equal(await page.locator('#avatar-slot [data-painted-material]').count(),4);
 await page.locator('[data-action="share"]').click();
 const share=await page.locator('.share-image').evaluate(async n=>{await n.decode();return {w:n.naturalWidth,h:n.naturalHeight};});
 assert.deepEqual(share,{w:1080,h:1920});
 await page.locator('.share-image').screenshot({path:path.join(out,'photo-export.png')});
 await page.locator('#dialog [data-action="close"]').click();
 pass('First-look guide, blocked incomplete reveal, visible goals, 94-point result, before/after and 1080×1920 export');
 await page.locator('[data-action="next"]').click();
 assert.match(await page.locator('h1').innerText(),/gallery/);
 assert.equal(await page.locator('.coach-strip').count(),0);
 await equip(page,'dress_elegant_02');assert.equal(await page.locator('#avatar-slot [data-layer="top_cozy_02"]').count(),0);
 await equip(page,'shoes_cute_02');await page.locator('[data-action="score"]').click();await waitResult(page);
 assert.equal(await page.locator('#score-number').innerText(),'94');
 await page.screenshot({path:path.join(out,'gallery-result.png'),fullPage:true});
 await page.locator('[data-action="next"]').click();assert.match(await page.locator('h1').innerText(),/market/);
 await equip(page,'top_casual_01');assert.equal(await page.locator('#avatar-slot [data-layer="dress_elegant_02"]').count(),0);
 await equip(page,'bottom_summer_04');await equip(page,'shoes_chic_03');await equip(page,'accessory_casual_01');
 await page.locator('[data-action="score"]').click();await waitResult(page);
 assert.equal(await page.locator('#score-number').innerText(),'94');
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem(MuseGame.SAVE_KEY)));
 assert.equal(Object.keys(persisted.levels).length,3);
 await page.reload();await page.locator('.home-actions [data-action="play"]').click();
 assert.match(await page.locator('h1').innerText(),/Gym Fit/);
 pass('Three distinct first challenges play through with real clicks, natural dress/separate replacement, and reload into challenge four');
 // Remaining challenges use the existing progression, through real UI input.
 for(let level=4;level<=36;level++){
   await page.locator('[data-action="clear"]').click();
   const live=await page.evaluate(()=>JSON.parse(localStorage.getItem(MuseGame.SAVE_KEY)));
   const available=D.items.filter(i=>G.enterLevel(live,level).save.unlockedItems.includes(i.id));
   const solution=G.solveTheme(D.themes[level-1],available);
   for(const item of solution.items)await equip(page,item.id);
   await page.locator('[data-action="score"]').click();await waitResult(page);
   assert.equal(await page.locator('#score-number').innerText(),'94','Level '+level);
   if(level<36)await page.locator('[data-action="next"]').click();
   if(level%12===0)console.log('Journey:',level+'/36');
 }
 pass('All 36 challenges completed through actual equip/reveal/next actions at 94 points');
 await page.close();
 }
 // Geometry is measured in document coordinates. Small phones may scroll;
 // they must not shrink the avatar or overlap clothing with controls.
 for(const [width,height] of [[320,568],[375,667],[390,844],[667,375],[768,1024],[1024,540],[1024,768],[1440,600],[1440,1000]]){
   const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});watch(p);
   await p.goto(url);await p.locator('.home-actions [data-action="play"]').click();
   await p.locator('[data-action="skip-guide"]').click();
   await equip(p,'dress_elegant_02');await equip(p,'shoes_cute_02');
   for(const c of D.characters){
     await p.locator('.muse-switch').click();await p.locator('#dialog [data-action="character"][data-character="'+c.id+'"]').click();
     await p.locator('#dialog [data-action="close"]').click();
     const layout=await p.evaluate(()=>{
       window.__layoutCheck=()=>{const stage=document.querySelector('.fitting-stage'),s=stage.getBoundingClientRect(),svg=stage.querySelector('svg'),m=svg.getScreenCTM();
       const rect=(x,y,w,h)=>{const a=new DOMPoint(x,y).matrixTransform(m),b=new DOMPoint(x+w,y+h).matrixTransform(m);return {left:a.x,top:a.y,right:b.x,bottom:b.y};};
       const head=rect(180,0,360,280),feet=rect(250,1130,220,148);
       const overlaps=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
       const within=a=>a.left>=s.left-1&&a.right<=s.right+1&&a.top>=s.top-1&&a.bottom<=s.bottom+1;
       const controls=[...document.querySelectorAll('.brief,.wardrobe-panel,.coach-strip,.live-goals,#category-tabs,.wardrobe-footer,.body-cover-negative')];
       return {headVisible:within(head),feetVisible:within(feet),noCover:controls.every(n=>!overlaps(head,n.getBoundingClientRect())&&!overlaps(feet,n.getBoundingClientRect())),
         noOverflow:document.documentElement.scrollWidth<=innerWidth+1,avatarHeight:svg.getBoundingClientRect().height,
         stageHeight:s.height,bg:getComputedStyle(document.body).backgroundColor,htmlBg:getComputedStyle(document.documentElement).backgroundColor};};return __layoutCheck();
     });
     for(const field of ['headVisible','feetVisible','noCover','noOverflow'])assert.equal(layout[field],true,width+'x'+height+'/'+c.id+'/'+field);
     if(width<=390)assert.ok(layout.avatarHeight>=260,'Readable small-phone character');
     report.layouts.push({width,height,character:c.id,...layout});
   }
   if(width===390){
     const negative=await p.evaluate(()=>{
       // Independent overlay: an app class may use display:contents on phones.
       const stage=document.querySelector('.fitting-stage'),bad=document.createElement('div');bad.className='body-cover-negative';
       bad.style.cssText='position:absolute;left:30%;top:3%;width:40%;height:25%;z-index:50';stage.append(bad);
       const headBlocked=!__layoutCheck().noCover;
       bad.style.cssText='position:absolute;left:0;bottom:0;width:100%;height:60px;z-index:50';const feetBlocked=!__layoutCheck().noCover;
       bad.remove();return {headBlocked,feetBlocked,recovered:__layoutCheck().noCover};
     });
     assert.deepEqual(negative,{headBlocked:true,feetBlocked:true,recovered:true});report.overlayNegative=negative;
   }
   await p.locator('[data-action="score"]').scrollIntoViewIfNeeded();
   assert.ok(await p.locator('[data-action="score"]').isVisible());
   await p.evaluate(()=>scrollTo(0,0));
   await p.screenshot({path:path.join(out,'layout-'+width+'x'+height+'.png'),fullPage:true});
   await p.close();
 }
 pass('27 character/viewport combinations: readable character, complete head/feet, no controls covering body, no horizontal overflow and reachable action');
 // Every item remains usable after the curated introduction.
 const all=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});watch(all);
 await all.addInitScript(save=>localStorage.setItem('muse_bloom_save_v1',JSON.stringify(save)),save);await all.goto(url);
 await all.locator('.home-actions [data-action="play"]').click();
 for(const c of D.characters){
   await all.locator('.muse-switch').click();await all.locator('#dialog [data-action="character"][data-character="'+c.id+'"]').click();await all.locator('#dialog [data-action="close"]').click();
   await all.evaluate(()=>{window.__originalBase=document.querySelector('#avatar-slot [data-layer="base"]');});
   for(const item of D.items){
     await equip(all,item.id);assert.equal(await all.locator('#avatar-slot [data-layer="'+item.id+'"]').count(),1);
     await all.locator('[data-item="'+item.id+'"]').click();assert.equal(await all.locator('#avatar-slot [data-layer="'+item.id+'"]').count(),0);
     assert.ok(await all.evaluate(()=>__originalBase===document.querySelector('#avatar-slot [data-layer="base"]')&&__originalBase.isConnected));
   }
   console.log('Wardrobe:',c.name,122,'equip/remove pairs');
 }
 pass('366 real equip/remove pairs across all 122 pieces and three characters retain the same mounted body');
 const paints=await all.evaluate(async()=>{
   const render=async svg=>{const im=await MuseShare.loadImage(svg),c=document.createElement('canvas');c.width=360;c.height=640;const x=c.getContext('2d');x.drawImage(im,0,0,360,640);return x.getImageData(0,0,360,640).data;};
   const rows=[];
   for(const id of MuseEdit.capsule){const item=MuseGame.byId[id],p=await render(MuseArt.fittedItemSvg(item)),n=await render(MuseArt.fittedItemSvg(item,true));let changed=0,opaque=0;
     for(let x=0;x<p.length;x+=4)if(p[x+3]>230){opaque++;if(Math.abs(p[x]-n[x])+Math.abs(p[x+1]-n[x+1])+Math.abs(p[x+2]-n[x+2])>25)changed++;}
     rows.push({id,opaque,changed,ratio:changed/opaque});
   }return rows;
 });
 for(const row of paints)assert.ok(row.ratio>.2,'Painted texture is visible: '+row.id);
 report.painted=paints;pass('All 14 painted pieces change actual rendered pixels, not only filenames or thumbnail metadata');
 await all.close();
 const trial=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});watch(trial);
 await trial.addInitScript(()=>localStorage.setItem('muse_bloom_save_v1','KEEP-REGULAR-SAVE'));
 await trial.goto(url+'/?playtest=1&fresh=1&qa=1');
 await trial.locator('.home-actions [data-action="play"]').click();await equip(trial,'top_casual_01');
 const pid=await trial.evaluate(()=>MusePlaytest.snapshot().participant);
 await trial.reload();
 assert.equal(await trial.evaluate(()=>MusePlaytest.snapshot().participant),pid);
 assert.equal(await trial.evaluate(()=>localStorage.getItem('muse_bloom_save_v1')),'KEEP-REGULAR-SAVE');
 await trial.locator('[data-action="feedback"]').click();
 for(const name of ['clarity','readability','visuals','enjoyment'])await trial.locator('select[name="'+name+'"]').selectOption('4');
 await trial.locator('select[name="continue"]').selectOption('Maybe');
 await trial.locator('textarea[name="friction"]').fill('Automated export verification; not a human playtest.');
 const download=trial.waitForEvent('download');await trial.locator('#playtest-feedback [type="submit"]').click();
 const artifact=await download;const feedback=JSON.parse(fs.readFileSync(await artifact.path(),'utf8'));
 assert.equal(feedback.source,'automated-check');assert.equal(feedback.feedback.continue,'Maybe');assert.ok(feedback.events.some(e=>e.action==='action'&&e.item==='top_casual_01'));
 fs.writeFileSync(path.join(out,'feedback-export-qa.json'),JSON.stringify(feedback,null,2));
 pass('Playtest feedback downloads with action history, survives reload and cannot overwrite the regular save; QA data explicitly labeled automated');
 await trial.close();assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{
 await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'salon-'+channel+'.json'),JSON.stringify(report,null,2));
});
