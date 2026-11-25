import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyWork,replacementFits,priceReplacements} from '../lib/daily-work.ts';
import {settlePayroll,consolidateArrears} from '../lib/payroll-arrears.ts';
import {payrollXlsx,payrollPdf} from '../lib/payroll-export.ts';
import JSZip from 'jszip';
const input={day:'2026-08-20',title:'Lắp đặt thiết bị',note:'Thi công tại công trình A',kind:'replace',basis:'hour',hours:2,rate:50000};
test('replace two of eight hours without double-counting baseline pay; additional work adds independently',()=>{
 const replacement=dailyWork(input,30000,'2026-11-25');assert.equal(replacement.earned,100000);assert.equal(replacement.amount,40000);
 const extra=dailyWork({...input,kind:'extra',hours:1},30000,'2026-11-25');assert.equal(extra.amount,50000);
 assert.equal(8*30000+replacement.amount+extra.amount,330000);
 const lower=dailyWork({...input,rate:20000},30000,'2026-11-25');assert.equal(lower.amount,-20000);
});
test('job pay adds a fixed amount without inventing hours',()=>{
 const item=dailyWork({...input,kind:'extra',basis:'job',rate:150000,hours:0},30000,'2026-11-25');assert.equal(item.minutes,0);assert.equal(item.amount,150000);
});
test('rejects invalid dates, future work, missing notes and invalid rates or hours',()=>{
 for(const change of [{day:'2026-02-30'},{day:'2026-12-01'},{note:''},{hours:0},{hours:25},{hours:0.0001},{rate:-1},{rate:1.5},{kind:'replace',basis:'job'}])assert.throws(()=>dailyWork({...input,...change},30000,'2026-11-25'));
});
test('all replacement jobs share the net paid hours cap',()=>{
 assert.equal(replacementFits(120,[240],420),true);assert.equal(replacementFits(181,[240],420),false);assert.equal(replacementFits(1,[],0),false);
});
test('repeated rounding across split jobs preserves the exact base deduction',()=>{
 const items=Array.from({length:3},(_,i)=>({...dailyWork({...input,hours:1/60,rate:10},100,'2026-11-25'),id:String(i)}));
 const priced=priceReplacements(items,100);assert.equal(priced.reduce((sum,item)=>sum+item.amount,0),-5);
});
const detail={...dailyWork(input,30000,'2026-11-25'),id:'work-1'};
const sources=[{id:'base',recipientId:'e',worker:'Nhân viên A',employeeCode:'NV1',departmentId:'a',departmentName:'Kỹ thuật',period:'2026-08',hours:8,total:240000,advance:10000},{id:'work',recipientId:'e',worker:'Nhân viên A',employeeCode:'NV1',departmentId:'a',departmentName:'Kỹ thuật',period:'2026-08',hours:0,total:detail.amount,workDetails:[detail]}];
test('grouping, deductions and overdue consolidation preserve job notes exactly once',()=>{
 const monthly=settlePayroll(sources,[]);assert.equal(monthly[0].total,280000);assert.equal(monthly[0].hours,8);assert.equal(monthly[0].balance,270000);assert.deepEqual(monthly[0].workDetails,[detail]);
 const combined=consolidateArrears(monthly,'2026-11');assert.deepEqual(combined[0].workDetails,[detail]);assert.equal(combined[0].total,280000);
});
test('XLSX and PDF exports include detailed work entries',async()=>{
 const grouped=settlePayroll(sources,[]);const zip=await JSZip.loadAsync(await payrollXlsx(grouped,'slips','2026-08'));
 assert.match(await zip.file('xl/workbook.xml')!.async('string'),/Chi_tiet_cong_viec/);
 const sheets=await Promise.all(Object.values(zip.files).filter(file=>/^xl\/worksheets\/sheet\d+.xml$/.test(file.name)).map(file=>file.async('string')));assert.ok(sheets.join('').includes('Thi công tại công trình A'));
 const pdf=await payrollPdf(grouped,'slips','2026-08');assert.ok(pdf.length>1000);
});
