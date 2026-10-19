'use strict';
const fs=require('node:fs'),path=require('node:path');
const D=require('../js/data.js'),A=require('../js/art.js');
const root=path.resolve(__dirname,'..');
const files=[...D.items.map(i=>i.img),...D.skins.map(s=>`assets/base/${s.id}.svg`)];
// Default layers are drawn from the compact original vector source at runtime.
// Only artist-edited files are embedded, keeping the first download very small.
const defaults=Object.fromEntries([...D.items.map(i=>[i.img,A.itemSvg(i)]),...D.skins.map(s=>[`assets/base/${s.id}.svg`,A.body(s)])]);
const map=Object.fromEntries(files.map(file=>[file,fs.readFileSync(path.join(root,file),'utf8')]).filter(([file,svg])=>svg!==defaults[file]));
const customCount=Object.keys(map).length;
// Raster scenes are embedded too: file:// exports and portal folder uploads must
// never depend on a separate image request or taint the portrait canvas.
map['assets/scenes/bedroom.webp']='data:image/webp;base64,'+fs.readFileSync(path.join(root,'assets/scenes/bedroom.webp')).toString('base64');
fs.writeFileSync(path.join(root,'js/asset-data.js'),'// Generated from local SVG files by dev/embed-assets.js. No network requests.\nwindow.MuseAssets='+JSON.stringify(map)+';\n');
console.log(`Embedded ${customCount} custom layers and bedroom scene; ${files.length} defaults use compact vector source.`);
