import {attendanceShiftPay} from './attendance-rates';
import {priceReplacements,type WorkDetail} from './daily-work';
import {createHash} from 'node:crypto';
import {and,eq,lt} from 'drizzle-orm';
import {getDb} from '../db';
import {attendanceEntries,employeeAssignments,payrollEntries,accountDepartments} from '../db/schema';
import {localDay,monthMinutes} from './attendance';
export async function attendancePayroll(period:string,commit=false,onlyMissing=false,departmentId?:string,employeeId?:string,keepRate=false){
 const db=getDb();
 const employees=await db.select().from(employeeAssignments);
 const memberships=await db.select().from(accountDepartments).where(eq(accountDepartments.status,'approved'));
 const result:Array<Record<string,any>>=[];
 for(const employee of employees){
  if(employeeId&&employee.userId!==employeeId)continue;
  const employeeDepartment=memberships.find(row=>row.userId===employee.userId)?.departmentId||'';
  if(departmentId&&employeeDepartment!==departmentId)continue;
  await db.transaction(async tx=>{
  const [freshEmployee]=await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,employee.userId)).for('update');if(!freshEmployee)return;
  const entries=await tx.select().from(attendanceEntries).where(and(eq(attendanceEntries.userId,employee.userId),lt(attendanceEntries.day,period+'-32')));
  const shifts=entries.filter(row=>row.userId===employee.userId&&row.end);
  const minutes=shifts.reduce((sum,row)=>sum+monthMinutes(row.day,row.start,row.end!,period,row.breakMinutes),0);
  const id=createHash('sha256').update('attendance:'+employee.userId+':'+period).digest('hex').slice(0,36);
  const [existing]=await tx.select().from(payrollEntries).where(eq(payrollEntries.id,id));
  const previous=(existing?.data||{}) as Record<string,any>;
  const payrollDepartment=previous.departmentId||employeeDepartment;
  if(departmentId&&payrollDepartment!==departmentId)return;
  const relevant=shifts.filter(row=>monthMinutes(row.day,row.start,row.end!,period)>0);
  const workRows=await tx.select().from(payrollEntries).where(eq(payrollEntries.scopeId,'team:daily-work'));
  const works=workRows.filter(row=>{const d=row.data as any;return d.recipientId===employee.userId&&d.period===period&&d.departmentId===payrollDepartment});
  if(onlyMissing&&existing&&previous.syncedAt&&relevant.every(row=>row.updatedAt<=previous.syncedAt)&&works.every(row=>(row.data as any).updatedAt<=previous.syncedAt))return;
  const rate=(onlyMissing||keepRate)&&existing?previous.rate:freshEmployee.rate;
  const priced=attendanceShiftPay(shifts,period,rate);
  const total=priced.total+(previous.commission||0);
  const data={work:'Chấm công tháng '+period,worker:employee.name,period,recipientId:employee.userId,employeeCode:employee.code,
   departmentId:payrollDepartment,mode:'hour',rate,hours:minutes/60,workDate:'',start:'',end:'',plan:'',advance:previous.advance||0,revenue:previous.revenue||0,
   commission:previous.commission||0,workDetails:priced.details,total,balance:total-(previous.advance||0),profit:(previous.revenue||0)-total,source:'attendance',syncedAt:new Date().toISOString()};
  if(commit)await tx.insert(payrollEntries).values({id,scopeId:'team:attendance',data}).onDuplicateKeyUpdate({set:{data}});
  const details=priceReplacements(works.map(row=>(row.data as any).workDetails[0] as WorkDetail).sort((a,b)=>a.id.localeCompare(b.id)),rate);
  if(commit)for(const work of works){const old=work.data as any,detail=details.find(item=>item.id===work.id)!;await tx.update(payrollEntries).set({data:{...old,total:detail.amount,balance:detail.amount,profit:-detail.amount,workDetails:[detail]}}).where(eq(payrollEntries.id,work.id))}
  result.push({...data,id,total:data.total+details.reduce((sum,item)=>sum+item.amount,0),balance:data.total+details.reduce((sum,item)=>sum+item.amount,0)-data.advance,hours:data.hours+details.filter(item=>item.kind==='extra').reduce((sum,item)=>sum+item.minutes/60,0),workDetails:[...priced.details,...details]});
  });
 }
 return result;
}
export async function closeAttendanceMonths(){
 const rows=await getDb().select({day:attendanceEntries.day}).from(attendanceEntries);
 const workRows=await getDb().select().from(payrollEntries).where(eq(payrollEntries.scopeId,'team:daily-work'));
 const current=localDay().slice(0,7);
 const periods=rows.flatMap(row=>{const start=row.day.slice(0,7);const next=new Date(row.day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);return [start,next.toISOString().slice(0,7)]});
 for(const period of [...new Set([...periods,...workRows.map(row=>(row.data as any).period as string)])].filter(period=>period<current))await attendancePayroll(period,true,true);
}
