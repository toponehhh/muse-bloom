'use strict';
// Real browser motion, Web Audio PCM and lifecycle checks, not screenshot-only QA.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
const {createServer}=require('./server');
const out=path.resolve(__dirname,'../artifacts/experience');fs.mkdirSync(out,{recursive:true});
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const report={version:require('../package.json').version,channel,checks:[],audio:[],errors:[]};
function pass(message){report.checks.push(message);console.log('PASS:',message);}
function wav(samples,rate){const bytes=Buffer.alloc(44+samples.length*2);bytes.write('RIFF');bytes.writeUInt32LE(bytes.length-8,4);bytes.write('WAVEfmt ',8);bytes.writeUInt32LE(16,16);bytes.writeUInt16LE(1,20);bytes.writeUInt16LE(1,22);bytes.writeUInt32LE(rate,24);bytes.writeUInt32LE(rate*2,28);bytes.writeUInt16LE(2,32);bytes.writeUInt16LE(16,34);bytes.write('data',36);bytes.writeUInt32LE(samples.length*2,40);samples.forEach((x,i)=>bytes.writeInt16LE(Math.round(Math.max(-1,Math.min(1,x))*32767),44+i*2));return bytes;}
(async()=>{
 const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 let browser;
 try{
  browser=await chromium.launch({headless:true,channel:channel==='chromium'?undefined:channel});report.browser=browser.version();
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
   const Native=window.AudioContext;
   window.__sound={contexts:0,created:0,stops:0};
   window.AudioContext=class extends Native{constructor(...args){super(...args);__sound.contexts++;__sound.context=this;__sound.analyser=this.createAnalyser();__sound.analyser.fftSize=2048;let first=true;
    const gain=this.createGain.bind(this);this.createGain=()=>{const node=gain();if(first){first=false;node.connect(__sound.analyser);}return node;};
    for(const kind of ['createOscillator','createBufferSource']){const create=this[kind].bind(this);this[kind]=()=>{const node=create();__sound.created++;const stop=node.stop.bind(node);node.stop=(...args)=>{__sound.stops++;return stop(...args);};return node;};}
   }};
  });
  await page.goto(url);assert.equal(await page.evaluate(()=>__sound.contexts),0);pass('No AudioContext and no sound before the first gesture');
  await page.locator('[data-action="play"]').click();
  await page.waitForFunction(()=>__sound.context?.state==='running'&&__sound.created>0);
  const audible=await page.evaluate(async()=>{await MuseAudio.play('equip');const a=__sound.analyser,data=new Float32Array(a.fftSize);let peak=0;for(let i=0;i<14;i++){await new Promise(r=>setTimeout(r,18));a.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));}return peak;});
  assert.ok(audible>.005&&audible<.9,'Live Web Audio graph must produce an unclipped signal');report.livePeak=audible;pass('First gesture unlocks audio; live analyser measures audible, unclipped output');
  const names=['click','tab','equip','unequip','clear','shutter','rankS','rankLow','unlock'];let sampler=[];
  for(const name of names){
   const samples=await page.evaluate(async name=>{const context=new OfflineAudioContext(1,44100,44100);MuseAudio.synthesize(context,name,.02);const result=await context.startRendering();return Array.from(result.getChannelData(0));},name);
   const peak=Math.max(...samples.map(Math.abs)),rms=Math.sqrt(samples.reduce((s,x)=>s+x*x,0)/samples.length),tail=Math.max(...samples.slice(-2000).map(Math.abs));
   assert.ok(samples.every(Number.isFinite)&&peak>.01&&peak<.9&&rms>.001&&rms<.2&&tail<.0001,'Invalid PCM for '+name);
   const bytes=wav(samples,44100);report.audio.push({name,peak,rms,tail,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});sampler.push(...samples,...Array(4410).fill(0));
  }
  assert.equal(new Set(report.audio.map(a=>a.sha256)).size,names.length);fs.writeFileSync(path.join(out,'sound-effects-sampler.wav'),wav(sampler,44100));pass('Nine distinct effects rendered to real PCM: finite, audible, no clipping, clean decay');
  const cancelled=await page.evaluate(async()=>{await MuseAudio.play('rankS');const before=__sound.stops;MuseAudio.setMuted(true);const stopped=__sound.stops>before;const created=__sound.created;const blocked=await MuseAudio.play('equip')===false;MuseAudio.setMuted(false);await MuseAudio.resume();await new Promise(r=>setTimeout(r,150));return {stopped,blocked,noReplay:__sound.created===created};});
  assert.deepEqual(cancelled,{stopped:true,blocked:true,noReplay:true});pass('Mute stops playing and scheduled notes; unmute does not replay a queued reward');
  const race=await page.evaluate(async()=>{const ctx=__sound.context,native=ctx.resume.bind(ctx);await ctx.suspend();let release;ctx.resume=()=>new Promise(r=>release=async()=>r(await native()));const created=__sound.created,pending=MuseAudio.play('equip');MuseAudio.setMuted(true);await release();const result=await pending;ctx.resume=native;return result===false&&__sound.created===created;});assert.ok(race);pass('Muting while audio resumes cancels the pending sound');
  await page.evaluate(()=>MuseAudio.setMuted(false));
  const before=await page.evaluate(()=>({avatar:!!document.querySelector('#avatar-slot .avatar'),eyes:document.querySelectorAll('#avatar-slot .toon-eye').length,room:document.querySelector('.fitting-stage .room-backdrop').naturalWidth}));
  assert.deepEqual(before,{avatar:true,eyes:2,room:1024});
  const blink=await page.evaluate(()=>{const eye=document.querySelector('#avatar-slot .toon-eye'),animation=eye.getAnimations().find(a=>a.animationName==='girl-blink');animation.pause();animation.currentTime=2610;const closed=new DOMMatrix(getComputedStyle(eye).transform).d;animation.currentTime=0;const open=new DOMMatrix(getComputedStyle(eye).transform).d;animation.play();return {closed,open,idle:document.querySelector('#avatar-slot .avatar>svg').getAnimations().some(a=>a.animationName==='girl-breathe')};});assert.ok(blink.closed<.15&&blink.open>.99&&blink.idle);pass('Bedroom bitmap loaded; both eyes exist; actual blink closes and reopens; whole avatar breathes');
  await page.locator('[data-category="top"]').click();
  const stable=await page.evaluate(async()=>{const avatar=document.querySelector('#avatar-slot .avatar'),base=avatar.querySelector('[data-layer="base"]');let maxBursts=0;for(let i=0;i<32;i++){document.querySelector('[data-item="top_casual_01"]').click();await new Promise(requestAnimationFrame);if(avatar!==document.querySelector('#avatar-slot .avatar')||!base.isConnected||avatar.getBoundingClientRect().height<100)throw Error('Character lost during motion');maxBursts=Math.max(maxBursts,document.querySelectorAll('.dress-sparkles').length);}await new Promise(r=>setTimeout(r,1100));return {maxBursts,remaining:document.querySelectorAll('.dress-sparkles').length};});assert.equal(stable.maxBursts,1);assert.equal(stable.remaining,0);pass('32 rapid animated outfit toggles retain the same avatar/base; one burst maximum; particles clean up');
  const hidden=await page.evaluate(async()=>{await MuseAudio.play('rankS');MuseFX.equip();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));await new Promise(r=>setTimeout(r,50));const result={silent:__sound.context.state==='suspended',blocked:await MuseAudio.play('equip')===false,particles:document.querySelectorAll('.dress-sparkles').length,paused:document.getAnimations().every(a=>a.playState!=='running')};delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));return result;});assert.deepEqual(hidden,{silent:true,blocked:true,particles:0,paused:true});pass('Hidden-page lifecycle suspends sound, cancels particles and pauses idle animations');
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-item="top_casual_01"]').click();assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);assert.equal(await page.locator('.dress-sparkles').count(),0);pass('Reduced motion removes idle, blink, particles and Web Animations effects');
  await page.locator('[data-action="clear"]').click();await page.locator('[data-action="score"]').click();assert.equal(await page.locator('.rating-stars').getAttribute('aria-label'),'0 of 3 style stars');
  await page.locator('[data-action="retry"]').click();const winner=await page.evaluate(()=>MuseGame.solveTheme(MuseData.themes[0],MuseData.items.filter(i=>MuseGame.newSave().unlockedItems.includes(i.id))).items.map(i=>({id:i.id,category:i.category})));
  for(const item of winner){await page.locator(`[data-category="${item.category}"]`).click();await page.locator(`[data-item="${item.id}"]`).click();}
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-action="score"]').click();assert.equal(await page.locator('.rating-stars').getAttribute('aria-label'),'3 of 3 style stars');assert.equal(await page.locator('.rating-star.earned').count(),3);assert.ok(await page.locator('.rating-star.earned').first().evaluate(n=>n.getAnimations().length>0));await page.waitForTimeout(1100);assert.equal(await page.locator('#score-number').innerText(),'94');pass('Failed look has zero stars; 94-point look reveals three animated stars without changing scoring');
  await page.locator('[data-action="mute"]').click();await page.reload();assert.equal(await page.locator('[data-action="mute"]').getAttribute('aria-pressed'),'true');await page.locator('[data-action="settings"]').click();assert.ok(await page.locator('[data-action="preview-sound"]').isDisabled());pass('Sound preference persists; sound preview is disabled while muted');
  const noAudio=await browser.newPage();await noAudio.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});await noAudio.goto(url);await noAudio.locator('[data-action="play"]').click();await noAudio.locator('[data-action="clear"]').click();assert.ok(await noAudio.locator('#avatar-slot svg').isVisible());await noAudio.close();pass('Browser without Web Audio still supports normal gameplay');
  assert.deepEqual(report.errors,[]);report.status='passed';
 }catch(error){report.status='failed';report.failure=error.stack;throw error;}
 finally{for(const file of ['experience-report.json',`experience-report-${channel}.json`])fs.writeFileSync(path.join(out,file),JSON.stringify(report,null,2));await browser?.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});
