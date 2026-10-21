import {Application,Assets,Graphics,VERSION} from 'pixi.js';
import {PixiFactory} from 'pixi-dragonbones-runtime';
import {makeSkeleton,textureFiles,wardrobe} from './rig.mjs';

const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={top:0,bottom:0,tab:'tops',theme:0,paused:reduced.matches,sound:false,view:'full'};
const themes=[
  {name:'Café morning',text:'An easy outfit for coffee, a book, and nowhere to rush.',goals:['Ivory cotton','Blue denim'],pair:[0,0]},
  {name:'Pastel hour',text:'Soft textures and lilac tones for a catch-up with friends.',goals:['Rosy knit','Lilac pleats'],pair:[1,1]},
  {name:'Gallery day',text:'A crisp collar and flowing trousers. Quietly put together.',goals:['A neat collar','Fluid trousers'],pair:[2,2]},
];
const history=[],thumbs={},images={},storageKey='muse-style-lab-v1';
let app,display,room,shadow,observer,audio,clock=0,activeCard=null,book=[];
try{const data=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(data))book=data.filter(x=>Number.isInteger(x.top)&&x.top>=0&&x.top<3&&Number.isInteger(x.bottom)&&x.bottom>=0&&x.bottom<3&&Number.isInteger(x.theme)&&x.theme>=0&&x.theme<3&&typeof x.image==='string'&&x.image.startsWith('data:image/jpeg;')).slice(0,6);}catch{}
function chime(complete=false){
  if(!state.sound||document.hidden)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
    (complete?[523.25,659.25,783.99]:[659.25,880]).forEach((frequency,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.065;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.025,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.23);});
  }catch{state.sound=false;$('#sound').setAttribute('aria-pressed','false');$('#sound span').textContent='Sound unavailable';}
}
function sparkle(){
  if(reduced.matches)return;
  $('#sparkles').replaceChildren();
  for(let i=0;i<9;i++){const s=document.createElement('i');s.className='spark';s.style.cssText=`left:${35+(i*17)%33}%;top:${35+(i*11)%32}%;--dx:${(i-4)*9}px;animation-delay:${i*.025}s`;$('#sparkles').append(s);s.addEventListener('animationend',()=>s.remove(),{once:true});}
}
function goals(){const theme=themes[state.theme];return [state.top===theme.pair[0],state.bottom===theme.pair[1]];}
function refreshGoals(){
  const theme=themes[state.theme],met=goals();$('#brief-name').textContent=theme.name;$('#brief-text').textContent=theme.text;
  $('#goal-count').textContent=`${met.filter(Boolean).length} / 2 notes`;
  $('#goals').replaceChildren(...theme.goals.map((text,i)=>{const s=document.createElement('span');s.className=met[i]?'met':'';s.textContent=`${met[i]?'✓':'○'} ${text}`;return s;}));
  document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.theme===state.theme)));
}
function setOutfit(top,bottom,{remember=true,feedback=true}={}){
  if(!Number.isInteger(top)||top<0||top>2||!Number.isInteger(bottom)||bottom<0||bottom>2)throw new RangeError('Unknown wardrobe item');
  if(remember&&(state.top!==top||state.bottom!==bottom)){history.push([state.top,state.bottom]);if(history.length>40)history.shift();}
  state.top=top;state.bottom=bottom;
  display.armature.getSlot('body').displayIndex=bottom===2?1:0;
  display.armature.getSlot('top').displayIndex=top;
  display.armature.getSlot('bottom').displayIndex=bottom;
  // Update the mesh and covered-skin variant synchronously, including when paused.
  display.armature.invalidUpdate(null,true);display.armature.advanceTime(0);
  $('#undo').disabled=!history.length;
  $('#stage').setAttribute('aria-label',`Mira wearing ${wardrobe.tops[top].name} and ${wardrobe.bottoms[bottom].name}`);
  refreshGoals();renderItems();if(feedback){chime();sparkle();$('#selection-note').textContent=`${wardrobe.tops[top].name} + ${wardrobe.bottoms[bottom].name}.`;}app.render();
}
function thumbnail(item){
  const c=document.createElement('canvas');c.width=300;c.height=300;const ctx=c.getContext('2d'),[x,y,w,h]=item.crop,s=Math.min(270/w,260/h);
  ctx.translate((300-w*s)/2,(300-h*s)/2);ctx.scale(s,s);ctx.translate(-x,-y);
  if(item.clip){ctx.beginPath();item.clip.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();ctx.clip();}
  // Render a crop from the unchanged source atlas; no generated thumbnail assets.
  ctx.drawImage(images[item.texture],x,y,w,h,x,y,w,h);return c.toDataURL('image/png');
}
function renderItems(){
  const area=$('#items');area.replaceChildren();$('#saved-count').textContent=book.length;
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===state.tab)));
  $('#collection-name').textContent=state.tab==='saved'?'Your little collection':`Your ${state.tab}`;
  $('#collection-note').textContent=state.tab==='saved'?'Tap to revisit a look':'Tap a piece to try it on';
  if(state.tab==='saved'){
    if(!book.length){const p=document.createElement('p');p.className='empty';p.textContent='Your first favourite is waiting. Save a look to start your collection.';area.append(p);}
    book.forEach((card,i)=>{const b=document.createElement('button');b.className='item saved-card';b.dataset.saved=i;const img=new Image();img.src=card.image;img.alt='';const title=document.createElement('strong');title.textContent=themes[card.theme].name;const note=document.createElement('small');note.textContent=`Look ${book.length-i} · open card`;b.append(img,title,note);b.addEventListener('click',()=>showCard(card));area.append(b);});return;
  }
  wardrobe[state.tab].forEach((item,i)=>{
    const b=document.createElement('button');b.className='item';b.dataset.item=i;b.setAttribute('aria-pressed',String(i===state[state.tab==='tops'?'top':'bottom']));b.setAttribute('aria-label',item.name);
    const img=new Image();img.src=thumbs[state.tab][i];img.alt='';const title=document.createElement('strong');title.textContent=item.name;const note=document.createElement('small');note.textContent=item.note;b.append(img,title,note);
    b.addEventListener('click',()=>{const tab=state.tab;setOutfit(tab==='tops'?i:state.top,tab==='bottoms'?i:state.bottom);$(`[data-item="${i}"]`)?.focus({preventScroll:true});});area.append(b);
  });
}
function resize(){
  const box=$('#stage').getBoundingClientRect();if(!box.width||!box.height)return;app.renderer.resize(box.width,box.height);
  const s=Math.min((box.height-24)/1480,(box.width-32)/570),zoom=state.view==='detail'?1.62:1;
  display.scale.set(s*zoom);display.x=box.width/2-515*s*zoom;display.y=state.view==='detail'?16-40*s*zoom:(box.height-1480*s)/2-40*s;
  shadow.clear();shadow.ellipse(box.width/2,display.y+1472*s,150*s,16*s).fill({color:0x65504f,alpha:state.view==='full'?.14:0});app.render();
}
function setView(view){state.view=view;$('#full-view').setAttribute('aria-pressed',String(view==='full'));$('#detail-view').setAttribute('aria-pressed',String(view==='detail'));resize();}
function setPause(paused){state.paused=paused;$('#motion').setAttribute('aria-pressed',String(paused));$('#motion').textContent=paused?'Play motion':'Pause motion';}
function portrait(){
  const c=document.createElement('canvas');c.width=600;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(room,0,0,600,900);
  const pos={x:display.x,y:display.y,s:display.scale.x};
  // A separate extraction frame keeps both shoes and hair in every saved image,
  // regardless of the current detail view or phone viewport.
  display.position.set(0,0);display.scale.set(1);app.render();
  const figure=app.renderer.extract.canvas({target:display,resolution:1});
  const bounds=display.getBounds();const s=.55;ctx.drawImage(figure,300+(bounds.x-515)*s,32+(bounds.y-40)*s,bounds.width*s,bounds.height*s);
  display.position.set(pos.x,pos.y);display.scale.set(pos.s);app.render();
  ctx.fillStyle='#fffbf5ef';ctx.fillRect(0,846,600,54);ctx.fillStyle='#654459';ctx.font='600 18px Segoe UI, sans-serif';ctx.fillText('Muse Bloom',25,879);ctx.font='12px Segoe UI, sans-serif';ctx.textAlign='right';ctx.fillText(themes[state.theme].name,575,879);
  return c.toDataURL('image/jpeg',.9);
}
function showCard(card){
  activeCard=card;$('#result-image').src=card.image;$('#result-title').textContent=card.top===themes[card.theme].pair[0]&&card.bottom===themes[card.theme].pair[1]?'Mood, captured.':'Very you.';
  $('#result-note').textContent=themes[card.theme].text;$('#result-pieces').textContent=`${wardrobe.tops[card.top].name} + ${wardrobe.bottoms[card.bottom].name}`;
  if(!$('#result').open)$('#result').showModal();
}
function controls(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.tab;renderItems();}));
  document.querySelectorAll('[data-theme]').forEach(b=>b.addEventListener('click',()=>{state.theme=+b.dataset.theme;refreshGoals();chime();}));
  $('#undo').addEventListener('click',()=>{const prev=history.pop();if(prev)setOutfit(...prev,{remember:false});});
  $('#reset').addEventListener('click',()=>setOutfit(0,0));$('#full-view').addEventListener('click',()=>setView('full'));$('#detail-view').addEventListener('click',()=>setView('detail'));
  $('#motion').addEventListener('click',()=>setPause(!state.paused));
  $('#sound').addEventListener('click',()=>{state.sound=!state.sound;$('#sound').setAttribute('aria-pressed',String(state.sound));$('#sound span').textContent=state.sound?'Sound on':'Sound off';chime();if(!state.sound)audio?.suspend();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.suspend();});
  reduced.addEventListener('change',e=>{if(e.matches)setPause(true);});
  $('#save').addEventListener('click',()=>{
    const card={top:state.top,bottom:state.bottom,theme:state.theme,image:portrait()};book=[card,...book].slice(0,6);
    let persisted=true;try{localStorage.setItem(storageKey,JSON.stringify(book));}catch{persisted=false;}
    renderItems();showCard(card);chime(true);$('#selection-note').textContent=persisted?'Added to your Lookbook. Make another mood?':'Device storage is full. Download this look to keep it.';
  });
  for(const id of ['close-result','keep-styling'])$('#'+id).addEventListener('click',()=>$('#result').close());
  $('#download').addEventListener('click',()=>{if(!activeCard)return;const a=document.createElement('a');a.href=activeCard.image;a.download='muse-bloom-look.jpg';a.click();});
}
async function start(){
  document.querySelectorAll('button').forEach(b=>b.disabled=true);
  const loaded=await Promise.race([Promise.all([...Object.entries(textureFiles).map(async([name,file])=>{const texture=await Assets.load(`./assets/${file}`);images[name]=texture.source.resource;return {name,texture};}),Assets.load('./assets/room.png').then(t=>{room=t.source.resource;return null;})]),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Asset loading timed out')),30000))]);
  PixiFactory.useSharedTicker=false;app=new Application();await app.init({backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl',autoStart:false});$('#stage').prepend(app.canvas);app.canvas.setAttribute('aria-hidden','true');
  const factory=PixiFactory.factory;factory.parseDragonBonesData(makeSkeleton());
  loaded.filter(Boolean).forEach(({name,texture})=>factory.parseTextureAtlasData({name:'muse-style-lab',width:1024,height:1536,SubTexture:[{name,x:0,y:0,width:1024,height:1536}]},texture));
  display=factory.buildArmatureDisplay('Mira','muse-style-lab');if(!display)throw new Error('Character rig failed to load');
  shadow=new Graphics();app.stage.addChild(shadow,display);display.animation.play('breathe');display.animation.lastAnimationState.displayControl=false;
  for(const category of ['tops','bottoms'])thumbs[category]=wardrobe[category].map(thumbnail);
  setOutfit(0,0,{remember:false,feedback:false});setPause(state.paused);controls();observer=new ResizeObserver(resize);observer.observe($('#stage'));resize();
  app.ticker.add(t=>{if(!document.hidden&&!state.paused&&!$('#result').open){const dt=Math.min(t.deltaMS,50)/1000;clock+=dt;display.armature.advanceTime(dt);}});app.start();
  document.querySelectorAll('button').forEach(b=>b.disabled=false);$('#undo').disabled=true;$('#loading').hidden=true;document.documentElement.dataset.ready='true';
  if(new URLSearchParams(location.search).has('test'))window.__styleLab={app,display,state,wardrobe,bones:()=>display.armature.getBones().map(b=>({name:b.name,x:b.globalTransformMatrix.tx,y:b.globalTransformMatrix.ty})),setOutfit,setPause,setView,
    seek(time){display.animation.gotoAndStopByTime('breathe',time);display.animation.lastAnimationState.displayControl=false;display.armature.invalidUpdate(null,true);display.armature.advanceTime(0);setOutfit(state.top,state.bottom,{remember:false,feedback:false});app.render();},
    snapshot(){return {pixi:VERSION,state:{...state},clock,slots:display.armature.getSlots().map(s=>({name:s.name,index:s.displayIndex,vertices:s.display?.geometry?.getBuffer('aPosition')?.data?Array.from(s.display.geometry.getBuffer('aPosition').data):[]})),bounds:display.getBounds(),saved:book.length};}};
}
start().catch(error=>{console.error(error);document.documentElement.dataset.ready='error';$('#loading').innerHTML='<span>✳</span><p>The wardrobe could not open.<br>Please try again.</p><button id="retry">Try again</button>';$('#retry').addEventListener('click',()=>location.reload());});
