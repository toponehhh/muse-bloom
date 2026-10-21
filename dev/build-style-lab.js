'use strict';
const fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),source=path.join(root,'demos/style-lab'),out=path.join(root,'dist/style-lab');
async function build(){
  await esbuild.build({entryPoints:[path.join(source,'src/main.js')],bundle:true,minify:true,legalComments:'linked',outfile:path.join(source,'app.js'),target:['es2022']});
  fs.mkdirSync(out,{recursive:true});
  for(const name of ['index.html','style.css','app.js','app.css','app.js.LEGAL.txt','release.json'])fs.copyFileSync(path.join(source,name),path.join(out,name));
  fs.cpSync(path.join(source,'assets'),path.join(out,'assets'),{recursive:true});
  fs.cpSync(path.join(root,'demos/skeletal/licenses'),path.join(out,'licenses'),{recursive:true});
  console.log('Style Room built: '+out);return out;
}
module.exports=build;if(require.main===module)build().catch(e=>{console.error(e);process.exitCode=1;});
