'use strict';
globalThis.makeCover=async function(width,height){
  const canvas=document.getElementById('cover');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),landscape=width>height,portrait=height>width;
  MuseShare.glowBackground(c,width,height);
  c.fillStyle='#e0d2be88';c.strokeStyle='#f8f1e6';c.lineWidth=3;
  c.beginPath();c.roundRect(width*(landscape?.43:.04),height*(landscape?.06:.33),width*(landscape?.53:.92),height*(landscape?.88:.64),2);c.fill();c.stroke();
  const title=c.createLinearGradient(0,0,width*.5,height*.5);title.addColorStop(0,'#73434a');title.addColorStop(1,'#95636a');
  if(landscape){
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'porcelain',720,185,470,836);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'deep',1370,160,490,871);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'warm',1020,100,515,916);
    c.textAlign='left';c.fillStyle='#39322a';c.font='172px Georgia, serif';c.fillText('Muse',100,475);
    c.fillStyle=title;c.font='italic 177px Georgia, serif';c.fillText('Bloom',100,658);
  }else{
    c.textAlign='center';c.fillStyle='#39322a';c.font=(portrait?128:96)+'px Georgia, serif';c.fillText('Muse',width*.5,portrait?172:121);
    c.fillStyle=title;c.font='italic '+(portrait?140:110)+'px Georgia, serif';c.fillText('Bloom',width*.5,portrait?313:230);
    const y=portrait?447:260,h=portrait?720:515,w=h*720/1280;
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'porcelain',width*.19-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'deep',width*.81-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'warm',width*.5-w*.55,y-(portrait?68:30),w*1.1,h*1.1);
  }
  return canvas.toDataURL('image/png');
};
