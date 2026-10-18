'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function standalone(destination=path.join(root,'dist','Muse-Bloom.html')) {
  const read=file=>fs.readFileSync(path.join(root,file),'utf8');
  let html=read('index.html').replace('href="assets/favicon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(read('assets/favicon.svg'))}"`);
  html=html.replace('<link rel="stylesheet" href="css/style.css">',()=>'<style>'+read('css/style.css')+'</style>');
  const scripts=[];
  html=html.replace(/\s*<script defer src="([^"]+)"><\/script>/g,(_,file)=>{scripts.push('<script>'+read(file).replace(/<\/script/gi,'<\\/script')+'</script>');return '';});
  html=html.replace('</body>',()=>scripts.join('\n')+'\n</body>');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,html);return destination;
}
if(require.main===module)console.log(standalone(process.argv[2]));
module.exports={standalone};
