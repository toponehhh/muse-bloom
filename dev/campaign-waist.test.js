'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const install=require('./wearable-probes'),reference=require('./fixtures/wearable-contacts.json');
const out=path.resolve(__dirname,'../artifacts/waist-fit'),report={checks:[],pairs:0,frames:0,errors:[]};
fs.mkdirSync(out,{recursive:true});let browser;const server=createServer();
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/dist/style-room-pages/index.html?test=1&qa=1');
 await page.locator('html[data-ready=true]').waitFor();await page.evaluate(install,reference);
 const inventory=await page.evaluate(()=>({tops:window.__campaign.D.items.filter(i=>i.category==='top').map(i=>i.id),bottoms:window.__campaign.D.items.filter(i=>i.category==='bottom').map(i=>i.id),shoes:window.__campaign.D.items.filter(i=>i.category==='shoes').map(i=>i.id)}));
 await page.evaluate(()=>{
  const {renderer:r}=window.__campaign,p=window.fitProbe,rect=[425,560,185,62],bottomCache=new Map(),topCache=new Map();
  window.waistCheck=(top,bottom,time)=>{
   p.outfit('shoes_cute_02',bottom,[],top);r.seek(time);
   const lower=r.cache.get(bottom),upper=r.cache.get(top);
   const lowerKey=bottom+':'+time;if(!bottomCache.has(lowerKey))bottomCache.set(lowerKey,p.capture(rect,[lower.mesh,...(lower.waist?[lower.waist.mesh]:[])]).pixels);
   const key=top+':'+time;if(!topCache.has(key))topCache.set(key,p.capture(rect,[upper.mesh]).pixels);
   const pants=bottomCache.get(lowerKey),shirt=topCache.get(key),actual=p.capture(rect).pixels;
   let overlap=0,covered=0,wrong=0;
   for(let i=0;i<actual.length;i+=4){
    if(pants[i+3]>=253){covered++;if(shirt[i+3]>230){overlap++;if([0,1,2].some(c=>Math.abs(actual[i+c]-pants[i+c])>9))wrong++;}}
   }
   if(covered<1000||overlap<20||wrong)throw new Error(`${top} / ${bottom} @ ${time}: waistband ${covered}, overlap ${overlap}, hidden ${wrong}`);
   return {overlap};
  };
 });
 for(const top of inventory.tops){
  const overlap=await page.evaluate(({top,bottoms})=>{let overlap=0;for(const bottom of bottoms)for(const time of [0,1.5,3,4.5])overlap+=window.waistCheck(top,bottom,time).overlap;return overlap;},{top,bottoms:inventory.bottoms});
  report.pairs+=inventory.bottoms.length;report.frames+=inventory.bottoms.length*4;report.overlapPixels=(report.overlapPixels||0)+overlap;
 }
 report.checks.push('All 23 tops × 21 bottoms × four poses: actual waistband pixels stay in front of overlapping shirt pixels');
 const negative=await page.evaluate(()=>{
  window.waistCheck('top_casual_01','bottom_cozy_03',0);const layer=window.__campaign.renderer.cache.get('bottom_cozy_03').waist.mesh,z=layer.zIndex;
  try{layer.zIndex=19;try{window.waistCheck('top_casual_01','bottom_cozy_03',0);return false;}catch{return true;}}finally{layer.zIndex=z;}
 });assert.equal(negative,true,'Reintroducing the hidden waistband must fail');
 for(const shoe of inventory.shoes){
  const anatomy=await page.evaluate(({shoe,reference})=>{
   const t=window.__campaign,r=t.renderer,p=window.fitProbe;p.outfit(shoe,'bottom_summer_04',[],'top_casual_01');r.seek(0);
   const item=t.G.byId[shoe],layer=r.cache.get(shoe),points=reference.shoes[item.shape],sole=reference.soles[item.shape];
   const angles=points.uv.map((uv,i)=>{const ankle=p.uvPoint((layer.back||layer).mesh,uv),toe=p.uvPoint(layer.mesh,sole[i]);return toe.x-ankle.x;});
   if(!(angles[0]<-10&&angles[1]>10))throw new Error(shoe+' toes turn inward or feet were swapped');
   if(['maryjane','embroidered'].includes(item.shape)){
    const left=p.uvPoint(layer.mesh,[75,232]),right=p.uvPoint(layer.mesh,[438,232]);
    if(!(left.x<430&&right.x>650))throw new Error(shoe+' buckles must face outward');
   }
   const pixels=p.capture([375,1280,355,230],[layer.mesh,...(layer.back?[layer.back.mesh]:[])]).pixels;
   let smooth=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>8&&pixels[i]<245)smooth++;
   if(smooth<150)throw new Error(shoe+' has no antialiased edge coverage');
   r.resize();return {angles,smooth};
  },{shoe,reference});
  report.checks.push({shoe,...anatomy});
  if(['shoes_cute_02','shoes_chic_03','shoes_elegant_07','shoes_summer_04'].includes(shoe))await page.locator('#stage').screenshot({path:path.join(out,shoe+'.png')});
 }
 // Open jacket hems must reveal skin above the trousers, never transparent holes.
 const skin=await page.evaluate(()=>{
  const r=window.__campaign.renderer,p=window.fitProbe;p.outfit('shoes_cute_02','bottom_cozy_03',[],'top_formal_07');r.seek(0);
  const points=[[443,560],[587,560]],lining=r.cache.get('top_formal_07').lining.mesh;
  for(const [x,y]of points){const a=p.capture([x,y,3,3]).pixels,cloth=p.capture([x,y,3,3],[lining]).pixels;for(let i=3;i<a.length;i+=4)if(a[i]<240||cloth[i]<240)throw new Error('Inner tee does not cover jacket hem at '+x+','+y);}
  r.resize();return points;
 });report.checks.push({skin});await page.locator('#stage').screenshot({path:path.join(out,'blazer-trousers.png')});
 for(const [width,height]of [[1440,1000],[390,844]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{const t=window.__campaign;t.state.save.unlockedItems=t.D.items.map(i=>i.id);t.setOutfit({top:'top_winter_09',bottom:'bottom_cozy_03',shoes:'shoes_cute_02'});});
  await page.locator('[data-category=top]').click();await page.locator('[data-item=top_cozy_02]').click();await page.locator('#undo').click();
  assert.equal(await page.evaluate(()=>window.__campaign.state.outfit.top),'top_winter_09');
  await page.locator('#detail-view').click();await page.locator('#full-view').click();await page.locator('#reveal').click();
  await page.waitForFunction(()=>document.querySelector('#result-image').naturalWidth===600);await page.locator('#retry-look').click();
  await page.locator('#stage').screenshot({path:path.join(out,'waist-ui-'+width+'.png')});
 }
 assert.deepEqual(report.errors,[]);console.log('PASS: '+report.pairs+' waist pairs / '+report.frames+' animated frames, all 18 shoes, negative control, skin coverage, Undo / Details / portrait');
})().catch(error=>{report.failure=error.stack;console.error(error);process.exitCode=1}).finally(async()=>{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser?.close();server.close();});
