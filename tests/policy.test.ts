import test from 'node:test';
import assert from 'node:assert/strict';
import {canEdit,canProgress,taskChanged,scoreAnswers} from '../lib/policy.ts';
import {questions,phrases} from '../lib/content.ts';
test('only creator and owner can edit requirements',()=>{const t={createdBy:'creator',assigneeId:'assignee'};assert.equal(canEdit(t,'creator','owner'),true);assert.equal(canEdit(t,'owner','owner'),true);assert.equal(canEdit(t,'assignee','owner'),false);assert.equal(canEdit(t,'outsider','owner'),false)});
test('assignee can update progress but outsider cannot',()=>{assert.equal(canProgress({createdBy:'c',assigneeId:'a'},'a','o'),true);assert.equal(canProgress({createdBy:'c',assigneeId:'a'},'x','o'),false)});
test('material changes invalidate prior confirmation; progress does not',()=>{const t={title:'a',description:'d',deliverable:'x',assigneeId:'1',dueAt:'2026-11-01'};for(const k of Object.keys(t))assert.equal(taskChanged(t,{[k]:'changed'}),true);assert.equal(taskChanged(t,{status:'done'}),false);assert.equal(taskChanged(t,{...t}),false)});
test('quiz scores on the server and rejects incomplete or invalid answers',()=>{assert.equal(scoreAnswers(questions.map(q=>q.correct),questions),10);assert.equal(scoreAnswers(questions.map(q=>(q.correct+1)%3),questions),0);assert.throws(()=>scoreAnswers([],questions));assert.throws(()=>scoreAnswers(Array(10).fill(-1),questions));assert.throws(()=>scoreAnswers(Array(10).fill('0'),questions));});
test('content has 30 phrases and 10 complete bilingual questions',()=>{assert.equal(phrases.length,30);assert.equal(questions.length,10);for(const p of phrases)assert.ok(p.en&&p.vi);for(const q of questions)assert.ok(q.en&&q.vi&&q.explanationEn&&q.explanationVi&&q.optionsEn.length===q.optionsVi.length)});
