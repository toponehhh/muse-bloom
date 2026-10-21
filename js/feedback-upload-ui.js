(function(root){
  'use strict';
  const A=root.MuseFeedbackAttachments;
  const copy={
    en:{title:'Screenshots or screen recordings (optional)',hint:'Up to 3 files, 30 MB total. Images: PNG, JPG or WebP, up to 5 MB each. Videos: MP4, WebM or MOV, up to 20 MB each.',privacy:'Check that recordings and screenshots contain no personal information. Files are private to the project team.',remove:'Remove',restored:'File selection restored. If it was not uploaded, select the same file again.',reading:'Checking files…',count:'Choose at most 3 files.',type:'Use PNG, JPG, WebP, MP4, WebM or MOV.',empty:'Empty files cannot be uploaded.',size:'An image must be at most 5 MB and a video at most 20 MB.',total:'Attachments must total at most 30 MB.',content:'This file does not match its image or video format.',reselect:'Select the missing files again, or remove them to submit without them.',expired:'The upload session expired. Your answers are kept; submit again to start a new upload.',cancelled:'Submission cancelled. Your answers are kept; you can retry.',uploading:'Uploading attachment',backup:'JSON backups include file details only. Keep the original images and videos.'},
    zh:{title:'截图或录屏（选填）',hint:'最多 3 个文件，合计不超过 30 MB。图片支持 PNG、JPG、WebP，每张不超过 5 MB；视频支持 MP4、WebM、MOV，每段不超过 20 MB。',privacy:'请检查截图和录屏中没有个人信息。文件仅供项目团队查看。',remove:'移除',restored:'已恢复附件信息；如文件尚未上传，请重新选择同一文件。',reading:'正在检查文件…',count:'最多选择 3 个文件。',type:'请选择 PNG、JPG、WebP、MP4、WebM 或 MOV 文件。',empty:'不能上传空文件。',size:'图片每张不能超过 5 MB，录屏每段不能超过 20 MB。',total:'附件总大小不能超过 30 MB。',content:'文件内容与图片或视频格式不符。',reselect:'请重新选择尚未上传的文件，或移除附件后提交。',expired:'上传会话已过期，填写内容已保留；请再次提交以重新上传。',cancelled:'已取消提交，填写内容已保留，可以稍后重试。',uploading:'正在上传附件',backup:'JSON 备份只包含附件信息，请保留原始图片和视频。'}
  };
  async function requestJSON(url,body,signal){
    const controller=new AbortController(),abort=()=>controller.abort();
    if(signal?.aborted)controller.abort();
    signal?.addEventListener('abort',abort,{once:true});
    const timer=setTimeout(abort,15000);
    try{
      const response=await fetch(url,{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      if(!response.ok){const error=new Error('Request failed');error.status=response.status;throw error;}
      return await response.json();
    }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);}
  }
  function upload(submission,item,file,onProgress,signal){
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      const abort=()=>xhr.abort();
      const done=error=>{signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
      xhr.open('PUT','/api/feedback/uploads/'+submission.submissionId+'/'+item.id);
      xhr.setRequestHeader('Content-Type',item.type);xhr.setRequestHeader('Authorization','Bearer '+submission.uploadToken);
      xhr.timeout=300000; // Large mobile recordings may need longer than a text POST.
      xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.floor(e.loaded/e.total*100));};
      xhr.onerror=xhr.ontimeout=()=>done(new Error('Upload interrupted'));
      xhr.onabort=()=>done(Object.assign(new Error('Cancelled'),{code:'cancelled'}));
      xhr.onload=()=>{
        let response;try{response=JSON.parse(xhr.responseText);}catch{}
        if(xhr.status>=200&&xhr.status<300&&response?.ok===true&&response.id===item.id)done();
        else done(Object.assign(new Error('Upload not confirmed'),{status:xhr.status}));
      };
      if(signal?.aborted){done(Object.assign(new Error('Cancelled'),{code:'cancelled'}));return;}
      signal?.addEventListener('abort',abort,{once:true});xhr.send(file);
    });
  }
  function mount(before,{language='en',saved=[],onChange,onReading,onDispose}){
    const t=copy[language];let entries=[],reading=false,disposed=false;
    try{if(saved.length)entries=A.manifest(saved).map(meta=>({meta}));}catch{}
    const section=document.createElement('fieldset');section.className='feedback-attachments';
    const legend=document.createElement('legend');legend.textContent=t.title;
    const hint=document.createElement('p');hint.className='feedback-upload-hint';hint.id='feedback-upload-hint';hint.textContent=t.hint+' '+t.privacy;
    const input=document.createElement('input');input.type='file';input.name='attachments';input.multiple=true;input.accept='.png,.jpg,.jpeg,.webp,.mp4,.webm,.mov';input.setAttribute('aria-label',t.title);input.setAttribute('aria-describedby',hint.id);
    const list=document.createElement('ul');list.className='feedback-attachment-list';
    const status=document.createElement('p');status.className='feedback-upload-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    section.append(legend,hint,input,list,status);before.before(section);
    const descriptors=()=>entries.map(entry=>({...entry.meta}));
    function render(){
      list.replaceChildren();
      for(const entry of entries){
        const item=document.createElement('li'),details=document.createElement('div'),label=document.createElement('strong'),size=document.createElement('span');
        label.textContent=entry.meta.name;size.textContent=(entry.meta.size/(1024*1024)).toFixed(2)+' MB';details.append(label,size);
        if(entry.url){
          const media=document.createElement(entry.meta.type.startsWith('image/')?'img':'video');media.src=entry.url;
          if(media.tagName==='IMG')media.alt=entry.meta.name;
          else {media.controls=true;media.playsInline=true;media.preload='metadata';media.setAttribute('aria-label',entry.meta.name);}
          item.append(media);
        }else{const restored=document.createElement('small');restored.textContent=t.restored;details.append(restored);}
        const remove=document.createElement('button');remove.type='button';remove.className='secondary feedback-remove';remove.textContent=t.remove;remove.setAttribute('aria-label',t.remove+' '+entry.meta.name);
        remove.addEventListener('click',()=>{if(reading)return;if(entry.url)URL.revokeObjectURL(entry.url);entries=entries.filter(e=>e!==entry);render();onChange(descriptors());status.textContent='';});
        item.append(details,remove);list.append(item);
      }
    }
    input.addEventListener('change',async()=>{
      if(reading)return;
      const selected=[...input.files];if(!selected.length)return;
      reading=true;onReading(true);input.disabled=true;status.textContent=t.reading;
      const next=entries.slice(),created=[];
      try{
        A.checkFiles(selected);
        for(const file of selected){
          const type=A.fileType(file),bytes=new Uint8Array(await file.arrayBuffer());
          if(!A.matches(bytes,type))throw Object.assign(new Error('Invalid content'),{code:'content'});
          const sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
          const name=file.name.replace(/[\x00-\x1f\x7f/\\]/g,'_').slice(0,120)||'attachment';
          const old=next.find(entry=>entry.meta.name===name&&entry.meta.type===type&&entry.meta.size===file.size&&entry.meta.sha256===sha256);
          if(old?.file)continue;
          const entry={meta:old?.meta||{id:crypto.randomUUID(),name,type,size:file.size,sha256},file,url:URL.createObjectURL(file)};
          created.push(entry);
          if(old)next[next.indexOf(old)]=entry;else next.push(entry);
        }
        A.checkFiles(next.map(entry=>entry.meta));
        if(disposed){created.forEach(entry=>URL.revokeObjectURL(entry.url));return;}
        entries=next;render();onChange(descriptors());status.textContent='';
      }catch(error){created.forEach(entry=>URL.revokeObjectURL(entry.url));status.textContent=t[error.code]||t.content;}
      finally{reading=false;onReading(false);input.disabled=false;input.value='';}
    });
    // Closing the game dialog releases large Blob previews; metadata remains in the draft.
    const observer=new MutationObserver(()=>{if(!section.isConnected){disposed=true;onDispose?.();entries.forEach(e=>e.url&&URL.revokeObjectURL(e.url));entries=[];observer.disconnect();}});
    observer.observe(document.documentElement,{childList:true,subtree:true});render();
    return {
      descriptors,
      async send(submission,onProgress,signal){
        const plan=await requestJSON('/api/feedback/uploads',submission,signal);
        if(plan.ok!==true||plan.submissionId!==submission.submissionId||!Array.isArray(plan.uploaded))throw new Error('Invalid upload session');
        for(const [index,meta] of submission.attachments.entries()){
          if(plan.uploaded.includes(meta.id))continue;
          const file=entries.find(entry=>entry.meta.id===meta.id)?.file;
          if(!file){input.focus();throw Object.assign(new Error('File needs to be selected again'),{code:'reselect'});}
          const progress=percent=>onProgress(t.uploading+' '+(index+1)+'/'+submission.attachments.length+' · '+percent+'%');
          progress(0);await upload(submission,meta,file,progress,signal);
        }
      }
    };
  }
  root.MuseFeedbackUploads={mount,copy,requestJSON};
})(globalThis);
