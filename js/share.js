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
  function glowBackground(c,width,height) {
    const gradient=c.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,'#faf7f1');gradient.addColorStop(1,'#e8dfd1');
    c.fillStyle=gradient;c.fillRect(0,0,width,height);
    const light=c.createLinearGradient(0,0,width,0);
    light.addColorStop(0,'#ffffff00');light.addColorStop(.42,'#ffffff70');light.addColorStop(.7,'#ffffff00');
    c.fillStyle=light;c.fillRect(0,0,width,height);
  }
  async function makeCard(theme, outfit, skin, result) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext('2d');
    glowBackground(c,1080,1920);
    const paper=c.createLinearGradient(65,250,1015,1560);paper.addColorStop(0,'#e4dacb');paper.addColorStop(1,'#cbb79d');
    roundRect(c,65,250,950,1325,2,paper);
    c.strokeStyle='#f9f2e8';c.lineWidth=2;c.strokeRect(87,272,906,1281);
    c.textAlign='center';c.fillStyle='#9b8367';c.font='500 24px "Segoe UI", sans-serif';c.fillText('MUSE BLOOM / THE PERSONAL ARCHIVE',540,95);
    c.fillStyle='#66503b';c.font='64px Georgia, serif';c.fillText(theme.name,540,192,950);
    const floor=c.createRadialGradient(540,1492,0,540,1492,290);floor.addColorStop(0,'#79604230');floor.addColorStop(1,'#79604200');c.fillStyle=floor;c.beginPath();c.ellipse(540,1492,330,33,0,0,Math.PI*2);c.fill();
    await drawAvatar(c,outfit,skin,175,240,730,1298);
    c.textAlign='right';c.fillStyle='#7c5a37';c.font='64px Georgia, serif';c.fillText(result.rank,944,365);
    c.font='22px "Segoe UI", sans-serif';c.fillText(`${result.score} / 94`,944,408);
    c.textAlign='left';c.font='500 20px "Segoe UI", sans-serif';c.fillText('LOOK '+String(theme.index).padStart(2,'0'),118,1520);
    c.textAlign='center';c.fillStyle='#a08768';c.font='23px "Segoe UI", sans-serif';c.fillText(theme.required.map(t=>t.toUpperCase()).join('   /   '),540,1640,950);
    c.strokeStyle='#cbb99f';c.lineWidth=1;c.beginPath();c.moveTo(300,1690);c.lineTo(780,1690);c.stroke();
    c.fillStyle='#41372e';c.font='91px Georgia, serif';c.fillText('Muse Bloom',540,1810);
    c.font='italic 27px Georgia, serif';c.fillStyle='#99636a';c.fillText('Every look. Entirely you.',540,1860);
    return canvas.toDataURL('image/png');
  }
  root.MuseShare = { makeCard, drawAvatar, loadImage, glowBackground };
})(globalThis);
