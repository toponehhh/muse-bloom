'use strict';
// Actual browser rendering, input, pixels and reviewed screenshot baselines.
// Run: npm run test:ui. Opt in to changing baselines: npm run test:ui:update.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.MUSE_PLAYWRIGHT || 'playwright');
const { createServer } = require('./server.js');
const D = require('../js/data.js'), G = require('../js/game.js');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts', 'ui'), baselines = path.join(__dirname, 'visual-baselines');
fs.mkdirSync(out, { recursive: true });
const update = process.argv.includes('--update-baselines');
if (update) fs.mkdirSync(baselines, { recursive: true });
const report = { version:require('../package.json').version, checks: [], errors: [], snapshots: [], itemCount: 0, rasterSamples: 0, baselinesUpdated: update, channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium') };
function pass(text) { report.checks.push(text); console.log('PASS:', text); }
const fullSave = G.newSave();
fullSave.unlockedItems = D.items.map(i => i.id); fullSave.muted = true;
fullSave.levels=Object.fromEntries(D.themes.map(t=>[t.id,{best:94,rank:'S'}]));
const specimens = {
  'vest': ['hair_sporty_04', 'top_edgy_05', 'shoes_casual_01'],
  'long-sleeves': ['hair_sporty_04', D.items.find(i => i.shape === 'cardigan').id, 'bottom_casual_01'],
  'dress': ['hair_sporty_04', D.items.find(i => i.category === 'dress' && i.shape === 'puff').id],
  'hanfu': [D.items.find(i => i.category === 'hair' && i.shape === 'pinbun').id, D.items.find(i => i.category === 'dress' && i.shape === 'hanfu').id],
  'qipao': ['hair_sporty_04', D.items.find(i=>i.category==='dress'&&i.shape==='qipao').id],
  'tee-trousers': ['top_casual_01','bottom_casual_01','shoes_casual_01'],
  'skirt-boots': ['top_cozy_02','bottom_cute_02',D.items.find(i=>i.category==='shoes'&&i.shape==='boot').id],
  'heart-bag': ['hair_casual_01','top_edgy_05',D.items.find(i=>i.category==='bottom'&&i.shape==='shorts').id,'shoes_casual_01','accessory_cute_03'],
  'tote': ['hair_sporty_04','top_cozy_02','bottom_casual_01','accessory_casual_01'],
  'two-handheld': ['accessory_cute_03','accessory_casual_01'],
  'crossbody': ['top_casual_01','bottom_casual_01','accessory_street_06'],
  'studio-basics': []
};
async function equip(page, ids) {
  await page.locator('[data-action="clear"]').click();
  for (const id of ids) {
    await page.locator(`[data-category="${G.byId[id].category}"]`).click();
    await page.locator(`[data-item="${id}"]`).click();
  }
}
async function installPixelChecks(page) {
  await page.evaluate(() => {
    window.uiProportionCheck = function() {
      const avatar=document.querySelector('#avatar-slot .avatar');
      const face=avatar.querySelector('[data-feature="face"]').getBoundingClientRect();
      const body=avatar.querySelector('[data-anatomy="body"]').getBoundingClientRect();
      const headToBody=face.height/body.height,bodyWidthToHeight=body.width/body.height;
      // Independent rendered measurements reject the previous tall, narrow rig.
      if(headToBody<.29||headToBody>.315||bodyWidthToHeight<.46||bodyWidthToHeight>.49)
        throw Error('Character proportions outside reviewed range: '+JSON.stringify({headToBody,bodyWidthToHeight}));
      return {headToBody,bodyWidthToHeight};
    };
    window.uiRaster = async function(svg) {
      const image = new Image(); image.src = MuseArt.uri(svg); await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = 720; canvas.height = 1280;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0, 720, 1280);
      return { canvas, ctx, pixels: ctx.getImageData(0, 0, 720, 1280).data };
    };
    window.uiPaintCheck = async function(itemId) {
      const avatar = document.querySelector('#avatar-slot .avatar');
      const svg = avatar?.querySelector(':scope > svg');
      if (!svg) throw new Error('Avatar must be a synchronously painted SVG, without async image layers');
      if (!svg.querySelector('[data-layer="base"]')) throw new Error('Base character missing');
      const rect = svg.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 100) throw new Error('Avatar collapsed');
      if (![avatar,svg].every(n=>n.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))) throw new Error('Avatar hidden');
      const { pixels } = await uiRaster(new XMLSerializer().serializeToString(svg));
      const alpha = (x, y) => pixels[(Math.round(y) * 720 + Math.round(x)) * 4 + 3];
      // Face, neck, torso, hips, both legs, hands and feet must remain painted.
      for (const [x,y] of [[360,245],[360,337],[360,450],[340,590],[380,590],[330,680],[390,680],[326,900],[394,900],[326,1110],[394,1110],[237,751],[483,751],[326,1178],[394,1178]]) {
        if (alpha(...MuseArt.rigPoint(x,y,y<330?'head':'body')) < 250) throw new Error(`Blank body at ${x},${y}, item=${itemId || 'empty'}`);
      }
      const chin=MuseArt.rigPoint(360,312,'head'),neck=MuseArt.rigPoint(360,344);
      for(let t=0;t<=1;t+=.1)if(alpha(chin[0]+(neck[0]-chin[0])*t,chin[1]+(neck[1]-chin[1])*t)<250)
        throw new Error('Blank body between tilted head and neck');
      if (itemId) {
        const item = MuseGame.byId[itemId];
        const layer = svg.querySelector(`[data-layer="${itemId}"]`);
        if (!layer) throw new Error('Selected item missing from the painted avatar: '+itemId);
        const garment = (await uiRaster(MuseArt.fittedItemSvg(item))).pixels;
        const points = [];
        if (['top','dress'].includes(item.category)) points.push([335,450],[385,450],[330,595],[390,595]);
        if (item.category === 'bottom') points.push([325,650],[395,650],[325,720],[395,720]);
        if (item.category === 'top' && ['cardigan','sweater','hoodie','jacket','blazer','frog','mandarin','blouse'].includes(item.shape)) {
          points.push([241,650],[266,650],[479,650],[454,650]);
        }
        for (const [x,y] of points) {
          const [px,py]=MuseArt.rigPoint(x,y).map(Math.round);
          if (garment[(py*720+px)*4+3] < 250) throw new Error(`Garment does not fit body at ${x},${y}: ${itemId}`);
        }
      }
      return pixels.length;
    };
    window.uiFaceCheck = async function() {
      const svg=document.querySelector('#avatar-slot .avatar > svg');
      const skin=MuseData.skins.find(s=>s.id===document.querySelector('.skin-selector [aria-pressed="true"]').dataset.skin);
      const actual=(await uiRaster(new XMLSerializer().serializeToString(svg))).pixels;
      const reference=(await uiRaster(MuseArt.avatarSvg(skin,[]))).pixels;
      for(const [x,y] of [[328,239],[394,239],[355,260],[360,291]])for(let c=0;c<4;c++){
        const [px,py]=MuseArt.rigPoint(x,y,'head').map(Math.round);
        const i=(py*720+px)*4+c;if(actual[i]!==reference[i])throw Error('Face feature obscured at '+x+','+y);
      }
    };
    window.uiExportCheck = async function() {
      const svg = document.querySelector('#avatar-slot .avatar > svg');
      const ids = [...svg.querySelectorAll(':scope > [data-layer]')].map(n=>n.dataset.layer).filter(id=>MuseGame.byId[id]);
      const outfit = MuseGame.emptyOutfit();
      for (const id of ids) { const i = MuseGame.byId[id]; if(i.category==='accessory')outfit.accessory.push(id);else outfit[i.category]=id; }
      const skin = document.querySelector('.skin-selector [aria-pressed="true"]').dataset.skin;
      const expected = (await uiRaster(new XMLSerializer().serializeToString(svg))).pixels;
      const canvas = document.createElement('canvas'); canvas.width=720;canvas.height=1280;
      // Use the same canvas backend for both rasterizations (GPU/CPU edges can differ).
      const ctx=canvas.getContext('2d',{willReadFrequently:true});await MuseShare.drawAvatar(ctx,outfit,skin,0,0,720,1280);
      const actual=ctx.getImageData(0,0,720,1280).data;
      for(let i=0;i<actual.length;i++)if(actual[i]!==expected[i])throw new Error('Export differs from visible avatar at byte '+i);
    };
  });
}
async function paint(page, itemId) { await page.evaluate(id=>uiPaintCheck(id), itemId); report.rasterSamples++; }
async function snapshot(page, name) {
  // Only the vector avatar: no platform-dependent font rendering in baselines.
  const image = await page.locator('#avatar-slot .avatar').screenshot({ animations: 'disabled', style:'#avatar-slot .avatar{background:#f3edfa;filter:none}.toast,.skin-selector,.stage-label,.stage-spark,.stage-side,.studio-lights,.scene-speech,.vanity-rim{visibility:hidden!important}' });
  return compareSnapshot(page,name,image);
}
async function closeup(page,name,box,width,height) {
  const data=await page.evaluate(async({box,width,height})=>{
    const svg=document.querySelector('#avatar-slot .avatar > svg').cloneNode(true);
    svg.setAttribute('viewBox',box);svg.setAttribute('width',width);svg.setAttribute('height',height);
    const image=new Image();image.src=MuseArt.uri(new XMLSerializer().serializeToString(svg));await image.decode();
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#f3edfa';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0);
    return canvas.toDataURL('image/png').split(',')[1];
  },{box,width,height});
  return compareSnapshot(page,name,Buffer.from(data,'base64'));
}
async function compareSnapshot(page,name,image) {
  const filename = path.join(baselines, name+'.png');
  fs.writeFileSync(path.join(out,name+'.png'),image);
  if(update) { fs.writeFileSync(filename,image); report.snapshots.push({name,updated:true}); return; }
  assert.ok(fs.existsSync(filename),'Missing reviewed baseline: '+filename);
  const comparison = await page.evaluate(async({actual,expected})=>{
    const load=async src=>{const image=new Image();image.src=src;await image.decode();return image;};
    const a=await load(actual),b=await load(expected);
    if(a.width!==b.width||a.height!==b.height)return {differentSize:true};
    const canvas=document.createElement('canvas');canvas.width=a.width;canvas.height=a.height;const ctx=canvas.getContext('2d');
    ctx.drawImage(a,0,0);const ad=ctx.getImageData(0,0,a.width,a.height);ctx.clearRect(0,0,a.width,a.height);ctx.drawImage(b,0,0);const bd=ctx.getImageData(0,0,a.width,a.height);
    let changed=0;
    for(let i=0;i<ad.data.length;i+=4){
      const differs=[0,1,2,3].some(c=>Math.abs(ad.data[i+c]-bd.data[i+c])>20);
      if(differs)changed++;ad.data.set(differs?[235,30,110,255]:[245,245,240,255],i);
    }
    ctx.putImageData(ad,0,0);
    return {ratio:changed/(a.width*a.height),diff:canvas.toDataURL('image/png')};
  },{actual:'data:image/png;base64,'+image.toString('base64'),expected:'data:image/png;base64,'+fs.readFileSync(filename).toString('base64')});
  if(comparison.differentSize || comparison.ratio > .005) {
    if(comparison.diff)fs.writeFileSync(path.join(out,name+'-diff.png'),Buffer.from(comparison.diff.split(',')[1],'base64'));
    assert.fail(`Visual regression ${name}: ${JSON.stringify({differentSize:comparison.differentSize,ratio:comparison.ratio})}`);
  }
  report.snapshots.push({name,changedRatio:comparison.ratio});
}
async function run() {
  const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let browser;
  async function newPage(viewport={width:1440,height:900},url=base,motion='no-preference') {
    const context=await browser.newContext({viewport,reducedMotion:motion,hasTouch:viewport.width<768});
    await context.addInitScript(({key,save})=>{try{localStorage.setItem(key,JSON.stringify(save));}catch{}},{key:G.SAVE_KEY,save:fullSave});
    const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
    await page.goto(url);await page.locator('[data-action="play"]').click();await installPixelChecks(page);
    return page;
  }
  try {
    browser=await chromium.launch({headless:true,channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
    report.browser=await browser.version();
    const page=await newPage();
    assert.equal(G.byId[D.defaultHair].shape,'airypony');assert.ok(G.starterIds.includes(D.defaultHair));
    assert.equal(await page.locator(`#avatar-slot [data-layer="${D.defaultHair}"]`).count(),1);
    report.proportions=await page.evaluate(()=>uiProportionCheck());
    assert.ok(await page.evaluate(()=>{
      const nodes=[...document.querySelectorAll('#avatar-slot [data-anatomy]')];
      const transforms=nodes.map(n=>n.getAttribute('transform'));
      try{
        for(const prior of [null,{head:'matrix(1.27 0 0 1.27 -97.2 31.7)',body:'matrix(1.26 0 0 .86 -93.6 167)'}]){
          nodes.forEach(n=>prior?n.setAttribute('transform',prior[n.dataset.anatomy]):n.removeAttribute('transform'));
          let rejected=false;try{uiProportionCheck();}catch(e){rejected=e.message.includes('proportions');}
          if(!rejected)return false;
        }
        return true;
      }
      finally{nodes.forEach((n,i)=>n.setAttribute('transform',transforms[i]));}
    }),'Restoring either the tall original or broad v1.3.1 proportions must fail');
    pass('Default is an unlocked ribbon ponytail; rendered head/body ratios match the reviewed softer silhouette, and old proportions fail');
    await page.evaluate(()=>{window.originalAvatar=document.querySelector('#avatar-slot .avatar');window.originalBase=originalAvatar.querySelector('[data-layer="base"]');});
    await page.locator('[data-action="clear"]').click();
    assert.ok(await page.evaluate(()=>originalAvatar===document.querySelector('#avatar-slot .avatar')),'Clearing must preserve the visible avatar DOM');
    await paint(page);
    assert.ok(await page.evaluate(()=>originalBase===document.querySelector('[data-layer="base"]')),'Clearing must preserve the base layer');
    await page.evaluate(async()=>{window.uiEmptyPixels=(await uiRaster(new XMLSerializer().serializeToString(document.querySelector('#avatar-slot svg')))).pixels;});
    pass('Clear preserves the avatar and base; head, torso, limbs, hands and feet remain painted');
    const detected=await page.evaluate(async()=>{
      const base=document.querySelector('[data-layer="base"]');base.setAttribute('display','none');
      try { await uiPaintCheck();return false; } catch(error) {return error.message.includes('Blank body');}
      finally {base.removeAttribute('display');}
    });
    assert.ok(detected,'A deliberately hidden base must fail the paint assertion');
    await page.evaluate(()=>{
      const holder=document.createElement('div');holder.innerHTML=MuseUI.avatar(MuseGame.emptyOutfit(),'deep')+MuseUI.avatar(MuseGame.emptyOutfit(),'porcelain');document.body.append(holder);
      try{
        const ids=[...document.querySelectorAll('[id]')].map(n=>n.id);
        if(new Set(ids).size!==ids.length)throw Error('SVG lighting IDs collide between avatars');
        for(const svg of holder.querySelectorAll('.avatar > svg'))for(const node of svg.querySelectorAll('[fill],[filter],[clip-path]')){
          const references=(node.getAttribute('fill')||'')+(node.getAttribute('filter')||'')+(node.getAttribute('clip-path')||'');
          for(const match of references.matchAll(/url\(#([^)]+)\)/g))if(!svg.querySelector(`[id="${match[1]}"]`))throw Error('Material reference escapes avatar');
        }
      }finally{holder.remove();}
    });
    pass('Multiple skin tones have independent SVG material/filter namespaces');
    const thumbnails=await page.evaluate(()=>MuseData.items.map(item=>{
      const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-5000px;top:0';holder.innerHTML=MuseArt.itemSvg(item,true);document.body.append(holder);
      const svg=holder.firstElementChild,b=svg.getBBox(),v=svg.viewBox.baseVal;
      const fits=b.x>=v.x&&b.y>=v.y&&b.x+b.width<=v.x+v.width&&b.y+b.height<=v.y+v.height;
      holder.remove();return {id:item.id,fits};
    }));
    assert.deepEqual(thumbnails.filter(t=>!t.fits),[],'Clipped wardrobe thumbnails');
    pass('Blank-body negative control fails as expected; all 122 thumbnail drawings fit within their viewboxes');
    for(const item of D.items) {
      await page.locator(`[data-category="${item.category}"]`).click();
      await page.locator(`[data-item="${item.id}"]`).click();
      assert.equal(await page.locator(`[data-item="${item.id}"]`).getAttribute('aria-pressed'),'true');
      await paint(page,item.id);
      await page.locator(`[data-item="${item.id}"]`).click();
      assert.equal(await page.locator(`[data-item="${item.id}"]`).getAttribute('aria-pressed'),'false');
      const same=await page.evaluate(async()=>{
        const pixels=(await uiRaster(new XMLSerializer().serializeToString(document.querySelector('#avatar-slot svg')))).pixels;
        return pixels.every((v,i)=>v===uiEmptyPixels[i]);
      });
      assert.ok(same,'Removing must restore every pixel of studio basics: '+item.id);
      assert.ok(await page.evaluate(()=>originalBase===document.querySelector('[data-layer="base"]')),'Base replaced: '+item.id);
      report.itemCount++;
      if(report.itemCount%20===0)console.log(`Checked ${report.itemCount}/122 garments`);
    }
    assert.equal(await page.locator('.outfit-status b').innerText(),'0/6');
    pass('All 122 pieces: real equip/remove clicks, selection state, body/garment coverage, pixel-exact empty restoration and zero scoring units');
    await equip(page,['top_edgy_05','bottom_casual_01']);
    await page.locator('[data-category="dress"]').click();const dress=D.items.find(i=>i.category==='dress');
    await page.locator(`[data-item="${dress.id}"]`).click();
    assert.ok(await page.locator('[data-category="top"]').isDisabled());assert.ok(await page.locator('[data-category="bottom"]').isDisabled());
    assert.equal(await page.locator('[data-layer="top_edgy_05"], [data-layer="bottom_casual_01"]').count(),0);
    await page.locator(`[data-item="${dress.id}"]`).click();
    assert.ok(await page.locator('[data-category="top"]').isEnabled());assert.ok(await page.locator('[data-category="bottom"]').isEnabled());await paint(page);
    pass('Dress removes separate garments; removing it restores opaque basics and enables both categories');
    const extras=D.items.filter(i=>i.category==='accessory').slice(0,3);
    await equip(page,extras.map(i=>i.id));
    assert.equal(await page.locator(`[data-layer="${extras[0].id}"]`).count(),0);
    assert.equal(await page.locator(`[data-item="${extras[0].id}"]`).getAttribute('aria-pressed'),'false');
    pass('A third accessory replaces the oldest in both selection and painted layers');
    await equip(page,[]);await page.evaluate(()=>uiFaceCheck());
    assert.ok(await page.evaluate(async()=>{
      const eye=document.querySelector('[data-feature="eye-left"]');eye.setAttribute('display','none');
      try{await uiFaceCheck();return false;}catch(e){return e.message.includes('Face feature obscured');}finally{eye.removeAttribute('display');}
    }),'Hiding an eye must fail face checks');
    report.faceCases=0;
    for(const skin of D.skins) {
      await page.locator(`.skin-selector [data-skin="${skin.id}"]`).click();
      for(const [name,ids] of Object.entries(specimens)) {
        await equip(page,ids);await paint(page);await page.evaluate(()=>uiExportCheck());await snapshot(page,skin.id+'-'+name);
      }
      await equip(page,[D.defaultHair,'top_edgy_05','bottom_summer_04']);
      await closeup(page,skin.id+'-detail-face','205 75 310 400',465,600);
      await closeup(page,skin.id+'-detail-hands','145 765 430 120',1075,300);
      await page.locator('[data-category="accessory"]').click();await page.locator('[data-item="accessory_cute_03"]').click();
      await closeup(page,skin.id+'-detail-grip','455 765 110 115',330,345);
      for(const hair of D.items.filter(i=>i.category==='hair')){
        await page.locator('[data-category="hair"]').click();
        const button=page.locator(`[data-item="${hair.id}"]`);if(await button.getAttribute('aria-pressed')!=='true')await button.click();
        await page.evaluate(()=>uiFaceCheck());report.faceCases++;
      }
    }
    pass(`${Object.keys(specimens).length*D.skins.length} vector screenshot cases: twelve looks × four skin tones; canvas exports equal visible SVG pixels`);
    pass('12 enlarged face/relaxed-hand/grip baselines; 88 hairstyle/skin face-visibility checks; hidden-eye negative control fails');
    for(const viewport of [{width:375,height:667},{width:390,height:844},{width:667,height:375},{width:1920,height:1080}]) {
      for(const motion of ['no-preference','reduce']) {
        const p=await newPage(viewport,base,motion);await equip(p,specimens.vest);await paint(p,'top_edgy_05');
        await p.locator('[data-category="top"]').click();
        const samples=await p.evaluate(async()=>{
          const avatar=document.querySelector('#avatar-slot .avatar'),base=avatar.querySelector('[data-layer="base"]');
          for(let i=0;i<24;i++) {
            document.querySelector('[data-item="top_edgy_05"]').click();
            await new Promise(requestAnimationFrame);
            const current=document.querySelector('#avatar-slot .avatar');
            if(current!==avatar||!base.isConnected||!current.querySelector('svg path'))throw new Error('Blank frame during rapid removal');
            const r=current.getBoundingClientRect();if(r.width<40||r.height<100||getComputedStyle(current).opacity==='0')throw new Error('Hidden or collapsed frame');
          }
          return 24;
        });
        assert.equal(samples,24);await paint(p);
        const score=await p.locator('[data-action="score"]').boundingBox();assert.ok(score.y>=0&&score.y+score.height<=viewport.height+1);
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(motion==='reduce')assert.equal(await p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0,'Reduced motion must stop decorative animation');
        await p.screenshot({path:path.join(out,`viewport-${viewport.width}x${viewport.height}-${motion}.png`)});
        await p.context().close();
      }
    }
    pass('Four viewports × two motion settings: 192 rapid toggle frames, visible avatar, accessible score button, no horizontal overflow');
    const standalone=path.join(root,'dist','Muse-Bloom.html');assert.ok(fs.existsSync(standalone),'Run npm run standalone first');
    const file=await newPage({width:1440,height:900},pathToFileURL(standalone).href,'reduce');
    for(const ids of Object.values(specimens)) { await equip(file,ids);await paint(file);await file.evaluate(()=>uiExportCheck()); }
    await file.locator('[data-action="score"]').click();assert.equal(await file.locator('.rank-D').count(),1);assert.equal(await file.locator('#score-number').innerText(),'0');
    await file.locator('[data-action="retry"]').click();await paint(file);
    await file.context().close();pass('Standalone file:// HTML: twelve looks, empty fallback and matching canvas export');
    assert.deepEqual(report.errors,[],'Console and runtime errors');pass('Zero browser console/runtime errors');
    report.status='passed';
  } catch(error) {
    report.status='failed';report.failure=error.stack;
    if(browser)for(const [i,p] of browser.contexts().flatMap(c=>c.pages()).entries())await p.screenshot({path:path.join(out,`failure-${i}.png`)}).catch(()=>{});
    throw error;
  } finally {
    fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify(report,null,2));
    fs.writeFileSync(path.join(out,`ui-report-${report.channel}.json`),JSON.stringify(report,null,2));
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
