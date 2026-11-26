import {createHash,randomBytes} from 'node:crypto';
export const VERIFICATION_TTL=10*60*1000;
export function verificationToken(){const token=randomBytes(32).toString('hex');return {token,digest:tokenDigest(token)}}
export function tokenDigest(token:string){return createHash('sha256').update(token).digest('hex')}
export function validVerificationToken(token:unknown):token is string{return typeof token==='string'&&/^[a-f0-9]{64}$/.test(token)}
export function verificationThrottle(previous:{sentAt:number;windowStart:number;sends:number},time=Date.now()){
 if(previous.sentAt&&time-previous.sentAt<60000)return 'VERIFICATION_COOLDOWN';
 if(time-previous.windowStart<3600000&&previous.sends>=5)return 'VERIFICATION_LIMIT';
 return null;
}
export function verificationMailConfigured(){return !!(process.env.RESEND_API_KEY&&(process.env.AUTH_MAIL_FROM||process.env.ATTENDANCE_MAIL_FROM))}
export function verificationLink(token:string){const url=new URL(process.env.APP_ORIGIN||'https://bridge-mate.vercel.app');if(url.protocol!=='https:'&&url.hostname!=='localhost')throw Error('MAIL_CONFIG');url.pathname='/';url.search='';url.hash='';url.searchParams.set('verifyEmail',token);return url.toString()}
export async function sendVerificationEmail(email:string,token:string,id:string){
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.AUTH_MAIL_FROM||process.env.ATTENDANCE_MAIL_FROM,to:[email],subject:'BridgeMate | Xác thực email đăng ký',text:`Bạn vừa yêu cầu tạo tài khoản BridgeMate. Bấm liên kết sau để xác thực email và hoàn tất đăng ký:\n\n${verificationLink(token)}\n\nLiên kết có hiệu lực 10 phút và chỉ sử dụng một lần. Nếu bạn không yêu cầu đăng ký, hãy bỏ qua email này.`}),signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('VERIFICATION_SEND_FAILED');
}
