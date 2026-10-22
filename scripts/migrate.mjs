import {createClient} from '@libsql/client';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url=process.env.TURSO_DATABASE_URL;
if(!url)throw new Error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local or environment settings first.');
const client=createClient({url,authToken:process.env.TURSO_AUTH_TOKEN});
try{
 await client.execute('CREATE TABLE IF NOT EXISTS bridgemate_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL)');
 const applied=await client.execute('SELECT name,checksum FROM bridgemate_migrations');
 const files=(await readdir(new URL('../drizzle/',import.meta.url))).filter(x=>x.endsWith('.sql')).sort();
 for(const file of files){
  const sql=await readFile(new URL('../drizzle/'+file,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const previous=applied.rows.find(r=>r.name===file);
  if(previous){if(previous.checksum!==checksum)throw new Error('An applied migration has changed: '+file);console.log('Already applied:',file);continue;}
  const statements=sql.split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean);
  await client.batch([...statements,{sql:'INSERT INTO bridgemate_migrations (name,checksum) VALUES (?,?)',args:[file,checksum]}],'write');
  console.log('Applied:',file);
 }
}finally{client.close()}
