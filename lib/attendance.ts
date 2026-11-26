export const localDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function shiftMinutes(start:string,end:string){
 const minutes=(Date.parse(end)-Date.parse(start))/60000;
 if(!Number.isFinite(minutes)||minutes<=0||minutes>24*60)throw Error('INVALID_SHIFT');
 return Math.floor(minutes);
}
export function netShiftMinutes(start:string,end:string,breakMinutes=0){
 const total=shiftMinutes(start,end);
 if(!Number.isInteger(breakMinutes)||breakMinutes<0||breakMinutes>total)throw Error('INVALID_BREAK');
 return total-breakMinutes;
}
// Attendance credit only: raw clock timestamps remain unchanged for evidence/audit.
export function attendanceBounds(start:string,end:string){
 shiftMinutes(start,end);
 const minute=60000,halfHour=30*minute;
 const from=Date.parse(start),to=Date.parse(end);
 const floor=Math.floor(from/halfHour)*halfHour,ceil=Math.ceil(to/halfHour)*halfHour;
 return {start:from-floor<=10*minute?floor:from,end:ceil-to<=10*minute?ceil:to};
}
export function payableShiftMinutes(start:string,end:string,breakMinutes=0){
 netShiftMinutes(start,end,breakMinutes);
 const bounds=attendanceBounds(start,end);
 return Math.floor((bounds.end-bounds.start)/60000)-breakMinutes;
}
export function monthMinutes(day:string,start:string,end:string,period:string,breakMinutes=0){
 const bounds=attendanceBounds(start,end);
 const gross=Math.floor((bounds.end-bounds.start)/60000),net=payableShiftMinutes(start,end,breakMinutes);
 if(gross===0)return 0;
 const [year,month]=period.split('-').map(Number);
 const from=Date.parse(`${period}-01T00:00:00+07:00`);
 const to=Date.UTC(year,month,1)-7*3600000;
 const elapsed=(boundary:number)=>Math.max(0,Math.min(gross,Math.floor((boundary-bounds.start)/60000)));
 // Allocate net minutes across boundaries without losing or duplicating a minute.
 return Math.max(0,Math.floor(elapsed(to)*net/gross)-Math.floor(elapsed(from)*net/gross));
}
