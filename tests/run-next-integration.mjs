import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const dir=await mkdtemp(join(tmpdir(),'bridgemate-test-'));
const env={...process.env,TURSO_DATABASE_URL:'file:'+join(dir,'test.db'),TURSO_AUTH_TOKEN:'',NEXT_TELEMETRY_DISABLED:'1'};
function command(args){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{env,stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(new Error('Command failed: '+args.join(' '))));p.on('error',reject)})}
let server,logs='';
try{
 await command(['scripts/migrate.mjs']);await command(['scripts/migrate.mjs']);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4319'],{env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 let ready=false;
 for(let i=0;i<60;i++){try{const res=await fetch('http://127.0.0.1:4319/api/health');if(res.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 if(!ready)throw new Error('Server did not become ready. '+logs);
 process.env.BRIDGEMATE_TEST_URL='http://127.0.0.1:4319/api/';
 await import('./integration.mjs');
}catch(e){console.error(logs);throw e}finally{if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r))}await rm(dir,{recursive:true,force:true})}
