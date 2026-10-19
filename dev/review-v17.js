'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const out=path.join(__dirname,'../artifacts/v1.7.0');fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
    await page.goto('http://127.0.0.1:4173/');
    await page.screenshot({path:path.join(out,'home.png'),fullPage:true});
    await page.locator('[data-action="play"]').last().click();
    for(const id of ['top_cozy_02','bottom_casual_01','shoes_casual_01','hair_casual_01','accessory_casual_01']){
      const category=await page.evaluate(id=>MuseGame.byId[id].category,id);
      await page.locator('[data-category="'+category+'"][data-action="category"]').click();
      await page.locator('[data-item="'+id+'"]').click();
    }
    await page.locator('[data-action="skip-guide"]').click();
    await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
    await page.screenshot({path:path.join(out,'studio.png'),fullPage:true});
    await page.locator('#avatar-slot .avatar').screenshot({path:path.join(out,'avatar.png')});
    await page.setViewportSize({width:390,height:844});
    await page.screenshot({path:path.join(out,'phone.png'),fullPage:true});
    await page.setViewportSize({width:320,height:568});
    await page.screenshot({path:path.join(out,'small-phone.png'),fullPage:true});
    const sheet=await page.evaluate(()=>{
      const looks=[
        ['top_casual_01','bottom_casual_01','shoes_casual_01','hair_casual_01'],
        ['top_cozy_02','bottom_cute_02','shoes_cute_02','accessory_casual_01'],
        ['top_preppy_03','bottom_summer_04','shoes_chic_03','accessory_cute_03'],
        ['dress_cute_01','shoes_cute_02','hair_casual_01'],
        ['dress_elegant_02','shoes_chic_03','accessory_casual_01']
      ];
      return MuseData.characters.map(c=>looks.map((ids,n)=>{
        const o=MuseGame.emptyOutfit();for(const id of ids){const item=MuseGame.byId[id];if(item.category==='accessory')o.accessory.push(id);else o[item.category]=id;}
        return '<section><label>'+c.name+' / '+(n+1)+'</label>'+MuseUI.avatar(o,c.id)+'</section>';
      }).join('')).join('');
    });
    await page.setViewportSize({width:1300,height:1440});
    await page.setContent('<!doctype html><style>body{margin:0;background:#fbf4ee;display:grid;grid-template-columns:repeat(5,1fr);font:14px Arial;color:#57384c}section{height:460px;border:1px solid #decad4;padding:10px;text-align:center;box-sizing:border-box}.avatar{height:420px}.avatar svg{width:100%;height:100%}label{display:block;margin-bottom:7px}</style>'+sheet);
    await page.screenshot({path:path.join(out,'capsule-contact-sheet.png'),fullPage:true});
    console.log('Preview screenshots saved to '+out);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
