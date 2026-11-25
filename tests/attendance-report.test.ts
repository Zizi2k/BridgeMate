import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAttendanceReport} from '../lib/attendance-report.ts';
import {attendanceReportXlsx,attendanceReportPdf} from '../lib/attendance-report-export.ts';
import JSZip from 'jszip';
import {PDFDocument} from 'pdf-lib';
const person={id:'a',code:'NV01',name:'Nhân viên A',departmentId:'d',departmentName:'Kỹ thuật'};
const shift={id:'s',userId:'a',day:'2026-11-20',start:'2026-11-20T01:00:00Z',end:'2026-11-20T10:00:00Z',breakMinutes:60,reason:'Bổ sung quên chấm công',supplemented:1};
test('includes every calendar day, distinguishes empty/future and counts net hours only',()=>{
 const result=buildAttendanceReport('2026-11',[person],[shift],[],[],'2026-11-25').people[0];
 assert.equal(result.days.length,30);assert.equal(result.minutes,480);assert.equal(result.completed,1);assert.equal(result.days[19].weekday,'T6');assert.match(result.days[19].start,/20\/11\/2026/);assert.equal(result.days[19].breakMinutes,60);assert.equal(result.days[0].status,'Chưa có chấm công');assert.equal(result.days[29].status,'Chưa đến ngày');
});
test('leap-year calendar and invalid months are handled',()=>{
 assert.equal(buildAttendanceReport('2024-02',[person],[]).people[0].days.length,29);
 assert.equal(buildAttendanceReport('2025-02',[person],[]).people[0].days.length,28);
 assert.throws(()=>buildAttendanceReport('2026-13',[person],[]));
});
test('open shifts are marked without paying unfinished hours',()=>{
 const result=buildAttendanceReport('2026-11',[person],[{...shift,end:null}]).people[0];assert.equal(result.minutes,0);assert.equal(result.open,1);assert.equal(result.completed,0);
});
test('overnight shifts crossing payroll months count only each month share',()=>{
 const cross={...shift,day:'2026-10-31',start:'2026-10-31T15:00:00Z',end:'2026-10-31T19:00:00Z',breakMinutes:60};
 const october=buildAttendanceReport('2026-10',[person],[cross]).people[0];const november=buildAttendanceReport('2026-11',[person],[cross]).people[0];assert.equal(october.minutes,90);assert.equal(november.minutes,90);assert.match(november.days[0].notes,/Ca chuyển từ ngày/);
});
test('report keeps audit reasons, supplemental flag and specific work notes scoped to employee',()=>{
 const report=buildAttendanceReport('2026-11',[person],[shift,{...shift,id:'other',userId:'other'}],[{entryId:'s',data:{after:{reason:'Sửa giờ về đúng lịch'}} ,createdAt:'2026-11-21T01:00:00Z',actorName:'Quản lý'}],[{recipientId:'a',workDate:shift.day,workDetails:[{title:'Lắp đặt',kind:'extra',basis:'hour',minutes:120,rate:50000,note:'Công trình A'}]},{recipientId:'other',workDate:shift.day,workDetails:[{title:'PRIVATE'}]}]);
 const notes=report.people[0].days[19].notes;assert.match(notes,/Chấm công bổ sung/);assert.match(notes,/Sửa giờ về đúng lịch/);assert.match(notes,/Công trình A/);assert.doesNotMatch(notes,/PRIVATE/);assert.equal(report.people[0].minutes,480);
});
test('XLSX has summary and staff sheets with repeat headers, literal text and full notes; PDF paginates long notes',async()=>{
 const report=buildAttendanceReport('2026-11',[person],[{...shift,reason:'=SUM(A1) '+('Ghi chú dài đầy đủ. '.repeat(160))}]);
 const zip=await JSZip.loadAsync(await attendanceReportXlsx(report));const workbook=await zip.file('xl/workbook.xml')!.async('string');assert.match(workbook,/Tong_hop_cham_cong/);assert.match(workbook,/NV_001/);assert.match(workbook,/localSheetId="1"/);
 const sheet=await zip.file('xl/worksheets/sheet2.xml')!.async('string');assert.ok(sheet.includes('Ghi chú dài đầy đủ'));assert.ok(sheet.includes('=SUM(A1)'));assert.doesNotMatch(sheet,/<f>/);assert.match(sheet,/ySplit="5"/);
 const pdf=await PDFDocument.load(await attendanceReportPdf(report));assert.ok(pdf.getPageCount()>=2);
});
