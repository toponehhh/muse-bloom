'use strict';
// Promotional compositions use the current game's renderer and wardrobe. This
// never touches the legacy promo/ files or invents art absent from the game.
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {chromium} = require('playwright');
const {createServer} = require('./server');
const portalMode=process.argv.includes('--portals');
const {verify, out:upload} = require(portalMode?'./package-style-portals':'./package-style-crazygames');
const root = path.resolve(__dirname, '..');
const release = verify();
const out = path.join(root, 'dist', `${portalMode?'portal':'crazygames'}-submission-v${release.version}`);
const scratch = path.join(root, 'artifacts/style-promo');
const metadata = {version:release.version, sourceCommit:release.sourceCommit, source:'Current game renderer and real browser gameplay', files:[]};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let browser; const server = createServer();
async function portalScreenshots(base){
  const page=await browser.newPage({viewport:{width:1440,height:1040},reducedMotion:'reduce'});
  try{
    await page.goto(base);await page.locator('html[data-ready=true]').waitFor({timeout:60000});
    const pick=async(category,id)=>{await page.locator(`[data-category="${category}"]`).click();await page.locator(`[data-item="${id}"]`).click();};
    const shot=async file=>{await page.screenshot({path:path.join(out,file),fullPage:true});metadata.files.push({file,width:1440,height:1040,bytes:fs.statSync(path.join(out,file)).size,source:'Actual UI, normal progression'});};
    await pick('top','top_cozy_02');await pick('bottom','bottom_cozy_03');await pick('shoes','shoes_cute_02');await page.locator('[data-category=top]').click();await shot('screenshot-wardrobe.png');
    await pick('top','top_casual_01');await pick('bottom','bottom_casual_01');await pick('shoes','shoes_casual_01');await pick('hair','hair_casual_01');
    await page.locator('#reveal').click();await page.locator('#next-level').click();
    await pick('dress','dress_elegant_02');await pick('shoes','shoes_cute_02');await page.locator('[data-category=dress]').click();await shot('screenshot-evening.png');
    await page.locator('#reveal').click();await page.waitForFunction(()=>document.querySelector('#result-image').naturalWidth>0);await shot('screenshot-results.png');
  }finally{await page.close();}
}
async function record(base, name, viewport, scale) {
  const context = await browser.newContext({viewport, deviceScaleFactor:scale, hasTouch:scale > 1});
  try {
    const page = await context.newPage();
    await page.goto(base); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, {timeout:60000});
    await page.addStyleTag({content:'*{cursor:none!important}'});
    await page.evaluate(async cover => {
      const image = new Image(); image.id = 'promo-cover'; image.src = cover;
      image.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;z-index:99999';
      document.body.append(image); await image.decode();
    }, 'data:image/png;base64,' + fs.readFileSync(path.join(out, `cover-${name}.png`)).toString('base64'));
    const folder = path.join(scratch, name); fs.mkdirSync(folder, {recursive:true});
    const client = await context.newCDPSession(page), frames = [];
    client.on('Page.screencastFrame', event => {
      const file = `frame-${String(frames.length).padStart(5,'0')}.jpg`;
      fs.writeFileSync(path.join(folder, file), Buffer.from(event.data, 'base64'));
      frames.push({file,time:event.metadata.timestamp});
      client.send('Page.screencastFrameAck', {sessionId:event.sessionId}).catch(() => {});
    });
    await client.send('Page.startScreencast', {format:'jpeg', quality:92, maxWidth:viewport.width*scale, maxHeight:viewport.height*scale, everyNthFrame:2});
    const start = Date.now();
    const at = async (ms, action) => {await wait(Math.max(0, start+ms-Date.now())); if(action) await action();};
    await at(1100, () => page.locator('#promo-cover').evaluate(node => node.remove()));
    await at(2100, () => page.locator('[data-item=top_cozy_02]').click());
    await at(3400, () => page.locator('[data-category=bottom]').click());
    await at(4600, () => page.getByRole('button', {name:/Ivory Pleats/}).click());
    await at(5800, () => page.locator('[data-category=shoes]').click());
    await at(6900, () => page.getByRole('button', {name:/Petal Mary Janes/}).click());
    await at(8100, () => page.locator('#detail-view').click());
    await at(9700, () => page.locator('#full-view').click());
    await at(10800, () => page.locator('[data-category=hair]').click());
    await at(11900, () => page.locator('[data-item=hair_casual_01]').click());
    await at(13400, () => page.locator('#reveal').click());
    await page.locator('#next-level').scrollIntoViewIfNeeded();
    await at(17700);
    await page.screenshot({path:path.join(folder, 'last.jpg'), type:'jpeg', quality:92});
    await client.send('Page.stopScreencast');
    if (frames.length < 5) throw new Error('Not enough real gameplay frames');
    const seconds = (Date.now()-start)/1000;
    const lines = frames.flatMap((frame,index) => [`file '${frame.file}'`, 'option framerate 1000', 'duration ' + (index+1<frames.length ? Math.max(.016,frames[index+1].time-frame.time) : Math.max(.05,seconds-(frame.time-frames[0].time)))]);
    lines.push("file 'last.jpg'", 'option framerate 1000'); fs.writeFileSync(path.join(folder, 'frames.txt'), lines.join('\n'));
    const video = path.join(out, `preview-${name}.mp4`);
    const executable = process.env.MUSE_FFMPEG || 'ffmpeg';
    const result = spawnSync(executable, ['-y','-loglevel','error','-f','concat','-safe','0','-i',path.join(folder,'frames.txt'),'-t','18','-vf',`scale=${name==='landscape'?'1920:1080':'1080:1620'}:flags=lanczos,format=yuv420p,fps=30,tpad=stop_mode=clone:stop_duration=2`,'-an','-c:v','libx264','-preset','fast','-crf','21','-movflags','+faststart',video], {encoding:'utf8',windowsHide:true});
    if (result.status !== 0) throw new Error(result.stderr || String(result.error));
    const probe = spawnSync(executable, ['-hide_banner','-i',video], {encoding:'utf8',windowsHide:true});
    if (!/Duration: 00:00:18\./.test(probe.stderr) || /Audio:/.test(probe.stderr) || fs.statSync(video).size > 50_000_000) throw new Error('Invalid preview video: ' + probe.stderr);
    metadata.files.push({file:path.basename(video),duration:18,audio:false,bytes:fs.statSync(video).size,realFrames:frames.length});
    console.log(`Created ${name} preview: 18 seconds, no sound, ${frames.length} real frames`);
  } finally {await context.close();}
}
(async () => {
  fs.mkdirSync(out, {recursive:true}); fs.mkdirSync(scratch, {recursive:true});
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = 'http://127.0.0.1:' + server.address().port + '/' + path.relative(root,upload).replaceAll('\\','/') + '/index.html';
  browser = await chromium.launch({headless:true,chromiumSandbox:true,...(process.platform==='win32'?{executablePath:process.env.MUSE_BROWSER_EXECUTABLE||'C:\\Tools\\ugchromium\\app\\chrome.exe'}:{})});
  const page = await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(base+'?test=1'); await page.waitForFunction(()=>document.documentElement.dataset.ready==='true',null,{timeout:60000});
  for (const [name,width,height] of [['landscape',1920,1080],['portrait',800,1200],['square',800,800],...(portalMode?[['itch',630,500],['gamepix-icon',256,256],['gamepix',1360,850]]:[])]) {
    const format=name==='gamepix'?'jpeg':'png';
    const data = await page.evaluate(({width,height,format}) => {
      const {renderer:r,D} = window.__campaign; r.paused = true;
      r.setOutfit(['dress_elegant_02','shoes_cute_02','accessory_elegant_02'].map(id=>D.items.find(item=>item.id===id))); r.seek(.6);
      const saved = {x:r.model.x,y:r.model.y,s:r.model.scale.x}; r.model.position.set(0,0);r.model.scale.set(1);r.app.render();
      const bounds=r.model.getBounds(),figure=r.app.renderer.extract.canvas({target:r.model,resolution:1});
      r.model.position.set(saved.x,saved.y);r.model.scale.set(saved.s);r.app.render();
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');
      const landscape=width>height,portrait=height>width;
      // A full-bleed cover composition, not a screenshot of the game's controls.
      const room=r.images.room,roomScale=Math.max(width/room.width,height/room.height);
      c.drawImage(room,(width-room.width*roomScale)/2,(height-room.height*roomScale)/2,room.width*roomScale,room.height*roomScale);
      const wash=landscape?c.createLinearGradient(0,0,width,0):c.createLinearGradient(0,0,0,height);
      wash.addColorStop(0,'#f8e9f5');wash.addColorStop(landscape?.43:.22,'#f4e2f2f2');wash.addColorStop(1,'#f8e9f500');c.fillStyle=wash;c.fillRect(0,0,width,height);
      const heroHeight=height*(landscape?.94:portrait?.76:.88),scale=heroHeight/1480;
      const centerX=width*(landscape?.72:portrait?.5:.72),top=height*(landscape?.06:portrait?.235:.08);
      c.shadowColor='#67475c38';c.shadowBlur=18;c.shadowOffsetY=9;
      c.drawImage(figure,centerX+(bounds.x-515)*scale,top+(bounds.y-40)*scale,bounds.width*scale,bounds.height*scale);c.shadowColor='transparent';
      c.fillStyle='#604260';c.textAlign=portrait?'center':'left';c.textBaseline='alphabetic';
      const fontSize=landscape?width*196/1920:portrait?width*107/800:width/8,x=landscape?width*110/1920:portrait?width/2:width*34/800,y=landscape?height*420/1080:portrait?height*124/1200:height*210/800;
      c.font=`900 ${fontSize}px "Segoe UI",sans-serif`;c.fillText('Muse',x,y);c.fillText('Bloom',x,y+fontSize*.98);
      return canvas.toDataURL(`image/${format}`,format==='jpeg'?.93:undefined);
    }, {width,height,format});
    const file=`cover-${name}.${format==='jpeg'?'jpg':'png'}`;fs.writeFileSync(path.join(out,file),Buffer.from(data.split(',')[1],'base64'));
    const byteLimit=name==='gamepix-icon'?1_000_000:name==='gamepix'?1_500_000:Infinity;
    if(fs.statSync(path.join(out,file)).size>byteLimit)throw new Error(`${file} exceeds the GamePix upload limit`);
    metadata.files.push({file,width,height,bytes:fs.statSync(path.join(out,file)).size});console.log(`Created ${file} ${width}x${height}`);
  }
  await page.close();
  if(portalMode)await portalScreenshots(base);
  if (!process.argv.includes('--covers-only')) {
    await record(base,'landscape',{width:1920,height:1080},1);
    await record(base,'portrait',{width:540,height:810},2);
  }
  fs.writeFileSync(path.join(out,'media-manifest.json'),JSON.stringify(metadata,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.close();});
