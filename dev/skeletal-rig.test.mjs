import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pose,render,display,skeleton,sources} from './skeletal-offline.mjs';
import {bones} from '../demos/skeletal/src/rig.mjs';
import {fitCage,roseLandmarks,blueLandmarks,denimLandmarks,trouserLandmarks} from '../demos/skeletal/src/fitting.mjs';
const report={kind:'offline-native-rig-check',checks:[],frames:0,elbowTriangles:0,pixelSamples:0,minElbowAreaRatio:Infinity,minElbowWidthRatio:Infinity};
const pass=text=>{report.checks.push(text);console.log('PASS:',text);};
const meshes=skeleton.armature[0].skin[0].slot;
const area=(v,a,b,c)=>(v[b*2]-v[a*2])*(v[c*2+1]-v[a*2+1])-(v[b*2+1]-v[a*2+1])*(v[c*2]-v[a*2]);
const alpha=(image,x,y)=>{
  let a=0;const sx=Math.round(x*.5),sy=Math.round(y*.5);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(sx+dx>=0&&sy+dy>=0&&sx+dx<image.width&&sy+dy<image.height)a=Math.max(a,image.data[((sy+dy)*image.width+sx+dx)*4+3]);
  report.pixelSamples++;return a;
};
let floats=0;
for(const slot of meshes)for(const mesh of slot.display) {
  floats+=mesh.vertices.length*2;
  for(let i=0;i<mesh.weights.length;) {
    const count=mesh.weights[i++];let sum=0;
    for(let k=0;k<count;k++){const bone=mesh.weights[i++],w=mesh.weights[i++];assert.ok(bone>=0&&bone<bones.length);sum+=w;floats+=3;}
    assert.ok(Math.abs(sum-1)<.00001);
  }
}
assert.ok(floats<65536,`DragonBones 5.5 mesh float offsets overflow: ${floats}`);
pass(`Normalized weights; ${floats}/65536 packed float entries fit the native runtime`);
for(const points of [roseLandmarks,blueLandmarks,denimLandmarks,trouserLandmarks]) {
  const fit=fitCage(points);
  for(const [x,y,u,v] of points)assert.ok(Math.hypot(fit(x,y)[0]-u,fit(x,y)[1]-v)<.001);
}
pass('Every garment landmark matches its bind-pose target');

const tank=meshes.find(s=>s.name==='top').display[0];
for(let i=0;i<tank.weights.length;){const count=tank.weights[i++];for(let k=0;k<count;k++){assert.ok(['chest','hips'].includes(bones[tank.weights[i++]][0]),'Tank must not follow the arm');i++;}}
pass('Sleeveless torso cannot be dragged by shoulder, elbow or wrist bones');

const opaque=mesh=>{
  const image=sources[mesh.path];
  return (index)=>image.data[(Math.min(1535,Math.floor(mesh.uvs[index*2+1]*1536))*1024+Math.min(1023,Math.floor(mesh.uvs[index*2]*1024)))*4+3]>200;
};
for(const motion of ['idle','wave','pose']) {
  const duration=skeleton.armature[0].animation.find(a=>a.name===motion).duration/30;
  for(let frame=0;frame<Math.round(duration*30);frame++) {
    // Cycle all selections while paused. This exercises the first frame after a
    // switch, not only a wardrobe that has already settled for several ticks.
    const top=frame%3,bottom=Math.floor(frame/3)%3;
    pose(top,bottom,motion,frame/30);report.frames++;
    for(const slot of display.armature.getSlots()) {
      const mesh=meshes.find(s=>s.name===slot.name).display[slot.displayIndex],v=slot.display.vertices;
      assert.equal(v.length,mesh.vertices.length);
      assert.ok(v.every(n=>Number.isFinite(n)&&Math.abs(n)<2000),`${motion}/${frame}/${slot.name}: stale or overflowing geometry`);
      if(!['arms','top'].includes(slot.name))continue;
      const isOpaque=opaque(mesh);
      for(let i=0;i<mesh.triangles.length;i+=3) {
        const ids=mesh.triangles.slice(i,i+3);
        if(!ids.every(index=>mesh.vertices[index*2]>640&&mesh.vertices[index*2]<745&&mesh.vertices[index*2+1]>495&&mesh.vertices[index*2+1]<600&&isOpaque(index)))continue;
        const rest=area(mesh.vertices,...ids);if(Math.abs(rest)<2)continue;
        const ratio=area(v,...ids)/rest;report.minElbowAreaRatio=Math.min(report.minElbowAreaRatio,ratio);report.elbowTriangles++;
        assert.ok(ratio>.20&&ratio<2.1,`${motion}/${frame}/${slot.name}: elbow triangle collapse/inversion (${ratio})`);
      }
    }
  }
}
pass(`${report.frames} native animation frames and paused outfit swaps: finite geometry; no inverted/collapsed opaque elbow triangles`);

const restWidths=new Map();
for(let top=0;top<3;top++)for(let bottom=0;bottom<3;bottom++) {
  for(const time of [0,.35,.7,1.1,1.6,2.1,2.65,3.2,3.8]) {
    const image=render(top,bottom,'wave',time);
    const bone=name=>display.armature.getBone(name).globalTransformMatrix;
    const elbow=bone('bendR'),nx=elbow.a*.937-elbow.c*.35,ny=elbow.b*.937-elbow.d*.35;
    let width=0;
    for(let d=-60;d<=60;d++) {
      const x=Math.round((elbow.tx+nx*d)*.5),y=Math.round((elbow.ty+ny*d)*.5);
      if(image.data[(y*image.width+x)*4+3]>180)width++;
    }
    if(time===0)restWidths.set(top,width);
    const ratio=width/restWidths.get(top);report.minElbowWidthRatio=Math.min(report.minElbowWidthRatio,ratio);
    assert.ok(ratio>=.85&&ratio<=1.25,`${top}/${time}: elbow silhouette lost volume (${ratio})`);
    for(const name of ['neck','chest','hips','lowerL','lowerR','handL','handR','footL','footR']) {
      const b=bone(name);assert.ok(alpha(image,b.tx,b.ty)>180,`${top}/${bottom}/${time}: contact hole at ${name}`);
    }
    const waist=bone('hips');
    for(let x=-75;x<=75;x+=10)for(const y of [2,7,12])assert.ok(alpha(image,waist.tx+x,waist.ty+y)>180,`${top}/${bottom}/${time}: waist gap ${x}/${y}`);
    for(const side of ['L','R']) {
      const shoulder=bone('upper'+side),elbow=bone('lower'+side),wrist=bone('hand'+side);
      for(const [a,b] of [[shoulder,elbow],[elbow,wrist]])for(let t=.1;t<1;t+=.1)
        assert.ok(alpha(image,a.tx+(b.tx-a.tx)*t,a.ty+(b.ty-a.ty)*t)>180,`${top}/${bottom}/${time}: disconnected arm ${side}/${t}`);
    }
  }
}
pass(`81 rendered outfit/pose cases; ${report.pixelSamples} contacts across both arm chains and the waist band`);
pass('Rendered elbow silhouette retains at least 85% of its resting thickness in every sampled wave pose');
report.passed=true;fs.mkdirSync('artifacts/skeletal-offline',{recursive:true});fs.writeFileSync('artifacts/skeletal-offline/report.json',JSON.stringify(report,null,2));
