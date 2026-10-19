(function(root){
  'use strict';
  const D=root.MuseData,G=root.MuseGame,E=root.MuseEdit,U=root.MuseUI;
  const oldRender=U.render,oldSettings=U.settings;
  const b=U.btn,i=U.icon,esc=U.escape;
  const brief=state=>E.brief(state.level);
  const title=state=>brief(state)?.title||D.themes[state.level-1].name;
  const currentCharacter=state=>D.characters.find(c=>c.id===state.save.character)||D.characters[0];
  const room=()=>'<img class="room-backdrop" src="'+root.MuseAssets['assets/scenes/bedroom.webp']+'" alt="" draggable="false">';
  function demo(){
    return {hair:'hair_casual_01',top:'top_cozy_02',bottom:'bottom_casual_01',dress:null,
      shoes:'shoes_casual_01',accessory:['accessory_casual_01']};
  }
  function header(state){
    return '<header class="app-header salon-header">'+b('home','<span class="bloom-mark">✦</span><span>Muse <i>Bloom</i></span>','brand','aria-label="Muse Bloom home"')+
      '<nav class="studio-nav" aria-label="Studio navigation">'+b('studio','Style studio','nav-link'+(['dressing','reveal'].includes(state.screen)?' active':''))+
      b('nav-map','Challenges','nav-link'+(state.screen==='map'?' active':''))+'</nav><div class="header-right">'+
      (root.MusePlaytest.active?b('feedback','Feedback','text-button playtest-feedback'):'')+
      b('lookbook',i('grid')+'<span>Lookbook</span>','lookbook-link','aria-label="Open your lookbook"')+
      b('mute',i(state.save.muted?'mute':'sound'),'icon-button','aria-label="'+(state.save.muted?'Unmute':'Mute')+' sound" aria-pressed="'+state.save.muted+'"')+
      b('settings',i('settings'),'icon-button','aria-label="Settings"')+'</div></header>';
  }
  function stage(state,cls='',outfit=state.outfit){
    return '<div class="fitting-stage '+cls+'" data-mood="'+(brief(state)?.scene||'morning')+'">'+room()+
      '<div class="room-light"></div><div class="avatar-shadow"></div><div id="avatar-slot">'+U.avatar(outfit,state.save.character)+'</div>'+
      '<div class="ambient-glint glint-one" aria-hidden="true">✧</div><div class="ambient-glint glint-two" aria-hidden="true">✦</div></div>';
  }
  function home(state){
    const played=Object.keys(state.save.levels).length>0;
    return '<main class="home-screen salon-home screen"><div class="home-copy"><span class="eyebrow">THE LITTLE MOMENTS. YOUR OWN STYLE.</span>'+
      '<h1>A fresh look.<br><em>A little more you.</em></h1><p class="home-intro">A cozy coffee date. A gallery opening. A slow weekend.<br>Find the outfit that makes each moment yours.</p>'+
      '<div class="home-actions">'+b('play',(played?'Continue your story':'Style your first look')+' '+i('arrow'),'button primary')+
      b('characters','Choose your muse','text-button')+'</div><div class="occasion-pills"><span>☕ Coffee with friends</span><span>✧ Gallery opening</span><span>✿ Flower market</span></div>'+
      '<p class="home-note">Start with the 14-piece studio edit. Explore 36 challenges as you go.</p>'+
      (root.MusePlaytest.active?'<p class="playtest-notice">'+(root.MuseFeedback.online?'Online playtest · share anonymous answers and actions only when you submit feedback.':'Private playtest · actions and feedback stay on this device until you export them.')+' Your usual game save is separate.</p>':'')+
      '</div><div class="home-look">'+stage({...state,level:1},'campaign-stage',demo())+'<div class="look-label"><span>THE EVERYDAY EDIT / 01</span><strong>Soft knits. Blue skies.</strong></div></div></main>';
  }
  function visibleItems(state){
    return D.items.filter(item=>item.category===state.category &&
      (!brief(state)||E.capsule.includes(item.id)) &&
      (state.showLocked||state.save.unlockedItems.includes(item.id)));
  }
  function tabs(state){
    return D.categories.map(c=>b('category',i(c)+'<span>'+({hair:'Details',accessory:'Bags'}[c]||D.categoryNames[c])+'</span>',
      'category-tab'+(state.category===c?' active':''),'data-category="'+c+'" aria-pressed="'+(state.category===c)+'"')).join('');
  }
  function cards(state){
    const equipped=new Set(G.equippedItems(state.outfit).map(item=>item.id));
    return visibleItems(state).map(item=>{
      const selected=equipped.has(item.id),locked=!state.save.unlockedItems.includes(item.id);
      return b(locked?'inspect':'equip','<span class="item-picture">'+U.thumbnail(item)+(selected?'<span class="selected-check">'+i('check')+'</span>':'')+
        (locked?'<span class="lock-badge">'+i('lock')+'</span>':'')+'</span><span class="item-name">'+esc(item.name)+'</span>',
        'item-card'+(selected?' selected':'')+(locked?' locked':''),'data-item="'+item.id+'" aria-label="'+esc(item.name)+(locked?', locked':'')+'" aria-pressed="'+selected+'"');
    }).join('');
  }
  function coach(state){
    const step=state.level===1?E.coach(state.outfit,state.save.onboardingDone):null;
    return step?'<div class="coach-strip" role="status"><span class="coach-number">'+step.step+'/4</span><p>'+step.text+'</p>'+
      (step.category?b('coach-next','Show me','coach-link','data-category="'+step.category+'"'):'')+
      b('skip-guide',i('close'),'coach-close','aria-label="Skip styling guide"')+'</div>':'';
  }
  function progress(state){
    const edit=E.evaluate(state.level,G.equippedItems(state.outfit));
    return edit?'<span class="goal-progress">'+edit.checks.filter(c=>c.done).length+'/3 style goals</span>':
      '<span class="goal-progress">'+G.equippedItems(state.outfit).length+' pieces styled</span>';
  }
  function outfitBar(state){
    return '<div class="outfit-status">'+progress(state)+'</div>'+b('clear',i('reset'),'icon-button','aria-label="Clear outfit"')+
      b('score','Reveal my look '+i('arrow'),'button primary','aria-label="Reveal my look"');
  }
  function dressing(state){
    const edit=brief(state),theme=D.themes[state.level-1],c=currentCharacter(state);
    return '<main class="dressing-screen screen salon-dressing"><section class="brief"><div class="brief-main">'+
      b('map',i('back'),'icon-button back-button','aria-label="Back to challenges"')+'<div><div class="eyebrow">'+
      (edit?edit.kicker+' · '+state.level+'/3':'LOOK '+state.level+' / 36')+'</div><h1>'+esc(title(state))+'</h1>'+
      '<p>'+esc(edit?.story||theme.description)+'</p></div></div><div class="brief-actions">'+
      b('style-brief','Style goals '+i('star'),'button secondary')+
      b('characters',c.name+' ▾','muse-switch','aria-label="Change character, currently '+c.name+'"')+'</div></section>'+
      '<div id="coach-slot">'+coach(state)+'</div><div class="dressing-layout"><section class="studio-column" aria-label="Fitting studio">'+stage(state)+'</section>'+
      '<section class="wardrobe-panel"><div class="wardrobe-title"><div><span class="eyebrow">'+(edit?'THE 14-PIECE STUDIO EDIT':'YOUR GROWING WARDROBE')+
      '</span><h2>Make it yours.</h2></div><span class="wardrobe-hint">Tap to try it on</span></div>'+
      '<nav class="category-tabs" aria-label="Clothing categories" id="category-tabs">'+tabs(state)+'</nav>'+
      '<div class="wardrobe-toolbar"><span id="category-count">'+visibleItems(state).length+' pieces</span>'+
      '<label '+(edit?'hidden':'')+'><input type="checkbox" id="show-locked" '+(state.showLocked?'checked':'')+'> Show locked</label>'+
      '<span class="swipe-hint">Swipe to explore →</span></div><div class="item-grid" id="item-grid">'+cards(state)+'</div>'+
      '<div id="dress-notice" class="dress-notice" '+(state.outfit.dress?'':'hidden')+'>Choose a top or bottom to switch from your dress.</div>'+
      '<footer class="wardrobe-footer" id="outfit-bar">'+outfitBar(state)+'</footer></section></div></main>';
  }
  function goals(state){
    const edit=E.evaluate(state.level,G.equippedItems(state.outfit));
    if(!edit) return '<div class="dialog-head"><h2 id="dialog-title">Your style brief</h2>'+b('close',i('close'),'icon-button','aria-label="Close style brief"')+
      '</div><p>Match these mood tags: <strong>'+D.themes[state.level-1].required.join(', ')+'</strong>.</p><p>Bonus: '+D.themes[state.level-1].bonus.join(', ')+'. Add pieces to complete your look.</p>';
    return '<div class="dialog-head"><div><span class="eyebrow">YOUR INVITATION</span><h2 id="dialog-title">'+esc(title(state))+'</h2></div>'+
      b('close',i('close'),'icon-button','aria-label="Close style brief"')+'</div><p>'+esc(brief(state).story)+'</p><ol class="style-goals">'+
      edit.checks.map(c=>'<li class="'+(c.done?'done':'')+'"><span class="goal-check">'+(c.done?'✓':'○')+'</span><div><strong>'+c.title+
      '</strong><p>'+c.hint+'</p></div><small>'+c.points+' pts</small></li>').join('')+'</ol><p>These are playful occasion goals. Your taste is always your own.</p>';
  }
  function reveal(state){
    return '<main class="reveal-screen screen"><div class="reveal-heading"><span class="eyebrow">YOUR MOMENT</span><h1>Look at you.</h1><p>'+esc(title(state))+'</p></div>'+
      stage(state,'reveal-stage')+'<div class="reveal-caption">A little confidence looks good on you.</div>'+
      b('skip-reveal','See my look '+i('arrow'),'button secondary reveal-skip')+'</main>';
  }
  function result(state){
    const r=state.result.result,edit=brief(state),passed=r.score>=35,stars=r.rank==='S'?3:r.rank==='A'?2:passed?1:0;
    const checks=r.checks||[
      {title:'The mood',hint:r.required.length+'/3 mood tags matched',done:r.required.length===3,points:r.requiredPoints},
      {title:'The extras',hint:r.bonus.length+'/2 bonus tags matched',done:r.bonus.length===2,points:r.bonusPoints},
      {title:'The finish',hint:r.units+'/6 outfit units',done:r.units===6,points:r.outfitPoints}
    ];
    return '<main class="result-screen screen salon-result"><section class="result-look"><div class="result-look-heading"><span class="eyebrow">YOUR STYLE DIARY / '+String(state.level).padStart(2,'0')+
      '</span><h2>'+esc(title(state))+'</h2></div>'+stage(state,'result-stage',state.compareBefore?(state.beforeOutfit||G.emptyOutfit()):state.outfit)+
      '<div class="comparison-controls">'+b('compare-before','Before','button '+(state.compareBefore?'primary':'secondary'),'aria-pressed="'+!!state.compareBefore+'"')+
      b('compare-after','My look','button '+(!state.compareBefore?'primary':'secondary'),'aria-pressed="'+!state.compareBefore+'"')+'</div></section>'+
      '<section class="result-copy"><span class="eyebrow">MADE BY YOU</span><h1>'+ (passed?'A moment<br><em>to remember.</em>':'One more<br><em>little detail.</em>')+'</h1>'+
      '<p class="result-story">'+(passed?(edit?.success||'Your own take on the brief.'):'Try the unfinished style goals below, then reveal your look again.')+'</p>'+
      '<div class="rating-stars" role="img" aria-label="'+stars+' of 3 style stars">'+Array.from({length:3},(_,n)=>'<span class="rating-star '+(n<stars?'earned':'')+'" aria-hidden="true">★</span>').join('')+'</div>'+
      '<div class="score-line"><span class="rank-seal rank-'+r.rank+'">'+r.rank+'<small>RANK</small></span><div class="score-number"><span id="score-number">'+r.score+'</span><span> / 94</span></div></div>'+
      '<ol class="style-goals result-goals">'+checks.map(c=>'<li class="'+(c.done?'done':'')+'"><span class="goal-check">'+(c.done?'✓':'○')+'</span><div><strong>'+c.title+'</strong><p>'+c.hint+'</p></div></li>').join('')+'</ol>'+
      (state.result.savedLook?'<p class="lookbook-saved">'+i('check')+' Saved to your lookbook</p>':'')+
      '<div class="result-actions">'+b(passed?(state.level===36?'map':'next'):'retry',passed?(edit?.next||'Next challenge'):'Try another detail','button primary')+
      (passed?b('retry','Restyle','button secondary'):'')+(['S','A'].includes(r.rank)?b('share',i('download')+' Save photo','button secondary'):'')+
      (root.MusePlaytest.active?b('feedback','Share playtest feedback','button secondary'):'')+'</div>'+
      (state.result.fresh.length?'<div class="reward-section"><span class="eyebrow">'+state.result.fresh.length+' NEW PIECES IN YOUR COLLECTION</span><div class="reward-items">'+
      state.result.fresh.map(id=>'<div>'+U.thumbnail(G.byId[id])+'<span>'+esc(G.byId[id].name)+'</span></div>').join('')+'</div>':'')+'</section></main>';
  }
  function characters(state){
    return '<div class="dialog-head"><div><span class="eyebrow">MEET YOUR MUSE</span><h2 id="dialog-title">Who is your muse?</h2></div>'+
      b('close',i('close'),'icon-button','aria-label="Close character selector"')+'</div><p>Your outfit stays with you when you change your muse.</p><div class="character-gallery">'+
      D.characters.map(c=>b('character','<div class="character-preview">'+U.avatar(G.equippedItems(state.outfit).length?state.outfit:demo(),c.id)+'</div><strong>'+c.name+'</strong><span>'+c.note+'</span>',
      'character-card'+(state.save.character===c.id?' active':''),'data-character="'+c.id+'" aria-pressed="'+(state.save.character===c.id)+'"')).join('')+'</div>';
  }
  function updateDressing(state,bounce){
    const slot=document.getElementById('avatar-slot');if(!slot)return;
    U.updateAvatar(slot,state.outfit,state.save.character,bounce);
    document.getElementById('category-tabs').innerHTML=tabs(state);
    const grid=document.getElementById('item-grid'),left=grid.scrollLeft,top=grid.scrollTop,focus=document.activeElement?.dataset.item;
    grid.innerHTML=cards(state);grid.scrollLeft=left;grid.scrollTop=top;
    if(focus)grid.querySelector('[data-item="'+focus+'"]')?.focus({preventScroll:true});
    document.getElementById('category-count').textContent=visibleItems(state).length+' pieces';
    document.getElementById('outfit-bar').innerHTML=outfitBar(state);
    document.getElementById('dress-notice').hidden=!state.outfit.dress;
    document.getElementById('coach-slot').innerHTML=coach(state);
    const c=currentCharacter(state),switcher=document.querySelector('.muse-switch');
    switcher.textContent=c.name+' ▾';switcher.setAttribute('aria-label','Change character, currently '+c.name);
  }
  U.render=state=>{
    const screen={home,dressing,reveal,result}[state.screen];
    if(screen)document.getElementById('app').innerHTML=header(state)+screen(state);
    else {oldRender(state);document.querySelector('.app-header').outerHTML=header(state);}
    document.body.dataset.screen=state.screen;
  };
  U.settings=state=>oldSettings(state).replace('The art of a good match','Your style story').replace('Match each mood tag for',
    'The first three looks use visible occasion goals: a complete outfit earns 40 points, and each of two details earns 27. Later challenges match mood tags. Match each mood tag for')+
    '<section class="setting-section">'+b('nav-map','Open challenges','button secondary')+b('lookbook','Open lookbook','button secondary')+b('collection','Open full collection','button secondary')+b('replay-guide','Replay the styling guide','text-button')+'</section>';
  Object.assign(U,{header,updateDressing,characters,styleBrief:goals,demoOutfit:demo});
})(globalThis);
