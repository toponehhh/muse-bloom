'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist/cloudflare'),out=path.join(root,'dist/cloudflare-pages');
const publicFiles=['index.html','playtest/index.html','playtest/Muse-Bloom.html'];
const allowed=new Set([...publicFiles,'build.json','_headers','_worker.js','_routes.json']);
function check(directory=out,prefix=''){
  if(!fs.existsSync(directory))return;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const relative=prefix+entry.name;
    if(entry.isDirectory()&&relative==='playtest')check(path.join(directory,entry.name),'playtest/');
    else if(!entry.isFile()||!allowed.has(relative))throw new Error('Unexpected Pages publish entry: '+relative);
  }
}
check();
require('./package-cloudflare');
for(const file of [...publicFiles,'_headers']){
  const destination=path.join(out,file);fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.copyFileSync(path.join(source,file),destination);
}
fs.copyFileSync(path.join(root,'cloudflare/pages/worker.mjs'),path.join(out,'_worker.js'));
// Static requests do not invoke a Function. Only same-origin API calls use D1.
fs.writeFileSync(path.join(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
const manifest=JSON.parse(fs.readFileSync(path.join(source,'build.json'),'utf8'));
manifest.target='cloudflare-pages';
manifest.functions={
  service:'muse-bloom',
  sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'_worker.js'))).digest('hex')
};
fs.writeFileSync(path.join(out,'build.json'),JSON.stringify(manifest,null,2)+'\n');
check();console.log('Cloudflare Pages ready: '+out);
