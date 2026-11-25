'use client';
import DailyWork from './daily-work';
import {useEffect,useState} from 'react';
import AttendanceSupplement from './attendance-supplement';
import AttendanceEvidence,{uploadEvidence} from './attendance-evidence';
import {netShiftMinutes} from '../lib/attendance';
const month=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
async function api(path:string,body?:object,method='POST'){
 const res=await fetch('/api/attendance'+path,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 const json=await res.json();if(!res.ok){const code=typeof json.error==='string'?json.error:json.error?.code;const messages:Record<string,string>={EMPLOYEE_MISMATCH:'Mã hoặc tên nhân viên không đúng thông tin admin cấp.',ALREADY_CLOCKED:'Bạn đã chấm giờ vào hoặc còn ca chưa chấm ra.',NO_OPEN_SHIFT:'Bạn chưa có ca đang làm.',DEPARTMENT_REQUIRED:'Bạn cần được admin xác nhận phòng ban trước khi chấm công.',ATTENDANCE_OVERLAP:'Khoảng giờ này chồng với ca làm đã có. Hãy kiểm tra lại giờ vào và giờ ra.',ATTENDANCE_EXISTS:'Nhân viên đã có chấm công trong ngày này. Hãy sửa bản ghi hiện có nếu cần.',INVALID_PAST_ATTENDANCE:'Chọn ngày trước hôm nay và giờ vào/ra hợp lệ, không nằm trong tương lai.',EMPLOYEE_NOT_ASSIGNED:'Nhân viên chưa có mã hoặc thông tin do admin cấp.',INVALID_BREAK:'Giờ nghỉ trưa phải từ 0 đến thời lượng của ca làm.',INVALID_SHIFT:'Giờ ra phải sau giờ vào và ca không quá 24 giờ.',FORBIDDEN:'Bạn chưa được cấp quyền thực hiện thao tác này.',VALIDATION:'Thông tin chưa hợp lệ. Hãy kiểm tra lại.'};throw Error(messages[code]||'Không thực hiện được. Vui lòng thử lại.');}return json.data;
}
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ra';
const inputTime=(value:string)=>{const date=new Date(Date.parse(value)+7*3600000);return date.toISOString().slice(0,16)};
export default function Attendance(){
 const [period,setPeriod]=useState(month),[data,setData]=useState<any>(null),[code,setCode]=useState(''),[name,setName]=useState('');
 const [files,setFiles]=useState<File[]>([]),[fileRevision,setFileRevision]=useState(0);
 const [breakHours,setBreakHours]=useState(0);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[editing,setEditing]=useState<any>(null),[preview,setPreview]=useState<any[]|null>(null);
 useEffect(()=>{if(data?.activeShift)setBreakHours(data.activeShift.breakMinutes/60)},[data?.activeShift?.id]);
 async function load(){setData(await api('?period='+period))}
 useEffect(()=>{setData(null);setPreview(null);api('?period='+period).then(setData).catch(e=>setMessage(e.message))},[period]);
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();setPreview(null)}catch(e:any){setMessage(e.message)}finally{try{await load()}catch{}setBusy(false)}}
 const employee=(id:string)=>data?.employees.find((e:any)=>e.userId===id);
 const hours=(row:any)=>row.end?netShiftMinutes(row.start,row.end,row.breakMinutes??0)/60:0;
 return <section><div className="page-heading"><h1>Chấm công{data?.departmentName?' · '+data.departmentName:''}</h1><label>Tháng <input type="month" value={period} onChange={e=>setPeriod(e.target.value)}/></label></div>
 <p>Tổng giờ công = giờ ra − giờ vào − giờ nghỉ trưa. Có thể nhập 0; 0,5; 1; 1,5 giờ hoặc thời lượng khác theo bước 15 phút.</p>
 <p>Ảnh minh chứng tự xóa sau 2 tháng kể từ ngày tải lên. Định dạng không xem trực tiếp được có thể tải về.</p>
 <p>Giờ Việt Nam (UTC+7). Giờ vào/ra lấy từ hệ thống. Nhập mã và tên do admin cấp.</p>
 <form className="review-card" onSubmit={e=>e.preventDefault()} style={{display:'flex',gap:12,flexWrap:'wrap'}}>
 <label>Mã nhân viên <input required value={code} onChange={e=>setCode(e.target.value)} maxLength={32}/></label>
 <label>Tên nhân viên <input required value={name} onChange={e=>setName(e.target.value)} maxLength={120}/></label>
 <label>Nghỉ trưa (giờ) <input type="number" min={0} max={24} step={0.25} list="lunch-hours" value={breakHours} onChange={e=>setBreakHours(Number(e.target.value))}/></label>
 <label>Ảnh minh chứng (mọi định dạng ảnh, tối đa 3 MB/ảnh)<input key={fileRevision} type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label>
 <datalist id="lunch-hours">{[0,0.5,1,1.5,2].map(value=><option key={value} value={value}/>)}</datalist>
 {['in','out'].map(action=><button key={action} className="btn" disabled={busy||!name.trim()||!code.trim()} onClick={()=>void run(async()=>{const recorded=await api('/clock',{code,name,action,breakMinutes:Math.round(breakHours*60)});if(files.length){await uploadEvidence(recorded.id,files,file=>setFiles(current=>current.filter(item=>item!==file)));setFiles([]);setFileRevision(value=>value+1)}setMessage('Đã ghi nhận '+(action==='in'?'giờ vào':'giờ ra'))})}>{action==='in'?'Chấm giờ vào':'Chấm giờ ra'}</button>)}
 </form>
 <DailyWork period={period}/>
 {message&&<p role="status">{message}</p>}
 {!data?<p>Đang tải…</p>:<>
 {data.ownerAdmin&&data.mailConfigured===false&&<p role="status">Thông báo email chưa được kích hoạt. Cần cấu hình địa chỉ gửi mail chung và khóa dịch vụ gửi mail trên máy chủ. Email nhân viên được dùng làm địa chỉ trả lời.</p>}
 {data.admin&&<AttendanceSupplement employees={data.employees} busy={busy} onSave={body=>run(async()=>{await api('/supplement',body);setMessage('Đã lưu chấm công bổ sung. Chọn đúng tháng trong bộ lọc để xem bản ghi.')})}/>}
 <p><strong>Tổng giờ tháng: {data.rows.reduce((sum:number,row:any)=>sum+hours(row),0).toFixed(2)} giờ</strong> · {data.rows.filter((row:any)=>!row.end).length} ca chưa có giờ ra</p>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:700,textAlign:'left'}}><thead><tr>{['Ngày','Mã NV','Nhân viên','Giờ vào','Giờ ra','Nghỉ trưa (giờ)','Giờ thực làm','Thao tác'].map(label=><th key={label}>{label}</th>)}</tr></thead>
 <tbody>{[...data.rows].sort((a:any,b:any)=>b.day.localeCompare(a.day)).map((row:any)=><tr key={row.id}>
 <td>{row.day.split('-').reverse().join('/')}{!!row.supplemented&&<small style={{display:'block'}}>Chấm công bổ sung</small>}</td><td>{employee(row.userId)?.code}</td><td>{employee(row.userId)?.name}</td><td>{time(row.start)}</td><td>{time(row.end)}</td><td>{((row.breakMinutes??0)/60).toFixed(2)}</td><td>{hours(row).toFixed(2)}</td>
 <td>{(data.admin||!!row.editable)&&<button className="btn" disabled={busy} onClick={()=>setEditing({...row,start:inputTime(row.start),end:row.end?inputTime(row.end):'',reason:''})}>Sửa</button>}
 {data.admin&&<button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/'+row.id,{editable:!row.editable},'PATCH')})}>{row.editable?'Thu hồi quyền sửa':'Cho phép NV sửa 1 lần'}</button>}
 <AttendanceEvidence entryId={row.id} canUpload={data.ownerAdmin||row.userId===data.currentUserId&&(!row.end||Date.now()-Date.parse(row.end)<15*60000||!!row.editable||!!row.supplemented)} owns={row.userId===data.currentUserId} canAdminReplace={data.ownerAdmin} canRequestChange={data.ownerAdmin||data.admin&&row.userId!==data.currentUserId} changeRequested={data.photoChangeEntryIds?.includes(row.id)}/>{row.reason&&<small>Lý do: {row.reason}</small>}</td></tr>)}</tbody></table></div>
 {!data.rows.length&&<p>Chưa có chấm công trong tháng này.</p>}
 {data.admin&&<div className="review-card"><h2>Tổng giờ vào phiếu lương</h2><p>Giờ nghỉ trưa tự động được trừ trước khi tính lương. Ca chưa có giờ ra không được tính. Tổng hợp lại sẽ cập nhật cùng phiếu, giữ các khoản tạm ứng và hoa hồng.</p>
 <button className="btn" disabled={busy} onClick={()=>{setBusy(true);setMessage('');api('/preview?period='+period,{}).then(setPreview).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}}>Xem trước tổng giờ vào lương</button>
 {preview&&<><div style={{overflowX:'auto'}}><table style={{width:'100%'}}><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Giờ</th><th>Đơn giá</th><th>Tiền lương</th></tr></thead><tbody>{preview.map(row=><tr key={row.id}><td>{row.employeeCode}</td><td>{row.worker}</td><td>{row.hours.toFixed(2)}</td><td>{row.rate.toLocaleString('vi-VN')}</td><td>{row.total.toLocaleString('vi-VN')} đ</td></tr>)}</tbody></table></div>
 <button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/sync?period='+period,{});setMessage('Đã cập nhật phiếu lương tháng '+period)})}>Cập nhật giờ vào phiếu lương</button></>}
 </div>}
 </>}
 {editing&&<form className="review-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/'+editing.id,{start:editing.start+':00+07:00',end:editing.end+':00+07:00',reason:editing.reason,breakMinutes:editing.breakMinutes},'PATCH');setEditing(null)})}}><h2>Sửa chấm công</h2>
 <label>Giờ vào <input type="datetime-local" required value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></label>
 <label>Giờ ra <input type="datetime-local" required value={editing.end} onChange={e=>setEditing({...editing,end:e.target.value})}/></label>
 <label>Nghỉ trưa (giờ) <input required type="number" min={0} max={24} step={0.25} value={(editing.breakMinutes??0)/60} onChange={e=>setEditing({...editing,breakMinutes:Math.round(Number(e.target.value)*60)})}/></label>
 <label>Lý do sửa <input required maxLength={1000} value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></label>
 <button className="btn" disabled={busy}>Lưu thay đổi</button><button type="button" className="btn" onClick={()=>setEditing(null)}>Hủy</button></form>}
 </section>;
}
