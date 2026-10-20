'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const D=require('../js/data'),G=require('../js/game'),E=require('../js/edit');
const items=ids=>ids.map(id=>G.byId[id]);
const coffee=['top_cozy_02','bottom_casual_01','shoes_casual_01','hair_casual_01'];
test('each starter occasion has an achievable 94-point look using only its painted capsule',()=>{
  for(const theme of D.themes.slice(0,3)){
    const result=G.solveTheme(theme,D.items.filter(i=>E.capsule.includes(i.id)));
    assert.equal(result.score,94,theme.name);
    assert.ok(E.evaluate(theme.index,result.items).checks.every(c=>c.done));
  }
});
test('a coffee outfit does not automatically satisfy the gallery or the market',()=>{
  assert.equal(G.scoreOutfit(D.themes[0],items(coffee)),94);
  assert.equal(G.scoreOutfit(D.themes[1],items(coffee)),40);
  assert.equal(G.scoreOutfit(D.themes[2],items(coffee)),67);
  assert.equal(G.scoreOutfit(D.themes[2],items([...coffee,'accessory_casual_01'])),94);
});
test('mood tags alone cannot pass the starter edit without a complete outfit and shoes',()=>{
  for(const theme of D.themes.slice(0,3)){
    assert.equal(G.scoreOutfit(theme,items(['hair_casual_01','accessory_casual_01'])),0);
    assert.equal(G.scoreOutfit(theme,items(['dress_cute_01','hair_casual_01'])),0);
    assert.ok(G.scoreOutfit(theme,items(['dress_cute_01','shoes_casual_01']))>=35);
  }
});
test('the guide adapts to a dress and does not require unnecessary separates or accessories',()=>{
  const outfit=G.emptyOutfit();assert.equal(E.coach(outfit,false).category,'top');
  outfit.dress='dress_cute_01';assert.equal(E.coach(outfit,false).category,'shoes');
  outfit.shoes='shoes_casual_01';assert.equal(E.coach(outfit,false).step,4);
  assert.equal(E.coach(outfit,true),null);
});
test('pre-edit looks keep their original score and outfit across repeated migrations',()=>{
  const outfit=G.emptyOutfit();outfit.top='top_casual_01';outfit.hair='hair_casual_01';
  const score=G.classicBreakdown(D.themes[0],G.equippedItems(outfit)).score;
  assert.ok(score>=35);
  const raw=G.newSave();delete raw.ruleset;delete raw.onboardingDone;
  raw.levels[D.themes[0].id]={best:score,rank:G.rankOf(score),look:{outfit,character:'bella',score}};
  const migrated=G.sanitizeSave(raw),again=G.sanitizeSave(migrated);
  assert.deepEqual(again,migrated);assert.equal(again.levels[D.themes[0].id].look.score,score);
  assert.equal(again.levels[D.themes[0].id].look.ruleset,1);
  assert.equal(again.onboardingDone,true);
});
test('playtest storage keys never overwrite the regular game save',()=>{
  const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
  const regular=G.createStorage(()=>storage),trial=G.createStorage(()=>storage,'test-only');
  const save=G.newSave();save.character='mika';regular.save(save);trial.save(G.newSave());
  assert.equal(regular.load().character,'mika');assert.equal(trial.load().character,'bella');
  assert.equal(map.size,2);
});
test('live occasion goals follow scoring, including losing a goal after removing shoes',()=>{
  const theme=D.themes[0],outfit=items(coffee);
  assert.equal(E.goals(theme,outfit).filter(goal=>goal.done).length,3);
  const withoutShoes=outfit.filter(item=>item.category!=='shoes');
  assert.equal(E.goals(theme,withoutShoes).filter(goal=>goal.done).length,1);
  assert.equal(G.scoreOutfit(theme,withoutShoes),0);
});
test('occasion suggestions guide a complete look without choosing pieces for the player',()=>{
  const available=D.items.filter(item=>E.capsule.includes(item.id));
  let outfit=G.emptyOutfit();
  for(const category of ['top','bottom','shoes']){
    const hint=E.suggestion(D.themes[0],outfit,G.equippedItems(outfit),available,0);
    assert.equal(hint.category,category);
    assert.ok(hint.ids.length>1,'Keep a real choice in each category');
    outfit=G.toggleItem(outfit,hint.ids[0],available.map(item=>item.id));
  }
  assert.equal(E.goals(D.themes[0],G.equippedItems(outfit))[0].done,true);
  const ready={...outfit,dress:'dress_cute_01',top:null,bottom:null};
  assert.equal(E.suggestion(D.themes[0],ready,G.equippedItems(ready),available,0).index,2);
});
test('later mood suggestions only expose owned pieces matching the requested brief',()=>{
  for(const theme of D.themes.slice(3)){
    const available=D.items.filter(item=>item.unlockType==='progress'&&
      (item.unlockLevel===null||item.unlockLevel<=theme.index));
    for(let index=0;index<theme.required.length;index++){
      const hint=E.suggestion(theme,G.emptyOutfit(),[],available,index);
      assert.ok(hint,theme.name+' / '+theme.required[index]);
      for(const id of hint.ids){
        assert.ok(available.some(item=>item.id===id));
        assert.ok(G.byId[id].tags.includes(theme.required[index]));
      }
    }
  }
});
