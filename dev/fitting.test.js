'use strict';
// Compare garment pixels with the actual painted bodies, not their SVG bounds.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright'),{createServer}=require('./server');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/fitting');fs.mkdirSync(out,{recursive:true});
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const report={version:require('../package.json').version,channel,checks:[],errors:[]};
const server=createServer();let browser;
const pass=text=>{report.checks.push(text);console.log('PASS:',text);};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const pixels=await page.evaluate(async()=>{
  const W=360,H=640;
  const paint=async svg=>{const im=await MuseShare.loadImage(svg),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0,W,H);return x.getImageData(0,0,W,H).data;};
  const clothes=MuseData.items.filter(i=>['top','bottom','dress','shoes'].includes(i.category));
  const arts=new Map();for(const i of clothes)arts.set(i.id,await paint(MuseArt.fittedItemSvg(i)));
  const findings=[],pairs=[],failures=[];
  const coverage=(base,art,wanted)=>{let total=0,holes=0,maxRun=0,samples=[];for(let y=0;y<H;y++){let run=0;for(let x=0;x<W;x++){const p=(y*W+x)*4;if(base[p+3]>245&&wanted(x*2,y*2,p)&&art[p+3]<230){holes++;run++;maxRun=Math.max(maxRun,run);if(samples.length<12)samples.push([x*2,y*2]);}else run=0;if(base[p+3]>245&&wanted(x*2,y*2,p))total++;}}return {total,holes,ratio:holes/Math.max(1,total),maxRun,samples};};
  const longSleeves=['cardigan','sweater','hoodie','jacket','blazer','frog','mandarin','blouse'];
  const basic=(base,p)=>base[p+2]>base[p]+4&&base[p+2]>base[p+1]+10;
  const dressEnd=s=>['gown','hanfu'].includes(s)?1180:s==='qipao'?1160:['aline','sport','pinafore'].includes(s)?780:1030;
  const lowerEnd=i=>i.category==='dress'?dressEnd(i.shape):i.shape==='shorts'?696:i.shape==='pleats'?750:i.shape==='midi'?1030:1148;
  // The gap between forearm and hip moves inward with the bent pose. Split
  // the painted components there so a skirt is not asked to cover bare hands.
  const torsoEdge=y=>{const points=[[320,278],[420,277],[440,279],[480,275],[500,273],[520,264],[540,252],[560,241],[580,231],[600,222],[620,216]];for(let i=1;i<points.length;i++)if(y<=points[i][0]){const [a,b]=points[i-1],[c,d]=points[i];return b+(d-b)*(y-a)/(c-a);}return 216;};
  const wanted=(base,item)=>(x,y,p)=>{
   const c=item.category,s=item.shape;
   if(c==='shoes'){
    // Open sandals intentionally expose the toes; every other shape has a closed toe.
    if(s==='sandal')return y>=1210&&y<1218&&x>275&&x<445;
    return x>260&&x<460&&y>=1204&&y<1230||s==='boot'&&x>240&&x<480&&y>=952&&y<1150;
   }
   const upper=c==='top'||c==='dress',lower=c==='bottom'||c==='dress';
   if(upper&&y>=282&&y<510&&x>255&&x<465&&basic(base,p))return true;
   if(upper&&y>=358&&y<508&&x>=302&&x<=418)return true;
   if(lower&&y>=515&&y<lowerEnd(item)&&x>Math.max(224,torsoEdge(y))&&x<720-Math.max(224,torsoEdge(y)))return true;
   const sleeved=upper&&(longSleeves.includes(s)||c==='dress'&&s==='knit'||s==='hanfu');
   if(sleeved&&y>=320&&y<(s==='hanfu'?536:609)&&(x>155&&x<torsoEdge(y)||x>720-torsoEdge(y)&&x<565))return true;
   if(upper&&['tee','polo','puff','pinafore'].includes(s)&&y>=320&&y<374&&(x>220&&x<277||x>443&&x<500))return true;
   return false;
  };
  const interval=(data,y,lo,hi)=>{const xs=[];for(let x=Math.ceil(lo/2);x<=Math.floor(hi/2);x++)if(data[(Math.floor(y/2)*W+x)*4+3]>230)xs.push(x*2);return xs.length?[xs[0],xs.at(-1)]:null;};
  const width=r=>r?r[1]-r[0]+2:0;
  let nativeNegative,shiftNegative,wideNegative;
  for(const character of MuseData.characters){
   const base=await paint(MuseArt.avatarSvg(character));
   for(const item of clothes){
    const art=arts.get(item.id),cover=coverage(base,art,wanted(base,item)),entry={character:character.id,item:item.id,...cover};
    if(cover.ratio>.003||cover.maxRun>3)failures.push(`${character.id}/${item.id} exposed ${cover.holes}/${cover.total}; run ${cover.maxRun}`);
    // Check ease at waist/hip/calf, independently of the garment's authored paths.
    if(['top','dress'].includes(item.category)){
     const body=interval(base,480,280,440),fabric=interval(art,480,280,440);entry.waistEase=width(fabric)-width(body);
     if(entry.waistEase<0||entry.waistEase>38)failures.push(`${character.id}/${item.id} waist ease ${entry.waistEase}`);
    }
    if(['bottom','dress'].includes(item.category)){
     const body=interval(base,625,215,505),fabric=interval(art,625,215,505);entry.hipEase=width(fabric)-width(body);
     if(entry.hipEase<2||entry.hipEase>60)failures.push(`${character.id}/${item.id} hip ease ${entry.hipEase}`);
     if(item.category==='bottom'&&!['shorts','pleats','midi','mamian'].includes(item.shape)){
      const body=interval(base,940,220,358),fabric=interval(art,940,210,358);entry.calfRatio=width(fabric)/width(body);
      if(entry.calfRatio<1||entry.calfRatio>1.65)failures.push(`${character.id}/${item.id} calf ratio ${entry.calfRatio}`);
     }
    }
    findings.push(entry);
   }
   // All separate combinations must cover the waist seam; cache the two painted
   // alpha masks so this tests 1,449 combinations without taking 1,449 screenshots.
   for(const top of clothes.filter(i=>i.category==='top'))for(const bottom of clothes.filter(i=>i.category==='bottom')){
    const a=arts.get(top.id),b=arts.get(bottom.id);let total=0,holes=0;
    for(let y=245;y<278;y++)for(let x=132;x<228;x++){const p=(y*W+x)*4+3;if(base[p]>245){total++;if(Math.max(a[p],b[p])<230)holes++;}}
    if(holes>2)failures.push(`${character.id}/${top.id}+${bottom.id} waist gap ${holes}`);
    pairs.push({character:character.id,top:top.id,bottom:bottom.id,holes,total});
   }
   if(character.id==='bella'){
    const item=MuseData.items.find(i=>i.id==='bottom_casual_01'),source=MuseArt.fittedItemSvg(item);
    const shifted=source.replace('<defs>','<g transform="translate(80 0)"><defs>').replace('</svg>','</g></svg>');
    shiftNegative=coverage(base,await paint(shifted),wanted(base,item));
    // An old skirt narrowed around the hips is the exact class of reported bug.
    const skirt=MuseData.items.find(i=>i.id==='bottom_silk_19'),narrow=MuseArt.fittedItemSvg(skirt).replace('<defs>','<g transform="translate(72 0) scale(.8 1)"><defs>').replace('</svg>','</g></svg>');
    nativeNegative=coverage(base,await paint(narrow),wanted(base,skirt));
    const wide=MuseArt.fittedItemSvg(MuseData.items.find(i=>i.id==='top_casual_01')).replace('<defs>','<g transform="translate(-180 0) scale(1.5 1)"><defs>').replace('</svg>','</g></svg>');
    wideNegative=width(interval(await paint(wide),480,240,480))-width(interval(base,480,280,440));
   }
  }
  return {findings,pairs,failures,shiftNegative,nativeNegative,wideNegative};
 });
 Object.assign(report,pixels);
 assert.ok(pixels.shiftNegative.ratio>.03,'Shifted trousers must fail coverage');
 assert.ok(pixels.nativeNegative.ratio>.003,'Narrow skirt must expose the hips');
 assert.ok(pixels.wideNegative>38,'Overwide top must fail the ease check');
 pass('Shifted trousers, narrow skirt and oversized top are rejected by independent pixel checks');
 assert.deepEqual(pixels.failures,[]);
 pass(pixels.findings.length+' garment/body checks: all 82 garments on all three characters, including tops, sleeves, dresses, hips and footwear');
 pass(pixels.pairs.length+' top/bottom combinations have no waist gap');
 await page.close();
 report.layouts=[];
 for(const [width,height] of [[320,568],[375,667],[390,844],[667,375],[768,1024],[1024,540],[1024,768],[1440,600],[1440,900]]){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));
  await p.addInitScript(()=>{localStorage.clear();});await p.goto('http://127.0.0.1:'+server.address().port);await p.locator('[data-action=play]').click();
  await p.locator('[data-category=shoes]').click();await p.locator('[data-item=shoes_casual_01]').click();
  for(const character of ['bella','mika','zoe']){
   await p.locator(`.character-selector [data-character=${character}]`).click();
   const layout=await p.evaluate(()=>{
    const stage=document.querySelector('.fitting-stage'),selector=document.querySelector('.character-selector'),avatar=document.querySelector('#avatar-slot svg');
    const s=stage.getBoundingClientRect(),r=selector.getBoundingClientRect(),matrix=avatar.getScreenCTM();
    const a=new DOMPoint(250,1130).matrixTransform(matrix),b=new DOMPoint(470,1278).matrixTransform(matrix);
    const feet={left:a.x,top:a.y,right:b.x,bottom:b.y};
    const overlaps=(a,b)=>a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;
    const buttons=[...selector.querySelectorAll('button')];
    return {outsideStage:!stage.contains(selector),noStageOverlap:!overlaps(s,r),feetVisible:feet.left>=s.left&&feet.right<=s.right&&feet.top>=s.top&&feet.bottom<=s.bottom,feetClear:!overlaps(feet,r),choicesVisible:buttons.every(n=>{const q=n.getBoundingClientRect();return q.width>=30&&q.height>=34&&q.left>=0&&q.right<=innerWidth&&q.top>=0&&q.bottom<=innerHeight;}),scoreVisible:document.querySelector('[data-action=score]').getBoundingClientRect().bottom<=innerHeight+1,noOverflow:document.documentElement.scrollWidth<=innerWidth+1,feet,selector:{left:r.left,top:r.top,right:r.right,bottom:r.bottom}};
   });
   for(const key of ['outsideStage','noStageOverlap','feetVisible','feetClear','choicesVisible','scoreVisible','noOverflow'])assert.equal(layout[key],true,`${width}x${height}/${character}: ${key}`);
   report.layouts.push({width,height,character,...layout});
  }
  await p.screenshot({path:path.join(out,`studio-${width}x${height}.png`)});
  // Negative control: reproduce the old overlay and require rectangle collision.
  if(width===1440&&height===900){const detected=await p.evaluate(()=>{const n=document.querySelector('.character-selector'),s=document.querySelector('.fitting-stage');s.append(n);n.style.cssText='position:absolute;left:10%;right:10%;bottom:0;height:110px;z-index:99';const a=s.getBoundingClientRect(),b=n.getBoundingClientRect();return a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;});assert.ok(detected);}
  await p.close();
 }
 pass('27 character/viewport checks: selector outside stage, full shoes visible, controls and score reachable; old overlay negative control detected');
 assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'report-'+channel+'.json'),JSON.stringify(report,null,2));});
