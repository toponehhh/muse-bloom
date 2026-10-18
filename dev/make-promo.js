'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
const root=path.resolve(__dirname,'..'),promo=path.join(root,'promo'),artifacts=path.join(root,'artifacts');
const base=process.env.MUSE_URL||'http://127.0.0.1:4173';
fs.mkdirSync(promo,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function recordVideo(browser,name,viewport,scale){
  const context=await browser.newContext({viewport,deviceScaleFactor:scale,hasTouch:scale>1});
  const page=await context.newPage();
  await page.goto(base);await page.locator('[data-action="play"]').click();
  const cover=fs.readFileSync(path.join(promo,`cover-${name}.png`)).toString('base64');
  await page.evaluate(b64=>{const img=new Image();img.id='record-cover';img.src='data:image/png;base64,'+b64;Object.assign(img.style,{position:'fixed',inset:'0',width:'100vw',height:'100vh',objectFit:'cover',zIndex:999999});document.body.append(img);return img.decode();},cover);
  const framesDir=path.join(artifacts,'video-'+name);fs.mkdirSync(framesDir,{recursive:true});
  const client=await context.newCDPSession(page),frames=[];
  client.on('Page.screencastFrame',event=>{
    const file=`frame-${String(frames.length).padStart(5,'0')}.jpg`;
    fs.writeFileSync(path.join(framesDir,file),Buffer.from(event.data,'base64'));
    frames.push({file,time:event.metadata.timestamp});client.send('Page.screencastFrameAck',{sessionId:event.sessionId}).catch(()=>{});
  });
  await client.send('Page.startScreencast',{format:'jpeg',quality:91,maxWidth:viewport.width*scale,maxHeight:viewport.height*scale,everyNthFrame:2});
  const start=Date.now();
  async function at(ms,fn){await wait(Math.max(0,start+ms-Date.now()));if(fn)await fn();}
  await at(1100,()=>page.evaluate(()=>document.getElementById('record-cover').remove()));
  await at(2100,()=>page.locator('[data-item="top_cozy_02"]').click());
  await at(3900,()=>page.locator('[data-category="bottom"]').click());
  await at(5000,()=>page.locator('[data-item="bottom_cute_02"]').click());
  await at(6800,()=>page.locator('[data-category="shoes"]').click());
  await at(7900,()=>page.locator('[data-item="shoes_summer_04"]').click());
  await at(9700,()=>page.locator('[data-category="accessory"]').click());
  await at(10800,()=>page.locator('[data-item="accessory_elegant_02"]').click());
  await at(12200,()=>page.locator('[data-item="accessory_cute_03"]').click());
  await at(14300,()=>page.locator('[data-action="score"]').click());
  await at(17900);
  // Force a final frame; timestamps preserve the real pacing of the recorded play.
  await page.screenshot({path:path.join(framesDir,'last.jpg'),type:'jpeg',quality:91});
  await client.send('Page.stopScreencast');
  const duration=(Date.now()-start)/1000;
  const lines=[];
  for(let i=0;i<frames.length;i++){lines.push(`file '${frames[i].file}'`);lines.push('option framerate 1000');lines.push(`duration ${i+1<frames.length?Math.max(.016,frames[i+1].time-frames[i].time):Math.max(.05,duration-(frames[i].time-frames[0].time))}`);}
  lines.push("file 'last.jpg'",'option framerate 1000');fs.writeFileSync(path.join(framesDir,'frames.txt'),lines.join('\n'));
  const ffmpeg=process.env.MUSE_FFMPEG;if(!ffmpeg)throw new Error('Set MUSE_FFMPEG to an ffmpeg executable to encode preview videos.');
  const encoded=spawnSync(ffmpeg,['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(framesDir,'frames.txt'),'-t','18','-vf',`scale=${name==='landscape'?'1920:1080':'1080:1620'}:flags=lanczos:in_range=full:out_range=tv,format=yuv420p,fps=30,tpad=stop_mode=clone:stop_duration=2`,'-an','-c:v','libx264','-preset','fast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',path.join(promo,`preview-${name}.mp4`)],{encoding:'utf8',windowsHide:true});
  if(encoded.status!==0)throw new Error(encoded.stderr);
  const probe=spawnSync(ffmpeg,['-hide_banner','-i',path.join(promo,`preview-${name}.mp4`)],{encoding:'utf8',windowsHide:true});
  const match=probe.stderr.match(/Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/);
  const seconds=match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):0;
  if(seconds<15||seconds>20)throw new Error(`Preview duration ${seconds}s is outside the 15–20 second submission range.`);
  console.log(`Created ${seconds.toFixed(2)}-second ${name} preview from ${frames.length} real browser frames.`);await context.close();
}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
  try{
    const page=await browser.newPage();await page.goto(base+'/dev/promo.html');
    for(const [name,w,h] of [['landscape',1920,1080],['portrait',800,1200],['square',800,800]]){
      const data=await page.evaluate(([w,h])=>makeCover(w,h),[w,h]);
      fs.writeFileSync(path.join(promo,`cover-${name}.png`),Buffer.from(data.split(',')[1],'base64'));console.log(`Created ${name} cover ${w} × ${h}.`);
    }
    await page.close();
    if(!process.argv.includes('--covers-only')){
      await recordVideo(browser,'landscape',{width:1920,height:1080},1);
      await recordVideo(browser,'portrait',{width:540,height:810},2);
    }
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
