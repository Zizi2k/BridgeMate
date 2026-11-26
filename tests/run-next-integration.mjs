// Requires a MySQL test server and a user allowed to CREATE/DROP a dedicated test database.
import mysql from 'mysql2/promise';
import {mysqlConfig} from '../lib/mysql-config.ts';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const config=mysqlConfig();
const database='bridgemate_test_'+crypto.randomUUID().replaceAll('-','');
const mailDirectory=await mkdtemp(join(tmpdir(),'bridgemate-mail-')),mailbox=join(mailDirectory,'mail.jsonl');
const env={...process.env,BRIDGEMATE_TEST_MAILBOX:mailbox,RESEND_API_KEY:'test-only',AUTH_MAIL_FROM:'BridgeMate <test@example.test>',APP_ORIGIN:'http://localhost:4319',NODE_OPTIONS:(process.env.NODE_OPTIONS||'')+' --import '+new URL('./mail-provider-mock.mjs',import.meta.url).pathname,MYSQL_DATABASE:database,APTIS_GATE_ENABLED:'false',NEXT_TELEMETRY_DISABLED:'1'};
const {connectionLimit,maxIdle,idleTimeout,waitForConnections,queueLimit,...connection}=config;
let server,logs='',admin,created=false;
function command(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Command failed: '+args.join(' '))))})}
try{
 admin=await mysql.createConnection(connection);
 await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);created=true;
 await command(['--experimental-strip-types','scripts/migrate.mjs']);await command(['--experimental-strip-types','scripts/migrate.mjs']);
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','4319'],{env,stdio:['ignore','pipe','pipe']});
 server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
 let ready=false;
 for(let i=0;i<60;i++){try{const r=await fetch('http://127.0.0.1:4319/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,250))}
 if(!ready)throw new Error('The test server did not become ready.');
 process.env.BRIDGEMATE_TEST_MAILBOX=mailbox;process.env.BRIDGEMATE_TEST_URL='http://127.0.0.1:4319/api/';await import('./integration.mjs');
}catch(e){console.error(logs);throw e}finally{
 if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r))}
 await rm(mailDirectory,{recursive:true,force:true});
 if(admin){if(created)await admin.query(`DROP DATABASE \`${database}\``);await admin.end()}
}
