'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function buildGuide(){
  return fs.readFileSync(path.join(root,'playtest/index.html'),'utf8')
    .replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,file)=>'<style>'+fs.readFileSync(path.resolve(root,'playtest',file),'utf8')+'</style>')
    .replace('href="../assets/favicon.svg"',()=>`href="data:image/svg+xml,${encodeURIComponent(fs.readFileSync(path.join(root,'assets/favicon.svg'),'utf8'))}"`)
    .replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
    const source=fs.readFileSync(path.resolve(root,'playtest',file),'utf8');
    return '<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
  });
}
module.exports={buildGuide};
