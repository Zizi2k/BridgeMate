import test from 'node:test';
import assert from 'node:assert/strict';
import {mysqlConfig} from '../lib/mysql-config.ts';
const sample={MYSQL_HOST:'db.example.test',MYSQL_USER:'app',MYSQL_PASSWORD:'test',MYSQL_DATABASE:'bridgemate'};
test('remote MySQL uses verified TLS and bounded connection pooling by default',()=>{const c=mysqlConfig(sample);assert.equal(c.connectionLimit,3);assert.equal(c.port,3306);assert.equal((c.ssl as any).rejectUnauthorized,true);assert.equal(c.charset,'utf8mb4')});
test('local SSL opt-out and provider CA are explicit',()=>{assert.equal(mysqlConfig({...sample,MYSQL_SSL:'false'}).ssl,undefined);assert.equal((mysqlConfig({...sample,MYSQL_SSL_CA:'line1\\nline2'}).ssl as any).ca,'line1\nline2')});
test('missing config and invalid port fail early',()=>{assert.throws(()=>mysqlConfig({}));assert.throws(()=>mysqlConfig({...sample,MYSQL_PORT:'invalid'}));assert.throws(()=>mysqlConfig({...sample,MYSQL_PORT:'70000'}))});
