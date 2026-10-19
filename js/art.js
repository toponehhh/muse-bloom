(function (root, factory) {
  const art = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  else root.MuseArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Painted characters share one fitted clothing coordinate system.
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
      result=p(`M306 600 Q360 609 413 600 Q430 656 426 721 L${flare?446:419} ${end} L${flare?362:372} ${end} L361 ${shorts?779:794} L${flare?350:348} ${end} L${flare?274:302} ${end} L294 724 Q291 658 306 600Z`,c)+p('M305 599 L416 599 L420 632 L301 632Z',c)+line(`M361 634 L361 ${shorts?779:794} M307 639 Q317 671 339 668 M410 639 Q402 671 381 668 M315 ${end-15} L341 ${end-15} M380 ${end-15} L413 ${end-15}`);
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
    if(item.category==='hair')box=[230,85,270,210];
    if(item.category==='shoes'&&item.shape==='boot')box=[255,995,210,225];
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
  function fittedItemSvg(item) {
    const raw=contents(itemSvg(item));
    const fitted=rigPart(item)==='head'?`<g transform="translate(-28.8 -65) scale(1.08 1)">${raw}</g>`:contourMarkup(raw);
    return svg(item.category==='shoes'?`<g transform="translate(0 20)">${fitted}</g>`:fitted);
  }
  function characterSource(character) {
    return globalThis.MuseAssets?.[character.asset]||character.asset;
  }
  function avatarSvg(character,items=[],namespace='export') {
    if(!character?.asset)throw Error('A valid painted character is required');
    const base=`<image data-character-art="${character.id}" href="${characterSource(character)}" x="-66.667" y="0" width="853.333" height="1280"/>`;
    const layers=[['base',base]];
    let held=0;
    for(const item of [...items].sort((a,b)=>a.z-b.z)){
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
      return `<g data-layer="${id}">${source.replace(/\bid="([^"]+)"/g,(_,v)=>`id="${prefix+v}"`).replace(/url\(#([^)]+)\)/g,(_,v)=>`url(#${prefix+v})`)}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" data-scene="${namespace}" data-character="${character.id}" width="720" height="1280" viewBox="0 0 720 1280" fill="none">${scene}</svg>`;
  }
  return {svg,itemSvg,fittedItemSvg,avatarSvg,characterSource,uri,flower,handheld,rigPoint};
});
