(function(){
  'use strict';
  const form=document.getElementById('fallback'),online=MuseFeedback.online;
  const labels={clarity:'我知道下一步该做什么',readability:'人物和衣服细节看得清楚',visuals:'人物与服装的画风协调',enjoyment:'创造不同造型的过程有趣'};
  document.getElementById('rating-fields').innerHTML=Object.entries(labels).map(([name,label])=>'<label>'+label+'<select name="'+name+'" required><option value="">请选择</option>'+[1,2,3,4,5].map(n=>'<option value="'+n+'">'+n+' / 5'+(n===1?' — 完全不同意':n===5?' — 非常同意':'')+'</option>').join('')+'</select></label>').join('');
  const session=()=>{try{return JSON.parse(localStorage.getItem('muse_bloom_playtest_v17')||'null');}catch{return null;}};
  const recent=session();
  if(new URLSearchParams(location.search).get('qa')==='1'){
    for(const link of document.querySelectorAll('.actions a')){const url=new URL(link.href);url.searchParams.set('qa','1');link.href=url.href;}
  }
  MuseFeedback.mount(form,{
    storageKey:'muse_bloom_guide_feedback_v1',language:'zh',
    initial:online?{participant:recent?.participant||'P-'+crypto.randomUUID().slice(0,6).toUpperCase(),device:innerWidth<600?'手机':innerWidth<1000?'平板':'电脑'}:{},
    getRecord:answers=>{
      const r=session(),matched=r?.participant===answers.participant&&Array.isArray(r.events)&&r.version==='1.7.0';
      return {version:'1.7.0',source:new URLSearchParams(location.search).get('qa')==='1'?'automated-check':matched?r.source:'manual-feedback',
        participant:answers.participant,...(matched?{startedAt:r.startedAt}:{}),exportedAt:new Date().toISOString(),feedback:answers,events:matched?r.events:[]};
    }
  });
  if(online){
    document.getElementById('delivery-note').textContent='本轮记录与正常游戏进度分开。反馈草稿保存在本机，只有你同意并点击在线提交时才会上传。';
    document.getElementById('feedback-instructions').textContent='结束后点击游戏右上角 Feedback，再选择 Submit feedback；也可以返回本页填写下方反馈表。提交成功会显示回执编号，网络失败时可以重试或下载备份。';
    document.querySelector('details ol li:nth-child(5)').textContent='测试者可直接在线提交；观察表使用游戏内相同的匿名编号，并明确选择真人或自动化测试。汇总只包含 test_type 为 human 的记录，旧记录与自述为模拟测试的记录需另行核实。JSON 下载仍可用作备份。';
    document.getElementById('feedback-section').open=true;
    const jump=document.createElement('a');jump.className='button secondary';jump.href='#feedback-section';jump.textContent='填写试玩反馈 ↓';document.querySelector('.actions').append(jump);
    const latest=document.createElement('button');latest.type='button';latest.className='secondary';latest.textContent='使用最近一次试玩编号';
    latest.addEventListener('click',()=>{
      const r=session();
      if(r?.participant){form.elements.participant.value=r.participant;form.elements.participant.dispatchEvent(new Event('input',{bubbles:true}));}
      else document.querySelector('.feedback-status').textContent='本机尚未开始试玩，可以先开始一轮，或直接填写当前反馈表。';
    });
    form.prepend(latest);
  }
})();
