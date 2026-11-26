import {localDay,netShiftMinutes} from './attendance.ts';
import {validDay} from './personal-workspace.ts';
export function addScheduleDays(day:string,days:number){const date=new Date(day+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10)}
export function scheduleWeek(day=localDay()){
 if(!validDay(day)||!/^(19|20)\d{2}-/.test(day))throw Error('INVALID_WEEK');
 const weekday=new Date(day+'T00:00:00Z').getUTCDay();return addScheduleDays(day,-((weekday+6)%7));
}
export function plannedShift(body:Record<string,unknown>,currentTime=new Date()){
 const day=typeof body.day==='string'?body.day:'',start=body.start,end=body.end,overnight=body.overnight;
 const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
 if(!validDay(day)||typeof start!=='string'||typeof end!=='string'||!clock.test(start)||!clock.test(end)||typeof overnight!=='boolean')throw Error('INVALID_SCHEDULE');
 const from=new Date(day+'T'+start+':00+07:00').toISOString(),to=new Date(addScheduleDays(day,overnight?1:0)+'T'+end+':00+07:00').toISOString();
 if(Date.parse(from)<=+currentTime)throw Error('SCHEDULE_PAST');
 const breakMinutes=body.breakMinutes??0;let minutes:number;try{minutes=netShiftMinutes(from,to,breakMinutes as number)}catch{throw Error('INVALID_SCHEDULE')}
 const note=typeof body.note==='string'?body.note.trim():'';if(note.length>1000||'note'in body&&typeof body.note!=='string')throw Error('INVALID_SCHEDULE');
 return {day,start:from,end:to,overnight:overnight?1:0,breakMinutes:breakMinutes as number,note,minutes};
}
export function scheduleOverlaps(start:string,end:string,rows:{start:string;end:string}[]){return rows.some(row=>Date.parse(start)<Date.parse(row.end)&&Date.parse(end)>Date.parse(row.start))}

export function scheduleCapacityAllows(capacity:number|null,participants:Iterable<string>,userId:string){const ids=new Set(participants);return ids.has(userId)||(capacity!==null&&Number.isInteger(capacity)&&capacity>ids.size)}
export function validScheduleCapacity(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=10000}
