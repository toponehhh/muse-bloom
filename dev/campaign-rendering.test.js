'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{PNG}=require('pngjs'),{createServer}=require('./server');
const out=path.resolve(__dirname,'../artifacts/campaign-rendering');fs.mkdirSync(out,{recursive:true});
const report={kind:'automated-check',humanParticipants:0,scenarios:[],errors:[]},server=createServer();
let browser;

async function withoutGpu(context){
  await context.addInitScript(()=>{
    const gpuType=type=>['webgl','webgl2','experimental-webgl'].includes(type);
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...options){return gpuType(type)?null:original.call(this,type,...options);};
    if(typeof OffscreenCanvas!=='undefined'){
      const offscreen=OffscreenCanvas.prototype.getContext;
      OffscreenCanvas.prototype.getContext=function(type,...options){return gpuType(type)?null:offscreen.call(this,type,...options);};
    }
    Object.defineProperty(navigator,'gpu',{value:undefined,configurable:true});
  });
}
function difference(actual,room){
  const a=PNG.sync.read(actual),b=PNG.sync.read(room);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  let changed=0,head=0;
  for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++){
    const i=(y*a.width+x)*4;
    if(Math.max(...[0,1,2].map(c=>Math.abs(a.data[i+c]-b.data[i+c])))>20){
      changed++;if(x>a.width*.3&&x<a.width*.7&&y<a.height*.35)head++;
    }
  }
  return {width:a.width,height:a.height,changed,head};
}
async function visibleCharacter(page,name,scenario){
  // Native screenshots only: never force an app render or extract model pixels.
  const stage=page.locator('#stage'),canvas=stage.locator('canvas');
  const actual=await stage.screenshot({path:path.join(out,name+'.png')});
  const previous=await canvas.evaluate(el=>{const previous=el.style.visibility;el.style.visibility='hidden';return previous;});
  let room;try{room=await stage.screenshot();}finally{await canvas.evaluate((el,value)=>{el.style.visibility=value;},previous);}
  const pixels=difference(actual,room);scenario.frames.push({name,...pixels});
  assert.ok(pixels.changed>pixels.width*pixels.height*.025,`${name}: only the room is visible`);
  assert.ok(pixels.head>pixels.width*pixels.height*.002,`${name}: character head is missing`);
  return actual;
}
async function ready(page,url){
  await page.goto(url);await page.waitForFunction(()=>['true','error'].includes(document.documentElement.dataset.ready),null,{timeout:60000});
  assert.equal(await page.locator('html').getAttribute('data-ready'),'true');
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port,url=base+'/dist/style-room-pages/index.html?v=rendering-regression&qa=1';
  report.sourceCommit=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../dist/style-room-pages/build.json'),'utf8')).sourceCommit;
  browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
  report.browser=browser.version();
  for(const mode of [{name:'default-desktop',width:1920,height:1080},{name:'canvas-desktop',width:1920,height:1080,noGpu:true},{name:'canvas-phone',width:390,height:844,noGpu:true}]){
    const scenario={name:mode.name,viewport:{width:mode.width,height:mode.height},frames:[],warnings:[]};report.scenarios.push(scenario);
    const context=await browser.newContext({viewport:scenario.viewport});if(mode.noGpu)await withoutGpu(context);
    const page=await context.newPage();page.setDefaultTimeout(30000);
    page.on('pageerror',error=>report.errors.push({mode:mode.name,message:error.message}));
    page.on('console',message=>{if(['error','warning'].includes(message.type()))scenario.warnings.push(message.text());});
    try{
      await ready(page,url);scenario.renderer=await page.locator('#stage').getAttribute('data-renderer');
      if(mode.noGpu)assert.equal(scenario.renderer,'canvas');
      assert.equal(await page.evaluate(()=>typeof window.__campaign),'undefined','Primary reproduction must use the public path');
      const initial=await visibleCharacter(page,mode.name+'-initial',scenario);
      await page.locator('[data-category=bottom]').click();await page.locator('[data-item=bottom_cute_02]').click();
      await page.locator('[data-category=shoes]').click();await page.locator('[data-item=shoes_cute_02]').click();
      const equipped=await visibleCharacter(page,mode.name+'-equipped',scenario);
      assert.ok(difference(equipped,initial).changed>500,'Outfit selection must change visible clothing');
      await page.locator('#detail-view').click();assert.equal(await page.locator('#detail-view').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#full-view').getAttribute('aria-pressed'),'false');await visibleCharacter(page,mode.name+'-details',scenario);
      await page.locator('#full-view').click();
      await page.locator('#reveal').click();assert.equal(await page.locator('#result').evaluate(el=>el.open),true);
      await page.waitForFunction(()=>{const img=document.querySelector('#result-image');return img.complete&&img.naturalWidth===600;});
      assert.equal(await page.locator('#portrait-warning').isVisible(),false);assert.equal(await page.locator('#download').isEnabled(),true);
      assert.match(await page.locator('#campaign-progress').innerText(),/^1 \/ 36/);
      await page.screenshot({path:path.join(out,mode.name+'-reveal.png')});
      await page.locator('#retry-look').click();await page.locator('#book-open').click();await page.locator('[data-saved="1"]').click();
      await visibleCharacter(page,mode.name+'-wear-again',scenario);
      await page.locator('#reveal').click();await page.locator('#next-level').click();assert.match(await page.locator('#level-number').innerText(),/^02/);
      await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
      await visibleCharacter(page,mode.name+'-reload',scenario);
      assert.deepEqual(scenario.warnings,[]);scenario.result='passed';
    }finally{await context.close();}
  }
  // A separate fault test may inspect the test hook after public-path coverage.
  const context=await browser.newContext({viewport:{width:1280,height:900}});await withoutGpu(context);
  const page=await context.newPage();page.on('pageerror',error=>report.errors.push({mode:'portrait-failure',message:error.message}));
  try{
    await ready(page,url+'&test=1');
    const before=await page.evaluate(()=>{
      const r=window.__campaign.renderer,e=r.app.renderer.extract;
      window.__restoreExtract=()=>{e.canvas=window.__originalExtract;};window.__originalExtract=e.canvas;
      e.canvas=()=>{throw new Error('Injected portrait extraction failure');};
      return {x:r.model.x,y:r.model.y,sx:r.model.scale.x,sy:r.model.scale.y};
    });
    await page.locator('#reveal').click();assert.equal(await page.locator('#result').evaluate(el=>el.open),true);
    assert.equal(await page.locator('#portrait-warning').isVisible(),true);assert.equal(await page.locator('#download').isDisabled(),true);
    assert.equal(await page.locator('#result-image').isVisible(),false);assert.ok(Number(await page.locator('#score').innerText())>=35);
    assert.deepEqual(await page.evaluate(()=>{const m=window.__campaign.renderer.model;return{x:m.x,y:m.y,sx:m.scale.x,sy:m.scale.y};}),before,'Failed capture restores the pose');
    await page.evaluate(()=>window.__restoreExtract());await page.locator('#retry-look').click();await page.locator('#reveal').click();
    assert.equal(await page.locator('#portrait-warning').isVisible(),false);assert.equal(await page.locator('#download').isEnabled(),true);
    report.scenarios.push({name:'portrait-failure',result:'passed',checks:['score remains readable','capture transform restored','stale image removed','image download recovers']});
  }finally{await context.close();}
  assert.deepEqual(report.errors,[]);console.log('PASS: GPU fallback, visible character, Details, reveal, saved looks and portrait failure recovery');
})().catch(error=>{report.failure=error.stack;console.error(error);process.exitCode=1;}).finally(async()=>{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();
});
