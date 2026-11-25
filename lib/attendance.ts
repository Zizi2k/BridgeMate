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
export function monthMinutes(day:string,start:string,end:string,period:string,breakMinutes=0){
 const gross=shiftMinutes(start,end),net=netShiftMinutes(start,end,breakMinutes);
 if(gross===0)return 0;
 const [year,month]=period.split('-').map(Number);
 const from=Date.parse(`${period}-01T00:00:00+07:00`);
 const to=Date.UTC(year,month,1)-7*3600000;
 const elapsed=(boundary:number)=>Math.max(0,Math.min(gross,Math.floor((boundary-Date.parse(start))/60000)));
 // Allocate net minutes across boundaries without losing or duplicating a minute.
 return Math.max(0,Math.floor(elapsed(to)*net/gross)-Math.floor(elapsed(from)*net/gross));
}
