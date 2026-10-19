'use strict';
const fs=require('node:fs'),path=require('node:path');
const directory=path.resolve(process.argv[2]||'playtest-responses');
if(!fs.existsSync(directory)){console.error('Provide an existing folder containing exported participant JSON files.');process.exitCode=1;}
else{
 const participants=new Map(),excluded=[],errors=[];
 for(const name of fs.readdirSync(directory).filter(n=>n.endsWith('.json'))){
   try{
     const r=JSON.parse(fs.readFileSync(path.join(directory,name),'utf8'));
     if(r.version!=='1.7.0'||!['participant-session','manual-feedback'].includes(r.source)||!r.participant){excluded.push(name);continue;}
     const existing=participants.get(r.participant);
     if(!existing)participants.set(r.participant,r);
     else{
       const newer=String(r.exportedAt||'')>String(existing.exportedAt||'')?r:existing;
       const older=newer===r?existing:r;
       // A later observer form supplements the session instead of erasing its
       // action history. Newer answers win, missing answers stay missing.
       participants.set(r.participant,{...older,...newer,
         feedback:{...(older.feedback||{}),...(newer.feedback||{})},
         events:newer.events?.length?newer.events:older.events||[]});
     }
   }catch(e){errors.push({file:name,message:e.message});}
 }
 const list=[...participants.values()];
 const ratings={};
 for(const key of ['clarity','readability','visuals','enjoyment']){
   const values=list.map(r=>Number(r.feedback?.[key])).filter(n=>Number.isInteger(n)&&n>=1&&n<=5);
   ratings[key]={answered:values.length,mean:values.length?+(values.reduce((a,b)=>a+b,0)/values.length).toFixed(2):null};
 }
 const summaries=list.map(r=>{
   const events=Array.isArray(r.events)?r.events:[],start=events.find(e=>e.action==='screen'&&e.screen==='dressing'),first=events.find(e=>e.action==='look-complete'&&e.level===1&&e.score>=35);
   const seconds=start&&first?(Date.parse(first.at)-Date.parse(start.at))/1000:null;
   return {participant:r.participant,source:r.source,completedLevels:[...new Set(events.filter(e=>e.action==='look-complete'&&e.score>=35).map(e=>e.level))],
     firstLookWallSeconds:Number.isFinite(seconds)?seconds:null,blockedReveals:events.filter(e=>e.action==='reveal-blocked').length,feedback:r.feedback||null};
 });
 const report={version:'1.7.0',status:list.length?'participant_feedback_collected':'awaiting_participants',participants:list.length,ratings,
   wouldContinue:Object.fromEntries(['Yes','Maybe','No'].map(v=>[v,list.filter(r=>r.feedback?.continue===v).length])),
   notes:['Participant IDs are deduplicated; newer answers win and observer forms preserve the session event history. Automated checks are excluded.','First-look wall time can include pauses; it is not an active-playtime or retention metric.'],excluded,errors,summaries};
 const destination=path.join(directory,'playtest-summary.json');fs.writeFileSync(destination,JSON.stringify(report,null,2));
 console.log(JSON.stringify({report:destination,status:report.status,participants:report.participants,ratings,excluded:excluded.length,errors:errors.length},null,2));
 if(errors.length)process.exitCode=1;
}
