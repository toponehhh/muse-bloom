'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright'),{createServer}=require('./server');
const G=require('../js/game'),D=require('../js/data');
const out=path.resolve(__dirname,'../artifacts/playtest-ui');
const report={source:'automated-check',humanParticipants:0,layouts:[],checks:[],errors:[]};
const views=[[320,568],[375,667],[390,844],[428,926],[667,375],[1024,540],[1440,800],[1440,900]];
const server=createServer();let browser;
const pass=s=>{report.checks.push(s);console.log('PASS:',s);};
async function geometry(page,selector){
  return page.locator(selector).evaluate(n=>{
    const r=n.getBoundingClientRect();
    const points=[[r.left+r.width/2,r.top+4],[r.left+r.width/2,r.bottom-4],[r.left+4,r.top+r.height/2],[r.right-4,r.top+r.height/2]];
    return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,
      inViewport:r.top>=0&&r.left>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,
      reachable:points.every(([x,y])=>{const hit=document.elementFromPoint(x,y);return hit&&(hit===n||n.contains(hit));})};
  });
}
async function fullyVisible(page,selector,label){const r=await geometry(page,selector);assert.ok(r.inViewport&&r.reachable,label+': '+JSON.stringify(r));return r;}
async function newPage(base,width,height,level=1){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',acceptDownloads:true});
  page.on('pageerror',e=>report.errors.push(e.message));
  if(level===4){const save=G.newSave();for(const theme of D.themes.slice(0,3))save.levels[theme.id]={best:94,rank:'S'};save.onboardingDone=true;
    await page.addInitScript(save=>localStorage.setItem('muse_bloom_playtest_v17_save',JSON.stringify(save)),save);
  }
  await page.goto(base+'?playtest=1&qa=1');await page.locator('.salon-home').waitFor();return page;
}
async function avatarClearOfFooter(page){
  return page.evaluate(()=>{
    const svg=document.querySelector('#avatar-slot svg'),matrix=svg.getScreenCTM(),footer=document.querySelector('.wardrobe-footer').getBoundingClientRect();
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const rect=(x,y,w,h)=>{const a=new DOMPoint(x,y).matrixTransform(matrix),b=new DOMPoint(x+w,y+h).matrixTransform(matrix);return {left:a.x,top:a.y,right:b.x,bottom:b.y};};
    const head=rect(180,0,360,280),feet=rect(250,1130,220,148);
    const visible=r=>r.top>=-.5&&r.bottom<=innerHeight+.5&&r.left>=-.5&&r.right<=innerWidth+.5;
    return visible(head)&&visible(feet)&&!overlaps(footer,head)&&!overlaps(footer,feet);
  });
}
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium');
  browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});
  for(const [width,height] of views){
    for(const level of [1,4]){
      const page=await newPage(base+'/',width,height,level);
      await page.locator('.home-actions [data-action="play"]').click();
      await page.evaluate(()=>scrollTo(0,0));
      const label=width+'x'+height+'/level-'+level;
      // Deliberately do not scroll the action into view: that hid the original bug.
      const reveal=await fullyVisible(page,'[data-action="score"]',label+'/initial-reveal');
      assert.ok(await avatarClearOfFooter(page),label+'/footer covers head or shoes');
      const cards=await page.locator('#item-grid .item-card').evaluateAll(nodes=>nodes.map(n=>({card:n.getBoundingClientRect().height,image:n.querySelector('.item-picture').getBoundingClientRect().height})));
      assert.ok(cards.every(n=>n.card>=80&&n.image>=40),label+'/collapsed clothing cards');
      if(width===667){
        for(const character of D.characters){
          await page.locator('[data-action="characters"]').click();
          await page.locator('#dialog [data-action="character"][data-character="'+character.id+'"]').click();
          await page.locator('#dialog [data-action="close"]').click();
          await page.evaluate(()=>scrollTo(0,0));
          assert.ok(await avatarClearOfFooter(page),label+'/'+character.id+'/head and feet must fit the viewport');
        }
      }
      const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('main *,header *')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.right>innerWidth+1&&getComputedStyle(n).position!=='absolute';}).slice(0,12).map(n=>({tag:n.tagName,cls:n.className,right:n.getBoundingClientRect().right}))}));
      assert.ok(overflow.scrollWidth<=width,label+'/horizontal overflow '+JSON.stringify(overflow));
      if(level===4){
        const target=await geometry(page,'.wardrobe-toolbar label');assert.ok(target.width>=44&&target.height>=44,label+'/small touch target');
        await page.locator('.wardrobe-toolbar label').click();assert.ok(await page.locator('#show-locked').isChecked());
      }
      if(width===390&&level===1){
        await page.locator('[data-action="score"]').evaluate(n=>n.style.cssText='position:fixed;bottom:-20px');
        assert.equal((await geometry(page,'[data-action="score"]')).inViewport,false,'The check must detect a clipped button');
        await page.locator('[data-action="score"]').evaluate(n=>n.removeAttribute('style'));
        await page.locator('[data-action="category"][data-category="dress"]').click();
        await page.locator('[data-item="dress_cute_01"]').click();
        const ratio=await page.locator('#dress-notice').evaluate(n=>{
          const s=getComputedStyle(n),lum=c=>c.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
          const a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
        });
        assert.ok(ratio>=4.5,'Dress replacement instructions need readable contrast');
        await page.evaluate(()=>scrollTo(0,0));await fullyVisible(page,'[data-action="score"]',label+'/dress-reveal');
        assert.ok(await avatarClearOfFooter(page));
      }
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:path.join(out,'studio-'+label.replace('/','-')+'.png')});
      report.layouts.push({label,reveal});await page.close();
    }
    for(const online of [false,true]){
      const page=await newPage(base+(online?'/dist/cloudflare/playtest/Muse-Bloom.html':'/'),width,height);
      if(online)await page.route('**/api/feedback',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"test unavailable"}'}));
      await page.locator('[data-action="feedback"]').first().click();
      assert.equal(await page.locator('.feedback-fields').evaluate(n=>n.scrollTop),0);
      const label=width+'x'+height+'/'+(online?'online':'offline');
      const button=await fullyVisible(page,'#playtest-feedback [type="submit"]',label+'/initial-feedback');
      assert.equal(await page.locator('[name="testType"]').inputValue(),'automated');
      for(const field of ['clarity','readability','visuals','enjoyment'])await page.locator('[name="'+field+'"]').selectOption('4');
      await page.locator('[name="continue"]').selectOption('Maybe');
      await page.locator('[name="favorite"]').fill('Automated layout check.');
      if(online){
        await page.locator('[name="consent"]').check();
        await page.locator('#playtest-feedback [type="submit"]').click();
        await page.locator('.feedback-status[data-state="error"]').waitFor();
        await fullyVisible(page,'#playtest-feedback [type="submit"]',label+'/retry');
        await fullyVisible(page,'.feedback-backup',label+'/backup');
      }else{
        const download=page.waitForEvent('download');await page.locator('#playtest-feedback [type="submit"]').click();
        const record=JSON.parse(fs.readFileSync(await (await download).path(),'utf8'));assert.equal(record.testType,'automated');
      }
      await page.locator('.feedback-fields').evaluate(n=>n.scrollTop=0);
      await fullyVisible(page,'#playtest-feedback [type="submit"]',label+'/after-feedback');
      await page.screenshot({path:path.join(out,'feedback-'+label.replace('/','-')+'.png')});
      report.layouts.push({label,button});await page.close();
    }
  }
  pass('32 viewport/state cases: initial actions, retries and downloads stay visible; no head/feet overlap; 44px touch target and readable dress instructions');
  const normal=await browser.newPage({viewport:{width:390,height:844}});
  await normal.goto(base+'/?playtest=1&fresh=1');await normal.locator('.salon-home').waitFor();
  const pid=await normal.evaluate(()=>MusePlaytest.snapshot().participant);
  await normal.locator('[data-action="feedback"]').click();assert.equal(await normal.locator('[name="testType"]').inputValue(),'');
  assert.equal(await normal.locator('[name="testType"]').evaluate(n=>n.checkValidity()),false);
  await normal.goto(base+'/?playtest=1&qa=1');await normal.locator('.salon-home').waitFor();
  assert.equal(await normal.evaluate(()=>MusePlaytest.snapshot().participant),pid);
  assert.equal(await normal.evaluate(()=>MusePlaytest.snapshot().source),'automated-check');
  await normal.goto(base+'/dist/cloudflare/playtest/index.html?qa=1');
  assert.ok(await normal.locator('.actions a').first().evaluate(a=>new URL(a.href).searchParams.get('qa')==='1'));
  await normal.close();pass('Missing type requires a choice; QA marks resumed sessions and propagates through guide links');
  assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(async e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;
  const page=browser?.contexts().flatMap(c=>c.pages()).at(-1);if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
}).finally(async()=>{
  await browser?.close();server.close();fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
});
