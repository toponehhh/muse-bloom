'use strict';
// Real input and viewport hit tests for CG's documented iframe sizes.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright'), { createServer } = require('./server');
const D = require('../js/data'), G = require('../js/game');
const out = path.join(__dirname, '../artifacts/quality');
fs.mkdirSync(out, { recursive: true });
const report = { version: require('../package.json').version, source: 'automated-check', humanParticipants: 0, checks: [], layouts: [], errors: [] };
const pass = message => { report.checks.push(message); console.log('PASS:', message); };
const sizes = [[907,510],[1216,684],[1077,606],[821,462],[1366,768],[1920,1080],
  [1536,864],[1280,720],[800,450],[1080,607],[320,568],[375,667],[390,844],[667,375]];
const requested=process.argv.find(arg=>arg.startsWith('--viewport='))?.slice(11);
const viewports=requested?sizes.filter(size=>size.join('x')===requested):sizes;
assert.ok(viewports.length,'Unknown viewport override');
const channel = process.env.MUSE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : 'chromium');
const server = createServer();
let browser;
async function equip(page, id) {
  await page.locator('[data-action="category"][data-category="' + G.byId[id].category + '"]').click();
  await page.locator('[data-action="equip"][data-item="' + id + '"]').click();
}
async function geometry(page) {
  return page.evaluate(() => {
    const rect = node => { const r = node.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const score = document.querySelector('[data-action="score"]'), s = rect(score);
    const hit = (node, x, y) => node.contains(document.elementFromPoint(x, y));
    const stage = rect(document.querySelector('.fitting-stage'));
    const first = document.querySelector('#item-grid [data-action="equip"]'), item = rect(first);
    const grid = rect(document.querySelector('#item-grid'));
    const x = item.left + item.width / 2;
    const top = Math.max(item.top, grid.top, 0);
    const bottom = Math.min(item.bottom, grid.bottom, innerHeight, s.top);
    return {
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
      revealVisible: s.top >= 0 && s.bottom <= innerHeight + 1 && hit(score, s.left+s.width/2, s.top+s.height/2),
      itemVisible: bottom-top >= 30 && hit(first, x, (top+bottom)/2),
      stageHeight: stage.height, gridHeight: grid.height,
      goals: [...document.querySelectorAll('.live-goal')].map(node => {
        const r = rect(node);
        return {size:r.height >= 44 && r.width >= 44, hit:hit(node,r.left+r.width/2,r.top+r.height/2)};
      }),
      points: {x, y:(top+bottom)/2}, score: s
    };
  });
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ headless:true, channel:channel === 'chromium' ? undefined : channel });
  for (const [width,height] of viewports) {
    const page = await browser.newPage({ viewport:{width,height}, deviceScaleFactor:1, reducedMotion:'reduce' });
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(url);
    await page.locator('.home-actions [data-action="play"]').click();
    // Capture geometry before scrolling or locator.click() can hide a layout problem.
    const initial = await geometry(page);
    report.layouts.push({width,height,...initial});
    await page.screenshot({path:path.join(out,`studio-${width}x${height}.png`)});
    assert.equal(initial.overflow, false, `${width}x${height}: horizontal overflow`);
    assert.ok(initial.revealVisible, `${width}x${height}: reveal is obscured`);
    assert.ok(initial.itemVisible, `${width}x${height}: no actionable clothing in the initial viewport`);
    assert.ok(initial.goals.every(goal => goal.size && goal.hit), `${width}x${height}: goals obscured or too small`);
    // Actual coordinate input: no automatic scrolling to rescue a hidden item.
    await page.mouse.click(initial.points.x, initial.points.y);
    assert.equal(await page.locator('#item-grid .selected').count(), 1);
    await page.locator('[data-action="undo"]').click();
    assert.equal(await page.locator('#item-grid .selected').count(), 0);
    if (width === 907) {
      await page.locator('#item-grid').evaluate(node => node.style.visibility = 'hidden');
      assert.equal((await geometry(page)).itemVisible, false, 'Hidden-item negative control must fail');
      await page.locator('#item-grid').evaluate(node => node.style.removeProperty('visibility'));
    }
    await page.close();
  }
  pass(report.layouts.length+' iframe/phone layouts: first-click clothing, goals and Reveal are visible and hit-testable at DPR 1');
  const page = await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(url); await page.locator('[data-action="play"]').click();
  await page.locator('[data-action="skip-guide"]').click();
  await page.locator('[data-action="score"]').click();
  assert.equal(await page.locator('.salon-result').count(),0);
  assert.equal(await page.locator('.category-tab.active').getAttribute('data-category'),'top');
  await equip(page,'dress_cute_01'); await equip(page,'shoes_casual_01');
  assert.equal(await page.locator('.live-goal.done').count(),2);
  assert.match(await page.locator('.live-score').getAttribute('aria-label'),/67 of 94/);
  await equip(page,'top_cozy_02');
  assert.match(await page.locator('.live-score').getAttribute('aria-label'),/0 of 94/);
  await page.locator('[data-action="undo"]').click();
  assert.equal(await page.locator('#avatar-slot [data-layer="dress_cute_01"]').count(),1);
  assert.equal(await page.locator('#avatar-slot [data-layer="top_cozy_02"]').count(),0);
  await page.locator('[data-action="clear"]').click();
  await page.locator('[data-action="undo"]').click();
  assert.match(await page.locator('.live-score').getAttribute('aria-label'),/67 of 94/);
  await page.locator('[data-action="score"]').click();
  await page.locator('.salon-result').waitFor();
  await page.locator('[data-action="retry-detail"]').click();
  assert.equal(await page.locator('.category-tab.active').getAttribute('data-category'),'hair');
  assert.ok(await page.locator('#item-grid .suggested').count() > 0);
  await equip(page,'hair_casual_01');
  assert.equal(await page.locator('.live-goal.done').count(),3);
  await page.locator('[data-action="score"]').click();
  await page.locator('.salon-result').waitFor();
  assert.equal(await page.locator('#score-number').innerText(),'94');
  await page.locator('[data-action="next"]').click();
  assert.ok(await page.locator('[data-action="undo"]').isDisabled(),'Undo cannot restore the previous challenge');
  pass('Live score, removing goals, dress/separate undo, clear undo, targeted restyling and per-challenge history work through real input');
  // Later levels must expose tags, including keyboard-accessible suggestions.
  const save=G.newSave();
  for(const theme of D.themes.slice(0,3))save.levels[theme.id]={best:94,rank:'S'};
  save.onboardingDone=true;
  await page.evaluate(save=>localStorage.setItem(MuseGame.SAVE_KEY,JSON.stringify(save)),save);
  await page.reload();await page.locator('[data-action="play"]').click();
  assert.match(await page.locator('h1').innerText(),/Gym Fit/);
  assert.equal(await page.locator('.live-goal').count(),3);
  await page.locator('.live-goal[data-goal="0"]').focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('.item-card.suggested .brief-matches').count() > 0);
  assert.match(await page.locator('.item-card.suggested').first().innerText(),/sporty/);
  await page.screenshot({path:path.join(out,'mood-guidance.png')});
  pass('Later challenges expose real mood tags and keyboard-operated suggestions');
  await page.close();
  assert.deepEqual(report.errors,[]);
  report.status='passed';
})().catch(error=>{report.status='failed';report.failure=error.stack;console.error(error);process.exitCode=1;})
  .finally(async()=>{
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
    await browser?.close();await new Promise(resolve=>server.close(resolve));
  });
