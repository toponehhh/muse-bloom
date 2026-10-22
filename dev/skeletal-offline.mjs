// Network-free diagnostic render using the actual DragonBones/Pixi mesh geometry.
// No browser, local HTTP server, DOM, or GPU is used. Browser CI remains separate.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import {Texture,BufferImageSource} from 'pixi.js';
import {PixiFactory} from 'pixi-dragonbones-runtime';
import {makeSkeleton,textureFiles} from '../demos/skeletal/src/rig.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const sources=Object.fromEntries(Object.entries(textureFiles).map(([key,file])=>[key,PNG.sync.read(fs.readFileSync(path.join(root,'demos/skeletal/assets',file)))]));
PixiFactory.useSharedTicker=false;
const factory=PixiFactory.factory;
export const skeleton=makeSkeleton();
factory.parseDragonBonesData(skeleton);
for(const name of Object.keys(textureFiles)) {
  const texture=new Texture({source:new BufferImageSource({resource:new Uint8Array(4*1024*1536),width:1024,height:1536})});
  factory.parseTextureAtlasData({name:'muse-atelier',width:1024,height:1536,SubTexture:[{name,x:0,y:0,width:1024,height:1536}]},texture);
}
export const display=factory.buildArmatureDisplay('Nora','muse-atelier');
export function pose(top,bottom,motion,time) {
  display.animation.reset();const animation=display.animation.gotoAndStopByTime(motion,time);animation.displayControl=false;
  for(const [slot,index] of [['top',top],['bottom',bottom],['arms',top],['body',bottom===2?1:0]])display.armature.getSlot(slot).displayIndex=index;
  display.armature.invalidUpdate(null,true);
  display.armature.advanceTime(0);
  return display;
}
export function render(top,bottom,motion,time,scale=.5) {
  pose(top,bottom,motion,time);
  const image=new PNG({width:Math.ceil(1100*scale),height:Math.ceil(1536*scale)});
  for(const slot of display.armature.getSlots()) {
    if(!slot.display?.visible)continue;
    const mesh=slot.display,vertices=mesh.vertices,uvs=mesh.geometry.getBuffer('aUV').data,indices=mesh.geometry.indices;
    const data=skeleton.armature[0].skin[0].slot.find(s=>s.name===slot.name).display[slot.displayIndex];
    const source=sources[data.path];
    for(let t=0;t<indices.length;t+=3) {
      const ids=[indices[t],indices[t+1],indices[t+2]],p=ids.map(i=>[vertices[2*i]*scale,vertices[2*i+1]*scale]);
      const [a,b,c]=p,area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(area)<1e-6)continue;
      const minX=Math.max(0,Math.floor(Math.min(...p.map(v=>v[0])))),maxX=Math.min(image.width-1,Math.ceil(Math.max(...p.map(v=>v[0]))));
      const minY=Math.max(0,Math.floor(Math.min(...p.map(v=>v[1])))),maxY=Math.min(image.height-1,Math.ceil(Math.max(...p.map(v=>v[1]))));
      for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++) {
        const px=x+.5,py=y+.5,w0=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/area,w1=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/area,w2=1-w0-w1;
        if(Math.min(w0,w1,w2)<-1e-7)continue;
        const u=(uvs[ids[0]*2]*w0+uvs[ids[1]*2]*w1+uvs[ids[2]*2]*w2)*source.width;
        const v=(uvs[ids[0]*2+1]*w0+uvs[ids[1]*2+1]*w1+uvs[ids[2]*2+1]*w2)*source.height;
        const sx=Math.max(0,Math.min(source.width-1,Math.floor(u))),sy=Math.max(0,Math.min(source.height-1,Math.floor(v)));
        const si=(sy*source.width+sx)*4,di=(y*image.width+x)*4,alpha=source.data[si+3]/255,old=image.data[di+3]/255,total=alpha+old*(1-alpha);
        if(!alpha)continue;
        for(let k=0;k<3;k++)image.data[di+k]=(source.data[si+k]*alpha+image.data[di+k]*old*(1-alpha))/total;
        image.data[di+3]=total*255;
      }
    }
  }
  return image;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const dest=path.join(root,'artifacts/skeletal-offline');fs.mkdirSync(dest,{recursive:true});
  for(const motion of ['idle','wave']) {
    const sheet=new PNG({width:1650,height:768});
    for(let top=0;top<3;top++) {
      const rendered=render(top,top,motion,motion==='wave'?1.6:0);
      PNG.bitblt(rendered,sheet,0,0,rendered.width,rendered.height,top*550,0);
    }
    for(let i=0;i<sheet.data.length;i+=4){const a=sheet.data[i+3]/255;[242,232,218].forEach((color,k)=>sheet.data[i+k]=sheet.data[i+k]*a+color*(1-a));sheet.data[i+3]=255;}
    fs.writeFileSync(path.join(dest,motion+'.png'),PNG.sync.write(sheet));
  }
  console.log('Offline native mesh renders: artifacts/skeletal-offline/{idle,wave}.png');
}
