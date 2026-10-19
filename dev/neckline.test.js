'use strict';
// Use the painted sprite as the reference, independently of SVG drafting paths.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright'),{createServer}=require('./server');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/neckline');fs.mkdirSync(out,{recursive:true});
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const report={version:require('../package.json').version,channel,checks:[],errors:[]};
const server=createServer();let browser;
const pass=text=>{report.checks.push(text);console.log('PASS:',text);};
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 const results=await page.evaluate(async()=>{
  const W=720,H=1280;
  const paint=async svg=>{const im=await MuseShare.loadImage(svg),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.drawImage(im,0,0);return x.getImageData(0,0,W,H).data;};
  const alpha=(a,x,y)=>a[(y*W+x)*4+3];
  const measure=(base,art,standing)=>{
   let first=null,left=W,right=0,bodyLeft=W,bodyRight=0,coveredNeck=0,coveredOpening=0,strapHoles=0;const strapSamples=[];
   // The first opaque neckline row must attach close to the *actual* neck's
   // left/right boundaries, allowing small seam ease but no boat-shaped float.
   for(let y=255;y<310&&first===null;y++)for(let x=280;x<=440;x++)if(alpha(art,x,y)>230){first=y;left=Math.min(left,x);right=Math.max(right,x);}
   if(first!==null)for(let x=300;x<=420;x++)if(alpha(base,x,first)>230){bodyLeft=Math.min(bodyLeft,x);bodyRight=Math.max(bodyRight,x);}
   for(let y=245;y<265;y++)for(let x=344;x<376;x++)if(alpha(base,x,y)>245&&alpha(art,x,y)>8)coveredNeck++;
   if(!standing)for(let y=282;y<288;y++)for(let x=356;x<364;x++)if(alpha(base,x,y)>245&&alpha(art,x,y)>8)coveredOpening++;
   for(let y=280;y<320;y++)for(let x=270;x<450;x++){const p=(y*W+x)*4;if(base[p+3]>245&&base[p+2]>base[p]+4&&base[p+2]>base[p+1]+10&&art[p+3]<230){strapHoles++;if(strapSamples.length<10)strapSamples.push([x,y]);}}
   return {first,left,right,bodyLeft,bodyRight,ease:right-left-(bodyRight-bodyLeft),offset:(left+right-bodyLeft-bodyRight)/2,coveredNeck,coveredOpening,strapHoles,strapSamples};
  };
  const valid=r=>r.first!==null&&r.ease>=-10&&r.ease<=16&&Math.abs(r.offset)<=6&&r.coveredNeck===0&&r.coveredOpening===0&&r.strapHoles<=2;
  const garments=MuseData.items.filter(i=>['top','dress'].includes(i.category)),arts=new Map();
  for(const item of garments)arts.set(item.id,await paint(MuseArt.fittedItemSvg(item)));
  const findings=[],failures=[],negatives=[];
  const fixture=body=>`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280">${body}</svg>`;
  // Reproduce the previous wide, shallow rim. It must fail on every body,
  // even when the rest of the shirt covers the lavender basics correctly.
  const oldRim=await paint(fixture('<path d="M300 284 Q360 307 420 284 L420 320 L300 320Z" fill="white"/>'));
  const chinCover=await paint(fixture('<rect x="280" y="240" width="160" height="90" fill="white"/>'));
  for(const c of MuseData.characters){
   const base=await paint(MuseArt.avatarSvg(c));
   for(const item of garments){const entry={character:c.id,item:item.id,...measure(base,arts.get(item.id),['frog','mandarin','qipao'].includes(item.shape))};findings.push(entry);if(!valid(entry))failures.push(entry);}
   const wide=measure(base,oldRim,false),high=measure(base,chinCover,false);
   negatives.push({character:c.id,oldRimEase:wide.ease,rejectedOldRim:wide.ease>16,rejectedChinCover:high.coveredNeck>0});
  }
  return {findings,failures,negatives};
 });
 Object.assign(report,results);
 assert.ok(results.negatives.every(n=>n.rejectedOldRim&&n.rejectedChinCover),'Old rim and chin-covering garment must fail');
 pass('Old wide neckline and fabric covering the chin are rejected on all three bodies');
 assert.deepEqual(results.failures,[]);
 pass('129 neckline/body pairs: neck-root contact, visible neck opening and covered basic straps');
 // Keep enlarged contact sheets as review evidence, rather than hiding small
 // neckline errors in full-body snapshots.
 for(const c of ['bella','mika','zoe']){
  const content=await page.evaluate(id=>MuseData.items.filter(i=>['top','dress'].includes(i.category)).map(item=>`<figure><figcaption>${item.name}</figcaption>${MuseArt.avatarSvg(MuseData.characters.find(c=>c.id===id),[item],item.id).replace('width="720" height="1280" viewBox="0 0 720 1280"','width="100%" height="100%" viewBox="200 210 320 230"')}</figure>`).join(''),c);
  await page.setContent('<style>body{margin:0;background:#ede5ef;font:12px Arial;color:#30263b}main{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:12px}figure{height:205px;position:relative;margin:0;background:#e1d5e2;border-radius:8px;overflow:hidden}figcaption{position:absolute;left:8px;top:7px}svg{display:block}</style><main>'+content+'</main>');
  await page.locator('svg image').evaluateAll(nodes=>Promise.all(nodes.map(n=>{const im=new Image();im.src=n.getAttribute('href');return im.decode();})));
  await page.screenshot({path:path.join(out,c+'-necklines.png'),fullPage:true});
 }
 pass('Three enlarged contact sheets capture every neckline for visual review');
 assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'report-'+channel+'.json'),JSON.stringify(report,null,2));});
