export type MailAccount={id:string;email:string;demo:number;manager?:number|null;departmentId?:string|null;status?:string|null;active?:number|null;suspended?:number|null;removed?:string|null};
export function attendanceRecipients(accounts:MailAccount[],departmentId:string,adminIds:string){
 const admins=new Set(adminIds.split(',').map(x=>x.trim()).filter(Boolean));
 return [...new Map(accounts.filter(a=>!a.demo&&!a.suspended&&!a.removed&&(admins.has(a.id)||!!departmentId&&!!a.manager&&a.departmentId===departmentId&&a.status==='approved'&&!!a.active)).map(a=>[a.email.trim().toLowerCase(),a])).values()];
}
export type AttendanceMail={name:string;code:string;department:string;action:'in'|'out';start:string;end?:string|null;breakMinutes:number;replyTo?:string};
export function attendanceMessage(data:AttendanceMail){
 const date=(value:string)=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
 const action=data.action==='in'?'VÀO':'RA';
 const subject=`[BridgeMate] Chấm công ${action} · ${data.code}`.replace(/[\r\n]/g,' ');
 const lines=[`Nhân viên: ${data.name}`,`Mã nhân viên: ${data.code}`,`Phòng ban: ${data.department||'Chưa có phòng ban'}`,`Chấm công: ${action}`,`Giờ vào: ${date(data.start)}`];
 if(data.end){lines.push(`Giờ ra: ${date(data.end)}`,`Nghỉ trưa: ${data.breakMinutes} phút`,`Giờ thực làm: ${(Math.max(0,Math.floor((Date.parse(data.end)-Date.parse(data.start))/60000)-data.breakMinutes)/60).toFixed(2)} giờ`)}
 lines.push('Múi giờ: Việt Nam (UTC+7)','Xem chấm công và ảnh minh chứng tại https://bridge-mate.vercel.app/ (cần đăng nhập).');
 return {subject,reply_to:data.replyTo,text:lines.join('\n')};
}
