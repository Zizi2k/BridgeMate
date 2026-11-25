import {groupPayrollReport,payrollReportKey,type PayrollReportRow} from './payroll-report.ts';
export type SalaryPayment={id:string;batchId:string;recipientId:string;departmentId:string;period:string;kind:string;amount:number;voided:number;metadata?:any};
export function settlePayroll(rows:Record<string,any>[],payments:SalaryPayment[]):PayrollReportRow[]{
 const grouped=groupPayrollReport(rows),map=new Map(grouped.map(row=>[payrollReportKey(row),row]));
 for(const payment of payments){
  if(payment.voided)continue;
  const key=payrollReportKey({...payment,worker:payment.metadata?.worker});
  let row=map.get(key);
  if(!row){row=groupPayrollReport([{...payment.metadata,id:payment.id,recipientId:payment.recipientId,departmentId:payment.departmentId,period:payment.period,total:0,hours:0,advance:0,balance:0,commission:0}])[0];map.set(key,row)}
  if(payment.kind==='advance')row.advance+=payment.amount;else row.paid+=payment.amount;
 }
 return [...map.values()].map(row=>({...row,balance:row.total-row.advance-row.paid})).sort((a,b)=>a.period.localeCompare(b.period)||a.worker.localeCompare(b.worker,'vi'));
}
const monthIndex=(period:string)=>Number(period.slice(0,4))*12+Number(period.slice(5,7))-1;
export function consolidateArrears(rows:PayrollReportRow[],asOf:string):PayrollReportRow[]{
 const groups=new Map<string,PayrollReportRow[]>();
 for(const row of rows){if(row.period>asOf)continue;const key=JSON.stringify([row.recipientId||row.worker,row.departmentId]);const list=groups.get(key)||[];list.push(row);groups.set(key,list)}
 const result:PayrollReportRow[]=[];
 for(const list of groups.values()){
  if(!list.some(row=>row.balance>0&&monthIndex(asOf)-monthIndex(row.period)>2))continue;
  const periods=list.filter(row=>row.balance!==0||row.period===asOf).sort((a,b)=>a.period.localeCompare(b.period));
  const first=periods[0];if(!first)continue;
  const sum=(key:'total'|'advance'|'paid'|'balance'|'hours'|'commission')=>periods.reduce((total,row)=>total+row[key],0);
  if(sum('balance')<=0)continue;
  result.push({...first,id:'arrears:'+first.id,period:asOf,fromPeriod:first.period,isConsolidated:true,periods:periods.map(row=>({...row,periods:undefined})),total:sum('total'),advance:sum('advance'),paid:sum('paid'),balance:sum('balance'),hours:sum('hours'),commission:sum('commission'),work:'Lương cộng gộp từ '+first.period+' đến '+asOf});
 }
 return result;
}
export function allocateSalary(rows:PayrollReportRow[],amount:number,period:string,oldestFirst:boolean){
 if(!Number.isSafeInteger(amount)||amount<=0||amount>1e12)throw Error('INVALID_AMOUNT');
 const eligible=rows.filter(row=>row.period<=period);
 const capacity=oldestFirst?Math.max(0,eligible.reduce((sum,row)=>sum+row.balance,0)):Math.max(0,eligible.filter(row=>row.period===period).reduce((sum,row)=>sum+row.balance,0));
 if(amount>capacity)throw Error('PAYMENT_EXCEEDS_BALANCE');
 let remaining=amount;const allocations:{period:string;amount:number}[]=[];
 for(const row of eligible.filter(row=>row.balance>0&&(oldestFirst||row.period===period)).sort((a,b)=>a.period.localeCompare(b.period))){const paid=Math.min(remaining,row.balance);if(paid)allocations.push({period:row.period,amount:paid});remaining-=paid;if(!remaining)break}
 return allocations;
}
