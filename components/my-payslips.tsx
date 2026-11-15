'use client';

import {useState,type FormEvent} from 'react';
import type {PrintTemplate} from '../lib/module-access';
import PrintPayroll from './print-payroll';
import styles from './payroll.module.css';

type Slip=Parameters<typeof PrintPayroll>[0]['entry'];
type Result={slips:Slip[];template:PrintTemplate};

export default function MyPayslips({lang,request}:{
 lang:string;
 request:(path:string,method:string,body:{employeeCode:string;period:string})=>Promise<Result>;
}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [result,setResult]=useState<Result|null>(null);
 const [selected,setSelected]=useState<Slip|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState(false);
 const [month]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()).slice(0,7));

 async function lookup(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const fields=new FormData(event.currentTarget);
  setBusy(true);setError(false);setResult(null);
  try{
   setResult(await request('my-payslips','POST',{
    employeeCode:String(fields.get('employeeCode')??''),
    period:String(fields.get('period')??''),
   }));
  }catch{setError(true)}finally{setBusy(false)}
 }

 if(selected&&result)return <PrintPayroll entry={selected} advance={false} readOnlyTemplate={result.template} onClose={()=>setSelected(null)}/>;
 return <section>
  <div className="page-heading"><div><h1>{t('My payslips','Phiếu lương của tôi')}</h1></div></div>
  <form className={styles.form} onSubmit={lookup} onChange={()=>{setResult(null);setError(false)}}>
   <label>{t('Employee code','Mã nhân viên')}<input name="employeeCode" maxLength={32} autoComplete="off" required disabled={busy}/></label>
   <label>{t('Pay period','Kỳ lương')}<input name="period" type="month" defaultValue={month} required disabled={busy}/></label>
   <div className={styles.actions}><button className="btn primary" disabled={busy}>{busy?t('Searching…','Đang tra cứu…'):t('Find payslips','Tra phiếu lương')}</button></div>
  </form>
  {error&&<p role="alert">{t('Check the employee code and pay period, then try again.','Kiểm tra mã nhân viên và kỳ lương rồi thử lại.')}</p>}
  {result?.slips.length===0&&<p role="status">{t('No payslip matches this code and month for your account.','Không tìm thấy phiếu khớp với mã và kỳ lương này cho tài khoản của bạn.')}</p>}
  {result?.slips.map(slip=><div className={styles.toolbar} key={slip.id}>
   <button type="button" className="btn" onClick={()=>setSelected(slip)}>{t('View payslip','Xem phiếu lương')} · {slip.period} · {slip.work}</button>
  </div>)}
 </section>;
}
