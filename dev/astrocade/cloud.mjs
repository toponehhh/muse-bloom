import D from '../../js/data.js';
import G from '../../js/game.js';

const KEY='muse-style-room-campaign-v2';
const clone=value=>JSON.parse(JSON.stringify(value));
const mapIds={ivory_tee:'top_casual_01',rose_cardigan:'top_cozy_02',sky_blue_blouse:'top_preppy_03',straight_leg_jeans:'bottom_casual_01',sage_shorts:'bottom_summer_04',ivory_pleated_skirt:'bottom_cute_02',floral_sundress:'dress_romantic_03',lavender_occasion_dress:'dress_elegant_02',white_sneakers:'shoes_casual_01',mary_janes:'shoes_cute_02',caramel_handbag:'accessory_casual_01',gold_hair_clip:'hair_casual_01'};
export function migrateLegacy(saved){
  if(!saved||typeof saved!=='object'||!Array.isArray(saved.lookbook)&&!saved.equipped)return null;
  const outfit=old=>{const o={hair:null,top:'top_casual_01',bottom:'bottom_casual_01',dress:null,shoes:'shoes_casual_01',accessory:[]};for(const id of [old?.top,old?.bottom,old?.dress,old?.shoes,...(Array.isArray(old?.extras)?old.extras:[])]){const item=G.byId[mapIds[id]];if(!item)continue;if(item.category==='accessory')o.accessory.push(item.id);else o[item.category]=item.id;}if(o.dress){o.top=null;o.bottom=null;}return o;};
  let save=G.newSave();
  for(let i=0;i<3;i++){const old=saved.lookbook?.[i];if(!old||Number(old.score)<40||!old.outfit||!G.canPlay(save,i+1))break;save=G.finishLevel(save,i+1,outfit(old.outfit)).save;}
  const requested=(Number.isInteger(saved.currentOccasionIndex)?saved.currentOccasionIndex:0)+1;
  return {schema:2,save,level:G.canPlay(save,requested)?requested:G.nextLevel(save),outfit:outfit(saved.equipped),sound:saved.soundEnabled===true,paused:false};
}

export class CloudProgress{
  constructor(mode){
    this.mode=mode;this.base={};this.values={};this.readyToSave=mode!=='play';this.dirty=false;this.started=false;this.suppressed=false;this.written=false;this.revision=0;this.token=0;this.latest=null;this.pending=null;this.running=false;this.failure=false;this.remote=null;
    this.storage={getItem:key=>this.values[key]??null,setItem:(key,value)=>this.setItem(key,value)};
    this.brand=document.querySelector('#cloud-status');this.subtitle=this.brand.querySelector('small');this.gate=document.querySelector('#cloud-gate');this.dialog=document.querySelector('#cloud-recovery');
    this.brand.addEventListener('click',()=>{this.renderActions();this.dialog.showModal();});
    document.querySelector('#cloud-close').addEventListener('click',()=>this.dialog.close());
    for(const id of ['cloud-retry-load','cloud-gate-retry'])document.querySelector('#'+id).addEventListener('click',()=>this.load());
    document.querySelector('#cloud-continue').addEventListener('click',()=>{this.readyToSave=false;this.finishStart();this.status('Not saved · tap','Saved progress could not be checked. You can style now; choose Keep my changes before replacing cloud progress.');});
    document.querySelector('#cloud-keep').addEventListener('click',()=>{this.token++;if(this.remote)this.base=clone(this.remote);this.remote=null;this.readyToSave=true;this.failure=false;this.dirty=true;this.queue();this.dialog.close();});
    document.querySelector('#cloud-use').addEventListener('click',()=>{if(!this.remote)return;this.token++;this.seed(this.remote);this.remote=null;this.pending=null;this.dirty=false;this.readyToSave=true;this.failure=false;this.suppressed=true;try{this.apply?.();}finally{this.suppressed=false;}this.status('Saved','Your cloud progress is ready.');this.dialog.close();});
    document.querySelector('#cloud-retry-save').addEventListener('click',()=>{this.failure=false;this.queue();this.dialog.close();});
  }
  status(short,message){this.subtitle.textContent=short;this.brand.dataset.unsaved=String(!this.readyToSave||this.failure);document.querySelector('#cloud-message').textContent=message;this.renderActions();}
  renderActions(){document.querySelector('#cloud-retry-load').hidden=this.readyToSave;document.querySelector('#cloud-keep').hidden=this.readyToSave;document.querySelector('#cloud-use').hidden=this.readyToSave||!this.remote;document.querySelector('#cloud-retry-save').hidden=!this.readyToSave||!this.failure;}
  seed(saved){
    this.base=saved&&typeof saved==='object'&&!Array.isArray(saved)?clone(saved):{};this.values={};
    const raw=this.base.museStyleStories?.storage;
    if(raw&&typeof raw==='object')for(const [key,value]of Object.entries(raw))if(key===KEY&&typeof value==='string'&&value.length<300000)this.values[key]=value;
    if(!this.values[KEY]){const migrated=migrateLegacy(this.base);if(migrated)this.values[KEY]=JSON.stringify(migrated);}
  }
  finishStart(){this.started=true;this.gate.hidden=true;this.resolveStart?.();this.resolveStart=null;}
  start(){if(this.mode!=='play'){this.finishStart();this.status('Editor preview','Player progress is not saved in the editor.');return Promise.resolve();}return new Promise(resolve=>{this.resolveStart=resolve;this.load();});}
  load(){
    const token=++this.token;this.status('Loading…','Checking your saved wardrobe…');this.readyToSave=false;
    document.querySelector('#cloud-gate-retry').hidden=true;document.querySelector('#cloud-continue').hidden=true;document.querySelector('#cloud-gate-message').textContent='Checking your saved wardrobe…';if(!this.started)this.gate.hidden=false;
    const timeout=setTimeout(()=>{if(token!==this.token)return;this.status('Not saved · tap','Loading is taking longer than usual. Retry loading or explicitly keep your local changes.');document.querySelector('#cloud-gate-message').textContent='Saved progress is taking longer than usual. Retry, or continue styling while keeping your cloud save protected.';document.querySelector('#cloud-gate-retry').hidden=false;document.querySelector('#cloud-continue').hidden=false;},7000);
    Promise.resolve().then(()=>lib.getUserGameState()).then(result=>{
      if(token!==this.token)return;if(result?.success===false)throw Error('Load was not accepted');clearTimeout(timeout);const saved=result?.state&&typeof result.state==='object'?result.state:null;
      if(this.started&&this.dirty&&saved){this.remote=saved;this.status('Choose progress','A cloud save arrived after you started styling. Choose the cloud progress or keep your changes.');return;}
      if(this.started&&this.dirty&&!saved){this.readyToSave=true;this.failure=false;this.queue();return;}
      this.seed(saved);this.readyToSave=true;this.failure=false;this.dirty=false;this.suppressed=true;try{this.apply?.();}finally{this.suppressed=false;}
      this.status(this.mode==='play'?'Saved':'Editor preview','Your wardrobe is ready.');this.finishStart();
    }).catch(()=>{if(token!==this.token)return;clearTimeout(timeout);this.status('Not saved · tap','Saved progress could not load. Retry, or explicitly keep local changes.');document.querySelector('#cloud-gate-message').textContent='Saved progress could not load. Retry, or continue styling while keeping your cloud save protected.';document.querySelector('#cloud-gate-retry').hidden=false;document.querySelector('#cloud-continue').hidden=false;});
  }
  setApply(apply){this.apply=apply;if(this.readyToSave&&!this.dirty){this.suppressed=true;try{apply();}finally{this.suppressed=false;}}}
  setItem(key,value){
    if(key!==KEY)return;this.values[key]=String(value);if(this.suppressed)return;if(!this.written){this.written=true;return;}
    if(this.mode!=='play')return;this.dirty=true;this.revision++;this.latest=this.snapshot();this.pending={revision:this.revision,state:this.latest};
    if(!this.readyToSave){this.status('Not saved · tap','Cloud progress is protected while loading is unresolved. Retry loading or keep your changes.');return;}
    if(this.failure){this.status('Not saved · tap','Your latest changes are kept for this visit. Tap Retry save to sync them.');return;}
    this.status('Saving…','Saving your latest wardrobe…');this.pump();
  }
  snapshot(){return {...clone(this.base),museStyleStories:{schema:1,release:'2.0.4',storage:clone(this.values)}};}
  queue(){this.revision++;this.latest=this.snapshot();this.pending={revision:this.revision,state:this.latest};this.status('Saving…','Saving your latest wardrobe…');this.pump();}
  async pump(){
    if(this.running||!this.readyToSave||this.mode!=='play'||!this.pending)return;this.running=true;
    try{while(this.pending&&this.readyToSave){
      const attempt=this.pending;this.pending=null;let timedOut=false,timer;
      const promise=Promise.resolve().then(()=>lib.saveUserGameState(attempt.state));
      promise.then(response=>{if(response?.success===false||!timedOut)return;if(attempt.revision<this.revision){this.pending={revision:this.revision,state:this.latest};this.status('Saving…','A delayed save finished; syncing the newest wardrobe…');setTimeout(()=>this.pump(),0);}else if(attempt.revision===this.revision){this.pending=null;this.failure=false;this.status('Saved','Your latest wardrobe is saved.');}},()=>{if(timedOut&&attempt.revision<this.revision){this.pending={revision:this.revision,state:this.latest};setTimeout(()=>this.pump(),0);}});
      try{const result=await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>{timedOut=true;reject(Error('Save timed out'));},7000);})]);clearTimeout(timer);if(result?.success===false)throw Error('Save was not accepted');if(attempt.revision<this.revision&&!this.pending)this.pending={revision:this.revision,state:this.latest};if(!this.pending){this.failure=false;this.status('Saved','Your latest wardrobe is saved.');}}
      catch{clearTimeout(timer);this.failure=true;this.pending={revision:this.revision,state:this.latest};this.status('Not saved · tap','Your latest changes are kept for this visit. Tap Retry save when ready.');break;}
    }}finally{this.running=false;if(this.pending&&this.readyToSave&&!this.failure)this.pump();}
  }
}
