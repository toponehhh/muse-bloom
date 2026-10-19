'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const G = require('../js/game.js');
const first = D.themes[0];
function winningOutfit(save, index) {
  const available = D.items.filter(i => save.unlockedItems.includes(i.id));
  const solution = G.solveTheme(D.themes[index - 1], available);
  const outfit = G.emptyOutfit();
  for (const item of solution.items) item.category === 'accessory' ? outfit.accessory.push(item.id) : outfit[item.category] = item.id;
  return outfit;
}
test('score uses a set of tags, explicit slot units, and exact boundaries', () => {
  assert.deepEqual([34, 35, 54, 55, 69, 70, 84, 85, 94].map(G.rankOf), ['D','C','C','B','B','A','A','S','S']);
  assert.equal(G.scoreOutfit(first, []), 0);
  const i = { tags: first.required, slotUnit: 1 };
  assert.equal(G.scoreOutfit(first, [i, i]), 68);
  assert.equal(G.scoreOutfit(first, [{ tags: [...first.required, ...first.bonus], slotUnit: 99 }]), 94);
});
test('dress blocks separates; removing it restores categories; no duplicate accessories', () => {
  const save = G.newSave(), all = save.unlockedItems;
  const of = c => D.items.filter(i => all.includes(i.id) && i.category === c);
  let outfit = G.toggleItem(G.emptyOutfit(), of('top')[0].id, all);
  outfit = G.toggleItem(outfit, of('bottom')[0].id, all);
  outfit = G.toggleItem(outfit, of('dress')[0].id, all);
  assert.equal(outfit.top, null); assert.equal(outfit.bottom, null);
  assert.equal(G.toggleItem(outfit, of('top')[1].id, all).top, null);
  outfit = G.toggleItem(outfit, of('dress')[0].id, all);
  assert.equal(G.toggleItem(outfit, of('top')[1].id, all).top, of('top')[1].id);
  for (const item of of('accessory').slice(0, 3)) outfit = G.toggleItem(outfit, item.id, all);
  assert.equal(outfit.accessory.length, 2);
  assert.ok(!outfit.accessory.includes(of('accessory')[0].id));
  outfit = G.toggleItem(outfit, outfit.accessory[0], all);
  assert.equal(outfit.accessory.length, 1);
});
test('locked items and locked levels cannot affect a result', () => {
  const save = G.newSave();
  const locked = D.items.find(i => !save.unlockedItems.includes(i.id));
  assert.deepEqual(G.toggleItem(G.emptyOutfit(), locked.id, save.unlockedItems), G.emptyOutfit());
  assert.throws(() => G.finishLevel(save, 2, G.emptyOutfit()), /locked/);
  assert.equal(G.enterLevel(save, 31).allowed, false);
});
test('failed result preserves best and unlocks nothing; retries are free', () => {
  let save = G.newSave();
  const win = G.finishLevel(save, 1, winningOutfit(save, 1));
  const fail = G.finishLevel(win.save, 1, G.emptyOutfit());
  assert.equal(fail.result.rank, 'D');
  assert.equal(fail.save.levels[first.id].best, win.result.score);
  assert.deepEqual(fail.fresh, []); assert.equal(fail.save.streak, 0);
  assert.equal(G.nextLevel(fail.save), 2);
});
test('three different S challenges grant one reward; resubmitting one does not farm a streak', () => {
  let save = G.newSave();
  const initial = G.finishLevel(save, 1, winningOutfit(save, 1)); save = initial.save;
  save = G.finishLevel(save, 1, winningOutfit(save, 1)).save;
  assert.equal(save.streak, 1);
  save = G.finishLevel(save, 2, winningOutfit(save, 2)).save;
  const third = G.finishLevel(save, 3, winningOutfit(save, 3));
  assert.ok(third.streakReward); assert.equal(third.save.streak, 0);
  assert.equal(third.save.unlockedItems.filter(id => G.byId[id].unlockType === 'streak').length, 1);
});
test('chapter entry rewards are idempotent and available before scoring', () => {
  const save = G.newSave();
  for (const t of D.themes.slice(0, 30)) save.levels[t.id] = { best: 35, rank: 'C' };
  const firstEnter = G.enterLevel(save, 31);
  assert.equal(firstEnter.fresh.filter(id => G.byId[id].chinese).length, 10);
  assert.deepEqual(G.enterLevel(firstEnter.save, 31).fresh, []);
});
test('save repair rejects fabricated ranks and progression gaps', () => {
  const raw = { version: 1, levels: { [first.id]: { best: 55, rank: 'S' }, [D.themes[35].id]: { best: 94, rank: 'S' } }, unlockedItems: ['bad-id'], skin: 'unknown', streak: 100 };
  const save = G.sanitizeSave(raw);
  assert.equal(save.levels[first.id].rank, 'B');
  assert.equal(save.levels[D.themes[35].id], undefined);
  assert.equal(save.skin, D.defaultSkin); assert.equal(save.streak, 0);
  assert.ok(!save.unlockedItems.includes('bad-id'));
});
test('corrupted, unavailable, quota-limited and future saves stay playable', () => {
  const corrupt = G.createStorage(() => ({ getItem: () => '{', setItem() {} }));
  assert.equal(corrupt.load().unlockedItems.length, 24);
  const blocked = G.createStorage(() => { throw new Error('SecurityError'); });
  assert.equal(blocked.load().version, 1); assert.equal(blocked.save(G.newSave()), false);
  let writes = 0;
  const future = G.createStorage(() => ({ getItem: () => '{"version":2}', setItem() { writes++; } }));
  future.load(); future.save(G.newSave()); assert.equal(writes, 0);
  const quota = G.createStorage(() => ({ getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } }));
  assert.equal(quota.save(G.newSave()), false);
});
test('save roundtrip retains progress, skin, mute and streak', () => {
  let value;
  const storage = G.createStorage(() => ({ getItem: () => value, setItem: (_, v) => { value = v; } }));
  const result = G.finishLevel(G.newSave(), 1, winningOutfit(G.newSave(), 1));
  result.save.skin = 'deep'; result.save.muted = true;
  storage.save(result.save);
  assert.deepEqual(storage.load(), result.save);
});

test('lookbook keeps the best passing outfit and updates ties without duplicate entries', () => {
  const save = G.newSave(), outfit = winningOutfit(save, 1);
  save.skin = 'deep';
  const win = G.finishLevel(save, 1, outfit);
  assert.equal(win.savedLook, true);
  assert.deepEqual(G.savedLooks(win.save)[0], { level: 1, outfit, skin: 'deep', score: 94, rank: 'S' });
  assert.equal(G.savedLooks(save).length, 0);
  outfit.hair = null;
  assert.notEqual(G.savedLooks(win.save)[0].outfit.hair, null);
  const lower = G.finishLevel(win.save, 1, outfit);
  assert.equal(lower.savedLook, false);
  assert.deepEqual(G.savedLooks(lower.save), G.savedLooks(win.save));
  lower.save.skin = 'porcelain';
  const tie = G.finishLevel(lower.save, 1, winningOutfit(lower.save, 1));
  assert.equal(G.savedLooks(tie.save).length, 1);
  assert.equal(G.savedLooks(tie.save)[0].skin, 'porcelain');
  assert.equal(G.savedLooks(G.finishLevel(save, 1, G.emptyOutfit()).save).length, 0);
});

test('legacy progress survives and can start a lookbook without beating its historic score', () => {
  const legacy = G.finishLevel(G.newSave(), 1, winningOutfit(G.newSave(), 1)).save;
  delete legacy.levels[first.id].look;
  const restored = G.sanitizeSave(legacy);
  assert.deepEqual(restored, legacy);
  const outfit = winningOutfit(restored, 1); outfit.hair = null;
  const next = G.finishLevel(restored, 1, outfit);
  assert.equal(next.save.levels[first.id].best, 94);
  assert.ok(next.result.score >= 35 && next.result.score < 94);
  assert.equal(next.savedLook, true);
  assert.equal(G.savedLooks(G.sanitizeSave(next.save))[0].score, next.result.score);
});

test('malformed lookbook data cannot create unlocked levels or fabricated scores', () => {
  const value = G.finishLevel(G.newSave(), 1, winningOutfit(G.newSave(), 1)).save;
  value.levels[first.id].look.outfit = G.emptyOutfit();
  value.levels[D.themes[35].id] = { best: 94, rank: 'S', look: { outfit: {}, skin: 'warm', score: 94 } };
  const repaired = G.sanitizeSave(value);
  assert.equal(G.savedLooks(repaired).length, 0);
  assert.equal(repaired.levels[first.id].best, 94);
  assert.equal(repaired.levels[D.themes[35].id], undefined);
  assert.equal(G.nextLevel(repaired), 2);
});
