import '../../../js/feedback-attachments.js';
import '../../../js/feedback-upload-ui.js';
import '../../../js/feedback-client.js';
import '../../../css/feedback.css';
import release from '../release.json';

const automated=new URLSearchParams(location.search).get('qa')==='1';
const participant='S-'+crypto.randomUUID().slice(0,8);
const startedAt=new Date().toISOString(),events=[];
export function recordAction(action,data={}) {
  events.push({at:new Date().toISOString(),action,...data});
  if(events.length>200)events.shift();
}
recordAction('session-open',{viewport:{width:innerWidth,height:innerHeight},reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
const rating=(name,label)=>`<label>${label}<select name="${name}" required><option value="">Choose one</option><option value="1">1 — Not at all</option><option value="2">2 — A little</option><option value="3">3 — Somewhat</option><option value="4">4 — Mostly</option><option value="5">5 — Very much</option></select></label>`;
export function openFeedback() {
  const dialog=document.querySelector('#feedback');
  if(!dialog.querySelector('form')) {
    dialog.innerHTML=`<div class="feedback-heading"><div><p class="eyebrow">STYLE STORIES · ${release.version}</p><h2 id="feedback-title">Help shape the next look.</h2></div><button id="close-feedback" aria-label="Close feedback">×</button></div>
      <form class="feedback-form">
      ${rating('clarity','I knew what to do next')}
      ${rating('readability','I could see the character and clothing details')}
      ${rating('visuals','The outfits fit the character naturally')}
      ${rating('enjoyment','I enjoyed making different looks')}
      <label>Would you play another theme?<select name="continue" required><option value="">Choose one</option><option>Yes</option><option>Maybe</option><option>No</option></select></label>
      <label>What felt awkward or did not work?<textarea name="friction" maxlength="2000" placeholder="Optional. Please leave out personal information."></textarea></label>
      <label>What would you keep?<textarea name="favorite" maxlength="2000"></textarea></label>
      <button class="primary" type="submit">Download my feedback</button></form>`;
    globalThis.MuseFeedback.mount(dialog.querySelector('form'),{
      storageKey:'muse-style-room-feedback-'+release.version,automated,
      getRecord:answers=>({version:release.version,source:automated?'automated-check':'participant-session',participant,
        startedAt,exportedAt:new Date().toISOString(),feedback:answers,events:[...events]})
    });
    document.querySelector('#close-feedback').addEventListener('click',()=>dialog.close());
  }
  dialog.showModal();
}
