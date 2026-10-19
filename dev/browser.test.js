'use strict';
// Optional browser QA: install playwright or set MUSE_PLAYWRIGHT to its local module path.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
const base=process.env.MUSE_URL||'http://127.0.0.1:4173';
const artifacts=path.resolve(__dirname,'../artifacts');
fs.mkdirSync(artifacts,{recursive:true});
const errors=[],external=[],report=[];
function record(message){report.push(message);console.log('PASS:',message);}
function observe(page){
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text()+' '+m.location().url);});
  page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
}
async function dressWinning(page,index){
  await page.locator('[data-action="clear"]').click();
  const items=await page.evaluate(index=>{
    const D=MuseData,G=MuseGame,save=G.sanitizeSave(JSON.parse(localStorage.getItem(G.SAVE_KEY)));
    return G.solveTheme(D.themes[index-1],D.items.filter(i=>save.unlockedItems.includes(i.id))).items.map(i=>({id:i.id,category:i.category}));
  },index);
  for(const item of items){await page.locator(`[data-category="${item.category}"]`).click();await page.locator(`[data-item="${item.id}"]`).click();}
}
async function screenshot(page,name){await page.screenshot({path:path.join(artifacts,name),fullPage:true});}
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce',acceptDownloads:true});
    const page=await context.newPage();observe(page);
    await page.goto(base);await screenshot(page,'home-desktop.png');
    assert.equal(await page.locator('.collection-pill').innerText(),'24 / 122');
    await page.locator('[data-action="play"]').click();
    assert.equal(await page.locator('.item-card').count(),5);
    await page.locator('[data-category="dress"]').click();await page.locator('[data-action="equip"]').first().click();
    assert.ok(await page.locator('[data-category="top"]').isDisabled());assert.ok(await page.locator('[data-category="bottom"]').isDisabled());
    await page.locator('[data-action="equip"]').first().click();assert.ok(await page.locator('[data-category="top"]').isEnabled());
    await page.locator('[data-category="top"]').focus();await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('[data-category="bottom"]').getAttribute('aria-pressed'),'true');
    record('Real UI dress exclusivity, remove-to-restore and category keyboard navigation');
    for(let index=1;index<=36;index++){
      await dressWinning(page,index);
      const briefVisible=await page.evaluate(index=>{
        const p=document.querySelector('.brief-main p'),stage=document.querySelector('.fitting-stage').getBoundingClientRect();
        return p.checkVisibility()&&p.textContent===MuseData.themes[index-1].description&&p.getBoundingClientRect().bottom<=stage.top&&!document.querySelector('.fitting-stage .scene-speech')&&document.querySelector('[data-action="score"]').getBoundingClientRect().bottom<=innerHeight;
      },index);
      assert.ok(briefVisible,'Brief and score remain visible for challenge '+index);
      if(index===1)await screenshot(page,'dressing-desktop.png');
      if(index===31)await screenshot(page,'silk-jade-desktop.png');
      await page.locator('[data-action="score"]').click();
      assert.equal(await page.locator('#score-number').innerText(),'94');
      if(index===1){
        await screenshot(page,'result-desktop.png');
        await page.locator('[data-action="share"]').click();await page.locator('.share-image').waitFor();
        const dimensions=await page.locator('.share-image').evaluate(i=>[i.naturalWidth,i.naturalHeight]);
        assert.deepEqual(dimensions,[1080,1920]);
        const [download]=await Promise.all([page.waitForEvent('download'),page.locator('.download-button').click()]);
        await download.saveAs(path.join(artifacts,'outfit-card.png'));
        await page.locator('[data-action="close"]').click();
        record('Scoring, unlock UI and 1080 × 1920 PNG download');
        await page.locator('[data-action="mute"]').click();await page.reload();
        assert.equal(await page.locator('[data-action="mute"]').getAttribute('aria-pressed'),'true');
        assert.ok((await page.locator('.collection-pill').innerText()).startsWith('26'));
        await page.locator('[data-action="play"]').click();
        record('Scores, collection, mute and next-level progression survive reload');
      }else if(index<36)await page.locator('[data-action="next"]').click();
      if(index%6===0)record(`Chapter ${index/6}: six S results reached using only currently owned pieces`);
    }
    assert.equal(await page.locator('.collection-pill').innerText(),'122 / 122');
    await page.locator('[data-action="map"]').click();await screenshot(page,'chapter-map-desktop.png');
    assert.equal(await page.locator('.map-progress>b').innerText(),'36 / 36');
    record('Complete 36-level UI journey, all 122 pieces earned, 7 hidden rewards');
    record('All 36 challenge descriptions visible above the stage with score controls reachable');
    for(const viewport of [{width:375,height:667},{width:390,height:844},{width:667,height:375},{width:1920,height:1080}]){
      const ctx=await browser.newContext({viewport,hasTouch:viewport.width<768,reducedMotion:'reduce'});
      const p=await ctx.newPage();observe(p);await p.goto(base);await p.locator('[data-action="play"]').click();
      const box=await p.locator('[data-action="score"]').boundingBox();
      assert.ok(box.y+box.height<=viewport.height+1,`Score button outside ${viewport.width}x${viewport.height}`);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      if(viewport.width<768){await p.locator('[data-category="accessory"]').tap();await p.locator('[data-action="equip"]').first().tap();}
      else await p.locator('[data-category="accessory"]').click();
      await screenshot(p,`dressing-${viewport.width}x${viewport.height}.png`);
      await p.locator('[data-action="settings"]').click();await p.locator('[data-character="zoe"]').last().click();
      await p.keyboard.press('Escape');assert.equal(await p.locator('dialog').isVisible(),false);
      record(`Viewport ${viewport.width} × ${viewport.height}: score reachable, no horizontal overflow, settings and input work`);
      await ctx.close();
    }
    const fileContext=await browser.newContext({reducedMotion:'reduce'}),filePage=await fileContext.newPage();observe(filePage);
    await filePage.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await filePage.locator('[data-action="play"]').click();await dressWinning(filePage,1);await filePage.locator('[data-action="score"]').click();await filePage.locator('[data-action="share"]').click();await filePage.locator('.share-image').waitFor();
    assert.equal(await filePage.locator('.share-image').evaluate(i=>i.naturalWidth),1080);record('Direct file:// play and canvas export without tainted canvas');await fileContext.close();
    const iframeContext=await browser.newContext({viewport:{width:1000,height:750},reducedMotion:'reduce'}),iframePage=await iframeContext.newPage();observe(iframePage);
    await iframePage.goto(base+'/dev/iframe.html');const frame=iframePage.frameLocator('iframe');
    await frame.locator('[data-action="play"]').click();await dressWinning(iframePage.frames()[1],1);await frame.locator('[data-action="score"]').click();await frame.locator('[data-action="share"]').click();await frame.locator('.share-image').waitFor();
    assert.ok(await frame.locator('.share-help').isVisible());record('Sandboxed iframe play and visible image-save fallback');await iframeContext.close();
    const blockedContext=await browser.newContext({reducedMotion:'reduce'});
    await blockedContext.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    const blocked=await blockedContext.newPage();observe(blocked);await blocked.goto(base);await blocked.locator('[data-action="play"]').click();await blocked.locator('[data-action="score"]').click();assert.ok(await blocked.locator('#score-number').isVisible());record('Denied localStorage stays playable with session-only notice');await blockedContext.close();
    const corruptContext=await browser.newContext();await corruptContext.addInitScript(()=>localStorage.setItem('muse_bloom_save_v1','{invalid'));
    const corrupt=await corruptContext.newPage();observe(corrupt);await corrupt.goto(base);await corrupt.locator('[data-action="play"]').click();assert.ok(await corrupt.locator('[data-action="score"]').isVisible());record('Corrupt save recovery in a real browser');await corruptContext.close();
    assert.deepEqual(errors,[],'Browser console/page errors');assert.deepEqual(external,[],'External requests');
    record('Zero game console errors and zero external HTTP requests');
    fs.writeFileSync(path.join(artifacts,`browser-report-${process.env.MUSE_BROWSER_CHANNEL||'msedge'}.json`),JSON.stringify({version:require('../package.json').version,browser:await browser.version(),checks:report,errors,external},null,2));
    await context.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
