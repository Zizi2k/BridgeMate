export function payrollData(input:Record<string,unknown>){
 const read=(key:string)=>typeof input[key]==='string'?String(input[key]).trim():'';
 const work=read('work'), worker=read('worker'), plan=read('plan'), period=read('period');
 const mode=input.mode;
 if(!work||work.length>180||!worker||worker.length>120||plan.length>2000||
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||(mode!=='hour'&&mode!=='month'))return null;
 const {rate,hours,advance,revenue,commission}=input;
 const money=(value:unknown):value is number=>typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=1e12;
 if(!money(rate)||!money(advance)||!money(revenue)||!money(commission)||
    typeof hours!=='number'||!Number.isFinite(hours)||hours<0||hours>744)return null;
 const total=(mode==='hour'?Math.round(rate*hours):rate)+commission;
 return {work,worker,plan,period,mode:mode as 'hour'|'month',rate,hours:mode==='month'?0:hours,advance,revenue,commission,
  total,balance:total-advance,profit:revenue-total};
}
