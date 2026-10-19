'use strict';
// Keep account-specific settings out of source control. Never put API tokens in config files.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),mode=process.argv[2];
const wrangler=path.join(root,'node_modules/wrangler/bin/wrangler.js');
function run(args){const result=spawnSync(process.execPath,[wrangler,...args],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1);}
if(mode==='configure'||mode==='deploy'||mode==='migrate'){
  const id=process.env.CLOUDFLARE_D1_DATABASE_ID;
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id||'')||/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(id))throw new Error('Set CLOUDFLARE_D1_DATABASE_ID to the database ID returned by wrangler d1 create.');
  const config=JSON.parse(fs.readFileSync(path.join(root,'wrangler.jsonc'),'utf8'));
  config.d1_databases[0].database_id=id;
  fs.writeFileSync(path.join(root,'wrangler.deploy.json'),JSON.stringify(config,null,2)+'\n');
  if(mode!=='configure')run(['d1','migrations','apply','DB','--remote','--config','wrangler.deploy.json']);
  if(mode==='deploy')run(['deploy','--config','wrangler.deploy.json']);
}else if(mode==='dev'){
  run(['d1','migrations','apply','DB','--local','--config','wrangler.jsonc']);
  run(['dev','--local','--config','wrangler.jsonc','--ip','127.0.0.1']);
}else throw new Error('Expected configure, dev, migrate or deploy');
