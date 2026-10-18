(function (root, factory) {
  const game = factory(typeof module !== 'undefined' && module.exports ? require('./data.js') : root.MuseData);
  if (typeof module !== 'undefined' && module.exports) module.exports = game;
  else root.MuseGame = game;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const SAVE_KEY = 'muse_bloom_save_v1';
  const byId = Object.fromEntries(D.items.map(i => [i.id, i]));
  const starterIds = D.items.filter(i => i.unlockType === 'progress' && i.unlockLevel === null).map(i => i.id);
  function emptyOutfit() { return { hair: null, top: null, bottom: null, dress: null, shoes: null, accessory: [] }; }
  function newSave() { return { version: 1, levels: {}, unlockedItems: [...starterIds], streak: 0, streakLevels: [], skin: 'warm', muted: false }; }
  function rankOf(score) { return score >= 85 ? 'S' : score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 35 ? 'C' : 'D'; }
  function scoreBreakdown(theme, equipped) {
    const tags = new Set(equipped.flatMap(i => i.tags));
    const required = theme.required.filter(t => tags.has(t));
    const bonus = theme.bonus.filter(t => tags.has(t));
    const units = Math.min(6, equipped.reduce((n, i) => n + i.slotUnit, 0));
    const score = Math.min(100, required.length * 20 + bonus.length * 5 + units * 4);
    return { score, rank: rankOf(score), required, bonus, units, requiredPoints: required.length * 20, bonusPoints: bonus.length * 5, outfitPoints: units * 4, maximum: theme.required.length * 20 + theme.bonus.length * 5 + 24 };
  }
  function scoreOutfit(theme, equipped) { return scoreBreakdown(theme, equipped).score; }
  function normalizeOutfit(value, unlocked = D.items.map(i => i.id)) {
    const outfit = emptyOutfit(), allowed = new Set(unlocked);
    if (!value || typeof value !== 'object') return outfit;
    for (const c of D.categories.filter(c => c !== 'accessory')) {
      const item = byId[value[c]];
      if (item && item.category === c && allowed.has(item.id)) outfit[c] = item.id;
    }
    if (outfit.dress) outfit.top = outfit.bottom = null;
    if (Array.isArray(value.accessory)) outfit.accessory = [...new Set(value.accessory)].filter(id => byId[id]?.category === 'accessory' && allowed.has(id)).slice(0, 2);
    return outfit;
  }
  function equippedItems(outfit) { const o = normalizeOutfit(outfit); return Object.values(o).flat().filter(Boolean).map(id => byId[id]); }
  function toggleItem(value, itemId, unlocked) {
    const outfit = normalizeOutfit(value, unlocked), item = byId[itemId];
    if (!item || !unlocked.includes(itemId)) return outfit;
    const c = item.category;
    if (outfit.dress && (c === 'top' || c === 'bottom')) return outfit;
    if (c === 'accessory') {
      if (outfit.accessory.includes(itemId)) outfit.accessory = outfit.accessory.filter(id => id !== itemId);
      else { if (outfit.accessory.length === 2) outfit.accessory.shift(); outfit.accessory.push(itemId); }
    } else {
      outfit[c] = outfit[c] === itemId ? null : itemId;
      if (outfit.dress) outfit.top = outfit.bottom = null;
    }
    return outfit;
  }
  function nextLevel(save) { return D.themes.find(t => (save.levels[t.id]?.best ?? 0) < 35)?.index || 36; }
  function canPlay(save, index) { return Number.isInteger(index) && index >= 1 && index <= nextLevel(save); }
  function unlock(save, ids) {
    const fresh = [...new Set(ids)].filter(id => !save.unlockedItems.includes(id));
    save.unlockedItems.push(...fresh); return fresh;
  }
  function enterLevel(value, index) {
    const save = structuredCopy(value);
    if (!canPlay(save, index)) return { save, fresh: [], allowed: false };
    const fresh = [];
    for (const theme of D.themes.filter(t => t.index <= index)) fresh.push(...unlock(save, theme.entryItems));
    return { save, fresh, allowed: true };
  }
  function finishLevel(value, index, valueOutfit) {
    if (!canPlay(value, index)) throw new Error('This challenge is locked.');
    const { save } = enterLevel(value, index);
    const theme = D.themes[index - 1];
    const outfit = normalizeOutfit(valueOutfit, save.unlockedItems);
    const result = scoreBreakdown(theme, equippedItems(outfit));
    const previous = save.levels[theme.id]?.best ?? -1;
    if (result.score > previous) save.levels[theme.id] = { best: result.score, rank: result.rank };
    const fresh = result.score >= 35 ? unlock(save, theme.unlockItems) : [];
    let streakReward = null;
    if (result.rank === 'S') {
      if (!save.streakLevels.includes(theme.id)) save.streakLevels.push(theme.id);
      if (save.streakLevels.length >= 3) {
        const hidden = D.items.find(i => i.unlockType === 'streak' && !save.unlockedItems.includes(i.id));
        if (hidden) { fresh.push(...unlock(save, [hidden.id])); streakReward = hidden.id; }
        save.streakLevels = [];
      }
    } else save.streakLevels = [];
    save.streak = save.streakLevels.length;
    return { save, result, fresh, streakReward, isBest: result.score > previous, outfit, complete: D.themes.every(t => (save.levels[t.id]?.best ?? 0) >= 35) };
  }
  function structuredCopy(value) { return JSON.parse(JSON.stringify(value)); }
  function sanitizeSave(raw) {
    const save = newSave();
    if (!raw || raw.version !== 1 || typeof raw !== 'object') return save;
    // A malformed/future locked-level record cannot open the whole map.
    for (const theme of D.themes) {
      const best = raw.levels?.[theme.id]?.best;
      if (!Number.isFinite(best) || best < 0 || best > 94) break;
      save.levels[theme.id] = { best: Math.floor(best), rank: rankOf(best) };
      if (best >= 35) unlock(save, theme.unlockItems); else break;
    }
    for (const theme of D.themes.filter(t => t.index <= nextLevel(save))) unlock(save, theme.entryItems);
    if (Array.isArray(raw.unlockedItems)) unlock(save, raw.unlockedItems.filter(id => byId[id]?.unlockType === 'streak'));
    if (Array.isArray(raw.streakLevels)) save.streakLevels = [...new Set(raw.streakLevels)].filter(id => save.levels[id]?.rank === 'S').slice(0, 2);
    save.streak = save.streakLevels.length;
    if (D.skins.some(s => s.id === raw.skin)) save.skin = raw.skin;
    save.muted = raw.muted === true;
    return save;
  }
  function createStorage(getStorage) {
    let writable = true, notice = '';
    return {
      load() {
        try {
          const value = getStorage().getItem(SAVE_KEY);
          if (!value) return newSave();
          const parsed = JSON.parse(value);
          if (parsed?.version !== 1) { writable = false; notice = 'This save is from a different version. Playing a temporary session.'; return newSave(); }
          return sanitizeSave(parsed);
        } catch { notice = 'Saved progress could not be read. A new session is ready.'; return newSave(); }
      },
      save(value) {
        if (!writable) return false;
        try { getStorage().setItem(SAVE_KEY, JSON.stringify(value)); return true; }
        catch { writable = false; notice = 'Storage is unavailable. Progress lasts for this session only.'; return false; }
      },
      get notice() { return notice; },
      get persistent() { return writable; }
    };
  }
  // Exact dynamic programming over the five relevant tag bits, not a heuristic.
  // One representative per coverage mask is sufficient when every option fills the same units.
  function solveTheme(theme, available) {
    const targets = [...theme.required, ...theme.bonus];
    const mask = list => list.reduce((m, i) => i.tags.reduce((n, t) => n | (targets.includes(t) ? 1 << targets.indexOf(t) : 0), m), 0);
    const category = c => available.filter(i => i.category === c);
    const extras = category('accessory');
    const accessoryOptions = [];
    for (let i = 0; i < extras.length; i++) for (let j = i + 1; j < extras.length; j++) accessoryOptions.push([extras[i], extras[j]]);
    const clothing = category('dress').map(i => [i]);
    for (const top of category('top')) for (const bottom of category('bottom')) clothing.push([top, bottom]);
    let states = new Map([[0, []]]);
    for (const options of [category('hair').map(i => [i]), clothing, category('shoes').map(i => [i]), accessoryOptions]) {
      const unique = new Map(options.map(list => [mask(list), list]));
      const next = new Map();
      for (const [a, chosen] of states) for (const [b, list] of unique) if (!next.has(a | b)) next.set(a | b, [...chosen, ...list]);
      states = next;
    }
    let best = { score: -1, items: [] };
    for (const list of states.values()) {
      const score = scoreOutfit(theme, list);
      if (score > best.score) best = { score, items: list };
    }
    return best;
  }
  return { SAVE_KEY, byId, starterIds, newSave, emptyOutfit, rankOf, scoreOutfit, scoreBreakdown, equippedItems, normalizeOutfit, toggleItem, nextLevel, canPlay, enterLevel, finishLevel, sanitizeSave, createStorage, solveTheme };
});
