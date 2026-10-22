import mysql from 'mysql2/promise';
import {drizzle,type MySql2Database} from 'drizzle-orm/mysql2';
import {attachDatabasePool} from '@vercel/functions';
import {mysqlConfig} from '../lib/mysql-config';
import * as schema from './schema';
let database:MySql2Database<typeof schema>|undefined;
export function getDb(){
 if(database)return database;
 const pool=mysql.createPool(mysqlConfig());
 if(process.env.VERCEL)attachDatabasePool(pool);
 database=drizzle(pool,{schema,mode:'default'});
 return database;
}
