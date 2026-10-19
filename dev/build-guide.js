'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function buildGuide(){
  return fs.readFileSync(path.join(root,'playtest/index.html'),'utf8').replace(/<script src="([^"]+)"><\/script>/g,(_,file)=>{
    const source=fs.readFileSync(path.resolve(root,'playtest',file),'utf8');
    return '<script>'+source.replace(/<\/script/gi,'<\\/script')+'</script>';
  });
}
module.exports={buildGuide};
