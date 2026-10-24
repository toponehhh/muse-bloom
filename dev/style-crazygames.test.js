'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const {PNG} = require('pngjs');
const portalMode=process.argv.includes('--portals');
const {verify, out} = require(portalMode?'./package-style-portals':'./package-style-crazygames');
const D = require('../js/data');
const evidence = path.resolve(__dirname, portalMode?'../artifacts/style-portals':'../artifacts/style-crazygames');
const report = {kind:'automated-check', humanParticipants:0, startedAt:new Date().toISOString(), checks:[], layouts:[], errors:[], external:[]};
const pass = message => {report.checks.push(message); console.log('PASS: ' + message);};
const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.png':'image/png'};
const servers = [];
let browser;
async function serve(handler) {const server = http.createServer(handler); servers.push(server); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return 'http://127.0.0.1:' + server.address().port;}
async function ready(page, url) {await page.goto(url); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true', null, {timeout:60000});}
async function characterVisible(page, name) {
  const stage = page.locator('#stage'), canvas = stage.locator('canvas');
  const actual = PNG.sync.read(await stage.screenshot({path:path.join(evidence, name + '.png')}));
  const previous = await canvas.evaluate(node => {const old = node.style.visibility; node.style.visibility = 'hidden'; return old;});
  let room;
  try {room = PNG.sync.read(await stage.screenshot());} finally {await canvas.evaluate((node, old) => {node.style.visibility = old;}, previous);}
  let changed = 0;
  for (let i = 0; i < actual.data.length; i += 4) if ([0, 1, 2].some(c => Math.abs(actual.data[i+c] - room.data[i+c]) > 20)) changed++;
  assert.ok(changed > actual.width * actual.height * .025, name + ': character is missing');
}
(async () => {
  fs.mkdirSync(evidence, {recursive:true});
  const manifest = verify(); report.version = manifest.version; report.sourceCommit = manifest.sourceCommit; report.totalBytes = manifest.totalBytes;
  const base = await serve((request, response) => {
    let name = new URL(request.url, 'http://localhost').pathname;
    if (name.startsWith('/portal/build/')) name = name.slice('/portal/build'.length);
    const file = path.resolve(out, '.' + (name === '/' ? '/index.html' : name));
    if (path.relative(out, file).startsWith('..')) return response.writeHead(403).end();
    fs.readFile(file, (error, bytes) => {if (error) return response.writeHead(404).end(); response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache'}).end(bytes);});
  });
  const parent = await serve((request, response) => response.writeHead(200, {'Content-Type':'text/html'}).end(`<!doctype html><html><body style="margin:0"><iframe title="Game" sandbox="allow-scripts allow-same-origin allow-downloads" src="${base}/portal/build/" style="border:0;width:100vw;height:100vh"></iframe></body></html>`));
  browser = await chromium.launch({headless:true, chromiumSandbox:true, ...(process.platform === 'win32' ? {executablePath:process.env.MUSE_BROWSER_EXECUTABLE || 'C:\\Tools\\ugchromium\\app\\chrome.exe'} : {})});
  report.browser = browser.version();
  const context = await browser.newContext({viewport:{width:1216, height:684}, deviceScaleFactor:1, acceptDownloads:true});
  context.on('page', page => {
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('request', request => {if (/^https?:/.test(request.url()) && ![base,parent].some(origin => request.url().startsWith(origin + '/'))) report.external.push(request.url());});
    page.on('response', response => {if (response.status() >= 400) report.errors.push(response.status() + ' ' + response.url());});
  });
  const page = await context.newPage(); await ready(page, base + '/');
  assert.equal(await page.locator('#release-version').innerText(), 'STYLE STORIES · ' + manifest.version);
  assert.equal(await page.locator('#feedback-open').isVisible(), false);
  assert.equal(await page.evaluate(() => window.MuseFeedback.online), false);
  assert.equal(await page.evaluate(() => typeof window.__campaign), 'undefined');
  await page.locator('#map-open').click(); assert.equal(await page.locator('[data-level]:disabled').count(), 35); await page.keyboard.press('Escape');
  await characterVisible(page, 'root-character'); pass('Production entry renders a character with normal progression, local assets and no playtest form/API');
  const pleats = D.items.find(item => item.name === 'Ivory Pleats').id;
  const shoes = D.items.find(item => item.name === 'Petal Mary Janes').id;
  await page.locator('[data-category=bottom]').click(); await page.locator(`[data-item="${pleats}"]`).click();
  await page.locator('[data-category=shoes]').click(); await page.locator(`[data-item="${shoes}"]`).click();
  await page.locator('#detail-view').click(); assert.equal(await page.locator('#detail-view').getAttribute('aria-pressed'), 'true'); await characterVisible(page, 'details');
  await page.locator('#full-view').click(); await page.locator('#reveal').click();
  assert.equal(await page.locator('#score').innerText(), '40'); assert.equal(await page.locator('#result').isVisible(), true);
  await page.locator('#next-level').scrollIntoViewIfNeeded(); await page.screenshot({path:path.join(evidence, 'result.png')});
  const downloaded = page.waitForEvent('download'); await page.locator('#download').click(); await (await downloaded).saveAs(path.join(evidence, 'outfit.jpg'));
  await page.locator('#next-level').click(); assert.equal(await page.locator('#brief-name').innerText(), 'The gallery opening');
  await page.reload(); await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
  await page.locator('#book-open').click(); await page.locator('[data-saved="1"]').click();
  assert.equal(await page.locator('#brief-name').innerText(), 'Coffee with friends');
  await page.locator('[data-category=bottom]').click(); assert.equal(await page.locator(`[data-item="${pleats}"]`).getAttribute('aria-pressed'), 'true');
  await characterVisible(page, 'wear-again'); pass('Actual upload package supports Details, readable scoring, image download, next challenge and saved-outfit restoration after reload');
  for (const [width,height] of [[907,510],[1216,684],[1077,606],[821,462],[1366,768],[1920,1080],[1536,864],[1280,720],[800,450],[1080,607],[390,844],[320,568],...(portalMode?[[640,480],[960,640]]:[])]) {
    await page.setViewportSize({width,height});
    await page.locator('#reset').click(); await page.locator('[data-category=top]').click(); await page.locator('[data-item=top_casual_01]').click();
    const layout = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, clothing:document.querySelector('#items').getBoundingClientRect().toJSON()}));
    assert.ok(layout.scroll <= width, `Horizontal overflow at ${width}x${height}: ${layout.scroll}`);
    await page.locator('#reveal').click(); await page.locator('#next-level').scrollIntoViewIfNeeded();
    const button = await page.locator('#next-level').boundingBox(); assert.ok(button.y >= 0 && button.y + button.height <= height, 'Result action outside viewport');
    await page.screenshot({path:path.join(evidence, `layout-${width}x${height}.png`)}); await page.keyboard.press('Escape');
    report.layouts.push({width,height,...layout});
  }
  pass('Ten CrazyGames DPR-1 iframe sizes and two phone sizes'+(portalMode?', GamePix 640x480 and itch.io 960x640':'')+' keep clothing and result actions usable');
  await page.setViewportSize({width:1216,height:684}); await ready(page, base + '/portal/build/'); await characterVisible(page, 'nested-entry');
  await context.setOffline(true); await page.locator('[data-category=shoes]').click(); await page.locator(`[data-item="${shoes}"]`).click(); await page.locator('#reveal').click(); assert.equal(await page.locator('#result').isVisible(), true); await context.setOffline(false);
  await page.goto(parent); await page.frameLocator('iframe').locator('html[data-ready=true]').waitFor({timeout:60000}); const frame = page.frames().find(frame => frame.url().startsWith(base));
  await frame.locator('#detail-view').click(); await characterVisible(frame, 'iframe-character');
  pass('Nested portal paths, a separate-origin sandboxed iframe and offline play after loading work without a Cloudflare backend');
  assert.deepEqual(report.external, []); assert.deepEqual(report.errors, []);
  report.finishedAt = new Date().toISOString();
})().catch(error => {report.failure = error.stack; console.error(error); process.exitCode = 1;}).finally(async () => {
  fs.writeFileSync(path.join(evidence, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close(); await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
});
