import assert from 'node:assert/strict';
import {test} from 'node:test';
import {D,G,E,loadCampaign,persistCampaign,chooseItem,enterChallenge,submitChallenge,outfitFromItems,starterOutfit,SAVE_KEY} from '../demos/style-lab/src/campaign-state.mjs';
test('The complete campaign reuses every original level, item and score rule',()=>{
  assert.equal(D.themes.length,36);assert.equal(D.chapters.length,6);assert.equal(D.items.length,122);
  const state=loadCampaign();
  for(const theme of D.themes){
    assert.ok(enterChallenge(state,theme.index));
    const available=D.items.filter(i=>state.save.unlockedItems.includes(i.id)&&i.unlockType!=='streak');
    const solution=G.solveTheme(theme,available);assert.ok(solution.score>=85,theme.name);
    state.outfit=outfitFromItems(solution.items);
    const outcome=submitChallenge(state);assert.equal(outcome.result.score,solution.score);assert.equal(outcome.result.rank,'S');
    assert.equal(E.goals(theme,G.equippedItems(state.outfit)).every(g=>g.done),true);
    const roundtrip=G.sanitizeSave(state.save);assert.equal(roundtrip.levels[theme.id].best,solution.score);
    state.save=roundtrip;
  }
  assert.equal(G.savedLooks(state.save).length,36);assert.equal(D.themes.every(t=>state.save.levels[t.id].rank==='S'),true);
});
test('Locks, repeat selections, complete bases, save migration and unavailable storage remain safe',()=>{
  const state=loadCampaign();assert.equal(enterChallenge(state,2),null);
  assert.equal(chooseItem(state,D.items.find(i=>!state.save.unlockedItems.includes(i.id)).id),false);
  const initial=structuredClone(state.outfit);chooseItem(state,initial.top);assert.deepEqual(state.outfit,initial);
  chooseItem(state,'dress_cute_01');assert.equal(state.outfit.top,null);chooseItem(state,'top_casual_01');assert.equal(state.outfit.dress,null);assert.ok(state.outfit.bottom);
  assert.equal(persistCampaign(undefined,state),false);
  const saved=new Map(),storage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  persistCampaign(storage,state);const restored=loadCampaign(storage);assert.deepEqual(restored.outfit,state.outfit);
  saved.set(SAVE_KEY,JSON.stringify({schema:2,save:state.save,level:99,outfit:{top:'unknown'}}));assert.equal(loadCampaign(storage).level,1);assert.deepEqual(loadCampaign(storage).outfit,starterOutfit());
  saved.delete(SAVE_KEY);saved.set(G.SAVE_KEY,JSON.stringify(state.save));assert.equal(loadCampaign(storage).migrated,true);assert.equal(saved.has(G.SAVE_KEY),true);
});
