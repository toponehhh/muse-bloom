import { Application, Assets, Graphics, VERSION } from 'pixi.js';
import { PixiFactory, EventObject } from 'pixi-dragonbones-runtime';
import { wardrobe, bones, textureFiles } from './rig.mjs';

const $=selector=>document.querySelector(selector);
const state={top:1,bottom:1,category:'tops',motion:'idle',paused:matchMedia('(prefers-reduced-motion: reduce)').matches,speed:1,rig:false,sound:false};
const looks={studio:[0,0,'The off-duty edit','Easy layers for a slow morning at home.'],coffee:[1,1,'The coffee-date edit','A rosy knit, a little denim, and nowhere to rush.'],gallery:[2,2,'The gallery-day edit','Soft blues, fluid lines, a fresh point of view.']};
let app,display,debug,shadow,frame=0,toastTimer,audioContext,resizeObserver;
let frameSamples=[],images={},thumbnails={},lastSize={width:0,height:0};
let saving=false;
function toast(message) { clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),2800); }
function chime(kind='change') {
  if(!state.sound || document.hidden) return;
  audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
  audioContext.resume().catch(()=>{});
  const now=audioContext.currentTime;
  (kind==='photo'?[523.25,659.25,783.99]:[659.25,880]).forEach((frequency,i)=>{
    const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
    oscillator.type='sine';oscillator.frequency.value=frequency;
    gain.gain.setValueAtTime(0,now+i*.06);gain.gain.linearRampToValueAtTime(.025,now+i*.06+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+i*.06+.22);
    oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start(now+i*.06);oscillator.stop(now+i*.06+.24);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  });
}
function makeThumbnails() {
  for(const item of [...wardrobe.tops,...wardrobe.bottoms]) {
    const canvas=document.createElement('canvas');canvas.width=220;canvas.height=240;
    const context=canvas.getContext('2d'),[x,y,w,h]=item.crop,scale=Math.min(200/w,218/h);
    const left=(220-w*scale)/2,top=(240-h*scale)/2;
    // The source sheets contain neighboring garments; crop to the item silhouette
    // so cardigan cuffs cannot leak into the skirt card.
    if(item.clip) {
      context.beginPath();item.clip.forEach(([px,py],index)=>context[index?'lineTo':'moveTo'](left+(px-x)*scale,top+(py-y)*scale));context.closePath();context.clip();
    }
    context.drawImage(images[item.texture],x,y,w,h,left,top,w*scale,h*scale);
    thumbnails[item.id]=canvas.toDataURL('image/png');
  }
}
function renderWardrobe() {
  const selected=state.category==='tops'?state.top:state.bottom;
  $('#items').innerHTML=wardrobe[state.category].map((item,index)=>`<button class="item" data-item="${index}" aria-pressed="${index===selected}" aria-label="${item.name}${index===selected?', selected':''}"><img class="item-art" src="${thumbnails[item.id]}" alt=""><span class="item-check" aria-hidden="true">✓</span><span class="item-text"><strong>${item.name}</strong><small>${item.note}</small></span></button>`).join('');
  document.querySelectorAll('[data-category]').forEach(button=>{
    const active=button.dataset.category===state.category;button.setAttribute('aria-selected',active);button.tabIndex=active?0:-1;
  });
  $('#items').setAttribute('aria-labelledby',state.category+'-tab');
  const preset=Object.keys(looks).find(key=>looks[key][0]===state.top&&looks[key][1]===state.bottom);
  document.querySelectorAll('[data-look]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.look===preset));
  $('#look-title').textContent=preset?looks[preset][2]:'The personal edit';
  $('#look-copy').textContent=preset?looks[preset][3]:'Your favourites, together. A look that feels like you.';
  $('#stage').setAttribute('aria-label',`Nora wearing ${wardrobe.tops[state.top].name} and ${wardrobe.bottoms[state.bottom].name}. ${state.motion} animation.`);
}
function setOutfit(top,bottom,notify=true) {
  if(!Number.isInteger(top)||!wardrobe.tops[top]||!Number.isInteger(bottom)||!wardrobe.bottoms[bottom]) throw new Error('Unknown wardrobe selection');
  state.top=top;state.bottom=bottom;
  display.armature.getSlot('top').displayIndex=top;display.armature.getSlot('bottom').displayIndex=bottom;
  display.armature.getSlot('arms').displayIndex=top;
  display.armature.getSlot('body').displayIndex=bottom===2?1:0;
  display.armature.invalidUpdate(null,true);
  display.armature.advanceTime(0);renderWardrobe();app.render();
  if(notify) chime();
}
function setPause(paused) {
  state.paused=paused;$('#pause').setAttribute('aria-pressed',paused);$('#pause').setAttribute('aria-label',paused?'Play animation':'Pause animation');$('#pause').textContent=paused?'▷':'Ⅱ';
}
function setMotion(name,explicit=false) {
  if(!['idle','wave','pose'].includes(name)) return;
  state.motion=name;
  const animation=display.animation.fadeIn(name,.28,name==='wave'?1:0);
  // Wardrobe is controlled by the UI, never by animation's reset-to-pose slot tracks.
  animation.displayControl=false;
  document.querySelectorAll('[data-motion]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.motion===name));
  if(explicit) {setPause(false);chime();}
  renderWardrobe();
}
function drawRig() {
  debug.clear();debug.visible=state.rig;
  if(!state.rig) return;
  for(const [name,parent] of bones) {
    const bone=display.armature.getBone(name),p=parent&&display.armature.getBone(parent),m=bone.globalTransformMatrix;
    if(p) debug.moveTo(p.globalTransformMatrix.tx,p.globalTransformMatrix.ty).lineTo(m.tx,m.ty).stroke({width:3,color:0x427f7d,alpha:.85});
    debug.circle(m.tx,m.ty,6).fill(0xfbf4dc).stroke({width:2,color:0x427f7d});
  }
}
function resize() {
  const {width,height}=$('#stage').getBoundingClientRect();
  if(width<1||height<1) return;
  app.renderer.resize(width,height);
  // Reserve side room for the raised hand, and keep both shoes inside the canvas.
  const scale=Math.min(height/1580,width/1140);
  display.scale.set(scale);display.position.set(width/2-512*scale,height-1530*scale);
  debug.scale.copyFrom(display.scale);debug.position.copyFrom(display.position);
  shadow.clear();
  for(let i=12;i>0;i--) shadow.ellipse(width/2,height-42*scale,140*scale+i*scale*3,14*scale+i*scale*1.3).fill({color:0x7b6550,alpha:.011});
  lastSize={width,height};drawRig();app.render();
}
function tick(ticker) {
  if(!state.paused && !document.hidden) {
    PixiFactory.advanceTime(Math.min(ticker.deltaMS,50)/1000*state.speed);
    frame++;frameSamples.push(ticker.deltaMS);if(frameSamples.length>180)frameSamples.shift();
    drawRig();
  }
}
async function savePortrait() {
  if(saving)return;saving=true;$('#photo').disabled=true;
  try {
    const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;
    const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,900,1200);
    gradient.addColorStop(0,'#f4ebdf');gradient.addColorStop(1,'#d9bfae');ctx.fillStyle=gradient;ctx.fillRect(0,0,900,1200);
    ctx.fillStyle='#72504f';ctx.textAlign='center';ctx.font='38px Georgia';ctx.fillText('muse bloom.',450,67);
    ctx.font='12px Arial';ctx.fillText('T H E   M O T I O N   A T E L I E R',450,97);
    const wasDebug=debug.visible;debug.visible=false;app.render();
    const rendered=app.renderer.extract.canvas({target:app.stage,resolution:2});
    debug.visible=wasDebug;
    const scale=Math.min(870/rendered.width,1005/rendered.height);
    ctx.drawImage(rendered,(900-rendered.width*scale)/2,128+(1005-rendered.height*scale)/2,rendered.width*scale,rendered.height*scale);
    ctx.fillStyle='#72504f';ctx.font='italic 19px Georgia';ctx.fillText($('#look-title').textContent,450,1157);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!blob)throw new Error('Portrait export unavailable');
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download='muse-bloom-motion-portrait.png';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    $('#flash').classList.remove('active');void $('#flash').offsetWidth;$('#flash').classList.add('active');toast('Portrait saved. A little moment, all yours.');chime('photo');
  }catch(error){console.error(error);toast('Could not save the portrait. Please try again.');}
  finally{saving=false;$('#photo').disabled=false;}
}
function controls() {
  $('#items').addEventListener('click',event=>{
    const button=event.target.closest('[data-item]');if(!button)return;
    const index=Number(button.dataset.item);
    // Clicking an active garment keeps it fitted; every outfit always has both layers.
    setOutfit(state.category==='tops'?index:state.top,state.category==='bottoms'?index:state.bottom);
    $('#items').querySelector(`[data-item="${index}"]`)?.focus({preventScroll:true});
  });
  document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{state.category=button.dataset.category;renderWardrobe();}));
  $('.category-tabs').addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    const focused=event.target.closest('[data-category]')?.dataset.category||state.category;
    state.category=event.key==='Home'?'tops':event.key==='End'?'bottoms':focused==='tops'?'bottoms':'tops';renderWardrobe();$(`[data-category="${state.category}"]`).focus();
  });
  document.querySelectorAll('[data-look]').forEach(button=>button.addEventListener('click',()=>setOutfit(...looks[button.dataset.look].slice(0,2))));
  document.querySelectorAll('[data-motion]').forEach(button=>button.addEventListener('click',()=>setMotion(button.dataset.motion,true)));
  $('#pause').addEventListener('click',()=>setPause(!state.paused));
  $('#reset').addEventListener('click',()=>{setOutfit(1,1);setMotion('idle');toast('Back to your coffee-date look.');});
  $('#photo').addEventListener('click',savePortrait);
  $('#show-rig').addEventListener('change',event=>{state.rig=event.target.checked;drawRig();app.render();});
  $('#speed').addEventListener('change',event=>{state.speed=Number(event.target.value);});
  $('#sound').addEventListener('click',()=>{
    state.sound=!state.sound;$('#sound').setAttribute('aria-pressed',state.sound);$('#sound').setAttribute('aria-label',state.sound?'Mute sound':'Enable sound');
    if(state.sound)chime();else audioContext?.suspend();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){app.stop();audioContext?.suspend();}else{app.start();if(state.sound)audioContext?.resume().catch(()=>{});}
  });
  window.addEventListener('pagehide',()=>{app.stop();audioContext?.suspend();});
  window.addEventListener('pageshow',()=>{if(!document.hidden)app.start();});
}
function enableTestAPI() {
  if(new URLSearchParams(location.search).get('test')!=='1')return;
  window.__atelier={
    state,app,display,setOutfit,setMotion,setPause,
    seek(name,time) {setPause(true);display.animation.reset();const animation=display.animation.gotoAndStopByTime(name,time);animation.displayControl=false;display.armature.advanceTime(0);setOutfit(state.top,state.bottom,false);drawRig();app.render();},
    snapshot() {return {state:{...state},frame,size:lastSize,pixi:VERSION,renderer:app.renderer.name,
      bones:display.armature.getBones().map(b=>({name:b.name,x:b.globalTransformMatrix.tx,y:b.globalTransformMatrix.ty,rotation:b.global.rotation})),
      slots:display.armature.getSlots().map(s=>({name:s.name,index:s.displayIndex,visible:s.display.visible,vertices:Array.from(s.display.vertices||[]),triangles:Array.from(s.display.geometry?.indices||[])})),
      bounds:{x:display.x,y:display.y,scale:display.scale.x},averageFrameMS:frameSamples.length?frameSamples.reduce((a,b)=>a+b,0)/frameSamples.length:0};},
    pixels() {app.render();const result=app.renderer.extract.pixels({target:app.stage,frame:app.screen,resolution:1});return {width:result.width,height:result.height,pixels:Array.from(result.pixels)};},
  };
}
async function start() {
  document.querySelectorAll('button').forEach(button=>button.disabled=true);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  try {
    const response=await fetch('./assets/nora_ske.json',{signal:controller.signal});if(!response.ok)throw new Error(`Skeleton request failed (${response.status})`);
    const data=await response.json();
    const textures=await Promise.race([
      Promise.all(Object.entries(textureFiles).map(async ([name,file])=>{
        const texture=await Assets.load(`./assets/${file}`);images[name]=texture.source.resource;return {name,texture};
      })),new Promise((_,reject)=>controller.signal.addEventListener('abort',()=>reject(new Error('Assets took too long to load')), {once:true}))
    ]);
    PixiFactory.useSharedTicker=false;
    app=new Application();await app.init({backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl',autoStart:false});
    $('#stage').append(app.canvas);app.canvas.setAttribute('aria-hidden','true');
    const factory=PixiFactory.factory;factory.parseDragonBonesData(data);
    textures.forEach(({name,texture})=>factory.parseTextureAtlasData({name:'muse-atelier',imagePath:textureFiles[name],width:1024,height:1536,SubTexture:[{name,x:0,y:0,width:1024,height:1536}]},texture));
    display=factory.buildArmatureDisplay('Nora','muse-atelier');if(!display)throw new Error('The character rig could not be built');
    shadow=new Graphics();debug=new Graphics();app.stage.addChild(shadow,display,debug);
    display.addDBEventListener(EventObject.COMPLETE,event=>{if(event.animationState.name==='wave'&&state.motion==='wave')setMotion('idle');},null);
    makeThumbnails();setOutfit(1,1,false);setMotion('idle');setPause(state.paused);controls();
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe($('#stage'));resize();
    app.ticker.add(tick);app.start();enableTestAPI();
    $('#loading').hidden=true;document.querySelectorAll('button').forEach(button=>button.disabled=false);
    document.documentElement.dataset.ready='true';
  }finally{clearTimeout(timeout);}
}
start().catch(error=>{
  console.error(error);document.documentElement.dataset.ready='error';
  $('#loading').innerHTML='<span>✳</span><p>The atelier could not open.<br>Check your connection and try again.</p><button class="primary" id="retry">Try again</button>';
  $('#retry').addEventListener('click',()=>location.reload());
});
