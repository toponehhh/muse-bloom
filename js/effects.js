(function(root){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),active=new Set(),temporary=new Set();
  const allowed=()=>!reduced.matches&&!document.hidden;
  function animate(node,frames,options){
    if(!node||!allowed())return;
    const animation=node.animate(frames,{duration:420,easing:'cubic-bezier(.2,.7,.2,1)',...options});active.add(animation);
    animation.finished.catch(()=>{}).finally(()=>active.delete(animation));return animation;
  }
  function reset(){for(const animation of active)animation.cancel();active.clear();for(const node of temporary)node.remove();temporary.clear();}
  function enter(){reset();animate(document.querySelector('main'),[{opacity:.5},{opacity:1}],{duration:220});}
  function equip(){
    reset();if(!allowed())return;
    // The complete composite moves together, so clothes and hands stay aligned.
    animate(document.querySelector('#avatar-slot .avatar'),[{scale:'1'},{scale:'1.022',offset:.42},{scale:'1'}],{duration:380});
    const stage=document.querySelector('.fitting-stage');if(!stage)return;
    const burst=document.createElement('div');burst.className='dress-sparkles';burst.setAttribute('aria-hidden','true');stage.append(burst);temporary.add(burst);
    for(let i=0;i<8;i++){
      const star=document.createElement('span');star.textContent=i%2?'✧':'✦';star.style.cssText=`left:${32+(i*17)%40}%;top:${21+(i*19)%54}%;--spark:${i%2?'#fff6bd':'#ff83b1'}`;burst.append(star);
      animate(star,[{opacity:0,transform:'translateY(8px) scale(.3)'},{opacity:1,transform:'translateY(0) scale(1)',offset:.3},{opacity:0,transform:'translateY(-20px) scale(.55)'}],{duration:640,delay:i*25});
    }
    const last=[...active].at(-1);last?.finished.catch(()=>{}).finally(()=>{burst.remove();temporary.delete(burst);});
  }
  function reveal(){
    document.querySelectorAll('.rating-star.earned').forEach((node,i)=>animate(node,[{opacity:0,scale:'.2',rotate:'-20deg'},{opacity:1,scale:'1.2',rotate:'8deg',offset:.65},{opacity:1,scale:'1',rotate:'0deg'}],{duration:500,delay:180+i*160}));
    document.querySelectorAll('.reward-items>div').forEach((node,i)=>animate(node,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:400,delay:450+i*70}));
  }
  function shutter(){animate(document.querySelector('.result-stage,.saved-look-portrait'),[{filter:'brightness(1)'},{filter:'brightness(1.15)',offset:.35},{filter:'brightness(1)'}],{duration:300});}
  reduced.addEventListener('change',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  root.MuseFX={enter,equip,reveal,shutter,reset};
})(globalThis);
