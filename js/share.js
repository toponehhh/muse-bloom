(function (root) {
  'use strict';
  const A = root.MuseArt, G = root.MuseGame, D = root.MuseData;
  function loadImage(svg) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The look could not be rendered. Please try again.')); image.src = A.uri(svg); }); }
  async function drawAvatar(ctx, outfit, skinId, x, y, width, height) {
    const skin = D.skins.find(s => s.id === skinId) || D.skins[1];
    const image = await loadImage(A.avatarSvg(skin,G.equippedItems(outfit)));
    ctx.drawImage(image, x, y, width, height);
  }
  function roundRect(ctx, x, y, w, h, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fill(); }
  async function drawRoom(c,x,y,w,h) {
    const room=new Image();room.src=root.MuseAssets['assets/scenes/bedroom.webp'];await room.decode();
    const scale=Math.max(w/room.width,h/room.height),sw=w/scale,sh=h/scale;
    c.drawImage(room,(room.width-sw)/2,(room.height-sh)/2,sw,sh,x,y,w,h);
    c.fillStyle='#fff5fa35';c.fillRect(x,y,w,h);
  }
  function glowBackground(c,width,height) {
    const gradient=c.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,'#101224');gradient.addColorStop(.5,'#282038');gradient.addColorStop(1,'#111528');
    c.fillStyle=gradient;c.fillRect(0,0,width,height);
    const light=c.createLinearGradient(0,0,width,0);
    light.addColorStop(0,'#ffffff00');light.addColorStop(.42,'#cebdff16');light.addColorStop(.7,'#ffffff00');
    c.fillStyle=light;c.fillRect(0,0,width,height);
  }
  async function makeCard(theme, outfit, skin, result) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext('2d');
    glowBackground(c,1080,1920);
    roundRect(c,58,243,964,1339,42,'#51405d');
    c.save();c.beginPath();c.roundRect(65,250,950,1325,36);c.clip();await drawRoom(c,65,250,950,1325);c.restore();
    c.textAlign='center';c.fillStyle='#cebdff';c.font='600 24px "Segoe UI", sans-serif';c.fillText('YOUR MUSE BLOOM MOMENT',540,95);
    c.fillStyle='#ffafd3';c.font='bold 60px "Trebuchet MS", sans-serif';c.fillText(theme.name,540,192,950);
    const floor=c.createRadialGradient(540,1492,0,540,1492,290);floor.addColorStop(0,'#79604230');floor.addColorStop(1,'#79604200');c.fillStyle=floor;c.beginPath();c.ellipse(540,1492,330,33,0,0,Math.PI*2);c.fill();
    await drawAvatar(c,outfit,skin,175,240,730,1298);
    roundRect(c,853,290,115,140,25,'#101224e6');
    c.textAlign='right';c.fillStyle='#ffafd3';c.font='bold 64px "Trebuchet MS", sans-serif';c.fillText(result.rank,944,365);
    c.font='22px "Segoe UI", sans-serif';c.fillText(`${result.score} / 94`,944,408);
    c.textAlign='left';c.font='500 20px "Segoe UI", sans-serif';c.fillText('LOOK '+String(theme.index).padStart(2,'0'),118,1520);
    c.textAlign='center';c.fillStyle='#cebdff';c.font='23px "Segoe UI", sans-serif';c.fillText(theme.required.map(t=>t.toUpperCase()).join('   /   '),540,1640,950);
    c.strokeStyle='#544249';c.lineWidth=1;c.beginPath();c.moveTo(300,1690);c.lineTo(780,1690);c.stroke();
    c.fillStyle='#ffafd3';c.font='bold 88px "Trebuchet MS", sans-serif';c.fillText('Muse Bloom',540,1810);
    c.font='27px "Segoe UI", sans-serif';c.fillStyle='#cebdff';c.fillText('Every look. Entirely you.',540,1860);
    return canvas.toDataURL('image/png');
  }
  root.MuseShare = { makeCard, drawAvatar, drawRoom, loadImage, glowBackground };
})(globalThis);
