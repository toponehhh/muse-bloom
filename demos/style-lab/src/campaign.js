import {D,G,E,campaignOptions,campaignStorageKeys,canEnterChallenge,loadCampaign,persistCampaign,chooseItem,enterChallenge,submitChallenge,starterOutfit} from './campaign-state.mjs';
import {CampaignRenderer} from './campaign-renderer.js';
import {openFeedback,recordAction} from './feedback.js';
import release from '../release.json';
import '../../../css/feedback.css';
const $=s=>document.querySelector(s),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let storage;try{storage=localStorage;}catch{}
const state={...loadCampaign(storage,campaignOptions(location.search)),category:'top',filter:null,view:'full'},history=[],thumbnails=new Map();
state.paused||=reduced.matches;enterChallenge(state,state.level);
const renderer=new CampaignRenderer($('#stage'));
let audio,lastResult,activeImage,pictures={};
const pictureKey=campaignStorageKeys(state).looks;
try{const raw=JSON.parse(storage.getItem(pictureKey));if(raw&&typeof raw==='object'&&!Array.isArray(raw))for(const [key,value]of Object.entries(raw))if(D.themes.some(t=>t.id===key)&&typeof value==='string'&&value.startsWith('data:image/jpeg;')&&value.length<800000)pictures[key]=value;}catch{}
const persist=()=>{const ok=persistCampaign(storage,state);if(!ok)$('#selection-note').textContent='Device storage is unavailable. Keep this page open to retain your progress.';return ok;};
const currentTheme=()=>D.themes[state.level-1],equipped=()=>G.equippedItems(state.outfit);
function chime(success=false){if(!state.sound||document.hidden)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});(success?[523.25,659.25,783.99]:[659.25,880]).forEach((frequency,i)=>{const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+i*.07;o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.023,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+.24);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+.25);});}catch{state.sound=false;refreshSettings();}}
function sparkle(){if(reduced.matches)return;$('#sparkles').replaceChildren();for(let i=0;i<9;i++){const star=document.createElement('i');star.className='spark';star.style.cssText=`left:${35+(i*17)%33}%;top:${35+(i*11)%32}%;--dx:${(i-4)*9}px;animation-delay:${i*.025}s`;$('#sparkles').append(star);star.addEventListener('animationend',()=>star.remove(),{once:true});}}
function thumb(item){if(!thumbnails.has(item.id))thumbnails.set(item.id,renderer.thumbnail(item));return thumbnails.get(item.id);}
function refreshSettings(){renderer.paused=state.paused;$('#sound').setAttribute('aria-pressed',String(state.sound));$('#sound').setAttribute('aria-label',state.sound?'Turn sound off':'Turn sound on');$('#motion').setAttribute('aria-pressed',String(state.paused));$('#motion').setAttribute('aria-label',state.paused?'Play motion':'Pause motion');$('#motion').textContent=state.paused?'▷':'Ⅱ';}
function refreshBrief(){
 const theme=currentTheme(),chapter=D.chapters[theme.chapter-1],checks=E.goals(theme,equipped()),tags=new Set(equipped().flatMap(i=>i.tags));
 $('#chapter-label').textContent=`CHAPTER ${String(theme.chapter).padStart(2,'0')} · ${chapter.short.toUpperCase()}`;$('#wardrobe-title').textContent=chapter.name;$('#brief-name').textContent=theme.name;$('#brief-text').textContent=theme.description;$('#level-number').textContent=`${String(state.level).padStart(2,'0')} / 36`;
 $('#goals').replaceChildren(...checks.map((g,i)=>{const b=document.createElement('button');b.className='goal-chip'+(g.done?' met':'');b.textContent=`${g.done?'✓':'○'} ${g.title}`;b.title=g.hint;b.dataset.goal=i;b.setAttribute('aria-label',g.title+'. '+g.hint);b.addEventListener('click',()=>suggest(i));return b;}));
 $('#bonus-notes').replaceChildren();if(state.level>3){$('#bonus-notes').append('Bonus +5 each:');for(const tag of theme.bonus){const s=document.createElement('span');s.className='bonus-tag'+(tags.has(tag)?' met':'');s.textContent=`${tags.has(tag)?'✓ ':''}${tag}`;$('#bonus-notes').append(s);}}
 const cleared=D.themes.filter(t=>(state.save.levels[t.id]?.best||0)>=35).length;$('#campaign-progress').textContent=`${cleared} / 36 completed`;$('#streak').textContent=`S streak · ${state.save.streak} / 3`;$('#owned-count').textContent=`${state.save.unlockedItems.length} / 122 pieces · ${cleared} / 36 stories`;$('#saved-count').textContent=G.savedLooks(state.save).length;
 $('#undo').disabled=!history.length;
}
function renderItems(){
 const area=$('#items'),scroll=area.scrollTop;area.replaceChildren();const own=new Set(state.save.unlockedItems),ids=new Set(equipped().map(i=>i.id));
 document.querySelectorAll('[data-category]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.category===state.category));b.dataset.filtered=String(state.filter&&b.dataset.category===state.category);});
 $('#collection-name').textContent=D.categoryNames[state.category];$('#filter-clear').hidden=!state.filter;
 let items=D.items.filter(i=>i.category===state.category);if(state.filter)items=items.filter(i=>state.filter.includes(i.id));
 items.sort((a,b)=>Number(own.has(b.id))-Number(own.has(a.id)));$('#collection-note').textContent=`${items.filter(i=>own.has(i.id)).length} / ${items.length} owned`;
 for(const item of items){const b=document.createElement('button');b.className='item';b.dataset.item=item.id;b.setAttribute('aria-pressed',String(ids.has(item.id)));b.setAttribute('aria-label',`${item.name}. ${item.tags.join(', ')}${own.has(item.id)?'':'. Locked'}`);b.disabled=!own.has(item.id);
  const img=new Image();img.src=thumb(item);img.alt='';const title=document.createElement('strong');title.textContent=item.name;const note=document.createElement('small');note.textContent=item.tags.join(' · ');b.append(img,title,note);
  if(!own.has(item.id)){const lock=document.createElement('span');lock.className='lock-badge';lock.textContent=item.unlockType==='streak'?'3 S ranks':`Level ${item.unlockLevel}`;b.append(lock);}b.addEventListener('click',()=>equip(item.id));area.append(b);
 }area.scrollTop=scroll;
}
function applyOutfit(){renderer.setOutfit(equipped());$('#stage').setAttribute('aria-label',`Mira wearing ${equipped().map(i=>i.name).join(', ')}`);refreshBrief();renderItems();persist();}
function equip(id){const old=structuredClone(state.outfit);if(!chooseItem(state,id))return;history.push(old);if(history.length>40)history.shift();applyOutfit();chime();sparkle();$('#selection-note').textContent=G.byId[id].name+' — make this look your own.';recordAction('action',{name:'equip',item:id,category:G.byId[id].category});$(`[data-item="${id}"]`)?.focus({preventScroll:true});}
function suggest(index){const checks=E.goals(currentTheme(),equipped()),s=E.suggestion(currentTheme(),state.outfit,equipped(),D.items.filter(i=>state.save.unlockedItems.includes(i.id)),index);$('#goal-hint').textContent=checks[index].done?'This note is already part of your look.':checks[index].hint;if(s){state.category=s.category;state.filter=s.ids;renderItems();$('#items').scrollTop=0;}}
function selectLevel(index){const fresh=enterChallenge(state,index);if(!fresh)return false;history.length=0;state.filter=null;$('#goal-hint').textContent='Tap a note for a wardrobe suggestion.';$('#selection-note').textContent=fresh.length?`${fresh.length} chapter gifts added to your wardrobe.`:currentTheme().description;refreshBrief();renderItems();persist();recordAction('screen',{screen:'challenge',level:index});return true;}
function map(){
 const available=D.themes.filter(t=>canEnterChallenge(state,t.index)).length;
 $('#story-availability').textContent=state.allStories?'QA preview: all 36 stories are selectable. QA progress is saved separately.':`${available} of 36 stories unlocked. Reveal a passing look to unlock the next story.${state.qa?' QA progress is saved separately.':''}`;
 $('#chapter-map').replaceChildren();for(let c=1;c<=6;c++){const chapter=D.chapters[c-1],section=document.createElement('section');section.className='chapter-block';const title=document.createElement('h3');title.textContent=`${String(c).padStart(2,'0')} · ${chapter.name}`;const note=document.createElement('p');note.textContent=chapter.note;const grid=document.createElement('div');grid.className='level-grid';
  for(const theme of D.themes.filter(t=>t.chapter===c)){const b=document.createElement('button');b.className='level-tile'+(state.level===theme.index?' current':'');b.dataset.level=theme.index;const level=state.save.levels[theme.id];b.dataset.rank=level?.rank||'';b.disabled=!canEnterChallenge(state,theme.index);if(state.level===theme.index)b.setAttribute('aria-current','true');b.setAttribute('aria-label',`Level ${theme.index}: ${theme.name}${b.disabled?'. Locked':state.level===theme.index?'. Current story':''}`);const num=document.createElement('strong');num.textContent=theme.index;const name=document.createElement('span');name.textContent=theme.name;const score=document.createElement('small');score.textContent=level?`${level.rank} · ${level.best} pts`:b.disabled?'Locked':state.level===theme.index?'Current story':'Ready to style';b.append(num,name,score);b.addEventListener('click',()=>{if(selectLevel(theme.index))$('#journey').close();});grid.append(b);}
  section.append(title,note,grid);$('#chapter-map').append(section);
 }$('#journey').showModal();
}
function book(){
 const area=$('#book-grid');area.replaceChildren();const looks=G.savedLooks(state.save);if(!looks.length){const p=document.createElement('p');p.className='empty';p.textContent='Your first story starts here. Reveal a passing look to keep it in your collection.';area.append(p);}
 for(const look of looks){const theme=D.themes[look.level-1],b=document.createElement('button');b.className='book-card';b.dataset.saved=look.level;
  if(pictures[theme.id]){const img=new Image();img.src=pictures[theme.id];img.alt='Saved look for '+theme.name;b.append(img);}else{const placeholder=document.createElement('span');placeholder.className='missing-picture';placeholder.textContent=look.rank;b.append(placeholder);}
  const title=document.createElement('strong');title.textContent=theme.name;const note=document.createElement('span');note.textContent=`${look.rank} · ${look.score} points · Wear again`;b.append(title,note);b.addEventListener('click',()=>{selectLevel(look.level);state.outfit=G.normalizeOutfit(look.outfit,state.save.unlockedItems);applyOutfit();$('#lookbook').close();$('#selection-note').textContent='Your saved look is back. Make it yours again.';});area.append(b);
 }$('#lookbook').showModal();
}
function showResult(){
 lastResult=submitChallenge(state);const {result,fresh,streakReward,isBest,savedLook,complete}=lastResult,theme=currentTheme();persist();refreshBrief();renderItems();
 activeImage=null;try{activeImage=renderer.portrait(theme.name,`${result.rank} · ${result.score} points`);}catch(error){console.warn('Outfit image could not be created',error);}
 const image=$('#result-image');image.hidden=!activeImage;if(activeImage)image.src=activeImage;else image.removeAttribute('src');$('#download').disabled=!activeImage;$('#portrait-warning').hidden=!!activeImage;$('#result').dataset.pictureMissing=String(!activeImage);
 if(savedLook&&activeImage){const mini=document.createElement('canvas');mini.width=200;mini.height=300;const img=new Image();img.onload=()=>{mini.getContext('2d').drawImage(img,0,0,200,300);pictures[theme.id]=mini.toDataURL('image/jpeg',.65);try{storage.setItem(pictureKey,JSON.stringify(pictures));}catch{}};img.src=activeImage;}
 $('#rank').textContent=result.rank;$('#score').textContent=result.score;$('#result-kicker').textContent=complete?'ALL 36 STORIES, STYLED':isBest?'YOUR NEW PERSONAL BEST':'THE REVEAL';
 $('#result-title').textContent=result.rank==='S'?'A signature look.':result.score>=35?'Your story, styled.':'Another little idea?';
 $('#result-note').textContent=complete?'Your whole collection is open. Replay any story and make it even more you.':result.score>=35?'Look saved. Your next story is ready.':'Try the notes in the brief. Retrying is free, and your best result stays saved.';
 const rows=result.checks?result.checks.map(g=>[g.title,g.done?g.points:0,g.points]):[['Required style tags',result.requiredPoints,60],['Bonus style tags',result.bonusPoints,10],['Complete outfit',result.outfitPoints,24]];
 $('#score-breakdown').replaceChildren(...rows.flatMap(([label,points,max])=>{const line=document.createElement('div'),name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;value.textContent=`${points} / ${max}`;line.append(name,value);const bar=document.createElement('div');bar.className='score-bar';const fill=document.createElement('i');fill.style.width=points/max*100+'%';bar.append(fill);return[line,bar];}));
 $('#reward-list').textContent=fresh.length?`${streakReward?'S-streak surprise! ':''}${fresh.length} new ${fresh.length===1?'piece':'pieces'}: ${fresh.map(id=>G.byId[id].name).join(', ')}`:`S streak: ${state.save.streak} / 3 different S-rated stories.`;
 $('#next-level').textContent=complete?'Explore your Lookbook →':result.score>=35&&state.level<36?'Next challenge →':'Try another combination';$('#result').showModal();chime(result.rank==='S');recordAction('look-complete',{level:state.level,score:result.score,items:equipped().map(i=>i.id)});
}
function controls(){
 document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.category;state.filter=null;renderItems();$('#items').scrollTop=0;}));
 $('#filter-clear').addEventListener('click',()=>{state.filter=null;renderItems();});$('#map-open').addEventListener('click',map);$('#book-open').addEventListener('click',book);
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>$('#'+b.dataset.close).close()));
 $('#reveal').addEventListener('click',showResult);$('#retry-look').addEventListener('click',()=>$('#result').close());
 $('#next-level').addEventListener('click',()=>{$('#result').close();if(lastResult.complete)book();else if(lastResult.result.score>=35&&state.level<36)selectLevel(state.level+1);});
 $('#download').addEventListener('click',()=>{if(activeImage){const a=document.createElement('a');a.href=activeImage;a.download=`Muse-Bloom-level-${state.level}.jpg`;a.click();}});
 $('#undo').addEventListener('click',()=>{const previous=history.pop();if(previous){state.outfit=previous;applyOutfit();}});$('#reset').addEventListener('click',()=>{history.push(structuredClone(state.outfit));state.outfit=starterOutfit();applyOutfit();});
 for(const [id,view]of [['full-view','full'],['detail-view','detail']])$('#'+id).addEventListener('click',()=>{renderer.view=state.view=view;renderer.resize();$('#full-view').setAttribute('aria-pressed',String(view==='full'));$('#detail-view').setAttribute('aria-pressed',String(view==='detail'));});
 $('#sound').addEventListener('click',()=>{state.sound=!state.sound;refreshSettings();persist();chime();if(!state.sound)audio?.suspend();});$('#motion').addEventListener('click',()=>{state.paused=!state.paused;refreshSettings();persist();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.suspend();});reduced.addEventListener('change',e=>{if(e.matches){state.paused=true;refreshSettings();}});$('#feedback-open').addEventListener('click',openFeedback);
}
async function start(){
 document.querySelectorAll('button').forEach(b=>b.disabled=true);let timeout;
 try{await Promise.race([renderer.init(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Asset loading timed out')),45000);})]);}finally{clearTimeout(timeout);}
 await renderer.prepareDetails(D.items);controls();applyOutfit();refreshSettings();$('#release-version').textContent=`STYLE STORIES · ${release.version}`;
 if(state.qa){$('#qa-notice').hidden=false;$('#qa-notice').textContent=state.allStories?'QA preview · All stories selectable':'QA preview · Normal story progression';$('.privacy-note').textContent='QA progress is saved separately from your regular game.';}
 $('#loading').hidden=true;document.querySelectorAll('button:not([data-item])').forEach(b=>b.disabled=false);$('#undo').disabled=true;document.documentElement.dataset.ready='true';
 if(state.migrated)$('#selection-note').textContent='Your classic progress is here. Meet your new wardrobe.';
 if(new URLSearchParams(location.search).has('test'))window.__campaign={state,renderer,D,G,E,equip,selectLevel,showResult,snapshot:()=>({version:release.version,level:state.level,outfit:structuredClone(state.outfit),owned:state.save.unlockedItems.length,completed:D.themes.filter(t=>(state.save.levels[t.id]?.best||0)>=35).length,score:G.scoreBreakdown(currentTheme(),equipped()),save:structuredClone(state.save)}),setOutfit(outfit){state.outfit=G.normalizeOutfit(outfit,state.save.unlockedItems);applyOutfit();}};
}
start().catch(error=>{console.error(error);document.documentElement.dataset.ready='error';$('#loading').innerHTML='<span>✳</span><p>The wardrobe could not open.<br>Please try again.</p><button id="retry">Try again</button>';$('#retry').addEventListener('click',()=>location.reload());});
