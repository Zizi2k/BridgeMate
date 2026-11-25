import {localDay,monthMinutes} from './attendance.ts';
export type ReportPerson={id:string;code:string;name:string;departmentId:string;departmentName:string};
export type ReportDay={day:string;weekday:string;start:string;end:string;breakMinutes:number;minutes:number;status:string;notes:string};
export type PersonAttendance={person:ReportPerson;days:ReportDay[];minutes:number;completed:number;open:number};
export type AttendanceReport={period:string;generatedAt:string;people:PersonAttendance[]};
export function buildAttendanceReport(period:string,people:ReportPerson[],entries:any[],audits:any[]=[],jobs:any[]=[],today=localDay()):AttendanceReport{
 if(!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(period))throw Error('INVALID_PERIOD');
 const [year,month]=period.split('-').map(Number),count=new Date(Date.UTC(year,month,0)).getUTCDate();
 const from=Date.parse(period+'-01T00:00:00+07:00');
 const time=(value:string)=>localDay(new Date(value)).split('-').reverse().join('/')+' '+new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value));
 return {period,generatedAt:new Date().toISOString(),people:people.map(person=>{
  const shifts=entries.filter(entry=>entry.userId===person.id&&(entry.day.startsWith(period)||entry.end&&Date.parse(entry.start)<from&&Date.parse(entry.end)>from));
  const days:ReportDay[]=[];
  for(let number=1;number<=count;number++){
   const day=period+'-'+String(number).padStart(2,'0');
   const matched=shifts.filter(entry=>entry.day===day||number===1&&entry.day<day);
   const dailyJobs=jobs.filter(job=>job.recipientId===person.id&&job.workDate===day);
   const jobNotes=dailyJobs.flatMap(job=>(job.workDetails||[]).map((item:any)=>`${item.title} · ${item.kind==='replace'?'Đổi đơn giá trong ca':'Công ngoài ca'} · ${item.basis==='hour'?item.minutes/60+' giờ × ':''}${Number(item.rate).toLocaleString('vi-VN')} đ. Ghi chú: ${item.note}`)).join('\n');
   const weekday=['CN','T2','T3','T4','T5','T6','T7'][new Date(day+'T00:00:00Z').getUTCDay()];
   if(!matched.length){days.push({day,weekday,start:'',end:'',breakMinutes:0,minutes:0,status:day>today?'Chưa đến ngày':'Chưa có chấm công',notes:jobNotes});continue}
   for(const entry of matched){
    const history=audits.filter(audit=>audit.entryId===entry.id).flatMap(audit=>{
     const data=audit.data||{};const reason=data.after?.reason||data.reason||(data.action==='attendance-supplement'?data.reason:'');
     const label=data.action==='evidence-change-request'?'Yêu cầu đổi ảnh':data.action==='attendance-supplement'?'Bổ sung chấm công':'Chỉnh sửa';
     return reason?[`${time(audit.createdAt)} · ${audit.actorName||'Người có quyền'} · ${label}: ${reason}`]:[];
    });
    const notes=[entry.supplemented?'Chấm công bổ sung':'',entry.day<day?'Ca chuyển từ ngày '+entry.day:'',entry.reason?'Lý do hiện tại: '+entry.reason:'',...history,jobNotes].filter(Boolean).join('\n');
    let minutes=0;if(entry.end)minutes=monthMinutes(entry.day,entry.start,entry.end,period,entry.breakMinutes||0);
    days.push({day,weekday,start:time(entry.start),end:entry.end?time(entry.end):'',breakMinutes:entry.breakMinutes||0,minutes,status:entry.end?'Đủ giờ vào/ra':'Chưa chấm ra',notes});
   }
  }
  return {person,days,minutes:days.reduce((sum,day)=>sum+day.minutes,0),completed:new Set(days.filter(day=>day.status==='Đủ giờ vào/ra').map(day=>day.day)).size,open:days.filter(day=>day.status==='Chưa chấm ra').length};
 })};
}
