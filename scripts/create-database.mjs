import mysql from 'mysql2/promise';
import {mysqlConfig} from '../lib/mysql-config.ts';
const config=mysqlConfig();
const name=config.database;
if(!/^[A-Za-z0-9_]{1,64}$/.test(name))throw new Error('MYSQL_DATABASE must contain only letters, digits or underscores.');
const {database,connectionLimit,maxIdle,idleTimeout,waitForConnections,queueLimit,...connection}=config;
const client=await mysql.createConnection(connection);
try{await client.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);console.log('Database is ready:',name)}finally{await client.end()}
