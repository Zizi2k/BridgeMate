import {purgeAttendancePhotos} from '../../../../lib/attendance-photo-cleanup';
import {closeAttendanceMonths} from '../../../../lib/attendance-payroll';
export const runtime='nodejs';
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!=='Bearer '+secret)return Response.json({error:'UNAUTHORIZED'},{status:401});
 await purgeAttendancePhotos();
 await closeAttendanceMonths();
 return Response.json({ok:true});
}
