import {extensions,ExtensionType,canvasUtils} from 'pixi.js';

// Pixi 8.22 can select Canvas2D when GPU contexts are unavailable, but its
// built-in mesh pipe only registers for WebGL/WebGPU. Keep the same fitted
// meshes and skeletal poses in that fallback instead of silently losing them.
const colorMatrices=new WeakMap();
export function setCanvasMeshColor(mesh,matrix){colorMatrices.set(mesh,Array.from(matrix));}

export class CanvasMeshPipe {
  static extension={type:ExtensionType.CanvasPipes,name:'mesh'};
  constructor(renderer){this.renderer=renderer;this.colors=new Map();}
  validateRenderable(){return false;}
  updateRenderable(){} // Read the current CPU vertex buffers on each draw.
  addRenderable(mesh,instructions){this.renderer.renderPipes.batch.break(instructions);instructions.add(mesh);}

  sourceFor(mesh,worldColor){
    const texture=mesh.texture,source=canvasUtils.getCanvasSource(texture);
    if(!source)throw new Error('Character mesh texture is unavailable');
    const matrix=colorMatrices.get(mesh),group=mesh.groupColorAlpha;
    const tint=[0,8,16].map(shift=>((group>>>shift)&255)*((worldColor>>>shift)&255)/(255*255));
    if(!matrix&&tint.every(v=>v===1))return source;
    const key=[texture.source.uid,texture.source._resourceId,tint.join(','),matrix?.join(',')].join(':');
    if(this.colors.has(key)){const cached=this.colors.get(key);this.colors.delete(key);this.colors.set(key,cached);return cached;}
    const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),data=pixels.data;
    for(let i=0;i<data.length;i+=4){
      const r=data[i]*tint[0],g=data[i+1]*tint[1],b=data[i+2]*tint[2],a=data[i+3];
      if(matrix){
        data[i]=matrix[0]*r+matrix[1]*g+matrix[2]*b+matrix[3]*a+matrix[4]*255;
        data[i+1]=matrix[5]*r+matrix[6]*g+matrix[7]*b+matrix[8]*a+matrix[9]*255;
        data[i+2]=matrix[10]*r+matrix[11]*g+matrix[12]*b+matrix[13]*a+matrix[14]*255;
        data[i+3]=matrix[15]*r+matrix[16]*g+matrix[17]*b+matrix[18]*a+matrix[19]*255;
      }else{data[i]=r;data[i+1]=g;data[i+2]=b;}
    }
    ctx.putImageData(pixels,0,0);this.colors.set(key,canvas);
    // Browsing all 122 pieces must not retain a full atlas for every color.
    while(this.colors.size>8)this.colors.delete(this.colors.keys().next().value);
    return canvas;
  }

  execute(mesh){
    if(!mesh.isRenderable)return;
    const renderer=this.renderer,system=renderer.canvasContext,ctx=system.activeContext;
    const worldColor=renderer.globalUniforms.globalUniformData?.worldColor??0xffffffff;
    const alpha=((worldColor>>>24)&255)/255*((mesh.groupColorAlpha>>>24)&255)/255*(renderer.filter?.alphaMultiplier??1);
    if(alpha<=0)return;
    const source=this.sourceFor(mesh,worldColor),geometry=mesh.geometry;
    const vertices=geometry.getBuffer('aPosition').data,uvs=geometry.getBuffer('aUV').data,indices=geometry.getIndex().data;
    const uv=mesh.texture.textureMatrix.mapCoord;
    // Set the blend before save/restore so Pixi's blend-state cache stays valid.
    system.setBlendMode(mesh.groupBlendMode);ctx.save();
    try{
      system.setContextTransform(mesh.groupTransform,(renderer._roundPixels|mesh._roundPixels)===1);
      ctx.globalAlpha=alpha;ctx.imageSmoothingEnabled=mesh.texture.source.style.scaleMode!=='nearest';ctx.imageSmoothingQuality='high';
      const transform=ctx.getTransform(),bleed=.75/Math.max(.01,Math.sqrt(Math.abs(transform.a*transform.d-transform.b*transform.c)));
      for(let i=0;i<indices.length;i+=3){
        const points=[indices[i],indices[i+1],indices[i+2]].map(index=>{
          const u=uvs[index*2],v=uvs[index*2+1];
          return [vertices[index*2],vertices[index*2+1],(uv.a*u+uv.c*v+uv.tx)*source.width,(uv.b*u+uv.d*v+uv.ty)*source.height];
        });
        const [p,q,r]=points,du1=q[2]-p[2],dv1=q[3]-p[3],du2=r[2]-p[2],dv2=r[3]-p[3],det=du1*dv2-du2*dv1;
        const dx1=q[0]-p[0],dy1=q[1]-p[1],dx2=r[0]-p[0],dy2=r[1]-p[1];
        if(Math.abs(det)<1e-8||Math.abs(dx1*dy2-dx2*dy1)<1e-8)continue;
        const a=(dx1*dv2-dx2*dv1)/det,b=(dy1*dv2-dy2*dv1)/det,c=(dx2*du1-dx1*du2)/det,d=(dy2*du1-dy1*du2)/det;
        const winding=Math.sign(dx1*dy2-dx2*dy1),inverse=1/(a*d-b*c);
        const edges=points.map((point,j)=>{const next=points[(j+1)%3],x=next[0]-point[0],y=next[1]-point[1],length=Math.hypot(x,y);return[winding*y/length,-winding*x/length];});
        const expanded=points.map((point,j)=>{
          const before=edges[(j+2)%3],after=edges[j],amount=bleed/Math.max(.1,1+before[0]*after[0]+before[1]*after[1]);
          const x=point[0]+(before[0]+after[0])*amount,y=point[1]+(before[1]+after[1])*amount;
          return [x,y,p[2]+(d*(x-p[0])-c*(y-p[1]))*inverse,p[3]+(a*(y-p[1])-b*(x-p[0]))*inverse];
        });
        const sx=Math.max(0,Math.floor(Math.min(...expanded.map(v=>v[2])))-1),sy=Math.max(0,Math.floor(Math.min(...expanded.map(v=>v[3])))-1);
        const sw=Math.min(source.width,Math.ceil(Math.max(...expanded.map(v=>v[2])))+1)-sx,sh=Math.min(source.height,Math.ceil(Math.max(...expanded.map(v=>v[3])))+1)-sy;
        if(sw<=0||sh<=0)continue;
        ctx.save();
        try{
          // Offset each edge, not just each vertex: shallow triangles also need
          // a full antialiasing pixel of coverage along their shared edge.
          ctx.beginPath();expanded.forEach(([x,y],j)=>ctx[j?'lineTo':'moveTo'](x,y));ctx.closePath();ctx.clip();
          ctx.transform(a,b,c,d,p[0]-a*p[2]-c*p[3],p[1]-b*p[2]-d*p[3]);
          ctx.drawImage(source,sx,sy,sw,sh,sx,sy,sw,sh);
        }finally{ctx.restore();}
      }
    }finally{ctx.restore();}
  }
  destroy(){this.colors.clear();this.renderer=null;}
}

extensions.add(CanvasMeshPipe);
