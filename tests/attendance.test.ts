import test from 'node:test';
import assert from 'node:assert/strict';
import {localDay,shiftMinutes,monthMinutes,netShiftMinutes} from '../lib/attendance.ts';
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

test('deducts selected lunch duration from worked minutes',()=>{
 const start='2026-11-01T08:00:00+07:00',end='2026-11-01T17:00:00+07:00';
 assert.equal(netShiftMinutes(start,end,60),480);
 assert.equal(netShiftMinutes(start,end,90),450);
 assert.equal(netShiftMinutes(start,end),540);
 assert.equal(monthMinutes('2026-11-01',start,end,'2026-11',60),480);
});
test('rejects invalid breaks and permits a zero net shift',()=>{
 const start='2026-11-01T08:00:00+07:00',end='2026-11-01T09:00:00+07:00';
 for(const value of [-1,61,0.5,NaN,Infinity])assert.throws(()=>netShiftMinutes(start,end,value));
 assert.equal(netShiftMinutes(start,end,60),0);
});
test('allocates a lunch deduction across month boundaries exactly once',()=>{
 const start='2026-11-30T23:00:00+07:00',end='2026-12-01T02:00:00+07:00';
 const november=monthMinutes('2026-11-30',start,end,'2026-11',45);
 const december=monthMinutes('2026-11-30',start,end,'2026-12',45);
 assert.equal(november,45);assert.equal(december,90);assert.equal(november+december,135);
 assert.equal(monthMinutes('2026-11-30',start,end,'2026-10',45),0);
});
