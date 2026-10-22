// All coordinates are in the shared 1024 × 1536 fitting space.
// These are DragonBones 5.5 weighted meshes, not CSS transforms of a flat doll.
import {fitRose,fitBlue,fitDenim,fitTrousers} from './fitting.mjs';
export {fitRose,fitBlue} from './fitting.mjs';
export const WIDTH = 1024, HEIGHT = 1536;
export const textureFiles = {nora:'nora.png','rose-denim':'rose-denim.png','blue-ivory':'blue-ivory-v2.png'};
export const bones = [
  ['root', null, 512, 620], ['hips', 'root', 512, 620],
  ['chest', 'hips', 512, 420], ['neck', 'chest', 512, 310],
  ['head', 'neck', 512, 280], ['pony', 'head', 449, 160],
  ['upperL', 'chest', 396, 352], ['lowerL', 'upperL', 336, 547], ['handL', 'lowerL', 260, 719],
  ['upperR', 'chest', 628, 352], ['lowerR', 'upperR', 688, 547], ['handR', 'lowerR', 764, 719],
  ['bendL', 'upperL', 336, 547], ['bendR', 'upperR', 688, 547],
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

// Bind by anatomical part, never just by distance from the centre of the body.
// Sleeves share arm weights; sleeveless tops cannot acquire an arm influence.
export function weightsAt(x,y, kind='body') {
  if(kind==='skirt') {
    const t=smooth(635,870,y), side=x<512?'L':'R';
    return pair('hips','hem'+side,t*.65);
  }
  const distance=Math.abs(x-512), side=x<512?'L':'R';
  if(kind==='torso')return pair('chest','hips',smooth(440,625,y));
  if(kind==='armL'||kind==='armR')return armWeights(x,y,kind.at(-1));
  if(y<290) {
    if(x<457 && y>142) return pair('head','pony',smooth(460,395,x)*smooth(140,255,y)*.8);
    return [['head',1]];
  }
  if(y<342 && distance<99) return pair('head','chest',smooth(290,342,y));
  if(y<645) return pair('chest','hips',smooth(430,630,y));
  if(y<850) return pair('hips','thigh'+side,smooth(690,820,y));
  if(y<1130) return pair('thigh'+side,'shin'+side,smooth(969,1095,y));
  return pair('shin'+side,'foot'+side,smooth(1310,1390,y));
}

// The helper at the elbow rotates halfway to the forearm, retaining joint volume.
// Weights follow the limb axis, not horizontal scanlines through the torso.
export function armWeights(x,y,side) {
  const s=side==='L'?-1:1,dx=s*(x-byName['lower'+side].x),dy=y-547;
  const along=dx*.35+dy*.937;
  if(along<-52)return pair('chest','upper'+side,smooth(329,408,y));
  if(along<0)return pair('upper'+side,'bend'+side,smooth(-52,0,along));
  if(along<52)return pair('bend'+side,'lower'+side,smooth(0,52,along));
  return pair('lower'+side,'hand'+side,smooth(695,750,y));
}
const armEdge=y=>table(y,[[300,451],[350,447],[400,423],[440,413],[490,402],[547,384],[620,340],[700,309],[880,300]]);

// Preserve the painted neck and its collar contact in the always-visible body.
// The first 38 px of the neutral tank act as an inner layer under open collars.
const tankOutline=[[440,307],[458,306],[462,326],[480,338],[512,343],[550,338],[574,325],[577,307],[595,310],[600,350],[608,370],[618,390],[623,410],[623,430],[618,450],[607,480],[595,520],[600,560],[619,600],[628,610],[604,621],[563,628],[512,632],[465,629],[416,612],[410,600],[425,570],[432,550],[433,520],[426,490],[416,465],[409,442],[408,423],[411,410],[418,390],[428,370],[436,350]];
function inBaseTop(x,y) {
  if(y>350)x=512+(x-512)*.972;
  let inside=false;
  for(let i=0,j=tankOutline.length-1;i<tankOutline.length;j=i++) {
    const [a,b]=tankOutline[i],[c,d]=tankOutline[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)inside=!inside;
  }
  return inside;
}
function inBaseBottom(x,y) { return y>=604 && y<819 && Math.abs(x-512)<170; }

// Clip triangles at the actual garment/skin boundary. Selecting a whole 20px
// cell by its centre left visible stair-steps when neighbouring parts separated.
function mesh(name,path,rect,map,keep,kind='body',step=20) {
  const vertices=[],uvs=[],triangles=[],weights=[],cache=new Map();
  const add=(u,v)=>{
    const key=u.toFixed(4)+','+v.toFixed(4);
    if(cache.has(key))return cache.get(key);
    const index=vertices.length/2;cache.set(key,index);
    const [px,py]=map(u,v),selection=typeof kind==='function'?kind(u,v,px,py):kind;
    const blend=Array.isArray(selection)?selection:weightsAt(px,py,selection);
    vertices.push(+px.toFixed(4),+py.toFixed(4));uvs.push(u/WIDTH,v/HEIGHT);
    weights.push(blend.length,...blend.flatMap(([bone,w])=>[byName[bone].index,+w.toFixed(6)]));
    return index;
  };
  const cut=poly=>{
    const clipped=[];
    for(let i=0;i<poly.length;i++) {
      const a=poly[i],b=poly[(i+1)%poly.length],insideA=keep(...a),insideB=keep(...b);
      if(insideA)clipped.push(a);
      if(insideA!==insideB) {
        let lo=0,hi=1;
        for(let n=0;n<18;n++){const t=(lo+hi)/2;if(keep(lerp(a[0],b[0],t),lerp(a[1],b[1],t))===insideA)lo=t;else hi=t;}
        const t=(lo+hi)/2;clipped.push([lerp(a[0],b[0],t),lerp(a[1],b[1],t)]);
      }
    }
    for(let i=1;i<clipped.length-1;i++)triangles.push(add(...clipped[0]),add(...clipped[i]),add(...clipped[i+1]));
  };
  for(let y=rect[1];y<rect[3];y+=step) for(let x=rect[0];x<rect[2];x+=step) {
    const x2=Math.min(x+step,rect[2]),y2=Math.min(y+step,rect[3]);
    cut([[x,y],[x2,y],[x2,y2]]);cut([[x2,y2],[x,y2],[x,y]]);
  }
  return {name,path,type:'mesh',vertices,uvs,triangles,weights,slotPose:[1,0,0,1,0,0],bonePose:bones.flatMap((b,i)=>[i,1,0,0,1,b[2],b[3]])};
}
const identity=(x,y)=>[x,y], all=()=>true;
function merge(a,b) {
  const offset=a.vertices.length/2;
  a.vertices.push(...b.vertices);a.uvs.push(...b.uvs);a.weights.push(...b.weights);a.triangles.push(...b.triangles.map(i=>i+offset));return a;
}
// A small painted skin overlap under the armhole keeps the shoulder connected as
// the upper arm rotates. It is hidden beneath the shirt and absent under sleeves.
function shoulderPatch(side) {
  const s=side==='L'?-1:1,sourceX=512+s*136;
  return mesh('shoulder-overlap','nora',[sourceX-18,360,sourceX+18,404],(x,y)=>[512+s*112+(x-sourceX)*1.75,378+(y-382)*1.7],
    (x,y)=>((x-sourceX)/18)**2+((y-382)/22)**2<=1,'arm'+side,8);
}
function frames(values, duration, key='rotate') { return values.map(v=>({duration,tweenEasing:2,[key]:v})); }
function rot(name,values,duration=30) { return {name,rotateFrame:frames(values,duration)}; }
function move(name,values,duration=30) { return {name,translateFrame:values.map(([x,y])=>({x,y,duration,tweenEasing:2}))}; }
export function makeSkeleton() {
  const isArm=(x,y)=>y>306&&y<880&&Math.abs(x-512)>512-armEdge(y);
  const isBody=(x,y)=>!inBaseTop(x,y)&&!inBaseBottom(x,y);
  const bareBody=(x,y)=>isBody(x,y)&&!isArm(x,y)&&(y<340||y>=819);
  const body=mesh('body','nora',[200,0,824,1536],identity,bareBody,'body',28);
  const trouserBody=mesh('covered-legs','nora',[200,0,824,1536],identity,(x,y)=>bareBody(x,y)&&(y<819||y>1345),'body',28);
  // Covered skin is not drawn under sleeves. This avoids a second skin silhouette
  // peeking out of garment edges, while keeping the same shared joints/weights.
  const armKind=(x)=>x<512?'armL':'armR';
  const arms=merge(merge(shoulderPatch('L'),shoulderPatch('R')),mesh('bare-arms','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&isArm(x,y),armKind));
  arms.name='bare-arms';
  const shortArms=mesh('short-sleeve-arms','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&isArm(x,y)&&y>=424,armKind);
  const hands=mesh('cuffed-hands','nora',[200,0,824,1536],identity,(x,y)=>isBody(x,y)&&isArm(x,y)&&y>=705,armKind);
  const tank=mesh('tank','nora',[200,0,824,1536],identity,inBaseTop,'torso');
  const shorts=mesh('shorts','nora',[200,0,824,1536],identity,inBaseBottom);
  const isRoseSleeve=(x,y)=>Math.min(x,1024-x)<table(y,[[650,300],[900,200]]);
  const sleeveKind=(edge)=>(x,y,px,py)=>{
    const t=1-smooth(edge(y)-18,edge(y)+18,Math.min(x,1024-x)),weights=new Map();
    for(const [list,factor] of [[weightsAt(px,py,'torso'),1-t],[armWeights(px,py,x<512?'L':'R'),t]])
      for(const [name,w] of list)if(w*factor>1e-6)weights.set(name,(weights.get(name)||0)+w*factor);
    return [...weights];
  };
  const rose=mesh('rose','rose-denim',[55,190,970,695],fitRose,all,sleeveKind(y=>table(y,[[190,310],[350,340],[470,340],[650,300],[900,200]])));
  // Cuffs continue below the waist in the sheet, alongside the skirt.
  const cuffs=mesh('cuffs','rose-denim',[55,695,970,910],fitRose,isRoseSleeve,armKind);
  merge(rose,cuffs);
  const denim=mesh('denim','rose-denim',[180,695,842,1110],fitDenim,(x,y)=>y>=900||!isRoseSleeve(x,y),'skirt',26);
  const blue=mesh('blue','blue-ivory',[305,150,720,529],fitBlue,(x,y)=>y<520-12*clamp(Math.abs(x-512)/105),sleeveKind(y=>table(y,[[150,365],[250,389],[300,395],[360,390],[400,280],[529,280]])));
  const ivory=mesh('ivory','blue-ivory',[300,514,730,1440],fitTrousers,(x,y)=>y>=530-12*clamp(Math.abs(x-512)/110),'body',26);
  const slot=[{name:'body',parent:'root'},{name:'arms',parent:'chest'},{name:'bottom',parent:'hips'},{name:'top',parent:'chest'}];
  const idle={name:'idle',duration:144,playTimes:0,bone:[
    move('chest',[[0,0],[0,-3.5],[0,0],[0,2]],36),rot('chest',[0,.9,0,-.7],36),
    rot('head',[-1.2,1.6,1,-.7],36),rot('pony',[0,3,0,-3],36),
    rot('upperL',[0,1.2,0,-1.3],36),rot('upperR',[0,-1.1,0,1.4],36),
    rot('lowerL',[0,-1.7,0,1.5],36),rot('lowerR',[0,1.5,0,-1.8],36),
    rot('hemL',[0,1.4,0,-1.4],36),rot('hemR',[0,-1.4,0,1.4],36),
  ]};
  const wave={name:'wave',duration:120,playTimes:1,bone:[
    rot('upperR',[0,-13,-28,-30,-28,-29,-14,0],15),
    rot('lowerR',[0,-22,-72,-82,-77,-80,-36,0],15),
    rot('handR',[0,0,-4,7,-7,6,0,0],15),
    rot('head',[0,-1,-3,-3,-2.5,-2,-1,0],15),
    rot('chest',[0,-.4,-1,-1,-.9,-.8,-.4,0],15),
    rot('pony',[0,1,3,1,-1,1,-1,0],15),
    rot('hemL',[0,-.5,-1,0,1,0,-.5,0],15),rot('hemR',[0,.5,1,0,-1,0,.5,0],15),
  ]};
  const pose={name:'pose',duration:150,playTimes:0,bone:[
    rot('chest',[0,-3,-3,0,2],30),rot('head',[0,5,4,0,-3],30),
    rot('upperL',[0,10,10,0,-2],30),rot('lowerL',[0,-15,-15,0,-3],30),
    rot('upperR',[0,-4,-4,0,-8],30),rot('lowerR',[0,-8,-8,0,-12],30),
    rot('thighL',[0,-2,-2,0,1],30),rot('shinL',[0,3,3,0,-1],30),
    rot('footL',[0,-1,-1,0,0],30),rot('pony',[0,-5,3,0,4],30),
    rot('hemL',[0,3,2,0,-2],30),rot('hemR',[0,-2,-1,0,2],30),
  ]};
  for(const animation of [idle,wave,pose])for(const timeline of [...animation.bone]) {
    if(timeline.name.startsWith('lower'))animation.bone.push({name:'bend'+timeline.name.at(-1),rotateFrame:timeline.rotateFrame.map(f=>({...f,rotate:f.rotate/2}))});
  }
  const skinSlots=[{name:'body',display:[body,trouserBody]},{name:'arms',display:[arms,hands,shortArms]},{name:'bottom',display:[shorts,denim,ivory]},{name:'top',display:[tank,rose,blue]}];
  // This runtime stores native geometry float offsets in unsigned 16-bit fields.
  // Fail at authoring/build time instead of shipping a silently wrapped mesh.
  let packedFloats=0;
  for(const s of skinSlots)for(const m of s.display) {
    packedFloats+=m.vertices.length*2;
    for(let i=0;i<m.weights.length;){const n=m.weights[i];packedFloats+=n*3;i+=1+n*2;}
  }
  if(packedFloats>=65536)throw new Error(`Rig exceeds DragonBones mesh float budget: ${packedFloats}`);
  return {name:'muse-atelier',version:'5.5',compatibleVersion:'5.5',frameRate:30,armature:[{
    name:'Nora',type:'Armature',frameRate:30,aabb:{x:0,y:0,width:WIDTH,height:HEIGHT},
    bone:bones.map(([name,parent,x,y])=>({name,...(parent?{parent}:{}),length:parent?Math.hypot(x-byName[parent].x,y-byName[parent].y):0,transform:{x:x-(parent?byName[parent].x:0),y:y-(parent?byName[parent].y:0)}})),
    slot,skin:[{name:'default',slot:skinSlots}],animation:[idle,wave,pose],
  }]};
}
export const wardrobe = {
  tops:[{id:'tank',name:'Cloud tank',note:'Soft cotton',color:'#eae1cd',texture:'nora',crop:[390,305,245,330],clip:[[440,307],[458,306],[462,326],[480,338],[512,343],[550,338],[574,325],[577,307],[595,310],[594,354],[607,397],[623,433],[613,493],[594,545],[609,597],[629,618],[592,630],[512,634],[430,625],[410,607],[430,555],[427,516],[414,480],[406,445],[413,404],[430,357]]},
    {id:'rose',name:'Rosie cardigan',note:'Pearl buttons',color:'#dca3a9',texture:'rose-denim',crop:[260,200,500,490]},
    {id:'blue',name:'Sunday polo',note:'Cable knit',color:'#b6c6d7',texture:'blue-ivory',crop:[320,160,390,370]}],
  bottoms:[{id:'shorts',name:'Studio shorts',note:'Soft stretch',color:'#bb7f8a',texture:'nora',crop:[350,630,330,192]},
    {id:'denim',name:'Denim days',note:'A-line silhouette',color:'#55708d',texture:'rose-denim',crop:[180,695,665,412],clip:[[340,695],[685,695],[842,1110],[180,1110]]},
    {id:'ivory',name:'Gallery trousers',note:'Fluid wide leg',color:'#e8d7bb',texture:'blue-ivory',crop:[315,530,400,900]}],
};
