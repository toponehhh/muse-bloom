'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const root=path.resolve(__dirname,'..');
async function fixture(withAssets=false,through='9999',pagesDirectory='dist/cloudflare-pages'){
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  const pages=process.env.MUSE_CF_TARGET==='pages';
  const backend={
    name:config.name,
    modules:[config.main,'cloudflare/attachments.mjs','js/feedback-kind.js','js/feedback-attachments.js'].map(file=>({type:'ESModule',path:path.join(root,file)})),modulesRoot:root,compatibilityDate:config.compatibility_date,
    d1Databases:{DB:'feedback-test-only'},
    r2Buckets:{FEEDBACK_FILES:'feedback-files-test-only'},
    ratelimits:Object.fromEntries(config.ratelimits.map(r=>[r.name,{namespace_id:r.namespace_id,simple:r.simple}])),
    ...(!pages&&withAssets?{assets:{...config.assets,directory:path.resolve(root,config.assets.directory),routerConfig:{has_user_worker:true}}}:{})
  };
  const workers=pages?[{
    name:'pages-frontend',
    modules:[{type:'ESModule',path:path.join(root,pagesDirectory,'_worker.js')}],
    compatibilityDate:config.compatibility_date,
    serviceBindings:{FEEDBACK_API:config.name},
    assets:{directory:path.join(root,pagesDirectory),binding:'ASSETS',run_worker_first:['/api/*'],routerConfig:{has_user_worker:true}}
  },backend]:[backend];
  const mf=new Miniflare(convertV4MiniflareOptions({cf:false,host:'127.0.0.1',port:0,workers}));
  try{
    const db=await mf.getD1Database('DB',config.name);
    for(const name of fs.readdirSync(path.join(root,'cloudflare/migrations')).filter(n=>n.endsWith('.sql')&&n<=through).sort()){
      const statements=fs.readFileSync(path.join(root,'cloudflare/migrations',name),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
      await db.batch(statements.map(s=>db.prepare(s)));
    }
    return {mf,db,bucket:await mf.getR2Bucket('FEEDBACK_FILES',config.name),base:(await mf.ready).origin};
  }catch(error){await mf.dispose();throw error;}
}
module.exports={fixture};
