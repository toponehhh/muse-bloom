// Smooth, landmark-based garment fitting. The entire garment uses one continuous
// thin-plate spline; there is no discontinuous torso/sleeve scale switch.
export function fitCage(landmarks) {
  const points=landmarks.map(([x,y,u,v])=>[x/1024,y/1024,u,v]);
  const radial=r=>r>1e-15?r*Math.log(r):0;
  const count=points.length,size=count+3;
  const matrix=Array.from({length:size},()=>Array(size+2).fill(0));
  points.forEach(([x,y,u,v],i)=>{
    points.forEach(([a,b],j)=>matrix[i][j]=radial((x-a)**2+(y-b)**2));
    matrix[i][count]=matrix[count][i]=1;
    matrix[i][count+1]=matrix[count+1][i]=x;
    matrix[i][count+2]=matrix[count+2][i]=y;
    matrix[i][size]=u;matrix[i][size+1]=v;
  });
  for(let col=0;col<size;col++) {
    let pivot=col;
    for(let r=col+1;r<size;r++)if(Math.abs(matrix[r][col])>Math.abs(matrix[pivot][col]))pivot=r;
    [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
    const divisor=matrix[col][col];if(Math.abs(divisor)<1e-12)throw new Error('Degenerate fitting cage');
    for(let k=col;k<size+2;k++)matrix[col][k]/=divisor;
    for(let r=0;r<size;r++)if(r!==col){const f=matrix[r][col];for(let k=col;k<size+2;k++)matrix[r][k]-=f*matrix[col][k];}
  }
  return (u,v)=>{
    const x=u/1024,y=v/1024,basis=[...points.map(([a,b])=>radial((x-a)**2+(y-b)**2)),1,x,y];
    return [0,1].map(axis=>basis.reduce((sum,b,i)=>sum+b*matrix[i][size+axis],0));
  };
}
const mirrored=rows=>rows.flatMap(([x,y,u,v])=>x===512?[[x,y,u,v]]:[[x,y,u,v],[1024-x,y,1024-u,v]]);

export const roseLandmarks=mirrored([
  [433,205,441,307],[512,260,512,337],
  [316,240,399,321],[256,285,352,351],[338,365,414,402],
  [249,355,342,408],[342,420,416,447],
  [248,555,336,547],[193,540,300,538],[292,570,365,558],
  [378,570,431,550],[342,670,405,623],[512,690,512,640],
  [103,861,256,729],[75,858,238,721],[130,880,275,738],
]);
export const blueLandmarks=mirrored([
  [430,191,441,307],[465,165,464,296],[512,292,512,373],
  [374,216,398,326],[343,244,350,365],
  [324,335,329,443],[398,360,398,455],
  [405,355,412,435],[427,440,430,543],
  [410,506,402,635],[512,520,512,641],
]);
export const denimLandmarks=mirrored([
  [339,681,399,612],[512,697,512,624],
  [282,830,361,727],[195,1044,300,882],[512,1095,512,909],
]);
export const trouserLandmarks=mirrored([
  [410,520,402,608],[512,532,512,620],
  [335,700,350,778],[512,700,512,775],
  [328,1050,354,1060],[488,1050,489,1060],
  [320,1400,352,1390],[494,1414,487,1400],
]);
export const fitRose=fitCage(roseLandmarks),fitBlue=fitCage(blueLandmarks);
export const fitDenim=fitCage(denimLandmarks),fitTrousers=fitCage(trouserLandmarks);
