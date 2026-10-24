'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const standalone=require('./package-style-crazygames');
const expectedFiles=require('./package-style-lab').publicFiles.filter(file=>!file.endsWith('provenance.json')).sort();
const release=require('../demos/style-lab/release.json');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist',`browser-portals-v${release.version}`),manifestPath=out+'.manifest.json',zipPath=out+'.zip';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(dir,prefix=''){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?inventory(path.join(dir,e.name),prefix+e.name+'/'):[prefix+e.name]);}
function verify(){
 const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 if(manifest.target!=='browser-portals'||manifest.version!==release.version)throw new Error('Wrong portal release');
 if(!/^[a-f0-9]{40}$/.test(manifest.sourceCommit)||(process.env.GITHUB_SHA&&manifest.sourceCommit!==process.env.GITHUB_SHA))throw new Error('Wrong portal source commit');
 if(JSON.stringify(inventory(out).sort())!==JSON.stringify(expectedFiles)||JSON.stringify(manifest.files.map(e=>e.file).sort())!==JSON.stringify(expectedFiles))throw new Error('Unexpected portal files');
 for(const entry of manifest.files){const bytes=fs.readFileSync(path.join(out,entry.file));if(bytes.length!==entry.bytes||sha(bytes)!==entry.sha256)throw new Error('Portal hash mismatch: '+entry.file);}
 const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
 if(!html.includes('content="browser-portals"')||!html.includes('id="feedback-open" hidden')||/crazygames|muse-feedback-endpoint/i.test(html))throw new Error('Wrong portal entry');
 if(manifest.files.length>1000||manifest.files.some(e=>e.file.length>240||e.bytes>200*1024*1024)||manifest.totalBytes>500*1024*1024||manifest.totalBytes!==manifest.files.reduce((n,e)=>n+e.bytes,0))throw new Error('itch.io upload limits exceeded or size inconsistent');
 return manifest;
}
async function build(){
 await standalone.build();const source=standalone.verify();
 fs.mkdirSync(out,{recursive:true});
 if(inventory(out).some(file=>!source.files.some(entry=>entry.file===file)))throw new Error('Unexpected existing portal file');
 for(const entry of source.files){const dest=path.join(out,entry.file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(standalone.out,entry.file),dest);}
 const index=path.join(out,'index.html');fs.writeFileSync(index,fs.readFileSync(index,'utf8').replaceAll('crazygames-basic','browser-portals').replaceAll('crazygames','portal'));
 const files=source.files.map(entry=>{const bytes=fs.readFileSync(path.join(out,entry.file));return {file:entry.file,bytes:bytes.length,sha256:sha(bytes)};});
 fs.writeFileSync(manifestPath,JSON.stringify({...source,target:'browser-portals',platforms:['itch.io','GamePix'],files,totalBytes:files.reduce((n,e)=>n+e.bytes,0)},null,2)+'\n');verify();
 // Standard-library ZIP writer; stores only the verified public allowlist, with index.html at the archive root.
 const python=process.env.MUSE_PYTHON||(process.platform==='win32'?'python':'python3');
 const zip=spawnSync(python,[path.join(__dirname,'zip-style-portals.py'),out,manifestPath,zipPath],{encoding:'utf8',windowsHide:true});
 if(zip.status!==0)throw new Error(zip.stderr||String(zip.error));console.log(zip.stdout.trim());return out;
}
module.exports={build,verify,out,manifestPath,zipPath};
if(require.main===module)(process.argv.includes('--verify')?Promise.resolve().then(()=>console.log(verify())):build()).catch(e=>{console.error(e);process.exitCode=1});
