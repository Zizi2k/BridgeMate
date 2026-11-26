import test from 'node:test';
import assert from 'node:assert/strict';
import {clockLocation,clockPhoto} from '../lib/clock-proof.ts';
import {currentClockLocation} from '../lib/browser-location.ts';
import {buildAttendanceReport} from '../lib/attendance-report.ts';
const now=new Date('2026-11-26T01:00:00Z');
const point={latitude:10.957,longitude:106.843,accuracy:15,capturedAt:'2026-11-26T00:59:30Z'};
const photo={name:'proof.png',mime:'image/png',data:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jgAkAAAAASUVORK5CYII='};
test('requires bounded fresh numeric device coordinates; stores server receive time',()=>{
 const result=clockLocation(point,now);assert.equal(result.receivedAt,now.toISOString());assert.equal(result.latitude,point.latitude);
 for(const invalid of [null,{}, {...point,latitude:'10'}, {...point,latitude:91}, {...point,longitude:-181}, {...point,accuracy:-1}, {...point,accuracy:Infinity}, {...point,capturedAt:'invalid'}, {...point,capturedAt:'2026-11-26T00:40:00Z'}, {...point,capturedAt:'2026-11-26T02:00:00Z'}])assert.throws(()=>clockLocation(invalid,now),/LOCATION_REQUIRED/);
});
test('photo is mandatory for normal clock and optional only for supplemental input',()=>{
 assert.throws(()=>clockPhoto(null),/PHOTO_REQUIRED/);assert.equal(clockPhoto(null,false),null);
 assert.equal(clockPhoto(photo)?.mime,'image/png');assert.throws(()=>clockPhoto({...photo,data:''}),/PHOTO_REQUIRED/);assert.throws(()=>clockPhoto({...photo,data:'bad!!'}),/PHOTO_REQUIRED/);assert.throws(()=>clockPhoto({...photo,name:'file.txt',mime:'text/plain'}),/PHOTO_REQUIRED/);
});
test('retains all accepted image formats safely and bounds image size',()=>{
 assert.equal(clockPhoto({name:'proof.heic',mime:'',data:Buffer.from('camera image').toString('base64')})?.mime,'application/octet-stream');
 assert.equal(clockPhoto({name:'proof.svg',mime:'image/svg+xml',data:Buffer.from('<svg/>').toString('base64')})?.mime,'application/octet-stream');
 assert.throws(()=>clockPhoto({...photo,data:Buffer.alloc(3*1024*1024+1).toString('base64')}),/PHOTO_REQUIRED/);
});
test('browser requests a fresh high-accuracy position and explains denied access',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'navigator');let options:any;
 try{
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition:(success:any,_error:any,settings:any)=>{options=settings;success({coords:point,timestamp:+now})}}}});
  const result=await currentClockLocation();assert.equal(result.latitude,point.latitude);assert.equal(options.maximumAge,0);assert.equal(options.enableHighAccuracy,true);assert.equal(options.timeout,20000);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition:(_success:any,error:any)=>error({code:1})}}});await assert.rejects(()=>currentClockLocation(),/cho phép truy cập vị trí/);
 }finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete (globalThis as any).navigator}
});
test('authorized report includes both recorded clock locations without requiring them on old or manual shifts',()=>{
 const person={id:'a',code:'NV01',name:'Nhân viên',departmentId:'d',departmentName:'Kỹ thuật'};
 const shift={id:'s',userId:'a',day:'2026-11-24',start:'2026-11-24T01:00:00Z',end:'2026-11-24T10:00:00Z',breakMinutes:60,locations:{in:point,out:{...point,latitude:10.96}}};
 const result=buildAttendanceReport('2026-11',[person],[shift]);assert.match(result.people[0].days[23].notes,/Vị trí vào: 10.957000/);assert.match(result.people[0].days[23].notes,/Vị trí ra: 10.960000/);
 const old=buildAttendanceReport('2026-11',[person],[{...shift,locations:null}]);assert.equal(old.people[0].minutes,480);
});
