import mysql from 'mysql2/promise';
import {mysqlConfig} from '../lib/mysql-config.ts';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {connectionLimit,maxIdle,idleTimeout,waitForConnections,queueLimit,...config}=mysqlConfig();
const client=await mysql.createConnection(config);
const lock='bridgemate:'+createHash('sha256').update(config.database).digest('hex').slice(0,45);
let locked=false;
try{
 const [result]=await client.query('SELECT GET_LOCK(?,30) AS acquired',[lock]);
 if(result[0].acquired!==1)throw new Error('Another migration is running. Try again later.');locked=true;
 await client.query('CREATE TABLE IF NOT EXISTS bridgemate_migrations (name VARCHAR(255) PRIMARY KEY, checksum CHAR(64) NOT NULL, next_statement INT NOT NULL DEFAULT 0, completed TINYINT NOT NULL DEFAULT 0) ENGINE=InnoDB');
 const [applied]=await client.query('SELECT name,checksum,next_statement,completed FROM bridgemate_migrations');
 for(const file of (await readdir(new URL('../mysql/migrations/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort()){
  const sql=await readFile(new URL('../mysql/migrations/'+file,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const previous=applied.find(r=>r.name===file);
  if(previous&&previous.checksum!==checksum)throw new Error('Applied migration was modified: '+file);
  if(previous?.completed){console.log('Already applied:',file);continue;}
  if(!previous)await client.query('INSERT INTO bridgemate_migrations (name,checksum) VALUES (?,?)',[file,checksum]);
  const statements=sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean);
  for(let i=previous?.next_statement||0;i<statements.length;i++){
   await client.query(statements[i]);
   await client.query('UPDATE bridgemate_migrations SET next_statement=? WHERE name=?',[i+1,file]);
  }
  await client.query('UPDATE bridgemate_migrations SET completed=1 WHERE name=?',[file]);console.log('Applied:',file);
 }
}finally{if(locked)await client.query('SELECT RELEASE_LOCK(?)',[lock]);await client.end()}
