import {createHash} from 'node:crypto';
import {and,eq,lt} from 'drizzle-orm';
import {getDb} from '../db';
import {attendanceEntries,employeeAssignments,payrollEntries} from '../db/schema';
import {localDay,monthMinutes} from './attendance';
export async function attendancePayroll(period:string,commit=false,onlyMissing=false){
 const db=getDb();
 const employees=await db.select().from(employeeAssignments);
 const entries=await db.select().from(attendanceEntries).where(lt(attendanceEntries.day,period+'-32'));
 const result=[];
 for(const employee of employees){
  const shifts=entries.filter(row=>row.userId===employee.userId&&row.end);
  const minutes=shifts.reduce((sum,row)=>sum+monthMinutes(row.day,row.start,row.end!,period),0);
  const id=createHash('sha256').update('attendance:'+employee.userId+':'+period).digest('hex').slice(0,36);
  const [existing]=await db.select().from(payrollEntries).where(eq(payrollEntries.id,id));
  const previous=(existing?.data||{}) as Record<string,any>;
  const relevant=shifts.filter(row=>monthMinutes(row.day,row.start,row.end!,period)>0);
  if(onlyMissing&&existing&&previous.syncedAt&&relevant.every(row=>row.updatedAt<=previous.syncedAt))continue;
  const rate=onlyMissing&&existing?previous.rate:employee.rate;
  const total=Math.round(minutes/60*rate)+(previous.commission||0);
  const data={work:'Chấm công tháng '+period,worker:employee.name,period,recipientId:employee.userId,employeeCode:employee.code,
   mode:'hour',rate,hours:minutes/60,workDate:'',start:'',end:'',plan:'',advance:previous.advance||0,revenue:previous.revenue||0,
   commission:previous.commission||0,total,balance:total-(previous.advance||0),profit:(previous.revenue||0)-total,source:'attendance',syncedAt:new Date().toISOString()};
  if(commit)await db.insert(payrollEntries).values({id,scopeId:'team:attendance',data}).onDuplicateKeyUpdate({set:{data}});
  result.push({...data,id});
 }
 return result;
}
export async function closeAttendanceMonths(){
 const rows=await getDb().select({day:attendanceEntries.day}).from(attendanceEntries);
 const current=localDay().slice(0,7);
 const periods=rows.flatMap(row=>{const start=row.day.slice(0,7);const next=new Date(row.day+'T00:00:00Z');next.setUTCDate(next.getUTCDate()+1);return [start,next.toISOString().slice(0,7)]});
 for(const period of [...new Set(periods)].filter(period=>period<current))await attendancePayroll(period,true,true);
}
