(function (root, factory) {
  const art = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  else root.MuseArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Native garments share the painted cast coordinates. Accessories retain their own placement rig.
  const ink='#796576',itemCache=new Map();
  const profile=(y,knots)=>{
    if(y<=knots[0][0])return knots[0][1];
    for(let i=1;i<knots.length;i++)if(y<=knots[i][0]){const [lo,v]=knots[i-1],[hi,w]=knots[i];return v+(w-v)*(y-lo)/(hi-lo);}
    return knots[knots.length-1][1];
  };
  function contourPoint(x,y) {
    const torso=profile(y,[[0,1.4],[350,1.45],[440,1.65],[540,1.3],[600,1.65],[710,1.95],[780,1.83],[950,1.83],[1050,1.83],[1143,1.35],[1205,1.13],[1280,1.13]]);
    const arm=profile(y,[[0,1.4],[350,1.45],[440,1.35],[540,1.25],[600,1.35],[710,1.5],[780,1.5],[1280,1.5]]);
    const blend=Math.max(0,Math.min(1,(Math.abs(x-360)-80)/26));
    const scale=torso+(arm-torso)*blend;
    const py=profile(y,[[0,0],[330,282],[350,296],[440,380],[540,467],[600,525],[710,640],[780,704],[950,872],[1050,1010],[1143,1150],[1205,1238],[1280,1312]]);
    return [360+(x-360)*scale,py];
  }
  const rigPoint=(x,y,part='body')=>part==='head'?[360+(x-360)*1.08,y-65]:contourPoint(x,y);
  const rigPart=item=>item.category==='hair'||item.category==='accessory'&&['glasses','earrings','clip','pin'].includes(item.shape)?'head':'body';
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
    // Absolute curves keep embroidery attached when the garment is fitted.
    return [0,72,144,216,288].map(a=>{const t=a*Math.PI/180,u=t-.48,v=t+.48;return p(`M${x} ${y} Q${x+Math.cos(u)*size*1.4} ${y+Math.sin(u)*size*1.4} ${x+Math.cos(t)*size} ${y+Math.sin(t)*size} Q${x+Math.cos(v)*size*1.4} ${y+Math.sin(v)*size*1.4} ${x} ${y}Z`,color);}).join('')+circle(x,y,size*.23,'#d7ac65');
  }
  function embroidery(points, color = '#f0d7b1') { return points.map(([x,y]) => flower(x,y,10,color)).join(''); }
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
  // Clothing is drafted in the painted cast's 720 x 1280 coordinates.
  // The shared envelope includes 6–12 px of seam ease around all three sprites.
  // Neck root 278 (x329–391), shoulders 300, bust 385, waist 490, hips 625.
  // Neck openings follow the painted neck, with shoulder fabric continuing to
  // the armhole. A wide horizontal rim here used to float above the clavicles.
  const mirror=content=>`<g transform="translate(720 0) scale(-1 1)">${content}</g>`;
  function sleeves(color,kind='long') {
    const shape=kind==='short'
      ?'M304 287 Q266 287 242 307 Q224 322 221 386 Q246 401 279 409 L291 368 L306 321Z'
      :kind==='puff'
      ?'M304 287 Q261 281 237 306 Q212 336 219 372 Q236 397 278 407 Q290 376 294 349Z'
      :kind==='flowing'
      ?'M304 287 Q265 287 239 310 Q221 363 211 435 Q198 480 163 551 Q190 584 239 596 L270 518 Q286 447 294 373Z'
      :'M304 287 Q265 287 240 310 Q224 331 221 385 L212 445 Q209 472 198 491 Q185 516 179 546 L161 616 Q180 627 203 630 L219 589 Q230 560 245 542 Q261 522 266 490 L283 414 Q296 369 305 328Z';
    const seam=kind==='short'?'M225 375 Q250 391 279 398':kind==='puff'?'M224 370 Q248 390 279 395':kind==='flowing'?'M169 544 Q192 573 241 583':'M164 603 Q184 616 206 616 M214 478 Q229 493 247 493 M202 505 Q217 510 233 508';
    const left=p(shape,color)+line(seam,.3);
    return left+mirror(left);
  }
  function bodice(color,hem=538) {
    const hip=hem>520?274:285;
    // Keep two native pixels of ease at each waist edge. A flush fit leaves
    // Zoe's base outline visible when Chromium rasterizes the scaled sprite.
    return p(`M329 278 Q360 314 391 278 Q406 285 424 287 L443 305 Q432 345 459 384 Q455 415 438 440 Q426 462 428 486 Q428 504 ${720-hip} ${hem} Q360 ${hem+15} ${hip} ${hem} Q292 504 292 486 Q294 462 282 440 Q265 415 261 384 Q288 345 277 305 L296 287 Q314 285 329 278Z`,color);
  }
  const neckband=color=>p('M329 278 Q360 314 391 278 L395 285 Q360 323 325 285Z',color);
  const collar=()=>p('M329 278 Q338 295 360 301 L340 330 L312 298Z','#f6ecda')+p('M391 278 Q382 295 360 301 L380 330 L408 298Z','#f6ecda');
  const standCollar=color=>p('M328 283 L333 270 Q360 285 387 270 L392 283 Q360 316 328 283Z',color);
  const crossedCollar=()=>p('M329 278 L393 388 L391 278 L420 292 L398 416 L300 292Z','#f3e7cf');
  function top(item) {
    const c=item.color,s=item.shape,long=!['tee','polo','vest'].includes(s)&&item.id!=='top_cozy_02';
    let content=(s==='vest'?'':sleeves(c,s==='hanfu'?'flowing':long?'long':'short'))+bodice(c);
    content+=neckband(s==='tee'?tint(c,-.08):c);
    if(s==='vest')content+=p('M329 278 Q360 314 391 278 L405 300 L360 351 L315 300Z','#f3e8d6')+p('M323 290 L360 332 L397 290 L405 300 L360 351 L315 300Z',c)+line('M282 525 Q360 540 438 525',.55);
    if(s==='tee')content+=flower(360,390,24,'#d9b99c')+line('M282 524 Q360 539 438 524');
    if(['cardigan','blazer','jacket','frog','mandarin'].includes(s)){
      content+=line('M360 316 L360 540',.65);
      if(['blazer','jacket'].includes(s))content+=p('M329 278 L360 328 L326 391 L284 332 L300 292Z','#e9ddc6')+p('M391 278 L360 328 L394 391 L436 332 L420 292Z','#e9ddc6')+line('M298 475 L335 479 M385 479 L422 475');
      for(let y=356;y<518;y+=39)content+=s==='frog'||s==='mandarin'?p(`M342 ${y} Q354 ${y-9} 362 ${y} Q374 ${y+9} 382 ${y} M342 ${y} Q354 ${y+9} 362 ${y} Q374 ${y-9} 382 ${y}`,'none','stroke="#e5cfa4" stroke-width="4"'):circle(360,y,4,'#e1ccb0');
    }
    if(s==='polo'||s==='blouse')content+=collar();
    if(s==='blouse')content+=p('M360 317 Q322 299 326 324 Q341 343 360 325 Q380 344 395 323 Q397 302 360 317Z','#f0d8be')+line('M357 327 L345 368 M364 327 L377 366');
    if(s==='hoodie')content+=p('M329 278 Q314 287 306 300 Q297 323 319 343 L360 310 L401 343 Q423 323 414 300 Q406 287 391 278 Q360 314 329 278Z','#dfd3bc')+line('M323 338 L319 407 M397 338 L401 407 M321 466 L312 505 Q360 520 408 505 L399 466Z');
    if(s==='sweater'||s==='cardigan')content+=Array.from({length:10},(_,i)=>line(`M${294+i*14} 359 Q${288+i*16} 414 ${300+i*13} 477 L${287+i*16} 525`,.12)).join('')+line('M282 520 Q360 535 438 520');
    if(s==='frog'||s==='mandarin')content+=standCollar(c)+embroidery([[307,451],[407,497]],'#ead7b2');
    if(s==='hanfu')content+=crossedCollar()+p('M293 491 Q360 503 427 491 L440 521 Q360 536 280 521Z','#bea078')+line('M358 529 L345 580 M368 529 L385 585',.7)+embroidery([[254,370],[466,370],[226,513],[494,513]],'#e7d0a7');
    return content+line('M281 404 Q312 424 330 413 M438 404 Q408 424 391 413 M304 481 L311 508 M416 481 L410 508',.18);
  }
  function skirtShape(shape) {
    const end=shape==='pleats'?764:shape==='mamian'?1158:1046;
    const spread=shape==='pleats'?151:shape==='mamian'?176:182;
    return {end,spread,path:`M285 504 Q360 521 435 504 Q475 549 494 612 L${360+spread} ${end} Q360 ${end+22} ${360-spread} ${end} L226 612 Q245 549 285 504Z`};
  }
  const waistband=c=>p('M285 504 Q360 521 435 504 Q445 520 453 539 Q360 556 267 539 Q275 520 285 504Z',c)+line('M274 530 Q360 546 446 530',.35);
  function bottom(item) {
    const c=item.color,s=item.shape;
    let content;
    if(['pleats','midi','mamian'].includes(s)){
      const {end,spread,path}=skirtShape(s);content=p(path,c);
      for(let i=0;i<9;i++){const x=280+i*20,edge=360-spread+18+i*(2*spread-36)/8;content+=line(`M${x} 553 Q${360+(x-360)*1.5} 620 ${edge} ${end-10}`,s==='mamian'&&i>2&&i<6?.08:.25);}
      if(s==='mamian')content+=p(`M326 545 L394 545 L424 ${end} L296 ${end}Z`,c)+embroidery([[347,628],[378,708],[340,812],[379,932],[346,1040]],'#e8d1a2')+p(`M${360-spread+4} ${end-22} Q360 ${end-2} ${360+spread-4} ${end-22}`,'none','stroke="#d8bd89" stroke-width="8"');
      if(s==='midi')content+=embroidery([[280,682],[423,864],[315,955]],'#ead6bd');
    }else if(s==='shorts'){
      content=p('M285 504 Q360 521 435 504 Q480 553 489 611 Q497 657 484 706 Q429 722 365 716 L361 658 Q360 648 359 658 L355 716 Q291 722 236 706 Q223 657 231 611 Q240 553 285 504Z',c)+line('M360 542 L360 652 M241 693 Q292 708 351 702 M369 702 Q428 708 479 693');
    }else{
      const flare=s==='flare',outer=flare?240:269,inner=flare?354:339;
      // Separate leg contours keep the crotch and knee bend without the old
      // hip-to-calf scaling, which pinched the knees and ballooned the shins.
      content=p(`M285 504 Q360 521 435 504 Q480 553 490 615 Q494 665 480 714 Q473 797 473 883 Q476 996 ${720-outer} 1158 Q${720-(outer+inner)/2} 1168 ${720-inner} 1158 L381 1005 Q373 914 366 844 L362 684 Q360 667 358 684 L354 844 Q347 914 339 1005 L${inner} 1158 Q${(outer+inner)/2} 1168 ${outer} 1158 Q244 996 247 883 Q247 797 240 714 Q226 665 230 615 Q240 553 285 504Z`,c)+line('M360 544 L360 673 M275 557 Q291 601 330 592 M445 557 Q429 601 390 592');
      content+=line(`M${outer+4} 1143 Q${(outer+inner)/2} 1150 ${inner-3} 1143 M${723-inner} 1143 Q${720-(outer+inner)/2} 1150 ${716-outer} 1143`,.4);
      if(s==='cargo')content+=rect(242,708,70,90,6,c)+rect(408,708,70,90,6,c)+line('M244 728 L310 728 M410 728 L476 728 M267 743 L267 777 M453 743 L453 777');
      if(s==='jeans'||flare)content+=line('M250 664 Q264 829 261 950 L285 1124 M470 664 Q456 829 459 950 L435 1124',.25);
    }
    content+=waistband(c);
    if(!['pleats','midi','mamian'].includes(s))content+=circle(360,530,4.5,'#d4b986')+line('M293 515 L289 540 M427 515 L431 540',.5);
    return content;
  }
  function dress(item) {
    const c=item.color,s=item.shape,short=['aline','sport','pinafore'].includes(s),end=['gown','hanfu','qipao'].includes(s)?1198:short?794:1046;
    const spread=s==='gown'?206:s==='hanfu'?198:short?156:182;
    const lower=s==='qipao'
      ?'M285 504 Q360 521 435 504 Q480 550 493 614 Q500 668 484 735 Q475 835 474 944 Q471 1095 450 1178 Q360 1207 270 1178 Q249 1095 246 944 Q245 835 236 735 Q220 668 227 614 Q240 550 285 504Z'
      :`M285 504 Q360 521 435 504 Q475 549 494 612 L${360+spread} ${end} Q360 ${end+24} ${360-spread} ${end} L226 612 Q245 549 285 504Z`;
    let content=(s==='hanfu'?sleeves(c,'flowing'):s==='puff'?sleeves(c,'puff'):s==='knit'?sleeves(c):s==='pinafore'?sleeves('#f6eadc','short'):item.id==='dress_elegant_02'?sleeves(c,'short'):'')+p(lower,c)+bodice(c,506);
    content+=neckband(c)+line('M285 506 Q360 523 435 506',.32);
    if(s==='gown')content+=p('M329 278 Q360 314 391 278 L397 290 Q386 316 360 329 Q334 316 323 290Z','#ead4af')+embroidery([[282,704],[447,852],[255,1060],[458,1144]],'#dfc796');
    if(s==='sundress'||s==='slip')content+=p('M303 295 L296 352 M417 295 L424 352','none','stroke-width="7" stroke="#e6cdb3"')+line('M296 352 Q360 375 424 352',.5);
    if(s==='sundress'||s==='puff')content+=embroidery([[315,406],[402,628],[273,814],[446,950],[333,1000]]);
    if(s==='sport')content+=collar()+p('M293 496 Q360 512 427 496','none','stroke="#f3ead8" stroke-width="9"');
    if(s==='pinafore')content+=p('M300 292 L318 286 L323 365 L397 365 L402 286 L420 292 L422 419 L298 419Z','#d9c5a7')+rect(327,430,66,57,8,c)+circle(309,381,5,'#e3c99d')+circle(411,381,5,'#e3c99d');
    if(s==='wrap')content+=p('M302 288 L422 430 L288 505 L435 509 L350 684','none','stroke="#e7d0ab" stroke-width="6"')+p('M431 505 Q468 482 468 508 Q463 532 436 518 L457 569 L435 549 L428 576 L425 520Z','#e7d0ab');
    if(s==='qipao')content+=standCollar(c)+p('M333 270 Q360 285 387 270 L392 283 L421 317 L409 390 L382 405','none','stroke="#ead4a9" stroke-width="4"')+embroidery([[404,367],[307,583],[421,797],[308,1003]],'#ebd8b1')+line('M449 1070 L440 1179',.5);
    if(s==='knit')content+='<defs><clipPath id="knit-fit">'+p(lower,'#fff')+bodice('#fff',506)+'</clipPath></defs><g clip-path="url(#knit-fit)">'+Array.from({length:10},(_,i)=>line(`M${291+i*15} 352 Q${286+i*16} 430 ${297+i*14} 490 Q${261+i*22} 696 ${202+i*35} 1035`,.16)).join('')+'</g>';
    if(s==='hanfu')content+=crossedCollar()+p('M292 492 Q360 506 428 492 L446 534 Q360 552 274 534Z','#b59c75')+p('M340 542 L380 542 L403 1154 L317 1154Z','#ead7b4')+embroidery([[252,363],[468,363],[277,768],[452,1002],[246,1113],[440,675]]);
    if(s!=='qipao')content+=line(`M289 569 Q270 685 ${380-spread} ${end-17} M431 569 Q450 685 ${340+spread} ${end-17}`, .23);
    return content;
  }
  function shoes(item) {
    const c=item.color,s=item.shape,platform=s==='platform';
    let left;
    if(s==='boot')left=p('M247 938 Q296 952 341 938 L337 1012 L332 1143 Q334 1175 344 1202 Q356 1236 342 1244 Q300 1255 268 1243 Q257 1235 268 1206 Q281 1175 275 1139 L268 1070Z',c)+line('M253 957 Q294 970 337 957 M280 990 L330 990 M280 1020 L330 1020 M282 1050 L329 1050 M284 1080 L329 1080 M285 1110 L329 1110 M278 1187 Q306 1196 340 1187');
    else if(s==='sandal')left=p('M279 1165 Q303 1176 331 1165 L346 1224 Q352 1248 337 1252 Q294 1262 268 1248 Q258 1241 267 1213Z',c)+p('M282 1166 Q307 1186 339 1202 M329 1166 Q303 1191 272 1216 M273 1216 Q306 1228 342 1217','none','stroke="#ecd9b9" stroke-width="10"')+circle(330,1173,4,'#c9aa79');
    else if(s==='heel')left=p('M273 1194 Q304 1211 340 1194 Q350 1214 347 1236 Q337 1253 270 1245 Q260 1235 273 1194Z',c)+p('M280 1151 Q305 1167 331 1151','none',`stroke="${c}" stroke-width="9"`)+p('M288 1160 L292 1200','none',`stroke="${c}" stroke-width="6"`)+circle(329,1156,4,'#ddc18e');
    else left=p('M280 1141 Q305 1155 331 1141 L336 1174 Q344 1195 347 1219 Q351 1244 338 1248 Q297 1259 269 1246 Q258 1239 267 1213 L276 1175Z',c);
    if(s!=='sandal'&&s!=='heel')left+=p(`M267 1227 Q303 1241 347 1228 L347 ${platform?1260:1247} Q305 ${platform?1274:1261} 267 ${platform?1260:1248}Z`,'#f0e4d0')+line('M273 1215 Q304 1230 342 1217',.5);
    if(['sneaker','platform'].includes(s))left+=p('M290 1155 Q307 1163 323 1155 L329 1209 Q309 1216 281 1206Z',c)+line('M292 1168 L323 1170 M289 1181 L325 1183 M285 1194 L328 1197',.7);
    if(s==='loafer')left+=p('M278 1180 Q307 1192 336 1180 L340 1198 Q307 1211 274 1197Z',c)+p('M290 1192 L326 1192','none','stroke="#d4b888" stroke-width="6"');
    if(s==='maryjane'||s==='embroidered')left+=p('M281 1161 Q305 1175 332 1161','none','stroke="#efdbbd" stroke-width="10"')+circle(330,1165,4,'#c7a87b');
    if(s==='embroidered')left+=flower(306,1217,12,'#f1c5be');
    return left+mirror(left);
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
    // Definitions belong to the drawing once. Cloning nested clip IDs into the
    // lighting mask makes browsers resolve knit details against the wrong clip.
    const silhouette=drawing.replace(/<defs>[\s\S]*?<\/defs>/g,'').replace(/<g clip-path="[^"]+">[\s\S]*?<\/g>/g,'');
    const defs='<defs><clipPath id="cloth-clip">'+silhouette+'</clipPath><linearGradient id="cloth-round"><stop stop-color="#302039" stop-opacity=".19"/><stop offset=".32" stop-color="#fff" stop-opacity=".22"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#302039" stop-opacity=".18"/></linearGradient><radialGradient id="cloth-contact"><stop stop-color="#392841" stop-opacity=".24"/><stop offset="1" stop-color="#392841" stop-opacity="0"/></radialGradient><filter id="cloth-soft"><feGaussianBlur stdDeviation="6"/></filter></defs>';
    let light='';
    if(item.category!=='bottom')light+=p('M281 353 Q269 397 286 437 Q304 469 286 520','none','stroke="#392841" stroke-width="14" opacity=".15" filter="url(#cloth-soft)"')+p('M440 354 Q452 397 434 437 Q417 474 433 519','none','stroke="#392841" stroke-width="16" opacity=".22" filter="url(#cloth-soft)"')+p('M297 357 Q315 340 341 359 M376 356 Q400 340 422 358','none','stroke="#fff" stroke-width="14" opacity=".2" filter="url(#cloth-soft)"')+'<ellipse cx="360" cy="414" rx="85" ry="27" fill="url(#cloth-contact)" stroke="none"/>';
    if(pants)light+='<path d="M237 554 L358 554 L344 1165 L255 1165Z" fill="url(#cloth-round)" stroke="none"/><path d="M362 554 L483 554 L465 1165 L376 1165Z" fill="url(#cloth-round)" stroke="none"/>';
    if(item.category!=='top')light+='<ellipse cx="360" cy="543" rx="94" ry="21" fill="url(#cloth-contact)" stroke="none"/>';
    return defs+drawing+'<g data-material="cloth-volume" clip-path="url(#cloth-clip)">'+light+'</g>';
  }
  function paintedItem(item, fit, thumbnail) {
    const source=globalThis.MuseAssets?.[fit.asset]||fit.asset;
    const box=thumbnail?fit.target.join(' '):'0 0 720 1280';
    return '<svg xmlns="http://www.w3.org/2000/svg" width="'+box.split(' ')[2]+'" height="'+box.split(' ')[3]+'" viewBox="'+box+'" fill="none"><image data-painted-material="'+item.id+'" href="'+source+'" width="720" height="1280"/></svg>';
  }
  function itemSvg(item, thumbnail = false, nativeOnly = false) {
    const fit=!nativeOnly&&globalThis.MuseCapsule?.[item.id];
    if(fit){
      const key='paint-'+item.id+'-'+thumbnail;
      if(!itemCache.has(key))itemCache.set(key,paintedItem(item,fit,thumbnail));
      return itemCache.get(key);
    }
    const render = { hair, top, bottom, dress, shoes, accessory }[item.category];
    let box=item.bounds;
    if(item.category==='hair')box=[230,85,270,210];
    if(item.category==='top')box=[148,267,424,375];
    if(item.category==='bottom')box=[170,493,380,item.shape==='shorts'?240:item.shape==='pleats'?295:690];
    if(item.category==='dress')box=[147,266,426,975];
    if(item.category==='shoes')box=item.shape==='boot'?[238,930,244,344]:[250,1133,220,147];
    if(item.category==='accessory') box = ['necklace','pendant'].includes(item.shape)?[300,326,120,130]:item.shape==='glasses'?[270,206,180,80]:['clip','pin'].includes(item.shape)?[366,113,110,133]:item.shape==='earrings'?[255,240,210,80]:item.shape==='scarf'?[290,325,140,240]:item.shape==='watch'?[448,687,58,68]:item.shape==='fan'?[417,582,140,225]:[422,762,140,213];
    if(item.category==='accessory'&&item.shape==='crossbody')box=[280,350,260,480];
    const embedded = globalThis.MuseAssets?.[item.img];
    if (embedded) return thumbnail ? embedded.replace(/width="720"/,`width="${box[2]}"`).replace(/height="1280"/,`height="${box[3]}"`).replace(/viewBox="0 0 720 1280"/,`viewBox="${box.join(' ')}"`) : embedded;
    const key=JSON.stringify([item,thumbnail]);
    if(itemCache.has(key))return itemCache.get(key);
    let drawing=render(item);
    if(['top','bottom','dress'].includes(item.category))drawing=clothVolume(drawing,item);

    if(item.category==='hair')drawing='<defs><filter id="hair-contact" x="-.15" y="-.1" width="1.3" height="1.2"><feDropShadow dx="2" dy="4" stdDeviation="2.8" flood-color="#492936" flood-opacity=".24"/></filter></defs><g filter="url(#hair-contact)">'+drawing+'</g>';
    const source=svg(drawing,thumbnail?box.join(' '):undefined,item.category==='hair'?'hair':'fabric');
    itemCache.set(key,source);return source;
  }
  const uri = value => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value);
  const contents = value => value.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  const handheld = item => item.category==='accessory' && ['bag','tote','fan'].includes(item.shape);
  function fittedItemSvg(item, nativeOnly=false) {
    if(!nativeOnly&&globalThis.MuseCapsule?.[item.id])return itemSvg(item);
    const raw=contents(itemSvg(item,false,nativeOnly));
    if(['top','bottom','dress','shoes'].includes(item.category))return svg(raw);
    const fitted=rigPart(item)==='head'?`<g transform="translate(-28.8 -65) scale(1.08 1)">${raw}</g>`:contourMarkup(raw);
    return svg(fitted);
  }
  function characterSource(character) {
    return globalThis.MuseAssets?.[character.asset]||character.asset;
  }
  function avatarSvg(character,items=[],namespace='export') {
    if(!character?.asset)throw Error('A valid painted character is required');
    const base=`<image data-character-art="${character.id}" href="${characterSource(character)}" x="-66.667" y="0" width="853.333" height="1280"/>`;
    const layers=[['base',base]];
    let held=0;
    // Footwear sits beneath garment hems, so boots cannot paint over a long skirt.
    const order=item=>item.category==='shoes'?15:item.z;
    for(const item of [...items].sort((a,b)=>order(a)-order(b))){
      let art=contents(fittedItemSvg(item));
      if(handheld(item)){
        const left=held++>0;
        art=`<g data-held-hand="${left?'left':'right'}"${left?' transform="translate(720 0) scale(-1 1)"':''}>${art}</g>`;
      }
      layers.push([item.id,art]);
    }
    // Redraw the actual painted fingertips over handles, never invented vector hands.
    if(held){
      const clips=[['right',506,646,75,91],...(held>1?[['left',139,646,75,91]]:[])];
      for(const [hand,x,y,w,h] of clips)layers.push(['hand-'+hand,`<defs><clipPath id="grip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath></defs><g clip-path="url(#grip)">${base}</g>`]);
    }
    const scene=layers.map(([id,source])=>{
      const prefix=namespace+'-'+id+'-';
      return `<g data-layer="${id}">${source.replace(/\bid="([^"]+)"/g,(_,v)=>`id="${prefix+v}"`).replace(/url\(#([^)]+)\)/g,(_,v)=>`url(#${prefix+v})`).replace(/href="#([^"]+)"/g,(_,v)=>`href="#${prefix+v}"`)}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" data-scene="${namespace}" data-character="${character.id}" width="720" height="1280" viewBox="0 0 720 1280" fill="none">${scene}</svg>`;
  }
  return {svg,itemSvg,fittedItemSvg,avatarSvg,characterSource,uri,flower,handheld,rigPoint};
});
