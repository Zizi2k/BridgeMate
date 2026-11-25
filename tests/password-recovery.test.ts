import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldQueueRecovery,validReplacementPassword} from '../lib/password-recovery-policy.ts';
test('pending requests cannot be replaced even after cooldown; a new account request is accepted',()=>{
 const time=Date.parse('2026-11-25T04:00:00Z');
 assert.equal(shouldQueueRecovery(undefined,time),true);
 assert.equal(shouldQueueRecovery({status:'pending',requestedAt:'2026-11-24T01:00:00Z'},time),false);
});
test('completed recovery requests respect one-hour cooldown including boundary',()=>{
 const previous={status:'approved',requestedAt:'2026-11-25T03:00:00Z'};
 assert.equal(shouldQueueRecovery(previous,Date.parse('2026-11-25T03:59:59Z')),false);
 assert.equal(shouldQueueRecovery(previous,Date.parse('2026-11-25T04:00:00Z')),true);
});
test('replacement must differ from temporary password and satisfy password bounds',()=>{
 assert.equal(validReplacementPassword('old-password','new-password'),true);
 assert.equal(validReplacementPassword('same-password','same-password'),false);
 assert.equal(validReplacementPassword('old-password','1234567'),false);
 assert.equal(validReplacementPassword('old-password','x'.repeat(128)),true);
 assert.equal(validReplacementPassword('old-password','x'.repeat(129)),false);
});
