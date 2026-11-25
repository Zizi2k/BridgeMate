'use client';
import {useEffect,useState} from 'react';
import PrintPayroll from './print-payroll';
export type Department={id:string;name:string;active:number};
export async function departmentRequest(path:string,method='GET',body?:object){
 const res=await fetch('/api/'+path,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 if(res.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 const json=await res.json();if(!res.ok)throw Error(res.status===403?'Bạn chưa được admin xác nhận phòng ban hoặc cấp quyền cho thao tác này.':'Không thực hiện được. Kiểm tra thông tin và thử lại.');return json.data;
}
export function DepartmentGate({onSelected,onLogout}:{onSelected:()=>Promise<void>;onLogout:()=>Promise<void>}){
 const [departments,setDepartments]=useState<Department[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{departmentRequest('departments').then(setDepartments).catch(e=>setError(e.message))},[]);
 return <main style={{maxWidth:600,margin:'5rem auto',padding:24}}><h1>Chọn phòng ban</h1><p>Chọn phòng ban đang công tác. Admin sẽ xác nhận phòng ban trước khi cấp quyền chấm công và xem lương phòng ban.</p>
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await departmentRequest('departments/select','POST',{departmentId:selected});await onSelected()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>
 <label>Phòng ban <select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Chọn phòng ban</option>{departments.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 {!departments.length&&<p>Chưa có phòng ban. Vui lòng liên hệ admin tạo phòng ban.</p>}
 <button className="btn primary" disabled={busy||!selected}>Xác nhận phòng ban</button><button type="button" className="btn" disabled={busy} onClick={()=>void onLogout()}>Đăng xuất</button>
 </form>{error&&<p role="alert">{error}</p>}</main>;
}
export function DepartmentAdmin({departments,onChanged}:{departments:Department[];onChanged:()=>Promise<void>}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();await onChanged();setMessage('Đã lưu phòng ban')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 return <fieldset className="review-card"><legend>Phòng ban</legend><form onSubmit={e=>{e.preventDefault();void run(async()=>{await departmentRequest('departments','POST',{name});setName('')})}}><label>Tên phòng ban mới <input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" disabled={busy}>Thêm phòng ban</button></form>
 {departments.map(row=><form key={row.id+row.name} onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void run(async()=>{await departmentRequest('departments/'+row.id,'PATCH',{name:String(fields.get('name')),active:fields.get('active')==='on'})})}} style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
 <label>Tên phòng ban <input name="name" required maxLength={120} defaultValue={row.name}/></label><label><input name="active" type="checkbox" defaultChecked={!!row.active}/> Hoạt động</label><button className="btn" disabled={busy}>Lưu phòng ban</button></form>)}
 {message&&<p role="status">{message}</p>}</fieldset>;
}
export default function DepartmentPayroll({ownerAdmin}:{ownerAdmin:boolean}){
 const [period,setPeriod]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date())),[q,setQ]=useState(''),[departmentId,setDepartmentId]=useState(''),[departments,setDepartments]=useState<Department[]>([]);
 const [result,setResult]=useState<any>(null),[error,setError]=useState(''),[slip,setSlip]=useState<any>(null);
 useEffect(()=>{if(ownerAdmin)departmentRequest('departments').then(setDepartments).catch(e=>setError(e.message))},[ownerAdmin]);
 useEffect(()=>{let active=true;setResult(null);setError('');const timer=setTimeout(()=>{departmentRequest('department-payroll?'+new URLSearchParams({period,q,departmentId})).then(data=>{if(active)setResult(data)}).catch(e=>{if(active)setError(e.message)})},250);return()=>{active=false;clearTimeout(timer)}},[period,q,departmentId]);
 const groups=new Map<string,any>();
 for(const row of result?.rows||[]){const key=(row.recipientId||row.worker)+':'+row.departmentId;const group=groups.get(key)||{...row,hours:0,total:0,advance:0,balance:0,commission:0};for(const field of ['hours','total','advance','balance','commission'])group[field]+=Number(row[field])||0;groups.set(key,group)}
 if(slip&&result)return <PrintPayroll entry={slip} advance={false} readOnlyTemplate={result.template} onClose={()=>setSlip(null)}/>;
 return <section><h1>Bảng lương nhân viên {ownerAdmin?'theo phòng ban':'phòng ban'}</h1><div className="board-toolbar" style={{flexWrap:'wrap'}}>
 <label>Tháng <input type="month" required value={period} onChange={e=>{if(e.target.value)setPeriod(e.target.value)}}/></label>
 {ownerAdmin&&<label>Phòng ban <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
 <label>Tìm mã hoặc tên nhân viên <input type="search" maxLength={120} value={q} onChange={e=>setQ(e.target.value)} placeholder="Mã NV hoặc họ tên"/></label></div>
 {error&&<p role="alert">{error}</p>}{!error&&!result&&<p>Đang tải bảng lương…</p>}
 {result&&<><p><strong>Tổng lương các phòng ban đang xem: {result.totals.reduce((sum:number,row:any)=>sum+row.total,0).toLocaleString('vi-VN')} đ</strong></p><div className="members-grid">{result.totals.map((row:any)=><article key={row.name} className="review-card"><h2>{row.name}</h2><p>Tổng giờ: {row.hours.toFixed(2)}</p><p>Tổng lương: {row.total.toLocaleString('vi-VN')} đ</p><p>Còn lại: {row.balance.toLocaleString('vi-VN')} đ</p></article>)}</div>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:720,textAlign:'left'}}><thead><tr>{['Phòng ban','Mã NV','Nhân viên','Tổng giờ','Tổng lương','Tiền ứng','Còn lại','Phiếu lương'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{[...groups.entries()].map(([key,row])=><tr key={key}><td>{row.departmentName}</td><td>{row.employeeCode}</td><td>{row.worker}</td><td>{row.hours.toFixed(2)}</td><td>{row.total.toLocaleString('vi-VN')}</td><td>{row.advance.toLocaleString('vi-VN')}</td><td>{row.balance.toLocaleString('vi-VN')}</td><td><button className="btn" onClick={()=>setSlip(row)}>Xem phiếu lương</button></td></tr>)}</tbody></table></div>
 {!groups.size&&<p>Chưa có phiếu lương phù hợp. Tổng hợp giờ vào lương từ mục Chấm công để tạo phiếu.</p>}</>}
 </section>;
}
