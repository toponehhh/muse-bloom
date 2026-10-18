'use strict';
// Physical attachment tests run against real clicks and the rendered SVG paths.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const D=require('../js/data'),G=require('../js/game'),A=require('../js/art');
async function run(){
  const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
  let browser;const report={cases:0,checks:[],errors:[]};
  try{
    browser=await chromium.launch({headless:true,channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    const save=G.newSave();save.unlockedItems=D.items.map(i=>i.id);save.muted=true;
    save.levels=Object.fromEntries(D.themes.map(t=>[t.id,{best:94,rank:'S'}]));
    await page.addInitScript(({key,save})=>localStorage.setItem(key,JSON.stringify(save)),{key:G.SAVE_KEY,save});
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('[data-action="play"]').click();
    await page.evaluate(()=>{
      window.checkAttachment=()=>{
        const scene=document.querySelector('#avatar-slot .avatar > svg');
        for(const side of ['left','right']){
          const resting=scene.querySelector(`[data-layer="base"] [data-hand="${side}"]`);
          const carrying=scene.querySelector(`[data-layer="hand-${side}"]`);
          if(!resting)throw Error('Missing independently drawn '+side+' hand');
          if((resting.getAttribute('display')==='none')!==!!carrying)throw Error('Relaxed and grip hands overlap, or both are hidden');
          const active=(carrying||resting).querySelector('[data-part="hand-outline"]');
          const wrist=new DOMPoint(side==='left'?240:480,731).matrixTransform(scene.getScreenCTM()).matrixTransform(active.getScreenCTM().inverse());
          if(!active.isPointInFill(wrist))throw Error('Hand is disconnected at the wrist');
        }
        const hands=[...scene.querySelectorAll('[data-held-hand]')].map(n=>n.dataset.heldHand);
        if(new Set(hands).size!==hands.length)throw Error('Two props occupy the same hand');
        for(const prop of scene.querySelectorAll('[data-held-hand]')){
          const hand=prop.dataset.heldHand,point=new DOMPoint(hand==='left'?234:486,776);
          const handle=prop.querySelector('[data-part="handle"]');
          const local=point.matrixTransform(scene.getScreenCTM()).matrixTransform(handle.getScreenCTM().inverse());
          if(!handle.isPointInStroke(local))throw Error('Handle misses '+hand+' grip');
          const fingers=scene.querySelector(`[data-layer="hand-${hand}"] [data-part="fingers"]`);
          const fingerPoint=point.matrixTransform(scene.getScreenCTM()).matrixTransform(fingers.getScreenCTM().inverse());
          if(!fingers.isPointInFill(fingerPoint))throw Error('Grip is not covered by fingers');
          if(!(prop.compareDocumentPosition(fingers)&Node.DOCUMENT_POSITION_FOLLOWING))throw Error('Handle paints over fingers');
          const bounds=prop.getBBox();if(bounds.y+bounds.height>1280)throw Error('Prop below canvas');
        }
        for(const strap of scene.querySelectorAll('[data-part="shoulder-strap"]')){
          if(!strap.isPointInStroke(new DOMPoint(299,368)))throw Error('Crossbody misses shoulder');
        }
      };
    });
    const props=D.items.filter(i=>A.handheld(i)||i.shape==='crossbody');
    for(const skin of D.skins){
      await page.locator(`[data-skin="${skin.id}"]`).click();
      for(const item of props){
        await page.locator('[data-action="clear"]').click();await page.locator('[data-category="accessory"]').click();
        await page.locator(`[data-item="${item.id}"]`).click();await page.evaluate(()=>checkAttachment());report.cases++;
      }
    }
    report.checks.push('Every handheld and crossbody attaches to the body across all four skin tones');
    await page.locator('[data-action="clear"]').click();
    for(const item of props.filter(A.handheld).slice(0,2))await page.locator(`[data-item="${item.id}"]`).click();
    await page.evaluate(()=>checkAttachment());
    assert.equal(await page.locator('[data-held-hand="left"]').count(),1);
    const negative=await page.evaluate(()=>{
      const prop=document.querySelector('[data-held-hand="right"]');prop.setAttribute('transform','translate(40 0)');
      try{checkAttachment();return false;}catch(e){return /misses/.test(e.message);}finally{prop.removeAttribute('transform');}
    });
    assert.equal(negative,true,'Moving a bag away from the hand must fail');
    report.checks.push('Two handheld props use separate hands; a deliberate 40px displacement fails');
    await page.locator(`[data-item="${props.filter(A.handheld)[0].id}"]`).click();
    await page.evaluate(()=>checkAttachment());
    assert.equal(await page.locator('[data-held-hand="left"], [data-layer="hand-left"]').count(),0);
    assert.equal(await page.locator('[data-held-hand="right"]').count(),1);
    report.checks.push('Removing the first prop reattaches the remaining prop to the right hand');
    const watch=D.items.find(i=>i.shape==='watch');await page.locator(`[data-item="${watch.id}"]`).click();
    await page.evaluate(()=>{
      checkAttachment();
      const hand=document.querySelector('[data-layer="hand-right"]'),watch=document.querySelector(`[data-layer="${MuseData.items.find(i=>i.shape==='watch').id}"]`);
      if(!(hand.compareDocumentPosition(watch)&Node.DOCUMENT_POSITION_FOLLOWING))throw Error('Grip paints over wristwatch');
    });
    report.checks.push('Hand poses replace one another, wrists remain joined, and a watch stays above the grip');
    await page.locator('[data-action="clear"]').click();
    assert.equal(await page.locator('[data-layer^="hand-"]').count(),0);
    report.checks.push('Clearing props removes grip overlays');
    assert.deepEqual(report.errors,[]);report.status='passed';console.log(JSON.stringify(report,null,2));
  }catch(error){report.status='failed';report.failure=error.stack;throw error;}finally{
    const dir=path.resolve(__dirname,'../artifacts/ui');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'accessory-report.json'),JSON.stringify(report,null,2));
    if(browser)await browser.close();await new Promise(r=>server.close(r));
  }
}
run().catch(e=>{console.error(e);process.exitCode=1;});
