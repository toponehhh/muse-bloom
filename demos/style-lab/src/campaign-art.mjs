import {fitCage} from '../../skeletal/src/fitting.mjs';
import {fitRose,fitBlue,fitLilac,fitIvory,wardrobe,inside} from './rig.mjs';
const identity=(x,y)=>[x,y];
const base=(texture,rect,map=identity,keep=()=>true,role='top')=>({texture,rect,map,keep,role});
export const templates={
  tee:base('mira',[338,325,690,584],identity,(x,y)=>inside(x,y,wardrobe.tops[0].clip)&&y<572-5*Math.min(1,Math.abs(x-515)/80)),
  cardigan:base('rose',[260,335,805,707],fitRose,(x,y)=>y<699-8*Math.min(1,Math.abs(x-532)/130)),
  polo:base('blue',[290,130,735,479],fitBlue,(x,y)=>y<472-8*Math.min(1,Math.abs(x-514)/110)),
  denim:base('mira',[335,564,690,854],identity,(x,y)=>inside(x,y,wardrobe.bottoms[0].clip),'bottom'),
  pleats:base('rose',[255,707,807,1110],fitLilac,()=>true,'bottom'),
  trousers:base('blue',[320,479,705,1420],fitIvory,()=>true,'bottom'),
  sneaker:base('mira',[390,1345,705,1482],identity,()=>true,'shoes'),
};
// Cage landmarks are measured on unchanged atlas pixels. All garments register
// to Mira's same neckline, shoulders, elbows, wrists and waist before skinning.
function top(name,r,p,long=true){
  const [cx,neckY,neckW,shoulderY,shoulderW,waistY,waistW,elbowY,elbowW,cuffY,cuffW]=p;
  const marks=[[cx-neckW/2,neckY,455,330],[cx+neckW/2,neckY,575,330],[cx,neckY+25,515,365],
    [cx-shoulderW/2,shoulderY,394,346],[cx+shoulderW/2,shoulderY,638,346],
    [cx-waistW/2,waistY,432,575],[cx+waistW/2,waistY,600,575],[cx,waistY,515,578]];
  if(long)marks.push([cx-elbowW/2,elbowY,365,574],[cx+elbowW/2,elbowY,665,574],[cx-cuffW/2,cuffY,313,758],[cx+cuffW/2,cuffY,718,758]);
  else marks.push([r[0]+15,elbowY,340,452],[r[2]-15,elbowY,690,452],[cx-shoulderW/2,elbowY+15,411,473],[cx+shoulderW/2,elbowY+15,620,473]);
  templates[name]=base('tops',r,fitCage(marks));templates[name].long=long;
}
top('sweater',[24,70,512,510],[271,85,118,125,226,439,228,327,324,485,412]);
top('blazer',[518,64,1012,506],[764,81,116,115,246,472,270,320,332,480,426]);
top('hoodie',[20,527,520,987],[269,548,120,604,242,923,232,802,340,965,414]);
top('blouse',[545,569,990,904],[768,580,157,611,251,884,209,738,0,0,0],false);
top('vest',[70,1009,478,1430],[274,1020,108,1056,221,1380,225,1168,0,0,0],false);
top('mandarin',[498,983,1020,1472],[764,998,99,1053,257,1420,266,1260,352,1448,444]);
function dress(name,r,p,hem){
  const [cx,neckY,neckW,shoulderY,shoulderW,sleeveY,sleeveW,waistY,waistW,hemY,hemW]=p;
  const marks=[[cx-neckW/2,neckY,455,330],[cx+neckW/2,neckY,575,330],[cx,neckY+30,515,377],
    [cx-shoulderW/2,shoulderY,394,346],[cx+shoulderW/2,shoulderY,638,346],
    [cx-sleeveW/2,sleeveY,340,453],[cx+sleeveW/2,sleeveY,690,453],
    [cx-waistW/2,waistY,434,575],[cx+waistW/2,waistY,597,575],[cx,waistY,515,575],
    [cx-hemW/2,hemY,hem>1350?295:340,hem],[cx+hemW/2,hemY,hem>1350?735:690,hem],[cx,hemY,515,hem+12]];
  templates[name]=base('dresses',r,fitCage(marks),()=>true,'dress');templates[name].hem=hem;
}
dress('aline',[93,19,496,460],[296,34,120,52,164,114,228,170,100,432,320],1035);
dress('satin',[548,13,940,492],[744,25,90,46,142,96,185,163,91,460,302],1210);
dress('pinafore',[105,504,481,960],[294,512,69,541,145,624,207,673,104,932,325],1015);
dress('gown',[515,503,971,997],[742,512,88,534,138,557,177,625,83,970,370],1432);
dress('hanfu',[65,1001,514,1525],[295,1010,49,1047,134,1111,190,1145,91,1490,350],1390);
dress('qipao',[635,1005,849,1518],[742,1014,48,1055,123,1101,178,1170,90,1494,105],1250);
const shoeRects={maryjane:[24,83,490,460],loafer:[530,82,1007,456],boot:[21,541,492,970],sandal:[526,580,1015,977],heel:[18,1048,491,1477],platform:[524,1046,1009,1461]};
for(const [name,r]of Object.entries(shoeRects)){const middle=(r[0]+r[2])/2,low=name==='boot'?1285:1349;templates[name]=base('shoes',r,(x,y)=>[x<middle?396+(x-r[0])/(middle-r[0])*108:588+(x-middle)/(r[2]-middle)*112,low+(y-r[1])/(r[3]-r[1])*(1475-low)],()=>true,'shoes');}
templates.shorts=base('blue',[320,479,705,815],(x,y)=>{const [a,b]=fitIvory(x,y);return[a,566+(b-566)*.79];},()=>true,'bottom');
templates.midi=base('rose',[255,707,807,1110],(x,y)=>{const [a,b]=fitLilac(x,y);return[515+(a-515)*.94,566+(b-566)*1.85];},()=>true,'bottom');
templates.mamian=base('dresses',[65,1157,514,1525],fitCage([[249,1157,434,566],[341,1157,597,566],[295,1157,515,566],[85,1463,335,1340],[495,1463,695,1340],[295,1510,515,1380]]),()=>true,'bottom');
const topKinds={tee:'tee',cardigan:'cardigan',polo:'polo',blouse:'blouse',vest:'vest',blazer:'blazer',jacket:'blazer',sweater:'sweater',hoodie:'hoodie',hanfu:'mandarin',frog:'mandarin',mandarin:'mandarin'};
const bottomKinds={jeans:'trousers',pleats:'pleats',trousers:'trousers',shorts:'shorts',midi:'midi',cargo:'trousers',flare:'trousers',mamian:'mamian'};
const dressKinds={sundress:'aline',aline:'aline',puff:'aline',gown:'gown',pinafore:'pinafore',sport:'pinafore',knit:'satin',slip:'satin',wrap:'satin',hanfu:'hanfu',qipao:'qipao'};
export function templateFor(item){
  if(item.category==='top')return topKinds[item.shape];
  if(item.category==='bottom')return item.id==='bottom_casual_01'?'denim':bottomKinds[item.shape];
  if(item.category==='dress')return dressKinds[item.shape];
  if(item.category==='shoes')return item.shape==='embroidered'?'maryjane':item.shape;
  return null;
}
export function accessoryPlacement(item,second=false){
  if(item.category==='hair')return {bone:'head',rect:['band','pearls','stars'].includes(item.shape)?[427,108,609,170]:[536,125,614,189]};
  const poses={glasses:['head',[448,206,597,252]],earrings:['head',[438,252,603,294]],clip:['head',[539,130,600,189]],pin:['head',[530,124,610,186]],necklace:['chest',[458,334,575,390]],pendant:['chest',[470,332,565,405]],scarf:['chest',[440,332,595,540]],watch:['wristR',[697,738,732,786]],fan:['wristR',[672,697,800,838]],crossbody:['chest',[394,350,763,934]]};
  const found=poses[item.shape];if(found)return{bone:found[0],rect:found[1]};
  return {bone:second?'wristL':'wristR',rect:second?[250,795,377,981]:[656,795,783,981]};
}
