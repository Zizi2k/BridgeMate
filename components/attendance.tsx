'use client';
import {useEffect,useState} from 'react';
const month=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
async function api(path:string,body?:object,method='POST'){
 const res=await fetch('/api/attendance'+path,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 const json=await res.json();if(!res.ok){const code=typeof json.error==='string'?json.error:json.error?.code;const messages:Record<string,string>={EMPLOYEE_MISMATCH:'Mã hoặc tên nhân viên không đúng thông tin admin cấp.',ALREADY_CLOCKED:'Bạn đã chấm giờ vào hoặc còn ca chưa chấm ra.',NO_OPEN_SHIFT:'Bạn chưa có ca đang làm.',INVALID_SHIFT:'Giờ ra phải sau giờ vào và ca không quá 24 giờ.',FORBIDDEN:'Bạn chưa được cấp quyền thực hiện thao tác này.',VALIDATION:'Thông tin chưa hợp lệ. Hãy kiểm tra lại.'};throw Error(messages[code]||'Không thực hiện được. Vui lòng thử lại.');}return json.data;
}
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ra';
const inputTime=(value:string)=>{const date=new Date(Date.parse(value)+7*3600000);return date.toISOString().slice(0,16)};
export default function Attendance(){
 const [period,setPeriod]=useState(month),[data,setData]=useState<any>(null),[code,setCode]=useState(''),[name,setName]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[editing,setEditing]=useState<any>(null),[preview,setPreview]=useState<any[]|null>(null);
 async function load(){setData(await api('?period='+period))}
 useEffect(()=>{setData(null);setPreview(null);api('?period='+period).then(setData).catch(e=>setMessage(e.message))},[period]);
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();await load()}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 const employee=(id:string)=>data?.employees.find((e:any)=>e.userId===id);
 const hours=(row:any)=>row.end?Math.floor((Date.parse(row.end)-Date.parse(row.start))/60000)/60:0;
 return <section><div className="page-heading"><h1>Chấm công</h1><label>Tháng <input type="month" value={period} onChange={e=>setPeriod(e.target.value)}/></label></div>
 <p>Giờ Việt Nam (UTC+7). Giờ vào/ra lấy từ hệ thống. Nhập mã và tên do admin cấp.</p>
 <form className="review-card" onSubmit={e=>e.preventDefault()} style={{display:'flex',gap:12,flexWrap:'wrap'}}>
 <label>Mã nhân viên <input required value={code} onChange={e=>setCode(e.target.value)} maxLength={32}/></label>
 <label>Tên nhân viên <input required value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
 {['in','out'].map(action=><button key={action} className="btn" disabled={busy||!name.trim()||!code.trim()} onClick={()=>void run(async()=>{await api('/clock',{code,name,action});setMessage('Đã ghi nhận '+(action==='in'?'giờ vào':'giờ ra'))})}>{action==='in'?'Chấm giờ vào':'Chấm giờ ra'}</button>)}
 </form>
 {message&&<p role="status">{message}</p>}
 {!data?<p>Đang tải…</p>:<>
 <p><strong>Tổng giờ tháng: {data.rows.reduce((sum:number,row:any)=>sum+hours(row),0).toFixed(2)} giờ</strong> · {data.rows.filter((row:any)=>!row.end).length} ca chưa có giờ ra</p>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:700,textAlign:'left'}}><thead><tr>{['Ngày','Mã NV','Nhân viên','Giờ vào','Giờ ra','Số giờ','Thao tác'].map(label=><th key={label}>{label}</th>)}</tr></thead>
 <tbody>{[...data.rows].sort((a:any,b:any)=>b.day.localeCompare(a.day)).map((row:any)=><tr key={row.id}>
 <td>{row.day.split('-').reverse().join('/')}</td><td>{employee(row.userId)?.code}</td><td>{employee(row.userId)?.name}</td><td>{time(row.start)}</td><td>{time(row.end)}</td><td>{hours(row).toFixed(2)}</td>
 <td>{(data.admin||!!row.editable)&&<button className="btn" disabled={busy} onClick={()=>setEditing({...row,start:inputTime(row.start),end:row.end?inputTime(row.end):'',reason:''})}>Sửa</button>}
 {data.admin&&<button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/'+row.id,{editable:!row.editable},'PATCH')})}>{row.editable?'Thu hồi quyền sửa':'Cho phép NV sửa 1 lần'}</button>}
 {row.reason&&<small>Lý do: {row.reason}</small>}</td></tr>)}</tbody></table></div>
 {!data.rows.length&&<p>Chưa có chấm công trong tháng này.</p>}
 {data.admin&&<div className="review-card"><h2>Tổng giờ vào phiếu lương</h2><p>Ca chưa có giờ ra không được tính. Tổng hợp lại sẽ cập nhật cùng phiếu, giữ các khoản tạm ứng và hoa hồng.</p>
 <button className="btn" disabled={busy} onClick={()=>void run(async()=>setPreview(await api('/preview?period='+period,{})))}>Xem trước tổng giờ vào lương</button>
 {preview&&<><div style={{overflowX:'auto'}}><table style={{width:'100%'}}><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Giờ</th><th>Đơn giá</th><th>Tiền lương</th></tr></thead><tbody>{preview.map(row=><tr key={row.id}><td>{row.employeeCode}</td><td>{row.worker}</td><td>{row.hours.toFixed(2)}</td><td>{row.rate.toLocaleString('vi-VN')}</td><td>{row.total.toLocaleString('vi-VN')} đ</td></tr>)}</tbody></table></div>
 <button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/sync?period='+period,{});setMessage('Đã cập nhật phiếu lương tháng '+period)})}>Cập nhật giờ vào phiếu lương</button></>}
 </div>}
 </>}
 {editing&&<form className="review-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/'+editing.id,{start:editing.start+':00+07:00',end:editing.end+':00+07:00',reason:editing.reason},'PATCH');setEditing(null)})}}><h2>Sửa chấm công</h2>
 <label>Giờ vào <input type="datetime-local" required value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></label>
 <label>Giờ ra <input type="datetime-local" required value={editing.end} onChange={e=>setEditing({...editing,end:e.target.value})}/></label>
 <label>Lý do sửa <input required maxLength={1000} value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></label>
 <button className="btn" disabled={busy}>Lưu thay đổi</button><button type="button" className="btn" onClick={()=>setEditing(null)}>Hủy</button></form>}
 </section>;
}
