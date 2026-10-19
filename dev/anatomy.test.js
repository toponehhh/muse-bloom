'use strict';
// Independent measurements of the rendered silhouette and light, not rig constants.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
const {createServer}=require('./server');
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const out=path.resolve(__dirname,'../artifacts/anatomy');fs.mkdirSync(out,{recursive:true});
const report={version:require('../package.json').version,channel,checks:[],errors:[]};
async function main(){
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try{
    browser=await chromium.launch({channel,headless:true});report.browser=browser.version();
    const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto('http://127.0.0.1:'+server.address().port);
    await page.locator('[data-action="play"]').click();await page.locator('[data-action="clear"]').click();
    const result=await page.evaluate(async()=>{
      const wrap=inside=>`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">${inside}</svg>`;
      const raster=async source=>{const image=new Image();image.src=MuseArt.uri(source);await image.decode();const canvas=document.createElement('canvas');canvas.width=720;canvas.height=1280;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);return ctx.getImageData(0,0,720,1280).data;};
      const row=(pixels,y,lo,hi)=>{const filled=[];for(let x=lo;x<=hi;x++)if(pixels[(y*720+x)*4+3]>245)filled.push(x);if(!filled.length)throw Error('Missing silhouette on row '+y);return {left:filled[0],right:filled.at(-1),width:filled.at(-1)-filled[0]+1,center:(filled[0]+filled.at(-1))/2};};
      const bend=pixels=>{
        const shoulder=row(pixels,430,170,550),elbow=row(pixels,555,170,550),wrist=row(pixels,728,170,550);
        const upper=Math.atan2(elbow.center-shoulder.center,125),lower=Math.atan2(wrist.center-elbow.center,173);
        return {degrees:Math.abs(upper-lower)*180/Math.PI,shoulder,elbow,wrist};
      };
      const checkBend=measure=>{if(measure.degrees<20||measure.degrees>38)throw Error('Elbow articulation outside natural reviewed range');if(measure.elbow.width>=measure.shoulder.width||measure.wrist.width>=measure.elbow.width)throw Error('Elbow and wrist must taper from the upper arm');};
      const waist=pixels=>{const a=row(pixels,570,285,435),b=row(pixels,690,285,435);return {waist:a.width,hips:b.width,ratio:a.width/b.width};};
      const checkWaist=m=>{if(m.ratio<.55||m.ratio>.75)throw Error('Waist and hip silhouette regressed');};
      const light=pixels=>{
        const span=row(pixels,1060,298,359),sample=t=>{const i=(1060*720+Math.round(span.left+(span.width-1)*t))*4;return .2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2];};
        return {front:sample(.3),edge:sample(.87),contrast:sample(.3)-sample(.87)};
      };
      const checkLight=m=>{if(m.contrast<18)throw Error('Rounded limb lighting is missing');};
      const rejects=(check,value)=>{try{check(value);}catch{return true;}return false;};
      const evidence=[],masks=[];
      for(const skin of MuseData.skins){
        const source=MuseArt.body(skin),doc=new DOMParser().parseFromString(source,'image/svg+xml');
        const pixels=await raster(source),arms=[];
        for(const side of ['left','right']){
          const d=doc.querySelector(`[data-volume="${side}-arm"]`).getAttribute('d');
          const alpha=await raster(wrap(`<path d="${d}" fill="white"/>`)),measurement=bend(alpha);checkBend(measurement);arms.push({side,...measurement});
          if(skin===MuseData.skins[0])masks.push(alpha);
        }
        const curve=waist(pixels),volume=light(pixels);checkWaist(curve);checkLight(volume);
        const seams=[];
        for(const x of [240,480]){
          const difference=Math.max(...[0,1,2].map(channel=>Math.abs(pixels[(724*720+x)*4+channel]-pixels[(738*720+x)*4+channel])));
          if(difference>12)throw Error(`Forearm/hand material seam: ${skin.id}, x=${x}, difference=${difference}`);
          seams.push({x,difference});
        }
        evidence.push({skin:skin.id,arms,curve,volume,seams});
      }
      // Replace the shape/material with the very failure modes this test protects.
      const straight=await raster(wrap('<path d="M260 430 L300 430 L258 730 L218 730Z" fill="white"/>'));
      if(!rejects(checkBend,bend(straight)))throw Error('Straight-arm negative control escaped');
      const column=await raster(wrap('<rect x="300" y="400" width="120" height="400" fill="white"/>'));
      if(!rejects(checkWaist,waist(column)))throw Error('Straight-waist negative control escaped');
      const flat=new DOMParser().parseFromString(MuseArt.body(MuseData.skins[0]),'image/svg+xml');
      for(const stop of flat.querySelectorAll('#skin-cylinder stop'))stop.setAttribute('stop-color',MuseData.skins[0].color);
      if(!rejects(checkLight,light(await raster(new XMLSerializer().serializeToString(flat)))))throw Error('Flat-material negative control escaped');
      const sleeves=[];
      for(const item of MuseData.items.filter(i=>i.category==='top'&&['cardigan','sweater','hoodie','jacket','blazer','frog','mandarin','blouse'].includes(i.shape))){
        const pixels=await raster(MuseArt.itemSvg(item));let tested=0,covered=0;
        for(const y of [470,520,555,600,650,680])for(const mask of masks){const edge=row(mask,y,170,550);for(let x=edge.left+3;x<=edge.right-3;x++){tested++;if(pixels[(y*720+x)*4+3]>245)covered++;}}
        const coverage=covered/tested;if(coverage<.99)throw Error(`Sleeve exposes the bent arm: ${item.id}, coverage=${coverage}`);
        sleeves.push({id:item.id,coverage,tested});
      }
      return {skins:evidence,sleeves,negativeControls:['straight arms','column waist','flat skin material']};
    });
    Object.assign(report,result);
    report.checks.push('Both rendered elbows bend 20–38 degrees and taper towards each wrist, across all four skin tones');
    report.checks.push('Rendered waist width is 55–75% of the hip width, across all four skin tones');
    report.checks.push('Rounded calf highlights exceed edge luminance by at least 18/255, across all four skin tones');
    report.checks.push('Every long sleeve covers at least 99% of sampled arm interiors, including both elbow bends');
    report.checks.push('Forearm and hand materials differ by at most 12/255 at both wrists across all four skin tones');
    report.checks.push('Straight arms, a column torso and flattened materials all fail their respective pixel checks');
    assert.deepEqual(report.errors,[]);report.status='passed';
  }catch(error){report.status='failed';report.errors.push(error.stack||String(error));throw error;}
  finally{await browser?.close();await new Promise(resolve=>server.close(resolve));for(const name of ['anatomy-report.json',`anatomy-report-${channel}.json`])fs.writeFileSync(path.join(out,name),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
