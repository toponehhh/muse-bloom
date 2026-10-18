'use strict';
const assert = require('node:assert/strict');
const D = require('../js/data.js');
const G = require('../js/game.js');
assert.equal(D.items.length, 122);
assert.equal(new Set(D.items.map(i => i.id)).size, 122);
assert.equal(D.themes.length, 36);
assert.equal(D.items.filter(i => i.chinese).length, 20);
assert.equal(G.starterIds.length, 24);
assert.equal(D.items.filter(i => i.unlockType === 'streak').length, 7);
for (const item of D.items) {
  assert.equal(new Set(item.tags).size, 3, item.id);
  assert.ok(item.tags.every(t => D.tags.includes(t)), item.id);
  assert.ok(item.unlockType === 'streak' || item.unlockLevel === null || (item.unlockLevel >= 1 && item.unlockLevel <= 36));
}
for (const [category, expected] of Object.entries({ hair: 22, top: 23, bottom: 21, dress: 20, shoes: 18, accessory: 18 })) {
  assert.equal(D.items.filter(i => i.category === category).length, expected);
  for (const tag of D.tags) assert.ok(D.items.filter(i => i.category === category && i.tags.includes(tag)).length >= 2, `${category}: insufficient ${tag} pieces`);
}
let save = G.newSave();
const solutions = [];
for (const theme of D.themes) {
  assert.equal(theme.required.length, 3);
  assert.equal(theme.bonus.length, 2);
  assert.equal(new Set([...theme.required, ...theme.bonus]).size, 5);
  save = G.enterLevel(save, theme.index).save;
  // Deliberately exclude streak rewards: normal progression must always suffice.
  const available = D.items.filter(i => save.unlockedItems.includes(i.id) && i.unlockType !== 'streak');
  const best = G.solveTheme(theme, available);
  assert.ok(best.score >= 85, `${theme.index}. ${theme.name}: maximum ${best.score}`);
  solutions.push({ index: theme.index, name: theme.name, score: best.score, items: best.items.map(i => i.id) });
  // Advance by the minimum passing score, never grant hidden rewards to the solver.
  save.levels[theme.id] = { best: 35, rank: 'C' };
  save.unlockedItems.push(...theme.unlockItems.filter(id => !save.unlockedItems.includes(id)));
}
assert.equal(save.unlockedItems.length, 115);
assert.equal(D.themes[30].entryItems.filter(id => G.byId[id].chinese).length, 10);
console.log(`PASS: 36/36 challenges can reach S without streak rewards. Scores: ${Math.min(...solutions.map(s => s.score))}-${Math.max(...solutions.map(s => s.score))}.`);
console.log('PASS: 122 items, 24 starters, 91 progress rewards, 7 streak rewards, 20 Chinese pieces.');
if (process.argv.includes('--json')) console.log(JSON.stringify(solutions, null, 2));
module.exports = solutions;
