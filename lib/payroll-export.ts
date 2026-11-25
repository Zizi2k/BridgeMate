import JSZip from 'jszip';
import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {groupPayrollReport,type PayrollReportRow} from './payroll-report.ts';
const xml=(value:unknown)=>String(value??'').replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const money=(value:number)=>Math.round(value).toLocaleString('vi-VN')+' đ';
const clock=(value:number)=>value.toLocaleString('vi-VN',{maximumFractionDigits:2});
const reportTitle=(period:string)=>period.length===4?'NĂM '+period:'THÁNG '+period.slice(5)+'/'+period.slice(0,4);
export type Cell={value:string|number;style?:number};
export type Sheet={name:string;rows:Cell[][];widths:number[];merges?:string[];freeze?:number;landscape?:boolean;filter?:string;repeatRow?:number};
const cell=(value:string|number,style=3):Cell=>({value,style});
const col=(index:number)=>{let result='';for(let n=index+1;n>0;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result};
function mergedWidth(sheet:Sheet,row:number,column:number){
 const merge=sheet.merges?.find(range=>range.startsWith(col(column)+String(row+1)+':'));
 if(!merge)return sheet.widths[column]||20;
 const end=merge.split(':')[1].replace(/[0-9]/g,'');let endIndex=0;for(const char of end)endIndex=endIndex*26+char.charCodeAt(0)-64;
 return sheet.widths.slice(column,endIndex).reduce((sum,width)=>sum+width,0);
}
function sheetXml(sheet:Sheet){
 const rows=sheet.rows.map((row,index)=>`<row r="${index+1}" ht="${index===0?32:Math.min(360,Math.max(26,...row.map((item,c)=>typeof item.value==='string'?item.value.split('\n').reduce((sum,line)=>sum+Math.max(1,Math.ceil(line.length/Math.max(8,mergedWidth(sheet,index,c)-2))),0)*15:26)))}" customHeight="1">${row.map((item,c)=>typeof item.value==='number'?`<c r="${col(c)}${index+1}" s="${item.style??3}" t="n"><v>${Number.isFinite(item.value)?item.value:0}</v></c>`:`<c r="${col(c)}${index+1}" s="${item.style??3}" t="inlineStr"><is><t xml:space="preserve">${xml(item.value)}</t></is></c>`).join('')}</row>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0">${sheet.freeze?`<pane ySplit="${sheet.freeze}" topLeftCell="A${sheet.freeze+1}" activePane="bottomLeft" state="frozen"/>`:''}</sheetView></sheetViews><cols>${sheet.widths.map((width,i)=>`<col min="${i+1}" max="${i+1}" width="${width}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${sheet.filter?`<autoFilter ref="${sheet.filter}"/>`:''}${sheet.merges?.length?`<mergeCells count="${sheet.merges.length}">${sheet.merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:''}<printOptions horizontalCentered="1"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup paperSize="9" orientation="${sheet.landscape?'landscape':'portrait'}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="16"/><color rgb="FF174E3A"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF174E3A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD0DAD5"/></left><right style="thin"><color rgb="FFD0DAD5"/></right><top style="thin"><color rgb="FFD0DAD5"/></top><bottom style="thin"><color rgb="FFD0DAD5"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
export async function payrollXlsx(input:Record<string,any>[],kind:'ledger'|'slips',period:string,company=''){
 const rows=groupPayrollReport(input),headers=['Kỳ lương','Phòng ban','Mã nhân viên','Họ tên','Tổng giờ','Tổng lương','Hoa hồng','Tiền đã ứng','Đã thanh toán','Còn phải trả'];
 const reportRows=(items:PayrollReportRow[])=>items.map(row=>[cell(row.period),cell(row.departmentName),cell(row.employeeCode),cell(row.worker),cell(row.hours,4),cell(row.total,5),cell(row.commission,5),cell(row.advance,5),cell(row.paid,5),cell(row.balance,5)]);
 const ledger:Sheet={name:kind==='ledger'?'Bang_luong':'Danh_sach_phieu',widths:[14,26,18,30,14,20,18,18,20,20],freeze:3,landscape:true,merges:['A1:J1','A2:J2'],filter:`A3:J${Math.max(3,rows.length+3)}`,rows:[[cell('BẢNG LƯƠNG '+reportTitle(period),1)],[cell(company||'BridgeMate',1)],headers.map(value=>cell(value,2)),...reportRows(rows)]};
 ledger.rows.push([cell('TỔNG CỘNG'),cell(''),cell(''),cell(''),...(['hours','total','commission','advance','paid','balance'] as const).map(field=>cell(rows.reduce((sum,row)=>sum+row[field],0),field==='hours'?4:5))]);
 const sheets=[ledger];
 if(kind==='slips')for(const [index,row] of rows.entries())sheets.push({name:`PL_${index+1}_${row.period.replace('-','_')}`,widths:[26,22,20,24],merges:['A1:D1','A2:D2','B3:D3','B4:D4','B5:D5','B6:D6','B7:D7','A8:D8','A9:C9','A10:C10','A11:C11','A12:C12','A13:C13','A14:C14','A15:C15','A17:B17','C17:D17'],rows:[
  [cell(company||'BridgeMate',1)],[cell((row.isConsolidated?'PHIẾU LƯƠNG CỘNG GỘP ':'PHIẾU LƯƠNG ')+reportTitle(row.period),1)],
  [cell('Họ và tên'),cell(row.worker)],[cell('Mã nhân viên'),cell(row.employeeCode)],[cell('Phòng ban'),cell(row.departmentName)],[cell('Giờ thực làm'),cell(row.hours,4)],row.isConsolidated?[cell('Kỳ gộp'),cell(row.fromPeriod+' đến '+row.period)]:[],[cell('THU NHẬP VÀ THANH TOÁN',2)],
  [cell('Nội dung',2),cell('',2),cell('',2),cell('Số tiền (đ)',2)],
  [cell('Lương chính'),cell(''),cell(''),cell(row.total-row.commission,5)],[cell('Hoa hồng'),cell(''),cell(''),cell(row.commission,5)],
  [cell('Tổng lương'),cell(''),cell(''),cell(row.total,5)],[cell('Tiền đã ứng'),cell(''),cell(''),cell(row.advance,5)],[cell('Đã thanh toán'),cell(''),cell(''),cell(row.paid,5)],[cell('Còn phải trả'),cell(''),cell(''),cell(row.balance,5)],[],[cell('Người lập phiếu'),cell(''),cell('Người nhận')],
 ]});
 const details=rows.flatMap(row=>row.isConsolidated?row.periods||[]:[]);
 if(details.length)sheets.push({name:'Chi_tiet_cong_no',widths:ledger.widths,freeze:3,landscape:true,merges:['A1:J1','A2:J2'],rows:[[cell('CHI TIẾT CÔNG NỢ TỪNG KỲ',1)],[cell(company||'BridgeMate',1)],headers.map(value=>cell(value,2)),...reportRows(details)]});
 const workDetails=rows.flatMap(row=>(row.workDetails||[]).map(item=>({row,item})));
 if(workDetails.length)sheets.push({name:'Chi_tiet_cong_viec',widths:[18,28,14,30,22,12,18,18,20,70],freeze:1,landscape:true,rows:[['Mã NV','Họ tên','Ngày','Công việc','Cách tính','Số giờ','Đơn giá','Tiền công việc','Cộng/trừ vào lương','Ghi chú'].map(value=>cell(value,2)),...workDetails.map(({row,item})=>[cell(row.employeeCode),cell(row.worker),cell(item.day),cell(item.title),cell(item.kind==='replace'?'Đổi đơn giá trong ca':'Cộng ngoài ca'),cell(item.minutes/60,4),cell(item.rate,5),cell(item.earned,5),cell(item.amount,5),cell(item.note)])]});
 return xlsxWorkbook(sheets);
}
export async function xlsxWorkbook(sheets:Sheet[]){
 const zip=new JSZip();
 zip.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
 zip.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
 zip.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet,i)=>`<sheet name="${xml(sheet.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets><definedNames>${sheets.map((sheet,i)=>i===0||sheet.repeatRow?`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">'${sheet.name}'!$${sheet.repeatRow||3}:$${sheet.repeatRow||3}</definedName>`:'').join('')}</definedNames></workbook>`);
 zip.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="styles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
 zip.file('xl/styles.xml',styles);sheets.forEach((sheet,i)=>zip.file(`xl/worksheets/sheet${i+1}.xml`,sheetXml(sheet)));
 return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
}
function lines(text:string,font:PDFFont,size:number,width:number,max=2){
 const words=String(text).replace(/[\r\n\t]/g,' ').split(/\s+/),result:string[]=[];let current='';
 for(const word of words){let next=current?current+' '+word:word;if(font.widthOfTextAtSize(next,size)<=width){current=next;continue}if(current)result.push(current);current=word;if(result.length>=max)break;while(font.widthOfTextAtSize(current,size)>width&&current.length>1){let cut=current.length-1;while(cut>1&&font.widthOfTextAtSize(current.slice(0,cut)+'…',size)>width)cut--;result.push(current.slice(0,cut)+'…');current=current.slice(cut);if(result.length>=max)break}}
 if(result.length<max&&current)result.push(current);
 return result.slice(0,max).map(line=>{while(line.length>1&&font.widthOfTextAtSize(line,size)>width)line=line.slice(0,-2)+'…';return line});
}
export async function payrollPdf(input:Record<string,any>[],kind:'ledger'|'slips',period:string,template:Record<string,any>={}){
 const rows=groupPayrollReport(input),doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(await readFile(join(process.cwd(),'public/fonts/form-noto-sans.ttf')),{subset:true});
 const green=rgb(.09,.29,.22),grey=rgb(.82,.86,.84);
 const text=(page:PDFPage,value:string,x:number,y:number,size=10,width=520,max=2)=>{for(const [index,line] of lines(value,font,size,width,max).entries())page.drawText(line,{x,y:y-index*(size+3),font,size,color:rgb(.12,.16,.14)})};
 if(kind==='slips'){
  for(const row of rows){const page=doc.addPage([595.28,841.89]);text(page,template.company||'BridgeMate',40,793,14,515,2);if(template.address)text(page,template.address,40,756,10,515,2);
   page.drawRectangle({x:38,y:680,width:519,height:44,color:green});page.drawText(row.isConsolidated?'PHIẾU LƯƠNG CỘNG GỘP':'PHIẾU LƯƠNG '+reportTitle(row.period),{x:52,y:695,font,size:16,color:rgb(1,1,1)});
   text(page,'Họ và tên: '+row.worker,48,650,12,495,2);text(page,'Mã nhân viên: '+row.employeeCode,48,608,11);text(page,'Phòng ban: '+row.departmentName,48,580,11);text(page,'Giờ thực làm: '+clock(row.hours)+' giờ',48,548,11);
   if(row.isConsolidated)text(page,'Cộng gộp từ '+row.fromPeriod+' đến '+row.period,48,533,11);
   const entries=[['Lương chính',row.total-row.commission],['Hoa hồng',row.commission],['Tổng lương',row.total],['Tiền đã ứng',row.advance],['Đã thanh toán',row.paid],['Còn phải trả',row.balance]] as const;
   let y=496;for(const [label,value] of entries){page.drawRectangle({x:42,y:y-12,width:511,height:39,borderColor:grey,borderWidth:.7});text(page,label,54,y,12);text(page,money(value),330,y,12,210,1);y-=39}
   text(page,'Người lập phiếu',72,205,11);text(page,'Người nhận',385,205,11);text(page,'Ký và ghi rõ họ tên',65,180,10);text(page,'Ký và ghi rõ họ tên',375,180,10);
   if(row.isConsolidated&&row.periods?.length){
    const widths=[83,107,107,107,107],headers=['Kỳ lương','Tổng lương','Tiền đã ứng','Đã thanh toán','Còn phải trả'];let detailPage:PDFPage,y=0;
    const addDetailPage=()=>{detailPage=doc.addPage([595.28,841.89]);text(detailPage,'CHI TIẾT CÔNG NỢ TỪNG KỲ',42,795,16,511,1);text(detailPage,row.employeeCode+' · '+row.worker,42,766,11,511,2);text(detailPage,'Cộng gộp từ '+row.fromPeriod+' đến '+row.period,42,728,10,511,1);let x=42;headers.forEach((heading,i)=>{detailPage.drawRectangle({x,y:680,width:widths[i],height:30,color:green});detailPage.drawText(heading,{x:x+5,y:691,font,size:9,color:rgb(1,1,1)});x+=widths[i]});y=680};
    addDetailPage();
    for(const detail of row.periods){if(y<90)addDetailPage();let x=42;const values=[detail.period,money(detail.total),money(detail.advance),money(detail.paid),money(detail.balance)];values.forEach((value,i)=>{detailPage.drawRectangle({x,y:y-34,width:widths[i],height:34,borderWidth:.5,borderColor:grey});text(detailPage,value,x+5,y-14,9,widths[i]-10,2);x+=widths[i]});y-=34}
   }

  }
 }else{
  const widths=[60,93,72,132,50,91,88,88,88],headers=['Kỳ lương','Phòng ban','Mã NV','Họ tên','Giờ','Tổng lương','Đã ứng','Đã thanh toán','Còn phải trả'];let page:PDFPage,y=0;
  function addPage(){page=doc.addPage([841.89,595.28]);text(page,template.company||'BridgeMate',28,562,11,785,1);text(page,'BẢNG LƯƠNG '+reportTitle(period),28,534,16,785,1);let x=28;headers.forEach((heading,i)=>{page.drawRectangle({x,y:480,width:widths[i],height:32,color:green});page.drawText(heading,{x:x+5,y:491,font,size:9,color:rgb(1,1,1)});x+=widths[i]});y=480}
  addPage();
  for(const row of rows){if(y<88)addPage();let x=28;const values=[row.period,row.departmentName,row.employeeCode,row.worker,clock(row.hours),money(row.total),money(row.advance),money(row.paid),money(row.balance)];values.forEach((value,i)=>{page.drawRectangle({x,y:y-38,width:widths[i],height:38,borderWidth:.5,borderColor:grey});text(page,value,x+5,y-14,9,widths[i]-10,2);x+=widths[i]});y-=38}
  if(y<100)addPage();text(page!,'TỔNG LƯƠNG: '+money(rows.reduce((sum,row)=>sum+row.total,0)),28,y-28,12,780,1);text(page!,'Đã ứng: '+money(rows.reduce((sum,row)=>sum+row.advance,0))+' · Đã thanh toán: '+money(rows.reduce((sum,row)=>sum+row.paid,0))+' · Còn phải trả: '+money(rows.reduce((sum,row)=>sum+row.balance,0)),28,y-49,11,780,1);
 }
 for(const row of rows){if(!row.workDetails?.length)continue;
  let page:PDFPage,y=0;const next=()=>{page=doc.addPage([595.28,841.89]);text(page,'CHI TIẾT CÔNG VIỆC VÀ ĐƠN GIÁ RIÊNG',40,795,14,515,1);text(page,row.worker+' · '+row.employeeCode+' · '+row.period,40,766,11,515,2);y=719};next();
  for(const item of row.workDetails){
   const content=[item.day+' · '+item.title,(item.kind==='replace'?'Đổi đơn giá trong ca':'Cộng công ngoài ca')+' · '+(item.basis==='hour'?clock(item.minutes/60)+' giờ × '+money(item.rate)+'/giờ':'Trọn công việc: '+money(item.rate)),'Tiền công việc: '+money(item.earned)+' · Phần cộng/trừ vào lương: '+money(item.amount),'Ghi chú: '+item.note];
   for(const paragraph of content)for(const line of lines(paragraph,font,10,510,100)){if(y<65)next();text(page!,line,42,y,10,510,1);y-=15}y-=18;
  }
 }
 if(!doc.getPageCount()){const page=doc.addPage();text(page,'Không có phiếu lương phù hợp với bộ lọc đã chọn.',40,780,12)}
 const pages=doc.getPages();pages.forEach((page,index)=>text(page,`BridgeMate · ${index+1}/${pages.length}`,28,22,9,page.getWidth()-56,1));
 doc.setTitle((kind==='ledger'?'Bảng lương ':'Phiếu lương ')+period);return doc.save();
}
