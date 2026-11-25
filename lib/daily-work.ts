import {validDay} from './personal-workspace.ts';
export type WorkDetail={id:string;day:string;title:string;note:string;kind:'replace'|'extra';basis:'hour'|'job';minutes:number;rate:number;earned:number;amount:number};
export function dailyWork(input:Record<string,unknown>,baseRate:number,today:string):Omit<WorkDetail,'id'>{
 const day=String(input.day||''),title=String(input.title||'').trim(),note=String(input.note||'').trim();
 const kind=input.kind,basis=input.basis,rate=Number(input.rate),hours=Number(input.hours),minutes=Math.round(hours*60);
 if(!validDay(day)||day>today||!title||title.length>180||!note||note.length>1000||!['replace','extra'].includes(String(kind))||!['hour','job'].includes(String(basis))||kind==='replace'&&basis!=='hour'||!Number.isSafeInteger(rate)||rate<0||rate>1e9||basis==='hour'&&(!Number.isFinite(hours)||hours<=0||hours>24||Math.abs(hours*60-minutes)>0.00001))throw Error('INVALID_DAILY_WORK');
 const earned=basis==='hour'?Math.round(rate*minutes/60):rate;
 return {day,title,note,kind:kind as 'replace'|'extra',basis:basis as 'hour'|'job',minutes:basis==='hour'?minutes:0,rate,earned,amount:kind==='replace'?earned-Math.round(baseRate*minutes/60):earned};
}
export function replacementFits(minutes:number,existing:number[],available:number){return Number.isInteger(minutes)&&minutes>0&&minutes+existing.reduce((a,b)=>a+b,0)<=available}
export function priceReplacements(items:WorkDetail[],baseRate:number){
 // Round the base deduction cumulatively so splitting a task never creates money through rounding.
 let previous=0;
 return items.map(item=>{if(item.kind!=='replace')return {...item};const end=previous+item.minutes;const deduction=Math.round(baseRate*end/60)-Math.round(baseRate*previous/60);previous=end;return {...item,amount:item.earned-deduction}});
}
