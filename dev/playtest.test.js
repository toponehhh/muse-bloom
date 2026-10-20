'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/playtest'),version=require('../package.json').version;
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
const report={version,source:'automated-check',humanParticipants:0,checks:[],errors:[]};
const pass=s=>{report.checks.push(s);console.log('PASS:',s);};
let browser;
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 const guide=pathToFileURL(path.join(root,'dist/playtest-v'+version+'/index.html')).href;
 await page.goto(guide);assert.ok(await page.locator('h1').isVisible());
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 // The delivered link launches the self-contained file, with isolated save mode.
 const opened=context.waitForEvent('page');await page.locator('.actions a').first().click();const game=await opened;
 await game.locator('.salon-home').waitFor();assert.ok(await game.evaluate(()=>MusePlaytest.active));
 await game.evaluate(()=>{
   localStorage.setItem('muse_bloom_playtest_v17',JSON.stringify({version:'1.7.0',participant:'PREVIOUS-ROUND'}));
   localStorage.setItem(MusePlaytest.recordKey,JSON.stringify({version:MusePlaytest.version,events:null}));
 });
 await game.reload();await game.locator('.salon-home').waitFor();
 const pid=await game.evaluate(()=>MusePlaytest.snapshot().participant);assert.match(pid,/^P-[A-Z0-9]{6}$/);
 assert.equal(await game.evaluate(()=>MusePlaytest.snapshot().version),version);
 assert.equal(await game.evaluate(()=>JSON.parse(localStorage.getItem('muse_bloom_playtest_v17')).participant),'PREVIOUS-ROUND');
 await game.locator('.home-actions [data-action="play"]').click();
 await game.locator('[data-action="category"][data-category="top"]').click();
 await game.locator('[data-item="top_casual_01"]').click();
 await game.reload();assert.equal(await game.evaluate(()=>MusePlaytest.snapshot().participant),pid);
 await game.close();
 const continued=context.waitForEvent('page');await page.locator('.actions a').nth(1).click();const same=await continued;
 await same.locator('.salon-home').waitFor();assert.equal(await same.evaluate(()=>MusePlaytest.snapshot().participant),pid);await same.close();
 pass('Offline kit opens the real game; malformed trial data recovers; new/continue links and reload keep an isolated participant session');
 await page.locator('details').nth(1).locator('summary').click();
 await page.locator('[name="testType"]').selectOption('automated');
 await page.locator('[name="participant"]').fill('QA-NOT-A-PARTICIPANT');
 await page.locator('[name="device"]').selectOption({index:3});
 for(const key of ['clarity','readability','visuals','enjoyment'])await page.locator('[name="'+key+'"]').selectOption('4');
 await page.locator('[name="continue"]').selectOption('Maybe');
 await page.locator('[name="observerNotes"]').fill('Automated form test; not a participant response.');
 const downloading=page.waitForEvent('download');await page.locator('#fallback [type="submit"]').click();
 const artifact=await downloading,feedback=JSON.parse(fs.readFileSync(await artifact.path(),'utf8'));
 assert.equal(feedback.version,version,'Guide and playable game must label the same release');
 assert.equal(feedback.source,'automated-check');assert.equal(feedback.testType,'automated');assert.equal(feedback.feedback.readability,'4');assert.deepEqual(feedback.events,[]);
 // Test the form, but never persist its synthetic ratings as human feedback.
 pass('Backup observation form downloads valid JSON with four ratings and no fabricated action log');
 await page.screenshot({path:path.join(out,'playtest-guide.png'),fullPage:true});await context.close();
 const fixtureDir=fs.mkdtempSync(path.join(out,'synthetic-summary-'));
 const write=(name,data)=>fs.writeFileSync(path.join(fixtureDir,name+'.json'),JSON.stringify(data));
 const fixture={version:'1.7.0',source:'participant-session',testType:'human',participant:'SYNTHETIC-01',exportedAt:'2026-10-19T01:00:00Z',feedback:{clarity:'4',continue:'Maybe'},events:[{action:'look-complete',level:1,score:94,at:'2026-10-19T00:59:00Z'},{action:'look-complete',level:2,score:0,at:'2026-10-19T01:00:00Z'}]};
 write('older',fixture);write('newer',{...fixture,source:'manual-feedback',exportedAt:'2026-10-19T02:00:00Z',feedback:{clarity:'5',continue:'Yes'},events:[]});
 write('automated',{...fixture,participant:'QA-ONLY',source:'automated-check',feedback:{clarity:'1'}});
 const summarize=()=>{execFileSync(process.execPath,[path.join(__dirname,'summarize-playtest.js'),fixtureDir]);return JSON.parse(fs.readFileSync(path.join(fixtureDir,'playtest-summary.json'),'utf8'));};
 try{
   const merged=summarize();assert.equal(merged.participants,1);assert.equal(merged.ratings.clarity.mean,5);assert.equal(merged.ratings.visuals.mean,null);assert.equal(merged.wouldContinue.Yes,1);assert.deepEqual(merged.summaries[0].completedLevels,[1]);
   fs.unlinkSync(path.join(fixtureDir,'older.json'));fs.unlinkSync(path.join(fixtureDir,'newer.json'));
   const empty=summarize();assert.equal(empty.participants,0);assert.equal(empty.status,'awaiting_participants');
   pass('Summary deduplicates exports, excludes automation, keeps missing ratings null, and reports zero participants when no real responses exist');
 }finally{for(const f of fs.readdirSync(fixtureDir))fs.unlinkSync(path.join(fixtureDir,f));fs.rmdirSync(fixtureDir);}
 assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{
 await browser?.close();fs.writeFileSync(path.join(out,'playtest-kit-'+channel+'.json'),JSON.stringify(report,null,2));
});
