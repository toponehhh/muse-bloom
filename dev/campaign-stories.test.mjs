import assert from 'node:assert/strict';
import {test} from 'node:test';
import {D,G,campaignOptions,campaignStorageKeys,canEnterChallenge,loadCampaign,persistCampaign,enterChallenge,submitChallenge,outfitFromItems,SAVE_KEY,LOOK_KEY} from '../demos/style-lab/src/campaign-state.mjs';
const available=state=>D.themes.filter(t=>canEnterChallenge(state,t.index)).map(t=>t.index);
const qa=campaignOptions('?qa=1');
function storage(){const values=new Map();return {values,getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};}

test('QA stories remain selectable with no completed challenges, including repeated switches',()=>{
  const state=loadCampaign(undefined,qa);assert.equal(G.nextLevel(state.save),1);
  assert.equal(available(state).length,36);
  for(const level of [2,36,1,2]){assert.notEqual(enterChallenge(state,level),null);assert.equal(state.level,level);}
  assert.deepEqual(state.save.levels,{});assert.equal(state.save.streak,0);
  for(const level of [0,37,1.5,'2',NaN]){assert.equal(canEnterChallenge(state,level),false);assert.equal(enterChallenge(state,level),null);}
});

test('QA results and lookbook survive out-of-order play without changing player saves',()=>{
  const store=storage(),regular=loadCampaign(store);persistCampaign(store,regular);
  store.setItem(LOOK_KEY,'regular-pictures');store.setItem(G.SAVE_KEY,JSON.stringify(G.newSave()));
  const before=new Map(store.values),state=loadCampaign(store,qa);
  enterChallenge(state,2);const solution=G.solveTheme(D.themes[1],D.items.filter(i=>state.save.unlockedItems.includes(i.id)));
  assert.ok(solution.score>=35);state.outfit=outfitFromItems(solution.items);
  const result=submitChallenge(state);assert.equal(result.result.score,solution.score);assert.equal(G.nextLevel(state.save),1);
  assert.equal(Object.keys(state.save.levels).length,1);assert.equal(persistCampaign(store,state),true);
  const restored=loadCampaign(store,qa);assert.equal(restored.level,2);assert.deepEqual(restored.outfit,state.outfit);
  assert.equal(G.savedLooks(restored.save)[0].level,2);assert.equal(available(restored).length,36);
  for(const [key,value]of before)assert.equal(store.getItem(key),value,'QA must not change '+key);
  const normal=loadCampaign(store);assert.equal(normal.level,1);assert.deepEqual(available(normal),[1]);
});

test('QA opt-out tests real progression in another save; stored flags cannot enable a bypass',()=>{
  const store=storage(),normalQa=campaignOptions('?qa=1&progression=normal');
  const state=loadCampaign(store,normalQa);assert.deepEqual(available(state),[1]);assert.equal(enterChallenge(state,2),null);
  persistCampaign(store,state);assert.notEqual(campaignStorageKeys(qa).save,campaignStorageKeys(normalQa).save);
  store.setItem(SAVE_KEY,JSON.stringify({...state,qa:true,allStories:true,level:36}));
  assert.deepEqual(available(loadCampaign(store)),[1]);
  for(const query of ['', '?qa=0','?progression=all','?qa=true'])assert.equal(campaignOptions(query).allStories,false);
});

test('Unreadable, stale and absent QA saves cannot lock the story picker',()=>{
  const store=storage(),key=campaignStorageKeys(qa).save;
  for(const raw of ['{bad json','null',JSON.stringify({schema:1,level:1}),JSON.stringify({schema:2,level:99,save:G.newSave(),outfit:{}})]){
    store.setItem(key,raw);const state=loadCampaign(store,qa);assert.equal(state.level,1);assert.equal(available(state).length,36);
    assert.notEqual(enterChallenge(state,2),null);
  }
  const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
  const state=loadCampaign(blocked,qa);assert.equal(available(state).length,36);assert.notEqual(enterChallenge(state,2),null);
  assert.equal(persistCampaign(blocked,state),false);
});

test('Normal saves retain sequential sanitization and locked-level scoring protection',()=>{
  const raw=G.newSave();raw.levels[D.themes[1].id]={best:94,rank:'S'};
  const normal=G.sanitizeSave(raw);assert.deepEqual(normal.levels,{});assert.equal(G.canPlay(normal,2),false);
  assert.throws(()=>G.finishLevel(normal,2,{}),/locked/);assert.equal(G.enterLevel(normal,2).allowed,false);
});
