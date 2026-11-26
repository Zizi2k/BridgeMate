'use client';
import {actionFetch} from '../lib/action-feedback';
import AttendanceRate from './attendance-rate';
import AttendanceDialog from './attendance-dialog';
import EmployeePicker from './employee-picker';
import AttendancePhotoPicker from './attendance-photo-picker';
import AttendanceImport from './attendance-import';
import AttendanceReport from './attendance-report';
import DailyWork from './daily-work';
import {useEffect,useState} from 'react';
import AttendanceSupplement from './attendance-supplement';
import AttendanceEvidence,{evidencePayload} from './attendance-evidence';
import {currentClockLocation} from '../lib/browser-location';
import {monthMinutes} from '../lib/attendance';
const month=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7);
async function api(path:string,body?:object,method='POST'){
 const res=await actionFetch('/api/attendance'+path,body?{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{cache:'no-store'});
 const json=await res.json();if(!res.ok){const code=typeof json.error==='string'?json.error:json.error?.code;const messages:Record<string,string>={RATE_REASON_REQUIRED:'Nhập lý do hoặc ghi chú thay đổi đơn giá.',INVALID_SHIFT_RATE:'Đơn giá phải là số nguyên từ 0 đến 1 tỷ đồng.',SHIFT_RATE_CONFLICT:'Ngày này đã có phần giờ đổi đơn giá trong Công việc trong ngày. Xóa hoặc điều chỉnh phần đó trước khi đặt đơn giá cả buổi để tránh tính trùng.',WORK_LABEL_REQUIRED:'Nhập tên công việc khi chấm công khác/ngoài giờ.',ACTIVE_SHIFT_KIND:'Hãy chấm ra ca đang mở trước khi bắt đầu công việc khác.',INVALID_ATTENDANCE_KIND:'Chọn loại chấm công hợp lệ.',LOCATION_REQUIRED:'Cần lấy vị trí hiện tại. Bật quyền định vị và thử lại.',PHOTO_REQUIRED:'Cần chọn ảnh minh chứng hợp lệ, tối đa 3 MB, cho lần chấm công này.',PHOTO_LIMIT:'Ca đã đủ ảnh. Ca đang mở cần dành một chỗ cho ảnh chấm ra; liên hệ admin nếu dữ liệu cũ đã đủ 10 ảnh.',EMPLOYEE_MISMATCH:'Mã hoặc tên nhân viên không đúng thông tin admin cấp.',ALREADY_CLOCKED:'Cần chấm ra ca đang mở trước. Ca thường chỉ một lần mỗi ngày; làm thêm ca khác hãy chọn Chấm công khác / ngoài giờ.',NO_OPEN_SHIFT:'Bạn chưa có ca đang làm.',DEPARTMENT_REQUIRED:'Bạn cần được admin xác nhận phòng ban trước khi chấm công.',ATTENDANCE_OVERLAP:'Khoảng giờ này chồng với ca làm đã có. Hãy kiểm tra lại giờ vào và giờ ra.',ATTENDANCE_EXISTS:'Nhân viên đã có chấm công trong ngày này. Hãy sửa bản ghi hiện có nếu cần.',INVALID_PAST_ATTENDANCE:'Chọn ngày trước hôm nay và giờ vào/ra hợp lệ, không nằm trong tương lai.',EMPLOYEE_NOT_ASSIGNED:'Nhân viên chưa có mã hoặc thông tin do admin cấp.',INVALID_BREAK:'Giờ nghỉ trưa phải từ 0 đến thời lượng của ca làm.',INVALID_SHIFT:'Giờ ra phải sau giờ vào và ca không quá 24 giờ.',FORBIDDEN:'Bạn chưa được cấp quyền thực hiện thao tác này.',VALIDATION:'Thông tin chưa hợp lệ. Hãy kiểm tra lại.'};throw Error(messages[code]||'Không thực hiện được. Vui lòng thử lại.');}return json.data;
}
const time=(value:string|null)=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Chưa ra';
const inputTime=(value:string)=>{const date=new Date(Date.parse(value)+7*3600000);return date.toISOString().slice(0,16)};
export default function Attendance(){
 const [period,setPeriod]=useState(month),[data,setData]=useState<any>(null),[code,setCode]=useState(''),[name,setName]=useState('');
 const [rateRow,setRateRow]=useState<any>(null);
 const [clockAction,setClockAction]=useState<'in'|'out'|null>(null),[visibleCount,setVisibleCount]=useState(10);
 useEffect(()=>setVisibleCount(10),[period]);
 const [photoPreparing,setPhotoPreparing]=useState(false);
 const [files,setFiles]=useState<File[]>([]),[fileRevision,setFileRevision]=useState(0);
 const [breakHours,setBreakHours]=useState(0);
 const [kind,setKind]=useState<'regular'|'other'>('regular'),[workLabel,setWorkLabel]=useState(''),[workReason,setWorkReason]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[editing,setEditing]=useState<any>(null),[preview,setPreview]=useState<any[]|null>(null);
 useEffect(()=>{if(data?.activeShift){setBreakHours(data.activeShift.breakMinutes/60);setKind(data.activeShift.kind==='other'?'other':'regular');setWorkLabel(data.activeShift.workLabel||'');setWorkReason(data.activeShift.reason||'')}},[data?.activeShift?.id]);
 async function load(){setData(await api('?period='+period))}
 useEffect(()=>{setData(null);setPreview(null);api('?period='+period).then(setData).catch(e=>setMessage(e.message))},[period]);
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();setPreview(null)}catch(e:any){setMessage(e.message)}finally{try{await load()}catch{}setBusy(false)}}
 useEffect(()=>{const self=data?.employees.find((employee:any)=>employee.userId===data.currentUserId);if(self){setCode(self.code);setName(self.name)}},[data?.currentUserId,data?.employees]);
 const employee=(id:string)=>data?.employees.find((e:any)=>e.userId===id);
 const hours=(row:any)=>row.end?monthMinutes(row.day,row.start,row.end,period,row.breakMinutes??0)/60:0;
 return <section className="attendance-page"><div className="page-heading"><h1>Chấm công{data?.departmentName?' · '+data.departmentName:''}</h1><label>Tháng <input type="month" value={period} onChange={e=>setPeriod(e.target.value)}/></label></div>
 <div className="attendance-toolbar"><button type="button" className="btn primary" disabled={!data||busy||!!data.activeShift} onClick={()=>{setFiles([]);setClockAction('in')}}>Chấm công vào</button><button type="button" className="btn" disabled={!data||busy||!data.activeShift} onClick={()=>{setFiles([]);setClockAction('out')}}>Chấm công ra</button>{data?.admin&&<AttendanceSupplement employees={data.employees} busy={busy} onSave={async body=>{setBusy(true);try{await api('/supplement',body);await load();setMessage('Đã lưu chấm công bổ sung.')}finally{setBusy(false)}}}/>} </div>
 {clockAction&&<AttendanceDialog title={clockAction==='in'?'Chấm công vào':'Chấm công ra'} busy={busy||photoPreparing} onClose={()=>setClockAction(null)}>
 <form className="attendance-form" onSubmit={e=>e.preventDefault()}>
 <label>Loại chấm công <select value={kind} disabled={busy||!!data?.activeShift} onChange={event=>{const value=event.target.value as 'regular'|'other';setKind(value);if(value==='other')setBreakHours(0)}}><option value="regular">Chấm công thường</option><option value="other">Chấm công khác / ngoài giờ</option></select></label>
 {kind==='other'&&<><label>Tên công việc khác <input required maxLength={180} value={workLabel} disabled={busy||!!data?.activeShift} onChange={event=>setWorkLabel(event.target.value)}/></label><label>Lý do làm ngoài giờ / ghi chú <textarea required maxLength={1000} value={workReason} disabled={busy||!!data?.activeShift} onChange={event=>setWorkReason(event.target.value)}/></label><p>Được chấm thêm nhiều ca trong ngày, không chồng giờ. Đơn giá mặc định theo admin cấp; quản lý/admin xử lý đơn giá riêng trong phần công việc.</p></>}
 <EmployeePicker employees={(data?.employees||[]).filter((employee:any)=>employee.userId===data.currentUserId)} value={code&&name?data?.currentUserId:''} disabled={busy} onChange={employee=>{setCode(employee?.code||'');setName(employee?.name||'')}}/>
 <small>Chấm công trực tiếp cho tài khoản của bạn. Quản lý dùng Chấm công bổ sung để ghi nhận cho nhân viên.</small>
 <label>Nghỉ trưa (giờ) <input type="number" min={0} max={24} step={0.25} list="lunch-hours" value={breakHours} onChange={e=>setBreakHours(Number(e.target.value))}/></label>
 <AttendancePhotoPicker key={fileRevision} files={files} onChange={setFiles} disabled={busy} onPreparingChange={setPhotoPreparing} label="Ảnh cho lần chấm vào/ra này (bắt buộc)"/>
 <datalist id="lunch-hours">{[0,0.5,1,1.5,2].map(value=><option key={value} value={value}/>)}</datalist>
 {message&&<p role="status">{message}</p>}
 <p>Chấm vào và chấm ra đều cần ảnh riêng và vị trí hiện tại. Trình duyệt chỉ lấy vị trí khi bạn bấm chấm công; không theo dõi liên tục.</p>
 {[clockAction].map(action=><button key={action} className="btn" disabled={busy||photoPreparing||!name.trim()||!code.trim()||!files.length||(kind==='other'&&(!workLabel.trim()||!workReason.trim()))} onClick={event=>{if(!event.currentTarget.form?.reportValidity())return;void run(async()=>{setMessage('Đang lấy vị trí và chuẩn bị ảnh…');const photo=await evidencePayload(files[0]);const location=await currentClockLocation();await api('/clock',{code,name,action,kind,workLabel,workReason,breakMinutes:Math.round(breakHours*60),photo,location});setClockAction(null);setFiles([]);setFileRevision(value=>value+1);if(action==='out'){setWorkLabel('');setWorkReason('');if(kind==='other')setBreakHours(0)}setMessage('Đã ghi nhận '+(action==='in'?'giờ vào':'giờ ra')+' cùng ảnh và vị trí hiện tại.')})}}>{action==='in'?'Chấm giờ vào':'Chấm giờ ra'}</button>)}
 </form></AttendanceDialog>}
 <DailyWork period={period}/>
 {message&&<p role="status">{message}</p>}
 {!data?<p>Đang tải…</p>:<>

 {data.ownerAdmin&&<AttendanceImport onImported={load}/>}
 {data.admin&&<AttendanceReport period={period} ownerAdmin={data.ownerAdmin}/>}

 <p><strong>Tổng giờ tháng: {data.rows.reduce((sum:number,row:any)=>sum+hours(row),0).toFixed(2)} giờ</strong> · {data.rows.filter((row:any)=>!row.end).length} ca chưa có giờ ra</p>
 <div className="attendance-table-scroll" tabIndex={0} aria-label="Danh sách chấm công, cuộn để xem thêm" onScroll={event=>{const el=event.currentTarget;if(el.scrollHeight-el.scrollTop-el.clientHeight<80)setVisibleCount(count=>Math.min(data.rows.length,count+10))}}><table className="attendance-table"><thead><tr>{['Ngày','Mã NV','Nhân viên','Giờ vào','Giờ ra','Nghỉ trưa (giờ)','Giờ thực làm','Đơn giá buổi','Thao tác'].map(label=><th key={label}>{label}</th>)}</tr></thead>
 <tbody>{[...data.rows].sort((a:any,b:any)=>b.day.localeCompare(a.day)||a.start.localeCompare(b.start)).slice(0,visibleCount).map((row:any)=><tr key={row.id}>
 <td>{row.day.split('-').reverse().join('/')}{row.kind==='other'&&<strong style={{display:'block'}}>Công khác / ngoài giờ: {row.workLabel}</strong>}{!!row.supplemented&&<small style={{display:'block'}}>Chấm công bổ sung</small>}</td><td>{employee(row.userId)?.code}</td><td>{employee(row.userId)?.name}</td><td>{time(row.start)}<ClockPosition point={row.locations?.in} label="Vị trí vào"/></td><td>{time(row.end)}<ClockPosition point={row.locations?.out} label="Vị trí ra"/></td><td>{((row.breakMinutes??0)/60).toFixed(2)}</td><td>{hours(row).toFixed(2)}</td><td>{row.payBasis?Number(row.payRate).toLocaleString('vi-VN')+(row.payBasis==='hour'?' đ/giờ':' đ/buổi'):'Mặc định'}{row.payNote&&<small style={{display:'block'}}>{row.payNote}</small>}</td>
 <td className="attendance-actions">{data.admin&&<button type="button" className="btn" disabled={busy} onClick={()=>setRateRow(row)}>Đơn giá buổi</button>}{(data.admin||!!row.editable)&&<button className="btn" disabled={busy} onClick={()=>setEditing({...row,start:inputTime(row.start),end:row.end?inputTime(row.end):'',reason:''})}>Sửa</button>}
 {data.admin&&<button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/'+row.id,{editable:!row.editable},'PATCH')})}>{row.editable?'Thu hồi quyền sửa':'Cho sửa 1 lần'}</button>}
 <AttendanceEvidence entryId={row.id} canUpload={data.ownerAdmin||row.userId===data.currentUserId&&(!row.end||Date.now()-Date.parse(row.end)<15*60000||!!row.editable||!!row.supplemented)} owns={row.userId===data.currentUserId} canAdminReplace={data.ownerAdmin} canRequestChange={data.ownerAdmin||data.admin&&row.userId!==data.currentUserId} changeRequested={data.photoChangeEntryIds?.includes(row.id)}/>{row.reason&&<small>Lý do: {row.reason}</small>}</td></tr>)}</tbody></table>{visibleCount<data.rows.length&&<button type="button" className="btn attendance-load-more" onClick={()=>setVisibleCount(count=>count+10)}>Xem thêm 10 dòng ({Math.min(visibleCount,data.rows.length)}/{data.rows.length})</button>}</div>
 {!data.rows.length&&<p>Chưa có chấm công trong tháng này.</p>}
 {data.admin&&<div className="review-card"><h2>Tổng giờ vào phiếu lương</h2><p>Giờ nghỉ trưa tự động được trừ trước khi tính lương. Ca chưa có giờ ra không được tính. Tổng hợp lại sẽ cập nhật cùng phiếu, giữ các khoản tạm ứng và hoa hồng.</p>
 <button className="btn" disabled={busy} onClick={()=>{setBusy(true);setMessage('');api('/preview?period='+period,{}).then(setPreview).catch(e=>setMessage(e.message)).finally(()=>setBusy(false))}}>Xem trước tổng giờ vào lương</button>
 {preview&&<><div style={{overflowX:'auto'}}><table style={{width:'100%'}}><thead><tr><th>Mã NV</th><th>Họ tên</th><th>Giờ</th><th>Đơn giá</th><th>Tiền lương</th></tr></thead><tbody>{preview.map(row=><tr key={row.id}><td>{row.employeeCode}</td><td>{row.worker}</td><td>{row.hours.toFixed(2)}</td><td>{row.rate.toLocaleString('vi-VN')}</td><td>{row.total.toLocaleString('vi-VN')} đ</td></tr>)}</tbody></table></div>
 <button className="btn" disabled={busy} onClick={()=>void run(async()=>{await api('/sync?period='+period,{});setMessage('Đã cập nhật phiếu lương tháng '+period)})}>Cập nhật giờ vào phiếu lương</button></>}
 </div>}
 </>}
 {rateRow&&<AttendanceRate row={rateRow} employee={employee(rateRow.userId)} period={period} busy={busy} onClose={()=>setRateRow(null)} onSave={async values=>{setBusy(true);setMessage('');try{await api('/'+rateRow.id+'/rate',values,'PATCH');await load();setPreview(null);setRateRow(null);setMessage('Đã cập nhật đơn giá buổi và tổng hợp lại lương.')}catch(error){throw error}finally{setBusy(false)}}}/>}
 {editing&&<form className="review-card" onSubmit={e=>{e.preventDefault();void run(async()=>{await api('/'+editing.id,{start:editing.start+':00+07:00',end:editing.end+':00+07:00',reason:editing.reason,breakMinutes:editing.breakMinutes,workLabel:editing.workLabel},'PATCH');setEditing(null)})}}><h2>Sửa chấm công</h2>{editing.kind==='other'&&<label>Tên công việc khác <input required maxLength={180} value={editing.workLabel} onChange={event=>setEditing({...editing,workLabel:event.target.value})}/></label>}
 <label>Giờ vào <input type="datetime-local" required value={editing.start} onChange={e=>setEditing({...editing,start:e.target.value})}/></label>
 <label>Giờ ra <input type="datetime-local" required value={editing.end} onChange={e=>setEditing({...editing,end:e.target.value})}/></label>
 <label>Nghỉ trưa (giờ) <input required type="number" min={0} max={24} step={0.25} value={(editing.breakMinutes??0)/60} onChange={e=>setEditing({...editing,breakMinutes:Math.round(Number(e.target.value)*60)})}/></label>
 <label>Lý do sửa <input required maxLength={1000} value={editing.reason} onChange={e=>setEditing({...editing,reason:e.target.value})}/></label>
 <button className="btn" disabled={busy}>Lưu thay đổi</button><button type="button" className="btn" onClick={()=>setEditing(null)}>Hủy</button></form>}
 </section>;
}

function ClockPosition({point,label}:{point:any;label:string}){return point?<details className="clock-position"><summary>{label}</summary><small><a href={'https://www.google.com/maps?q='+encodeURIComponent(point.latitude+','+point.longitude)} target="_blank" rel="noopener noreferrer">{label}: {Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}</a><br/>Sai số thiết bị: ±{Math.round(point.accuracy)} m</small></details>:null}
