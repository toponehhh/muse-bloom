import {Application,Assets,Container,Graphics,Mesh,MeshGeometry,Sprite,Texture,ColorMatrixFilter} from 'pixi.js';
import {PixiFactory} from 'pixi-dragonbones-runtime';
import Art from '../../../js/art.js';
import {makeSkeleton,mesh,bones} from './rig.mjs';
import {templates,templateFor,accessoryPlacement} from './campaign-art.mjs';
const files={mira:'mira.png',rose:'rose-lilac.png',blue:'blue-ivory.png',tops:'campaign-tops.png',dresses:'campaign-dresses.png',shoes:'campaign-shoes.png',room:'room.png'};
const bind=Object.fromEntries(bones.map(([name,parent,x,y])=>[name,{x,y}]));
const colorMatrix=color=>{const n=parseInt(color.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(x=>x/255);return [...c.flatMap(v=>[.2126*v*1.12,.7152*v*1.12,.0722*v*1.12,0,0]),0,0,0,1,0];};
export class CampaignRenderer {
  constructor(stage){this.stage=stage;this.cache=new Map();this.details=new Map();this.active=[];this.textures={};this.images={};this.clock=0;this.view='full';}
  async init(){
    let count=0;await Promise.all(Object.entries(files).map(async([key,file])=>{const t=await Assets.load('./assets/'+file);this.textures[key]=t;this.images[key]=t.source.resource;document.querySelector('#loading-copy').textContent=`Opening your wardrobe… ${++count} / ${Object.keys(files).length}`;}));
    this.app=new Application();await this.app.init({backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio,2),autoDensity:true,preference:'webgl',autoStart:false});this.stage.prepend(this.app.canvas);this.app.canvas.setAttribute('aria-hidden','true');
    PixiFactory.useSharedTicker=false;const f=PixiFactory.factory;f.parseDragonBonesData(makeSkeleton({campaign:true}));
    for(const key of ['mira','rose','blue'])f.parseTextureAtlasData({name:'muse-style-lab',width:1024,height:1536,SubTexture:[{name:key,x:0,y:0,width:1024,height:1536}]},this.textures[key]);
    this.body=f.buildArmatureDisplay('Mira','muse-style-lab');this.body.animation.play('breathe');this.body.animation.lastAnimationState.displayControl=false;
    this.body.armature.getSlot('top').displayIndex=-1;this.body.armature.getSlot('bottom').displayIndex=-1;
    this.model=new Container();this.model.sortableChildren=true;this.body.zIndex=0;this.model.addChild(this.body);this.shadow=new Graphics();this.app.stage.addChild(this.shadow,this.model);
    // Skin sampled from the original neck fills open garment necklines. Original
    // tee pixels are not used as a permanent visible undershirt in the campaign.
    const neckMap=(x,y)=>[433+(x-486)/61*164,322+(y-313)/19*99];
    this.neck=this.makeMesh({texture:'mira',rect:[486,313,547,332],map:neckMap,keep:(u,v)=>{const[x,y]=neckMap(u,v),edge=Math.max(433,455-(y-330)*.7);return y>=330&&x>=edge&&x<=1030-edge;},role:'top'},'neck');this.neck.mesh.zIndex=1;this.model.addChild(this.neck.mesh);
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.stage);this.resize();
    this.app.ticker.add(t=>{if(!this.paused&&!document.hidden&&!document.querySelector('dialog[open]')){const dt=Math.min(t.deltaMS,50)/1000;this.clock+=dt;this.body.armature.advanceTime(dt);this.deform();}});this.app.start();
  }
  makeMesh(template,name){
    const data=mesh(name,template.texture,template.rect,template.map,template.keep,template.rect[3]-template.rect[1]>700?24:14);
    const position=new Float32Array(data.vertices),geometry=new MeshGeometry({positions:position,uvs:new Float32Array(data.uvs),indices:new Uint32Array(data.triangles)}),node=new Mesh({geometry,texture:this.textures[template.texture]});
    const blends=[];let k=0;for(let i=0;i<data.vertices.length;i+=2){const n=data.weights[k++],list=[];for(let j=0;j<n;j++){list.push([bones[data.weights[k++]][0],data.weights[k++]]);}blends.push((template.role==='bottom'||template.role==='dress')&&data.vertices[i+1]>=575||template.role==='shoes'?[['hips',1]]:list);}
    return {mesh:node,original:data.vertices,blends,position,template};
  }
  garment(item){
    if(this.cache.has(item.id))return this.cache.get(item.id);
    const template=templates[templateFor(item)];if(!template)throw new Error('Missing art for '+item.id);
    const layer=this.makeMesh(template,item.id),filter=new ColorMatrixFilter();filter.matrix=colorMatrix(item.color);layer.mesh.filters=[filter];
    layer.mesh.zIndex={top:25,bottom:20,dress:24,shoes:30}[item.category];layer.mesh.visible=false;this.model.addChild(layer.mesh);this.cache.set(item.id,layer);return layer;
  }
  async prepareDetails(items){
    for(const item of items.filter(x=>['hair','accessory'].includes(x.category))){
      const source=Art.itemSvg(item,false,true),doc=new DOMParser().parseFromString(source,'image/svg+xml'),svg=doc.documentElement;
      const holder=document.createElement('div');holder.style.cssText='position:fixed;left:-3000px;top:0;visibility:hidden;';holder.append(document.importNode(svg,true));document.body.append(holder);
      const b=holder.querySelector('svg').getBBox();holder.remove();svg.setAttribute('viewBox',`${b.x-4} ${b.y-4} ${b.width+8} ${b.height+8}`);svg.setAttribute('width','360');svg.setAttribute('height',String(Math.max(32,360*(b.height+8)/(b.width+8))));
      const img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(svg));await img.decode();
      const sprite=new Sprite(Texture.from(img));sprite.zIndex=40;sprite.visible=false;this.model.addChild(sprite);this.details.set(item.id,{sprite,img,item});
    }
  }
  setOutfit(items){
    for(const layer of this.cache.values())layer.mesh.visible=false;for(const d of this.details.values())d.sprite.visible=false;this.active=[];this.activeDetails=[];
    const bottom=items.find(i=>i.category==='bottom'),dress=items.find(i=>i.category==='dress');
    const hideLegs=bottom&&['trousers','jeans','cargo','flare'].includes(bottom.shape)&&bottom.id!=='bottom_casual_01'||dress&&['gown','hanfu'].includes(dress.shape);
    this.body.armature.getSlot('body').displayIndex=hideLegs?1:0;this.body.armature.invalidUpdate(null,true);this.body.armature.advanceTime(0);
    let bags=0;
    for(const item of items){
      if(['hair','accessory'].includes(item.category)){const detail=this.details.get(item.id);detail.placement=accessoryPlacement(item,bags>0);if(['bag','tote'].includes(item.shape))bags++;detail.sprite.visible=true;this.activeDetails.push(detail);}
      else{const layer=this.garment(item);layer.mesh.visible=true;this.active.push(layer);}
    }
    this.deform();this.app.render();
  }
  deform(){
    for(const layer of [this.neck,...this.active]){
      for(let i=0;i<layer.blends.length;i++){let x=0,y=0;const ox=layer.original[i*2],oy=layer.original[i*2+1];for(const [name,w]of layer.blends[i]){const m=this.body.armature.getBone(name).globalTransformMatrix,b=bind[name],dx=ox-b.x,dy=oy-b.y;x+=(m.a*dx+m.c*dy+m.tx)*w;y+=(m.b*dx+m.d*dy+m.ty)*w;}layer.position[i*2]=x;layer.position[i*2+1]=y;}
      layer.mesh.geometry.getBuffer('aPosition').update();
    }
    for(const d of this.activeDetails||[]){const {bone,rect:r}=d.placement,m=this.body.armature.getBone(bone).globalTransformMatrix,b=bind[bone],dx=r[0]-b.x,dy=r[1]-b.y;d.sprite.position.set(m.a*dx+m.c*dy+m.tx,m.b*dx+m.d*dy+m.ty);d.sprite.width=r[2]-r[0];d.sprite.height=r[3]-r[1];d.sprite.rotation=Math.atan2(m.b,m.a);}
  }
  resize(){const r=this.stage.getBoundingClientRect();if(!r.width||!r.height)return;this.app.renderer.resize(r.width,r.height);const scale=Math.min((r.height-24)/1480,(r.width-28)/690)*(this.view==='detail'?1.6:1);this.model.scale.set(scale);this.model.position.set(r.width/2-515*scale,this.view==='detail'?12-40*scale:(r.height-1480*scale)/2-40*scale);this.shadow.clear().ellipse(r.width/2,this.model.y+1478*scale,155*scale,15*scale).fill({color:0x65504f,alpha:this.view==='full'?.14:0});this.app.render();}
  thumbnail(item){
    if(this.details.has(item.id))return this.details.get(item.id).img.src;
    const template=templates[templateFor(item)],r=template.rect,c=document.createElement('canvas');c.width=c.height=240;const ctx=c.getContext('2d'),w=r[2]-r[0],h=r[3]-r[1],s=Math.min(220/w,220/h),x=(240-w*s)/2,y=(240-h*s)/2;
    ctx.filter='grayscale(1)';ctx.drawImage(this.images[template.texture],r[0],r[1],w,h,x,y,w*s,h*s);ctx.filter='none';ctx.globalCompositeOperation='multiply';ctx.fillStyle=item.color;ctx.fillRect(0,0,240,240);ctx.globalCompositeOperation='destination-in';ctx.drawImage(this.images[template.texture],r[0],r[1],w,h,x,y,w*s,h*s);
    const pixels=ctx.getImageData(0,0,240,240);for(let py=0;py<240;py++)for(let px=0;px<240;px++)if(!template.keep(r[0]+(px-x)/s,r[1]+(py-y)/s))pixels.data[(py*240+px)*4+3]=0;ctx.putImageData(pixels,0,0);return c.toDataURL();
  }
  portrait(title,score){
    const pos={x:this.model.x,y:this.model.y,s:this.model.scale.x};this.model.position.set(0,0);this.model.scale.set(1);this.app.render();const b=this.model.getBounds(),figure=this.app.renderer.extract.canvas({target:this.model,resolution:1});
    const c=document.createElement('canvas');c.width=600;c.height=900;const ctx=c.getContext('2d');ctx.drawImage(this.images.room,0,0,600,900);ctx.drawImage(figure,300+(b.x-515)*.54,30+(b.y-40)*.54,b.width*.54,b.height*.54);ctx.fillStyle='#fffaf4f2';ctx.fillRect(0,838,600,62);ctx.fillStyle='#654459';ctx.font='600 17px Segoe UI,sans-serif';ctx.fillText('Muse Bloom',20,866);ctx.font='13px Segoe UI,sans-serif';ctx.fillText(title,20,887);ctx.textAlign='right';ctx.fillText(score,579,873);
    this.model.position.set(pos.x,pos.y);this.model.scale.set(pos.s);this.app.render();return c.toDataURL('image/jpeg',.82);
  }
  seek(time){this.body.animation.gotoAndStopByTime('breathe',time);this.body.animation.lastAnimationState.displayControl=false;this.body.armature.advanceTime(0);this.deform();this.app.render();}
}
