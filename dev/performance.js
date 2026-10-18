'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.MUSE_PLAYWRIGHT||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,channel:process.env.MUSE_BROWSER_CHANNEL||(process.platform==='win32'?'msedge':undefined)});
  try{
    const context=await browser.newContext({viewport:{width:375,height:667},hasTouch:true});
    const page=await context.newPage(),cdp=await context.newCDPSession(page);
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:200000,uploadThroughput:100000,connectionType:'cellular4g'});
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
    await page.addInitScript(()=>{window.qaLongTasks=[];new PerformanceObserver(list=>window.qaLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({type:'longtask',buffered:true});});
    await page.goto(process.env.MUSE_URL||'http://127.0.0.1:4173');await page.locator('[data-action="play"]').waitFor();
    const startup=await page.evaluate(()=>({domReadyMs:Math.round(performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd),firstPaintMs:Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime||0),transferBytes:performance.getEntriesByType('resource').filter(r=>r.name.startsWith('http')).reduce((n,r)=>n+r.transferSize,0),longTasks:window.qaLongTasks}));
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
    await page.locator('[data-action="play"]').click();await page.evaluate(()=>{window.qaLongTasks=[];});
    for(const c of ['hair','bottom','dress','shoes','accessory'])await page.locator(`[data-category="${c}"]`).click();
    const interaction=await page.evaluate(()=>({longTasks:window.qaLongTasks}));
    const result={browser:await browser.version(),profile:'Cold cache; 150 ms latency; 1.6 Mbps down; 4x CPU slowdown; gzip local HTTP server',startup,interaction};
    fs.writeFileSync(path.resolve(__dirname,'../artifacts/performance.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
    await context.close();
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
