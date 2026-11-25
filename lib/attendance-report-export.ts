import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {xlsxWorkbook,type Cell,type Sheet} from './payroll-export.ts';
import type {AttendanceReport} from './attendance-report.ts';
const c=(value:string|number,style=3):Cell=>({value,style});
const date=(value:string)=>value.split('-').reverse().join('/');
const duration=(minutes:number)=>`${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,'0')}`;
const hours=(minutes:number)=>Math.round(minutes/60*10000)/10000;
export async function attendanceReportXlsx(report:AttendanceReport,company='BridgeMate'){
 const title='BẢNG CHẤM CÔNG THÁNG '+report.period.slice(5)+'/'+report.period.slice(0,4);
 const summary:Sheet={name:'Tong_hop_cham_cong',widths:[7,18,30,28,16,18,16],landscape:true,freeze:5,repeatRow:5,merges:['A1:G1','A2:G2','A3:G3','A4:G4'],rows:[[c(company,1)],[c(title,1)],[c('TỔNG HỢP TẬP THỂ',1)],[c('Giờ Việt Nam (UTC+7) · Chỉ cộng giờ thực làm thuộc tháng, đã trừ nghỉ trưa.')],['STT','Mã nhân viên','Họ và tên','Phòng ban','Ngày đủ vào/ra','Giờ thực làm','Ca chưa ra'].map(value=>c(value,2)),...report.people.map((item,index)=>[c(index+1),c(item.person.code),c(item.person.name),c(item.person.departmentName),c(item.completed),c(hours(item.minutes),4),c(item.open)])]};
 summary.rows.push([c('TỔNG'),c(''),c(''),c(''),c(report.people.reduce((a,b)=>a+b.completed,0)),c(hours(report.people.reduce((a,b)=>a+b.minutes,0)),4),c(report.people.reduce((a,b)=>a+b.open,0))]);
 const sheets:Sheet[]=[summary];
 report.people.forEach((item,index)=>{
  const headers=['Ngày','Thứ','Giờ vào (ngày giờ)','Giờ ra (ngày giờ)','Nghỉ trưa (phút/ca)','Giờ thực làm trong tháng','Trạng thái','Lý do / lịch sử / ghi chú công việc'];
  const rows:Cell[][]=[[c(company,1)],[c(title,1)],[c(`${item.person.code} · ${item.person.name} · ${item.person.departmentName}`,1)],[c('Giờ Việt Nam (UTC+7). Ca qua tháng chỉ cộng phần giờ thuộc tháng. Chưa chấm công không đồng nghĩa nghỉ không phép.')],headers.map(value=>c(value,2)),...item.days.flatMap(day=>(day.notes.match(/[\s\S]{1,1000}/g)||['']).map((note,index)=>[c(index===0?date(day.day):'Tiếp '+date(day.day)),c(index===0?day.weekday:''),c(index===0?day.start:''),c(index===0?day.end:''),c(index===0?day.breakMinutes:''),c(index===0?hours(day.minutes):'',4),c(index===0?day.status:'Ghi chú tiếp'),c(note)]))];
  rows.push([c('TỔNG GIỜ'),c(''),c(''),c(''),c(''),c(hours(item.minutes),4),c(''),c(`${item.completed} ngày đủ vào/ra · ${item.open} ca chưa ra`)],[],[c('Người lập bảng'),c(''),c('Người kiểm tra'),c(''),c(''),c('Người lao động')]);
  sheets.push({name:'NV_'+String(index+1).padStart(3,'0'),rows,widths:[12,6,22,22,12,14,20,60],landscape:true,freeze:5,repeatRow:5,merges:['A1:H1','A2:H2','A3:H3','A4:H4']});
 });
 return xlsxWorkbook(sheets);
}
function wrap(value:string,font:PDFFont,size:number,width:number){
 const result:string[]=[];
 for(const paragraph of String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'').split('\n')){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   const candidate=line?line+' '+word:word;
   if(font.widthOfTextAtSize(candidate,size)<=width){line=candidate;continue}
   if(line){result.push(line);line=''}
   for(const char of word){if(line&&font.widthOfTextAtSize(line+char,size)>width){result.push(line);line=''}line+=char}
  }
  result.push(line);
 }
 return result;
}

export async function attendanceReportPdf(report:AttendanceReport,company='BridgeMate'){
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);const font=await doc.embedFont(await readFile(join(process.cwd(),'public/fonts/form-noto-sans.ttf')),{subset:true});
 const green=rgb(.09,.29,.22),grey=rgb(.82,.86,.84),ink=rgb(.12,.16,.14);
 let page:PDFPage,y=0;
 const line=(text:string,x:number,baseline:number,size=9)=>page.drawText(text,{x,y:baseline,font,size,color:ink});
 const table=(subtitle:string,widths:number[],headers:string[],data:string[][],footer:string)=>{
  const startPage=()=>{page=doc.addPage([841.89,595.28]);wrap(company,font,11,782).slice(0,2).forEach((text,i)=>line(text,28,569-i*13,11));line('BẢNG CHẤM CÔNG THÁNG '+report.period.slice(5)+'/'+report.period.slice(0,4),28,535,15);for(const [i,text] of wrap(subtitle,font,10,782).entries())line(text,28,511-i*13,10);line('Giờ Việt Nam (UTC+7) · Giờ thực làm chỉ cộng phần thuộc tháng và đã trừ nghỉ trưa.',28,478,8);let x=28;headers.forEach((header,i)=>{page.drawRectangle({x,y:432,width:widths[i],height:34,color:green});wrap(header,font,8,widths[i]-8).slice(0,2).forEach((text,j)=>page.drawText(text,{x:x+4,y:451-j*11,font,size:8,color:rgb(1,1,1)}));x+=widths[i]});y=432};
  startPage();
  for(const values of data){const content=values.map((value,i)=>wrap(value,font,8,widths[i]-8));let offset=0;const maximum=Math.max(...content.map(lines=>lines.length));
   do{if(y<83)startPage();const capacity=Math.max(1,Math.floor((y-57)/11)-1);const count=Math.min(maximum-offset,capacity);const height=Math.max(23,count*11+8);let x=28;
    content.forEach((lines,i)=>{page.drawRectangle({x,y:y-height,width:widths[i],height,borderWidth:.5,borderColor:grey});const shown=lines.slice(offset,offset+count);if(!shown.length&&offset>0&&i<2&&lines[0])shown.push(lines[0]);shown.forEach((text,j)=>line(text,x+4,y-12-j*11,8));x+=widths[i]});y-=height;offset+=count;
   }while(offset<maximum);
  }
  if(y<125)startPage();line(footer,28,y-22,10);line('Người lập bảng',70,y-55,10);line('Người kiểm tra',350,y-55,10);line('Người lao động / đại diện',620,y-55,10);
 };
 if(report.people.length!==1)table('TỔNG HỢP TẬP THỂ',[40,100,200,185,90,90,80],['STT','Mã NV','Họ tên','Phòng ban','Ngày đủ vào/ra','Giờ thực làm','Ca chưa ra'],report.people.map((item,index)=>[String(index+1),item.person.code,item.person.name,item.person.departmentName,String(item.completed),duration(item.minutes),String(item.open)]),'Tổng giờ thực làm tập thể: '+duration(report.people.reduce((sum,item)=>sum+item.minutes,0))+' giờ');
 for(const item of report.people)table(`${item.person.code} · ${item.person.name} · ${item.person.departmentName}`,[54,28,84,84,50,54,90,341],['Ngày','Thứ','Giờ vào','Giờ ra','Nghỉ trưa phút/ca','Giờ thực làm','Trạng thái','Lý do / lịch sử / ghi chú công việc'],item.days.map(day=>[date(day.day),day.weekday,day.start.startsWith(date(day.day)+' ')?day.start.slice(11):day.start,day.end.startsWith(date(day.day)+' ')?day.end.slice(11):day.end,String(day.breakMinutes),duration(day.minutes),day.status,day.notes]),`Tổng: ${duration(item.minutes)} giờ · ${item.completed} ngày đủ vào/ra · ${item.open} ca chưa ra`);
 if(!doc.getPageCount()){page=doc.addPage();line('Không có nhân viên phù hợp.',40,780,12)}
 const pages=doc.getPages();pages.forEach((p,i)=>p.drawText(`BridgeMate · Trang ${i+1}/${pages.length} · Chưa có chấm công không đồng nghĩa nghỉ không phép`,{x:28,y:20,font,size:8,color:ink}));doc.setTitle('Bảng chấm công '+report.period);return doc.save();
}
