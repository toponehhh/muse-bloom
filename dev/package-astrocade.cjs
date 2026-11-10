'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'..'),source=path.join(root,'demos/style-lab'),adapt=path.join(__dirname,'astrocade');
const release=require('../demos/style-lab/release.json');
const out=path.resolve(process.argv[2]||path.join(root,`dist/astrocade-style-stories-v${release.version}`));
const read=p=>fs.readFileSync(p,'utf8');
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing adapter anchor: '+a.slice(0,100));return s.replace(a,()=>b);};
const span=(s,start,end,value)=>{const a=s.indexOf(start),b=s.indexOf(end,a);if(a<0||b<0)throw Error('Missing method anchor '+start);return s.slice(0,a)+value+s.slice(b);};
const rendererMethods=`
  thumbnail(item){
    if(this.details.has(item.id)){const img=new Image();img.src=this.details.get(item.id).img.src;return img;}
    const template=templates[templateFor(item)],r=template.rect,c=document.createElement('canvas');c.width=c.height=240;
    const ctx=c.getContext('2d'),w=r[2]-r[0],h=r[3]-r[1],s=Math.min(220/w,220/h),x=(240-w*s)/2,y=(240-h*s)/2;
    ctx.beginPath();for(let py=0;py<240;py++){let begin=-1;for(let px=0;px<=240;px++){const keep=px<240&&template.keep(r[0]+(px-x)/s,r[1]+(py-y)/s);if(keep&&begin<0)begin=px;if(!keep&&begin>=0){ctx.rect(begin,py,px-begin,1);begin=-1;}}}ctx.clip();
    ctx.filter='grayscale(1)';ctx.drawImage(this.images[template.texture],r[0],r[1],w,h,x,y,w*s,h*s);ctx.filter='none';ctx.globalCompositeOperation='multiply';ctx.fillStyle=item.color;ctx.fillRect(0,0,240,240);ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.images[template.texture],r[0],r[1],w,h,x,y,w*s,h*s);return c;
  }
  async initPreview(){this.previewApp=new Application();await this.previewApp.init({preference:'canvas',backgroundAlpha:0,width:600,height:900,resolution:1,autoStart:false});}
  portrait(title,score){
    const pos={x:this.model.x,y:this.model.y,sx:this.model.scale.x,sy:this.model.scale.y};
    const filters=[];for(const layer of this.cache.values())for(const part of [layer,layer.back,layer.waist,layer.lining])if(part?.mesh.filters){filters.push([part.mesh,part.mesh.filters]);part.mesh.filters=null;}
    try{this.model.position.set(300-515*.54,30-40*.54);this.model.scale.set(.54);this.previewApp.renderer.render({container:this.model});
      const c=document.createElement('canvas');c.width=600;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(this.images.room,0,0,600,900);ctx.drawImage(this.previewApp.canvas,0,0);ctx.fillStyle='#fffaf4f2';ctx.fillRect(0,838,600,62);ctx.fillStyle='#654459';ctx.font='600 17px Segoe UI,sans-serif';ctx.fillText('Muse Bloom',20,866);ctx.font='13px Segoe UI,sans-serif';ctx.fillText(title,20,887);ctx.textAlign='right';ctx.fillText(score,579,873);return c;
    }finally{for(const [mesh,filter]of filters)mesh.filters=filter;this.model.position.set(pos.x,pos.y);this.model.scale.set(pos.sx,pos.sy);this.app.render();}
  }
  lookPortrait(items,title,score){const previous=this.currentItems;try{this.setOutfit(items);return this.portrait(title,score);}finally{this.setOutfit(previous||[]);}}
`;
function campaign(text){
  text=replace(text,"import {openFeedback,recordAction} from './feedback.js';","const openFeedback=()=>{},recordAction=()=>{};");
  text=replace(text,"import '../../../css/feedback.css';",'');
  text=replace(text,'let storage;try{storage=localStorage;}catch{}','const storage=window.__astrocadeCloud.storage;');
  text=replace(text,'campaignOptions(location.search)','{qa:false,allStories:false}');
  text=span(text,'try{const raw=JSON.parse(storage.getItem(pictureKey));','const persist=', '');
  text=replace(text,"const img=new Image();img.src=thumb(item);img.alt='';", "const img=thumb(item);img.setAttribute('aria-hidden','true');");
  text=span(text,'  if(pictures[theme.id])','  const title=document.createElement',"  const preview=renderer.lookPortrait(G.equippedItems(look.outfit),theme.name,look.rank+' · '+look.score+' points');preview.setAttribute('aria-label','Saved look for '+theme.name);b.append(preview);\n");
  text=replace(text,"const image=$('#result-image');image.hidden=!activeImage;if(activeImage)image.src=activeImage;else image.removeAttribute('src');$('#download').disabled=!activeImage;", "const image=$('#result-image');image.hidden=!activeImage;image.replaceChildren(...(activeImage?[activeImage]:[]));$('#download').disabled=true;");
  text=span(text,' if(savedLook&&activeImage){',' $(\'#rank\')', '');
  text=span(text," $('#download').addEventListener('click'", " $('#undo').addEventListener", '');
  text=replace(text,'await renderer.prepareDetails(D.items);controls();','await renderer.prepareDetails(D.items);await renderer.initPreview();controls();');
  text=replace(text,"if(new URLSearchParams(location.search).has('test'))window.__campaign",'if(window.__ASTRO_TEST===true)window.__campaign');
  text=replace(text,'start().catch(error=>{',"start().then(()=>window.__astrocadeCloud.setApply(()=>{const loaded=loadCampaign(storage,{qa:false,allStories:false});Object.assign(state,loaded);history.length=0;state.filter=null;applyOutfit();refreshSettings();})).catch(error=>{");
  return text;
}
function renderer(text){
  text=replace(text,"const t=await Assets.load('./assets/'+file);","const info=lib.getAsset('muse_'+key);if(!info?.url)throw Error('Missing platform asset: '+key);const t=await Assets.load(info.url);");
  text=replace(text,"this.stage.prepend(this.app.canvas);", "this.stage.style.backgroundImage='url('+lib.getAsset('muse_room').url+')';const roomImage=new Image();roomImage.src=lib.getAsset('muse_room').url;await roomImage.decode();this.stage.prepend(this.app.canvas);");
  text=replace(text,'const matrix=colorMatrix(color);if(this.canvasMode)setCanvasMeshColor(mesh,matrix);else{','const matrix=colorMatrix(color);setCanvasMeshColor(mesh,matrix);if(!this.canvasMode){');
  text=replace(text,'  setOutfit(items){','  setOutfit(items){this.currentItems=items;');
  text=span(text,'  thumbnail(item){','  seek(time){',rendererMethods);
  return text;
}
function meshPipe(text){
  text=span(text,"    const ctx=canvas.getContext('2d',{willReadFrequently:true});",'    // Browsing all 122 pieces', `    const ctx=canvas.getContext('2d');ctx.filter=matrix?'grayscale(1)':'none';ctx.drawImage(source,0,0);ctx.filter='none';
    const rgb=matrix?[matrix[0]/.2126,matrix[5]/.2126,matrix[10]/.2126].map((v,i)=>Math.min(255,Math.max(0,Math.round(v*tint[i]*255)))):tint.map(v=>Math.round(v*255));
    ctx.globalCompositeOperation='multiply';ctx.fillStyle='rgb('+rgb.join(',')+')';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='destination-in';ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-over';this.colors.set(key,canvas);
`);
  return text;
}
async function build(){
  fs.mkdirSync(out,{recursive:true});
  const entry=`import {CloudProgress} from ${JSON.stringify(path.join(adapt,'cloud.mjs'))};let started=false;window.__museRun=async(mode)=>{if(started)return;started=true;window.__astrocadeCloud=new CloudProgress(mode);await window.__astrocadeCloud.start();await import(${JSON.stringify(path.join(source,'src/campaign.js'))});};`;
  const result=await esbuild.build({stdin:{contents:entry,resolveDir:root,sourcefile:'astrocade-entry.mjs'},bundle:true,write:false,minify:true,legalComments:'inline',format:'iife',target:['es2022'],plugins:[{name:'astrocade-sandbox',setup(build){build.onLoad({filter:/[/\\]campaign\.js$/},args=>({contents:campaign(read(args.path)),loader:'js',resolveDir:path.dirname(args.path)}));build.onLoad({filter:/[/\\]campaign-renderer\.js$/},args=>({contents:renderer(read(args.path)),loader:'js',resolveDir:path.dirname(args.path)}));build.onLoad({filter:/[/\\]canvas-mesh-pipe\.js$/},args=>({contents:meshPipe(read(args.path)),loader:'js',resolveDir:path.dirname(args.path)}));build.onLoad({filter:/[/\\]canUseNewCanvasBlendModes\.(?:m?js)$/},args=>({contents:args.path.endsWith('.mjs')?'export function canUseNewCanvasBlendModes(){return false;}':'exports.canUseNewCanvasBlendModes=function(){return false;};',loader:'js'}));}}]});
  const js=result.outputFiles.find(f=>!f.path.endsWith('.css')).text;
  const css=(read(path.join(source,'style.css'))+'\n'+read(path.join(source,'campaign.css'))+'\n'+read(path.join(adapt,'platform.css'))).replace(/url\(assets\/room\.png\)/g,'none');
  let html=read(path.join(source,'campaign.html')).replace(/<link rel="stylesheet"[^>]*>/g,'').replace('<script src="campaign-app.js" defer></script>','');
  html=replace(html,'<a class="brand" href="./">','<button id="cloud-status" class="brand" type="button">');html=replace(html,'<small>STYLE STORIES</small></span></a>',`<small>STYLE STORIES ${release.version}</small></span></button>`);
  html=replace(html,'<img id="result-image" alt="Your latest styled outfit">','<div id="result-image" role="img" aria-label="Your latest styled outfit"></div>');
  html=replace(html,'Your wardrobe and progress are saved on this device.','Your wardrobe and progress are saved with your Astrocade account.');
  html=replace(html,'<body class="campaign">',`<body class="campaign"><div id="cloud-gate" class="cloud-layer"><section class="cloud-card"><h2>Your style stories</h2><p id="cloud-gate-message">Checking your saved wardrobe…</p><div class="cloud-actions"><button id="cloud-gate-retry" hidden>Retry loading</button><button id="cloud-continue" hidden>Continue styling</button></div></section></div><dialog id="cloud-recovery"><button id="cloud-close" class="close" aria-label="Close save status">×</button><h2>Your saved wardrobe</h2><p id="cloud-message">Checking saved progress…</p><div class="cloud-actions"><button id="cloud-retry-load" hidden>Retry loading</button><button id="cloud-keep" hidden>Keep my changes</button><button id="cloud-use" hidden>Use cloud progress</button><button id="cloud-retry-save" hidden>Retry save</button></div></dialog>`);
  html=replace(html,'</head>',`<meta name="muse-distribution" content="astrocade"><style>${css}</style></head>`);
  html=replace(html,'</body>',`<script>${js.replace(/<\/script/gi,'<\\/script')}\nfunction run(mode){return window.__museRun(mode);}</script></body>`);
  new (require('node:vm').Script)(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  fs.writeFileSync(path.join(out,'game_code.html'),html);
  const baseConfig=process.argv[3]&&JSON.parse(read(process.argv[3]));const config=baseConfig?.persistent_storage_config?{persistent_storage_config:baseConfig.persistent_storage_config}:{};
  fs.writeFileSync(path.join(out,'game_config.json'),JSON.stringify(config,null,2)+'\n');
  const mapPath=path.join(out,'asset_map.json'),previous=fs.existsSync(mapPath)?JSON.parse(read(mapPath)):{};
  fs.writeFileSync(mapPath,JSON.stringify({...previous,...JSON.parse(read(path.join(adapt,'assets.json')))},null,2)+'\n');
  const assets={muse_mira:'mira.png',muse_rose:'rose-lilac.png',muse_blue:'blue-ivory.png',muse_tops:'campaign-tops.png',muse_dresses:'campaign-dresses.png',muse_shoes:'campaign-shoes.png',muse_room:'room.png'};
  const manifest={release:release.version,sourceCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),themes:release.themes,pieces:release.pieces,entry:'game_code.html',bytes:Buffer.byteLength(html),sha256:crypto.createHash('sha256').update(html).digest('hex'),assets:Object.entries(assets).map(([id,file])=>({id,file,localPath:path.join(source,'assets',file),bytes:fs.statSync(path.join(source,'assets',file)).size})),progress:'Astrocade lib API; original cloud fields preserved; legacy three-look migration',imageDownloads:false,feedback:false};
  fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({out,release:manifest.release,bytes:manifest.bytes,sha256:manifest.sha256,assets:manifest.assets.length}));return manifest;
}
if(require.main===module)build().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={build,migrateSources:{campaign,renderer,meshPipe}};
