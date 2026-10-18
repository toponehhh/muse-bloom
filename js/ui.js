(function (root) {
  'use strict';
  const D = root.MuseData, G = root.MuseGame, A = root.MuseArt;
  const escape = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icons = {
    arrow:'M4 12h15m-6-6 6 6-6 6', back:'M20 12H5m6-6-6 6 6 6',
    sound:'M11 5 6 9H3v6h3l5 4Zm4 3q7 4 0 8m3-11q10 7 0 14', mute:'M11 5 6 9H3v6h3l5 4Zm5 4 6 6m0-6-6 6',
    settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8m0-5v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
    lock:'M6 10h12v11H6Zm3 0V6a3 3 0 0 1 6 0v4m-3 5v2', check:'m5 12 4 4L19 6', close:'m6 6 12 12M6 18 18 6',
    hair:'M5 19V9a7 7 0 0 1 14 0v10l-4-1V9l-3-3-3 4v8Zm4-9q4 0 6-1',
    top:'m8 4-6 4 3 5 3-2v10h8V11l3 2 3-5-6-4q-4 4-8 0Z',
    bottom:'M6 3h12l2 18h-6l-2-12-2 12H4Zm0 4h12',
    dress:'m9 3-3 3 3 5-5 10h16l-5-10 3-5-3-3q-3 3-6 0Zm0 8h6',
    shoes:'M3 13V7h6l2 6 10 3v4H3Zm0 4h16',
    accessory:'M4 8h16l1 13H3Zm4 0V6a4 4 0 0 1 8 0v2',
    star:'m12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', reset:'M4 9a8 8 0 1 1 0 7M4 3v6h6', grid:'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z'
  };
  const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name] || icons.star}"/></svg>`;
  const btn = (action,label,cls='button',extra='') => `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
  const thumbnail = item => `<img class="item-art" src="${A.uri(A.itemSvg(item,true))}" alt="" draggable="false">`;
  let sceneCount=0;
  function avatar(outfit,skinId,cls='') {
    const skin=D.skins.find(s=>s.id===skinId)||D.skins[1];
    return `<div class="avatar ${cls}" role="img" aria-label="Your styled character">${A.avatarSvg(skin,G.equippedItems(outfit),'studio-'+(++sceneCount))}</div>`;
  }
  function updateAvatar(slot,outfit,skinId,bounce) {
    const current=slot.querySelector('.avatar'),scene=current?.querySelector(':scope > svg');
    if(!scene){slot.innerHTML=avatar(outfit,skinId);return;}
    const skin=D.skins.find(s=>s.id===skinId)||D.skins[1];
    const template=document.createElement('template');template.innerHTML=A.avatarSvg(skin,G.equippedItems(outfit),scene.dataset.scene);
    const desired=[...template.content.firstElementChild.children],existing=new Map([...scene.children].map(n=>[n.dataset.layer,n]));
    // All changes are synchronous. Keep the character and unchanged layers mounted.
    // No Image.decode() gap, including when an item is removed or rapidly replaced.
    desired.forEach((next,index)=>{
      const old=existing.get(next.dataset.layer),node=old||next;
      if(old&&old.innerHTML!==next.innerHTML)old.innerHTML=next.innerHTML;
      if(scene.children[index]!==node)scene.insertBefore(node,scene.children[index]||null);
      existing.delete(next.dataset.layer);
    });
    existing.forEach(node=>node.remove());
    current.classList.toggle('equip-bounce',bounce);
  }
  function demoOutfit(which=0) {
    const outfit=G.emptyOutfit();
    const indices=which===1?{hair:18,top:20,bottom:18,shoes:16,accessory:14}:which===2?{hair:1,dress:3,shoes:6,accessory:7}:{hair:0,top:1,bottom:1,shoes:1,accessory:1};
    for(const [category,index] of Object.entries(indices)) { const id=D.items.filter(i=>i.category===category)[index].id; category==='accessory'?outfit.accessory.push(id):outfit[category]=id; }
    return outfit;
  }
  function header(state) {
    return `<header class="app-header">${btn('home','<span class="bloom-mark">✳</span><span>Muse <i>Bloom</i></span>','brand','aria-label="Muse Bloom home"')}<div class="header-right">${btn('collection',`${icon('accessory')}<span>${state.save.unlockedItems.length}<span class="muted"> / 122</span></span>`,'collection-pill','aria-label="Open your collection"')}<span class="header-divider"></span>${btn('mute',icon(state.save.muted?'mute':'sound'),'icon-button',`aria-label="${state.save.muted?'Unmute':'Mute'} sound" aria-pressed="${state.save.muted}"`)}${btn('settings',icon('settings'),'icon-button','aria-label="Settings"')}</div></header>`;
  }
  function home(state) {
    const cleared=Object.values(state.save.levels).filter(l=>l.best>=35).length;
    return `<main class="home-screen screen"><div class="home-copy"><div class="eyebrow"><span class="tiny-line"></span> YOUR DAILY DOSE OF DRESS-UP</div><h1>Style your<br><em>glow-up.</em><span class="title-spark">✧</span></h1><p class="home-intro">Big mood. Endless outfits.<br>Step into the spotlight and make it yours.</p><div class="home-actions">${btn('play',`${cleared?'Keep blooming':'Let’s style'} ${icon('arrow')}`,'button primary')}${btn('map',`Explore chapters <span>↗</span>`,'text-button')}</div><div class="home-stats"><div><b>36</b><span>style challenges</span></div><div><b>122</b><span>pieces to love</span></div><div><b>∞</b><span>ways to be you</span></div></div><p class="home-note"><span>✦</span> No timer. Just your imagination.</p></div><div class="home-art"><div class="home-arch"><div class="arch-outline"></div>${glints()}<div class="arch-label">THE GLOW STUDIO</div><div class="avatar-shadow"></div>${avatar(demoOutfit(),state.save.skin)}<span class="arch-number">✦ LOOK 001</span><span class="arch-vertical">DREAM IT. DRESS IT.</span></div><div class="floating-card float-one"><span class="mini-kicker">THE IT ACCESSORY</span>${thumbnail(D.items.find(i=>i.name==='Heart Bag'))}<span>a little arm candy ♡</span></div><div class="floating-card float-two">${thumbnail(D.items.find(i=>i.name==='Cloud Sneakers'))}<span>fresh pair energy</span></div><div class="style-sticker">100%<br><em>your vibe</em><span>✦</span></div><span class="art-star star-one">✧</span><span class="art-star star-two">✳</span></div><footer class="home-footer"><span>A NEW LOOK. A NEW KIND OF GLOW.</span><span>Everyday moments → Main character energy</span></footer></main>`;
  }
  function map(state) {
    const chapter=D.chapters[state.chapter-1],next=G.nextLevel(state.save);
    const completed=Object.values(state.save.levels).filter(l=>l.best>=35).length;
    return `<main class="map-screen screen"><div class="section-heading"><div><div class="eyebrow">YOUR STYLE STORY</div><h1>One look. <em>A new chapter.</em></h1></div><div class="map-progress"><b>${completed}<span> / 36</span></b><span>challenges complete</span></div></div><nav class="chapter-tabs" aria-label="Chapters">${D.chapters.map((c,i)=>btn('chapter',`<span class="chapter-no">0${i+1}</span>${c.short}`,'chapter-tab'+(i+1===state.chapter?' active':''),`data-chapter="${i+1}" aria-pressed="${i+1===state.chapter}"`)).join('')}</nav><section class="chapter-panel" style="--chapter-color:${chapter.color}"><div class="chapter-intro"><span class="eyebrow">CHAPTER 0${state.chapter}</span><h2>${chapter.name}</h2><p>${chapter.note}</p><div class="chapter-line"></div><p class="chapter-tip">${state.chapter===6?'Discover 20 pieces inspired by modern Chinese fashion.':'Match the mood. Add your touch. Make it bloom.'}</p></div><div class="level-grid">${D.themes.filter(t=>t.chapter===state.chapter).map(t=>{const locked=t.index>next,best=state.save.levels[t.id];return btn('level',`<span class="level-top"><span>${String(t.index).padStart(2,'0')}</span>${locked?icon('lock'):best?`<span class="rank-small rank-${best.rank}">${best.rank}</span>`:'<span class="new-dot"></span>'}</span><span class="level-emoji">${t.icon}</span><strong>${t.name}</strong><span class="level-caption">${locked?'Complete the previous look':best?`${best.best} points · Style again`:'Your next main-character moment'}</span>`,'level-card'+(locked?' locked':'')+(t.index===next?' current':''),`data-level="${t.index}" ${locked?'disabled':''}`);}).join('')}</div></section><div class="map-foot"><span>${icon('star')} Get S on 3 different challenges in a row to find a secret piece.</span>${btn('play',`Continue styling ${icon('arrow')}`,'button primary')}</div></main>`;
  }
  function tags(theme,outfit) {
    const found=new Set(G.equippedItems(outfit).flatMap(i=>i.tags));
    return theme.required.map(t=>`<span class="tag ${found.has(t)?'matched':''}">${found.has(t)?icon('check'):'<span class="tag-dot"></span>'}${t}</span>`).join('');
  }
  function tabs(state) {
    return D.categories.map(c=>btn('category',`${icon(c)}<span>${D.categoryNames[c]}</span>`,'category-tab'+(state.category===c?' active':''),`data-category="${c}" aria-pressed="${state.category===c}" ${state.screen==='dressing'&&state.outfit.dress&&['top','bottom'].includes(c)?'disabled title="Remove your dress to wear separates"':''}`)).join('');
  }
  function itemCards(state,collection=false) {
    const equipped=new Set(G.equippedItems(state.outfit).map(i=>i.id));
    const required=state.screen==='dressing'?D.themes[state.level-1].required:[];
    return D.items.filter(i=>i.category===state.category && (collection||state.showLocked||state.save.unlockedItems.includes(i.id))).map(i=>{
      const locked=!state.save.unlockedItems.includes(i.id),selected=!collection&&equipped.has(i.id);
      const unlockCopy=i.unlockType==='streak'?'3 S-rank streak':`${i.unlockOn==='enter'?'Enter':'Pass'} look ${i.unlockLevel}`;
      return btn(collection?'inspect':'equip',`<span class="item-picture">${thumbnail(i)}${selected?`<span class="selected-check">${icon('check')}</span>`:''}${locked?`<span class="lock-badge">${icon('lock')}</span>`:''}${i.chinese?'<span class="silk-label">SILK & JADE</span>':''}</span><span class="item-name">${i.name}</span><span class="item-tags">${i.tags.map(t=>`<span class="${required.includes(t)?'relevant':''}">${t}</span>`).join('')}</span>${locked?`<span class="unlock-note">${unlockCopy}</span>`:''}`,'item-card'+(selected?' selected':'')+(locked?' locked':''),`data-item="${i.id}" aria-label="${escape(i.name)}, ${i.tags.join(', ')}${locked?', locked: '+unlockCopy:''}" ${collection?'':`aria-pressed="${selected}"`} ${locked&&!collection?'aria-disabled="true"':''}`);
    }).join('');
  }
  function swatches(state) { return D.skins.map(s=>btn('skin','<span></span>','skin-swatch'+(state.save.skin===s.id?' active':''),`data-skin="${s.id}" style="--skin:${s.color}" aria-label="${s.name} skin tone" aria-pressed="${state.save.skin===s.id}"`)).join(''); }
  const glints=()=>`<div class="studio-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><b>✦</b><b>✧</b><b>✦</b><span class="studio-orbit"></span><span class="studio-podium"></span></div>`;
  function stage(state,cls='') { return `<div class="fitting-stage ${cls}"><div class="stage-arch"></div>${glints()}<span class="stage-label">GLOW STUDIO</span><span class="stage-spark">✧</span><div class="avatar-shadow"></div><div id="avatar-slot">${avatar(state.outfit,state.save.skin)}</div><span class="stage-side">YOUR MAIN CHARACTER MOMENT</span><div class="skin-selector"><span>YOUR TONE</span>${swatches(state)}</div></div>`; }
  function outfitBar(state) {
    const pieces=G.equippedItems(state.outfit),units=pieces.reduce((n,i)=>n+i.slotUnit,0);
    return `<div class="outfit-status"><div class="slot-dots" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="${i<units?'filled':''}"></span>`).join('')}</div><span><b>${units}/6</b> finishing touches</span></div>${btn('clear',icon('reset'),'icon-button','aria-label="Clear outfit"')}${btn('score',`Score it! ${icon('star')}`,'button primary','aria-label="Score your outfit"')}`;
  }
  function dressing(state) {
    const theme=D.themes[state.level-1];
    return `<main class="dressing-screen screen"><section class="brief"><div class="brief-main">${btn('map',icon('back'),'icon-button back-button','aria-label="Back to chapters"')}<div><div class="eyebrow">${D.chapters[theme.chapter-1].short.toUpperCase()} <span> / </span> LOOK ${String(theme.index).padStart(2,'0')} OF 36</div><h1>${theme.name} <span class="brief-emoji">${theme.icon}</span></h1><p>${theme.description}</p></div></div><div class="brief-tags"><span class="mini-kicker">MATCH THE MOOD</span><div id="brief-tag-list">${tags(theme,state.outfit)}</div><span class="bonus-line">A little extra: ${theme.bonus.join(' + ')}</span></div></section><div class="dressing-layout">${stage(state)}<section class="wardrobe-panel"><div class="wardrobe-title"><div><span class="eyebrow">CURATE YOUR NEXT OBSESSION</span><h2>Your wardrobe<span>✦</span></h2></div><span class="streak-pill" title="Three different S challenges in a row unlock a secret piece">${icon('star')} ${state.save.streak}/3</span></div><nav class="category-tabs" aria-label="Clothing categories" id="category-tabs">${tabs(state)}</nav><div class="wardrobe-toolbar"><span id="category-count">${D.items.filter(i=>i.category===state.category&&state.save.unlockedItems.includes(i.id)).length} pieces to play with</span><label><input type="checkbox" id="show-locked" ${state.showLocked?'checked':''}> Show locked</label></div><div class="item-grid" id="item-grid">${itemCards(state)}</div><div class="dress-notice" id="dress-notice" ${state.outfit.dress?'':'hidden'}>Wearing a dress? Remove it in Dresses to wear tops and bottoms.</div><footer class="wardrobe-footer" id="outfit-bar">${outfitBar(state)}</footer></section></div></main>`;
  }
  function result(state) {
    const t=D.themes[state.level-1],r=state.result.result,passed=r.score>=35,all=state.result.complete;
    return `<main class="result-screen screen"><div class="result-look"><div class="result-look-heading"><span class="eyebrow">THE MUSE BLOOM LOOKBOOK</span><h2>${t.name}</h2></div>${stage(state,'result-stage')}<div class="look-tags">${t.required.join(' · ')}</div></div><div class="result-copy"><div class="eyebrow">${all?'YOUR STYLE STORY, COMPLETE':state.result.isBest&&passed?'A NEW PERSONAL BEST':'YOUR LOOK IS IN'}</div><h1>${r.rank==='S'?'A blooming <em>masterpiece.</em>':r.rank==='A'?'You’ve got <em>the look.</em>':passed?'Your style is <em>blooming.</em>':'A fresh take? <em>You’ve got this.</em>'}</h1><div class="score-line"><div class="rank-seal rank-${r.rank}">${r.rank}<span>RANK</span></div><div><div class="score-number"><span id="score-number">${r.score}</span><span>points</span></div><p>${r.maximum} possible · ${r.rank==='S'?'You nailed the mood.':passed?'A little more detail can make it S.':'Match the three mood tags and try again.'}</p></div></div><div class="score-breakdown"><div><span>THE MOOD</span><b>${r.requiredPoints}<small> / 60</small></b><p>${r.required.length}/3 tags matched</p></div><div><span>THE EXTRAS</span><b>${r.bonusPoints}<small> / 10</small></b><p>${r.bonus.length}/2 bonus tags</p></div><div><span>THE FINISH</span><b>${r.outfitPoints}<small> / 24</small></b><p>${r.units}/6 outfit units</p></div></div>${r.required.length<3?`<p class="missing-tags">Try adding: <strong>${t.required.filter(tag=>!r.required.includes(tag)).join(', ')}</strong></p>`:''}<div class="reward-section"><div class="reward-heading"><span class="eyebrow">${state.result.fresh.length?'FRESH FINDS, JUST UNLOCKED':'YOUR NEXT LITTLE GOAL'}</span><span>${state.result.streakReward?'✦ Secret piece found!':`${state.save.streak}/3 S streak`}</span></div>${state.result.fresh.length?`<div class="reward-items">${state.result.fresh.map(id=>`<div>${thumbnail(G.byId[id])}<span>${G.byId[id].name}</span></div>`).join('')}</div>`:`<p>${all?'All 36 challenges complete. Keep collecting, or revisit your favorite looks.':'Earn S in 3 different challenges in a row to unlock a secret piece.'}</p>`}</div><div class="result-actions">${btn(passed?(state.level===36?'map':'next'):'retry',`${passed?(state.level===36?'Explore your story':'Next challenge'):'Style it again'} ${icon('arrow')}`,'button primary')}${passed?btn('retry',icon('reset')+' Restyle','button secondary'):''}${['S','A'].includes(r.rank)?btn('share',icon('download')+' Save your look','button secondary'):''}</div></div></main>${r.rank==='S'?'<div class="confetti" aria-hidden="true">'+Array.from({length:22},(_,i)=>`<i style="--n:${i};--x:${(i*43)%100}%;--c:${['#c79875','#97b8a2','#d7a2b4','#d4c5a0'][i%4]}"></i>`).join('')+'</div>':''}`;
  }
  function collection(state) {
    return `<main class="collection-screen screen"><div class="section-heading"><div><div class="eyebrow">LITTLE FINDS. BIG POSSIBILITIES.</div><h1>Your growing <em>collection.</em></h1></div><div class="map-progress"><b>${state.save.unlockedItems.length}<span> / 122</span></b><span>pieces collected</span></div></div><nav class="category-tabs" aria-label="Collection categories">${tabs(state)}</nav><div class="item-grid collection-grid">${itemCards(state,true)}</div><div class="collection-back">${btn('return',`${icon('back')} Back to your look`,'button secondary')}</div></main>`;
  }
  function settings(state) {
    return `<div class="dialog-head"><div><div class="eyebrow">MAKE YOURSELF AT HOME</div><h2 id="dialog-title">Your little studio</h2></div>${btn('close',icon('close'),'icon-button','aria-label="Close settings"')}</div><section class="setting-section"><h3>Your skin tone</h3><div class="settings-skins">${swatches(state)}</div><p>Every tone, every look. Your choice never affects your score.</p></section><section class="setting-section"><h3>Sound</h3>${btn('mute',`${icon(state.save.muted?'mute':'sound')} Sound ${state.save.muted?'off':'on'}`,'button secondary')}</section><section class="setting-section"><h3>A little styling secret</h3><p>Match each mood tag for <b>20 points</b>. Bonus tags add <b>5</b>. Fill your outfit for up to <b>24</b> more. Dresses fill two units; wear up to two extras.</p><div class="rank-guide">S 85+ <span>A 70+</span><span>B 55+</span><span>C 35+</span></div><p>The best possible score is <b>94</b>. A C passes the challenge. Three different S looks in a row earn a secret piece. Restyling one look does not grow your streak.</p></section><section class="setting-section"><p class="save-status">${state.storage.persistent?'Your progress is saved in this browser.':'Temporary session: progress cannot be saved in this browser.'}</p>${btn('reset-progress','Start a new style story','text-button danger')}</section>`;
  }
  function render(state) { document.getElementById('app').innerHTML=header(state)+({home,map,dressing,result,collection}[state.screen]||home)(state); document.body.dataset.screen=state.screen; }
  function updateDressing(state,bounce=false) {
    const slot=document.getElementById('avatar-slot'); if(!slot)return;
    updateAvatar(slot,state.outfit,state.save.skin,bounce);
    document.getElementById('brief-tag-list').innerHTML=tags(D.themes[state.level-1],state.outfit);
    document.getElementById('category-tabs').innerHTML=tabs(state);
    const grid=document.getElementById('item-grid'),scroll=grid.scrollTop,focus=document.activeElement?.dataset.item;
    const template=document.createElement('template');template.innerHTML=itemCards(state);grid.replaceChildren(template.content);grid.scrollTop=scroll;
    if(focus) grid.querySelector(`[data-item="${focus}"]`)?.focus({preventScroll:true});
    document.getElementById('category-count').textContent=`${D.items.filter(i=>i.category===state.category&&state.save.unlockedItems.includes(i.id)).length} pieces to play with`;
    document.getElementById('outfit-bar').innerHTML=outfitBar(state);
    document.getElementById('dress-notice').hidden=!state.outfit.dress;
    document.querySelector('.skin-selector').innerHTML='<span>YOUR TONE</span>'+swatches(state);
  }
  root.MuseUI={render,updateDressing,header,icon,btn,escape,avatar,thumbnail,settings,swatches,demoOutfit};
})(globalThis);
