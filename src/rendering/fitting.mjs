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
