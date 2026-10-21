// All coordinates are in the shared 1024 × 1536 fitting space.
// These are DragonBones 5.5 weighted meshes, not CSS transforms of a flat doll.
export const WIDTH = 1024, HEIGHT = 1536;
export const textureFiles = {nora:'nora.png','rose-denim':'rose-denim.png','blue-ivory':'blue-ivory-v2.png'};
export const bones = [
  ['root', null, 512, 620], ['hips', 'root', 512, 620],
  ['chest', 'hips', 512, 420], ['neck', 'chest', 512, 310],
  ['head', 'neck', 512, 280], ['pony', 'head', 449, 160],
  ['upperL', 'chest', 396, 352], ['lowerL', 'upperL', 336, 547], ['handL', 'lowerL', 260, 719],
  ['upperR', 'chest', 628, 352], ['lowerR', 'upperR', 688, 547], ['handR', 'lowerR', 764, 719],
  ['thighL', 'hips', 431, 732], ['shinL', 'thighL', 425, 1032], ['footL', 'shinL', 417, 1352],
  ['thighR', 'hips', 593, 732], ['shinR', 'thighR', 599, 1032], ['footR', 'shinR', 607, 1352],
  ['hemL', 'hips', 442, 800], ['hemR', 'hips', 582, 800],
];
const byName = Object.fromEntries(bones.map((b, i) => [b[0], { x:b[2], y:b[3], index:i }]));
export const clamp = (n, a=0, b=1) => Math.max(a, Math.min(b, n));
const smooth = (a,b,n) => { const t=clamp((n-a)/(b-a)); return t*t*(3-2*t); };
const pair = (a,b,t) => t<=0 ? [[a,1]] : t>=1 ? [[b,1]] : [[a,1-t],[b,t]];
const lerp = (a,b,t) => a+(b-a)*t;
function table(y, rows) {
  for(let i=1;i<rows.length;i++) if(y<=rows[i][0]) {
    const a=rows[i-1],b=rows[i]; return lerp(a[1],b[1],clamp((y-a[0])/(b[0]-a[0])));
  }
  return rows.at(-1)[1];
}

// One anatomical weight field is shared by skin, sleeve, shirt and trouser meshes.
// Skirts intentionally hang from the pelvis/hem bones instead of splitting between thighs.
export function weightsAt(x,y, kind='body') {
  if(kind==='skirt') {
    const t=smooth(635,870,y), side=x<512?'L':'R';
    return pair('hips','hem'+side,t*.65);
  }
  const distance=Math.abs(x-512), side=x<512?'L':'R';
  if(y<290) {
    if(x<457 && y>142) return pair('head','pony',smooth(460,395,x)*smooth(140,255,y)*.8);
    return [['head',1]];
  }
  if(y<342 && distance<99) return pair('head','chest',smooth(290,342,y));
  // Keep the inner elbow on the arm too. A straight waist-to-shoulder separator
  // wrongly pins its inner vertices to the torso and makes a triangle when waving.
  const edge=table(y,[[300,110],[352,95],[400,105],[490,112],[560,130],[620,155],[700,188],[830,220]]);
  if(y<880 && distance>edge && y>304) {
    if(y<420) return pair('chest','upper'+side,smooth(edge-15,edge+18,distance));
    if(y<485) return [['upper'+side,1]];
    if(y<608) return pair('upper'+side,'lower'+side,smooth(487,601,y));
    return pair('lower'+side,'hand'+side,smooth(687,756,y));
  }
  if(y<645) return pair('chest','hips',smooth(430,630,y));
  if(y<850) return pair('hips','thigh'+side,smooth(690,820,y));
  if(y<1130) return pair('thigh'+side,'shin'+side,smooth(969,1095,y));
  return pair('shin'+side,'foot'+side,smooth(1310,1390,y));
}

// Garment fitting is authored as source-to-bind-pose cages, separate from animation.
// This lets a different size drawing reuse exactly the same shoulder/elbow/waist rig.
function mapArm(x,y,source,target,widthScale) {
  const v=[source[1][0]-source[0][0],source[1][1]-source[0][1]];
  const w=[target[1][0]-target[0][0],target[1][1]-target[0][1]];
  const len=Math.hypot(...v), t=((x-source[0][0])*v[0]+(y-source[0][1])*v[1])/(len*len);
  const d=((x-source[0][0])*-v[1]+(y-source[0][1])*v[0])/len;
  const l2=Math.hypot(...w);
  return [target[0][0]+t*w[0]-d*widthScale*w[1]/l2,target[0][1]+t*w[1]+d*widthScale*w[0]/l2];
}
export function fitRose(x,y) {
  const side=x<512?-1:1, lx=512-Math.abs(x-512);
  const armEdge=table(y,[[200,300],[350,340],[470,340],[650,300],[900,200]]);
  if(lx<armEdge && y<900) {
    const upper=mapArm(lx,y,[[305,280],[248,555]],[[396,352],[336,547]],.65);
    const lower=mapArm(lx,y,[[248,555],[112,828]],[[336,547],[260,719]],.65);
    const blend=smooth(495,595,y);
    const ease=1-smooth(300,550,y);
    const p=[lerp(upper[0],lower[0],blend)-3*ease,lerp(upper[1],lower[1],blend)-4*ease];
    return [512+side*(512-p[0]),p[1]];
  }
  const py=table(y,[[0,140],[200,300],[278,340],[450,455],[675,625],[700,640],[1095,902],[1536,1200]]);
  const scale=table(y,[[0,.74],[278,.72],[450,.64],[675,.65],[800,.66],[1095,.67],[1536,.67]]);
  return [512+(x-512)*scale,py];
}
export function fitBlue(x,y) {
  const py=table(y,[[0,150],[165,298],[208,316],[350,455],[520,628],[550,648],[700,780],[1050,1050],[1420,1400],[1536,1510]]);
  let scale=table(y,[[0,.74],[170,.78],[210,.99],[350,.93],[510,.94],[700,.99],[1420,.97],[1536,.97]]);
  // Sleeve cuffs extend far enough to cover the underlying upper arm at every frame.
  if(y<365 && Math.abs(x-512)>116) scale*=1.08;
  return [512+(x-512)*scale,py];
}

// Preserve the painted neck and its collar contact in the always-visible body.
// The first 38 px of the neutral tank act as an inner layer under open collars.
function inBaseTop(x,y) { return y>=340 && y<632 && Math.abs(x-512)<table(y,[[340,95],[390,113],[460,101],[570,109],[632,133]]); }
function inBaseBottom(x,y) { return y>=632 && y<819 && Math.abs(x-512)<170; }

// Adjacent quads share vertices. Boundaries are quantized identically for body and
// base garments so selecting/removing an item cannot expose a missing triangle.
function mesh(name,path,rect,map,keep,kind='body',step=20) {
  const vertices=[],uvs=[],triangles=[],weights=[],cache=new Map();
  for(let y=rect[1];y<rect[3];y+=step) for(let x=rect[0];x<rect[2];x+=step) {
    const x2=Math.min(x+step,rect[2]),y2=Math.min(y+step,rect[3]);
    if(!keep((x+x2)/2,(y+y2)/2)) continue;
    const indices=[];
    for(const [u,v] of [[x,y],[x2,y],[x2,y2],[x,y2]]) {
      const key=u+','+v;
      if(cache.has(key)) { indices.push(cache.get(key)); continue; }
      const index=vertices.length/2; cache.set(key,index);indices.push(index);
      const [px,py]=map(u,v), blend=weightsAt(px,py,kind);
      vertices.push(+px.toFixed(4),+py.toFixed(4));uvs.push(u/WIDTH,v/HEIGHT);
      weights.push(blend.length,...blend.flatMap(([bone,w])=>[byName[bone].index,+w.toFixed(6)]));
    }
    const [a,b,c,d]=indices;triangles.push(a,b,c,c,d,a);
  }
  return {name,path,type:'mesh',vertices,uvs,triangles,weights,slotPose:[1,0,0,1,0,0],bonePose:bones.flatMap((b,i)=>[i,1,0,0,1,b[2],b[3]])};
}
const identity=(x,y)=>[x,y], all=()=>true;
function frames(values, duration, key='rotate') { return values.map(v=>({duration,tweenEasing:0,[key]:v})); }
function rot(name,values,duration=30) { return {name,rotateFrame:frames(values,duration)}; }
function move(name,values,duration=30) { return {name,translateFrame:values.map(([x,y])=>({x,y,duration,tweenEasing:0}))}; }
export function makeSkeleton() {
  const isArm=(x,y)=>y>306&&y<730&&Math.abs(x-512)>table(y,[[300,100],[400,105],[490,112],[560,130],[620,155],[700,188],[830,220]]);
  const isBody=(x,y)=>!inBaseTop(x,y)&&!inBaseBottom(x,y);
  const body=mesh('body','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&!isArm(x,y));
  // Covered skin is not drawn under sleeves. This avoids a second skin silhouette
  // peeking out of garment edges, while keeping the same shared joints/weights.
  const arms=mesh('bare-arms','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&isArm(x,y));
  const shortArms=mesh('short-sleeve-arms','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&isArm(x,y)&&y>=440);
  const tank=mesh('tank','nora',[200,0,824,1536],identity,inBaseTop);
  const shorts=mesh('shorts','nora',[200,0,824,1536],identity,inBaseBottom);
  const isRoseSleeve=(x,y)=>Math.min(x,1024-x)<table(y,[[650,300],[900,200]]);
  const rose=mesh('rose','rose-denim',[55,190,970,910],fitRose,(x,y)=>y<695||isRoseSleeve(x,y));
  const denim=mesh('denim','rose-denim',[180,695,842,1110],fitRose,(x,y)=>y>=900||!isRoseSleeve(x,y),'skirt');
  const blue=mesh('blue','blue-ivory',[305,150,720,529],fitBlue,all);
  const ivory=mesh('ivory','blue-ivory',[300,529,730,1440],fitBlue,all);
  const slot=[{name:'body',parent:'root'},{name:'arms',parent:'chest'},{name:'bottom',parent:'hips'},{name:'top',parent:'chest'}];
  const idle={name:'idle',duration:144,playTimes:0,bone:[
    move('chest',[[0,0],[0,-3.5],[0,0],[0,2]],36),rot('chest',[0,.9,0,-.7],36),
    rot('head',[-1.2,1.6,1,-.7],36),rot('pony',[0,3,0,-3],36),
    rot('upperL',[0,1.2,0,-1.3],36),rot('upperR',[0,-1.1,0,1.4],36),
    rot('lowerL',[0,-1.7,0,1.5],36),rot('lowerR',[0,1.5,0,-1.8],36),
    rot('hemL',[0,1.4,0,-1.4],36),rot('hemR',[0,-1.4,0,1.4],36),
  ]};
  const wave={name:'wave',duration:120,playTimes:1,bone:[
    rot('upperR',[0,-32,-32,-32,-32,0],20),rot('lowerR',[0,-100,-100,-100,-100,0],20),
    rot('handR',[0,-12,14,-12,14,0],20),rot('head',[0,-4,-3,-4,-2,0],20),
    rot('chest',[0,-1.2,-1.2,-1.2,-1.2,0],20),rot('pony',[0,4,-2,3,-2,0],20),
    rot('hemL',[0,-1,1,-1,1,0],20),rot('hemR',[0,1,-1,1,-1,0],20),
  ]};
  const pose={name:'pose',duration:150,playTimes:0,bone:[
    rot('chest',[0,-3,-3,0,2],30),rot('head',[0,5,4,0,-3],30),
    rot('upperL',[0,10,10,0,-2],30),rot('lowerL',[0,-15,-15,0,-3],30),
    rot('upperR',[0,-4,-4,0,-8],30),rot('lowerR',[0,-8,-8,0,-12],30),
    rot('thighL',[0,-2,-2,0,1],30),rot('shinL',[0,3,3,0,-1],30),
    rot('footL',[0,-1,-1,0,0],30),rot('pony',[0,-5,3,0,4],30),
    rot('hemL',[0,3,2,0,-2],30),rot('hemR',[0,-2,-1,0,2],30),
  ]};
  return {name:'muse-atelier',version:'5.5',compatibleVersion:'5.5',frameRate:30,armature:[{
    name:'Nora',type:'Armature',frameRate:30,aabb:{x:0,y:0,width:WIDTH,height:HEIGHT},
    bone:bones.map(([name,parent,x,y])=>({name,...(parent?{parent}:{}),length:parent?Math.hypot(x-byName[parent].x,y-byName[parent].y):0,transform:{x:x-(parent?byName[parent].x:0),y:y-(parent?byName[parent].y:0)}})),
    slot,skin:[{name:'default',slot:[{name:'body',display:[body]},{name:'arms',display:[arms,shortArms]},{name:'bottom',display:[shorts,denim,ivory]},{name:'top',display:[tank,rose,blue]}]}],animation:[idle,wave,pose],
  }]};
}
export const wardrobe = {
  tops:[{id:'tank',name:'Cloud tank',note:'Soft cotton',color:'#eae1cd',texture:'nora',crop:[390,305,245,330]},
    {id:'rose',name:'Rosie cardigan',note:'Pearl buttons',color:'#dca3a9',texture:'rose-denim',crop:[260,200,500,490]},
    {id:'blue',name:'Sunday polo',note:'Cable knit',color:'#b6c6d7',texture:'blue-ivory',crop:[320,160,390,370]}],
  bottoms:[{id:'shorts',name:'Studio shorts',note:'Soft stretch',color:'#bb7f8a',texture:'nora',crop:[350,600,330,222]},
    {id:'denim',name:'Denim days',note:'A-line silhouette',color:'#55708d',texture:'rose-denim',crop:[180,695,665,412]},
    {id:'ivory',name:'Gallery trousers',note:'Fluid wide leg',color:'#e8d7bb',texture:'blue-ivory',crop:[315,530,400,900]}],
};
