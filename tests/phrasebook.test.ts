import test from 'node:test';
import assert from 'node:assert/strict';
import {composePhrasebook,validatePhrase} from '../lib/phrasebook.ts';
const seed=[{id:'clarify0',category:'clarify',en:'Please clarify.',vi:'Vui lòng làm rõ.'}];
test('new accounts receive defaults without modifying stored data',()=>{const r=composePhrasebook(seed,[]);assert.equal(r.phrases.length,1);assert.equal(r.deleted.length,0);assert.equal(r.phrases[0].custom,false);});
test('editing a default replaces it once; custom phrases remain separate',()=>{
 const r=composePhrasebook(seed,[{...seed[0],en:'Could you clarify?',deleted:0,updatedAt:'2026-10-27'},{...seed[0],id:'new-phrase',deleted:0,updatedAt:'2026-10-27'}]);
 assert.equal(r.phrases.length,2);assert.equal(r.phrases[0].en,'Could you clarify?');assert.equal(r.phrases[1].custom,true);assert.equal(seed[0].en,'Please clarify.');
});
test('deleted defaults stay deleted after reload and can be restored',()=>{
 const record={...seed[0],deleted:1,updatedAt:'2026-10-27'};
 assert.equal(composePhrasebook(seed,[record]).phrases.length,0);assert.equal(composePhrasebook(seed,[record]).deleted.length,1);
 assert.equal(composePhrasebook(seed,[{...record,deleted:0}]).phrases.length,1);
 assert.equal(composePhrasebook(seed,[]).phrases.length,1);
});
test('phrases require both translations, valid categories and bounded text',()=>{
 assert.deepEqual(validatePhrase({category:'clarify',en:' Hello ',vi:' Xin chào '},['clarify']),{category:'clarify',en:'Hello',vi:'Xin chào'});
 for(const b of [{category:'unknown',en:'Hello',vi:'Chào'},{category:'clarify',en:' ',vi:'Chào'},{category:'clarify',en:'Hi',vi:'x'.repeat(2001)},null])assert.throws(()=>validatePhrase(b,['clarify']));
});
