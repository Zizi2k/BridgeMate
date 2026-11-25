import test from 'node:test';
import assert from 'node:assert/strict';
import {canAssignManagedTask} from '../lib/managed-teams.ts';
test('manager assignment requires both managed employee and membership in selected team',()=>{
 assert.equal(canAssignManagedTask(false,['a'],['a','b'],'a'),true);
 assert.equal(canAssignManagedTask(false,['a'],['a','b'],'b'),false);
 assert.equal(canAssignManagedTask(false,['a'],['b'],'a'),false);
 assert.equal(canAssignManagedTask(false,[],['a'],'a'),false);
});
test('admin assignment still requires actual team membership',()=>{
 assert.equal(canAssignManagedTask(true,[],['b'],'b'),true);
 assert.equal(canAssignManagedTask(true,[],['b'],'c'),false);
});
