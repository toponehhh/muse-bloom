(function(root){
  'use strict';
  const MiB=1024*1024;
  const limits={count:3,image:5*MiB,video:20*MiB,total:30*MiB};
  const types={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'};
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  function fail(code){const error=new Error(code);error.code=code;throw error;}
  function fileType(file){
    if(types[file.type])return file.type;
    // Some mobile pickers omit MIME; the server still checks the file signature.
    if(!file.type)return {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime'}[file.name.split('.').pop().toLowerCase()]||'';
    return '';
  }
  function checkFiles(files){
    if(files.length>limits.count)fail('count');
    let total=0;
    for(const file of files){
      const type=fileType(file);
      if(!type)fail('type');
      if(!Number.isSafeInteger(file.size)||file.size<1)fail('empty');
      if(file.size>(type.startsWith('image/')?limits.image:limits.video))fail('size');
      total+=file.size;
    }
    if(total>limits.total)fail('total');
  }
  function manifest(input){
    if(!Array.isArray(input)||!input.length)fail('manifest');
    checkFiles(input);
    const ids=new Set();
    return input.map(file=>{
      if(!uuid.test(file.id)||ids.has(file.id.toLowerCase())||!types[file.type]||!/^[a-f0-9]{64}$/.test(file.sha256)||typeof file.name!=='string'||!file.name.trim()||file.name.length>120||/[\x00-\x1f\x7f/\\]/.test(file.name))fail('manifest');
      ids.add(file.id.toLowerCase());
      return {id:file.id.toLowerCase(),name:file.name.trim(),type:file.type,size:file.size,sha256:file.sha256};
    });
  }
  function matches(bytes,type){
    const has=(offset,values)=>values.every((value,i)=>bytes[offset+i]===value);
    const ascii=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
    if(type==='image/png')return bytes.length>=24&&has(0,[137,80,78,71,13,10,26,10])&&ascii(12,16)==='IHDR';
    if(type==='image/jpeg')return bytes.length>=4&&has(0,[255,216,255]);
    if(type==='image/webp')return bytes.length>=16&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP';
    if(type==='video/webm')return has(0,[26,69,223,163])&&ascii(4,Math.min(bytes.length,4096)).includes('webm');
    if(type==='video/mp4'||type==='video/quicktime'){
      if(bytes.length<16||ascii(4,8)!=='ftyp')return false;
      const brand=ascii(8,12);
      return type==='video/quicktime'?brand==='qt  ':['isom','iso2','iso3','iso4','iso5','iso6','mp41','mp42','avc1','M4V ','MSNV','dash'].includes(brand);
    }
    return false;
  }
  const api={limits,types,uuid,fileType,checkFiles,manifest,matches};
  root.MuseFeedbackAttachments=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(globalThis);
