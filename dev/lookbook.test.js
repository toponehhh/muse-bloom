'use strict';
// Exercise persistence, gallery navigation, export and responsive layouts in a real browser.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.MUSE_PLAYWRIGHT || 'playwright');
const { createServer } = require('./server.js');
const D = require('../js/data.js'), G = require('../js/game.js');
const out = path.resolve(__dirname, '../artifacts/lookbook');
const channel = process.env.MUSE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const report = { version: require('../package.json').version, channel, checks: [], errors: [], external: [] };
fs.mkdirSync(out, { recursive: true });
const pass = message => { report.checks.push(message); console.log('PASS:', message); };
const server = createServer();
let browser, base;
function winning(save, level) {
  const outfit = G.emptyOutfit();
  for (const i of G.solveTheme(D.themes[level - 1], D.items.filter(i => save.unlockedItems.includes(i.id))).items) {
    i.category === 'accessory' ? outfit.accessory.push(i.id) : outfit[i.category] = i.id;
  }
  return outfit;
}
function observe(page) {
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base)) report.external.push(r.url()); });
}
async function open(viewport, save) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', hasTouch: viewport.width < 768, acceptDownloads: true });
  const page = await context.newPage(); observe(page);
  await page.goto(base);
  if (save) {
    await page.evaluate(({ key, save }) => localStorage.setItem(key, JSON.stringify(save)), { key: G.SAVE_KEY, save });
    await page.reload();
  }
  return page;
}
async function shot(page, name, fullPage = true) {
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage });
}
async function noOverflow(page, label) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), label + ': horizontal overflow');
  const header = await page.locator('.app-header').evaluate(n => {
    const brand = n.querySelector('.brand').getBoundingClientRect(), actions = n.querySelector('.header-right').getBoundingClientRect();
    return { overlap: brand.right > actions.left, height: brand.height, controls: [...n.querySelectorAll('button')].map(b => ({ label: b.getAttribute('aria-label'), x: b.getBoundingClientRect().x, right: b.getBoundingClientRect().right })) };
  });
  assert.equal(header.overlap, false, label + ': header actions overlap brand');
  assert.ok(header.height < 45, label + ': brand wraps');
  assert.ok(header.controls.every(b => b.x >= 0 && b.right <= page.viewportSize().width + 1), label + ': header action outside viewport');
  if (await page.locator('.home-copy').count()) {
    assert.equal(await page.locator('.home-copy h1').innerText(), 'Every look.\nEntirely you.', label + ': headline lost its intended line break');
    assert.match(await page.locator('.home-intro').innerText(), /details\.\nMake/, label + ': introductory sentences run together');
  }
}
async function equip(page, outfit) {
  await page.locator('[data-action="clear"]').click();
  for (const i of G.equippedItems(outfit)) {
    await page.locator(`[data-category="${i.category}"]`).click();
    await page.locator(`[data-action="equip"][data-item="${i.id}"]`).click();
  }
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ channel: channel === 'chromium' ? undefined : channel, headless: true });
  report.browser = browser.version();
  const page = await open({ width: 1440, height: 900 });
  await shot(page, 'home-desktop'); await noOverflow(page, 'Home');
  await page.locator('[data-action="lookbook"]').click();
  assert.ok(await page.locator('.lookbook-empty').isVisible());
  assert.equal(await page.locator('.lookbook-card').count(), 0);
  await shot(page, 'empty-desktop');
  await page.locator('[data-action="play"]').click();
  await page.locator('.skin-selector [data-skin="porcelain"]').click();
  const outfit = winning(G.newSave(), 1);
  await equip(page, outfit);
  await page.locator('[data-action="score"]').click();
  assert.equal(await page.locator('#score-number').innerText(), '94');
  assert.ok(await page.locator('.lookbook-saved').isVisible());
  await shot(page, 'result-desktop');
  await page.locator('[data-action="lookbook"]').click();
  assert.equal(await page.locator('.lookbook-card').count(), 1);
  await page.locator('.lookbook-card').focus(); await page.keyboard.press('Enter');
  assert.equal(await page.locator('#dialog-title').innerText(), D.themes[0].name);
  await shot(page, 'saved-look-dialog');
  await page.locator('[data-action="export-look"]').click();
  await page.locator('.share-image').waitFor();
  assert.deepEqual(await page.locator('.share-image').evaluate(i => [i.naturalWidth, i.naturalHeight]), [1080, 1920]);
  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.download-button').click()]);
  assert.equal(download.suggestedFilename(), 'muse-bloom-' + D.themes[0].id + '.png');
  await download.saveAs(path.join(out, 'saved-portrait.png'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.lookbook-card').evaluate(n => n === document.activeElement), true);
  pass('First passing look, keyboard-opened dialog, 1080 × 1920 portrait download and focus restoration');
  await page.locator('[data-action="collection"]').click();
  await page.locator('[data-action="lookbook"]').click();
  await page.locator('[data-action="return"]').click();
  assert.ok(await page.locator('.result-screen').isVisible());
  await page.reload(); await page.locator('[data-action="lookbook"]').click();
  assert.equal(await page.locator('.lookbook-card').count(), 1);
  await page.locator('.lookbook-card').click(); await page.locator('[data-action="wear-look"]').click();
  assert.equal(await page.locator('.skin-selector [aria-pressed="true"]').getAttribute('data-skin'), 'porcelain');
  const ids = await page.locator('#avatar-slot [data-layer]').evaluateAll(nodes => nodes.map(n => n.dataset.layer).filter(id => MuseGame.byId[id]).sort());
  assert.deepEqual(ids, G.equippedItems(outfit).map(i => i.id).sort());
  await page.locator('[data-action="clear"]').click(); await page.locator('[data-action="score"]').click();
  assert.equal(await page.locator('#score-number').innerText(), '0');
  assert.equal(await page.locator('.lookbook-saved').count(), 0);
  await page.locator('[data-action="lookbook"]').click();
  assert.equal(await page.locator('.lookbook-card .lookbook-grade').innerText(), 'S\n94 / 94');
  pass('Saved outfit and tone survive reload, restyle exactly, retain best look after a failed retry, and return to the originating screen');
  await page.context().close();

  let save = G.newSave(); save.muted = true;
  for (let index = 1; index <= 12; index++) {
    save = G.enterLevel(save, index).save; save.skin = D.skins[(index - 1) % D.skins.length].id;
    save = G.finishLevel(save, index, winning(save, index)).save;
  }
  const legacy = JSON.parse(JSON.stringify(save));
  for (const level of Object.values(legacy.levels)) delete level.look;
  const oldPage = await open({ width: 1440, height: 900 }, legacy);
  await oldPage.locator('[data-action="lookbook"]').click();
  assert.ok(await oldPage.locator('.lookbook-empty').isVisible());
  await oldPage.locator('[data-action="home"]').click(); await oldPage.locator('[data-action="map"]').click();
  assert.equal(await oldPage.locator('.map-progress>b').innerText(), '12 / 36');
  // Loading a completed chapter also makes the next chapter's entry pieces available.
  const expectedOwned = new Set([...save.unlockedItems, ...D.themes[12].entryItems]);
  assert.equal(await oldPage.locator('.collection-pill').innerText(), `${expectedOwned.size} / 122`);
  const retained = await oldPage.evaluate(key => JSON.parse(localStorage.getItem(key)), G.SAVE_KEY);
  assert.ok(legacy.unlockedItems.every(id => retained.unlockedItems.includes(id)));
  pass('Pre-lookbook v1 save keeps 12 completed challenges and its wardrobe without fabricating saved outfits');
  await oldPage.context().close();

  for (const viewport of [{ width: 375, height: 667 }, { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 1920, height: 1080 }]) {
    const p = await open(viewport, save), size = `${viewport.width}x${viewport.height}`;
    await noOverflow(p, size + ' home'); await shot(p, 'home-' + size);
    await p.locator('[data-action="map"]').click(); await noOverflow(p, size + ' map'); await shot(p, 'collections-' + size);
    await p.locator('[data-action="lookbook"]').click(); await noOverflow(p, size + ' gallery');
    assert.equal(await p.locator('.lookbook-card').count(), 12);
    for (const photo of await p.locator('.lookbook-photo').all()) {
      const rect = await photo.boundingBox(); assert.ok(rect.width > 100 && rect.height > 130, size + ': gallery image collapsed');
    }
    await shot(p, 'gallery-' + size, viewport.width > 767);
    await p.locator('.lookbook-card').first().click();
    for (const action of ['wear-look', 'export-look']) {
      const button = p.locator(`[data-action="${action}"]`); await button.scrollIntoViewIfNeeded();
      const r = await button.boundingBox(); assert.ok(r.x >= 0 && r.x + r.width <= viewport.width + 1 && r.height >= 40, size + ': dialog action clipped');
    }
    await p.locator('[data-action="wear-look"]').click();
    await noOverflow(p, size + ' studio');
    const submit = await p.locator('[data-action="score"]').boundingBox();
    assert.ok(submit.y + submit.height <= viewport.height + 1, size + ': reveal button below viewport');
    await shot(p, 'studio-' + size);
    pass(`${size}: home, collection map, 12-look gallery, dialog and studio fit without horizontal overflow or header overlap`);
    await p.context().close();
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.external, []);
  pass('No browser errors or external requests across the lookbook journey');
})().catch(error => { report.failure = error.stack; console.error(error); process.exitCode = 1; }).finally(async () => {
  fs.writeFileSync(path.join(out, `lookbook-report-${channel}.json`), JSON.stringify(report, null, 2));
  await browser?.close(); await new Promise(resolve => server.close(resolve));
});
