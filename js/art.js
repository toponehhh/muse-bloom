(function (root, factory) {
  const art = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = art;
  else root.MuseArt = art;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  // Shared rig, original vector materials, and deterministic exportable lighting.
  const ink = '#645061';
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
      ?`<radialGradient id="${id}" cx="35%" cy="28%" r="78%"><stop stop-color="${tint(color,.21)}"/><stop offset=".5" stop-color="${color}"/><stop offset="1" stop-color="${tint(color,-.25)}"/></radialGradient>`
      :`<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".35"><stop stop-color="${tint(color,-.2)}"/><stop offset=".22" stop-color="${tint(color,material==='hair'?.3:.23)}"/><stop offset=".42" stop-color="${tint(color,.1)}"/><stop offset=".7" stop-color="${color}"/><stop offset="1" stop-color="${tint(color,-.28)}"/></linearGradient>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${box.split(' ')[2]}" height="${box.split(' ')[3]}" viewBox="${box}" fill="none"><defs>${defs}</defs><g stroke="${ink}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${painted}</g></svg>`;
  }
  const p = (d, fill, attrs = '') => `<path d="${d}" fill="${fill}" ${attrs}/>`;
  const line = (d, opacity = .35) => `<path d="${d}" stroke="${ink}" opacity="${opacity}"/>`;
  const circle = (x, y, r, fill, attrs = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${attrs}/>`;
  const rect = (x,y,w,h,r,fill,attrs='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${attrs}/>`;
  function flower(x, y, size = 12, color = '#f3d9c0') {
    return `<g transform="translate(${x} ${y})" stroke-width="1.6">${[0,72,144,216,288].map(a => `<ellipse cx="0" cy="-${size*.58}" rx="${size*.38}" ry="${size*.62}" fill="${color}" transform="rotate(${a})"/>`).join('')}${circle(0,0,size*.23,'#d7ac65')}</g>`;
  }
  function embroidery(points, color = '#f0d7b1') { return points.map(([x,y]) => flower(x,y,10,color)).join(''); }
  const hairCap = color => p('M278 231 Q254 168 286 129 Q312 92 369 103 Q429 99 448 148 Q466 183 439 232 L423 192 Q385 199 356 164 Q333 204 294 207 L286 235Z',color);
  const basic = (slot, content) => `<g data-basic="${slot}">${content}</g>`;
  function hideBasics(source, covered) {
    // Custom base SVGs keep these groups so fitted clothes can replace basics.
    return source.replace(/data-basic="(hair|top|bottom)"/g,(attribute,slot)=>attribute+(covered.includes(slot)?' display="none"':''));
  }
  function body(skin, covered = []) {
    const embedded = globalThis.MuseAssets?.[`assets/base/${skin.id}.svg`];
    if (embedded) return hideBasics(embedded,covered);
    const c = skin.color, sh = skin.shade;
    return hideBasics(svg(
      '<defs><filter id="skin-soft" x="-.15" y="-.15" width="1.3" height="1.3"><feGaussianBlur stdDeviation="5"/></filter><filter id="face-soft"><feGaussianBlur stdDeviation="2.5"/></filter></defs>'+
      p('M307 654 Q282 707 298 828 L312 985 L310 1139 Q293 1159 288 1174 Q287 1187 307 1187 L348 1184 Q359 1180 351 1163 L353 994 L360 793 L367 995 L372 1160 Q368 1182 386 1185 L428 1186 Q442 1178 431 1168 L409 1143 L421 989 L426 829 Q443 712 414 655Z',c)+
      p('M316 300 L314 344 Q285 354 277 370 Q263 388 255 439 L237 573 L225 717 Q208 762 221 791 Q227 804 235 789 L237 760 Q242 804 253 794 Q263 784 259 762 L257 721 L278 590 L307 467 L310 567 L299 646 Q305 683 360 684 Q414 683 421 646 L410 566 L414 468 L442 592 L465 724 Q459 768 465 788 Q475 805 481 789 L483 762 Q490 809 501 791 Q511 769 495 719 L482 577 L466 437 Q455 377 443 366 Q430 353 406 344 L404 300Z',c)+
      p('M316 302 Q357 329 404 302 L403 333 Q358 354 315 333Z',sh,'stroke="none"')+
      // Round limbs with broad edge shadows and narrow bounced-light ribbons.
      p('M307 708 Q302 774 313 841 L324 970 L322 1129 M389 811 L389 989 L389 1133 M282 392 Q267 476 254 581 L241 716 M448 402 L467 573 L482 717','none','stroke="#fff5e8" stroke-width="18" opacity=".24" filter="url(#skin-soft)"')+
      p('M345 792 L337 984 L339 1140 M410 798 L407 978 L400 1137 M298 463 L271 590 L251 724 M465 476 L477 577 L490 715','none',`stroke="${sh}" stroke-width="12" opacity=".32" filter="url(#skin-soft)"`)+
      `<ellipse cx="283" cy="239" rx="13" ry="22" fill="${c}"/><ellipse cx="437" cy="239" rx="13" ry="22" fill="${c}"/>`+
      p('M282 202 Q282 125 360 127 Q438 125 439 202 L433 264 Q419 311 361 328 Q307 310 287 264Z',c)+
      p('M285 202 Q350 173 435 207 L433 221 Q357 187 287 219Z',sh,'stroke="none" opacity=".35"')+
      p('M296 240 Q293 276 327 295 Q314 277 315 250Z',sh,'stroke="none" opacity=".22"')+
      p('M373 308 Q411 295 424 264 Q420 300 361 320Z',sh,'stroke="none" opacity=".38"')+
      p('M316 261 Q326 269 337 261 M389 261 Q400 268 409 260 M354 270 L360 272','none','stroke="#fff3e4" stroke-width="6" opacity=".25" filter="url(#face-soft)"')+
      basic('top',p('M321 349 L332 354 L329 391 Q360 408 391 391 L388 354 L399 349 L410 406 L405 482 L411 606 Q360 621 309 606 L315 482 L310 406Z','#c9b1b7')+line('M318 581 Q360 593 402 581',.22)+flower(360,443,13,'#ead5cf'))+
      basic('bottom',p('M306 600 Q360 612 414 600 Q429 660 426 726 L373 734 L360 686 L347 734 L294 726 Q291 660 306 600Z','#aebda3')+p('M306 600 Q360 612 414 600 L417 624 Q360 635 303 624Z','#c2cbb8')+line('M360 629 L360 683 M304 714 L341 721 M379 721 L416 714',.3))+
      line('M315 975 Q329 980 344 977 M379 976 Q395 981 410 974 M244 570 L251 569 M471 570 L477 574',.2)+
      `<ellipse cx="317" cy="259" rx="17" ry="8" fill="#db9287" stroke="none" opacity=".42"/><ellipse cx="405" cy="259" rx="17" ry="8" fill="#db9287" stroke="none" opacity=".42"/>`+
      p('M306 223 Q325 209 343 223 M378 223 Q396 209 413 222','none','stroke-width="4"')+
      p('M307 238 Q326 227 343 238 M378 238 Q395 228 412 237','none','stroke-width="4"')+
      `<ellipse cx="328" cy="240" rx="6" ry="9" fill="#3c302d" stroke="none"/><ellipse cx="395" cy="240" rx="6" ry="9" fill="#3c302d" stroke="none"/>`+
      circle(330,237,1.7,'#fff','stroke="none"')+circle(397,237,1.7,'#fff','stroke="none"')+
      line('M358 243 L354 263 Q360 267 366 262',.45)+
      p('M343 282 Q359 292 378 280 Q361 304 343 282Z','#b65e62','stroke-width="2"')+
      line('M332 286 Q359 314 394 281',.12)+
      basic('hair',hairCap('#704c3b')+p('M284 173 Q295 127 339 124 M367 120 Q405 120 427 145','none','stroke="#d4ad8b" stroke-width="9" opacity=".2"')+line('M280 180 Q286 122 344 120 M365 119 Q418 115 437 160',.24))
    ,undefined,'skin'),covered);
  }
  function hair(item) {
    const c = item.color, shape = item.shape;
    const cap = hairCap(c);
    const highlights = p('M280 179 Q290 131 332 126 M367 120 Q407 119 431 152','none',`stroke="${tint(c,.58)}" stroke-width="10" opacity=".25"`)+p('M290 174 Q300 147 324 139 M378 131 Q407 135 421 151','none',`stroke="${tint(c,.65)}" stroke-width="3" opacity=".3"`)+line('M280 180 Q286 122 344 120 M365 119 Q418 115 437 160 M286 189 Q300 153 329 146',.24);
    if (shape === 'bun' || shape === 'pinbun') return circle(361,111,49,c)+cap+highlights+line('M335 91 Q368 66 392 106 M338 106 Q356 86 381 113',.35)+(shape==='pinbun' ? p('M302 115 L412 94','none','stroke="#c6aa6a" stroke-width="7"')+circle(415,93,9,'#91b29a')+p('M408 100 L417 142','none','stroke="#d8ba75"')+circle(417,145,5,'#d8ba75') : '');
    if (shape === 'bob') return p('M279 182 Q257 230 268 319 Q303 342 310 318 L293 210Z',c)+p('M428 181 Q461 240 449 319 Q417 339 413 316 L428 213Z',c)+cap+highlights+line('M279 233 L285 309 M438 232 L436 309',.25);
    if (shape === 'pony' || shape === 'ribbon') return p('M421 137 Q478 119 486 180 Q483 231 467 284 Q455 327 480 356 Q441 354 433 314 Q422 282 442 218 Q452 174 418 174Z',c)+cap+highlights+(shape==='ribbon' ? p('M439 153 Q475 116 485 138 Q482 165 444 163 Q470 196 461 204 L436 164 Q423 198 417 194 L426 163 Q401 162 403 143 Q416 128 439 153Z','#d7a2a8') : circle(439,154,9,'#d4ae7d'));
    if (shape === 'braids') return cap+highlights+[285,435].map(x => `<g>${Array.from({length:9},(_,i)=>`<ellipse cx="${x+(i%2?4:-4)}" cy="${244+i*17}" rx="15" ry="14" fill="${c}"/>`).join('')}${rect(x-12,385,25,10,3,'#c3ad80')}</g>`).join('');
    if (shape === 'curls') return p('M280 182 Q249 208 263 246 Q240 267 257 296 Q243 329 267 349 Q253 376 282 393 Q309 406 321 373 Q301 343 303 294 L293 215Z',c)+p('M431 182 Q467 212 451 246 Q476 273 458 298 Q480 326 456 350 Q469 385 440 394 Q413 404 405 373 Q421 338 417 291 L428 214Z',c)+cap+highlights+line('M275 251 Q289 266 272 280 M279 313 Q295 331 278 345 M446 250 Q430 271 446 280 M442 315 Q426 334 443 350',.4);
    return p('M282 181 Q249 225 266 271 Q275 305 258 339 Q245 379 283 408 Q313 420 321 391 Q289 375 307 337 Q318 306 300 270 L296 208Z',c)+p('M430 181 Q465 225 449 271 Q440 306 460 338 Q477 379 440 409 Q413 420 403 389 Q434 369 416 337 Q403 303 423 267 L426 211Z',c)+cap+highlights+line('M277 233 Q265 268 285 308 Q295 338 276 365 Q267 390 288 397 M442 234 Q453 265 435 307 Q426 338 443 364 Q454 386 436 399',.3);
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
  function itemSvg(item, thumbnail = false) {
    const render = { hair, top, bottom, dress, shoes, accessory }[item.category];
    let box=item.bounds;
    if(item.category==='shoes'&&item.shape==='boot')box=[255,995,210,225];
    if(item.category==='accessory') box = ['necklace','pendant'].includes(item.shape)?[300,326,120,130]:item.shape==='glasses'?[270,206,180,80]:['clip','pin'].includes(item.shape)?[366,113,110,133]:item.shape==='earrings'?[255,240,210,80]:item.shape==='scarf'?[290,325,140,240]:item.shape==='watch'?[448,687,58,68]:item.shape==='fan'?[417,582,140,225]:[422,762,140,213];
    if(item.category==='accessory'&&item.shape==='crossbody')box=[280,350,260,480];
    const embedded = globalThis.MuseAssets?.[item.img];
    if (embedded) return thumbnail ? embedded.replace(/width="720"/,`width="${box[2]}"`).replace(/height="1280"/,`height="${box[3]}"`).replace(/viewBox="0 0 720 1280"/,`viewBox="${box.join(' ')}"`) : embedded;
    return svg(render(item),thumbnail?box.join(' '):undefined,item.category==='hair'?'hair':'fabric');
  }
  const uri = value => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(value);
  const contents = value => value.replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
  const handheld = item => item.category==='accessory' && ['bag','tote','fan'].includes(item.shape);
  function grip(skin, left) {
    // Match each base hand contour; only the curled fingers cover the handle.
    const finger=left?'M226 773 Q234 767 243 773 L243 782 Q234 787 227 782Z':'M477 773 Q486 767 495 773 L495 782 Q486 787 478 782Z';
    return svg(p(finger,skin.color,'data-part="fingers"')+line(left?'M229 778 Q235 782 241 777':'M480 778 Q486 782 493 777',.26),undefined,'skin');
  }
  function avatarSvg(skin, items = [], namespace='export') {
    const covered=items.map(i=>i.category);
    if(covered.includes('dress'))covered.push('top','bottom');
    let held=0;
    const layers=[['base',body(skin,covered)],...[...items].sort((a,b)=>a.z-b.z).map(i=>{
      const source=itemSvg(i);
      if(!handheld(i))return [i.id,source];
      const left=held++>0;
      return [i.id,svg(`<g data-held-hand="${left?'left':'right'}"${left?' transform="translate(720 0) scale(-1 1)"':''}>${contents(source)}</g>`)];
    })];
    if(held)layers.push(['hand-right',grip(skin,false)]);
    if(held>1)layers.push(['hand-left',grip(skin,true)]);
    const scene=layers.map(([id,source])=>{
      const prefix=namespace+'-'+id+'-';
      return `<g data-layer="${id}">${contents(source).replace(/\bid="([^"]+)"/g,(_,value)=>`id="${prefix+value}"`).replace(/url\(#([^)]+)\)/g,(_,value)=>`url(#${prefix+value})`)}</g>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" data-scene="${namespace}" width="720" height="1280" viewBox="0 0 720 1280" fill="none">${scene}</svg>`;
  }
  return { svg, body, itemSvg, avatarSvg, uri, flower, handheld };
});
