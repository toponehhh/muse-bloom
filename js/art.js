(function (root, factory) {
  const art = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  else root.MuseArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Shared rig, original vector materials, and deterministic exportable lighting.
  const ink = '#796576';
  // Canonical artwork keeps its editable 720 × 1280 rig. Presentation uses
  // separate head/body proportions; every attached item follows the same rig.
  const headAngle=3*Math.PI/180,headScale=1.23;
  const a=headScale*Math.cos(headAngle),b=headScale*Math.sin(headAngle);
  // A gentle body lean with a small counter-tilt of the head, joined at the neck.
  const rig=Object.freeze({body:[1.12,0,.028,.88,-76.52,145],head:[a,b,-b,a,335.92-360*a+330*b,435.4-360*b-330*a]});
  const rigTransform=part=>`matrix(${rig[part].join(' ')})`;
  // One continuous fitting map for the body, every garment and accessory.
  // Elbows bend outwards while wrists stay fixed, so both grips still align.
  const profile=(y,knots)=>{
    if(y<=knots[0][0])return knots[0][1];
    for(let i=1;i<knots.length;i++)if(y<=knots[i][0]){
      const [lo,v]=knots[i-1],[hi,w]=knots[i],t=(y-lo)/(hi-lo),s=t*t*(3-2*t);
      return v+(w-v)*s;
    }
    return knots[knots.length-1][1];
  };
  function contourPoint(x,y) {
    const distance=Math.abs(x-360);
    const waist=profile(y,[[330,1],[440,1.04],[540,.88],[592,.84],[645,1],[710,1.12],[805,1],[1280,1]]);
    const bend=profile(y,[[330,0],[430,4],[555,27],[620,17],[700,2],[728,0],[1280,0]]);
    const divide=profile(y,[[330,96],[440,55],[550,65],[620,75],[710,86],[800,120],[1280,120]]);
    const blend=Math.max(0,Math.min(1,(distance-divide)/18)),arm=blend*blend*(3-2*blend);
    return [360+(x-360)*(1+(waist-1)*(1-arm))+Math.sign(x-360)*bend*arm,y];
  }
  const rigPoint=(x,y,part='body')=>{if(part==='body')[x,y]=contourPoint(x,y);const [a,b,c,d,e,f]=rig[part];return [a*x+c*y+e,b*x+d*y+f];};
  const rigPart=item=>item.category==='hair'||item.category==='accessory'&&['glasses','earrings','clip','pin'].includes(item.shape)?'head':'body';
  const baseCache=new Map(),itemCache=new Map();
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
  const number=n=>+n.toFixed(3);
  function contourPath(d) {
    // Paths in our editable art use absolute M/L/Q/C/Z commands. Subdivision
    // fits the entire curve, not just its control points, to the shared body.
    const tokens=d.match(/[MLQCZ]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)||[];
    let at=0,command,x=0,y=0,start=[0,0],result='';
    const emit=(letter,px,py)=>{const point=contourPoint(px,py);result+=letter+point.map(number).join(' ');};
    while(at<tokens.length){
      if(/^[MLQCZ]$/i.test(tokens[at]))command=tokens[at++].toUpperCase();
      if(command==='Z'){result+='Z';[x,y]=start;continue;}
      const count={M:2,L:2,Q:4,C:6}[command];
      if(!count||at+count>tokens.length)throw Error('Unsupported artwork path: '+d);
      const values=tokens.slice(at,at+count).map(Number);at+=count;
      const [endX,endY]=values.slice(-2),oldX=x,oldY=y;
      if(command==='M'){emit('M',endX,endY);start=[endX,endY];command='L';}
      else {
        const steps=Math.max(2,Math.ceil(Math.hypot(endX-x,endY-y)/9));
        for(let step=1;step<=steps;step++){
          const t=step/steps,u=1-t;
          const px=command==='Q'?u*u*oldX+2*u*t*values[0]+t*t*endX:command==='C'?u*u*u*oldX+3*u*u*t*values[0]+3*u*t*t*values[2]+t*t*t*endX:oldX+(endX-oldX)*t;
          const py=command==='Q'?u*u*oldY+2*u*t*values[1]+t*t*endY:command==='C'?u*u*u*oldY+3*u*u*t*values[1]+3*u*t*t*values[3]+t*t*t*endY:oldY+(endY-oldY)*t;
          emit('L',px,py);
        }
      }
      x=endX;y=endY;
    }
    return result;
  }
  function contourMarkup(markup) {
    return markup.replace(/<path\b[^>]*\bd="([^"]+)"[^>]*>/g,(tag,d)=>tag.replace(`d="${d}"`,`d="${contourPath(d)}"`))
      .replace(/<(circle|ellipse|rect)\b[^>]*\/>/g,(tag,type)=>{
        const value=name=>+(tag.match(new RegExp('\\b'+name+'="([^"]+)"'))?.[1]||0);
        const x=value(type==='rect'?'x':'cx'),y=value(type==='rect'?'y':'cy');
        let d;
        if(type==='rect'){
          const w=value('width'),h=value('height'),r=Math.min(value('rx'),w/2,h/2);
          d=`M${x+r} ${y} L${x+w-r} ${y} Q${x+w} ${y} ${x+w} ${y+r} L${x+w} ${y+h-r} Q${x+w} ${y+h} ${x+w-r} ${y+h} L${x+r} ${y+h} Q${x} ${y+h} ${x} ${y+h-r} L${x} ${y+r} Q${x} ${y} ${x+r} ${y}Z`;
        }else{
          const rx=type==='circle'?value('r'):value('rx'),ry=type==='circle'?rx:value('ry');
          d=Array.from({length:49},(_,i)=>`${i?'L':'M'}${x+rx*Math.cos(i*Math.PI/24)} ${y+ry*Math.sin(i*Math.PI/24)}`).join('')+'Z';
        }
        return '<path d="'+contourPath(d)+'"'+tag.replace(/^<(?:circle|ellipse|rect)/,'').replace(/\s(?:cx|cy|r|rx|ry|x|y|width|height)="[^"]*"/g,'');
      });
  }
  function flower(x, y, size = 12, color = '#f3d9c0') {
    return `<g transform="translate(${x} ${y})" stroke-width="1.6">${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-${size*.58}" rx="${size*.38}" ry="${size*.62}" fill="${color}" transform="rotate(${a})"/>`).join('')}${circle(0,0,size*.23,'#d7ac65')}</g>`;
  }
  function embroidery(points, color = '#f0d7b1') { return points.map(([x,y]) => flower(x,y,10,color)).join(''); }
  const hairCap = color => p('M278 231 Q254 168 286 129 Q312 92 369 103 Q429 99 448 148 Q466 183 439 232 L423 192 Q385 199 356 164 Q333 204 294 207 L286 235Z',color)+
    Array.from({length:11},(_,i)=>p(`M${281+i*5.5} ${199-i*3} Q${274+i*6} ${143-i*2} ${342+i*1.2} ${112+i*2}`,'none',`stroke="${tint(color,i%3===0?.46:-.24)}" stroke-width="${i%3===0?1.5:.9}" opacity=".44"`)).join('')+
    Array.from({length:8},(_,i)=>p(`M${367+i*3} ${113+i*3} Q${433+i*.5} ${111+i*8} ${442-i*2.2} ${193-i*2}`,'none',`stroke="${tint(color,i%3===0?.45:-.23)}" stroke-width="1.1" opacity=".46"`)).join('');
  const basic = (slot, content) => `<g data-basic="${slot}">${content}</g>`;
  function hideBasics(source, covered, heldHands = []) {
    // Custom base SVGs keep these groups so fitted clothes can replace basics.
    return source.replace(/data-basic="(hair|top|bottom)"/g,(attribute,slot)=>attribute+(covered.includes(slot)?' display="none"':''))
      .replace(/data-hand="(left|right)"/g,(attribute,side)=>attribute+(heldHands.includes(side)?' display="none"':''));
  }
  function hand(skin, left = false, pose = 'relaxed') {
    const tone='hand-tone-'+(left?'left':'right'),c=`url(#${tone})`,sh=skin.shade;
    // Fixed world-space lighting joins the shaded forearm without a glove seam.
    const material=`<defs><linearGradient id="${tone}" x1="${left?1:0}" x2="${left?0:1}"><stop stop-color="${tint(skin.color,-.2)}"/><stop offset=".32" stop-color="${tint(skin.color,.24)}"/><stop offset=".63" stop-color="${skin.color}"/><stop offset="1" stop-color="${tint(skin.color,-.29)}"/></linearGradient></defs>`;
    const relaxed='M466 728 Q465 740 461 750 L456 762 Q454 767 458 769 Q462 770 465 763 L469 756 L470 775 L472 790 Q473 795 476 794 Q479 793 478 788 L478 774 L480 797 Q481 801 484 799 Q486 798 485 793 L485 775 L487 793 Q488 797 491 795 Q493 794 492 789 L492 772 L494 782 Q495 786 498 784 Q500 783 499 777 L500 760 Q500 747 497 738 L496 728';
    const carrying='M466 728 Q463 742 464 753 Q465 763 473 770 L476 781 Q479 787 485 787 Q494 788 499 781 Q502 775 499 766 L497 754 Q500 742 496 728';
    const outline=p(pose==='grip'?carrying:relaxed,c,'data-part="hand-outline" stroke-width="1.5"');
    const details=pose==='grip'
      ?p('M477 770 Q487 767 497 771 L499 777 Q499 783 493 784 L481 783 Q476 781 477 770Z',c,'data-part="fingers" stroke-width="1.4"')+
       p('M483 773 L483 781 M489 772 L489 783 M495 774 L495 780','none','stroke-width="1.1" opacity=".48"')+
       p('M465 749 Q468 743 473 750 L483 762 Q486 766 482 769 Q479 771 476 766 L471 760',c,'data-part="thumb" stroke-width="1.5"')+
       p('M468 735 Q467 743 469 748','none','stroke="#fff4e7" stroke-width="3" opacity=".25"')
      :p('M469 756 Q472 750 472 744 M472 762 Q479 758 489 761 M477 770 L478 775 M484 769 L485 776 M491 766 L492 773','none','stroke-width="1.1" opacity=".32"')+
       p('M468 737 Q469 746 466 752 M476 751 Q483 749 491 752','none','stroke="#fff4e7" stroke-width="2.5" opacity=".3"')+
       p('M496 747 L497 763 L495 775','none',`stroke="${sh}" stroke-width="2.3" opacity=".25"`);
    return `<g data-pose="${pose}"${left?' transform="translate(720 0) scale(-1 1)"':''}>${material+outline+details}</g>`;
  }
  function face(skin) {
    const c=skin.color,sh=skin.shade;
    // Original cartoon portrait. Hair, glasses and neckline keep their shared rig.
    const eye=(side,cx)=>{
      const left=side==='left',d=left
        ?'M300 234 Q307 213 326 214 Q345 213 352 233 Q342 254 322 253 Q307 251 300 234Z'
        :'M370 233 Q377 213 396 214 Q415 213 422 234 Q415 251 400 253 Q380 254 370 233Z';
      return `<g data-feature="eye-${side}" class="toon-eye"><defs><clipPath id="eye-${side}"><path d="${d}" fill="white"/></clipPath></defs>`+
        p(d,'#fffdf9','stroke="none"')+`<g clip-path="url(#eye-${side})">`+
        circle(cx,236,15,'#a66b46','data-part="iris" stroke="#674638" stroke-width="1.2"')+
        p(`M${cx-8} 242 Q${cx} 252 ${cx+8} 242`,'none','stroke="#e5b877" stroke-width="3" opacity=".9"')+
        circle(cx,234.5,7.7,'#342733','stroke="none"')+
        circle(cx-3.3,231,4.2,'#fff','stroke="none"')+circle(cx+5.2,242.3,2,'#fff','stroke="none"')+'</g>'+
        p(left?'M300 234 Q307 212 326 213 Q345 212 352 233':'M370 233 Q377 212 396 213 Q415 212 422 234','none','stroke="#654451" stroke-width="2.8"')+
        p(left?'M301 233 Q296 231 294 226 M306 226 L302 220 M313 222 L311 216':'M421 233 Q426 231 428 226 M416 226 L420 220 M409 222 L411 216','none','stroke="#49354f" stroke-width="2.4"')+
        p(left?'M309 247 Q329 258 347 242':'M375 242 Q393 258 413 247','none','stroke="#956875" stroke-width="1.2" opacity=".65"')+'</g>';
    };
    return `<g data-feature="face">`+
      `<ellipse cx="283" cy="244" rx="11" ry="18" fill="${c}"/><ellipse cx="437" cy="244" rx="11" ry="18" fill="${c}"/>`+
      p('M284 201 Q285 129 360 130 Q435 129 437 201 L432 250 Q427 278 401 296 Q379 312 360 314 Q341 312 319 296 Q293 278 288 250Z',c,'stroke-width="1.6"')+
      p('M289 200 Q353 177 433 205 L431 215 Q355 195 290 217Z',sh,'stroke="none" opacity=".13" filter="url(#face-soft)"')+
      p('M404 279 Q416 270 426 257 Q419 284 398 300 Q379 313 360 314 Q388 301 404 279Z',sh,'stroke="none" opacity=".2" filter="url(#face-soft)"')+
      '<ellipse cx="314" cy="260" rx="16" ry="13" fill="url(#skin-bounce)" stroke="none"/><ellipse cx="400" cy="260" rx="15" ry="13" fill="url(#skin-bounce)" stroke="none"/>'+
      `<ellipse cx="311" cy="267" rx="17" ry="8" fill="#ed93a5" opacity=".24" stroke="none" filter="url(#face-soft)"/><ellipse cx="409" cy="267" rx="17" ry="8" fill="#ed93a5" opacity=".24" stroke="none" filter="url(#face-soft)"/>`+
      p('M303 205 Q323 199 343 205 M379 205 Q399 199 419 205','none','data-feature="brows" stroke="#87604d" stroke-width="2.3"')+
      eye('left',328)+eye('right',394)+
      `<g data-feature="nose">`+p('M358 242 Q370 252 368 262 Q360 270 351 262 Q359 259 358 242Z',sh,'stroke="none" opacity=".3" filter="url(#face-soft)"')+p('M359 252 Q354 260 362 261','none',`stroke="${sh}" stroke-width="1.3" opacity=".65"`)+
      p('M358 255 L361 254','none','stroke="#fff4e6" stroke-width="2.2" opacity=".55"')+'</g>'+
      `<g data-feature="lips">`+p('M349 282 Q361 292 374 280','none','stroke="#ac6576" stroke-width="1.8"')+
      p('M356 290 Q362 292 367 289','none','stroke="#e8a2ad" stroke-width="2.3" opacity=".65"')+'</g>'+'</g>';
  }
  function body(skin, covered = [], heldHands = []) {
    const embedded = globalThis.MuseAssets?.[`assets/base/${skin.id}.svg`];
    if (embedded) return hideBasics(embedded,covered,heldHands);
    const key=skin.id+skin.color+skin.shade;
    if(baseCache.has(key))return hideBasics(baseCache.get(key),covered,heldHands);
    const c = skin.color, sh = skin.shade;
    const edge=tint(c,-.35),cylinder='url(#skin-cylinder)';
    const volumes=`<defs><linearGradient id="skin-cylinder"><stop stop-color="${tint(c,-.28)}"/><stop offset=".12" stop-color="${tint(c,-.05)}"/><stop offset=".35" stop-color="${tint(c,.3)}"/><stop offset=".53" stop-color="${tint(c,.15)}"/><stop offset=".75" stop-color="${c}"/><stop offset=".94" stop-color="${tint(c,-.32)}"/><stop offset="1" stop-color="${tint(c,-.18)}"/></linearGradient><radialGradient id="skin-bounce"><stop stop-color="#fff8ee" stop-opacity=".55"/><stop offset="1" stop-color="#fff8ee" stop-opacity="0"/></radialGradient><radialGradient id="skin-contact"><stop stop-color="${tint(sh,-.3)}" stop-opacity=".38"/><stop offset="1" stop-color="${sh}" stop-opacity="0"/></radialGradient><filter id="skin-soft" x="-.3" y="-.2" width="1.6" height="1.4"><feGaussianBlur stdDeviation="4"/></filter><filter id="face-soft"><feGaussianBlur stdDeviation="3"/></filter></defs>`;
    // Independently rounded thighs, knees, calves, shoulders and forearms.
    // The silhouettes are continuous; small creases describe the elbow flexion.
    const leg=(left)=>{
      const d=left
      ?'M307 654 Q282 714 295 812 Q299 891 313 951 Q309 974 311 995 Q303 1040 312 1104 L312 1139 Q294 1160 288 1174 Q287 1187 307 1187 L348 1184 Q358 1180 350 1163 L347 1138 Q356 1063 350 1011 Q349 989 350 975 Q355 894 360 793 L367 660Z'
      :'M353 660 L360 793 Q365 894 370 975 Q371 989 370 1011 Q364 1063 373 1138 L370 1163 Q363 1180 373 1184 L414 1187 Q434 1187 432 1174 Q426 1160 408 1139 L408 1104 Q417 1040 409 995 Q411 974 407 951 Q421 891 425 812 Q438 714 413 654Z';
      const side=left?'left':'right',x=left?306:368;
      return '<defs><clipPath id="leg-'+side+'">'+p(d,'white')+'</clipPath><linearGradient id="calf-fade-'+side+'" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="970" y2="1140"><stop stop-color="white" stop-opacity="0"/><stop offset=".3" stop-color="white"/><stop offset=".82" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="calf-mask-'+side+'"><rect x="280" y="970" width="160" height="170" fill="url(#calf-fade-'+side+')"/></mask></defs>'+
        p(d,cylinder,`data-volume="${side}-leg" stroke="${edge}" stroke-width="1"`)+
        `<g clip-path="url(#leg-${side})" mask="url(#calf-mask-${side})"><rect x="${x}" y="970" width="46" height="170" fill="${cylinder}" stroke="none"/></g>`;
    };
    const arm=(left)=>{
      const d='M290 360 Q265 367 255 438 Q247 489 237 546 Q232 562 238 582 Q246 620 223 728 L254 731 Q265 686 273 600 Q276 580 276 561 Q283 509 307 432 L316 379Z';
      const mirror=path=>left?path:path.replace(/([MLQ])([^MLQZ]+)/g,(_,command,values)=>command+values.trim().split(/[ ,]+/).map((n,i)=>i%2?+n:720-Number(n)).join(' '));
      const mirrored=mirror(d),id='arm-'+(left?'left':'right');
      return '<defs><clipPath id="'+id+'">'+p(mirrored,'white')+'</clipPath></defs>'+p(mirrored,cylinder,`data-volume="${left?'left':'right'}-arm" stroke="${edge}" stroke-width="1.1"`)+
        '<g clip-path="url(#'+id+')">'+p(mirror('M235 560 Q255 575 278 558 L282 612 Q274 675 254 732 L222 730 Q240 654 238 597Z'),cylinder,'stroke="none"')+'</g>';
    };
    const form=leg(true)+leg(false)+arm(true)+arm(false)+
      p('M329 300 L327 336 Q326 346 314 349 Q286 354 278 372 Q291 389 304 430 Q301 470 308 504 Q315 540 309 570 L299 646 Q304 694 360 699 Q416 694 421 646 L411 570 Q405 540 412 504 Q419 470 416 430 Q429 389 442 372 Q434 354 406 349 Q394 346 393 336 L391 300Z',cylinder,`data-volume="torso" stroke="${edge}" stroke-width="1"`)+
      p('M329 302 Q360 321 391 302 L392 333 Q360 346 328 333Z',sh,'stroke="none" opacity=".4"')+
      p('M302 455 Q306 503 321 541 Q321 573 311 612 M415 448 Q405 501 400 536 Q398 576 409 622','none',`stroke="${tint(sh,-.2)}" stroke-width="9" opacity=".2" filter="url(#skin-soft)"`)+
      '<ellipse cx="327" cy="957" rx="17" ry="24" fill="url(#skin-bounce)" stroke="none"/><ellipse cx="389" cy="957" rx="17" ry="24" fill="url(#skin-bounce)" stroke="none"/>'+
      '<ellipse cx="336" cy="997" rx="18" ry="18" fill="url(#skin-contact)" stroke="none"/><ellipse cx="402" cy="997" rx="17" ry="18" fill="url(#skin-contact)" stroke="none"/>'+
      p('M242 554 Q253 560 265 553 M455 553 Q467 561 478 555','none',`data-joint="elbows" stroke="${tint(sh,-.2)}" stroke-width="1.7" opacity=".52"`)+
      p('M243 568 Q249 575 258 570 M462 570 Q470 575 477 568','none',`stroke="${tint(c,.36)}" stroke-width="4" opacity=".8"`)+
      p('M320 350 Q337 355 346 350 M374 350 Q383 355 400 350','none',`stroke="${tint(sh,-.15)}" stroke-width="1.3" opacity=".38"`)+
      `<g data-hand="left">${hand(skin,true)}</g><g data-hand="right">${hand(skin)}</g>`+
      basic('top',p('M321 349 L332 354 L329 391 Q360 408 391 391 L388 354 L399 349 L410 406 L405 482 L411 606 Q360 621 309 606 L315 482 L310 406Z','#c9b1b7')+line('M318 581 Q360 593 402 581',.22)+flower(360,443,13,'#ead5cf'))+
      basic('bottom',p('M306 600 Q360 612 414 600 Q429 660 426 726 L373 734 L360 686 L347 734 L294 726 Q291 660 306 600Z','#aebda3')+p('M306 600 Q360 612 414 600 L417 624 Q360 635 303 624Z','#c2cbb8')+line('M360 629 L360 683 M304 714 L341 721 M379 721 L416 714',.3))+
      p('M320 979 Q330 983 338 978 M382 978 Q392 983 400 979','none',`stroke="${sh}" stroke-width="1.1" opacity=".35"`);
    const source=svg(volumes+'<g data-anatomy="body">'+contourMarkup(form)+
      '</g><g data-anatomy="head">'+face(skin)+basic('hair',hair({color:'#865538',shape:'airypony'}))+'</g>',undefined,'skin');
    baseCache.set(key,source);return hideBasics(source,covered,heldHands);
  }
  function hairShape(item) {
    const c = item.color, shape = item.shape;
    const cap = hairCap(c);
    const highlights = p('M280 179 Q290 131 332 126 M367 120 Q407 119 431 152','none',`stroke="${tint(c,.58)}" stroke-width="5" opacity=".15"`)+p('M290 174 Q300 147 324 139 M378 131 Q407 135 421 151','none',`stroke="${tint(c,.65)}" stroke-width="2" opacity=".3"`);
    if(shape==='airypony') return `<g data-hair-style="airypony">`+
      p('M422 134 Q454 97 478 133 Q501 167 486 217 Q472 258 482 296 Q495 331 477 355 Q464 373 443 358 Q462 334 450 297 Q434 268 448 225 Q465 178 424 170Z',c)+
      p('M280 228 Q263 192 274 155 Q287 115 330 104 Q385 91 421 117 Q458 145 444 207 L435 233 L425 198 Q399 180 382 158 Q370 181 352 186 L360 159 Q344 184 326 193 L332 169 Q316 197 296 205 L288 234Z',c)+
      p('M286 198 Q274 238 289 264 L297 276 Q285 247 298 218Z',c)+p('M432 197 Q448 236 437 267 L425 279 Q436 248 425 215Z',c)+
      p('M288 164 Q312 116 354 115 M369 111 Q412 116 433 153','none',`stroke="${tint(c,.55)}" stroke-width="7" opacity=".19"`)+
      Array.from({length:6},(_,i)=>p(`M${303+i*5} ${184-i*4} Q${308+i*5} ${140-i*2} ${348+i*5} ${114+i}`,'none',`stroke="${tint(c,i%2?.28:-.22)}" stroke-width="1.3" opacity=".45"`)).join('')+
      Array.from({length:5},(_,i)=>p(`M${455+i*4} 155 Q${484+i} 202 ${459+i*3} 258 Q${450+i*3} 297 ${469+i} 346`,'none',`stroke="${tint(c,i%2?.4:-.24)}" stroke-width="1.5" opacity=".36"`)).join('')+
      p('M436 143 Q443 124 457 128 Q463 139 448 147 Q464 145 473 156 Q465 167 445 153 L453 177 L443 174 L439 154 L426 170 L422 164 L433 150 Q414 149 418 135 Q426 128 436 143Z','#e7a9c0','stroke="#b67595" stroke-width="1.4"')+circle(440,148,4,'#f7d5e3','stroke="none"')+'</g>';
    if (shape === 'bun' || shape === 'pinbun') return circle(361,111,49,c)+cap+highlights+line('M335 91 Q368 66 392 106 M338 106 Q356 86 381 113',.35)+(shape==='pinbun' ? p('M302 115 L412 94','none','stroke="#c6aa6a" stroke-width="7"')+circle(415,93,9,'#91b29a')+p('M408 100 L417 142','none','stroke="#d8ba75"')+circle(417,145,5,'#d8ba75') : '');
    if (shape === 'bob') return p('M279 182 Q257 230 268 319 Q303 342 310 318 L293 210Z',c)+p('M428 181 Q461 240 449 319 Q417 339 413 316 L428 213Z',c)+cap+highlights+line('M279 233 L285 309 M438 232 L436 309',.25);
    if (shape === 'pony' || shape === 'ribbon') return p('M421 137 Q478 119 486 180 Q483 231 467 284 Q455 327 480 356 Q441 354 433 314 Q422 282 442 218 Q452 174 418 174Z',c)+cap+highlights+(shape==='ribbon' ? p('M439 153 Q475 116 485 138 Q482 165 444 163 Q470 196 461 204 L436 164 Q423 198 417 194 L426 163 Q401 162 403 143 Q416 128 439 153Z','#d7a2a8') : circle(439,154,9,'#d4ae7d'));
    if (shape === 'braids') return cap+highlights+[285,435].map(x => `<g>${Array.from({length:9},(_,i)=>`<ellipse cx="${x+(i%2?4:-4)}" cy="${244+i*17}" rx="15" ry="14" fill="${c}"/>`).join('')}${rect(x-12,385,25,10,3,'#c3ad80')}</g>`).join('');
    if (shape === 'curls') return p('M280 182 Q249 208 263 246 Q240 267 257 296 Q243 329 267 349 Q253 376 282 393 Q309 406 321 373 Q301 343 303 294 L293 215Z',c)+p('M431 182 Q467 212 451 246 Q476 273 458 298 Q480 326 456 350 Q469 385 440 394 Q413 404 405 373 Q421 338 417 291 L428 214Z',c)+cap+highlights+line('M275 251 Q289 266 272 280 M279 313 Q295 331 278 345 M446 250 Q430 271 446 280 M442 315 Q426 334 443 350',.4);
    return p('M282 181 Q249 225 266 271 Q275 305 258 339 Q245 379 283 408 Q313 420 321 391 Q289 375 307 337 Q318 306 300 270 L296 208Z',c)+p('M430 181 Q465 225 449 271 Q440 306 460 338 Q477 379 440 409 Q413 420 403 389 Q434 369 416 337 Q403 303 423 267 L426 211Z',c)+cap+highlights+line('M277 233 Q265 268 285 308 Q295 338 276 365 Q267 390 288 397 M442 234 Q453 265 435 307 Q426 338 443 364 Q454 386 436 399',.3);
  }
  function hair(item) {
    const {shape,color}=item;
    if(shape==='airypony')return hairShape(item);
    const paths=[];
    for(let i=0;i<7;i++) {
      if(shape==='bun'||shape==='pinbun') paths.push(`M${331+i*3} ${85+i} Q${355+i*3} ${67+i*3} ${394-i*2} ${101+i*2}`);
      else if(shape==='bob') paths.push(`M${276+i*2} 220 Q${269+i*3} 270 ${279+i*3} 312`,`M${438-i*2} 220 Q${448-i*3} 274 ${440-i*3} 312`);
      else if(shape==='pony'||shape==='ribbon') paths.push(`M${455+i*3} 174 Q${481-i} 214 ${455+i*2} 272 Q${445+i*2} 319 ${463+i} 338`);
      else if(shape!=='braids') paths.push(`M${274+i*3} 221 Q${265+i*3} 250 ${277+i*3} 279 Q${294+i} 307 ${272+i*3} 345 Q${260+i*4} 376 ${282+i*3} 392`,`M${447-i*3} 221 Q${456-i*3} 250 ${443-i*3} 279 Q${426-i} 307 ${448-i*3} 345 Q${460-i*4} 376 ${439-i*3} 392`);
    }
    return hairShape(item)+paths.map((d,i)=>p(d,'none',`stroke="${tint(color,i%3===0?.42:-.25)}" stroke-width="${i%3===0?1.5:1}" opacity=".4"`)).join('');
  }
  function top(item) {
    const c = item.color, shape = item.shape;
    const long = ['cardigan','sweater','hoodie','jacket','blazer','hanfu','frog','mandarin','blouse'].includes(shape);
    let content;
    if (shape === 'hanfu') content = p('M311 347 L277 366 L217 573 L272 606 L302 449 L307 502 L299 636 Q360 654 421 636 L413 502 L418 449 L448 606 L503 573 L443 366 L409 347 L360 387Z',c)+p('M312 347 L381 439 L407 350 L423 367 L385 466 L303 366Z','#f1e7d0')+p('M305 567 L414 567 L417 591 L302 591Z','#c4a474')+line('M359 591 L344 674 M369 591 L383 686',.65)+embroidery([[294,422],[427,425],[284,530],[443,530]]);
    else if (shape === 'vest') content = p('M312 348 L294 371 Q309 408 306 450 Q311 513 307 557 L301 614 Q360 626 419 614 L413 557 Q409 513 414 450 Q411 408 426 371 L408 348 L360 379Z',c)+p('M313 349 L360 402 L407 349 L397 389 L360 430 L323 389Z','#ecdecc')+line('M360 431 L360 608 M305 601 Q360 612 415 601',.35);
    else {
      // Follow the same shoulder, elbow and wrist contour as the base arms.
      const left = long ? 'Q263 377 251 437 L231 572 L220 699 L268 709 L285 591 L302 454' : 'Q269 375 254 437 L297 458 L305 432';
      const right = long ? 'L418 454 L435 591 L452 709 L500 699 L489 572 L469 437 Q457 377 437 363' : 'L415 432 L423 458 L466 437 Q451 375 437 363';
      content = p(`M311 349 L283 363 ${left} L307 510 L300 614 Q360 630 420 614 L413 510 ${right} L409 349 Q360 376 311 349Z`,c);
      content += p('M311 349 Q359 376 408 349 L402 372 Q359 394 316 371Z',shape==='tee'?'#dfccb1':c,'stroke-width="2"');
      if(long) content += line('M224 682 L269 692 M451 692 L496 682 M280 453 L270 536 M440 453 L450 536',.3);
    }
    if (shape === 'tee') content += flower(361,444,21,'#d9b99c')+line('M307 586 Q358 598 413 586 M275 431 L296 444 M425 444 L445 431');
    if (['cardigan','blazer','jacket','frog','mandarin'].includes(shape)) {
      content += line('M360 383 L360 612',.65);
      if (['blazer','jacket'].includes(shape)) content += p('M311 350 L360 421 L334 468 L305 385Z','#e8ddc5')+p('M407 350 L360 421 L389 468 L419 385Z','#e8ddc5')+line('M316 540 L344 540 M378 540 L408 540');
      for (let y = 423; y < 590; y += 43) content += shape === 'frog' || shape === 'mandarin' ? p(`M342 ${y} Q354 ${y-10} 362 ${y} Q373 ${y+10} 382 ${y} M342 ${y} Q354 ${y+10} 362 ${y} Q373 ${y-10} 382 ${y}`,'none','stroke="#ddc69a" stroke-width="4"') : circle(360,y,4,'#ded0b2');
    }
    if (shape === 'polo' || shape === 'blouse') content += p('M312 350 L359 379 L340 405 L314 377Z','#f6ecda')+p('M408 350 L359 379 L381 405 L405 377Z','#f6ecda');
    if (shape === 'blouse') content += p('M360 388 Q325 373 327 397 Q338 414 359 396 Q382 416 393 396 Q394 377 360 388Z','#f0d8be')+line('M357 396 L344 437 M363 396 L375 435');
    if (shape === 'hoodie') content += p('M311 350 Q290 410 335 415 L360 383 L385 415 Q430 412 408 350Z','#dfd3bc')+line('M338 408 L335 468 M383 409 L386 468 M327 539 L320 576 L402 576 L395 539Z');
    if (shape === 'sweater' || shape === 'cardigan') content += Array.from({length:8},(_,i)=>line(`M${320+i*11} 412 L${316+i*12} 604`,.13)).join('')+line('M308 589 L413 589');
    if (shape === 'frog' || shape === 'mandarin') content += p('M332 352 L332 335 Q359 345 386 335 L386 352 L360 382Z',c)+embroidery([[319,503],[404,551]],'#e6d3ad');
    return content+line('M316 490 Q325 521 317 549 M405 490 Q396 519 405 549',.18);
  }
  function bottom(item) {
    const c=item.color,s=item.shape;
    let result;
    if (['pleats','midi','mamian'].includes(s)) {
      const end=s==='pleats'?812:s==='mamian'?1103:1030;
      result=p(`M306 599 Q359 611 414 599 L${s==='pleats'?450:465} ${end} Q360 ${end+19} ${s==='pleats'?270:255} ${end}Z`,c)+p('M305 599 Q359 609 415 599 L417 629 Q360 639 303 629Z',c);
      for(let i=0;i<9;i++) { const x=311+i*12; result+=line(`M${x} 637 L${(s==='pleats'?280:266)+i*(s==='pleats'?20:23)} ${end-10}`,s==='mamian'&&i>2&&i<6?.08:.25); }
      if(s==='mamian') result+=p(`M336 632 L384 632 L404 ${end} L315 ${end}Z`,c)+embroidery([[355,697],[372,749],[347,810],[371,930],[346,1000]],'#e7d2a5')+p(`M259 ${end-22} L461 ${end-22}`,'none','stroke="#d8bd89" stroke-width="8"');
      if(s==='midi') result+=embroidery([[303,764],[399,887],[330,958]],'#e9d6bd');
    } else {
      const shorts=s==='shorts',flare=s==='flare',end=shorts?780:1143;
      result=p(`M306 600 Q360 609 413 600 Q430 656 426 721 L${flare?446:419} ${end} L${flare?362:372} ${end} L361 ${shorts?713:794} L${flare?350:348} ${end} L${flare?274:302} ${end} L294 724 Q291 658 306 600Z`,c)+p('M305 599 L416 599 L420 632 L301 632Z',c)+line(`M361 634 L361 ${shorts?713:794} M307 639 Q317 671 339 668 M410 639 Q402 671 381 668 M315 ${end-15} L341 ${end-15} M380 ${end-15} L413 ${end-15}`);
      if(s==='cargo') result+=rect(295,780,46,72,5,c)+rect(381,780,43,72,5,c)+line('M295 799 L341 799 M381 799 L424 799');
      if(s==='jeans'||s==='flare') result+=line('M314 698 L323 1103 M409 697 L395 1103',.22)+circle(360,615,4,'#d0b77d');
    }
    return result;
  }
  function dress(item) {
    const c=item.color,s=item.shape;
    const gown=['gown','hanfu','qipao'].includes(s),short=['aline','sport','pinafore'].includes(s),end=gown?1139:short?851:1046;
    const spread=s==='qipao'?57:s==='gown'?127:s==='hanfu'?128:short?88:113;
    let result;
    if (s === 'hanfu') result = p('M310 348 L276 365 L211 586 L269 613 L302 440 L307 495 L300 608 L232 1139 Q361 1168 488 1139 L420 608 L413 495 L418 440 L451 613 L509 586 L444 365 L410 348 L360 385Z',c)+p('M309 349 L384 439 L407 349 L427 367 L389 468 L296 367Z','#f2e8d3')+p('M303 587 L417 587 L424 623 L296 623Z','#b59c75')+p('M349 623 L372 623 L385 1105 L337 1105Z','#e9d6b1')+embroidery([[287,802],[441,978],[280,1063],[427,738],[279,480],[445,481]]);
    else {
      const skirtLeft=s==='qipao'?`Q286 663 290 730 Q297 996 303 ${end}`:`Q${305-spread/5} 697 ${360-spread} ${end}`;
      const skirtRight=s==='qipao'?'Q423 996 430 730 Q434 663 420 602':`Q${415+spread/5} 697 420 602`;
      result=p(`M313 350 L288 367 Q293 405 302 445 L307 485 L300 602 ${skirtLeft} Q360 ${end+27} ${360+spread} ${end} ${skirtRight} L413 485 L418 445 Q427 405 432 367 L407 350 Q360 377 313 350Z`,c)+line(`M304 598 Q360 615 416 598 M326 654 L${360-spread+37} ${end-20} M394 654 L${360+spread-36} ${end-20}`,.3);
      if(s==='sundress'||s==='slip') result+=p('M313 350 L323 350 L329 389 M407 350 L397 350 L392 389','none','stroke-width="7"');
      if(s==='puff') result+=p('M310 350 Q274 344 258 382 Q249 414 293 443 L316 408Z',c)+p('M409 350 Q443 344 460 382 Q472 414 427 443 L405 408Z',c)+line('M263 406 L299 426 M424 426 L457 407');
      if(s==='pinafore') result+=p('M313 350 L331 350 L335 414 L385 414 L390 350 L407 350 L402 469 L318 469Z','#d8c7ab')+rect(332,487,56,57,7,c)+circle(325,429,5,'#dcc49a')+circle(395,429,5,'#dcc49a');
      if(s==='qipao') result+=p('M333 352 L333 334 Q360 343 386 334 L386 351 L409 372 L398 442 L373 453','none','stroke="#ead4a9" stroke-width="6"')+embroidery([[387,430],[329,643],[393,817],[336,969]],'#ebd8b1')+line('M407 1014 L416 1139');
      if(s==='sport') result+=p('M312 350 L360 385 L407 350 L394 381 L360 405 L326 382Z','#f3ead8')+line('M311 614 L408 614');
      if(s==='wrap') result+=p('M312 350 L401 493 L315 603 L409 608 L359 739','none','stroke="#e4cb9f" stroke-width="6"');
      if(s==='gown') result+=p('M313 350 Q333 373 360 390 Q389 373 407 350 L403 382 Q360 426 316 382Z','#e4cead')+embroidery([[316,724],[409,858],[298,1014],[423,1093]],'#d8bd8c');
      if(s==='knit') result+=Array.from({length:8},(_,i)=>line(`M${321+i*11} 399 L${286+i*21} 1038`,.16)).join('');
      if(s==='sundress'||s==='puff') result+=embroidery([[331,467],[390,686],[307,813],[409,913],[333,983]]);
    }
    return result;
  }
  function shoes(item) {
    const c=item.color,s=item.shape;
    const one=(flip)=>`<g ${flip?'transform="translate(720 0) scale(-1 1)"':''}>`+(
      s==='boot'?p('M302 1011 L351 1011 L349 1140 L357 1183 Q341 1197 286 1188 L284 1170 L305 1144Z',c)+line('M309 1026 L345 1026 M313 1047 L339 1047 M313 1067 L339 1067 M313 1087 L339 1087 M313 1107 L339 1107'):
      s==='heel'?p('M308 1141 L331 1154 L350 1144 L351 1183 L340 1184 L336 1167 L324 1185 L283 1185 Q277 1174 290 1167Z',c)+p('M311 1145 L336 1154','none','stroke="#e1cba3" stroke-width="7"'):
      s==='sandal'?p('M305 1153 L347 1152 L352 1187 L287 1187 Q277 1178 291 1170Z',c)+p('M303 1151 L342 1175 M338 1152 L298 1176','none','stroke="#f2e2c2" stroke-width="7"'):
      p(`M307 1142 Q326 1156 348 1142 L352 ${s==='platform'?1189:1181} Q319 ${s==='platform'?1204:1193} 282 ${s==='platform'?1193:1183} L284 1171Z`,c)+p(`M284 1179 Q319 1188 351 1179 L352 ${s==='platform'?1202:1191} Q318 ${s==='platform'?1211:1200} 282 ${s==='platform'?1204:1193}Z`,'#f0e4d0')+
      (s==='maryjane'||s==='embroidered'?p('M305 1152 L345 1157','none','stroke="#e7d3b0" stroke-width="8"')+circle(343,1157,4,'#c4a369'):s==='loafer'?p('M302 1164 L341 1164','none','stroke="#d0b483" stroke-width="6"'):line('M309 1154 L337 1157 M305 1162 L336 1165 M301 1170 L334 1173',.65))
    )+(s==='embroidered'?flower(310,1177,8,'#f1c5be'):'')+'</g>';
    return one(false)+one(true);
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
  function clothVolume(drawing,item) {
    const pants=item.category==='bottom'&&!['pleats','midi','mamian'].includes(item.shape);
    const defs='<defs><clipPath id="cloth-clip">'+drawing+'</clipPath><linearGradient id="cloth-round"><stop stop-color="#302039" stop-opacity=".24"/><stop offset=".3" stop-color="#fff" stop-opacity=".27"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset=".87" stop-color="#302039" stop-opacity=".26"/><stop offset="1" stop-color="#fff" stop-opacity=".1"/></linearGradient><radialGradient id="cloth-occlusion"><stop stop-color="#46304a" stop-opacity=".3"/><stop offset="1" stop-color="#46304a" stop-opacity="0"/></radialGradient><filter id="cloth-soft"><feGaussianBlur stdDeviation="4"/></filter></defs>';
    let light='';
    if(item.category!=='bottom')light+=
      p('M313 374 Q292 420 306 481 Q320 526 310 573 L299 628 L324 628 Q330 562 329 536 Q311 477 323 415Z','#302039','stroke="none" opacity=".13" filter="url(#cloth-soft)"')+
      p('M408 386 Q414 445 402 498 Q389 537 403 602 L419 623 L402 541 L418 455Z','#302039','stroke="none" opacity=".24" filter="url(#cloth-soft)"')+
      p('M330 406 Q320 457 338 482','none','stroke="#fff" stroke-width="16" opacity=".22" filter="url(#cloth-soft)"')+
      p('M269 438 L251 550 Q256 600 242 689 M448 439 L468 550 Q467 601 479 690','none','stroke="#fff" stroke-width="14" opacity=".2" filter="url(#cloth-soft)"')+
      '<ellipse cx="361" cy="376" rx="55" ry="15" fill="url(#cloth-occlusion)" stroke="none"/>';
    if(pants)light+='<defs><linearGradient id="trouser-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="710" y2="810"><stop stop-color="white" stop-opacity="0"/><stop offset="1" stop-color="white"/></linearGradient><mask id="trouser-light-mask"><rect x="270" y="710" width="180" height="440" fill="url(#trouser-fade)"/></mask></defs><g mask="url(#trouser-light-mask)"><path d="M296 710 L360 710 L357 1144 L296 1144Z" fill="url(#cloth-round)" stroke="none"/><path d="M360 710 L427 710 L427 1144 L363 1144Z" fill="url(#cloth-round)" stroke="none"/></g>';
    if(item.category!=='top')light+='<ellipse cx="361" cy="638" rx="66" ry="23" fill="url(#cloth-occlusion)" stroke="none"/>';
    return defs+drawing+'<g data-material="cloth-volume" clip-path="url(#cloth-clip)">'+light+'</g>';
  }
  function itemSvg(item, thumbnail = false) {
    const render = { hair, top, bottom, dress, shoes, accessory }[item.category];
    let box=item.bounds;
    if(item.category==='shoes'&&item.shape==='boot')box=[255,995,210,225];
    if(item.category==='accessory') box = ['necklace','pendant'].includes(item.shape)?[300,326,120,130]:item.shape==='glasses'?[270,206,180,80]:['clip','pin'].includes(item.shape)?[366,113,110,133]:item.shape==='earrings'?[255,240,210,80]:item.shape==='scarf'?[290,325,140,240]:item.shape==='watch'?[448,687,58,68]:item.shape==='fan'?[417,582,140,225]:[422,762,140,213];
    if(item.category==='accessory'&&item.shape==='crossbody')box=[280,350,260,480];
    const embedded = globalThis.MuseAssets?.[item.img];
    if (embedded) return thumbnail ? embedded.replace(/width="720"/,`width="${box[2]}"`).replace(/height="1280"/,`height="${box[3]}"`).replace(/viewBox="0 0 720 1280"/,`viewBox="${box.join(' ')}"`) : embedded;
    const key=JSON.stringify([item,thumbnail]);
    if(itemCache.has(key))return itemCache.get(key);
    let drawing=render(item);
    if(['top','bottom','dress'].includes(item.category))drawing=clothVolume(drawing,item);
    if(rigPart(item)==='body')drawing=contourMarkup(drawing);
    if(item.category==='hair')drawing='<defs><filter id="hair-contact" x="-.15" y="-.1" width="1.3" height="1.2"><feDropShadow dx="2" dy="4" stdDeviation="2.8" flood-color="#492936" flood-opacity=".24"/></filter></defs><g filter="url(#hair-contact)">'+drawing+'</g>';
    const source=svg(drawing,thumbnail?box.join(' '):undefined,item.category==='hair'?'hair':'fabric');
    itemCache.set(key,source);return source;
  }
  const uri = value => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value);
  const contents = value => value.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  const handheld = item => item.category==='accessory' && ['bag','tote','fan'].includes(item.shape);
  function fittedItemSvg(item) {return svg(`<g transform="${rigTransform(rigPart(item))}">${contents(itemSvg(item))}</g>`);}
  function grip(skin, left) {
    return svg(hand(skin,left,'grip'),undefined,'skin');
  }
  function avatarSvg(skin, items = [], namespace='export') {
    const covered=items.map(i=>i.category);
    if(covered.includes('dress'))covered.push('top','bottom');
    let held=0;
    const count=items.filter(handheld).length,heldHands=count>1?['right','left']:count?['right']:[];
    const watches=items.filter(i=>i.category==='accessory'&&i.shape==='watch');
    const layers=[['base',body(skin,covered,heldHands)],...[...items].filter(i=>!watches.includes(i)).sort((a,b)=>a.z-b.z).map(i=>{
      const source=itemSvg(i);
      if(!handheld(i))return [i.id,source];
      const left=held++>0;
      return [i.id,svg(`<g data-held-hand="${left?'left':'right'}"${left?' transform="translate(720 0) scale(-1 1)"':''}>${contents(source)}</g>`)];
    })];
    if(held)layers.push(['hand-right',grip(skin,false)]);
    if(held>1)layers.push(['hand-left',grip(skin,true)]);
    // A wristwatch must remain above the hand at the cuff, including grip poses.
    layers.push(...watches.map(i=>[i.id,itemSvg(i)]));
    const scene=layers.map(([id,source])=>{
      const prefix=namespace+'-'+id+'-';
      let art=contents(source);
      if(id==='base')art=art.replace(/data-anatomy="(head|body)"/g,(_,part)=>`data-anatomy="${part}" transform="${rigTransform(part)}"`);
      else {
        const part=id.startsWith('hand-')?'body':rigPart(items.find(i=>i.id===id));
        art=`<g data-rig="${part}" transform="${rigTransform(part)}">${art}</g>`;
      }
      return `<g data-layer="${id}">${art.replace(/\bid="([^"]+)"/g,(_,value)=>`id="${prefix+value}"`).replace(/url\(#([^)]+)\)/g,(_,value)=>`url(#${prefix+value})`)}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" data-scene="${namespace}" width="720" height="1280" viewBox="0 0 720 1280" fill="none">${scene}</svg>`;
  }
  return { svg, body, itemSvg, fittedItemSvg, avatarSvg, uri, flower, handheld, rigPoint };
});
