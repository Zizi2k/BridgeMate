import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {XMLValidator} from 'fast-xml-parser';
import {PDFDocument} from 'pdf-lib';
import {canUploadEvidence,canReplaceEvidence,canRequestEvidenceChange} from '../lib/attendance-evidence.ts';
import {groupPayrollReport,payrollReportKey,validReportYear} from '../lib/payroll-report.ts';
import {payrollXlsx,payrollPdf} from '../lib/payroll-export.ts';
const base={id:'entry1',recipientId:'employee1',worker:'Nguyễn Văn An',employeeCode:'NV001',departmentId:'dept-a',departmentName:'Phòng Kỹ thuật',period:'2026-11',hours:8,total:400000,advance:50000,balance:350000,commission:0};
const data=[base,{...base,id:'entry2',hours:4,total:200000,advance:0,balance:200000},{...base,id:'entry3',period:'2026-12'},{...base,id:'entry4',recipientId:'employee2',worker:'Trần Thị Bình',employeeCode:'NV002'}];
test('managers may request changes but cannot upload or replace another employee evidence',()=>{
 assert.equal(canRequestEvidenceChange(false,true,false),true);
 assert.equal(canUploadEvidence(false,false,true),false);
 assert.equal(canReplaceEvidence(false,false,true),false);
 assert.equal(canRequestEvidenceChange(false,false,false),false);
 assert.equal(canRequestEvidenceChange(false,true,true),false);
});
test('a change request grants only the employee image replacement; admins retain full evidence authority',()=>{
 assert.equal(canReplaceEvidence(false,true,true),true);
 assert.equal(canReplaceEvidence(false,true,false),false);
 assert.equal(canUploadEvidence(false,true,false),false);
 assert.equal(canUploadEvidence(false,true,true),true);
 assert.equal(canReplaceEvidence(true,false,false),true);
 assert.equal(canUploadEvidence(true,false,false),true);
});
test('monthly payslips remain separated by employee, department and month in annual reports',()=>{
 const groups=groupPayrollReport(data);assert.equal(groups.length,3);
 const november=groups.find(row=>row.recipientId==='employee1'&&row.period==='2026-11')!;
 assert.equal(november.hours,12);assert.equal(november.total,600000);assert.equal(november.balance,550000);
 assert.notEqual(payrollReportKey(base),payrollReportKey({...base,departmentId:'dept-b'}));
 assert.notEqual(payrollReportKey(base),payrollReportKey({...base,period:'2026-12'}));
 for(const year of ['1900','2026','2100'])assert.equal(validReportYear(year),true);
 for(const year of ['2026-11','26','2101','2026%'])assert.equal(validReportYear(year),false);
});
test('XLSX includes valid XML, numeric salary cells, separate monthly slip sheets and inert text',async()=>{
 const bytes=await payrollXlsx([...data,{...base,id:'formula',recipientId:'other',worker:'=HYPERLINK("https://invalid.example")'}],'slips','2026','Trung tâm kiểm thử');
 const zip=await JSZip.loadAsync(bytes);
 for(const [name,file] of Object.entries(zip.files))if(name.endsWith('.xml')||name.endsWith('.rels'))assert.equal(XMLValidator.validate(await file.async('string')),true,name);
 const workbook=await zip.file('xl/workbook.xml')!.async('string');assert.equal((workbook.match(/<sheet /g)||[]).length,5);
 const ledger=await zip.file('xl/worksheets/sheet1.xml')!.async('string');
 assert.ok(ledger.includes('<v>600000</v>'));assert.ok(ledger.includes('HYPERLINK'));assert.ok(!ledger.includes('<f>'));
 const slip=await zip.file('xl/worksheets/sheet2.xml')!.async('string');assert.ok(slip.includes('PHIẾU LƯƠNG'));
});
test('PDF exports unicode payslips and a paginated yearly ledger',async()=>{
 const slips=await PDFDocument.load(await payrollPdf(data,'slips','2026',{company:'Trung tâm Kiểm thử Việt Nam'}));assert.equal(slips.getPageCount(),3);
 const many=Array.from({length:30},(_,index)=>({...base,id:'row'+index,recipientId:'worker'+index,worker:'Nguyễn Văn Nhân viên kiểm thử '+index}));
 const ledger=await PDFDocument.load(await payrollPdf(many,'ledger','2026',{}));assert.ok(ledger.getPageCount()>1);
 for(const page of ledger.getPages()){assert.ok(page.getWidth()>page.getHeight())}
});
