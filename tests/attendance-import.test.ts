import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {readFile} from 'node:fs/promises';
import {IMPORT_HEADERS,readAttendanceXlsx,previewAttendanceImport} from '../lib/attendance-import.ts';
const employee={userId:'employee',code:'NV001',name:'Nguyễn Văn An'};
const now=new Date('2026-11-25T13:00:00+07:00');
const source=(values:(string|number)[][])=>({date1904:false,rows:values.map((values,index)=>({line:index+2,values}))});
const row:(string|number)[]=['NV001','Nguyễn Văn An','2026-11-23','08:00','17:00',1,0,'Bổ sung bảng tháng'];
const preview=(rows:(string|number)[][],existing:any[]=[],skip=true)=>previewAttendanceImport(source(rows),[employee],existing,skip,now);
const escape=(value:string)=>value.replace(/&/g,'&amp;').replace(/</g,'&lt;');
async function fixture(data:(string|number)[][],formula=false){
 const zip=await JSZip.loadAsync(await readFile('public/templates/Mau_import_cham_cong.xlsx'));
 const lines=[IMPORT_HEADERS,...data].map((values,index)=>`<row r="${index+1}">${values.map((value,col)=>typeof value==='number'?`<c r="${String.fromCharCode(65+col)}${index+1}"><v>${value}</v></c>`:`<c r="${String.fromCharCode(65+col)}${index+1}" t="inlineStr">${formula&&index===1&&col===7?'<f>HYPERLINK("https://example.invalid")</f>':''}<is><t>${escape(value)}</t></is></c>`).join('')}</row>`).join('');
 const path='xl/worksheets/sheet1.xml',xml=await zip.file(path)!.async('string');zip.file(path,xml.replace(/<(?:[A-Za-z]+:)?sheetData[^>]*>[\s\S]*?<\/(?:[A-Za-z]+:)?sheetData>/,`<sheetData xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${lines}</sheetData>`));return zip.generateAsync({type:'nodebuffer'});
}
test('downloadable template is intentionally empty; guide examples are never imported',async()=>{
 await assert.rejects(()=>readAttendanceXlsx(Buffer.from([])),/XLSX_SIZE/);
 const file=await readFile('public/templates/Mau_import_cham_cong.xlsx');await assert.rejects(()=>readAttendanceXlsx(file),/XLSX_EMPTY/);
});
test('actual workbook structure parses correctly with real Excel numeric dates/times',async()=>{
 const serial=(Date.parse('2026-11-23T00:00:00Z')-Date.UTC(1899,11,30))/86400000;
 const parsed=await readAttendanceXlsx(await fixture([[...row.slice(0,2),serial,8/24,17/24,1,0,'Nhập từ Excel']]));
 const result=previewAttendanceImport(parsed,[employee],[],true,now)[0];assert.equal(result.status,'ready');assert.equal(result.candidate?.minutes,480);assert.equal(result.day,'2026-11-23');
});
test('formulas are rejected even with cached or inline values',async()=>{
 const parsed=await readAttendanceXlsx(await fixture([row],true));assert.equal(previewAttendanceImport(parsed,[employee],[],true,now)[0].status,'error');
});
test('dates, lunch, overnight shifts and completed shifts from today are handled',()=>{
 const result=preview([row,['NV001','Nguyễn Văn An','24/11/2026','22:00','06:00','0,5',1,'Ca đêm']]);assert.deepEqual(result.map(r=>r.status),['ready','ready']);assert.equal(result[1].candidate?.minutes,450);
 assert.equal(preview([[...row.slice(0,2),'2026-11-25','08:00','12:00',0,0,'Sáng nay']])[0].status,'ready');
});
test('duplicate dates are skipped without overwrite or rejected in strict mode',()=>{
 const entry={userId:'employee',day:'2026-11-23',start:'2026-11-23T01:00:00Z',end:'2026-11-23T10:00:00Z'};
 assert.equal(preview([row],[entry])[0].status,'skip');assert.equal(preview([row],[entry],false)[0].status,'error');assert.equal(preview([row,row])[1].status,'error');
});
test('rejects mismatched employee identities and impossible or future times',()=>{
 for(const change of [{0:'UNKNOWN'},{1:'Sai tên'},{2:'2026-02-30'},{2:'2026-11-26'},{3:'17:00',4:'08:00'},{5:12},{6:2},{3:'08:00:30'}]){const copy=[...row];for(const [key,value] of Object.entries(change))copy[Number(key)]=value!;assert.equal(preview([copy])[0].status,'error')}
});
test('overlapping overnight shifts are blocked against existing and planned rows',()=>{
 const first=['NV001','Nguyễn Văn An','2026-11-22','22:00','10:00',0,1,'Đêm'];assert.equal(preview([first,row])[1].status,'error');
 assert.equal(preview([row],[{userId:'employee',day:'2026-11-21',start:'2026-11-21T01:00:00Z',end:null}])[0].status,'error');
});
test('Excel 1904 calendar and leading-zero employee codes are preserved',()=>{
 const employee={userId:'e',code:'00123',name:'Nhân Viên'};const result=previewAttendanceImport({date1904:true,rows:[{line:2,values:['00123','Nhân Viên',0,8/24,9/24,0,0,'']} ]},[employee],[],true,now)[0];assert.equal(result.status,'ready');assert.equal(result.day,'1904-01-01');assert.match(result.candidate!.reason,/Excel/);
});
test('incorrect headers and malicious XML are rejected',async()=>{
 const zip=await JSZip.loadAsync(await fixture([row]));const path='xl/worksheets/sheet1.xml';zip.file(path,'<!DOCTYPE x [<!ENTITY x "evil">]><worksheet/>');
 const bytes=await zip.generateAsync({type:'nodebuffer'});await assert.rejects(()=>readAttendanceXlsx(bytes),/XLSX_INVALID/);
});

test('changed column headings are rejected before accepting data',async()=>{
 const zip=await JSZip.loadAsync(await fixture([row]));const path='xl/worksheets/sheet1.xml';zip.file(path,(await zip.file(path)!.async('string')).replace('Mã nhân viên','Mã khác'));const bytes=await zip.generateAsync({type:'nodebuffer'});await assert.rejects(()=>readAttendanceXlsx(bytes),/XLSX_HEADERS/);
});
