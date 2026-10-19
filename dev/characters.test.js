'use strict';
// Real input, painted pixels, all-item toggles, saved identity and reviewed images.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright'),{createServer}=require('./server');
const D=require('../js/data'),G=require('../js/game');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/characters'),baselines=path.join(__dirname,'visual-baselines');
for(const p of [out,baselines])fs.mkdirSync(p,{recursive:true});
const channel=process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':'chromium'),update=process.argv.includes('--update-baselines');
const report={version:require('../package.json').version,channel,checks:[],errors:[],snapshots:[],characters:[],toggles:0,viewports:[]};
function pass(s){report.checks.push(s);console.log('PASS:',s);}
const full=G.newSave();full.muted=true;full.unlockedItems=D.items.map(i=>i.id);full.levels=Object.fromEntries(D.themes.map(t=>[t.id,{best:94,rank:'S'}]));
const server=createServer();let browser;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({channel:channel==='chromium'?undefined:channel,headless:true});report.browser=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>report.errors.push(e.message));
 await page.addInitScript(save=>{if(!localStorage.getItem('muse_bloom_save_v1'))localStorage.setItem('muse_bloom_save_v1',JSON.stringify(save));},full);
 await page.goto(url);await page.locator('[data-action=play]').click();
 // Independent pixel loader: it verifies real raster content, not just a DOM tag.
 await page.evaluate(()=>{
  window.paint=async(svg)=>{const image=await MuseShare.loadImage(svg),canvas=document.createElement('canvas');canvas.width=360;canvas.height=640;const c=canvas.getContext('2d');c.drawImage(image,0,0,360,640);return {data:c.getImageData(0,0,360,640).data,url:canvas.toDataURL('image/png')};};
  window.opaque=data=>{let n=0;for(let i=3;i<data.length;i+=4)if(data[i]>200)n++;return n;};
 });
 const hashes=[];
 for(const character of D.characters){
  await page.locator(`.character-selector [data-character="${character.id}"]`).click();
  assert.equal(await page.locator('#avatar-slot .avatar').getAttribute('data-avatar-character'),character.id);
  const raster=await page.evaluate(async id=>{const c=MuseData.characters.find(c=>c.id===id),r=await paint(MuseArt.avatarSvg(c));return {opaque:opaque(r.data),png:r.url,corner:r.data[3],center:r.data[(250*360+180)*4+3],gap:r.data[(500*360+180)*4+3]};},character.id);
  assert.ok(raster.opaque>30000&&raster.opaque<95000,'Actual full-body character pixels required');assert.equal(raster.corner,0);assert.ok(raster.center>=245);assert.ok(raster.gap<20,'Leg gap must be transparent');
  hashes.push(crypto.createHash('sha256').update(raster.png).digest('hex'));report.characters.push({id:character.id,opaquePixels:raster.opaque});
  const toggles=await page.evaluate(async()=>{const avatar=document.querySelector('#avatar-slot .avatar'),base=avatar.querySelector('[data-layer=base]');let count=0;
   for(const category of MuseData.categories){document.querySelector('[data-action=clear]').click();document.querySelector(`[data-category="${category}"]`).click();
    for(const item of MuseData.items.filter(i=>i.category===category)){
     document.querySelector(`[data-item="${item.id}"]`).click();await new Promise(requestAnimationFrame);
     if(!avatar.querySelector(`[data-layer="${item.id}"]`))throw Error('Equip missing: '+item.id);
     const painted=await paint(avatar.querySelector('svg').outerHTML);if(opaque(painted.data)<30000)throw Error('Blank frame after equip '+item.id);
     document.querySelector(`[data-item="${item.id}"]`).click();await new Promise(requestAnimationFrame);
     if(avatar.querySelector(`[data-layer="${item.id}"]`)||!base.isConnected||document.querySelector('#avatar-slot .avatar')!==avatar)throw Error('Unmount/unequip failure: '+item.id);
     const cleared=await paint(avatar.querySelector('svg').outerHTML);if(opaque(cleared.data)<30000)throw Error('Blank frame after removal '+item.id);
     let delta=0;for(let i=0;i<painted.data.length;i+=4)if(Math.abs(painted.data[i]-cleared.data[i])+Math.abs(painted.data[i+1]-cleared.data[i+1])+Math.abs(painted.data[i+2]-cleared.data[i+2])+Math.abs(painted.data[i+3]-cleared.data[i+3])>30)delta++;
     if(delta<12)throw Error('Invisible item: '+item.id+' delta='+delta);count++;
    }
   }return count;
  });report.toggles+=toggles;assert.equal(toggles,122);
  pass(character.name+': 122 real equip/remove pairs paint visible items and retain the base');
 }
 assert.equal(new Set(hashes).size,3);pass('Three genuinely different painted models, opaque bodies and transparent background/leg gaps');
 const fitting=await page.evaluate(async()=>{
  const results=[];let negative=0;
  for(const character of MuseData.characters){
   const base=(await paint(MuseArt.avatarSvg(character))).data;
   for(const item of MuseData.items.filter(i=>i.category==='bottom'&&!['pleats','midi','mamian'].includes(i.shape)||i.category==='shoes'&&['sneaker','loafer','platform','boot'].includes(i.shape))){
    const shorts=item.shape==='shorts',shoe=item.category==='shoes';
    const y0=shoe?600:shorts?285:355,y1=shoe?618:shorts?340:570;
    async function missing(svg){const art=(await paint(svg)).data;let total=0,holes=0;for(let y=y0;y<y1;y++)for(let x=115;x<245;x++){const a=(y*360+x)*4+3;if(base[a]>230){total++;if(art[a]<230)holes++;}}return holes/total;}
    const ratio=await missing(MuseArt.fittedItemSvg(item));
    if(ratio>.012)throw Error('Exposed body under '+character.id+'/'+item.id+': '+ratio);
    results.push({character:character.id,item:item.id,uncoveredRatio:ratio});
    if(character.id==='bella'&&item.id==='bottom_casual_01')negative=await missing(MuseArt.fittedItemSvg(item).replace('<defs>','<g transform="translate(80 0)"><defs>').replace('</svg>','</g></svg>'));
   }
  }
  return {results,negative};
 });
 assert.ok(fitting.negative>.05,'Shifted-garment negative control must expose the body');report.fitting=fitting.results;
 pass(fitting.results.length+' body-coverage checks for trousers, shorts and closed shoes; shifted garment negative control detected');
 assert.ok(!fs.existsSync(path.join(root,'assets/base'))||fs.readdirSync(path.join(root,'assets/base')).length===0);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'js/art.js'),'utf8'),/function (face|body|hand|hairShape)\(|hairCap|skin-cylinder|data-feature="eye-/);pass('Legacy vector body, face, hands and hairstyles absent from the active renderer');
 // Deliberately substitute an empty sprite: the same pixel check must detect it.
 const broken=await page.evaluate(async()=>{const c=MuseData.characters[0],saved=MuseAssets[c.asset];MuseAssets[c.asset]='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>');try{return opaque((await paint(MuseArt.avatarSvg(c))).data);}finally{MuseAssets[c.asset]=saved;}});assert.equal(broken,0);pass('Blank-character negative control produces zero body pixels and fails the paint threshold');
 // Stable canvas-only snapshots avoid text, OS fonts and CSS animation differences.
 const examples=[[],['top_casual_01','bottom_cute_02','shoes_casual_01','hair_sporty_04'],['top_cozy_02','bottom_casual_01','shoes_casual_01'],['top_romantic_04','bottom_summer_04','shoes_chic_03'],['dress_glam_04','shoes_casual_01','accessory_cute_03'],['top_silk_23','bottom_silk_19','shoes_silk_18'],['dress_silk_17','shoes_silk_17','hair_silk_19'],['accessory_cute_03','accessory_boho_11']];
 for(const c of D.characters)for(let i=0;i<examples.length;i++){
  const name=c.id+'-'+i+'.png',file=path.join(baselines,name),current=await page.evaluate(async({id,ids})=>(await paint(MuseArt.avatarSvg(MuseData.characters.find(c=>c.id===id),ids.map(id=>MuseGame.byId[id])))).url,{id:c.id,ids:examples[i]});
  const bytes=Buffer.from(current.split(',')[1],'base64');fs.writeFileSync(path.join(out,name),bytes);
  if(update)fs.writeFileSync(file,bytes);else{
   assert.ok(fs.existsSync(file),'Missing reviewed baseline '+name);
   const ratio=await page.evaluate(async({before,after})=>{async function pixels(src){const image=new Image();image.src=src;await image.decode();const c=document.createElement('canvas');c.width=360;c.height=640;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);return ctx.getImageData(0,0,360,640).data;}const a=await pixels(before),b=await pixels(after);let changed=0;for(let n=0;n<a.length;n+=4)if(Math.max(...[0,1,2,3].map(k=>Math.abs(a[n+k]-b[n+k])))>20)changed++;return changed/(360*640);},{before:'data:image/png;base64,'+fs.readFileSync(file).toString('base64'),after:current});
   assert.ok(ratio<.006,`Visual change in ${name}: ${ratio}`);report.snapshots.push({name,changedRatio:ratio});
  }
 }
 pass('24 painted-character snapshots cover base, shorts, trousers, skirts, gowns, Chinese styles and two handhelds');
 // Wardrobe state must survive switching characters, then reload restores selection.
 await page.locator('[data-category=top]').click();await page.locator('[data-item=top_casual_01]').click();
 for(const id of ['bella','mika','zoe','mika']){await page.locator(`.character-selector [data-character="${id}"]`).click();assert.equal(await page.locator('#avatar-slot [data-layer=top_casual_01]').count(),1);}
 await page.reload();await page.locator('[data-action=play]').click();assert.equal(await page.locator('#avatar-slot .avatar').getAttribute('data-avatar-character'),'mika');pass('Switching character retains the outfit; chosen character persists across reload');
 await page.close();
 for(const [width,height] of [[320,568],[375,667],[390,844],[667,375],[768,1024],[1024,768],[1440,900]]){
  const p=await browser.newPage({viewport:{width,height},hasTouch:width<768,reducedMotion:'reduce'});p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.locator('[data-action=play]').click();
  await p.locator('.character-selector [data-character=mika]').click();assert.equal(await p.locator('#avatar-slot .avatar').getAttribute('data-avatar-character'),'mika');
  const check=await p.evaluate(()=>{const stage=document.querySelector('.fitting-stage').getBoundingClientRect(),score=document.querySelector('[data-action=score]').getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth+1,score:score.bottom<=innerHeight+1,choices:[...document.querySelectorAll('.character-choice')].every(n=>{const r=n.getBoundingClientRect();return r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom<=stage.bottom;})};});assert.deepEqual(check,{overflow:false,score:true,choices:true},width+' studio');
  await p.screenshot({path:path.join(out,'studio-'+width+'.png')});await p.locator('[data-action=characters]').click();
  assert.equal(await p.locator('.character-card').count(),3);await p.locator('.character-card[data-character=zoe]').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('.character-card[data-character=zoe]').getAttribute('aria-pressed'),'true');
  await p.screenshot({path:path.join(out,'chooser-'+width+'.png')});await p.keyboard.press('Escape');assert.equal(await p.locator('dialog[open]').count(),0);assert.equal(await p.locator('#avatar-slot .avatar').getAttribute('data-avatar-character'),'zoe');
  report.viewports.push({width,height});await p.close();
 }
 pass('Seven desktop/mobile viewports: all character controls reachable, dialog keyboard selection and close work');
 assert.deepEqual(report.errors,[]);report.status='passed';
})().catch(e=>{report.status='failed';report.errors.push(e.stack);console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'report-'+channel+'.json'),JSON.stringify(report,null,2));});
