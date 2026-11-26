'use client';
import AttendancePhotoPicker from './attendance-photo-picker';
import {useState} from 'react';
import {evidencePayload} from './attendance-evidence';
import {localDay} from '../lib/attendance';
const yesterday=()=>new Date(Date.parse(localDay()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
export default function AttendanceSupplement({employees,busy,onSave}:{employees:{userId:string;name:string;code:string}[];busy:boolean;onSave:(body:object)=>Promise<void>}){
 const [kind,setKind]=useState('regular'),[workLabel,setWorkLabel]=useState('');
 const [photo,setPhoto]=useState<File|null>(null),[preparing,setPreparing]=useState(false),[error,setError]=useState('');
 const [open,setOpen]=useState(false),[userId,setUserId]=useState(''),[day,setDay]=useState(yesterday),[start,setStart]=useState('08:00'),[end,setEnd]=useState('17:00'),[overnight,setOvernight]=useState(false),[rest,setRest]=useState(0),[reason,setReason]=useState('');
 return <section className="review-card"><button className="btn" type="button" onClick={()=>setOpen(value=>!value)}>Chấm công bổ sung ngày trước</button>
 {open&&<form onSubmit={async e=>{e.preventDefault();setPreparing(true);setError('');try{await onSave({userId,day,start,end,overnight,kind,workLabel,breakMinutes:Math.round(rest*60),reason,...photo?{photo:await evidencePayload(photo)}:{}})}catch(error){setError(error instanceof Error?error.message:'Không đọc được ảnh')}finally{setPreparing(false)}}} style={{display:'grid',gap:12,marginTop:16}}>
 <p>Ca thường chỉ thêm ngày chưa có chấm công thường. Ca khác/ngoài giờ được thêm trong cùng ngày nếu không chồng giờ. Quản lý bổ sung cho nhân viên thuộc phòng ban mình; có thể đính kèm ảnh ban đầu khi bổ sung, không bắt buộc. Việc bổ sung không yêu cầu vị trí hiện tại.</p>
 <label>Nhân viên <select required value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.map(employee=><option key={employee.userId} value={employee.userId}>{employee.code} · {employee.name}</option>)}</select></label>
 <label>Loại ca bổ sung <select value={kind} disabled={busy} onChange={event=>setKind(event.target.value)}><option value="regular">Chấm công thường</option><option value="other">Công khác / ngoài giờ</option></select></label>{kind==='other'&&<label>Tên công việc khác <input value={workLabel} required maxLength={180} onChange={event=>setWorkLabel(event.target.value)}/></label>}
 <label>Ngày cần bổ sung <input type="date" required max={yesterday()} value={day} onChange={e=>setDay(e.target.value)}/></label>
 <label>Giờ vào <input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Giờ ra <input type="time" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
 <label><input type="checkbox" checked={overnight} onChange={e=>setOvernight(e.target.checked)}/> Giờ ra thuộc ngày hôm sau</label>
 <label>Nghỉ trưa (giờ) <input type="number" required min={0} max={24} step={0.25} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
 <label>Lý do bổ sung <textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <AttendancePhotoPicker files={photo?[photo]:[]} onChange={files=>setPhoto(files[0]||null)} disabled={busy||preparing} onPreparingChange={setPreparing} label="Ảnh chấm công bù (không bắt buộc)"/>{error&&<p role="alert">{error}</p>}
 <button className="btn primary" disabled={busy||preparing||!userId}>Lưu chấm công bổ sung</button></form>}
 </section>;
}
