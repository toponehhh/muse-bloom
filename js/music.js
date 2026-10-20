(function(root){
  'use strict';
  // An original, quiet 16-beat phrase. Render once; Web Audio loops the buffer.
  const beat=.75,beats=16,duration=beat*beats;
  const melody=[72,76,79,76,71,74,76,74,69,72,76,72,67,71,74,71];
  const bass=[48,45,41,43];
  function synthesize(ctx,start=0,destination=ctx.destination){
    function note(midi,at,length,peak,type){
      const tone=ctx.createOscillator(),gain=ctx.createGain();
      tone.type=type;tone.frequency.value=440*Math.pow(2,(midi-69)/12);
      gain.gain.setValueAtTime(0,at);
      gain.gain.linearRampToValueAtTime(peak,at+.035);
      gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      gain.gain.setValueAtTime(0,at+length+.01);
      tone.connect(gain);gain.connect(destination);
      tone.start(at);tone.stop(at+length+.02);
      tone.onended=()=>{tone.disconnect();gain.disconnect();};
    }
    melody.forEach((pitch,index)=>{
      note(pitch,start+index*beat,1.25,index%2?.018:.026,'sine');
      if(index%2===0)note(bass[Math.floor(index/4)],start+index*beat,1.65,.022,'triangle');
    });
  }
  async function render(rate=44100){
    const Offline=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    if(!Offline)throw new Error('Offline audio is unavailable');
    const frames=Math.round(duration*rate),context=new Offline(1,frames+Math.ceil(2*rate),rate);
    synthesize(context);
    const audio=await context.startRendering(),input=audio.getChannelData(0);
    const buffer=context.createBuffer(1,frames,rate),output=buffer.getChannelData(0);
    output.set(input.subarray(0,frames));
    // Carry the previous phrase's decay into the opening instead of cutting it.
    for(let n=frames;n<input.length;n++)output[n-frames]+=input[n];
    return buffer;
  }
  let context,destination,source,bufferPromise,enabled=false,active=false,muted=false,generation=0,pending=-1;
  const wanted=()=>enabled&&active&&!muted&&!document.hidden;
  function pause(){
    generation++;pending=-1;
    if(source){try{source.stop();}catch{}source.disconnect();source=null;}
  }
  function update(){
    if(!wanted()||context?.state!=='running'){pause();return;}
    if(source||pending===generation)return;
    const ticket=generation;pending=ticket;
    bufferPromise??=render(context.sampleRate);
    bufferPromise.then(buffer=>{
      if(ticket!==generation||!wanted()||context.state!=='running'||source)return;
      source=context.createBufferSource();source.buffer=buffer;source.loop=true;
      source.connect(destination);source.start();
    }).catch(()=>{if(ticket===generation)pending=-1;bufferPromise=null;});
  }
  function attach(ctx,target){
    if(context!==ctx){pause();context=ctx;destination=target;bufferPromise=null;}
    update();
  }
  root.MuseMusic={
    render,synthesize,attach,pause,wanted,
    setEnabled(value){enabled=!!value;update();},
    setActive(value){active=!!value;update();},
    setMuted(value){muted=!!value;update();}
  };
})(globalThis);
