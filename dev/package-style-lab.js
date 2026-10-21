'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),source=path.join(root,'dist/style-lab'),out=path.join(root,'dist/style-room-pages');
const publicFiles=['index.html','style.css','campaign.css','campaign-app.js','campaign-app.css','campaign-app.js.LEGAL.txt','release.json',
  'assets/mira.png','assets/rose-lilac.png','assets/blue-ivory.png','assets/room.png','assets/provenance.json',
  'assets/campaign-tops.png','assets/campaign-dresses.png','assets/campaign-shoes.png','assets/campaign-provenance.json',
  'licenses/dragonbones-pixi.txt','licenses/dragonbones.txt','licenses/pixi.txt'];
const published=[...publicFiles,'_worker.js','_routes.json','_headers'];
function inventory(dir,prefix='') {
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);
}
function verify() {
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'build.json'),'utf8'));
  if(manifest.target!=='cloudflare-pages-style-room'||manifest.channel!=='style-room')throw new Error('Wrong release target');
  if(process.env.GITHUB_SHA&&manifest.sourceCommit!==process.env.GITHUB_SHA)throw new Error('Artifact does not belong to this workflow commit');
  const actual=inventory(out).sort(),expected=[...published,'build.json'].sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error('Unexpected or missing release file');
  if(JSON.stringify(manifest.files.map(x=>x.file).sort())!==JSON.stringify([...published].sort()))throw new Error('Incomplete release manifest');
  for(const entry of manifest.files){
    const data=fs.readFileSync(path.join(out,entry.file));
    if(entry.bytes!==data.length||entry.sha256!==crypto.createHash('sha256').update(data).digest('hex'))throw new Error('Release hash mismatch: '+entry.file);
  }
  return manifest;
}
async function build(){
  await require('./build-style-lab')();
  // Only remove the three known generated files from the previous capsule build.
  for(const old of ['app.js','app.css','app.js.LEGAL.txt']){const file=path.join(out,old);if(fs.existsSync(file))fs.unlinkSync(file);}
  for(const file of inventory(out))if(![...published,'build.json'].includes(file))throw new Error('Unexpected publish entry: '+file);
  for(const file of publicFiles){const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file==='index.html'?'campaign.html':file),dest);}
  const html=fs.readFileSync(path.join(out,'index.html'),'utf8').replace('</head>','<meta name="muse-feedback-endpoint" content="/api/feedback"></head>');
  fs.writeFileSync(path.join(out,'index.html'),html);
  fs.copyFileSync(path.join(root,'cloudflare/pages/worker.mjs'),path.join(out,'_worker.js'));
  fs.writeFileSync(path.join(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]},null,2)+'\n');
  fs.writeFileSync(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: no-cache\n');
  const sourceCommit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  if(!/^[a-f0-9]{40}$/.test(sourceCommit))throw new Error('Invalid source commit');
  const release=require('../demos/style-lab/release.json');
  fs.writeFileSync(path.join(out,'build.json'),JSON.stringify({...release,sourceCommit,target:'cloudflare-pages-style-room',feedback:'D1 + private R2',files:published.map(file=>{
    const data=fs.readFileSync(path.join(out,file));return {file,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')};
  })},null,2)+'\n');
  verify();console.log('Style Room Pages release ready: '+out);return out;
}
module.exports={build,verify,out};
if(require.main===module)(process.argv.includes('--verify')?Promise.resolve().then(()=>console.log('Verified release: '+verify().sourceCommit)):build()).catch(e=>{console.error(e);process.exitCode=1;});
