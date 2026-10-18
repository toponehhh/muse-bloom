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
  async function makeCard(theme, outfit, skin, result) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext('2d');
    c.fillStyle='#fff6ed'; c.fillRect(0,0,1080,1920);
    c.fillStyle='#ded1b4';
    for(let x=36;x<1080;x+=36) for(let y=36;y<1920;y+=36) { c.beginPath();c.arc(x,y,1.4,0,Math.PI*2);c.fill(); }
    roundRect(c,65,225,950,1390,450,'#e7e8d7');
    c.textAlign='center'; c.fillStyle='#393c34'; c.font='30px "Segoe UI", sans-serif'; c.fillText('THE MUSE BLOOM LOOKBOOK',540,100);
    c.font='italic 72px Georgia, serif'; c.fillText(theme.name,540,191,960);
    await drawAvatar(c,outfit,skin,175,225,730,1298);
    c.fillStyle='#c77c6e'; c.beginPath();c.arc(855,410,92,0,Math.PI*2);c.fill();
    c.fillStyle='#fff8ee';c.font='bold 90px Georgia, serif';c.fillText(result.rank,855,440);
    c.font='27px "Segoe UI", sans-serif';c.fillText(`${result.score} POINTS`,855,482);
    c.fillStyle='#4d574b'; c.font='26px "Segoe UI", sans-serif'; c.fillText(theme.required.map(t=>t.toUpperCase()).join('   ·   '),540,1658,970);
    c.font='bold 94px Georgia, serif';c.fillText('Muse Bloom',540,1793);
    c.font='28px "Segoe UI", sans-serif';c.fillStyle='#7a7b6e';c.fillText('A little style. A lot of you.',540,1856);
    return canvas.toDataURL('image/png');
  }
  root.MuseShare = { makeCard, drawAvatar, loadImage };
})(globalThis);
