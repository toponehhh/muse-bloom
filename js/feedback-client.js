(function(root){
  'use strict';
  // Only the Cloudflare build opts in. Offline and GitHub Pages builds never probe an API.
  const online = /^https?:$/.test(root.location.protocol) && document.querySelector('meta[name="muse-feedback-endpoint"]')?.content === '/api/feedback';
  const copy = {
    en: {send:'Submit feedback',download:'Download my feedback',backup:'Download a backup',sending:'Submitting…',retry:'Retry submission',consent:'I agree to send my anonymous answers and playtest actions to the Muse Bloom team.',privacy:'No name or email is needed. Please leave personal information out of your answers. Nothing is uploaded until you submit.',offline:'Download your answers and playtest actions as JSON, then share the file with the organizer if you wish.',draft:'Draft restored on this device.',success:'Feedback received. Receipt: ',saved:'Your feedback file was prepared. Please check your downloads.',failed:'Submission was not confirmed. Your answers are still here. Retry or download a backup.',limited:'Too many submissions. Wait one minute, then retry.',invalid:'Please check your answers or download a backup for the organizer.',agree:'Please tick the consent box before submitting.',noStorage:'This browser cannot save a draft. Keep this page open or download a backup.'},
    zh: {send:'在线提交反馈',download:'下载这份反馈 JSON',backup:'下载备份 JSON',sending:'正在提交…',retry:'重试提交',consent:'我同意将匿名反馈和本轮试玩操作记录提交给 Muse Bloom 项目组织者。',privacy:'无需填写姓名或邮箱，请勿在文字中包含个人信息。只有点击提交才会上传。',offline:'此版本将反馈下载为 JSON 文件，你可以自愿把文件交给组织者。',draft:'已恢复保存在本机的草稿。',success:'反馈已收到。回执编号：',saved:'已生成反馈文件，请检查浏览器下载。',failed:'尚未确认提交成功，填写内容已保留。请重试或下载备份。',limited:'提交过于频繁，请等待一分钟后重试。',invalid:'请检查答案，或下载备份交给组织者。',agree:'请先勾选同意提交匿名反馈。',noStorage:'浏览器无法保存草稿，请保持本页打开或下载备份。'}
  };
  const values = form => ({...Object.fromEntries([...new FormData(form)].filter(([key,value]) => key !== 'consent' && typeof value==='string')),testType:form.elements.testType.value});
  function download(record) {
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='Muse-Bloom-'+record.participant+'.json';a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function mount(form,{storageKey,getRecord,language='en',initial={},automated=false}) {
    if(!form||form.dataset.feedbackMounted)return;
    form.dataset.feedbackMounted='true';
    const t=copy[language],submit=form.querySelector('[type="submit"]');
    automated=automated||new URLSearchParams(root.location.search).get('qa')==='1';
    const kindLabel=document.createElement('label');
    kindLabel.textContent=language==='zh'?'这份反馈来自':'This feedback is from';
    const kind=document.createElement('select');kind.name='testType';kind.required=true;
    for(const [value,en,zh] of [['','Choose one','请选择'],['human','A real person playing','真人试玩'],['automated','AI simulation or automated testing','AI 模拟或自动化测试']]){
      kind.add(new Option(language==='zh'?zh:en,value));
    }
    kindLabel.append(kind);form.prepend(kindLabel);
    let state={values:initial},busy=false,canStore=true,reading=false,submissionAbort;
    try { const saved=JSON.parse(localStorage.getItem(storageKey)||'null');if(saved&&typeof saved.values==='object'&&saved.values)state=saved; } catch{}
    for(const [key,value] of Object.entries(state.values)) {
      const field=form.elements.namedItem(key);
      if(key!=='consent'&&field&&typeof value==='string')field.value=value.slice(0,2000);
    }
    if(automated){kind.value='automated';kind.disabled=true;}
    function makeRecord(answers){
      const raw=getRecord(answers),{testType,...feedback}=raw.feedback;
      const record={...raw,testType:raw.source==='automated-check'?'automated':answers.testType,feedback};
      if(record.testType==='automated')record.source='automated-check';
      return record;
    }
    submit.textContent=online?t.send:t.download;
    const note=document.createElement('p');note.className='form-note note';note.textContent=online?t.privacy:t.offline;
    form.insertBefore(note,submit);
    const say=(message,kind='')=>{status.textContent=message;status.dataset.state=kind;};
    const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{canStore=false;}};
    let consent,uploads,cancel;
    if(online) {
      uploads=root.MuseFeedbackUploads.mount(submit,{
        language,saved:state.attachmentDraft||[],
        onChange:files=>{state.attachmentDraft=files;state.values=values(form);persist();say(canStore?'':t.noStorage);},
        onReading:value=>{reading=value;submit.disabled=value;},
        onDispose:()=>submissionAbort?.abort()
      });
      const label=document.createElement('label');label.className='feedback-consent';
      consent=document.createElement('input');consent.type='checkbox';consent.name='consent';
      const words=document.createElement('span');words.textContent=t.consent+(language==='zh'?'包括我选择的截图或录屏。':' This includes my selected screenshots or recordings.');label.append(consent,words);form.insertBefore(label,submit);
      const backup=document.createElement('button');backup.type='button';backup.className='button secondary feedback-backup';backup.textContent=t.backup;
      backup.addEventListener('click',()=>{if(form.reportValidity())exportFile();});submit.after(backup);
      cancel=document.createElement('button');cancel.type='button';cancel.className='button secondary feedback-cancel';cancel.hidden=true;cancel.textContent=language==='zh'?'取消提交':'Cancel submission';cancel.addEventListener('click',()=>submissionAbort?.abort());backup.after(cancel);
    }
    const status=document.createElement('p');status.className='form-note note feedback-status';status.id='feedback-confirmation';status.setAttribute('role','status');status.setAttribute('aria-live','polite');form.append(status);
    if(form.closest('dialog')){
      // Scroll answers independently so actions never start below the fold.
      const fields=document.createElement('div');fields.className='feedback-fields';
      const actions=document.createElement('div');actions.className='feedback-actions';
      for(const child of [...form.children]){
        (child===submit||child===status||child===cancel||child.classList.contains('feedback-backup')?actions:fields).append(child);
      }
      form.append(fields,actions);
    }
    form.addEventListener('input',()=>{state.values=values(form);persist();say(canStore?'':t.noStorage);});
    function exportFile(){
      state.values=values(form);persist();const files=uploads?.descriptors()||[];
      download({...makeRecord(state.values),...(files.length?{attachments:files}:{})});
      say(t.saved+(files.length?' '+root.MuseFeedbackUploads.copy[language].backup:''),'downloaded');
    }
    if(state.receipt?.receipt) say(t.success+state.receipt.receipt,'success');
    else if(Object.keys(state.values).length) say(t.draft,'draft');
    form.addEventListener('submit',async e=>{
      e.preventDefault();if(busy||reading||!form.reportValidity())return;
      if(!online){exportFile();return;}
      if(!consent.checked){say(t.agree,'error');consent.focus();return;}
      const current=values(form),files=uploads.descriptors(),signature=JSON.stringify(current)+(files.length?JSON.stringify(files):'');
      if(!state.submission||state.signature!==signature){
        state={values:current,signature,attachmentDraft:files,submission:{schemaVersion:1,submissionId:crypto.randomUUID(),consent:true,record:makeRecord(current),...(files.length?{attachments:files,uploadToken:crypto.randomUUID()}:{})}};
        persist();
      }
      if(state.receipt){say(t.success+state.receipt.receipt,'success');return;}
      busy=true;form.setAttribute('aria-busy','true');
      const controls=[...form.elements].map(element=>[element,element.disabled]);controls.forEach(([el])=>{el.disabled=true;});
      submit.textContent=t.sending;say(t.sending,'pending');
      const abort=submissionAbort=new AbortController();cancel.hidden=false;cancel.disabled=false;
      try {
        if(files.length)await uploads.send(state.submission,message=>say(message,'pending'),abort.signal);
        say(t.sending,'pending');
        const receipt=await root.MuseFeedbackUploads.requestJSON('/api/feedback',state.submission,abort.signal);
        if(receipt.ok!==true||receipt.receipt!==state.submission.submissionId||!Number.isFinite(Date.parse(receipt.receivedAt)))throw new Error('Invalid receipt');
        state.receipt=receipt;persist();say(t.success+receipt.receipt,'success');
      }catch(error){
        const u=root.MuseFeedbackUploads.copy[language];
        if(error.status===410){delete state.submission;persist();}
        say(abort.signal.aborted?u.cancelled:(u[error.code]||(error.status===410?u.expired:error.status===429?t.limited:([400,403,409,413,415].includes(error.status)?t.invalid:t.failed))),'error');
      }
      finally {busy=false;submissionAbort=null;cancel.hidden=true;form.removeAttribute('aria-busy');controls.forEach(([el,disabled])=>{el.disabled=disabled;});submit.textContent=state.receipt?t.send:t.retry;}
    });
  }
  root.MuseFeedback={online,mount,download};
})(globalThis);
