import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {XMLValidator} from 'fast-xml-parser';
import {PDFDocument} from 'pdf-lib';
import {payrollBranding} from '../lib/payroll-branding.ts';
import {payrollXlsx,payrollPdf} from '../lib/payroll-export.ts';
const logo='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const row={id:'1',recipientId:'e',worker:'Nhân viên',employeeCode:'NV001',departmentId:'a',departmentName:'Ban A',period:'2026-11',hours:8,total:400000,advance:0,balance:400000,commission:0};
test('branding rejects remote images and overlong names',()=>{assert.throws(()=>payrollBranding({departmentTitle:'A',preparedBy:'B',logo:'https://example.com/a.png'}));assert.throws(()=>payrollBranding({departmentTitle:'x'.repeat(121),preparedBy:'B',logo:''}));assert.equal(payrollBranding({departmentTitle:' A ',preparedBy:' B ',logo}).preparedBy,'B')});
test('payslip XLSX embeds scoped logo and preparer with valid XML; PDF opens',async()=>{
 const branding={byDepartment:{a:{departmentTitle:'Ban thử nghiệm',preparedBy:'Người lập thử',logo},b:{departmentTitle:'Ban khác',preparedBy:'Người khác',logo:''}}};
 const bytes=await payrollXlsx([row,{...row,id:'2',departmentId:'b'}],'slips','2026-11','BridgeMate',branding);const zip=await JSZip.loadAsync(bytes);
 for(const [name,file] of Object.entries(zip.files))if(name.endsWith('.xml')||name.endsWith('.rels'))assert.equal(XMLValidator.validate(await file.async('string')),true,name);
 assert.ok(zip.file('xl/media/logo2.png'));assert.equal(zip.file('xl/media/logo3.png'),null);
 const sheet=await zip.file('xl/worksheets/sheet2.xml')!.async('string');assert.match(sheet,/Ban thử nghiệm/);assert.match(sheet,/Người lập thử/);assert.match(sheet,/drawing/);
 const other=await zip.file('xl/worksheets/sheet3.xml')!.async('string');assert.match(other,/Người khác/);assert.doesNotMatch(other,/Người lập thử/);
 const pdf=await PDFDocument.load(await payrollPdf([row],'slips','2026-11',branding));assert.equal(pdf.getPageCount(),1);
});
