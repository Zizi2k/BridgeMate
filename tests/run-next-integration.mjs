// Requires a MySQL test server and a user allowed to CREATE/DROP a dedicated test database.
import mysql from 'mysql2/promise';
import {mysqlConfig} from '../lib/mysql-config.ts';
import {spawn} from 'node:child_process';
const config=mysqlConfig();
const database='bridgemate_test_'+crypto.randomUUID().replaceAll('-','');
const env={...process.env,MYSQL_DATABASE:database,NEXT_TELEMETRY_DISABLED:'1'};
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
 process.env.BRIDGEMATE_TEST_URL='http://127.0.0.1:4319/api/';await import('./integration.mjs');
}catch(e){console.error(logs);throw e}finally{
 if(server){server.kill('SIGTERM');await new Promise(r=>server.once('exit',r))}
 if(admin){if(created)await admin.query(`DROP DATABASE \`${database}\``);await admin.end()}
}
