(function (root) {
  'use strict';
  const A = root.MuseArt, G = root.MuseGame, D = root.MuseData;
  function loadImage(svg) { return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('The look could not be rendered. Please try again.')); image.src = A.uri(svg); }); }
  async function drawAvatar(ctx, outfit, characterId, x, y, width, height) {
    const character = D.characters.find(s => s.id === characterId) || D.characters[0];
    const image = await loadImage(A.avatarSvg(character,G.equippedItems(outfit)));
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
    gradient.addColorStop(0,'#fbf5ef');gradient.addColorStop(.5,'#f5e4e9');gradient.addColorStop(1,'#f6eee4');
    c.fillStyle=gradient;c.fillRect(0,0,width,height);
    const light=c.createLinearGradient(0,0,width,0);
    light.addColorStop(0,'#ffffff00');light.addColorStop(.42,'#cebdff16');light.addColorStop(.7,'#ffffff00');
    c.fillStyle=light;c.fillRect(0,0,width,height);
  }
  async function makeCard(theme, outfit, character, result) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext('2d');
    glowBackground(c,1080,1920);
    roundRect(c,58,243,964,1339,42,'#decbd0');
    c.save();c.beginPath();c.roundRect(65,250,950,1325,36);c.clip();await drawRoom(c,65,250,950,1325);c.restore();
    c.textAlign='center';c.fillStyle='#76506a';c.font='600 24px "Segoe UI", sans-serif';c.fillText('YOUR MUSE BLOOM MOMENT',540,95);
    c.fillStyle='#a13b65';c.font='bold 60px "Trebuchet MS", sans-serif';c.fillText(theme.name,540,192,950);
    const floor=c.createRadialGradient(540,1492,0,540,1492,290);floor.addColorStop(0,'#79604230');floor.addColorStop(1,'#79604200');c.fillStyle=floor;c.beginPath();c.ellipse(540,1492,330,33,0,0,Math.PI*2);c.fill();
    await drawAvatar(c,outfit,character,175,240,730,1298);
    roundRect(c,853,290,115,140,25,'#fffaf7ed');
    c.textAlign='right';c.fillStyle='#a13b65';c.font='bold 64px "Trebuchet MS", sans-serif';c.fillText(result.rank,944,365);
    c.font='22px "Segoe UI", sans-serif';c.fillText(`${result.score} / 94`,944,408);
    c.textAlign='left';c.font='500 20px "Segoe UI", sans-serif';c.fillText('LOOK '+String(theme.index).padStart(2,'0'),118,1520);
    c.textAlign='center';c.fillStyle='#76506a';c.font='23px "Segoe UI", sans-serif';c.fillText((root.MuseEdit.brief(theme.index)?.kicker || theme.required.map(t=>t.toUpperCase()).join('   /   ')),540,1640,950);
    c.strokeStyle='#544249';c.lineWidth=1;c.beginPath();c.moveTo(300,1690);c.lineTo(780,1690);c.stroke();
    c.fillStyle='#a13b65';c.font='bold 88px "Trebuchet MS", sans-serif';c.fillText('Muse Bloom',540,1810);
    c.font='27px "Segoe UI", sans-serif';c.fillStyle='#76506a';c.fillText('Every look. Entirely you.',540,1860);
    return canvas.toDataURL('image/png');
  }
  root.MuseShare = { makeCard, drawAvatar, drawRoom, loadImage, glowBackground };
})(globalThis);
