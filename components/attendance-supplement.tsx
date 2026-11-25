'use client';
import {useState} from 'react';
import {localDay} from '../lib/attendance';
const yesterday=()=>new Date(Date.parse(localDay()+'T00:00:00Z')-86400000).toISOString().slice(0,10);
export default function AttendanceSupplement({employees,busy,onSave}:{employees:{userId:string;name:string;code:string}[];busy:boolean;onSave:(body:object)=>Promise<void>}){
 const [open,setOpen]=useState(false),[userId,setUserId]=useState(''),[day,setDay]=useState(yesterday),[start,setStart]=useState('08:00'),[end,setEnd]=useState('17:00'),[overnight,setOvernight]=useState(false),[rest,setRest]=useState(0),[reason,setReason]=useState('');
 return <section className="review-card"><button className="btn" type="button" onClick={()=>setOpen(value=>!value)}>Chấm công bổ sung ngày trước</button>
 {open&&<form onSubmit={e=>{e.preventDefault();void onSave({userId,day,start,end,overnight,breakMinutes:Math.round(rest*60),reason})}} style={{display:'grid',gap:12,marginTop:16}}>
 <p>Chỉ thêm ngày chưa có chấm công. Quản lý bổ sung cho nhân viên thuộc phòng ban mình; nhân viên tự tải ảnh minh chứng của mình.</p>
 <label>Nhân viên <select required value={userId} onChange={e=>setUserId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.map(employee=><option key={employee.userId} value={employee.userId}>{employee.code} · {employee.name}</option>)}</select></label>
 <label>Ngày cần bổ sung <input type="date" required max={yesterday()} value={day} onChange={e=>setDay(e.target.value)}/></label>
 <label>Giờ vào <input type="time" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Giờ ra <input type="time" required value={end} onChange={e=>setEnd(e.target.value)}/></label>
 <label><input type="checkbox" checked={overnight} onChange={e=>setOvernight(e.target.checked)}/> Giờ ra thuộc ngày hôm sau</label>
 <label>Nghỉ trưa (giờ) <input type="number" required min={0} max={24} step={0.25} value={rest} onChange={e=>setRest(Number(e.target.value))}/></label>
 <label>Lý do bổ sung <textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
 <button className="btn primary" disabled={busy||!userId}>Lưu chấm công bổ sung</button></form>}
 </section>;
}
