(function(root){
  'use strict';
  // Original synthesized effects. QA renders this same graph to actual PCM.
  const melodies={click:[880],tab:[740,988],equip:[784,1175,1568],goal:[659,988,1319],unequip:[660,440],clear:[523,392],shutter:[1047],rankS:[523,659,784,1047,1319],rankLow:[523,659,784],unlock:[784,988,1175,1568]};
  function synthesize(ctx,name,start=ctx.currentTime,destination=ctx.destination){
    name=Object.hasOwn(melodies,name)?name:'click';const voices=[];
    function voice(source,peak,duration,offset=0,filter=null){
      const gain=ctx.createGain(),at=start+offset;
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(peak,at+.006);
      gain.gain.exponentialRampToValueAtTime(.0001,at+duration);gain.gain.setValueAtTime(0,at+duration+.01);
      source.connect(filter||gain);if(filter)filter.connect(gain);gain.connect(destination);
      const entry={stop(){try{source.stop();}catch{}source.disconnect();gain.disconnect();filter?.disconnect();}};
      source.onended=()=>{entry.stop();entry.onended?.();};source.start(at);source.stop(at+duration+.02);voices.push(entry);
    }
    const short=['click','tab'].includes(name),step=short?.045:.095;
    melodies[name].forEach((frequency,i)=>{
      for(const [multiple,level] of [[1,.10],[2.003,.023]]){
        const tone=ctx.createOscillator();tone.type='sine';tone.frequency.setValueAtTime(frequency*multiple,start+i*step);
        if(short)tone.frequency.exponentialRampToValueAtTime(frequency*.8*multiple,start+i*step+.08);
        voice(tone,level,short?.10:name==='shutter'?.045:.34,i*step);
      }
    });
    if(['equip','unequip','clear','shutter'].includes(name)){
      const duration=name==='shutter'?.10:.19,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
      let seed=713;for(let n=0;n<data.length;n++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[n]=(seed/4294967296)*2-1;}
      const noise=ctx.createBufferSource();noise.buffer=buffer;
      const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=name==='shutter'?2400:1250;filter.Q.value=.7;
      voice(noise,name==='shutter'?.25:.12,duration,0,filter);
    }
    return voices;
  }
  let context,master,muted=false,epoch=0;const active=new Set();
  async function resume(){
    if(muted||document.hidden)return false;
    try{
      if(!context){const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return false;context=new Audio();master=context.createGain();master.gain.value=.7;master.connect(context.destination);}
      if(context.state!=='running')await context.resume();
      if(context.state==='running')root.MuseMusic?.attach(context,master);
      return context.state==='running';
    }catch{return false;}
  }
  function stopEffects(){epoch++;for(const voice of active)voice.stop();active.clear();}
  function stop(){stopEffects();root.MuseMusic?.pause();}
  async function play(name){
    const ticket=epoch;
    if(!await resume()||ticket!==epoch||muted||document.hidden)return false;
    // Bound rapid taps, including notes scheduled in reward arpeggios.
    if(active.size>32)stopEffects();
    for(const voice of synthesize(context,name,context.currentTime+.005,master)){active.add(voice);voice.onended=()=>active.delete(voice);}
    return true;
  }
  function setMuted(value){
    muted=!!value;root.MuseMusic?.setMuted(muted);
    if(muted){stop();context?.suspend().catch(()=>{});}
    else if(context&&root.MuseMusic?.wanted())resume();
  }
  function setMusic(value){root.MuseMusic?.setEnabled(value);if(value&&context&&!muted)resume();}
  function setScene(screen){
    root.MuseMusic?.setActive(['dressing','reveal','result'].includes(screen));
    if(context&&root.MuseMusic?.wanted())resume();
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){stop();context?.suspend().catch(()=>{});}
    else if(context&&root.MuseMusic?.wanted())resume();
  });
  document.addEventListener('pointerdown',resume,{passive:true});document.addEventListener('keydown',resume);
  root.MuseAudio={play,setMuted,setMusic,setScene,resume,synthesize};
})(globalThis);
