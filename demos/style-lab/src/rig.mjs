import {fitCage} from '../../skeletal/src/fitting.mjs';

// Every layer is fitted once into this space, then bound to the SAME weight field.
export const WIDTH=1024, HEIGHT=1536;
export const textureFiles={mira:'mira.png',rose:'rose-lilac.png',blue:'blue-ivory.png'};
export const bones=[
  ['root',null,515,574],['hips','root',515,574],['chest','hips',515,440],
  ['neck','chest',515,325],['head','neck',515,280],['pony','head',437,155],
  ['upperL','chest',396,367],['elbowL','upperL',365,574],['wristL','elbowL',316,757],
  ['upperR','chest',631,367],['elbowR','upperR',660,574],['wristR','elbowR',714,757],
];
const byName=Object.fromEntries(bones.map(([name,parent,x,y],index)=>[name,{parent,x,y,index}]));
const clamp=n=>Math.max(0,Math.min(1,n));
const smooth=(a,b,n)=>{const t=clamp((n-a)/(b-a));return t*t*(3-2*t);};
const pair=(a,b,t)=>t===0?[[a,1]]:t===1?[[b,1]]:[[a,1-t],[b,t]];
export function weightsAt(x,y) {
  if(y<300) return x<440&&y>155?pair('head','pony',smooth(440,365,x)*.6):[['head',1]];
  if(y<370&&Math.abs(x-515)<95)return pair('head','chest',smooth(300,370,y));
  const side=x<515?'L':'R',edge=y<570?411+18*smooth(465,570,y):429-76*smooth(570,820,y);
  if(y>370&&y<890&&(x<edge||x>1030-edge)) {
    if(y<525)return pair('chest','upper'+side,smooth(370,460,y));
    if(y<630)return pair('upper'+side,'elbow'+side,smooth(525,630,y));
    return pair('elbow'+side,'wrist'+side,smooth(710,800,y));
  }
  return pair('chest','hips',smooth(420,575,y));
}
const topOutline=[[455,330],[462,351],[480,363],[514,369],[548,363],[569,349],[574,330],[640,346],[661,372],[686,452],[664,465],[621,473],[611,447],[605,483],[591,532],[602,565],[580,577],[450,577],[427,564],[436,534],[422,483],[412,447],[405,473],[343,453],[359,402],[375,362],[398,346]];
const skirtOutline=[[434,565],[600,565],[612,603],[632,633],[648,674],[663,714],[679,769],[691,820],[660,837],[590,848],[510,852],[430,848],[338,820],[355,754],[377,682],[411,617]];
export function inside(x,y,poly) {
  let yes=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const [a,b]=poly[i],[c,d]=poly[j];
    if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;
  }
  return yes;
}
const identity=(x,y)=>[x,y];
// Full, continuous fit cages; sleeves are never independently scaled rectangles.
export const roseLandmarks=[
  [442,343,455,330],[628,343,574,330],[475,448,470,363],[594,448,560,363],
  [356,365,394,346],[712,365,640,346],[269,490,337,448],[797,490,690,448],
  [282,526,345,465],[367,545,411,479],[704,545,620,479],[784,526,682,465],
  [402,684,430,567],[663,684,600,567],[531,702,515,579],[530,550,515,445],
];
export const blueLandmarks=[
  [457,137,455,330],[565,137,575,330],[511,203,515,370],
  [357,182,395,346],[671,182,637,346],[298,315,341,451],[727,315,686,451],
  [378,339,408,473],[648,339,622,473],[405,457,429,568],[620,457,601,568],[514,473,515,579],
];
export const fitRose=fitCage(roseLandmarks),fitBlue=fitCage(blueLandmarks);
export const fitLilac=fitCage([[410,707,434,566],[655,707,597,566],[532,707,515,566],[263,1049,341,835],[799,1049,689,835],[531,1097,515,864]]);
export const fitIvory=fitCage([[410,479,434,566],[615,479,597,566],[514,479,515,566],[351,633,380,740],[676,633,646,740],[514,674,515,843],[330,1395,385,1380],[494,1404,502,1382],[536,1404,553,1382],[696,1395,684,1380]]);

export function mesh(name,path,rect,map=identity,keep=()=>true,step=26) {
  const vertices=[],uvs=[],triangles=[],weights=[],cache=new Map();
  const add=(u,v)=>{
    const key=u.toFixed(4)+','+v.toFixed(4);if(cache.has(key))return cache.get(key);
    const index=vertices.length/2;cache.set(key,index);
    const [x,y]=map(u,v),blend=weightsAt(x,y);
    vertices.push(x,y);uvs.push(u/WIDTH,v/HEIGHT);
    weights.push(blend.length,...blend.flatMap(([bone,w])=>[byName[bone].index,w]));return index;
  };
  const cut=poly=>{
    const clipped=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],ka=keep(...a),kb=keep(...b);
      if(ka)clipped.push(a);
      if(ka!==kb){let lo=0,hi=1;for(let n=0;n<19;n++){const t=(lo+hi)/2;if(keep(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)===ka)lo=t;else hi=t;}
        const t=(lo+hi)/2;clipped.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}
    }
    for(let i=1;i<clipped.length-1;i++)triangles.push(add(...clipped[0]),add(...clipped[i]),add(...clipped[i+1]));
  };
  for(let y=rect[1];y<rect[3];y+=step)for(let x=rect[0];x<rect[2];x+=step){const xx=Math.min(x+step,rect[2]),yy=Math.min(y+step,rect[3]);cut([[x,y],[xx,y],[xx,yy]]);cut([[xx,yy],[x,yy],[x,y]]);}
  return {name,path,type:'mesh',vertices,uvs,triangles,weights,slotPose:[1,0,0,1,0,0],bonePose:bones.flatMap((b,i)=>[i,1,0,0,1,b[2],b[3]])};
}
const frames=(values,key)=>values.map(v=>({duration:45,tweenEasing:2,...(key==='translate'?{x:v[0],y:v[1]}:{rotate:v})}));
export function makeSkeleton({campaign=false}={}){
  // The narrow ivory insert is an intentional inner tee under the open cardigan.
  const inner=(x,y)=>inside(x,y,topOutline)&&x>447&&x<585&&y<416;
  const bodyKeep=(x,y)=>(!inside(x,y,topOutline)||!campaign&&inner(x,y))&&!inside(x,y,skirtOutline)&&(!campaign||y<1355);
  const skinSlots=[
    {name:'body',display:[
      mesh('body','mira',[260,40,765,1500],identity,bodyKeep),
      mesh('body-trousers','mira',[260,40,765,1500],identity,(x,y)=>bodyKeep(x,y)&&(y<840||y>1368||x<345||x>690)),
    ]},
    {name:'top',display:[
      mesh('cotton','mira',[338,325,690,584],identity,(x,y)=>inside(x,y,topOutline)&&y<572-5*Math.min(1,Math.abs(x-515)/80)),
      mesh('rose','rose',[260,335,805,707],fitRose,(x,y)=>y<699-8*Math.min(1,Math.abs(x-532)/130)),
      mesh('polo','blue',[290,130,735,479],fitBlue,(x,y)=>y<472-8*Math.min(1,Math.abs(x-514)/110)),
    ]},
    {name:'bottom',display:[
      mesh('denim','mira',[335,564,690,854],identity,(x,y)=>inside(x,y,skirtOutline)),
      mesh('lilac','rose',[255,707,807,1110],fitLilac),
      mesh('ivory','blue',[320,479,705,1420],fitIvory),
    ]},
  ];
  let packed=0;for(const s of skinSlots)for(const m of s.display){packed+=m.vertices.length*2;for(let i=0;i<m.weights.length;){const n=m.weights[i];packed+=n*3;i+=1+n*2;}}
  if(packed>=65536)throw new Error(`DragonBones mesh budget exceeded: ${packed}`);
  return {name:'muse-style-lab',version:'5.5',compatibleVersion:'5.5',frameRate:30,armature:[{
    name:'Mira',type:'Armature',frameRate:30,aabb:{x:0,y:0,width:WIDTH,height:HEIGHT},
    bone:bones.map(([name,parent,x,y])=>({name,...(parent?{parent}:{}),transform:{x:x-(parent?byName[parent].x:0),y:y-(parent?byName[parent].y:0)}})),
    slot:[{name:'body',parent:'root'},{name:'top',parent:'chest'},{name:'bottom',parent:'hips'}],skin:[{name:'default',slot:skinSlots}],
    animation:[{name:'breathe',duration:180,playTimes:0,bone:[
      {name:'chest',translateFrame:frames([[0,0],[0,-2.4],[0,0],[0,1]],'translate')},
      ...[['head',[0,.6,0,-.45]],['pony',[0,-1.1,0,.8]],['upperL',[0,.35,0,-.2]],['upperR',[0,-.35,0,.2]],['elbowL',[0,-.3,0,.2]],['elbowR',[0,.3,0,-.2]]].map(([name,values])=>({name,rotateFrame:frames(values,'rotate')})),
    ]}],
  }]};
}
export const wardrobe={
  tops:[{name:'Everyday cotton',note:'Clean & effortless',texture:'mira',crop:[335,326,360,255],clip:topOutline,color:'#f1e7d9'},
    {name:'Rosy cardigan',note:'Soft knit · pearl buttons',texture:'rose',crop:[260,335,550,368],color:'#dfafb5'},
    {name:'Sunday polo',note:'A little preppy',texture:'blue',crop:[290,130,450,345],color:'#a6bddc'}],
  bottoms:[{name:'Bluebird denim',note:'A-line · everyday classic',texture:'mira',crop:[335,564,360,290],clip:skirtOutline,color:'#7897b4'},
    {name:'Lilac pleats',note:'Soft movement',texture:'rose',crop:[255,703,555,405],color:'#bba7cf'},
    {name:'Gallery trousers',note:'Relaxed wide leg',texture:'blue',crop:[320,475,390,945],color:'#ebe1ce'}],
};
