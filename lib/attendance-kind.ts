export function attendanceKind(body:Record<string,unknown>){
 const kind=body.kind??'regular';if(kind!=='regular'&&kind!=='other')throw Error('INVALID_ATTENDANCE_KIND');
 const workLabel=typeof body.workLabel==='string'?body.workLabel.trim():'';
 if(kind==='other'&&(!workLabel||workLabel.length>180))throw Error('WORK_LABEL_REQUIRED');
 return {kind,workLabel:kind==='other'?workLabel:''} as {kind:'regular'|'other';workLabel:string};
}
export function regularAttendanceExists(rows:{day:string;kind?:string|null}[],day:string){return rows.some(row=>row.day===day&&row.kind!=='other')}
