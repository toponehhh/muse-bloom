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
    const gradient=c.createLinearGradient(0,0,width,height);gradient.addColorStop(0,'#e1efff');gradient.addColorStop(.48,'#eee5ff');gradient.addColorStop(1,'#f9d6e9');
    c.fillStyle=gradient;c.fillRect(0,0,width,height);
    for(const [x,y,r] of [[.1,.21,.055],[.87,.48,.037],[.84,.1,.02],[.2,.8,.025]]){
      const gx=x*width,gy=y*height,gr=r*width,pearl=c.createRadialGradient(gx-gr*.3,gy-gr*.4,0,gx,gy,gr);
      pearl.addColorStop(0,'#fff');pearl.addColorStop(.35,'#ffffffd9');pearl.addColorStop(.8,'#d3c0eb66');pearl.addColorStop(1,'#ffffffa0');
      c.fillStyle=pearl;c.beginPath();c.arc(gx,gy,gr,0,Math.PI*2);c.fill();
    }
    c.fillStyle='#ffffffdf';
    for(const [x,y,r] of [[.11,.5,.02],[.9,.73,.025],[.78,.29,.015],[.25,.12,.018]]){
      c.save();c.translate(width*x,height*y);c.beginPath();c.moveTo(0,-r*width);c.quadraticCurveTo(0,0,r*width,0);c.quadraticCurveTo(0,0,0,r*width);c.quadraticCurveTo(0,0,-r*width,0);c.quadraticCurveTo(0,0,0,-r*width);c.fill();c.restore();
    }
  }
  async function makeCard(theme, outfit, skin, result) {
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
    const c = canvas.getContext('2d');
    glowBackground(c,1080,1920);
    roundRect(c,65,225,950,1390,110,'#ffffff55');
    c.strokeStyle='#ffffffcc';c.lineWidth=3;c.beginPath();c.roundRect(65,225,950,1390,110);c.stroke();
    c.textAlign='center'; c.fillStyle='#7d5f9c'; c.font='600 27px "Segoe UI", sans-serif'; c.fillText('THE MUSE BLOOM LOOKBOOK',540,100);
    c.fillStyle='#42305d';c.font='bold 67px "Segoe UI", sans-serif'; c.fillText(theme.name,540,191,960);
    const floor=c.createRadialGradient(540,1460,0,540,1460,310);floor.addColorStop(0,'#82629944');floor.addColorStop(1,'#b19ac500');c.fillStyle=floor;c.beginPath();c.ellipse(540,1460,340,40,0,0,Math.PI*2);c.fill();
    await drawAvatar(c,outfit,skin,175,225,730,1298);
    const badge=c.createLinearGradient(760,320,950,500);badge.addColorStop(0,'#8b64ce');badge.addColorStop(1,'#c86cae');c.fillStyle=badge;c.beginPath();c.arc(855,410,92,0,Math.PI*2);c.fill();
    c.fillStyle='#fff';c.font='bold 90px "Segoe UI", sans-serif';c.fillText(result.rank,855,437);
    c.font='27px "Segoe UI", sans-serif';c.fillText(`${result.score} POINTS`,855,482);
    c.fillStyle='#795b94'; c.font='26px "Segoe UI", sans-serif'; c.fillText(theme.required.map(t=>t.toUpperCase()).join('   ·   '),540,1658,970);
    c.fillStyle='#574072';c.font='bold 94px "Segoe UI", sans-serif';c.fillText('Muse Bloom',540,1793);
    c.font='28px "Segoe UI", sans-serif';c.fillStyle='#9566a9';c.fillText('Style your glow-up.',540,1856);
    return canvas.toDataURL('image/png');
  }
  root.MuseShare = { makeCard, drawAvatar, loadImage, glowBackground };
})(globalThis);
