import D from '../../../js/data.js';
import G from '../../../js/game.js';
import E from '../../../js/edit.js';
export {D,G,E};
export const SAVE_KEY='muse-style-room-campaign-v2';
export const LOOK_KEY='muse-style-room-campaign-pictures-v2';
export function campaignOptions(search='') {
  const params=new URLSearchParams(search),qa=params.get('qa')==='1';
  return {qa,allStories:qa&&params.get('progression')!=='normal'};
}
export function campaignStorageKeys({qa=false,allStories=true}={}) {
  const suffix=qa?(allStories?'-qa-stories-v1':'-qa-progression-v1'):'';
  return {save:SAVE_KEY+suffix,looks:LOOK_KEY+suffix};
}
export function canEnterChallenge(state,index){return G.canPlay(state.save,index,{allStories:state.qa===true&&state.allStories===true});}
export const starterOutfit=()=>({hair:null,top:'top_casual_01',bottom:'bottom_casual_01',dress:null,shoes:'shoes_casual_01',accessory:[]});
export function loadCampaign(storage,options={}) {
  const qa=options.qa===true,allStories=qa&&options.allStories!==false;
  const fallback={schema:2,save:G.newSave(),level:1,outfit:starterOutfit(),sound:false,paused:false,qa,allStories};
  try {
    const raw=JSON.parse(storage.getItem(campaignStorageKeys(fallback).save));
    if(raw?.schema===2){
      const save=G.sanitizeSave(raw.save,{allStories}),level=G.canPlay(save,raw.level,{allStories})?raw.level:G.nextLevel(save);
      const entered=G.enterLevel(save,level,{allStories}).save;
      return {...fallback,save:entered,level,outfit:completeOutfit(G.normalizeOutfit(raw.outfit,entered.unlockedItems)),sound:raw.sound===true,paused:raw.paused===true};
    }
    // Migrate the original 36-level save only when it exists on this origin.
    // Reading never erases or overwrites the classic save or the three-mood demo.
    const classic=qa?null:JSON.parse(storage.getItem(G.SAVE_KEY));
    if(classic?.version===1){const save=G.sanitizeSave(classic);return {...fallback,save,level:G.nextLevel(save),sound:!save.muted,migrated:true};}
  } catch {}
  return fallback;
}
export function persistCampaign(storage,state){
  try{storage.setItem(campaignStorageKeys(state).save,JSON.stringify({schema:2,save:state.save,level:state.level,outfit:state.outfit,sound:state.sound,paused:state.paused}));return true;}catch{return false;}
}
export function completeOutfit(outfit){
  if(!outfit.dress){outfit.top||='top_casual_01';outfit.bottom||='bottom_casual_01';}
  outfit.shoes||='shoes_casual_01';return outfit;
}
export function chooseItem(state,id){
  const item=G.byId[id];if(!item||!state.save.unlockedItems.includes(id))return false;
  // Tapping a selected garment keeps the base outfit. Optional details toggle.
  if(item.category!=='hair'&&item.category!=='accessory'&&state.outfit[item.category]===id)return false;
  state.outfit=completeOutfit(G.toggleItem(state.outfit,id,state.save.unlockedItems));return true;
}
export function enterChallenge(state,index){
  const entered=G.enterLevel(state.save,index,{allStories:state.qa===true&&state.allStories===true});if(!entered.allowed)return null;
  state.save=entered.save;state.level=index;return entered.fresh;
}
export function submitChallenge(state){
  const result=G.finishLevel(state.save,state.level,state.outfit,{allStories:state.qa===true&&state.allStories===true});state.save=result.save;return result;
}
export function outfitFromItems(items){
  const outfit=G.emptyOutfit();for(const item of items){if(item.category==='accessory')outfit.accessory.push(item.id);else outfit[item.category]=item.id;}return completeOutfit(outfit);
}
