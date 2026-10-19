(function(root){
  'use strict';
  // A source describes the form, not whether a real person played. Legacy data
  // stays unverified until an organizer checks it; a rating is not proof.
  function classify(record) {
    if(record.source==='automated-check'||record.testType==='automated')return {type:'automated',reason:'automation-marked'};
    const notes=['friction','favorite','observerNotes'].map(key=>record.feedback?.[key]||'').join('\n');
    const disclosure=/(?:AI\s*(?:驱动的?\s*)?模拟(?:试玩|测试)?|非真人|不是(?:真实|真人)玩家|不是真实玩家|(?:AI[- ](?:driven|simulated)|automated|synthetic)\s+(?:playtest|form test|test|feedback|session)|not (?:a |real )?(?:human|participant)(?: response| feedback| data)?)/i;
    if(disclosure.test(notes))return {type:'unverified',reason:'simulation-disclosure'};
    if(record.testType==='human')return {type:'human',reason:'human-declared'};
    return {type:'unverified',reason:'type-not-confirmed'};
  }
  const api={classify};
  root.MuseFeedbackKind=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
