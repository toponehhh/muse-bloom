'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/cloudflare');
const files=['index.html','playtest/index.html','playtest/Muse-Bloom.html'];
const allowed=new Set([...files,'build.json','_headers']);
function check(directory=out,prefix=''){
  if(!fs.existsSync(directory))return;
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    const relative=prefix+entry.name;
    if(entry.isDirectory()&&relative==='playtest')check(path.join(directory,entry.name),'playtest/');
    else if(!entry.isFile()||!allowed.has(relative))throw new Error('Unexpected Cloudflare publish entry: '+relative);
  }
}
check();
const online=html=>html.replace('</head>','<meta name="muse-feedback-endpoint" content="/api/feedback"></head>');
const gamePath=require('./standalone').standalone(path.join(out,'index.html'));
const game=online(fs.readFileSync(gamePath,'utf8'));fs.writeFileSync(gamePath,game);
fs.mkdirSync(path.join(out,'playtest'),{recursive:true});fs.writeFileSync(path.join(out,'playtest/Muse-Bloom.html'),game);
const guide=online(require('./build-guide').buildGuide().replaceAll('PRIVATE PLAYTEST','ONLINE PLAYTEST').replaceAll('私人试玩','在线试玩')
  .replace('</header>','<p class="note"><a href="../">返回普通游戏</a></p></header>'));
fs.writeFileSync(path.join(out,'playtest/index.html'),guide);
fs.writeFileSync(path.join(out,'_headers'),'/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Cache-Control: no-cache\n');
const sourceCommit=process.env.GITHUB_SHA||execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
if(!/^[a-f0-9]{40,64}$/.test(sourceCommit))throw new Error('Invalid source commit');
fs.writeFileSync(path.join(out,'build.json'),JSON.stringify({version:require('../package.json').version,sourceCommit,target:'cloudflare',feedback:'D1',files:files.map(file=>{
  const bytes=fs.readFileSync(path.join(out,file));return {file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
})},null,2)+'\n');
check();console.log('Cloudflare site ready: '+out);
