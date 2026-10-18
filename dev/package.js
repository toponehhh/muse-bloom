'use strict';
// A small deterministic ZIP writer using only Node's standard library.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dist=path.join(root,'dist');
const version=require('../package.json').version;
const table=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data){let c=0xffffffff;for(const byte of data)c=table[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
function walk(name){const file=path.join(root,name);return fs.statSync(file).isDirectory()?fs.readdirSync(file).sort().flatMap(child=>walk(name+'/'+child)):[name];}
const files=['index.html',...walk('css'),...walk('js'),...walk('assets')];
if(files.length>1500)throw new Error('File-count budget exceeded');
const local=[],directory=[],manifest=[];let offset=0,total=0;
for(const file of files){
  const bytes=fs.readFileSync(path.join(root,file)),compressed=zlib.deflateRawSync(bytes,{level:9}),name=Buffer.from(file),crc=crc32(bytes);
  const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x5c21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(bytes.length,22);header.writeUInt16LE(name.length,26);
  local.push(header,name,compressed);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(0x5c21,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(compressed.length,20);central.writeUInt32LE(bytes.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(offset,42);directory.push(central,name);
  offset+=header.length+name.length+compressed.length;total+=bytes.length;
  manifest.push({file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
if(total>20*1024*1024)throw new Error('20 MB mobile budget exceeded');
const centralBytes=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(centralBytes.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,centralBytes,end]);fs.mkdirSync(dist,{recursive:true});
const filename=`muse-bloom-crazygames-v${version}.zip`;fs.writeFileSync(path.join(dist,filename),zip);
fs.writeFileSync(path.join(dist,'package-manifest.json'),JSON.stringify({version,archive:filename,files:files.length,uncompressedBytes:total,zipBytes:zip.length,sha256:crypto.createHash('sha256').update(zip).digest('hex'),entries:manifest},null,2));
console.log(`${filename}: ${files.length} files, ${(total/1024).toFixed(1)} KB unpacked, ${(zip.length/1024).toFixed(1)} KB ZIP. index.html is at archive root.`);
