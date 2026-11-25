import test from 'node:test';
import assert from 'node:assert/strict';
import {localDay,shiftMinutes,monthMinutes} from '../lib/attendance.ts';
test('Vietnam day crosses before UTC midnight',()=>assert.equal(localDay(new Date('2026-11-30T18:00:00Z')),'2026-12-01'));
test('counts exact minutes and rejects invalid, reversed and overlong shifts',()=>{
 assert.equal(shiftMinutes('2026-11-01T08:00:00+07:00','2026-11-01T17:30:00+07:00'),570);
 for(const end of ['bad','2026-11-01T07:00:00+07:00','2026-11-03T17:30:00+07:00'])assert.throws(()=>shiftMinutes('2026-11-01T08:00:00+07:00',end));
});
test('overnight shift splits correctly across salary months',()=>{
 const start='2026-11-30T22:00:00+07:00',end='2026-12-01T02:00:00+07:00';
 assert.equal(monthMinutes('2026-11-30',start,end,'2026-11'),120);
 assert.equal(monthMinutes('2026-11-30',start,end,'2026-12'),120);
});
