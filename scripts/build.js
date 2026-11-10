'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist/web');
async function build(){
  fs.mkdirSync(out,{recursive:true});
  await esbuild.build({entryPoints:[path.join(root,'src/ui/campaign.js')],bundle:true,minify:true,legalComments:'linked',outfile:path.join(out,'campaign-app.js'),target:['es2022']});
  for(const name of ['index.html','release.json'])fs.copyFileSync(path.join(root,name),path.join(out,name));
  for(const name of ['style.css','campaign.css'])fs.copyFileSync(path.join(root,'src/ui',name),path.join(out,name));
  fs.mkdirSync(path.join(out,'assets'),{recursive:true});
  for(const name of ['mira.png','rose-lilac.png','blue-ivory.png','room.png','provenance.json','campaign-tops.png','campaign-dresses.png','campaign-shoes.png','campaign-provenance.json'])fs.copyFileSync(path.join(root,'assets',name),path.join(out,'assets',name));
  fs.cpSync(path.join(root,'licenses'),path.join(out,'licenses'),{recursive:true});
  console.log('Muse Bloom built: '+out);return out;
}
module.exports=build;if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
