import {MAX_EVIDENCE_BYTES,imageFilenameAllowed,evidencePreviewMime} from './attendance-evidence.ts';
export type ClockLocation={latitude:number;longitude:number;accuracy:number;capturedAt:string;receivedAt:string};
export function clockLocation(input:any,currentTime=new Date()):ClockLocation{
 if(!input||typeof input!=='object'||!Number.isFinite(input.latitude)||!Number.isFinite(input.longitude)||!Number.isFinite(input.accuracy)||Math.abs(input.latitude)>90||Math.abs(input.longitude)>180||input.accuracy<0||input.accuracy>1000000||typeof input.capturedAt!=='string'||!Number.isFinite(Date.parse(input.capturedAt))||Math.abs(+currentTime-Date.parse(input.capturedAt))>5*60000)throw Error('LOCATION_REQUIRED');
 return {latitude:input.latitude,longitude:input.longitude,accuracy:input.accuracy,capturedAt:new Date(input.capturedAt).toISOString(),receivedAt:currentTime.toISOString()};
}
export function clockPhoto(input:any,required=true){
 if(!input){if(required)throw Error('PHOTO_REQUIRED');return null}
 if(typeof input.name!=='string'||!input.name.trim()||input.name.length>180||typeof input.mime!=='string'||input.mime.length>120||!imageFilenameAllowed(input.name,input.mime)||typeof input.data!=='string'||!input.data||input.data.length>Math.ceil(MAX_EVIDENCE_BYTES/3)*4||input.data.length%4!==0||!/^[A-Za-z0-9+/]*={0,2}$/.test(input.data))throw Error('PHOTO_REQUIRED');
 const bytes=Buffer.from(input.data,'base64');if(!bytes.length||bytes.length>MAX_EVIDENCE_BYTES)throw Error('PHOTO_REQUIRED');
 return {name:input.name.trim(),mime:evidencePreviewMime(bytes)||'application/octet-stream',data:bytes.toString('base64')};
}
