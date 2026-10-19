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
  const room = () => `<img class="room-backdrop" src="${root.MuseAssets['assets/scenes/bedroom.webp']}" alt="" aria-hidden="true" draggable="false">`;
  const categoryArt = name => `<span class="category-art">${icon(name)}</span>`;
  const editorial = (name,alt,cls='') => {const id={'rose-studio':'bella','golden-hour':'zoe','city-muse':'mika'}[name],c=D.characters.find(c=>c.id===id);return `<img class="editorial-art ${cls}" data-editorial="${name}" src="${A.characterSource(c)}" alt="${c.name}, ${c.note}" draggable="false">`;};
  const thumbnail = item => `<img class="item-art" src="${A.uri(A.itemSvg(item,true))}" alt="" draggable="false">`;
  let sceneCount=0;
  function avatar(outfit,characterId,cls='') {
    const character=D.characters.find(s=>s.id===characterId)||D.characters[0];
    return `<div class="avatar ${cls}" data-avatar-character="${character.id}" role="img" aria-label="Your styled character">${A.avatarSvg(character,G.equippedItems(outfit),'studio-'+(++sceneCount))}</div>`;
  }
  function updateAvatar(slot,outfit,characterId,bounce) {
    const current=slot.querySelector('.avatar'),scene=current?.querySelector(':scope > svg');
    if(!scene){slot.innerHTML=avatar(outfit,characterId);return;}
    const character=D.characters.find(s=>s.id===characterId)||D.characters[0];
    const template=document.createElement('template');template.innerHTML=A.avatarSvg(character,G.equippedItems(outfit),scene.dataset.scene);
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
    current.dataset.avatarCharacter=character.id;scene.dataset.character=character.id;
    // Motion runs on the whole composite through MuseFX after this synchronous update.
  }
  function demoOutfit(which=0) {
    const looks=[[D.defaultHair,'top_preppy_03','bottom_cute_02','shoes_casual_01','accessory_cute_03'],['hair_silk_19','top_silk_23','bottom_silk_19','shoes_silk_18','accessory_silk_15'],['hair_cozy_03','top_romantic_04','bottom_summer_04','shoes_cute_02']];
    const outfit=G.emptyOutfit();
    for(const id of looks[which%looks.length]) { const item=G.byId[id];item.category==='accessory'?outfit.accessory.push(id):outfit[item.category]=id; }
    return outfit;
  }
  function header(state) {
    return `<header class="app-header">${btn('home','<span class="bloom-mark">✦</span><span>Muse <i>Bloom</i><small>THE GLAM STUDIO</small></span>','brand','aria-label="Muse Bloom home"')}<nav class="studio-nav" aria-label="Studio navigation">${btn('studio','Fitting salon','nav-link'+(state.screen==='dressing'?' active':''))}${btn('nav-map','Challenges','nav-link'+(state.screen==='map'?' active':''))}</nav><div class="header-right">${btn('lookbook',`${icon('grid')}<span>Lookbook</span>`,'lookbook-link',`aria-label="Open your lookbook" ${state.screen==='lookbook'?'aria-current="page"':''}`)}${btn('collection',`${icon('accessory')}<span>${state.save.unlockedItems.length}<span class="muted"> / 122</span></span>`,'collection-pill','aria-label="Open your collection"')}<span class="header-divider"></span>${btn('mute',icon(state.save.muted?'mute':'sound'),'icon-button',`aria-label="${state.save.muted?'Unmute':'Mute'} sound" aria-pressed="${state.save.muted}"`)}${btn('settings',icon('settings'),'icon-button','aria-label="Settings"')}</div></header>`;
  }
  function home(state) {
    const cleared=Object.values(state.save.levels).filter(l=>l.best>=35).length;
    return `<main class="home-screen screen"><div class="home-copy"><div class="eyebrow"><span class="tiny-line"></span> YOUR PRIVATE DRESSING SUITE</div><h1>Every look.<br><em>Entirely you.</em></h1><p class="home-intro">Choose your muse. Play with your wardrobe.<br>Make every outfit a little more you.</p><div class="home-actions">${btn('play',`${cleared?'Continue styling':'Enter the studio'} ${icon('arrow')}`,'button primary')}${btn('characters','Meet the muses','text-button')}</div><div class="home-stats"><div><b>36</b><span>style challenges</span></div><div><b>122</b><span>collectible pieces</span></div><div><b>06</b><span>collections</span></div></div><p class="home-note">STYLE. COLLECT. MAKE YOUR COVER.</p></div><div class="home-art"><figure class="campaign-main">${editorial('rose-studio','Pink-haired fashion illustration in a softly lit dressing room')}<figcaption><span>THE MOODBOARD / 01</span><strong>Soft glow.<br>Star energy.</strong></figcaption><span class="campaign-seal">THE<br>GLAM<br>EDIT ✦</span></figure><figure class="campaign-mini campaign-gold">${editorial('golden-hour','Fashion illustration with ribbon buns and a golden palette')}<figcaption>02 / GOLDEN HOUR</figcaption></figure><figure class="campaign-mini campaign-city">${editorial('city-muse','Fashion illustration with a sleek bob and satin outfit')}<figcaption>03 / CITY MUSE</figcaption></figure><div class="campaign-spark" aria-hidden="true">✧</div></div><footer class="home-footer">${btn('map','Explore challenges','text-button')}<span>Everyday / After hours / Silk & Jade</span></footer></main>`;
  }
  function map(state) {
    const chapter=D.chapters[state.chapter-1],next=G.nextLevel(state.save);
    const completed=Object.values(state.save.levels).filter(l=>l.best>=35).length;
    return `<main class="map-screen screen"><div class="section-heading"><div><div class="eyebrow">THE COLLECTIONS</div><h1>Six collections.<br><em>Your point of view.</em></h1></div><div class="map-progress"><b>${completed}<span> / 36</span></b><span>challenges complete</span></div></div><nav class="chapter-tabs" aria-label="Chapters">${D.chapters.map((c,i)=>btn('chapter',`<span class="chapter-no">0${i+1}</span>${c.short}`,'chapter-tab'+(i+1===state.chapter?' active':''),`data-chapter="${i+1}" aria-pressed="${i+1===state.chapter}"`)).join('')}</nav><section class="chapter-panel" style="--chapter-color:${chapter.color}"><div class="chapter-intro" data-number="0${state.chapter}"><span class="eyebrow">CHAPTER 0${state.chapter}</span><h2>${chapter.name}</h2><p>${chapter.note}</p><div class="chapter-line"></div><p class="chapter-tip">${state.chapter===6?'Discover 20 pieces inspired by modern Chinese fashion.':'A new setting. A different mood. The details are yours.'}</p></div><div class="level-grid">${D.themes.filter(t=>t.chapter===state.chapter).map(t=>{const locked=t.index>next,best=state.save.levels[t.id];return btn('level',`<span class="level-top"><span>${String(t.index).padStart(2,'0')}</span>${locked?icon('lock'):best?`<span class="rank-small rank-${best.rank}">${best.rank}</span>`:'<span class="new-dot"></span>'}</span><span class="level-issue" aria-hidden="true">${String(t.index).padStart(2,'0')}</span><strong>${t.name}</strong><span class="level-caption">${locked?'Complete the previous look':best?`${best.best} points · Style again`:'Open this style brief'}</span>`,'level-card'+(locked?' locked':'')+(t.index===next?' current':''),`data-level="${t.index}" ${locked?'disabled':''}`);}).join('')}</div></section><div class="map-foot"><span>${icon('star')} Get S on 3 different challenges in a row to find a secret piece.</span>${btn('play',`Continue styling ${icon('arrow')}`,'button primary')}</div></main>`;
  }
  function tags(theme,outfit) {
    const found=new Set(G.equippedItems(outfit).flatMap(i=>i.tags));
    return theme.required.map(t=>`<span class="tag ${found.has(t)?'matched':''}">${found.has(t)?icon('check'):'<span class="tag-dot"></span>'}${t}</span>`).join('');
  }
  function tabs(state) {
    return D.categories.map(c=>btn('category',`${categoryArt(c)}<span>${D.categoryNames[c]}</span>`,'category-tab'+(state.category===c?' active':''),`data-category="${c}" aria-pressed="${state.category===c}" ${state.screen==='dressing'&&state.outfit.dress&&['top','bottom'].includes(c)?'disabled title="Remove your dress to wear separates"':''}`)).join('');
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
  const portrait=c=>`<svg viewBox="180 0 360 330" aria-hidden="true"><image href="${A.characterSource(c)}" x="-66.667" width="853.333" height="1280"/></svg>`;
  function swatches(state) {return D.characters.map(c=>btn('character',`${portrait(c)}<span>${c.name}</span>`,'character-choice'+(state.save.character===c.id?' active':''),`data-character="${c.id}" aria-label="Choose ${c.name}, ${c.note}" aria-pressed="${state.save.character===c.id}"`)).join('');}
  function characters(state){return `<div class="dialog-head"><div><div class="eyebrow">MEET YOUR MUSE</div><h2 id="dialog-title">Choose your character</h2></div>${btn('close',icon('close'),'icon-button','aria-label="Close character selector"')}</div><p>Three faces. Your wardrobe. Pick a muse and make the look yours.</p><div class="character-gallery">${D.characters.map(c=>btn('character',`<div class="character-preview">${A.avatarSvg(c,[],'choice-'+c.id)}</div><strong>${c.name}</strong><span>${c.note}</span><small>${state.save.character===c.id?'Selected':'Choose character'}</small>`,'character-card'+(state.save.character===c.id?' active':''),`data-character="${c.id}" aria-pressed="${state.save.character===c.id}"`)).join('')}</div><p class="character-help">Your hairstyle belongs to your character. Add bows, clips and headbands in Hair details.</p>`;}
  const glints=()=>`<div class="studio-lights" aria-hidden="true"><i></i><i></i><i></i><i></i><b>✦</b><b>✧</b><b>✦</b><span class="studio-orbit"></span><span class="studio-podium"></span></div>`;
  function stage(state,cls='') {
    const thought=state.screen==='dressing'?D.themes[state.level-1].description:'This look is so you!';
    return `<div class="fitting-stage ${cls}">${room()}<div class="room-light"></div><div class="vanity-rim" aria-hidden="true"></div>${glints()}<div class="scene-speech"><span class="scene-caption">THE STYLE BRIEF</span>${escape(thought)}</div><div class="avatar-shadow"></div><div id="avatar-slot">${avatar(state.outfit,state.save.character)}</div><div class="character-selector" aria-label="Choose your character">${swatches(state)}${btn('characters','Meet the muses','character-more')}</div></div>`;
  }
  function outfitBar(state) {
    const pieces=G.equippedItems(state.outfit),units=pieces.reduce((n,i)=>n+i.slotUnit,0);
    return `<div class="outfit-status"><div class="slot-dots" aria-hidden="true">${Array.from({length:6},(_,i)=>`<span class="${i<units?'filled':''}"></span>`).join('')}</div><span><b>${units}/6</b> pieces styled</span></div>${btn('clear',icon('reset'),'icon-button','aria-label="Clear outfit"')}${btn('score',`Walk the runway ${icon('arrow')}`,'button primary','aria-label="Score your outfit"')}`;
  }
  function dressing(state) {
    const theme=D.themes[state.level-1];
    return `<main class="dressing-screen screen"><section class="brief"><div class="brief-main">${btn('map',icon('back'),'icon-button back-button','aria-label="Back to chapters"')}<div><div class="eyebrow">${D.chapters[theme.chapter-1].short.toUpperCase()} <span> / </span> LOOK ${String(theme.index).padStart(2,'0')} OF 36</div><h1>${theme.name} </h1><p>${theme.description}</p></div></div><div class="brief-tags"><span class="mini-kicker">MATCH THE MOOD</span><div id="brief-tag-list">${tags(theme,state.outfit)}</div><span class="bonus-line">A little extra: ${theme.bonus.join(' + ')}</span></div></section><div class="dressing-layout">${stage(state)}<section class="wardrobe-panel"><div class="wardrobe-title"><div><span class="eyebrow">YOUR CURATED CLOSET</span><h2>The dressing drawer</h2></div><span class="streak-pill" title="Three different S challenges in a row unlock a secret piece">${icon('star')} ${state.save.streak}/3</span></div><nav class="category-tabs" aria-label="Clothing categories" id="category-tabs">${tabs(state)}</nav><div class="wardrobe-toolbar"><span id="category-count">${D.items.filter(i=>i.category===state.category&&state.save.unlockedItems.includes(i.id)).length} pieces to play with</span><label><input type="checkbox" id="show-locked" ${state.showLocked?'checked':''}> Show locked</label></div><div class="item-grid" id="item-grid">${itemCards(state)}</div><div class="dress-notice" id="dress-notice" ${state.outfit.dress?'':'hidden'}>Wearing a dress? Remove it in Dresses to wear tops and bottoms.</div><footer class="wardrobe-footer" id="outfit-bar">${outfitBar(state)}</footer></section></div></main>`;
  }
  function result(state) {
    const t=D.themes[state.level-1],r=state.result.result,passed=r.score>=35,all=state.result.complete;
    const stars=r.rank==='S'?3:r.rank==='A'?2:passed?1:0;
    return `<main class="result-screen screen"><div class="result-look"><div class="result-look-heading"><span class="eyebrow">THE RUNWAY / YOUR FINAL LOOK</span><h2>${t.name}</h2></div>${stage(state,'result-stage')}<div class="look-tags">${t.required.join(' · ')}</div></div><div class="result-copy"><div class="eyebrow">${all?'THE COLLECTIONS, COMPLETE':state.result.isBest&&passed?'A NEW PERSONAL BEST':'YOUR LOOK IS IN'}</div><h1>${r.rank==='S'?'A signature <em>look.</em>':r.rank==='A'?'Made to <em>shine.</em>':passed?'A look of <em>your own.</em>':'Let’s add a little <em>magic.</em>'}</h1><div class="rating-stars" role="img" aria-label="${stars} of 3 style stars">${Array.from({length:3},(_,i)=>`<span class="rating-star ${i<stars?'earned':''}" aria-hidden="true">★</span>`).join('')}</div><div class="score-line"><div class="rank-seal rank-${r.rank}">${r.rank}<span>RANK</span></div><div><div class="score-number"><span id="score-number">${r.score}</span><span>points</span></div><p>${r.maximum} possible · ${r.rank==='S'?'You nailed the mood.':passed?'A little more detail can make it S.':'Match the three mood tags and try again.'}</p></div></div><div class="score-breakdown"><div><span>THE MOOD</span><b>${r.requiredPoints}<small> / 60</small></b><p>${r.required.length}/3 tags matched</p></div><div><span>THE EXTRAS</span><b>${r.bonusPoints}<small> / 10</small></b><p>${r.bonus.length}/2 bonus tags</p></div><div><span>THE FINISH</span><b>${r.outfitPoints}<small> / 24</small></b><p>${r.units}/6 outfit units</p></div></div>${r.required.length<3?`<p class="missing-tags">Try adding: <strong>${t.required.filter(tag=>!r.required.includes(tag)).join(', ')}</strong></p>`:''}<div class="reward-section"><div class="reward-heading"><span class="eyebrow">${state.result.fresh.length?'NEW IN YOUR WARDROBE':'YOUR NEXT DISCOVERY'}</span><span>${state.result.streakReward?'✦ Secret piece found!':`${state.save.streak}/3 S streak`}</span></div>${state.result.fresh.length?`<div class="reward-items">${state.result.fresh.map(id=>`<div>${thumbnail(G.byId[id])}<span>${G.byId[id].name}</span></div>`).join('')}</div>`:`<p>${all?'All 36 challenges complete. Keep collecting, or revisit your favorite looks.':'Earn S in 3 different challenges in a row to unlock a secret piece.'}</p>`}</div>${state.result.savedLook?`<p class="lookbook-saved">${icon('check')} This look is in your lookbook.</p>`:''}<div class="result-actions">${btn(passed?(state.level===36?'map':'next'):'retry',`${passed?(state.level===36?'Explore your story':'Next challenge'):'Style it again'} ${icon('arrow')}`,'button primary')}${passed?btn('retry',icon('reset')+' Restyle','button secondary'):''}${['S','A'].includes(r.rank)?btn('share',icon('download')+' Save your look','button secondary'):''}</div></div></main>${r.rank==='S'?'<div class="confetti editorial-confetti" aria-hidden="true">'+Array.from({length:22},(_,i)=>`<i style="--n:${i};--x:${(i*43)%100}%;--c:${['#c79875','#97b8a2','#d7a2b4','#d4c5a0'][i%4]}"></i>`).join('')+'</div>':''}`;
  }
  function collection(state) {
    return `<main class="collection-screen screen"><div class="section-heading"><div><div class="eyebrow">THE COMPLETE WARDROBE</div><h1>Pieces to <em>make your own.</em></h1></div><div class="map-progress"><b>${state.save.unlockedItems.length}<span> / 122</span></b><span>pieces collected</span></div></div><nav class="category-tabs" aria-label="Collection categories">${tabs(state)}</nav><div class="item-grid collection-grid">${itemCards(state,true)}</div><div class="collection-back">${btn('return',`${icon('back')} Back to your look`,'button secondary')}</div></main>`;
  }
  function lookbook(state) {
    const looks=G.savedLooks(state.save);
    return `<main class="lookbook-screen screen"><div class="section-heading"><div><div class="eyebrow">THE PERSONAL ARCHIVE</div><h1>Looks worth<br><em>coming back to.</em></h1></div><div class="map-progress"><b>${String(looks.length).padStart(2,'0')}<span> / 36</span></b><span>looks collected</span></div></div><p class="lookbook-intro">Your best completed look from each challenge. Revisit the details, save a portrait, or make it new.</p>${looks.length?`<div class="lookbook-grid">${looks.map(look=>{const t=D.themes[look.level-1];return btn('view-look',`<span class="lookbook-photo">${room()}${avatar(look.outfit,look.character)}<span class="lookbook-grade">${look.rank}<small>${look.score} / 94</small></span><span class="lookbook-issue">LOOK ${String(look.level).padStart(2,'0')}</span></span><span class="lookbook-title">${t.name}${icon('arrow')}</span><span class="lookbook-meta">${t.required.join(' · ')}</span>`,'lookbook-card',`data-level="${look.level}" aria-label="View saved look: ${escape(t.name)}"`);}).join('')}</div>`:`<section class="lookbook-empty"><div class="empty-editorial">${avatar(demoOutfit(),D.defaultCharacter)}<span>YOUR FIRST EDIT</span></div><div><div class="eyebrow">EVERY COLLECTION STARTS SOMEWHERE</div><h2>A little inspiration.<br><em>A look that's yours.</em></h2><p>Complete a style challenge to begin your personal lookbook. Your outfit and character will be saved together.</p>${btn('play','Create your first look '+icon('arrow'),'button primary')}</div></section>`}<div class="collection-back">${btn('return',`${icon('back')} Back to the studio`,'text-button')}</div></main>`;
  }
  function lookDetail(look) {
    const t=D.themes[look.level-1];
    return `<div class="dialog-head"><div><div class="eyebrow">LOOK ${String(look.level).padStart(2,'0')} / YOUR ARCHIVE</div><h2 id="dialog-title">${t.name}</h2></div>${btn('close',icon('close'),'icon-button','aria-label="Close saved look"')}</div><div class="saved-look-portrait">${room()}${avatar(look.outfit,look.character)}<span class="lookbook-grade">${look.rank}<small>${look.score} / 94</small></span></div><p class="saved-look-tags">${t.required.join(' · ')}</p><div class="saved-look-actions">${btn('wear-look','Restyle this look '+icon('arrow'),'button primary',`data-level="${look.level}"`)}${btn('export-look',icon('download')+' Save portrait','button secondary',`data-level="${look.level}"`)}</div>`;
  }
  function settings(state) {
    return `<div class="dialog-head"><div><div class="eyebrow">YOUR PREFERENCES</div><h2 id="dialog-title">Studio settings</h2></div>${btn('close',icon('close'),'icon-button','aria-label="Close settings"')}</div><section class="setting-section"><h3>Your character</h3><div class="settings-skins">${swatches(state)}</div><p>Every character, every look. Your choice never affects your score.</p></section><section class="setting-section"><h3>Sound</h3>${btn('mute',`${icon(state.save.muted?'mute':'sound')} Sound ${state.save.muted?'off':'on'}`,'button secondary')}${btn('preview-sound','Try a sound','button secondary',state.save.muted?'disabled':'')}<p>Soft clicks, wardrobe chimes and a camera snap. Sound starts after you interact.</p></section><section class="setting-section"><h3>The art of a good match</h3><p>Match each mood tag for <b>20 points</b>. Bonus tags add <b>5</b>. Fill your outfit for up to <b>24</b> more. Dresses fill two units; wear up to two extras.</p><div class="rank-guide">S 85+ <span>A 70+</span><span>B 55+</span><span>C 35+</span></div><p>The best possible score is <b>94</b>. A C passes the challenge. Three different S looks in a row earn a secret piece. Restyling one look does not grow your streak.</p></section><section class="setting-section"><p class="save-status">${state.storage.persistent?'Your progress is saved in this browser.':'Temporary session: progress cannot be saved in this browser.'}</p>${btn('reset-progress','Start a new style story','text-button danger')}</section>`;
  }
  function render(state) { document.getElementById('app').innerHTML=header(state)+({home,map,dressing,result,collection,lookbook}[state.screen]||home)(state); document.body.dataset.screen=state.screen; }
  function updateDressing(state,bounce=false) {
    const slot=document.getElementById('avatar-slot'); if(!slot)return;
    updateAvatar(slot,state.outfit,state.save.character,bounce);
    document.getElementById('brief-tag-list').innerHTML=tags(D.themes[state.level-1],state.outfit);
    document.getElementById('category-tabs').innerHTML=tabs(state);
    const grid=document.getElementById('item-grid'),scroll=grid.scrollTop,focus=document.activeElement?.dataset.item;
    const template=document.createElement('template');template.innerHTML=itemCards(state);grid.replaceChildren(template.content);grid.scrollTop=scroll;
    if(focus) grid.querySelector(`[data-item="${focus}"]`)?.focus({preventScroll:true});
    document.getElementById('category-count').textContent=`${D.items.filter(i=>i.category===state.category&&state.save.unlockedItems.includes(i.id)).length} pieces to play with`;
    document.getElementById('outfit-bar').innerHTML=outfitBar(state);
    document.getElementById('dress-notice').hidden=!state.outfit.dress;
    document.querySelector('.character-selector').innerHTML=swatches(state)+btn('characters','Meet the muses','character-more');
  }
  root.MuseUI={characters,lookDetail,render,updateDressing,header,icon,btn,escape,avatar,thumbnail,settings,swatches,demoOutfit};
})(globalThis);
