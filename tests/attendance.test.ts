import test from 'node:test';
import assert from 'node:assert/strict';
import {localDay,shiftMinutes,monthMinutes,netShiftMinutes,payableShiftMinutes,attendanceBounds} from '../lib/attendance.ts';
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

test('a sub-minute shift produces zero payable minutes',()=>{
 const start='2026-11-01T08:00:00+07:00',end='2026-11-01T08:00:30+07:00';
 assert.equal(netShiftMinutes(start,end,0),0);
 assert.equal(monthMinutes('2026-11-01',start,end,'2026-11',0),0);
});

test('attendance rounds ten-minute windows inclusively around half-hour marks',()=>{
 const d=(time:string)=>`2026-11-01T${time}+07:00`;
 assert.equal(payableShiftMinutes(d('08:10:00'),d('11:20:00')),210);
 assert.equal(payableShiftMinutes(d('08:01:00'),d('16:50:00'),60),480);
 assert.equal(payableShiftMinutes(d('08:10:01'),d('11:19:59')),189);
 assert.equal(payableShiftMinutes(d('08:40:00'),d('09:50:00')),90);
 assert.equal(netShiftMinutes(d('08:10:00'),d('11:20:00')),190);
 assert.equal(attendanceBounds(d('08:10:00'),d('11:20:00')).start,Date.parse(d('08:00:00')));
});
test('rounded month allocations conserve credited minutes across midnight',()=>{
 const start='2026-11-30T23:40:00+07:00',end='2026-12-01T00:20:00+07:00';
 assert.equal(monthMinutes('2026-11-30',start,end,'2026-11'),30);
 assert.equal(monthMinutes('2026-11-30',start,end,'2026-12'),30);
});

test('module visibility and approval are required even for a department manager',async()=>{
 const {canAccessModule,restrictedModules}=await import('../lib/module-access.ts');
 const context={ownerAdmin:false,manager:true,demo:false,hidden:false};
 for(const module of restrictedModules){
  assert.equal(canAccessModule(module,context),false);
  assert.equal(canAccessModule(module,{...context,status:'pending'}),false);
  assert.equal(canAccessModule(module,{...context,status:'approved'}),true);
  assert.equal(canAccessModule(module,{...context,status:'approved',hidden:true}),false);
  assert.equal(canAccessModule(module,{...context,status:'approved',demo:true}),false);
  assert.equal(canAccessModule(module,{...context,ownerAdmin:true,hidden:true}),true);
 }
 assert.equal(canAccessModule('payroll-team',context),true);
});
