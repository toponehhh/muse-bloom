'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');
const {gamepix} = require('../scripts/package-portals.js');
const {assertCampaignViewport} = require('./campaign-viewport-checks.js');
const data = require('../src/core/data.js');

const official = process.argv.includes('--official');
const evidence = path.resolve(__dirname, '../artifacts/gamepix');
const suite = official ? 'official-local' : 'player-contract';
const report = {suite, passed:false, checks:[], errors:[]};
const pass = message => { report.checks.push(message); console.log('PASS: ' + message); };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const types = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.json':'application/json'};
const servers = [];
let browser;
async function serve(handler) {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + server.address().port;
}

// Executed only in the browser test, in place of the CDN script.
function installTestPlayer() {
  const events = new Map();
  const player = window.testPlayer = {
    calls:[['config', window.GamePixConfig?.lifecycle]],
    audioResumes:0,
    emit(event) { for (const callback of events.get(event) || []) callback(); }
  };
  const query = new URLSearchParams(location.search);
  if (window.testSyncedSave) {
    const {key, value} = window.testSyncedSave;
    player.startedWithoutLocalSave = localStorage.getItem(key) === null;
    localStorage.setItem(key, value);
  }
  const originalRead = Storage.prototype.getItem;
  Storage.prototype.getItem = function(key) {
    if (key.startsWith('muse-style-room-campaign')) player.calls.push(['read', key]);
    return originalRead.call(this, key);
  };
  const Audio = window.AudioContext;
  window.AudioContext = class extends Audio {
    constructor(...args) { super(...args); window.testAudio = this; }
    resume() { player.audioResumes++; return super.resume(); }
  };
  window.GamePix = {
    events:{on(event, callback) {
      player.calls.push(['on', event]);
      if (!events.has(event)) events.set(event, []);
      events.get(event).push(callback);
      if (event === 'pause' && query.has('earlyPause')) callback();
      if (event === 'soundOff' && query.has('earlyMute')) callback();
    }},
    lifecycle:{
      loading(value) { player.calls.push(['loading', value]); },
      loaded() {
        player.calls.push(['loaded']);
        if (query.has('rejectReady')) return Promise.reject(new Error('test readiness failure'));
        if (query.has('holdReady')) return new Promise(resolve => { player.ack = resolve; });
        return Promise.resolve();
      },
      gameStart() { player.calls.push(['start', document.documentElement.dataset.ready]); }
    },
    ads:{interstitial() {
      player.calls.push(['ad']);
      player.emit('pause');
      return new Promise((resolve, reject) => {
        player.finishAd = outcome => {
          player.emit('resume');
          if (outcome === 'reject') reject(new Error('test ad failure'));
          else resolve({success:outcome === 'success'});
        };
      });
    }}
  };
}

async function ready(frame) {
  await frame.locator('html[data-ready="true"]').waitFor({timeout:60000});
}
async function styleAndReveal(frame) {
  for (const [category, name] of [['bottom','Ivory Pleats'], ['shoes','Petal Mary Janes']]) {
    await frame.locator('[data-category="' + category + '"]').click();
    const id = data.items.find(item => item.name === name).id;
    await frame.locator('[data-item="' + id + '"]').click();
  }
  await frame.locator('#reveal').click();
  assert.equal(await frame.locator('#score').innerText(), '40');
}
async function nextStory(frame) {
  await frame.waitForFunction(() => document.querySelector('#brief-name').textContent === 'The gallery opening');
}
async function countCalls(frame, name) {
  return frame.evaluate(name => testPlayer.calls.filter(([method]) => method === name).length, name);
}

async function contract(context, base, parent, sdkUrl) {
  await context.route(sdkUrl, route => route.fulfill({contentType:'application/javascript', body:'(' + installTestPlayer.toString() + ')()'}));
  const page = await context.newPage();
  await page.goto(parent + '/?holdReady&earlyPause&earlyMute&test=1');
  const frame = page.frames().find(frame => frame.url().startsWith(base));
  await frame.waitForFunction(() => typeof window.testPlayer?.ack === 'function');
  const calls = await frame.evaluate(() => testPlayer.calls);
  const firstRead = calls.findIndex(([name]) => name === 'read');
  assert.ok(firstRead > 0, 'The campaign must read its save after SDK initialization');
  assert.deepEqual(calls[0], ['config','manual']);
  assert.deepEqual(calls.slice(0, firstRead).filter(([name]) => name === 'on').map(([,event]) => event).sort(),
    ['pause','resume','soundOff','soundOn']);
  const progress = calls.filter(([name]) => name === 'loading').map(([,value]) => value);
  assert.equal(progress[0], 0);
  assert.equal(progress.at(-1), 100);
  assert.deepEqual(progress, [...new Set(progress)].sort((a,b) => a-b));
  assert.equal(progress.length, 9);
  assert.ok(progress.every(Number.isInteger));
  assert.deepEqual(calls.at(-1), ['loaded']);
  assert.notEqual(await frame.locator('html').getAttribute('data-ready'), 'true');
  await frame.evaluate(() => testPlayer.ack());
  await ready(frame);
  assert.equal(await countCalls(frame, 'start'), 0);
  assert.equal(await frame.locator('main').evaluate(el => el.inert), true);
  await frame.evaluate(() => {testPlayer.emit('resume');testPlayer.emit('resume');});
  assert.deepEqual(await frame.evaluate(() => testPlayer.calls.filter(([n]) => n === 'start')), [['start','true']]);
  await assertCampaignViewport(frame, 'GamePix 800×450 iframe');
  pass('SDK precedes save reads, seven asset completions report increasing progress, and gameplay starts once after acknowledgement and an early host pause');

  // soundOff arrived before the campaign created its AudioContext. The first
  // gesture still saves the player's preference, without playing a chime.
  await frame.locator('#sound').click();
  assert.deepEqual(await frame.evaluate(() => [__campaign.state.sound, !!window.testAudio]), [true,false]);
  await frame.locator('#sound').click();
  await frame.evaluate(() => testPlayer.emit('soundOn'));
  await frame.locator('#sound').click();
  await frame.waitForFunction(() => window.testAudio?.state === 'running');
  const resumeCount = await frame.evaluate(() => testPlayer.audioResumes);
  await frame.evaluate(() => {testPlayer.emit('soundOff');testPlayer.emit('soundOff');});
  await frame.waitForFunction(() => testAudio.state === 'suspended');
  const mutedClock = await frame.evaluate(() => __campaign.renderer.clock);
  await frame.locator('[data-category=bottom]').click();
  await frame.getByRole('button', {name:/Ivory Pleats/}).click();
  await frame.waitForFunction(clock => __campaign.renderer.clock > clock, mutedClock);
  assert.deepEqual(await frame.evaluate(() => [testAudio.state, __campaign.state.sound, document.querySelector('main').inert]), ['suspended',true,false]);
  await frame.evaluate(() => {testPlayer.emit('pause');testPlayer.emit('resume');});
  assert.equal(await frame.evaluate(() => testPlayer.audioResumes), resumeCount, 'Resume cannot override the host mute');
  await frame.evaluate(() => {testPlayer.emit('pause');testPlayer.emit('soundOn');testPlayer.emit('soundOn');});
  assert.equal(await frame.evaluate(() => testPlayer.audioResumes), resumeCount, 'Sound on cannot override a host pause');
  await frame.evaluate(() => testPlayer.emit('resume'));
  await frame.waitForFunction(() => testAudio.state === 'running');
  await frame.evaluate(() => testPlayer.emit('soundOff'));
  await frame.waitForFunction(() => testAudio.state === 'suspended');
  await frame.evaluate(() => testPlayer.emit('soundOn'));
  await frame.waitForFunction(() => testAudio.state === 'running');
  pass('Independent soundOff/soundOn controls Web Audio while outfit selection and animation continue, respects early and duplicate events and cannot override pause');
  await frame.evaluate(() => {testPlayer.emit('pause');testPlayer.emit('pause');});
  await frame.waitForFunction(() => testAudio.state === 'suspended');
  assert.equal(await frame.evaluate(() => __campaign.renderer.app.ticker.started), false);
  const frozenClock = await frame.evaluate(() => __campaign.renderer.clock);
  await frame.locator('#detail-view').click({force:true});
  assert.equal(await frame.locator('#full-view').getAttribute('aria-pressed'), 'true');
  assert.equal(await frame.evaluate(() => __campaign.renderer.clock), frozenClock);
  await frame.evaluate(() => testPlayer.emit('resume'));
  await frame.waitForFunction(clock => testAudio.state === 'running' && __campaign.renderer.clock > clock, frozenClock);
  await frame.locator('#detail-view').click();
  assert.equal(await frame.locator('#detail-view').getAttribute('aria-pressed'), 'true');
  await frame.locator('#sound').click();
  await frame.waitForFunction(() => testAudio.state === 'suspended');
  const userMutedCount = await frame.evaluate(() => testPlayer.audioResumes);
  await frame.evaluate(() => {testPlayer.emit('soundOff');testPlayer.emit('soundOn');});
  assert.equal(await frame.evaluate(() => testPlayer.audioResumes), userMutedCount, 'The Player cannot unmute a user-muted game');
  await frame.locator('#motion').click();
  await frame.locator('#map-open').click();
  await frame.evaluate(() => testPlayer.emit('pause'));
  await page.keyboard.press('Escape');
  assert.equal(await frame.locator('#journey').isVisible(), true);
  await frame.evaluate(() => testPlayer.emit('resume'));
  await page.keyboard.press('Escape');
  await frame.locator('#journey').waitFor({state:'hidden'});
  assert.deepEqual(await frame.evaluate(() => [testAudio.state, __campaign.renderer.paused, __campaign.state.sound]), ['suspended',true,false]);
  pass('Host pause stops the Pixi ticker, Web Audio and input, including Escape in a modal. Resume respects the saved mute and motion choices');

  await styleAndReveal(frame);
  await frame.locator('#retry-look').click();
  assert.equal(await countCalls(frame, 'ad'), 0);
  for (const [i, outcome] of ['success','nofill','reject'].entries()) {
    await styleAndReveal(frame);
    await assertCampaignViewport(frame, 'GamePix result', {result:true});
    // A queued second activation must not request two ads or advance two stories.
    await frame.locator('#next-level').evaluate(el => {el.click();el.click();});
    assert.equal(await countCalls(frame, 'ad'), i+1);
    assert.equal(await frame.locator('#brief-name').innerText(), 'Coffee with friends');
    assert.equal(await frame.locator('main').evaluate(el => el.inert), true);
    await frame.evaluate(outcome => testPlayer.finishAd(outcome), outcome);
    await nextStory(frame);
    assert.equal(await frame.locator('main').evaluate(el => el.inert), false);
    if (i < 2) {
      await frame.locator('#book-open').click();
      await frame.locator('[data-saved="1"]').click();
    }
  }
  assert.equal(await countCalls(frame, 'start'), 1);
  await frame.goto(base + '/?test=1');
  await ready(frame);
  await nextStory(frame);
  const {SAVE_KEY} = await import('../src/core/campaign-state.mjs');
  const synced = {key:SAVE_KEY, value:await frame.evaluate(key => localStorage.getItem(key), SAVE_KEY)};
  assert.equal(JSON.parse(synced.value).level, 2);
  await frame.locator('#book-open').click();
  await frame.locator('[data-saved="1"]').click();
  await frame.locator('[data-category=shoes]').click();
  assert.equal(await frame.getByRole('button', {name:/Petal Mary Janes/}).getAttribute('aria-pressed'), 'true');
  pass('Ad completion, no fill and rejection advance once; ordinary retries show no ad. The score, unlock and saved outfit survive a reload');

  const fresh = await browser.newContext();
  watchErrors(fresh);
  try {
    await fresh.addInitScript(save => { window.testSyncedSave = save; }, synced);
    await fresh.route(sdkUrl, route => route.fulfill({contentType:'application/javascript',body:'(' + installTestPlayer.toString() + ')()'}));
    const restored = await fresh.newPage();
    await restored.goto(base + '/');
    await ready(restored);
    await nextStory(restored);
    assert.equal(await restored.evaluate(() => testPlayer.startedWithoutLocalSave), true);
    await restored.locator('#book-open').click();
    assert.match(await restored.locator('[data-saved="1"]').innerText(), /40 points/);
  } finally { await fresh.close(); }
  pass('A fresh browser profile restores a save supplied by the test Player before the game first reads storage');

  for (const scenario of ['sdk-blocked','ready-rejected','asset-failure']) {
    const isolated = await browser.newContext({viewport:{width:800,height:450}});
    watchErrors(isolated);
    try {
      await isolated.route(sdkUrl, route => scenario === 'sdk-blocked' ? route.abort() :
        route.fulfill({contentType:'application/javascript', body:'(' + installTestPlayer.toString() + ')()'}));
      if (scenario === 'asset-failure') await isolated.route('**/assets/mira.png*', route => route.abort());
      const tab = await isolated.newPage();
      await tab.goto(base + '/?test=1' + (scenario === 'ready-rejected' ? '&rejectReady' : ''));
      if (scenario === 'asset-failure') {
        await tab.locator('html[data-ready="error"] #retry').waitFor({timeout:65000});
        assert.equal(await countCalls(tab, 'loaded'), 0);
        assert.equal(await countCalls(tab, 'start'), 0);
        continue;
      }
      await ready(tab);
      await styleAndReveal(tab);
      await tab.locator('#next-level').click();
      await nextStory(tab);
      if (scenario === 'ready-rejected') {
        assert.equal(await countCalls(tab, 'start'), 0);
        assert.equal(await countCalls(tab, 'ad'), 0);
      }
    } finally { await isolated.close(); }
  }
  pass('Blocked SDK or rejected Player readiness keeps styling playable; missing character art shows Retry without reporting a successful load');
}

async function officialLocal(context, base, sdkUrl) {
  // Request only the official SDK and loopback game files. The SDK's documented
  // standalone mode simulates ad outcomes without using live ad inventory.
  const copy = process.env.MUSE_GAMEPIX_SDK_FILE;
  let script;
  if (copy) { script = fs.readFileSync(copy); report.sdkSha256 = sha(script); }
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url === sdkUrl && script) return route.fulfill({contentType:'application/javascript',body:script});
    if (url === sdkUrl || url.startsWith(base + '/') || !/^https?:/.test(url)) return route.continue();
    return route.abort();
  });
  for (const outcome of ['success','nofill','error']) {
    const tab = await context.newPage();
    // Each case starts a fresh wardrobe; the production game keeps its original save keys.
    await tab.addInitScript(() => localStorage.clear());
    const sdkResponse = tab.waitForResponse(response => response.url() === sdkUrl, {timeout:30000});
    await tab.goto(base + '/?gpx_ad=' + outcome);
    const response = await sdkResponse;
    assert.ok(response.ok(), 'SDK HTTP ' + response.status());
    report.sdkSha256 = sha(await response.body());
    await ready(tab);
    assert.equal(await tab.evaluate(() => typeof window.GamePix?.events?.on), 'function');
    assert.equal(await tab.evaluate(() => typeof window.MuseGamePix?.betweenChallenges), 'function');
    await tab.evaluate(() => {
      window.adResults = [];
      const original = GamePix.ads.interstitial;
      GamePix.ads.interstitial = async function(...args) {
        const result = await original.apply(this, args);
        adResults.push({success:result.success, message:result.message});
        return result;
      };
      window.adEvents = [];
      GamePix.events.on('pause', () => adEvents.push('pause'));
      GamePix.events.on('resume', () => adEvents.push('resume'));
    });
    await styleAndReveal(tab);
    await tab.locator('#next-level').click();
    await nextStory(tab);
    const flow = await tab.evaluate(() => ({results:adResults, events:adEvents, unlocked:!document.querySelector('main').inert}));
    assert.equal(flow.results.length, 1);
    assert.equal(flow.results[0].success, outcome === 'success', JSON.stringify(flow.results));
    assert.equal(flow.unlocked, true);
    if (outcome === 'success') assert.deepEqual(flow.events, ['pause','resume']);
    await tab.close();
    pass('Official SDK local mode: ' + outcome + ' returns the expected ad outcome and opens the next story');
  }
}

function watchErrors(context) {
  context.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
}

(async () => {
  fs.mkdirSync(evidence, {recursive:true});
  const manifest = gamepix.verify();
  Object.assign(report, {version:manifest.version, sourceCommit:manifest.sourceCommit, zipSha256:sha(fs.readFileSync(gamepix.zipPath))});
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-gamepix-test-'));
  try {
    const python = process.env.MUSE_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
    execFileSync(python, ['-m', 'zipfile', '-e', gamepix.zipPath, dir], {windowsHide:true});
    const entries = new Map(manifest.files.map(entry => [entry.file, entry]));
    for (const [file, entry] of entries) assert.equal(sha(fs.readFileSync(path.join(dir,file))), entry.sha256);
    const base = await serve((req,res) => {
      const file = new URL(req.url, 'http://localhost').pathname.slice(1) || 'index.html';
      if (!entries.has(file)) return res.writeHead(404).end();
      res.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'}).end(fs.readFileSync(path.join(dir,file)));
    });
    const parent = await serve((req,res) => {
      const url = new URL(req.url, 'http://localhost');
      const query = url.searchParams.toString();
      res.writeHead(200, {'Content-Type':'text/html'}).end('<iframe title="Game" sandbox="allow-scripts allow-same-origin allow-downloads" style="border:0;width:800px;height:450px" src="' + base + '/?' + query + '"></iframe>');
    });
    browser = await chromium.launch({headless:true, chromiumSandbox:true, ...(process.platform === 'win32' ? {executablePath:process.env.MUSE_BROWSER_EXECUTABLE || 'C:/Tools/ugchromium/app/chrome.exe'} : {})});
    report.browser = browser.version();
    const context = await browser.newContext({viewport:{width:1024,height:700}});
    watchErrors(context);
    if (official) await officialLocal(context, base, manifest.sdkUrl);
    else await contract(context, base, parent, manifest.sdkUrl);
    assert.deepEqual(report.errors, [], 'Unhandled page exceptions');
    report.passed = true;
  } finally {
    await browser?.close();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    fs.rmSync(dir, {recursive:true,force:true});
    fs.writeFileSync(path.join(evidence, suite + '.json'), JSON.stringify(report, null, 2) + '\n');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
