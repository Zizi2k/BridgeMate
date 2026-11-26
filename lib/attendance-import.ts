import {fromBuffer} from 'yauzl';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {localDay,payableShiftMinutes} from './attendance.ts';
import {validDay} from './personal-workspace.ts';
import {overlapsAttendance} from './attendance-supplement.ts';
export const IMPORT_HEADERS=['Mã nhân viên','Họ và tên','Ngày','Giờ vào','Giờ ra','Nghỉ trưa (giờ)','Qua đêm (0/1)','Lý do / ghi chú'];
export const IMPORT_MAX_ROWS=5000,IMPORT_MAX_BYTES=3*1024*1024;
const array=(value:any):any[]=>value===undefined?[]:Array.isArray(value)?value:[value];
function xml(text:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(text)||XMLValidator.validate(text)!==true)throw Error('XLSX_INVALID');
 let depth=0;for(const token of text.matchAll(/<\/?[^>]+>/g)){if(/^<\//.test(token[0]))depth--;else if(!/^<[!?]/.test(token[0])&&!/\/>$/.test(token[0]))depth++;if(depth>60||depth<0)throw Error('XLSX_INVALID')}
 return new XMLParser({ignoreAttributes:false,removeNSPrefix:true,parseTagValue:false,trimValues:false}).parse(text);
}
async function readZip(buffer:Buffer){
 if(buffer.length>IMPORT_MAX_BYTES||buffer.length<4)throw Error('XLSX_SIZE');
 return new Promise<Map<string,string>>((resolve,reject)=>{fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(error,zip)=>{
  if(error||!zip){reject(Error('XLSX_INVALID'));return}const result=new Map<string,string>();let count=0,total=0,settled=false;
  const fail=()=>{if(!settled){settled=true;zip.close();reject(Error('XLSX_INVALID'))}};
  zip.on('error',fail);zip.on('end',()=>{if(!settled){settled=true;resolve(result)}});
  zip.on('entry',entry=>{
   if(++count>1500||entry.uncompressedSize>16*1024*1024||(total+=entry.uncompressedSize)>32*1024*1024||/vbaProject|externalLinks/i.test(entry.fileName)){fail();return}
   if(!/^(xl\/(workbook.xml|sharedStrings.xml|_rels\/workbook.xml.rels|worksheets\/sheet\d+.xml))$/.test(entry.fileName)){zip.readEntry();return}
   if(result.has(entry.fileName)){fail();return}
   zip.openReadStream(entry,(err,stream)=>{if(err||!stream){fail();return}let length=0;const chunks:Buffer[]=[];stream.on('error',fail);stream.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>16*1024*1024){stream.destroy();fail()}else chunks.push(chunk)});stream.on('end',()=>{if(settled)return;result.set(entry.fileName,Buffer.concat(chunks).toString('utf8'));zip.readEntry()})});
  });zip.readEntry();
 })});
}
function text(value:any):string{if(value===undefined)return '';if(typeof value!=='object')return String(value);if(Array.isArray(value))return value.map(text).join('');return text(value.t??value['#text']??value.r)}
export type ImportSourceRow={line:number;values:(string|number)[];error?:string};
export async function readAttendanceXlsx(buffer:Buffer):Promise<{rows:ImportSourceRow[];date1904:boolean}>{
 const files=await readZip(buffer);const workbook=xml(files.get('xl/workbook.xml')||'').workbook;
 const sheet=array(workbook?.sheets?.sheet).find(s=>s['@_name']==='Cham_cong');if(!sheet)throw Error('XLSX_SHEET');
 const relations=array(xml(files.get('xl/_rels/workbook.xml.rels')||'').Relationships?.Relationship);
 const relation=relations.find(r=>r['@_Id']===sheet['@_id']);if(!relation||relation['@_TargetMode']==='External')throw Error('XLSX_INVALID');
 const target=String(relation['@_Target']||'').replace(/^\/xl\//,'').replace(/^xl\//,'');if(!/^worksheets\/sheet\d+.xml$/.test(target))throw Error('XLSX_INVALID');
 const shared=files.has('xl/sharedStrings.xml')?array(xml(files.get('xl/sharedStrings.xml')!).sst?.si).map(text):[];
 const raw=array(xml(files.get('xl/'+target)||'').worksheet?.sheetData?.row);const rows:ImportSourceRow[]=[];const rowNumbers=new Set<number>();let header:string[]|null=null;
 for(const row of raw){const line=Number(row['@_r']);if(!Number.isInteger(line)||line<1||line>100000||rowNumbers.has(line))throw Error('XLSX_INVALID');rowNumbers.add(line);const values:(string|number)[]=Array(8).fill('');let error='';const cells=new Set<string>();
  for(const cell of array(row.c)){
   const ref=String(cell['@_r']||'');if(cells.has(ref))throw Error('XLSX_INVALID');cells.add(ref);if(cell.f!==undefined)error='Không dùng công thức trong vùng nhập dữ liệu; hãy dán giá trị.';
   const type=cell['@_t'];let value:string|number='';
   if(type==='inlineStr')value=text(cell.is);else if(type==='s'){const index=Number(cell.v);if(!Number.isInteger(index)||shared[index]===undefined)throw Error('XLSX_INVALID');value=shared[index]}else if(cell.v!==undefined){const content=String(cell.v);value=type==='str'||type==='d'?content:Number.isFinite(Number(content))?Number(content):content}
   if(!/^([A-H])([1-9]\d*)$/.test(ref)){if(String(value).trim())error='Chỉ dùng 8 cột A–H theo file mẫu.';continue}
   if(Number(ref.slice(1))!==line)throw Error('XLSX_INVALID');values[ref.charCodeAt(0)-65]=value;
  }
  if(line===1){if(error)throw Error('XLSX_HEADERS');header=values.map(v=>String(v).trim());continue}
  if(values.every(v=>String(v).trim()==='')&&!error)continue;rows.push({line,values,...error?{error}:{}});if(rows.length>IMPORT_MAX_ROWS)throw Error('XLSX_ROWS');
 }
 if(!header||header.some((v,i)=>v!==IMPORT_HEADERS[i]))throw Error('XLSX_HEADERS');if(!rows.length)throw Error('XLSX_EMPTY');
 return {rows,date1904:['1','true'].includes(String(workbook.workbookPr?.['@_date1904']))};
}
function dateValue(value:string|number,date1904:boolean){
 if(typeof value==='number'){if(!Number.isInteger(value)||value<0||value>80000||!date1904&&value===60)throw Error('Ngày Excel không hợp lệ.');const epoch=date1904?Date.UTC(1904,0,1):Date.UTC(1899,11,30);return new Date(epoch+(value+(!date1904&&value<60?1:0))*86400000).toISOString().slice(0,10)}
 const raw=value.trim();if(/^\d{2}\/\d{2}\/\d{4}$/.test(raw))return raw.split('/').reverse().join('-');return raw;
}
function clockValue(value:string|number){
 if(typeof value==='number'){const minutes=Math.round(value*1440);if(value<0||value>=1||Math.abs(value*1440-minutes)>0.00001||minutes>=1440)throw Error('Giờ phải có độ chính xác đến phút.');return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`}
 const raw=value.trim().replace(/:00$/,'');if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value.trim()))return value.trim();if(/^(?:[01]\d|2[0-3]):[0-5]\d:00$/.test(value.trim()))return raw;throw Error('Giờ phải theo HH:mm, ví dụ 08:00.');
}
export type ImportCandidate={line:number;userId:string;code:string;name:string;day:string;start:string;end:string;breakMinutes:number;reason:string;minutes:number};
export type ImportPreview={line:number;code:string;name:string;day:string;status:'ready'|'skip'|'error';message:string;candidate?:ImportCandidate};
const normalizeName=(value:string)=>value.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
export function previewAttendanceImport(source:{rows:ImportSourceRow[];date1904:boolean},employees:{userId:string;code:string;name:string}[],existing:any[],skipExisting=true,currentTime=new Date()):ImportPreview[]{
 const byUser=new Map<string,any[]>();for(const entry of existing){const rows=byUser.get(entry.userId)||[];rows.push(entry);byUser.set(entry.userId,rows)}
 const byCode=new Map(employees.map(employee=>[employee.code,employee]));const seen=new Set<string>();const accepted=new Map<string,ImportCandidate[]>();
 return source.rows.map(row=>{
  const [codeRaw,nameRaw,dayRaw,startRaw,endRaw,breakRaw,overnightRaw,reasonRaw]=row.values;
  const code=String(codeRaw).trim().toUpperCase(),name=String(nameRaw).trim();let day=String(dayRaw),candidate:ImportCandidate;
  try{
   if(row.error)throw Error(row.error);const employee=byCode.get(code);if(!employee)throw Error('Mã nhân viên chưa được admin cấp hoặc không còn hợp lệ.');if(normalizeName(name)!==normalizeName(employee.name))throw Error('Họ tên không khớp mã nhân viên.');
   day=dateValue(dayRaw,source.date1904);if(!validDay(day)||day>localDay(currentTime)||day<'1900-01-01')throw Error('Ngày không hợp lệ hoặc nằm trong tương lai.');const key=employee.userId+':'+day;if(seen.has(key))throw Error('Trùng mã nhân viên và ngày ngay trong file Excel.');seen.add(key);
   const startClock=clockValue(startRaw),endClock=clockValue(endRaw);const overnight=String(overnightRaw).trim()||'0';if(!['0','1'].includes(overnight))throw Error('Qua đêm chỉ nhận 0 hoặc 1.');
   const next=new Date(day+'T00:00:00Z');if(overnight==='1')next.setUTCDate(next.getUTCDate()+1);
   const start=new Date(day+'T'+startClock+':00+07:00').toISOString(),end=new Date(next.toISOString().slice(0,10)+'T'+endClock+':00+07:00').toISOString();if(Date.parse(end)>+currentTime)throw Error('Giờ ra nằm trong tương lai.');
   const breakHours=String(breakRaw).trim()===''?0:Number(String(breakRaw).replace(',','.'));const breakMinutes=Math.round(breakHours*60);if(!Number.isFinite(breakHours)||breakHours<0||Math.abs(breakHours*60-breakMinutes)>0.00001)throw Error('Nghỉ trưa phải là số giờ hợp lệ.');
   let minutes:number;try{minutes=payableShiftMinutes(start,end,breakMinutes)}catch{throw Error('Giờ ra phải sau giờ vào; ca tối đa 24 giờ và nghỉ trưa không vượt thời lượng ca.')}
   const reason=String(reasonRaw).trim()||'Nhập chấm công từ Excel (admin xác nhận)';if(reason.length>1000)throw Error('Ghi chú tối đa 1.000 ký tự.');
   candidate={line:row.line,userId:employee.userId,code:employee.code,name:employee.name,day,start,end,breakMinutes,reason,minutes};
   const own=byUser.get(employee.userId)||[];if(own.some(entry=>entry.day===day&&entry.kind!=='other')){if(!skipExisting)throw Error('Ngày đã có chấm công thường trên hệ thống.');return {line:row.line,code,name,day,status:'skip',message:'Ngày đã có chấm công thường: bỏ qua, không ghi đè.'}}
   const planned=accepted.get(employee.userId)||[];if(overlapsAttendance(start,end,[...own,...planned]))throw Error('Ca làm chồng với ca khác hoặc ca chưa chấm ra.');planned.push(candidate);accepted.set(employee.userId,planned);
   return {line:row.line,code,name,day,status:'ready',message:'Hợp lệ',candidate};
  }catch(error){return {line:row.line,code,name,day,status:'error',message:error instanceof Error?error.message:'Dữ liệu không hợp lệ.'}}
 });
}
