import test from 'node:test';
import assert from 'node:assert/strict';
import {rankTeam,completionRecipients} from '../lib/ranking.ts';
const people=['a','b','c','d','e'].map(id=>({id,name:id.toUpperCase()}));
const event=(ids:string[])=>({recipients:JSON.stringify(ids)});
test('each participant receives ten points per distinct completion snapshot',()=>{const rows=rankTeam(people,[event(['a','b','c','d']),event(['a','b','c']),event(['a','b']),event(['a'])]);assert.deepEqual(rows.map(p=>[p.id,p.points,p.completedTasks,p.rank]),[['a',40,4,'diamond'],['b',30,3,'gold'],['c',20,2,'platinum'],['d',10,1,'ruby'],['e',0,0,null]]);});
test('zero points have no rank and equal scores share a competition position',()=>{assert.ok(rankTeam(people,[]).every(p=>p.position===null&&p.rank===null));const rows=rankTeam(people,[event(['a','b','c']),event(['a','b'])]);assert.deepEqual(rows.map(p=>p.position),[1,1,3,null,null]);assert.deepEqual(rows.slice(0,3).map(p=>p.rank),['diamond','diamond','platinum']);});
test('recipients are deduplicated, unknown members ignored, and fifth place has no top-four badge',()=>{assert.deepEqual(completionRecipients('a',['a','b','b']),['a','b']);const once=rankTeam(people,[event(['a','a','unknown'])]);assert.equal(once[0].points,10);const events=Array.from({length:5},(_,i)=>event(people.slice(0,5-i).map(p=>p.id)));assert.equal(rankTeam(people,events)[4].position,5);assert.equal(rankTeam(people,events)[4].rank,null);});
