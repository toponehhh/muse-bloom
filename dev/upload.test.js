'use strict';
// Test the actual upload file in an otherwise empty server, including nested paths
// and an iframe. Serving source files would hide incomplete portal uploads.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.MUSE_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const upload = path.join(root, 'dist/crazygames-upload/index.html');
const html = fs.readFileSync(upload);
const source = fs.readFileSync(path.join(root, 'index.html'));
const out = path.join(root, 'artifacts/upload');
const channel = process.env.MUSE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const report = { version: require('../package.json').version, channel, bytes: html.length, checks: [], errors: [] };
fs.mkdirSync(out, { recursive: true });
const nested = '/games/muse-bloom/build-42/index.html';
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  let body;
  if (pathname === '/index.html' || pathname === nested) body = html;
  else if (pathname === '/missing/index.html') body = source;
  else if (pathname === '/preview.html') body = `<!doctype html><title>Upload iframe test</title><iframe title="Game" style="width:100%;height:800px;border:0" sandbox="allow-scripts allow-same-origin allow-downloads" src="${nested}"></iframe>`;
  else { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('No uploaded file at this path'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(body);
});
let browser;
const pass = text => { report.checks.push(text); console.log('PASS:', text); };
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel, headless: true });
  report.browser = browser.version();

  // A real negative control: uploading only the source entry reproduces the
  // unstyled boot screen. Keep its intentional errors out of the success cases.
  const broken = await browser.newPage({ viewport: { width: 1215, height: 680 } });
  const missing = [];
  broken.on('response', response => { if (response.status() === 404) missing.push(new URL(response.url()).pathname); });
  await broken.goto(origin + '/missing/index.html', { waitUntil: 'load' });
  assert.equal(await broken.locator('.boot h1').innerText(), 'Muse Bloom');
  assert.equal(await broken.locator('.home-screen').count(), 0);
  assert.equal(await broken.locator('body').evaluate(n => getComputedStyle(n).margin), '8px');
  assert.ok(missing.includes('/missing/css/style.css') && missing.includes('/missing/js/main.js'));
  await broken.screenshot({ path: path.join(out, 'missing-resources.png') });
  report.negativeControl = { missing, bootVisible: true };
  pass('Missing CSS/JS reproduces the unstyled boot screen; negative control detected.');
  await broken.close();

  const cases = [
    { name: 'root-desktop', url: origin + '/index.html', width: 1440, height: 900 },
    { name: 'nested-mobile', url: origin + nested, width: 375, height: 667, mobile: true },
    { name: 'sandboxed-iframe', url: origin + '/preview.html', width: 1440, height: 900, iframe: true },
    { name: 'offline-file', url: pathToFileURL(upload).href, width: 1440, height: 900 }
  ];
  for (const test of cases) {
    const context = await browser.newContext({ viewport: { width: test.width, height: test.height }, reducedMotion: 'reduce', isMobile: !!test.mobile, hasTouch: !!test.mobile });
    const page = await context.newPage();
    const errors = [], assets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      if (!request.isNavigationRequest() && /^https?:/.test(request.url()) && !request.url().endsWith('/favicon.ico')) assets.push(request.url());
    });
    await context.route('**/*', route => {
      const url = route.request().url();
      if (/^https?:/.test(url) && new URL(url).origin !== origin) { errors.push('Unexpected external request: ' + url); return route.abort(); }
      return route.continue();
    });
    await page.goto(test.url, { waitUntil: 'load' });
    const game = test.iframe ? page.frameLocator('iframe[title="Game"]') : page;
    await game.locator('.home-screen').waitFor({ state: 'visible', timeout: 5000 });
    assert.equal(await game.locator('.boot').count(), 0);
    assert.equal(await game.locator('script[src], link[rel="stylesheet"]').count(), 0);
    assert.match(await game.locator('.home-actions .primary').evaluate(n => getComputedStyle(n).backgroundImage), /linear-gradient/);
    await game.locator('[data-action="play"]').click();
    await game.locator('[data-action="clear"]').click();
    const base = game.locator('#avatar-slot [data-layer="base"]');
    assert.equal(await base.count(), 1);
    assert.equal(await base.locator('[data-feature="eye-left"], [data-feature="eye-right"]').count(), 2);
    await game.locator('[data-action="score"]').click();
    assert.equal(await game.locator('#score-number').innerText(), '0');
    await game.locator('[data-action="retry"]').click();
    await game.locator('[data-category="top"]').click();
    await game.locator('[data-item="top_edgy_05"]').click();
    assert.equal(await game.locator('[data-layer="top_edgy_05"]').count(), 1);
    await game.locator('[data-item="top_edgy_05"]').click();
    assert.equal(await base.locator('[data-basic="top"]').getAttribute('display'), null);
    await game.locator('[data-category="accessory"]').click();
    await game.locator('[data-item="accessory_cute_03"]').click();
    assert.equal(await game.locator('[data-layer="hand-right"] [data-pose="grip"]').count(), 1);
    await game.locator('.skin-selector [data-skin="porcelain"]').click();
    assert.ok(await game.locator('body').evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(out, test.name + '.png'), fullPage: true });
    await page.reload({ waitUntil: 'load' });
    await game.locator('[data-action="play"]').click();
    assert.equal(await game.locator('.skin-selector [data-skin="porcelain"]').getAttribute('aria-pressed'), 'true');
    assert.deepEqual(assets, [], 'Single-file build must not request any CSS, JS or image files.');
    assert.deepEqual(errors, [], 'Upload build must have no runtime, console or network errors.');
    pass(`${test.name}: styled startup, avatar, equip/remove, grip, score/retry and saved setting; zero asset requests.`);
    await context.close();
  }
  report.status = 'passed';
})().catch(error => {
  report.status = 'failed'; report.errors.push(error.stack || error.message); console.error(error); process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(out, `upload-report-${channel}.json`), JSON.stringify(report, null, 2));
});
