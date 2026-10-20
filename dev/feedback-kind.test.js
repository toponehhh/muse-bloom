'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {execFileSync}=require('node:child_process'),{classify}=require('../js/feedback-kind');
const human={version:'1.7.0',source:'participant-session',testType:'human',participant:'P-REAL01',exportedAt:'2026-10-20T01:00:00Z',feedback:{clarity:'4',continue:'Yes'},events:[{action:'look-complete',level:1,score:94}]};
assert.equal(classify(human).type,'human');
assert.equal(classify({...human,source:'automated-check'}).type,'automated');
assert.equal(classify({...human,testType:'automated'}).type,'automated');
assert.equal(classify({...human,testType:undefined}).type,'unverified');
for(const notes of ['本次是 AI 模拟试玩，不是真实玩家数据。','【AI 模拟试玩，非真人；请勿计入真人结果】','Automated form test; not a participant response.','This is synthetic feedback.']){
  assert.equal(classify({...human,feedback:{observerNotes:notes}}).type,'unverified',notes);
}
assert.equal(classify({...human,feedback:{friction:'The AI-looking clothing did not fit.'}}).type,'human','Do not exclude ordinary opinions about AI art');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'muse-feedback-kind-'));
const write=(name,record)=>fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(record));
const summarize=()=>{execFileSync(process.execPath,[path.join(__dirname,'summarize-playtest.js'),dir]);return JSON.parse(fs.readFileSync(path.join(dir,'playtest-summary.json'),'utf8'));};
try {
  // Reproduce the supplied report: two IDs, ordinary sources, explicit AI notes.
  write('report-session',{...human,testType:undefined,participant:'P-SIM001',feedback:{...human.feedback,friction:'本次是 AI 模拟试玩，不是真实玩家数据。'}});
  write('report-observer',{...human,testType:undefined,source:'manual-feedback',participant:'P-AI-01',events:[],feedback:{...human.feedback,observerNotes:'AI 模拟试玩，非真人'}});
  let result=summarize();assert.equal(result.participants,0);assert.equal(result.ratings.clarity.mean,null);assert.equal(result.excluded.length,2);
  write('real',human);
  write('observer',{...human,source:'manual-feedback',exportedAt:'2026-10-20T02:00:00Z',events:[],feedback:{clarity:'5',continue:'Maybe'}});
  result=summarize();assert.equal(result.participants,1);assert.equal(result.ratings.clarity.mean,5);assert.deepEqual(result.summaries[0].completedLevels,[1]);
  assert.equal(summarize().excluded.length,2,'Re-running does not ingest its own summary');
  write('conflict',{...human,source:'automated-check',exportedAt:'2026-10-20T03:00:00Z'});
  result=summarize();assert.equal(result.participants,0);assert.ok(result.exclusionReasons.some(r=>r.reason==='conflicting-session-types'));
  console.log('PASS: explicit kinds, legacy quarantine, simulation disclosures, report double-count regression, observer merge and conflicting IDs');
}finally{for(const name of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,name));fs.rmdirSync(dir);}
