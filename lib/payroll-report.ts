import type {WorkDetail} from './daily-work';
export type PayrollReportRow={workDetails?:WorkDetail[];id:string;recipientId:string;worker:string;employeeCode:string;departmentId:string;departmentName:string;period:string;hours:number;total:number;advance:number;paid:number;balance:number;isConsolidated?:boolean;fromPeriod?:string;periods?:PayrollReportRow[];commission:number;work:string};
export const payrollIdentityKey=(row:Record<string,any>)=>JSON.stringify([row.recipientId||row.worker,row.departmentId||'']);
export const payrollReportKey=(row:Record<string,any>)=>JSON.stringify([row.recipientId||row.worker,row.departmentId||'',row.period]);
export function groupPayrollReport(rows:Record<string,any>[]):PayrollReportRow[]{
 const groups=new Map<string,PayrollReportRow>();
 for(const row of rows){
  const key=payrollReportKey(row);
  const group:PayrollReportRow=groups.get(key)||{id:row.id,recipientId:row.recipientId||'',worker:row.worker||'',employeeCode:row.employeeCode||'',departmentId:row.departmentId||'',departmentName:row.departmentName||'Chưa phân phòng ban',period:row.period||'',hours:0,total:0,advance:0,paid:0,balance:0,commission:0,isConsolidated:row.isConsolidated,fromPeriod:row.fromPeriod,periods:row.periods,work:row.work||'Chấm công và lương tháng'};
  const details=Array.isArray(row.workDetails)?row.workDetails:[];group.workDetails=[...(group.workDetails||[]),...details.filter((item:any)=>!(group.workDetails||[]).some(previous=>previous.id===item.id))];
  for(const field of ['hours','total','advance','paid','balance','commission'] as const){const value=Number(row[field]);group[field]+=Number.isFinite(value)?value:0}
  groups.set(key,group);
 }
 return [...groups.values()].sort((a,b)=>a.departmentName.localeCompare(b.departmentName,'vi')||a.worker.localeCompare(b.worker,'vi')||a.period.localeCompare(b.period));
}
export function validReportYear(year:string){return /^\d{4}$/.test(year)&&Number(year)>=1900&&Number(year)<=2100}
