import {localDay,monthMinutes,payableShiftMinutes} from './attendance.ts';
import type {WorkDetail} from './daily-work.ts';
export function shiftRateInput(input:Record<string,unknown>){
 const note=typeof input.payNote==='string'?input.payNote.trim():'';
 if(!note||note.length>1000)throw Error('RATE_REASON_REQUIRED');
 if(input.payBasis==='default')return {payBasis:null,payRate:null,payNote:note};
 if((input.payBasis!=='hour'&&input.payBasis!=='session')||typeof input.payRate!=='number'||!Number.isSafeInteger(input.payRate)||input.payRate<0||input.payRate>1e9)throw Error('INVALID_SHIFT_RATE');
 return {payBasis:input.payBasis as 'hour'|'session',payRate:input.payRate,payNote:note};
}
export type PricedShift={id:string;day:string;start:string;end:string|null;breakMinutes:number;payBasis?:string|null;payRate?:number|null;payNote?:string|null;workLabel?:string};
export function attendanceShiftPay(shifts:PricedShift[],period:string,baseRate:number){
 if(!Number.isSafeInteger(baseRate)||baseRate<0||baseRate>1e9)throw Error('INVALID_SHIFT_RATE');
 const details:(WorkDetail&{attendanceId:string})[]=[];let minutes=0,adjustment=0;
 for(const row of [...shifts].sort((a,b)=>a.start.localeCompare(b.start)||a.id.localeCompare(b.id))){
  if(!row.end)continue;
  const count=monthMinutes(row.day,row.start,row.end,period,row.breakMinutes);if(!count)continue;
  const base=Math.round((minutes+count)*baseRate/60)-Math.round(minutes*baseRate/60);minutes+=count;
  if(!row.payBasis)continue;
  const rate=row.payRate;if(!['hour','session'].includes(row.payBasis)||typeof rate!=='number'||!Number.isSafeInteger(rate)||rate<0||rate>1e9)throw Error('INVALID_SHIFT_RATE');
  const first=localDay(new Date(row.start)).slice(0,7),previous=period>first?monthMinutes(row.day,row.start,row.end,first,row.breakMinutes):0;
  const net=payableShiftMinutes(row.start,row.end,row.breakMinutes);
  const earned=row.payBasis==='hour'?Math.round((previous+count)*rate/60)-Math.round(previous*rate/60):Math.floor((previous+count)*rate/net)-Math.floor(previous*rate/net);
  const amount=earned-base;adjustment+=amount;
  const time=(value:string)=>new Date(Date.parse(value)+7*3600000).toISOString().slice(11,16);
  details.push({id:'shift-'+row.id+':'+period,attendanceId:row.id,day:row.day,title:'Đơn giá buổi '+time(row.start)+'–'+time(row.end),note:row.payNote||'',kind:'replace',basis:row.payBasis==='hour'?'hour':'job',minutes:count,rate,earned,amount});
 }
 return {minutes,total:Math.round(minutes*baseRate/60)+adjustment,details};
}
