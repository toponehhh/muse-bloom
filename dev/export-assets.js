'use strict';
const fs=require('node:fs');
const path=require('node:path');
const D=require('../js/data.js'),A=require('../js/art.js');
const root=path.resolve(__dirname,'..');
for(const folder of ['assets/items','assets/thumbs'])fs.mkdirSync(path.join(root,folder),{recursive:true});
for(const item of D.items){fs.writeFileSync(path.join(root,item.img),A.itemSvg(item));fs.writeFileSync(path.join(root,'assets/thumbs',item.id+'.svg'),A.itemSvg(item,true));}
console.log('Exported 122 clothing layers, 122 thumbnails; painted character assets are preserved.');
