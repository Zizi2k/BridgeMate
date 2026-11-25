import test from 'node:test';
import assert from 'node:assert/strict';
import {settlePayroll,consolidateArrears,allocateSalary,type SalaryPayment} from '../lib/payroll-arrears.ts';
import {payrollXlsx,payrollPdf} from '../lib/payroll-export.ts';
import {PDFDocument} from 'pdf-lib';
import JSZip from 'jszip';
const base={id:'wage1',recipientId:'employee1',worker:'Nguyễn Văn An',employeeCode:'NV001',departmentId:'dept-a',departmentName:'Phòng Kỹ thuật',period:'2026-08',hours:160,total:8000000,advance:1000000,balance:7000000,commission:0};
const payment=(period:string,amount:number,kind='salary',extra:Partial<SalaryPayment>={}):SalaryPayment=>({id:'payment'+period+kind,batchId:'batch',recipientId:'employee1',departmentId:'dept-a',period,kind,amount,voided:0,...extra});
test('advances and salary payments are deducted once after grouping all wage entries',()=>{
 const rows=[base,{...base,id:'wage2',total:2000000,advance:500000,balance:1500000}];
 const payments=[payment('2026-08',2000000),payment('2026-08',500000,'advance')];
 const settled=settlePayroll(rows,payments)[0];
 assert.equal(settled.total,10000000);assert.equal(settled.advance,2000000);assert.equal(settled.paid,2000000);assert.equal(settled.balance,6000000);
 assert.equal(settlePayroll(rows,payments)[0].balance,6000000);assert.equal(rows[0].advance,1000000);
});
test('voided transactions do not reduce salary and other departments never receive the deduction',()=>{
 const rows=[base,{...base,id:'wage-b',departmentId:'dept-b'}];
 const settled=settlePayroll(rows,[payment('2026-08',2000000),payment('2026-08',3000000,'advance',{voided:1})]);
 assert.equal(settled.find(row=>row.departmentId==='dept-a')!.balance,5000000);
 assert.equal(settled.find(row=>row.departmentId==='dept-b')!.balance,7000000);
});
test('strictly over two months triggers a consolidated statement including each unpaid period once',()=>{
 const rows=[base,{...base,id:'sep',period:'2026-09',total:9000000,advance:2000000},{...base,id:'nov',period:'2026-11',total:10000000,advance:1000000}];
 const settled=settlePayroll(rows,[payment('2026-08',3000000)]);
 assert.equal(consolidateArrears(settled,'2026-10').length,0);
 const combined=consolidateArrears(settled,'2026-11')[0];
 assert.equal(combined.periods!.length,3);assert.equal(combined.total,27000000);assert.equal(combined.advance,4000000);assert.equal(combined.paid,3000000);assert.equal(combined.balance,20000000);
 assert.equal(combined.fromPeriod,'2026-08');assert.equal(combined.isConsolidated,true);
});
test('fully paid old months do not trigger overdue consolidation, including across year boundaries',()=>{
 const settled=settlePayroll([base],[payment('2026-08',7000000)]);
 assert.equal(consolidateArrears(settled,'2026-11').length,0);
 const year=settlePayroll([{...base,period:'2025-12'}],[]);
 assert.equal(consolidateArrears(year,'2026-02').length,0);assert.equal(consolidateArrears(year,'2026-03').length,1);
});
test('FIFO payments settle oldest balances first and reject overpayments',()=>{
 const settled=settlePayroll([base,{...base,id:'sep',period:'2026-09',total:9000000,advance:1000000}],[]);
 assert.deepEqual(allocateSalary(settled,10000000,'2026-11',true),[{period:'2026-08',amount:7000000},{period:'2026-09',amount:3000000}]);
 assert.throws(()=>allocateSalary(settled,16000000,'2026-11',true));
 assert.throws(()=>allocateSalary(settled,1,'2026-11',false));
 for(const amount of [-1,0,1.5,Infinity])assert.throws(()=>allocateSalary(settled,amount,'2026-11',true));
});
test('advance credit is retained in combined totals and caps FIFO payments',()=>{
 const settled=settlePayroll([base,{...base,id:'credit',period:'2026-10',total:1000000,advance:3000000}],[]);
 assert.equal(consolidateArrears(settled,'2026-11')[0].balance,5000000);
 assert.throws(()=>allocateSalary(settled,5000001,'2026-11',true));
 assert.deepEqual(allocateSalary(settled,5000000,'2026-11',true),[{period:'2026-08',amount:5000000}]);
});
test('payslip exports contain advances, paid salary and a separate per-period debt breakdown',async()=>{
 const combined=consolidateArrears(settlePayroll([base,{...base,id:'nov',period:'2026-11'}],[payment('2026-08',2000000)]),'2026-11');
 const zip=await JSZip.loadAsync(await payrollXlsx(combined,'slips','2026-11','Trung tâm Kiểm thử'));
 const workbook=await zip.file('xl/workbook.xml')!.async('string');assert.ok(workbook.includes('Chi_tiet_cong_no'));
 const sheet=await zip.file('xl/worksheets/sheet2.xml')!.async('string');assert.ok(sheet.includes('Đã thanh toán'));assert.ok(sheet.includes('<v>2000000</v>'));
 const pdf=await PDFDocument.load(await payrollPdf(combined,'slips','2026-11',{}));assert.equal(pdf.getPageCount(),2);
});
