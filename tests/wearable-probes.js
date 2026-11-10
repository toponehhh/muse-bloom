'use strict';
// Runs in the actual browser. These probes observe rendered meshes, SVG source
// anchors and composited pixels, without importing production fit functions.
module.exports=function installWearableProbes(reference){
 const t=window.__campaign,r=t.renderer,held=i=>['bag','tote','fan'].includes(i.shape);
 const fail=(ok,message)=>{if(!ok)throw new Error(message);};
 function outfit(shoe,lower,extras=[],top='top_cozy_02'){
  const items=[t.G.byId[shoe],t.G.byId[lower],...extras.map(id=>t.G.byId[id])];if(t.G.byId[lower].category==='bottom')items.push(t.G.byId[top]);r.setOutfit(items);r.paused=true;
 }
 function uvPoint(node,point){
  const uv=node.geometry.getBuffer('aUV').data,xy=node.geometry.getBuffer('aPosition').data,indices=node.geometry.indexBuffer.data,u=point[0]/1024,v=point[1]/1536;
  for(let k=0;k<indices.length;k+=3){const a=indices[k]*2,b=indices[k+1]*2,c=indices[k+2]*2,den=(uv[b+1]-uv[c+1])*(uv[a]-uv[c])+(uv[c]-uv[b])*(uv[a+1]-uv[c+1]);if(Math.abs(den)<1e-14)continue;
   const x=((uv[b+1]-uv[c+1])*(u-uv[c])+(uv[c]-uv[b])*(v-uv[c+1]))/den,y=((uv[c+1]-uv[a+1])*(u-uv[c])+(uv[a]-uv[c])*(v-uv[c+1]))/den,z=1-x-y;
   if(Math.min(x,y,z)>=-1e-5){const p=node.toGlobal({x:x*xy[a]+y*xy[b]+z*xy[c],y:x*xy[a+1]+y*xy[b+1]+z*xy[c+1]});return r.model.toLocal(p);}
  }throw new Error('Atlas landmark is missing from rendered mesh: '+point);
 }
 function shoeContacts(id){const item=t.G.byId[id],layer=r.cache.get(id),node=(layer.back||layer).mesh,ref=reference.shoes[item.shape];
  const check=(mesh,uv,target,label)=>{const actual=uvPoint(mesh,uv),error=Math.hypot(actual.x-target[0],actual.y-target[1]);fail(error<2,`${id} ${label} offset ${error.toFixed(2)}`);return error;};
  return [...ref.uv.map((uv,i)=>check(node,uv,ref.target[i],`ankle ${i}`)),...reference.soles[item.shape].map((uv,i)=>check(layer.mesh,uv,reference.soles.target[i],`front sole ${i}`))];
 }
 function handContacts(){let slot=0;const output=[];for(const detail of r.activeDetails){if(!held(detail.item))continue;const side=slot++?'L':'R',ref=reference.hands[side],m=r.body.armature.getBone('wrist'+side).globalTransformMatrix,dx=ref.point[0]-ref.bind[0],dy=ref.point[1]-ref.bind[1],expected={x:m.a*dx+m.c*dy+m.tx,y:m.b*dx+m.d*dy+m.ty};
   const source=detail.item.shape==='fan'?[486,768]:[486,776],svg=new DOMParser().parseFromString(decodeURIComponent(detail.img.src.split(',')[1]),'image/svg+xml').documentElement,box=svg.getAttribute('viewBox').split(/\s+/).map(Number),local={x:(source[0]-box[0])/box[2]*detail.img.naturalWidth,y:(source[1]-box[1])/box[3]*detail.img.naturalHeight},actual=r.model.toLocal(detail.sprite.toGlobal(local)),error=Math.hypot(actual.x-expected.x,actual.y-expected.y);
   fail(error<.75,`${detail.item.id} ${side} handle offset ${error.toFixed(2)}`);output.push({id:detail.item.id,side,error,point:expected});
  }return output;
 }
 function shoulderContact(){const detail=r.activeDetails.find(d=>d.item.shape==='crossbody');if(!detail)return 0;
  const svg=new DOMParser().parseFromString(decodeURIComponent(detail.img.src.split(',')[1]),'image/svg+xml').documentElement,box=svg.getAttribute('viewBox').split(/\s+/).map(Number),actual=r.model.toLocal(detail.sprite.toGlobal({x:(299-box[0])/box[2]*detail.img.naturalWidth,y:(368-box[1])/box[3]*detail.img.naturalHeight})),m=r.body.armature.getBone('chest').globalTransformMatrix,dx=414-515,dy=354-440,expected={x:m.a*dx+m.c*dy+m.tx,y:m.b*dx+m.d*dy+m.ty};
  fail(Math.hypot(actual.x-expected.x,actual.y-expected.y)<.75,'Crossbody strap left the shoulder');const rect=[Math.floor(expected.x)-8,Math.floor(expected.y)-8,16,16];detail.sprite.visible=false;const below=capture(rect);detail.sprite.visible=true;const strap=capture(rect,[detail.sprite]);let contact=0;for(let i=3;i<strap.pixels.length;i+=4)if(strap.pixels[i]>180&&below.pixels[i]>230)contact++;fail(contact>=8,'Crossbody strap has no garment contact');return contact;
 }
 function capture(rect,only){const previous={x:r.model.x,y:r.model.y,s:r.model.scale.x},visible=r.model.children.map(n=>[n,n.visible]);try{r.model.position.set(0,0);r.model.scale.set(1);if(only)for(const [n]of visible)n.visible=only.includes(n);const frame=r.model.getLocalBounds().rectangle.clone();[frame.x,frame.y,frame.width,frame.height]=rect;return r.app.renderer.extract.pixels({target:r.model,frame,resolution:1});}finally{for(const [n,v]of visible)n.visible=v;r.model.position.set(previous.x,previous.y);r.model.scale.set(previous.s);}}
 function fingerOcclusion(){const checks=handContacts();shoulderContact();for(const contact of checks){const detail=r.details.get(contact.id),hand=r.hands[contact.side].mesh,rect=[Math.floor(contact.point.x)-9,Math.floor(contact.point.y)-9,18,18],composite=capture(rect),skin=capture(rect,[hand]),handle=capture(rect,[detail.sprite]);let count=0,wrong=0;
   // The source hand interiors have alpha 250-252, not 255. Compare interiors
   // only; at alpha >=248 the remaining background contribution is <=7/255.
   for(let i=0;i<skin.pixels.length;i+=4)if(skin.pixels[i+3]>=248&&handle.pixels[i+3]>180){count++;if([0,1,2].some(c=>Math.abs(composite.pixels[i+c]-skin.pixels[i+c])>10))wrong++;}
   fail(count>=6,`${contact.id} has no real finger/handle pixel contact (${count})`);fail(wrong===0,`${contact.id} handle paints over ${wrong} finger pixels`);
  }return checks.length;
 }
 function hemOcclusion(shoe,lower){const garment=r.cache.get(lower).mesh,layer=r.cache.get(shoe),rect=[370,1270,355,220],full=capture(rect),cloth=capture(rect,[garment]),shoes=capture(rect,[layer.mesh,...(layer.back?[layer.back.mesh]:[])]);let overlap=0,wrong=0;
  for(let i=0;i<cloth.pixels.length;i+=4)if(cloth.pixels[i+3]>253&&shoes.pixels[i+3]>220){overlap++;if([0,1,2].some(c=>Math.abs(full.pixels[i+c]-cloth.pixels[i+c])>8))wrong++;}
  fail(wrong===0,`${shoe} paints over ${lower}: ${wrong}/${overlap} pixels`);return overlap;
 }
 function anklePixels(){
  const full=capture([425,1310,240,80]),body=capture([425,1310,240,80],[r.body]);
  for(const x of [453,458,463,616,622,628])for(let y=1318;y<=1370;y+=4){const i=((y-1310)*240+x-425)*4;fail(full.pixels[i+3]>230,`Disconnected ankle at ${x},${y}`);}
  let oldShoe=0;for(let y=1328;y<1370;y++)for(let x=0;x<240;x++)if(body.pixels[((y-1310)*240+x)*4+3]>10)oldShoe++;fail(oldShoe===0,'Old shoe pixels remain in body: '+oldShoe);
 }
 window.fitProbe={outfit,shoeContacts,handContacts,shoulderContact,capture,fingerOcclusion,hemOcclusion,anklePixels,uvPoint};
};
