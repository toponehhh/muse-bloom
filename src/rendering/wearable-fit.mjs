import {inside} from './rig.mjs';

// Measured in original atlas pixels. Each shoe has its own heel opening and
// sole, so an empty atlas gutter cannot affect its scale or ankle registration.
const definitions={
 maryjane:{rects:[[24,83,254,460],[260,83,490,460]],ankles:[[172,180],[338,180]],soles:[[129,448],[387,448]],width:.53,
  holes:[[[172,110],[190,126],[207,173],[211,219],[195,285],[178,319],[119,334],[92,326],[113,247],[134,187],[153,141]],[[339,110],[320,129],[305,173],[299,219],[315,285],[333,319],[393,334],[422,326],[401,247],[379,187],[359,141]]],straps:[[220,252]]},
 loafer:{rects:[[530,82,762,456],[770,82,1007,456]],ankles:[[686,174],[842,174]],soles:[[653,445],[884,445]],width:.53,
  holes:[[[687,110],[706,133],[724,188],[732,224],[598,246],[619,187],[655,133]],[[841,110],[822,133],[804,188],[796,224],[930,246],[909,187],[873,133]]]},
 boot:{rects:[[21,541,254,970],[267,541,492,970]],ankles:[[168,603],[344,603]],soles:[[144,957],[385,957]],width:.52,ankleY:1306,
  holes:[[[123,601],[137,588],[170,584],[204,590],[213,603],[199,621],[141,621]],[[298,603],[312,590],[345,584],[378,590],[390,603],[377,621],[315,621]]]},
 sandal:{rects:[[526,580,765,977],[775,580,1015,977]],ankles:[[650,647],[864,647]],soles:[[635,961],[895,961]],width:.5,
  holes:[[[650,614],[679,616],[704,640],[707,687],[689,749],[713,807],[721,851],[722,891],[700,918],[628,933],[576,913],[557,883],[564,839],[584,782],[588,733],[607,677],[626,631]],[[864,614],[835,616],[810,640],[807,687],[825,749],[801,807],[793,851],[792,891],[814,918],[886,933],[938,913],[957,883],[950,839],[930,782],[926,733],[907,677],[888,631]]],straps:[[827,857],[656,686],[701,728]]},
 heel:{rects:[[18,1048,254,1477],[264,1048,491,1477]],ankles:[[173,1146],[335,1146]],soles:[[128,1442],[389,1442]],width:.52,
  holes:[[[174,1075],[191,1090],[201,1150],[201,1241],[182,1295],[125,1316],[75,1308],[98,1246],[122,1184],[147,1120]],[[334,1075],[317,1090],[307,1150],[307,1241],[326,1295],[383,1316],[433,1308],[410,1246],[386,1184],[361,1120]]]},
 platform:{rects:[[524,1046,762,1461],[771,1046,1009,1461]],ankles:[[652,1112],[855,1112]],soles:[[629,1443],[894,1443]],width:.52,
  holes:[[[652,1070],[680,1075],[699,1094],[703,1120],[601,1120],[615,1088]],[[855,1070],[827,1075],[808,1094],[804,1120],[906,1120],[892,1088]]]},
};
export function footwearTemplates(){
 const result={};for(const [kind,spec]of Object.entries(definitions)){
  const parts=spec.rects.map((rect,side)=>{const [ax,ay]=spec.ankles[side],[sx,sy]=spec.soles[side],tx=side?623:462,soleX=side?643:447,ty=spec.ankleY||1352;
   return {texture:'shoes',rect,role:'shoes',keep:()=>true,
    map:(x,y)=>{const t=(y-ay)/(sy-ay);return [tx+(x-ax)*spec.width+(soleX-tx-(sx-ax)*spec.width)*t,y<ay?ty+(y-ay)*(kind==='boot'?.34:.18):ty+(1474-ty)*t];},
    // Rear walls render behind the foot. The vamp and straps render in front.
    frontKeep:(x,y)=>y>=ay-8&&(!inside(x,y,spec.holes[side])||(spec.straps||[]).some(([a,b])=>y>=a&&y<=b))};
  });
  const r=spec.rects;result[kind]={texture:'shoes',role:'shoes',rect:[r[0][0],r[0][1],r[1][2],r[1][3]],map:()=>{throw new Error('Footwear must use separate foot meshes');},keep:()=>true,parts};
 }return result;
}

export const isHandheld=item=>['bag','tote','fan'].includes(item.shape);
export function heldPlacement(item,side='R'){
 return {bone:'wrist'+side,target:side==='L'?[319,839]:[711,839],anchor:item.shape==='fan'?[486,768]:[486,776],scale:item.shape==='fan'?.87:1.02,side};
}

// Continue bare ankles below the body cut. Skin is sampled from skin-only
// calf pixels; it is never tinted by the shoe's material filter.
export function footSkin(side){
 const rect=side==='L'?[441,1305,472,1324]:[608,1305,637,1324],cx=(rect[0]+rect[2])/2;
 const profile=[[0,40],[.25,46],[.6,64],[.83,77],[.96,62],[1,15]];
 return {texture:'mira',rect,role:'shoes',step:1,keep:()=>true,map:(x,y)=>{
  const t=(y-rect[1])/(rect[3]-rect[1]),hi=profile.findIndex(p=>p[0]>=t),a=profile[Math.max(0,hi-1)],b=profile[Math.max(0,hi)],width=a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]||1),centre=side==='L'?458-12*t:623+20*t;
  return [centre+(x-cx)/(rect[2]-rect[0])*width,1318+144*t];
 }};
}
