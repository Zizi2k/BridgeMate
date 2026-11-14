'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {payrollData,payrollByWorker,payrollWorkerKey} from '../lib/payroll';
import styles from './payroll.module.css';

type Entry=NonNullable<ReturnType<typeof payrollData>> & {id:string};
async function request(scope:string,id='',method='GET',data?:object){
 const response=await fetch('/api/payroll/'+encodeURIComponent(scope)+(id?'/'+encodeURIComponent(id):''),{
  method,cache:'no-store',...(data&&{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}),
 });
 if(response.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 if(!response.ok)throw Error('PAYROLL_REQUEST');
 return (await response.json()).data;
}

export default function Payroll({lang,teamId}:{lang:string;teamId?:string}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [workerFilter,setWorkerFilter]=useState('');
 const [scope,setScope]=useState('me');
 const [period,setPeriod]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()).slice(0,7));
 const [rows,setRows]=useState<Entry[]>([]),[edit,setEdit]=useState<Entry|null>(null);
 const [mode,setMode]=useState<'hour'|'month'>('hour'),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(false),[revision,reload]=useState(0);
 const actualScope=scope==='team'&&teamId?teamId:'me';
 useEffect(()=>{
  let active=true;
  setRows([]);setLoading(true);setEdit(null);setError(false);
  request(actualScope).then(data=>{if(active)setRows(data)}).catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[actualScope,revision]);
 const isTeam=actualScope!=='me';
 const monthly=rows.filter(row=>row.period===period);
 const grouped=payrollByWorker(monthly);
 const selected=grouped.find(([key])=>key===workerFilter)?.[0]||'';
 const visible=(isTeam&&selected?monthly.filter(row=>payrollWorkerKey(row.worker)===selected):monthly)
  .sort((a,b)=>(a.workDate||'').localeCompare(b.workDate||'')||(a.start||'').localeCompare(b.start||''));
 const hoursText=(value:number)=>new Intl.NumberFormat(lang==='vi'?'vi-VN':'en',{maximumFractionDigits:2}).format(value);
 const currency=(value:number)=>new Intl.NumberFormat(lang==='vi'?'vi-VN':'en',{style:'currency',currency:'VND'}).format(value);
 const monetaryFields=[
  ['rate',t('Pay rate','Mức lương')],['advance',t('Advance','Tiền ứng')],
  ['revenue',t('Revenue','Doanh thu')],['commission',t('Commission amount','Hoa hồng')],
 ] as const;
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  const fields=new FormData(event.currentTarget);
  const data=Object.fromEntries(fields);
  const payload={...data,mode,...Object.fromEntries([...monetaryFields.map(([key])=>key),'hours'].map(key=>[key,Number(fields.get(key)||0)]))};
  if(!payrollData(payload,isTeam)){setError(true);return}
  setBusy(true);setError(false);
  try{
   const next:Entry=await request(actualScope,edit?.id,edit?'PATCH':'POST',payload);
   setRows(current=>edit?current.map(row=>row.id===next.id?next:row):[next,...current]);
   setPeriod(next.period);setEdit(null);setMode('hour');reload(value=>value+1);
  }catch{setError(true)}finally{setBusy(false)}
 }
 async function remove(row:Entry){
  if(!window.confirm(t('Delete this payroll entry?','Xóa dòng lương này?')))return;
  setBusy(true);setError(false);
  try{await request(actualScope,row.id,'DELETE',{});setRows(current=>current.filter(item=>item.id!==row.id))}
  catch{setError(true)}finally{setBusy(false)}
 }
 return <section>
  <div className="page-heading"><div><h1>{t('Payroll and work plans','Lương và kế hoạch làm việc')}</h1></div></div>
  <div className={styles.toolbar}>
   <label>{t('Payroll scope','Bảng lương')}<select disabled={busy} value={actualScope==='me'?'me':'team'} onChange={event=>{setWorkerFilter('');setScope(event.target.value)}}>
    <option value="me">{t('Personal','Cá nhân')}</option>{teamId&&<option value="team">{t('Current team','Nhóm đang mở')}</option>}
   </select></label>
   {isTeam&&<label>{t('Worker','Người làm')}<select value={selected} onChange={event=>setWorkerFilter(event.target.value)}>
    <option value="">{t('All workers','Tất cả người làm')}</option>{grouped.map(([key,group])=><option key={key} value={key}>{group.name}</option>)}
   </select></label>}
   <label>{t('Month','Tháng')}<input type="month" value={period} disabled={busy} onChange={event=>{if(event.target.value)setPeriod(event.target.value)}}/></label>
  </div>
  <p>{t('Total pay includes commission. Remaining pay is total minus advances. Profit is revenue minus total pay.','Tổng tiền lương gồm hoa hồng. Tiền còn lại bằng tổng tiền trừ tiền ứng. Lợi nhuận bằng doanh thu trừ tổng tiền lương.')}</p>
  {error&&<p role="alert">{t('Check the inputs or permissions and try again.','Kiểm tra thông tin nhập hoặc quyền truy cập rồi thử lại.')}</p>}
  {loading?<p role="status">{t('Loading payroll…','Đang tải bảng lương…')}</p>:<>
   <form className={styles.form} key={actualScope+':'+(edit?.id||'new')+':'+revision} onSubmit={save}>
    <label>{t('Work','Công việc')}<input name="work" maxLength={180} defaultValue={edit?.work} required/></label>
    <label>{t('Worker name','Tên người làm')}<input name="worker" maxLength={120} defaultValue={edit?.worker} required/></label>
    <label>{t('Pay period','Kỳ lương')}<input name="period" type="month" defaultValue={edit?.period||period} required/></label>
    <label>{t('Pay type','Hình thức trả lương')}<select value={mode} onChange={event=>setMode(event.target.value==='month'?'month':'hour')}>
     <option value="hour">{t('Hourly','Theo giờ')}</option><option value="month">{t('Monthly','Theo tháng')}</option>
    </select></label>
    {isTeam&&<>
     <label>{t('Work date','Ngày làm')}<input name="workDate" type="date" required={mode==='hour'} defaultValue={edit?.workDate}/></label>
     <label>{t('Clock in','Giờ vào')}<input name="start" type="time" required={mode==='hour'} defaultValue={edit?.start}/></label>
     <label>{t('Clock out','Giờ ra')}<input name="end" type="time" required={mode==='hour'} defaultValue={edit?.end}/></label>
     <small className={styles.full}>{t('Hours are calculated from the start and end times on the selected work date.','Số giờ được tính từ giờ vào và giờ ra trong ngày đã chọn. Ngày làm phải thuộc kỳ lương.')}</small>
    </>}
    {mode==='hour'&&!isTeam&&<label>{t('Hours worked','Số giờ làm')}<input name="hours" type="number" min={0} max={744} step=".01" defaultValue={edit?.hours} required/></label>}
    {monetaryFields.map(([key,label])=><label key={key}>{label} (₫)<input name={key} type="number" min={0} max={1000000000000} step={1} defaultValue={edit?.[key]||0} required/></label>)}
    <label className={styles.full}>{t('Work plan','Kế hoạch làm việc')}<textarea name="plan" rows={3} maxLength={2000} defaultValue={edit?.plan}/></label>
    <div className={styles.actions}><button className="btn primary" disabled={busy}>{edit?t('Save changes','Lưu thay đổi'):t('Add entry','Thêm dòng lương')}</button>
     {edit&&<button className="btn" type="button" disabled={busy} onClick={()=>{setEdit(null);setMode('hour')}}>{t('Cancel','Hủy')}</button>}</div>
   </form>
   {isTeam&&grouped.length>0&&<section>
    <h2>{t('Payroll by worker','Tổng lương theo người')}</h2>
    <div className={styles.table}><table><thead><tr>
     {[t('Worker','Người làm'),t('Entries','Số dòng'),t('Hours','Tổng giờ'),t('Total pay','Tổng lương'),t('Advance','Tiền ứng'),t('Remaining','Còn lại')].map(label=><th scope="col" key={label}>{label}</th>)}
    </tr></thead><tbody>{grouped.map(([key,group])=><tr key={key}>
     <td><button type="button" className="btn" aria-pressed={selected===key} onClick={()=>setWorkerFilter(selected===key?'':key)}>{group.name}</button></td>
     <td>{group.count}</td><td>{hoursText(group.hours)}</td><td>{currency(group.total)}</td><td>{currency(group.advance)}</td><td>{currency(group.balance)}</td>
    </tr>)}</tbody></table></div>
   </section>}
   {visible.length?<div className={styles.table}><table>
    <thead><tr>{[t('Worker / work','Người làm / công việc'),t('Plan','Kế hoạch'),t('Pay rate','Mức lương'),t('Revenue','Doanh thu'),t('Commission','Hoa hồng'),t('Total','Tổng tiền'),t('Advance','Tiền ứng'),t('Balance','Còn lại'),t('Profit','Lợi nhuận'),t('Actions','Thao tác')].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead>
    <tbody>{visible.map(row=><tr key={row.id}><td><strong>{row.worker}</strong><br/>{row.work}{isTeam&&<><br/><small>{row.workDate?row.workDate+' · '+row.start+'–'+row.end:t('No shift time recorded','Chưa có giờ làm cụ thể')}</small></>}</td><td>{row.plan||'—'}</td>
     <td>{currency(row.rate)} / {row.mode==='hour'?t('hour','giờ'):t('month','tháng')}{(row.mode==='hour'||row.workDate)&&<><br/>{hoursText(row.hours)} {t('hours','giờ')}</>}</td>
     {[row.revenue,row.commission,row.total,row.advance,row.balance,row.profit].map((n,index)=><td key={index}>{currency(n)}</td>)}
     <td><div className={styles.actions}><button className="btn" disabled={busy} onClick={()=>{setEdit(row);setMode(row.mode)}}>{t('Edit','Sửa')}</button><button className="btn" disabled={busy} onClick={()=>void remove(row)}>{t('Delete','Xóa')}</button></div></td>
    </tr>)}</tbody>
    <tfoot><tr><th colSpan={3} scope="row">{t('Period totals','Tổng theo kỳ')}</th>{(['revenue','commission','total','advance','balance','profit'] as const).map(key=><td key={key}>{currency(visible.reduce((sum,row)=>sum+row[key],0))}</td>)}<td/></tr></tfoot>
   </table></div>:<div className="empty">{t('No payroll entries for this month.','Chưa có dòng lương trong tháng này.')}</div>}
  </>}
 </section>;
}
