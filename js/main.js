(function (root) {
  'use strict';
  const D=root.MuseData,G=root.MuseGame,U=root.MuseUI,S=root.MuseAudio;
  const storage=G.createStorage(()=>root.localStorage);
  const state={save:storage.load(),storage,screen:'home',previousScreen:'home',level:1,chapter:1,category:'top',outfit:G.emptyOutfit(),showLocked:false,result:null,shareCard:null};
  const dialog=document.getElementById('dialog');
  let toastTimer,raf=0,shareEpoch=0,dialogFocus=null;
  function toast(message) { const el=document.getElementById('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3800); }
  function persist() { if(!storage.save(state.save)) toast(storage.notice); }
  function render(focus=true) {
    cancelAnimationFrame(raf);U.render(state);root.MuseFX.enter();
    if(focus) { const heading=document.querySelector('main h1,main h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});} }
  }
  function navigate(screen) { closeDialog();clearTimeout(toastTimer);document.getElementById('toast').classList.remove('visible');state.screen=screen;render(); }
  function openDialog(html) { dialogFocus=document.activeElement;dialog.innerHTML=html;if(!dialog.open)dialog.showModal();document.body.classList.add('modal-open'); }
  function closeDialog() { shareEpoch++;if(dialog.open)dialog.close();document.body.classList.remove('modal-open'); }
  dialog.addEventListener('close',()=>{shareEpoch++;document.body.classList.remove('modal-open');if(dialogFocus?.isConnected)dialogFocus.focus();});
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
  function startLevel(index,retry=false) {
    const entry=G.enterLevel(state.save,index);if(!entry.allowed)return;
    state.save=entry.save;state.level=index;state.chapter=D.themes[index-1].chapter;state.result=null;state.shareCard=null;
    if(!retry && !G.equippedItems(state.outfit).length) {
      for(const c of ['hair','top','bottom','shoes']) state.outfit[c]=D.items.find(i=>i.category===c&&state.save.unlockedItems.includes(i.id)).id;
    }
    state.outfit=G.normalizeOutfit(state.outfit,state.save.unlockedItems);
    state.category=state.outfit.dress?'dress':'top';persist();navigate('dressing');
    if(entry.fresh.length) { S.play('unlock');toast(`${entry.fresh.length} fresh pieces unlocked. Your new chapter is here!`); }
  }
  function animateScore() {
    const node=document.getElementById('score-number');if(!node)return;
    const target=state.result.result.score;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let elapsed=0,last=performance.now();node.textContent='0';
    function tick(now) { if(!node.isConnected)return;if(!document.hidden)elapsed+=Math.min(now-last,50);last=now;const p=Math.min(1,elapsed/850);node.textContent=Math.round(target*(1-Math.pow(1-p,3)));if(p<1)raf=requestAnimationFrame(tick); }
    raf=requestAnimationFrame(tick);
  }
  async function share(look=null) {
    if(!look&&(state.screen!=='result'||!['S','A'].includes(state.result.result.rank)))return;
    S.play('shutter');root.MuseFX.shutter();
    const theme=D.themes[(look?.level||state.level)-1],outfit=look?.outfit||state.outfit,skin=look?.skin||state.save.skin;
    const result=look?G.scoreBreakdown(theme,G.equippedItems(outfit)):state.result.result;
    openDialog(`<div class="dialog-head"><h2 id="dialog-title">A portrait of your style</h2>${U.btn('close',U.icon('close'),'icon-button','aria-label="Close look card"')}</div><p class="share-loading">Preparing your portrait…</p>`);
    const token=++shareEpoch;
    try {
      const data=(!look&&state.shareCard)||await root.MuseShare.makeCard(theme,outfit,skin,result);
      if(token!==shareEpoch||!dialog.open)return;
      if(!look)state.shareCard=data;
      dialog.innerHTML=`<div class="dialog-head"><h2 id="dialog-title">A portrait of your style</h2>${U.btn('close',U.icon('close'),'icon-button','aria-label="Close look card"')}</div><img class="share-image" src="${data}" alt="Your Muse Bloom outfit card"><a class="button primary download-button" download="muse-bloom-${theme.id}.png" href="${data}">${U.icon('download')} Save image</a><p class="share-help">If download is blocked, long-press or right-click the image to save it.</p>`;
    } catch(error) { if(token===shareEpoch&&dialog.open)dialog.innerHTML=`<h2 id="dialog-title">Let’s try that again</h2><p>${U.escape(error.message)}</p>${U.btn(look?'export-look':'share','Try again','button primary',look?`data-level="${look.level}"`:'')}${U.btn('close','Back to your look','button secondary')}`; }
  }
  function refreshHeader(){document.querySelector('.app-header').outerHTML=U.header(state);}
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-action]');if(!button||button.disabled)return;
    const action=button.dataset.action;
    if(!['mute','equip','score','share','export-look','clear','preview-sound'].includes(action))S.play(action==='category'?'tab':'click');
    switch(action) {
      case 'home':navigate('home');break;
      case 'play':startLevel(G.nextLevel(state.save));break;
      case 'map':state.chapter=D.themes[(state.screen==='home'?G.nextLevel(state.save):state.level)-1].chapter;navigate('map');break;
      case 'chapter':state.chapter=Number(button.dataset.chapter);render();break;
      case 'level':startLevel(Number(button.dataset.level));break;
      case 'next':if(state.screen==='result'&&state.result.result.score>=35)startLevel(Math.min(36,state.level+1));break;
      case 'retry':startLevel(state.level,true);break;
      case 'category':state.category=button.dataset.category;if(state.screen==='dressing'){U.updateDressing(state);document.getElementById('item-grid').scrollTop=0;document.querySelector(`[data-category="${state.category}"]`)?.focus();}else render(false);break;
      case 'equip': {
        if(state.screen!=='dressing')break;
        const id=button.dataset.item,item=G.byId[id];
        if(!state.save.unlockedItems.includes(id)){toast(item.unlockType==='streak'?'Earn S on 3 different challenges in a row to unlock this piece.':`${item.unlockOn==='enter'?'Enter':'Pass'} look ${item.unlockLevel} to unlock ${item.name}.`);break;}
        const was=G.equippedItems(state.outfit).some(i=>i.id===id);
        state.outfit=G.toggleItem(state.outfit,id,state.save.unlockedItems);
        S.play(was?'unequip':'equip');U.updateDressing(state,true);root.MuseFX.equip();break;
      }
      case 'clear':if(state.screen==='dressing'){state.outfit=G.emptyOutfit();U.updateDressing(state);root.MuseFX.equip();S.play('clear');toast('Studio basics restored. Add your own pieces to earn points.');}break;
      case 'score': {
        if(state.screen!=='dressing')break;
        state.result=G.finishLevel(state.save,state.level,state.outfit);state.save=state.result.save;state.outfit=state.result.outfit;state.shareCard=null;persist();navigate('result');animateScore();root.MuseFX.reveal();S.play(state.result.result.rank==='S'?'rankS':'rankLow');break;
      }
      case 'mute':state.save.muted=!state.save.muted;S.setMuted(state.save.muted);if(!state.save.muted)S.play('click');persist();refreshHeader();if(dialog.open){dialog.innerHTML=U.settings(state);dialog.querySelector('[data-action="mute"]')?.focus();}break;
      case 'skin':state.save.skin=button.dataset.skin;state.shareCard=null;persist();if(state.screen==='dressing')U.updateDressing(state);else render(false);if(dialog.open){dialog.innerHTML=U.settings(state);dialog.querySelector(`[data-skin="${state.save.skin}"]`)?.focus();}break;
      case 'settings':openDialog(U.settings(state));break;
      case 'preview-sound':S.play('equip');break;
      case 'close':closeDialog();break;
      case 'share':share();break;
      case 'collection':case 'lookbook':if(!['collection','lookbook'].includes(state.screen))state.previousScreen=state.screen;if(action==='collection')state.category='hair';navigate(action);break;
      case 'view-look':case 'wear-look':case 'export-look': {
        const look=G.savedLooks(state.save).find(l=>l.level===Number(button.dataset.level));if(!look)break;
        if(action==='view-look')openDialog(U.lookDetail(look));
        else if(action==='export-look')share(look);
        else {state.outfit=G.normalizeOutfit(look.outfit,state.save.unlockedItems);state.save.skin=look.skin;startLevel(look.level,true);}
        break;
      }
      case 'return':navigate(state.previousScreen);break;
      case 'inspect': {
        const item=G.byId[button.dataset.item],owned=state.save.unlockedItems.includes(item.id);
        openDialog(`<div class="dialog-head"><h2 id="dialog-title">${item.name}</h2>${U.btn('close',U.icon('close'),'icon-button','aria-label="Close item details"')}</div><div class="inspect-art">${U.thumbnail(item)}</div><p class="inspect-tags">${item.tags.join(' · ')}</p><p>${owned?'In your wardrobe. Ready for your next look.':item.unlockType==='streak'?'Keep earning S on different challenges in a row. Secret pieces unlock every three S looks.':`${item.unlockOn==='enter'?'Enter':'Pass'} look ${item.unlockLevel}: ${D.themes[item.unlockLevel-1].name}.`}</p>`);break;
      }
      case 'reset-progress':openDialog(`<h2 id="dialog-title">Start a new story?</h2><p>This clears your scores, lookbook, clothing unlocks and streak in this browser.</p><div class="confirm-actions">${U.btn('close','Keep my story','button primary')}${U.btn('confirm-reset','Start again','button secondary')}</div>`);break;
      case 'confirm-reset':state.save=G.newSave();state.outfit=G.emptyOutfit();state.result=null;state.level=1;state.chapter=1;S.setMuted(false);persist();navigate('home');toast('A brand-new style story. Make it yours.');break;
    }
  });
  document.addEventListener('change',e=>{if(e.target.id==='show-locked'){state.showLocked=e.target.checked;U.updateDressing(state);}});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!dialog.open&&state.screen==='dressing'){state.chapter=D.themes[state.level-1].chapter;navigate('map');}
    if(['ArrowLeft','ArrowRight'].includes(e.key)&&e.target.closest('.category-tabs,.chapter-tabs')) {
      const buttons=[...e.target.parentElement.querySelectorAll('button:not(:disabled)')],i=buttons.indexOf(e.target);
      if(i>=0){e.preventDefault();const b=buttons[(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length];b.click();document.querySelector(`[data-${b.dataset.category?'category':'chapter'}="${b.dataset.category||b.dataset.chapter}"]`)?.focus();}
    }
  });
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('is-hidden',document.hidden));
  S.setMuted(state.save.muted);state.chapter=D.themes[G.nextLevel(state.save)-1].chapter;render(false);
  if(storage.notice)toast(storage.notice);else persist();
  // Read-only data/logic globals are also used by the dependency-free QA harness.
})(globalThis);
