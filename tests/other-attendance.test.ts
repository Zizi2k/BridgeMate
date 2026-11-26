import test from 'node:test';
import assert from 'node:assert/strict';
import {attendanceKind,regularAttendanceExists} from '../lib/attendance-kind.ts';
import {overlapsAttendance} from '../lib/attendance-supplement.ts';
import {buildAttendanceReport} from '../lib/attendance-report.ts';
import {previewAttendanceImport} from '../lib/attendance-import.ts';
test('other-work clock requires a clear job name and cannot select an unknown type',()=>{
 assert.deepEqual(attendanceKind({}),{kind:'regular',workLabel:''});assert.deepEqual(attendanceKind({kind:'other',workLabel:'  Lắp đặt ngoài giờ  '}),{kind:'other',workLabel:'Lắp đặt ngoài giờ'});assert.throws(()=>attendanceKind({kind:'other'}));assert.throws(()=>attendanceKind({kind:'other',workLabel:'x'.repeat(181)}));assert.throws(()=>attendanceKind({kind:'unknown'}));
});
test('regular attendance remains unique per day while other jobs may share the day',()=>{
 assert.equal(regularAttendanceExists([{day:'2026-11-25',kind:'other'}],'2026-11-25'),false);assert.equal(regularAttendanceExists([{day:'2026-11-25'}],'2026-11-25'),true);assert.equal(regularAttendanceExists([{day:'2026-11-25',kind:'regular'}],'2026-11-25'),true);
});
const regular={id:'normal',userId:'a',day:'2026-11-25',start:'2026-11-25T01:00:00Z',end:'2026-11-25T10:00:00Z',breakMinutes:60,kind:'regular'};
const other={id:'other',userId:'a',day:'2026-11-25',start:'2026-11-25T12:00:00Z',end:'2026-11-25T14:00:00Z',breakMinutes:0,kind:'other',workLabel:'Hỗ trợ công trình',reason:'Làm thêm ngoài giờ ca thường'};
test('all shift types share overlap protection, including open shifts',()=>{
 assert.equal(overlapsAttendance(other.start,other.end,[regular]),false);assert.equal(overlapsAttendance('2026-11-25T09:00:00Z',other.end,[regular]),true);assert.equal(overlapsAttendance(other.start,other.end,[{...regular,end:null}]),true);
});
test('monthly report preserves multiple same-day shifts in time order and counts net hours once',()=>{
 const person={id:'a',code:'NV01',name:'Nhân viên',departmentId:'d',departmentName:'Kỹ thuật'};
 const report=buildAttendanceReport('2026-11',[person],[other,regular]);const result=report.people[0];assert.equal(result.minutes,600);assert.equal(result.completed,1);const shifts=result.days.filter(row=>row.day==='2026-11-25');assert.equal(shifts.length,2);assert.match(shifts[0].start,/08:00:00/);assert.match(shifts[1].notes,/Hỗ trợ công trình/);
});
test('Excel regular attendance can coexist with another non-overlapping job on the same day',()=>{
 const source={date1904:false,rows:[{line:2,values:['NV01','Nhân viên','2026-11-25','08:00','17:00',1,0,'Nhập ca thường']} ]};
 const rows=previewAttendanceImport(source,[{userId:'a',code:'NV01',name:'Nhân viên'}],[other],true,new Date('2026-11-26T00:00:00Z'));assert.equal(rows[0].status,'ready');
 const overlapping=previewAttendanceImport(source,[{userId:'a',code:'NV01',name:'Nhân viên'}],[{...other,start:'2026-11-25T05:00:00Z'}],true,new Date('2026-11-26T00:00:00Z'));assert.equal(overlapping[0].status,'error');
});
