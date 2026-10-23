'use strict';
// Retire the old preview alias without losing shared links or their query/hash.
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../dist/style-room-redirects');
const worker=`export default {fetch(request){const url=new URL(request.url);url.protocol='https:';url.host='muse-bloom.pages.dev';return Response.redirect(url.href,308);}};\n`;
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'_worker.js'),worker);
fs.writeFileSync(path.join(out,'_routes.json'),JSON.stringify({version:1,include:['/*'],exclude:[]})+'\n');
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><title>Muse Bloom has moved</title><a href="https://muse-bloom.pages.dev/">Play Muse Bloom</a>\n');
console.log('Retired preview redirect ready: '+out);
