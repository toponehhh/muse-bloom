(function (root, factory) {
  const art = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  else root.MuseArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Procedural details used by Mira's current wardrobe.
  const ink='#796576', itemCache=new Map();
  function tint(hex, amount) {
    const value=hex.length===4?hex.slice(1).split('').map(c=>c+c).join(''):hex.slice(1);
    return '#'+[0,2,4].map(i=>Math.round(parseInt(value.slice(i,i+2),16)*(1-Math.abs(amount))+(amount>0?255:0)*Math.abs(amount)).toString(16).padStart(2,'0')).join('');
  }
  function svg(content, box = '0 0 720 1280', material='fabric') {
    let hash=2166136261;for(let n=0;n<content.length;n++)hash=Math.imul(hash^content.charCodeAt(n),16777619);
    const prefix='m'+(hash>>>0).toString(36),colors=new Map();
    const painted=content.replace(/fill="(#[0-9a-f]{3}(?:[0-9a-f]{3})?)"/gi,(match,color)=>{
      if(!colors.has(color))colors.set(color,prefix+'-'+colors.size);
      return `fill="url(#${colors.get(color)})"`;
    });
    const defs=[...colors].map(([color,id])=>material==='skin'
      ?`<radialGradient id="${id}" cx="32%" cy="27%" r="74%"><stop stop-color="${tint(color,.34)}"/><stop offset=".42" stop-color="${tint(color,.13)}"/><stop offset=".68" stop-color="${color}"/><stop offset=".9" stop-color="${tint(color,-.22)}"/><stop offset="1" stop-color="${tint(color,-.3)}"/></radialGradient>`
      :`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".08"><stop stop-color="${tint(color,-.29)}"/><stop offset=".13" stop-color="${tint(color,-.08)}"/><stop offset=".34" stop-color="${tint(color,material==='hair'?.38:.22)}"/><stop offset=".53" stop-color="${tint(color,.13)}"/><stop offset=".76" stop-color="${color}"/><stop offset=".96" stop-color="${tint(color,-.3)}"/><stop offset="1" stop-color="${tint(color,-.18)}"/></linearGradient>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.split(' ')[2]}" height="${box.split(' ')[3]}" viewBox="${box}" fill="none"><defs>${defs}</defs><g stroke="${ink}" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${painted}</g></svg>`;
  }
  const p = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
  const line = (d, opacity = .35) => `<path d="${d}" stroke="${ink}" opacity="${opacity}"/>`;
  const circle = (x, y, r, fill, attrs = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${attrs}/>`;
  const rect = (x,y,w,h,r,fill,attrs='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${attrs}/>`;
  function flower(x, y, size = 12, color = '#f3d9c0') {
    // Absolute curves keep embroidery attached when the garment is fitted.
    return [0,72,144,216,288].map(a=>{const t=a*Math.PI/180,u=t-.48,v=t+.48;return p(`M${x} ${y} Q${x+Math.cos(u)*size*1.4} ${y+Math.sin(u)*size*1.4} ${x+Math.cos(t)*size} ${y+Math.sin(t)*size} Q${x+Math.cos(v)*size*1.4} ${y+Math.sin(v)*size*1.4} ${x} ${y}Z`,color);}).join('')+circle(x,y,size*.23,'#d7ac65');
  }
  function hair(item) {
    const c=item.color,shape=item.shape;
    const bow=(x,y)=>`<g transform="translate(${x} ${y})">`+p('M0 0 Q-42 -38 -46 -9 Q-48 15 -7 9 L-23 43 L-2 29 L8 46 L14 8 Q55 15 46 -13 Q40 -40 0 0Z',c)+circle(0,3,8,c)+'</g>';
    if(shape==='bow')return bow(428,180);
    if(shape==='ribbon')return bow(285,188)+bow(435,188);
    if(shape==='flower')return flower(430,183,25,c)+flower(409,166,15,c)+flower(448,203,13,c);
    if(shape==='clips')return rect(410,188,49,12,6,c,'transform="rotate(32 410 188)"')+rect(405,207,44,10,5,c,'transform="rotate(32 405 207)"');
    if(shape==='stars')return [0,1,2].map(i=>`<g transform="translate(${419+i*13} ${164+i*23}) scale(${1-i*.16})">`+p('M0 -17 L5 -5 L18 -4 L8 5 L11 18 L0 11 L-11 18 L-8 5 L-18 -4 L-5 -5Z',c)+'</g>').join('');
    const band=p('M264 216 Q270 115 359 109 Q447 111 457 216','none',`stroke="${c}" stroke-width="${shape==='pearls'?5:13}"`);
    return band+(shape==='pearls'?Array.from({length:13},(_,i)=>{const t=Math.PI+i*Math.PI/12;return circle(360+95*Math.cos(t),216+103*Math.sin(t),5.5,c);}).join(''):line('M269 216 Q278 122 359 116 Q441 120 450 216',.2));
  }
  function accessory(item) {
    const c=item.color,s=item.shape;
    if(s==='necklace'||s==='pendant') return p('M323 348 Q361 413 397 348','none',`stroke="${c}" stroke-width="6"`)+(s==='pendant'?p('M360 389 Q337 401 350 418 Q361 428 373 415 Q383 399 360 389Z',c):[[-25,371],[-16,384],[0,391],[16,384],[25,371]].map(([x,y])=>circle(360+x,y,5,c)).join(''));
    if(s==='glasses') return `<ellipse cx="325" cy="240" rx="26" ry="21" stroke="${c}" stroke-width="5"/><ellipse cx="396" cy="240" rx="26" ry="21" stroke="${c}" stroke-width="5"/>`+p('M351 238 Q361 230 370 238 M299 236 L281 230 M422 236 L438 230','none',`stroke="${c}" stroke-width="5"`);
    if(s==='earrings') return `<ellipse cx="284" cy="275" rx="11" ry="20" stroke="${c}" stroke-width="5"/><ellipse cx="438" cy="275" rx="11" ry="20" stroke="${c}" stroke-width="5"/>`;
    if(s==='clip') return flower(409,163,25,c)+circle(409,163,5,'#d9bd85');
    if(s==='pin') return p('M389 138 L457 187','none',`stroke="${c}" stroke-width="5"`)+flower(445,160,17,'#edc7b7')+p('M450 175 L453 222','none',`stroke="${c}"`)+circle(453,224,6,'#9cbaa0');
    if(s==='scarf') return p('M315 341 Q359 369 406 341 L417 374 L381 397 L410 530 L366 551 L355 397 Q326 390 302 371Z',c)+line('M381 407 L392 513 M371 541 L377 556 M382 536 L389 552 M393 532 L402 546');
    if(s==='watch') return rect(465,711,28,20,3,c)+circle(478,721,13,'#e8dfc7')+line('M478 713 L478 721 L484 726',.8);
    if(s==='fan') return p('M486 716 L486 795','none','data-part="handle" stroke="#b79564" stroke-width="9"')+`<ellipse cx="486" cy="660" rx="58" ry="67" fill="${c}"/>`+flower(476,649,21,'#d7a9a5')+line('M482 677 Q489 661 503 639');
    const tote=s==='tote',cross=s==='crossbody';
    if(cross) return p('M299 368 L441 670','none',`data-part="shoulder-strap" stroke="${c}" stroke-width="12"`)+p('M402 661 Q445 649 484 663 L488 739 Q443 759 401 739Z',c)+p('M403 663 Q444 710 484 664','none')+rect(436,692,15,12,3,'#d8b879');
    // One shared grip at (486, 776); the bag hangs below it and the fingers
    // are composited over the handle. A second handheld uses the other hand.
    return p('M451 834 L455 806 Q461 776 486 776 Q513 776 522 806 L526 834','none',`data-part="handle" stroke="${c}" stroke-width="8"`)+
      p(tote?'M438 825 L537 825 L545 947 Q492 964 435 947Z':'M440 826 Q486 811 534 826 L539 911 Q489 931 439 911Z',c)+
      (tote?line('M449 840 L447 935 M526 840 L533 936'):p('M441 827 Q488 880 534 827','none')+rect(481,857,17,14,3,'#d8b879'))+
      (item.chinese?flower(488,898,13,'#e9cead'):tote?flower(488,892,17,'#e2ceb0'):'');
  }
  function itemSvg(item) {
    const render = {hair, accessory}[item.category];
    if (!render) throw new Error('Detail art only supports hair and accessories');
    const key = JSON.stringify(item);
    if (itemCache.has(key)) return itemCache.get(key);
    let drawing = render(item);
    if(item.category==='hair')drawing='<defs><filter id="hair-contact" x="-.15" y="-.1" width="1.3" height="1.2"><feDropShadow dx="2" dy="4" stdDeviation="2.8" flood-color="#492936" flood-opacity=".24"/></filter></defs><g filter="url(#hair-contact)">'+drawing+'</g>';
    const source = svg(drawing, undefined, item.category === 'hair' ? 'hair' : 'fabric');
    itemCache.set(key, source);
    return source;
  }
  return {itemSvg};
});
