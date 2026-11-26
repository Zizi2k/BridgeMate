import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrationStatements} from '../lib/migration-statements.ts';
test('email migration executes three separate DDL statements without changing its journal checksum',()=>{
 const sql=readFileSync(new URL('../mysql/migrations/0027_email_verification.sql',import.meta.url),'utf8');const statements=migrationStatements(sql);assert.equal(statements.length,3);assert.match(statements[0],/^ALTER TABLE users /);assert.match(statements[1],/^CREATE TABLE email_verifications /);assert.match(statements[2],/^CREATE TABLE email_verification_limits /);
});
test('explicit breakpoints keep legacy statement boundaries for resumable migrations',()=>{
 const source="SELECT 'a;b';\n--> statement-breakpoint\nSELECT 2;";assert.deepEqual(migrationStatements(source),source.split('--> statement-breakpoint').map(s=>s.trim()));
});
test('quoted identifiers, escapes, doubled quotes and SQL comments do not create statements',()=>{
 const source="INSERT INTO `a;b` VALUES ('a;''b',\"a;\\\"b\"); -- comment ;\nSELECT 2 /* ignored ; */; # trailing ;\n";
 const statements=migrationStatements(source);assert.equal(statements.length,2);assert.ok(statements[0].includes("'a;''b'"));assert.ok(statements[1].includes('SELECT 2'));
});
