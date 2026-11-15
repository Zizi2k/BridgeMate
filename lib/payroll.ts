export const employeeCodePattern = /^[A-Z0-9][A-Z0-9_-]{0,31}$/;
export const payPeriodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
export const normalizeEmployeeCode = (code: string) => code.trim().toUpperCase();

export function payrollData(input:Record<string,unknown>, team=false){
 const read=(key:string)=>typeof input[key]==='string'?String(input[key]).trim():'';
 const work=read('work'), worker=read('worker'), plan=read('plan'), period=read('period');
 const mode=input.mode;
 const recipientId=team?read('recipientId'):'';
 const employeeCode=team?normalizeEmployeeCode(read('employeeCode')):'';
 if(Boolean(recipientId)!==Boolean(employeeCode)||
    (recipientId&&(recipientId.length>36||!employeeCodePattern.test(employeeCode))))return null;
 if(!work||work.length>180||!worker||worker.length>120||plan.length>2000||
    !payPeriodPattern.test(period)||(mode!=='hour'&&mode!=='month'))return null;
 const {rate,hours,advance,revenue,commission}=input;
 const money=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=1e12;
 if(!money(rate)||!money(advance)||!money(revenue)||!money(commission)||
    typeof hours!=='number'||!Number.isFinite(hours)||hours<0||hours>744)return null;
 const workDate=read('workDate'), start=read('start'), end=read('end');
 let minutes:number|null=null;
 if(workDate||start||end||(team&&mode==='hour')){
  const date=new Date(workDate+'T00:00:00Z');
  const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(workDate)||!Number.isFinite(+date)||
     date.toISOString().slice(0,10)!==workDate||workDate.slice(0,7)!==period||
     !clock.test(start)||!clock.test(end)||end<=start)return null;
  const minute=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
  minutes=minute(end)-minute(start);
 }
 const workedHours=minutes===null?(mode==='hour'?hours:0):minutes/60;
 const total=(mode==='hour'?Math.round(rate*workedHours):rate)+commission;
 return {work,worker,plan,period,recipientId,employeeCode,mode:mode as 'hour'|'month',rate,hours:workedHours,workDate,start,end,advance,revenue,commission,
  total,balance:total-advance,profit:revenue-total};
}


export const payrollWorkerKey=(worker:string)=>worker.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');

export function payrollEntryWorkerKey(entry:{worker:string;recipientId?:string;employeeCode?:string}){
 return entry.recipientId?'account:'+entry.recipientId+':'+entry.employeeCode:'name:'+payrollWorkerKey(entry.worker);
}

export function payrollByWorker<T extends {worker:string;recipientId?:string;employeeCode?:string;hours:number;total:number;advance:number;balance:number}>(rows:T[]){
 const groups=new Map<string,{name:string;employeeCode?:string;count:number;hours:number;total:number;advance:number;balance:number}>();
 for(const row of rows){
  const key=payrollEntryWorkerKey(row);
  const group=groups.get(key)||{name:row.worker,employeeCode:row.employeeCode,count:0,hours:0,total:0,advance:0,balance:0};
  group.count++;group.hours+=row.hours;group.total+=row.total;group.advance+=row.advance;group.balance+=row.balance;
  groups.set(key,group);
 }
 return [...groups.entries()].sort(([,a],[,b])=>a.name.localeCompare(b.name,'vi'));
}

export function summarizePayslip(rows: (NonNullable<ReturnType<typeof payrollData>> & {id:string})[]){
 const first=rows[0];
 if(!first)return null;
 const sum=(field:'total'|'advance'|'commission'|'balance')=>rows.reduce((value,row)=>value+row[field],0);
 return {
  id:first.id, worker:first.worker, employeeCode:first.employeeCode, period:first.period,
  work:[...new Set(rows.map(row=>row.work))].join(', '),
  total:sum('total'), advance:sum('advance'), commission:sum('commission'), balance:sum('balance'),
 };
}
