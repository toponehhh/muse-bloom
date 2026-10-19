(function(root){
  'use strict';
  const params=new URLSearchParams(root.location.search),active=params.get('playtest')==='1';
  const key='muse_bloom_playtest_v17',saveKey=key+'_save';
  let record=null;
  if(active){
    try{if(params.get('fresh')==='1'){localStorage.removeItem(key);localStorage.removeItem(saveKey);}
      record=JSON.parse(localStorage.getItem(key)||'null');}catch{}
    if(!record||record.version!=='1.7.0')record={version:'1.7.0',source:params.get('qa')==='1'?'automated-check':'participant-session',participant:'P-'+Math.random().toString(36).slice(2,8).toUpperCase(),startedAt:new Date().toISOString(),events:[],feedback:null};
    if(params.has('fresh'))try{const clean=new URL(root.location.href);clean.searchParams.delete('fresh');history.replaceState(null,'',clean);}catch{}
  }
  const persist=()=>{if(active)try{localStorage.setItem(key,JSON.stringify(record));}catch{}};
  const event=(action,data={})=>{
    if(!active)return;
    record.events.push({at:new Date().toISOString(),action,...data});
    if(record.events.length>2000)record.events.splice(0,record.events.length-2000);
    persist();
  };
  const choice=(name,label)=>'<label>'+label+'<select name="'+name+'" required><option value="">Choose one</option><option value="1">1 — Not at all</option><option value="2">2 — A little</option><option value="3">3 — Somewhat</option><option value="4">4 — Mostly</option><option value="5">5 — Very much</option></select></label>';
  function form(){
    return '<div class="dialog-head"><div><span class="eyebrow">PRIVATE PLAYTEST / '+record.participant+'</span><h2 id="dialog-title">How did it feel?</h2></div>'+
      '<button class="icon-button" data-action="close" aria-label="Close feedback">×</button></div><form class="feedback-form" id="playtest-feedback">'+
      choice('clarity','I knew what to do next')+choice('visuals','The character and outfits looked like they belonged together')+
      choice('enjoyment','I enjoyed creating different looks')+
      '<label>Would you choose to play another challenge?<select name="continue" required><option value="">Choose one</option><option>Yes</option><option>Maybe</option><option>No</option></select></label>'+
      '<label>What was confusing or frustrating?<textarea name="friction" maxlength="2000" placeholder="Optional. Please do not include personal information."></textarea></label>'+
      '<label>What did you like most?<textarea name="favorite" maxlength="2000"></textarea></label>'+
      '<p class="form-note">This downloads a JSON file with your answers and in-game actions. Nothing is sent automatically. Share the file with the organizer only if you want to.</p>'+
      '<button class="button primary" type="submit">Download my feedback</button></form>';
  }
  function download(){
    const content=JSON.stringify({...record,exportedAt:new Date().toISOString()},null,2);
    const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='Muse-Bloom-'+record.participant+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  if(active){
    event('session-open',{viewport:{width:innerWidth,height:innerHeight},reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
    document.addEventListener('visibilitychange',()=>event(document.hidden?'hidden':'visible'));
    document.addEventListener('submit',e=>{
      if(e.target.id!=='playtest-feedback')return;
      e.preventDefault();if(!e.target.reportValidity())return;
      record.feedback=Object.fromEntries(new FormData(e.target));event('feedback-export');download();
      document.getElementById('feedback-confirmation')?.remove();
      const note=document.createElement('p');note.id='feedback-confirmation';note.className='form-note';note.setAttribute('role','status');
      note.textContent='Your feedback file was prepared. Please check your downloads.';e.target.append(note);
    });
  }
  root.MusePlaytest={active,saveKey,event,form,snapshot:()=>active?JSON.parse(JSON.stringify(record)):null};
})(globalThis);
