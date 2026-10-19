(function(root){
  'use strict';
  // Only the Cloudflare build opts in. Offline and GitHub Pages builds never probe an API.
  const online = /^https?:$/.test(root.location.protocol) && document.querySelector('meta[name="muse-feedback-endpoint"]')?.content === '/api/feedback';
  const copy = {
    en: {send:'Submit feedback',download:'Download my feedback',backup:'Download a backup',sending:'Submitting…',retry:'Retry submission',consent:'I agree to send my anonymous answers and playtest actions to the Muse Bloom team.',privacy:'No name or email is needed. Please leave personal information out of your answers. Nothing is uploaded until you submit.',offline:'Download your answers and playtest actions as JSON, then share the file with the organizer if you wish.',draft:'Draft restored on this device.',success:'Feedback received. Receipt: ',saved:'Your feedback file was prepared. Please check your downloads.',failed:'Submission was not confirmed. Your answers are still here. Retry or download a backup.',limited:'Too many submissions. Wait one minute, then retry.',invalid:'Please check your answers or download a backup for the organizer.',agree:'Please tick the consent box before submitting.',noStorage:'This browser cannot save a draft. Keep this page open or download a backup.'},
    zh: {send:'在线提交反馈',download:'下载这份反馈 JSON',backup:'下载备份 JSON',sending:'正在提交…',retry:'重试提交',consent:'我同意将匿名反馈和本轮试玩操作记录提交给 Muse Bloom 项目组织者。',privacy:'无需填写姓名或邮箱，请勿在文字中包含个人信息。只有点击提交才会上传。',offline:'此版本将反馈下载为 JSON 文件，你可以自愿把文件交给组织者。',draft:'已恢复保存在本机的草稿。',success:'反馈已收到。回执编号：',saved:'已生成反馈文件，请检查浏览器下载。',failed:'尚未确认提交成功，填写内容已保留。请重试或下载备份。',limited:'提交过于频繁，请等待一分钟后重试。',invalid:'请检查答案，或下载备份交给组织者。',agree:'请先勾选同意提交匿名反馈。',noStorage:'浏览器无法保存草稿，请保持本页打开或下载备份。'}
  };
  const values = form => Object.fromEntries([...new FormData(form)].filter(([key]) => key !== 'consent'));
  function download(record) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='Muse-Bloom-'+record.participant+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function mount(form,{storageKey,getRecord,language='en',initial={}}) {
    if(!form||form.dataset.feedbackMounted)return;
    form.dataset.feedbackMounted='true';
    const t=copy[language],submit=form.querySelector('[type="submit"]');
    let state={values:initial},busy=false,canStore=true;
    try { const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved.values==='object'&&saved.values)state=saved; } catch{}
    for(const [key,value] of Object.entries(state.values)) {
      const field=form.elements.namedItem(key);
      if(key!=='consent'&&field&&typeof value==='string')field.value=value.slice(0,2000);
    }
    submit.textContent=online?t.send:t.download;
    const note=document.createElement('p');note.className='form-note note';note.textContent=online?t.privacy:t.offline;
    form.insertBefore(note,submit);
    let consent;
    if(online) {
      const label=document.createElement('label');label.className='feedback-consent';
      consent=document.createElement('input');consent.type='checkbox';consent.name='consent';
      const words=document.createElement('span');words.textContent=t.consent;label.append(consent,words);form.insertBefore(label,submit);
      const backup=document.createElement('button');backup.type='button';backup.className='button secondary feedback-backup';backup.textContent=t.backup;
      backup.addEventListener('click',()=>{if(form.reportValidity())exportFile();});submit.after(backup);
    }
    const status=document.createElement('p');status.className='form-note note feedback-status';status.id='feedback-confirmation';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.append(status);
    const say=(message,kind='')=>{status.textContent=message;status.dataset.state=kind;};
    const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{canStore=false;}};
    form.addEventListener('input',()=>{state.values=values(form);persist();say(canStore?'':t.noStorage);});
    function exportFile(){state.values=values(form);persist();download(getRecord(state.values));say(t.saved,'downloaded');}
    if(state.receipt?.receipt) say(t.success+state.receipt.receipt,'success');
    else if(Object.keys(state.values).length) say(t.draft,'draft');
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy||!form.reportValidity())return;
      if(!online){exportFile();return;}
      if(!consent.checked){say(t.agree,'error');consent.focus();return;}
      const current=values(form),signature=JSON.stringify(current);
      if(!state.submission||state.signature!==signature){
        state={values:current,signature,submission:{schemaVersion:1,submissionId:crypto.randomUUID(),consent:true,record:getRecord(current)}};
        persist();
      }
      if(state.receipt){say(t.success+state.receipt.receipt,'success');return;}
      busy=true;form.setAttribute('aria-busy','true');
      const controls=[...form.elements].map(element=>[element,element.disabled]);controls.forEach(([el])=>{el.disabled=true;});
      submit.textContent=t.sending;say(t.sending,'pending');
      const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),12000);
      try {
        const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(state.submission),signal:abort.signal});
        if(!response.ok){const error=new Error('Submission failed');error.status=response.status;throw error;}
        const receipt=await response.json();
        if(receipt.ok!==true||receipt.receipt!==state.submission.submissionId||!Number.isFinite(Date.parse(receipt.receivedAt)))throw new Error('Invalid receipt');
        state.receipt=receipt;persist();say(t.success+receipt.receipt,'success');
      }catch(error){say(error.status===429?t.limited:([400,409,413,415].includes(error.status)?t.invalid:t.failed),'error');}
      finally {clearTimeout(timer);busy=false;form.removeAttribute('aria-busy');controls.forEach(([el,disabled])=>{el.disabled=disabled;});submit.textContent=state.receipt?t.send:t.retry;}
    });
  }
  root.MuseFeedback={online,mount,download};
})(globalThis);
