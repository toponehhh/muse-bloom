'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
(async()=>{
 const {verify,out}=require('./package-style-lab'),manifest=verify();
 const config=JSON.parse(fs.readFileSync(path.join(root,'cloudflare/pages/wrangler.jsonc')));
 assert.equal(path.resolve(root,'cloudflare/pages',config.pages_build_output_dir),out);
 assert.equal(manifest.channel,'production');assert.equal(manifest.themes,36);assert.equal(manifest.pieces,122);
 assert.equal(config.services[0].binding,'FEEDBACK_API');assert.equal(config.services[0].service,'muse-bloom');
 const redirects=fs.readFileSync(path.join(out,'_redirects'),'utf8');
 assert.match(redirects,/^\/playtest\/ \/\?qa=1 302$/m);
 assert.match(redirects,/^\/playtest\/Muse-Bloom\.html \/\?qa=1 302$/m);
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/style-lab.yml'),'utf8');
 assert.match(workflow,/deploy-production:[\s\S]*github\.ref == 'refs\/heads\/main'[\s\S]*needs: style-room/);
 assert.match(workflow,/node dev\/cloudflare-command\.js deploy/);
 assert.doesNotMatch(workflow,/refs\/heads\/feat\//);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'.github/workflows/verify.yml'),'utf8'),/^  deploy[^\n]*:/m,'Legacy workflow must not overwrite production');
 require('./package-style-redirects');
 const source=fs.readFileSync(path.join(root,'dist/style-room-redirects/_worker.js'),'utf8');
 const worker=(await import('data:text/javascript,'+encodeURIComponent(source))).default;
 for(const suffix of ['/?v=2.0.3&qa=1','/playtest/','/api/feedback','/assets/room.png']){
  const response=await worker.fetch(new Request('https://style-room.muse-bloom.pages.dev'+suffix));
  assert.equal(response.status,308);assert.equal(response.headers.get('location'),'https://muse-bloom.pages.dev'+suffix);
 }
 require('./package-cloudflare');
 const command=path.join(root,'dev/cloudflare-command.js');
 const run=()=>spawnSync(process.execPath,[command,'verify-deploy'],{cwd:root,encoding:'utf8'});
 let result=run();assert.equal(result.status,0,result.stderr);
  const wrongBranch=spawnSync(process.execPath,[command,'deploy'],{cwd:root,encoding:'utf8',env:{...process.env,GITHUB_REF:'refs/heads/feat/not-production'}});
  assert.notEqual(wrongBranch.status,0);assert.match(wrongBranch.stderr,/only allowed from main/);
 const file=path.join(root,'dist/cloudflare/build.json'),original=fs.readFileSync(file);
 try{const wrong=JSON.parse(original);wrong.sourceCommit='0'.repeat(40);fs.writeFileSync(file,JSON.stringify(wrong));result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/same tested commit/);}finally{fs.writeFileSync(file,original);}
 console.log('PASS: one main production pipeline, current artifact and feedback binding, old-link redirects, mismatched release rejected; no deployment performed');
})().catch(error=>{console.error(error);process.exitCode=1});
