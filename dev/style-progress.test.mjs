import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readProgress,writeProgress,matchesTheme,nextTheme} from '../demos/style-lab/src/progress.mjs';
test('Invalid and unavailable storage does not prevent starting a look',()=>{
  assert.equal(readProgress(undefined).top,0);
  assert.equal(readProgress({getItem(){throw new Error('blocked');}}).theme,0);
  assert.deepEqual(readProgress({getItem:()=>'{bad'}).completed,[]);
  const clean=readProgress({getItem:()=>JSON.stringify({schema:1,top:99,bottom:2,theme:'1',completed:[0,0,2,99,null],sound:'yes'})});
  assert.equal(clean.top,0);assert.equal(clean.bottom,2);assert.equal(clean.theme,0);
  assert.deepEqual(clean.completed,[0,2]);assert.equal(clean.sound,false);
  assert.equal(writeProgress(undefined,clean,new Set([0])),false);
});
test('Collecting a mood requires its full pair; next mood skips completed ones',()=>{
  assert.equal(matchesTheme(1,0,1),false);assert.equal(matchesTheme(1,1,1),true);
  assert.equal(matchesTheme(0,0,5),false);
  assert.equal(nextTheme(0,[0]),1);assert.equal(nextTheme(1,[0,1]),2);
  assert.equal(nextTheme(2,[0,1,2]),null);assert.equal(nextTheme(2,[2]),0);
});
