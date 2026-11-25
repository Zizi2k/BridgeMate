import {lte} from 'drizzle-orm';
import {getDb} from '../db';
import {attendancePhotos} from '../db/schema';
export async function purgeAttendancePhotos(){await getDb().delete(attendancePhotos).where(lte(attendancePhotos.expiresAt,new Date().toISOString()))}
