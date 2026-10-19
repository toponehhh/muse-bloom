'use strict';
globalThis.makeCover=async function(width,height){
  const canvas=document.getElementById('cover');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d'),landscape=width>height,portrait=height>width;
  MuseShare.glowBackground(c,width,height);
  c.save();c.beginPath();c.roundRect(width*(landscape?.43:.04),height*(landscape?.06:.33),width*(landscape?.53:.92),height*(landscape?.88:.64),38);c.clip();
  await MuseShare.drawRoom(c,width*(landscape?.43:.04),height*(landscape?.06:.33),width*(landscape?.53:.92),height*(landscape?.88:.64));c.restore();
  c.strokeStyle='#cebdff';c.lineWidth=6;c.stroke();
  const title=c.createLinearGradient(0,0,width*.5,height*.5);title.addColorStop(0,'#ed6cad');title.addColorStop(1,'#f6e05e');
  if(landscape){
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'mika',720,185,470,836);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'zoe',1370,160,490,871);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'bella',1020,100,515,916);
    c.textAlign='left';c.fillStyle='#ffd8e7';c.font='bold 172px "Trebuchet MS", sans-serif';c.fillText('Muse',100,475);
    c.fillStyle=title;c.font='bold 177px "Trebuchet MS", sans-serif';c.fillText('Bloom',100,658);
  }else{
    c.textAlign='center';c.fillStyle='#ffd8e7';c.font='bold '+(portrait?128:96)+'px "Trebuchet MS", sans-serif';c.fillText('Muse',width*.5,portrait?172:121);
    c.fillStyle=title;c.font='bold '+(portrait?140:110)+'px "Trebuchet MS", sans-serif';c.fillText('Bloom',width*.5,portrait?313:230);
    const y=portrait?447:260,h=portrait?720:515,w=h*720/1280;
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(1),'mika',width*.19-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(2),'zoe',width*.81-w*.5,y,w,h);
    await MuseShare.drawAvatar(c,MuseUI.demoOutfit(0),'bella',width*.5-w*.55,y-(portrait?68:30),w*1.1,h*1.1);
  }
  return canvas.toDataURL('image/png');
};
