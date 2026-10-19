'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const root=path.resolve(__dirname,'..');
async function fixture(withAssets=false){
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  const mf=new Miniflare(convertV4MiniflareOptions({
    modules:true,scriptPath:path.join(root,config.main),compatibilityDate:config.compatibility_date,
    cf:false,host:'127.0.0.1',port:0,
    d1Databases:{DB:'feedback-test-only'},
    ratelimits:Object.fromEntries(config.ratelimits.map(r=>[r.name,{namespace_id:r.namespace_id,simple:r.simple}])),
    ...(withAssets?{assets:{...config.assets,directory:path.resolve(root,config.assets.directory),routerConfig:{has_user_worker:true}}}:{})
  }));
  try{
    const db=await mf.getD1Database('DB');
    for(const name of fs.readdirSync(path.join(root,'cloudflare/migrations')).filter(n=>n.endsWith('.sql')).sort()){
      const statements=fs.readFileSync(path.join(root,'cloudflare/migrations',name),'utf8').split(';').map(s=>s.trim()).filter(Boolean);
      await db.batch(statements.map(s=>db.prepare(s)));
    }
    return {mf,db,base:(await mf.ready).origin};
  }catch(error){await mf.dispose();throw error;}
}
module.exports={fixture};
