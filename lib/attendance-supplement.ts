import {localDay,netShiftMinutes} from './attendance.ts';
import {validDay} from './personal-workspace.ts';
export function historicalAttendance(input:Record<string,unknown>,currentTime=new Date()){
 const day=typeof input.day==='string'?input.day:'';
 const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
 if(!validDay(day)||day>=localDay(currentTime)||typeof input.start!=='string'||typeof input.end!=='string'||!clock.test(input.start)||!clock.test(input.end)||typeof input.overnight!=='boolean')throw Error('INVALID_PAST_ATTENDANCE');
 const next=new Date(day+'T00:00:00Z');if(input.overnight)next.setUTCDate(next.getUTCDate()+1);
 const start=new Date(day+'T'+input.start+':00+07:00').toISOString(),end=new Date(next.toISOString().slice(0,10)+'T'+input.end+':00+07:00').toISOString();
 if(Date.parse(end)>currentTime.getTime())throw Error('INVALID_PAST_ATTENDANCE');
 const breakMinutes=input.breakMinutes??0;
 if(typeof breakMinutes!=='number')throw Error('INVALID_BREAK');
 netShiftMinutes(start,end,breakMinutes);
 const reason=typeof input.reason==='string'?input.reason.trim():'';
 if(!reason||reason.length>1000)throw Error('VALIDATION');
 return {day,start,end,breakMinutes,reason};
}
export function overlapsAttendance(start:string,end:string,entries:{start:string;end:string|null}[]){
 const from=Date.parse(start),to=Date.parse(end);
 return entries.some(entry=>Date.parse(entry.start)<to&&(entry.end===null||Date.parse(entry.end)>from));
}
