import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceRecipients,attendanceMessage} from '../lib/attendance-email-policy.ts';
const account=(id:string,extra:object={})=>({id,email:`${id}@example.com`,demo:0,...extra});
test('attendance recipients: admins plus approved active managers in the same department only',()=>{
 const candidates=[account('admin'),account('manager',{manager:1,departmentId:'a',status:'approved',active:1}),account('other',{manager:1,departmentId:'b',status:'approved',active:1}),account('pending',{manager:1,departmentId:'a',status:'pending',active:1}),account('inactive',{manager:1,departmentId:'a',status:'approved',active:0}),account('employee',{departmentId:'a',status:'approved',active:1}),account('suspended',{suspended:1}),account('removed',{removed:'removed'}),account('demo',{demo:1})];
 assert.deepEqual(attendanceRecipients(candidates,'a','admin,suspended,removed,demo').map(x=>x.id),['admin','manager']);
 assert.deepEqual(attendanceRecipients(candidates,'','admin').map(x=>x.id),['admin']);
});
test('deduplicates shared admin/manager email case insensitively',()=>{
 assert.equal(attendanceRecipients([account('a'),account('b',{email:'A@EXAMPLE.COM',manager:1,departmentId:'d',status:'approved',active:1})],'d','a').length,1);
});
test('clock-out email shows Vietnam dates, lunch deduction, employee reply address and no salary',()=>{
 const result=attendanceMessage({name:'Nhân viên A',code:'NV01',department:'Kỹ thuật',action:'out',start:'2026-11-24T17:30:00Z',end:'2026-11-25T02:30:00Z',breakMinutes:60,replyTo:'employee@example.com'});
 assert.match(result.subject,/RA/);assert.match(result.text,/25\/11\/2026/);assert.match(result.text,/Giờ thực làm: 8.00 giờ/);assert.match(result.text,/60 phút/);assert.equal(result.reply_to,'employee@example.com');assert.doesNotMatch(result.text,/lương|salary/);
});
test('clock-in message has no fabricated end or net hours; strips subject line breaks',()=>{
 const result=attendanceMessage({name:'<b>NV</b>',code:'NV\r\n01',department:'D',action:'in',start:'2026-11-25T01:00:00Z',breakMinutes:0});
 assert.doesNotMatch(result.subject,/[\r\n]/);assert.doesNotMatch(result.text,/Giờ ra:|Giờ thực làm:/);assert.match(result.text,/<b>NV<\/b>/);
});
