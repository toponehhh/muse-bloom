'use strict';
// Serve only the generated site at a repository subpath, as GitHub Pages does.
// MUSE_PAGES_URL switches the same smoke checks to an already deployed site.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), site = path.join(root, 'dist/github-pages');
const out = path.join(root, 'artifacts/pages');
const channel = process.env.MUSE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const live = process.env.MUSE_PAGES_URL;
const report = { version: require('../package.json').version, target: live || 'local-repository-subpath', source: 'automated-check', checks: [], errors: [] };
const pass = message => { report.checks.push(message); console.log('PASS:', message); };
const manifest = JSON.parse(fs.readFileSync(path.join(site, 'build.json'), 'utf8'));
const routes = new Map([
  ['/muse-bloom/', 'index.html'], ['/muse-bloom/index.html', 'index.html'],
  ['/muse-bloom/playtest/', 'playtest/index.html'], ['/muse-bloom/playtest/index.html', 'playtest/index.html'],
  ['/muse-bloom/playtest/Muse-Bloom.html', 'playtest/Muse-Bloom.html'], ['/muse-bloom/build.json', 'build.json']
]);
const server = http.createServer((req, res) => {
  const name = routes.get(new URL(req.url, 'http://localhost').pathname);
  if (!name) return res.writeHead(404).end('Not in the published site');
  res.writeHead(200, { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'text/html; charset=utf-8' });
  res.end(fs.readFileSync(path.join(site, name)));
});
let browser;
function watch(page) {
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('requestfailed', r => report.errors.push('Request failed: ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) report.errors.push('HTTP ' + r.status() + ': ' + r.url()); });
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  assert.deepEqual(manifest.files.map(f => f.file), ['index.html', 'playtest/index.html', 'playtest/Muse-Bloom.html']);
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(site, file.file));
    assert.equal(bytes.length, file.bytes);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  pass('Publish manifest contains only the game and feedback guide; file hashes match');
  if (!live) await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = live ? new URL(live).href.replace(/\/?$/, '/') : 'http://127.0.0.1:' + server.address().port + '/muse-bloom/';
  browser = await chromium.launch({ channel: channel === 'chromium' ? undefined : channel, headless: true });
  const published = await browser.newContext();
  const metadata = await published.request.get(base + 'build.json');
  assert.equal(metadata.status(), 200);
  assert.equal((await metadata.json()).sourceCommit, manifest.sourceCommit, 'Published commit must match this build');
  await published.close();
  pass('Published build identifies the expected source commit');
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage(); watch(page);
    const assets = [];
    page.on('request', r => { if (!r.isNavigationRequest() && /^https?:/.test(r.url())) assets.push(r.url()); });
    await page.goto(base);
    await page.locator('.salon-home').waitFor();
    assert.equal(await page.evaluate(() => MusePlaytest.active), false);
    await page.locator('.home-actions [data-action="play"]').click();
    for (const [category, id] of [['top', 'top_cozy_02'], ['bottom', 'bottom_casual_01'], ['shoes', 'shoes_casual_01'], ['hair', 'hair_casual_01']]) {
      await page.locator('[data-action="category"][data-category="' + category + '"]').click();
      await page.locator('[data-action="equip"][data-item="' + id + '"]').click();
    }
    await page.locator('[data-action="score"]').click();
    await page.locator('#score-number').waitFor();
    assert.equal(await page.locator('#score-number').innerText(), '94');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(assets, [], 'Game must not depend on missing CSS, JS, artwork or external CDNs');
    await page.screenshot({ path: path.join(out, (live ? 'live-' : '') + 'game-' + width + '.png'), fullPage: true });
    await context.close();
    pass('Game at repository subpath: ' + width + 'px first outfit completes at 94, with embedded assets and no overflow');
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
  const guide = await context.newPage(); watch(guide);
  await guide.goto(base + 'playtest/');
  await guide.locator('h1').waitFor();
  assert.ok(await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await guide.evaluate(() => localStorage.setItem('muse_bloom_save_v1', 'PAGES-REGULAR-SAVE-CONTROL'));
  // Mark our own automated trial without changing the link real players use.
  await guide.locator('.actions a').first().evaluate(a => { a.href += '&qa=1'; });
  const popup = context.waitForEvent('page');
  await guide.locator('.actions a').first().click();
  const game = await popup; watch(game);
  await game.locator('.salon-home').waitFor();
  assert.equal(new URL(game.url()).pathname, new URL(base + 'playtest/Muse-Bloom.html').pathname);
  assert.equal(await game.evaluate(() => MusePlaytest.active), true);
  const participant = await game.evaluate(() => MusePlaytest.snapshot().participant);
  await game.locator('[data-action="feedback"]').click();
  for (const field of ['clarity', 'readability', 'visuals', 'enjoyment']) await game.locator('select[name="' + field + '"]').selectOption('4');
  await game.locator('select[name="continue"]').selectOption('Maybe');
  const downloading = game.waitForEvent('download');
  await game.locator('#playtest-feedback [type="submit"]').click();
  const downloaded = await downloading;
  const feedback = JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'));
  assert.equal(feedback.source, 'automated-check');
  assert.equal(feedback.participant, participant);
  assert.equal(await game.evaluate(() => localStorage.getItem('muse_bloom_save_v1')), 'PAGES-REGULAR-SAVE-CONTROL');
  await game.reload(); await game.locator('.salon-home').waitFor();
  assert.equal(await game.evaluate(() => MusePlaytest.snapshot().participant), participant);
  await game.close();
  const continuing = context.waitForEvent('page');
  await guide.locator('.actions a').nth(1).click();
  const continued = await continuing; watch(continued);
  await continued.locator('.salon-home').waitFor();
  assert.equal(await continued.evaluate(() => MusePlaytest.snapshot().participant), participant);
  await continued.close();
  await guide.getByRole('link', { name: '返回普通游戏' }).click();
  await guide.locator('.salon-home').waitFor();
  assert.equal(await guide.evaluate(() => MusePlaytest.active), false);
  pass('Hosted guide opens and resumes isolated playtests; feedback downloads as JSON; return link loads the regular game');
  await context.close();
  assert.deepEqual(report.errors, []);
  report.status = 'passed';
})().catch(e => { report.status = 'failed'; report.errors.push(e.stack); console.error(e); process.exitCode = 1; }).finally(async () => {
  await browser?.close();
  if (server.listening) await new Promise(resolve => server.close(resolve));
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, live ? 'live-report.json' : 'report.json'), JSON.stringify(report, null, 2));
});
