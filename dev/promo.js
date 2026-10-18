'use strict';
globalThis.makeCover=async function(width,height){
  const canvas=document.getElementById('cover');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),landscape=width>height,portrait=height>width;
  c.fillStyle='#fff3e8';c.fillRect(0,0,width,height);
  c.fillStyle='#e2e5d0';c.beginPath();c.ellipse(width*(landscape?.73:.5),height*.69,width*(landscape?.39:.65),height*.65,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#faf7e8';c.lineWidth=3;c.beginPath();c.ellipse(width*(landscape?.73:.5),height*.69,width*(landscape?.37:.61),height*.62,0,0,Math.PI*2);c.stroke();
  c.fillStyle='#edd1c1';c.beginPath();c.ellipse(width*.05,height*.95,width*.25,height*.3,-.4,0,Math.PI*2);c.fill();
  const flowers=[[.09,.15,.032],[.91,.15,.027],[.88,.89,.025],[.18,.79,.021]];
  for(const [x,y,size] of flowers){c.save();c.translate(x*width,y*height);c.fillStyle='#cfa57a';for(let i=0;i<6;i++){c.rotate(Math.PI/3);c.beginPath();c.ellipse(0,-size*width*.63,size*width*.25,size*width*.65,0,0,Math.PI*2);c.fill();}c.fillStyle='#f9edcf';c.beginPath();c.arc(0,0,size*width*.2,0,Math.PI*2);c.fill();c.restore();}
  if(landscape){
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'porcelain',700,185,470,836);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'deep',1370,160,490,871);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'warm',1020,100,515,916);
    c.textAlign='left';c.fillStyle='#3b4435';c.font='bold 185px Georgia, serif';c.fillText('Muse',112,475);
    c.fillStyle='#bd786a';c.font='italic bold 195px Georgia, serif';c.fillText('Bloom',112,664);
    c.strokeStyle='#c7a17c';c.lineWidth=3;c.beginPath();c.moveTo(128,718);c.bezierCurveTo(300,674,520,691,626,709);c.stroke();
  }else{
    const scale=width/800;
    c.textAlign='center';c.fillStyle='#3b4435';c.font=`bold ${portrait?130:99}px Georgia, serif`;c.fillText('Muse',width*.5,portrait?172:121);
    c.fillStyle='#bd786a';c.font=`italic bold ${portrait?146:115}px Georgia, serif`;c.fillText('Bloom',width*.5,portrait?313:230);
    const y=portrait?447:260,h=portrait?720:515,w=h*720/1280;
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'porcelain',width*.19-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'deep',width*.81-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'warm',width*.5-w*.55,y-(portrait?68:30),w*1.1,h*1.1);
  }
  return canvas.toDataURL('image/png');
};
