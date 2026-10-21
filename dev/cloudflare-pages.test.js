'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
(async()=>{
  const {default:bridge}=await import('../cloudflare/pages/worker.mjs');
  const response=await bridge.fetch(new Request('https://test.pages.dev/api/feedback'),{});
  assert.equal(response.status,503,'A missing binding must not silently report a saved response');
  const broken=await bridge.fetch(new Request('https://test.pages.dev/api/feedback'),{FEEDBACK_API:{fetch(){throw new Error('Private connection detail');}}});
  assert.equal(broken.status,503);assert.ok(!(await broken.text()).includes('Private connection'));
  const config=JSON.parse(fs.readFileSync(path.join(root,'cloudflare/pages/wrangler.jsonc'),'utf8'));
  const worker=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  assert.equal(config.services[0].service,worker.name);assert.equal(worker.workers_dev,false);assert.equal(worker.preview_urls,false);
  const routes=JSON.parse(fs.readFileSync(path.join(root,'dist/cloudflare-pages/_routes.json'),'utf8'));
  assert.deepEqual(routes,{version:1,include:['/api/*'],exclude:[]});
  for(const test of ['feedback-api.test.js','feedback-attachments.test.js','cloudflare.test.js']){
    const result=spawnSync(process.execPath,[path.join(__dirname,test)],{cwd:root,stdio:'inherit',env:{...process.env,MUSE_CF_TARGET:'pages'}});
    if(result.error)throw result.error;
    assert.equal(result.status,0,test+' must pass through the actual service binding');
  }
  console.log('PASS: Pages serves static content and forwards same-origin submissions, validation and rate limits through its private service binding');
})().catch(error=>{console.error(error);process.exitCode=1;});
