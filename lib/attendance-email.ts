import {createHash} from 'node:crypto';
import {eq,asc} from 'drizzle-orm';
import {getDb} from '../db';
import {users,employeeAssignments,accountDepartments,departments,accountAccess,removedAccounts,attendanceNotifications} from '../db/schema';
import {attendanceRecipients,attendanceMessage,type AttendanceMail} from './attendance-email-policy';
export const attendanceMailConfigured=()=>!!(process.env.RESEND_API_KEY&&process.env.ATTENDANCE_MAIL_FROM);
export async function queueAttendanceMail(tx:any,entryId:string,departmentId:string,data:AttendanceMail){
 const accounts=await tx.select({id:users.id,email:users.email,demo:users.demo,manager:employeeAssignments.manager,departmentId:accountDepartments.departmentId,status:accountDepartments.status,active:departments.active,suspended:accountAccess.suspended,removed:removedAccounts.userId}).from(users)
 .leftJoin(employeeAssignments,eq(employeeAssignments.userId,users.id)).leftJoin(accountDepartments,eq(accountDepartments.userId,users.id)).leftJoin(departments,eq(departments.id,accountDepartments.departmentId)).leftJoin(accountAccess,eq(accountAccess.userId,users.id)).leftJoin(removedAccounts,eq(removedAccounts.userId,users.id));
 const recipients=attendanceRecipients(accounts,departmentId,process.env.BRIDGEMATE_ADMIN_IDS||'');
 const payload={...attendanceMessage(data),departmentId};
 for(const recipient of recipients)await tx.insert(attendanceNotifications).values({id:createHash('sha256').update(`${entryId}:${data.action}:${recipient.id}`).digest('hex'),entryId,recipientId:recipient.id,email:recipient.email,payload,createdAt:new Date().toISOString()});
}
export async function flushAttendanceMail(limit=5){
 if(!attendanceMailConfigured())return {configured:false,sent:0};
 const db=getDb();let sent=0;
 const queued=await db.select({id:attendanceNotifications.id}).from(attendanceNotifications).where(eq(attendanceNotifications.status,'pending')).orderBy(asc(attendanceNotifications.createdAt)).limit(limit);
 for(const item of queued)await db.transaction(async tx=>{
  const [row]=await tx.select().from(attendanceNotifications).where(eq(attendanceNotifications.id,item.id)).for('update');
  if(!row||row.status!=='pending')return;
  // Stop ambiguous retries before the provider's 24-hour idempotency window expires.
  if(row.attempts>=5||row.firstAttemptAt&&Date.now()-Date.parse(row.firstAttemptAt)>23*3600000){await tx.update(attendanceNotifications).set({status:'failed',lastError:'RETRY_WINDOW_EXPIRED'}).where(eq(attendanceNotifications.id,row.id));return}
  const [recipient]=await tx.select({id:users.id,email:users.email,demo:users.demo,manager:employeeAssignments.manager,departmentId:accountDepartments.departmentId,status:accountDepartments.status,active:departments.active,suspended:accountAccess.suspended,removed:removedAccounts.userId}).from(users).leftJoin(employeeAssignments,eq(employeeAssignments.userId,users.id)).leftJoin(accountDepartments,eq(accountDepartments.userId,users.id)).leftJoin(departments,eq(departments.id,accountDepartments.departmentId)).leftJoin(accountAccess,eq(accountAccess.userId,users.id)).leftJoin(removedAccounts,eq(removedAccounts.userId,users.id)).where(eq(users.id,row.recipientId));
  const payload=row.payload as {subject:string;text:string;reply_to?:string;departmentId:string};
  if(!recipient||recipient.email.toLowerCase()!==row.email.toLowerCase()||!attendanceRecipients([recipient],payload.departmentId,process.env.BRIDGEMATE_ADMIN_IDS||'').length){await tx.update(attendanceNotifications).set({status:'cancelled',lastError:'RECIPIENT_NO_LONGER_AUTHORIZED'}).where(eq(attendanceNotifications.id,row.id));return}
  const attemptedAt=new Date().toISOString();let delivered=false,error='NETWORK_ERROR';
  try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':row.id},body:JSON.stringify({from:process.env.ATTENDANCE_MAIL_FROM,to:[row.email],subject:payload.subject,text:payload.text,reply_to:payload.reply_to}),signal:AbortSignal.timeout(7000)});delivered=response.ok;error=`PROVIDER_HTTP_${response.status}`;}catch{}
  await tx.update(attendanceNotifications).set({attempts:row.attempts+1,firstAttemptAt:row.firstAttemptAt||attemptedAt,status:delivered?'sent':'pending',sentAt:delivered?attemptedAt:null,lastError:delivered?'':error}).where(eq(attendanceNotifications.id,row.id));if(delivered)sent++;
 });
 return {configured:true,sent};
}
