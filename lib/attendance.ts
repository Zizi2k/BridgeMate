export const localDay=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function shiftMinutes(start:string,end:string){
 const minutes=(Date.parse(end)-Date.parse(start))/60000;
 if(!Number.isFinite(minutes)||minutes<=0||minutes>24*60)throw Error('INVALID_SHIFT');
 return Math.floor(minutes);
}
export function monthMinutes(day:string,start:string,end:string,period:string){
 shiftMinutes(start,end);
 const [year,month]=period.split('-').map(Number);
 const from=Date.parse(`${period}-01T00:00:00+07:00`);
 const to=Date.UTC(year,month,1)-7*3600000;
 return Math.max(0,Math.floor((Math.min(Date.parse(end),to)-Math.max(Date.parse(start),from))/60000));
}
