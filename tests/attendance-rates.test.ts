import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceShiftPay,shiftRateInput} from '../lib/attendance-rates.ts';
import {settlePayroll} from '../lib/payroll-arrears.ts';
const shift=(id:string,day:string,start:string,end:string,pricing:object={})=>({id,day,start:day+'T'+start+':00+07:00',end:day+'T'+end+':00+07:00',breakMinutes:0,...pricing});
test('unpriced legacy shifts keep the ordinary salary calculation',()=>{
 const pay=attendanceShiftPay([shift('a','2026-11-01','08:00','17:00',{breakMinutes:60})],'2026-11',30000);
 assert.equal(pay.minutes,480);assert.equal(pay.total,240000);assert.deepEqual(pay.details,[]);
});
test('mixed hourly and fixed-session overrides replace base wages exactly once',()=>{
 const pay=attendanceShiftPay([shift('a','2026-11-01','08:00','16:00'),shift('b','2026-11-02','08:00','12:00',{payBasis:'hour',payRate:40000,payNote:'Công việc kỹ thuật'}),shift('c','2026-11-03','08:00','12:00',{payBasis:'session',payRate:200000,payNote:'Trọn buổi'})],'2026-11',30000);
 assert.equal(pay.minutes,960);assert.equal(pay.total,600000);assert.equal(pay.details.length,2);assert.equal(pay.details[0].amount,40000);assert.equal(pay.details[1].amount,80000);
 const report=settlePayroll([{id:'base',recipientId:'e',departmentId:'d',period:'2026-11',total:pay.total,hours:16,advance:100000,workDetails:pay.details}],[]);
 assert.equal(report[0].total,600000);assert.equal(report[0].balance,500000);
});
test('zero-rate override is distinct from returning to default',()=>{
 const row=shift('a','2026-11-01','08:00','12:00',{payBasis:'hour',payRate:0});
 assert.equal(attendanceShiftPay([row],'2026-11',30000).total,0);
 assert.equal(attendanceShiftPay([{...row,payBasis:null,payRate:null}],'2026-11',30000).total,120000);
 assert.equal(shiftRateInput({payBasis:'default',payNote:'Trở về mặc định'}).payRate,null);
});
test('fixed-session pay is conserved across month boundaries including an odd dong',()=>{
 const row=shift('a','2026-11-30','23:30','00:30',{end:'2026-12-01T00:30:00+07:00',payBasis:'session',payRate:101});
 const nov=attendanceShiftPay([row],'2026-11',30000),dec=attendanceShiftPay([row],'2026-12',30000);
 assert.equal(nov.total,50);assert.equal(dec.total,51);assert.equal(nov.total+dec.total,101);assert.notEqual(nov.details[0].id,dec.details[0].id);
});
test('open shifts are not paid and final hourly rate uses credited minutes after lunch',()=>{
 assert.equal(attendanceShiftPay([{...shift('a','2026-11-01','08:00','17:00'),end:null,payBasis:'session',payRate:200000}],'2026-11',30000).total,0);
 assert.equal(attendanceShiftPay([shift('a','2026-11-01','08:10','16:50',{breakMinutes:60,payBasis:'hour',payRate:40000})],'2026-11',30000).total,320000);
});
test('rate edits require a reason and bounded whole-dong amounts',()=>{
 for(const payRate of [-1,0.5,1000000001,NaN,Infinity,'30000'])assert.throws(()=>shiftRateInput({payBasis:'hour',payRate,payNote:'Test'}));
 assert.throws(()=>shiftRateInput({payBasis:'session',payRate:100000,payNote:''}));
 assert.throws(()=>shiftRateInput({payBasis:['hour'],payRate:100000,payNote:'Test'}));
 assert.throws(()=>shiftRateInput({payBasis:'anything',payRate:100000,payNote:'Test'}));
 assert.equal(shiftRateInput({payBasis:'session',payRate:100000,payNote:'Trọn buổi'}).payBasis,'session');
});
