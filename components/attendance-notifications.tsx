'use client';
import {useEffect,useRef,useState} from 'react';
import {Bell,X} from 'lucide-react';
type Notice={id:string;subject:string;text:string;createdAt:string;readAt:string|null};
export default function AttendanceNotifications({onAttendance}:{onAttendance:()=>void}){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[error,setError]=useState('');
 const root=useRef<HTMLDivElement>(null);
 async function refresh(){const response=await fetch('/api/attendance-notifications',{cache:'no-store'});if(!response.ok)throw Error('Không tải được thông báo chấm công.');const {data}=await response.json();setRows(data.rows);setUnread(data.unread);setError('')}
 useEffect(()=>{let active=true;const load=()=>{if(active&&document.visibilityState!=='hidden')void refresh().catch(()=>{if(active)setError('Chưa tải được thông báo. Bấm làm mới để thử lại.')})};load();const interval=setInterval(load,30000);window.addEventListener('focus',load);return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',load)}},[]);
 useEffect(()=>{if(!open)return;const outside=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};document.addEventListener('mousedown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape)}},[open]);
 async function mark(body:object){try{const response=await fetch('/api/attendance-notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error();await refresh()}catch{setError('Không đánh dấu được thông báo. Vui lòng thử lại.')}}
 return <div ref={root} style={{position:'relative'}}><button className="icon-btn" aria-label={`Thông báo chấm công: ${unread} chưa đọc`} aria-expanded={open} onClick={()=>{setOpen(!open);void refresh().catch(()=>setError('Không tải được thông báo.'))}}><Bell size={18}/>{unread>0&&<span style={{fontSize:11,fontWeight:700}}>{unread>99?'99+':unread}</span>}</button>
 {open&&<section aria-label="Thông báo chấm công" style={{position:'fixed',right:12,top:72,zIndex:80,width:'min(390px,calc(100vw - 24px))',maxHeight:'70vh',overflowY:'auto',padding:16,borderRadius:12,border:'1px solid var(--border, #ccc)',background:'var(--surface, #fff)',color:'var(--text, #172b26)',boxShadow:'0 10px 35px #0003'}}>
 <div style={{display:'flex',alignItems:'center',gap:8}}><strong style={{flex:1}}>Thông báo chấm công</strong><button className="icon-btn" aria-label="Đóng thông báo" onClick={()=>setOpen(false)}><X size={18}/></button></div>
 <p><button className="btn" onClick={()=>void refresh().catch(()=>setError('Không tải được thông báo.'))}>Làm mới</button> <button className="btn" disabled={!unread} onClick={()=>void mark({all:true})}>Đọc tất cả ({unread})</button></p>
 {error&&<p role="status">{error}</p>}{!rows.length&&!error&&<p>Chưa có thông báo chấm công mới.</p>}
 {rows.map(row=><article key={row.id} style={{borderTop:'1px solid var(--border, #ddd)',padding:'12px 0'}}><strong>{!row.readAt&&'● '}{row.subject}</strong><p style={{whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.6}}>{row.text}</p><small>{new Date(row.createdAt).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</small><div><button className="btn" onClick={()=>{void mark({id:row.id});setOpen(false);onAttendance()}}>Xem chấm công</button>{!row.readAt&&<button className="btn" onClick={()=>void mark({id:row.id})}>Đánh dấu đã đọc</button>}</div></article>)}
 {rows.length===50&&<small>Hiển thị 50 thông báo gần nhất.</small>}
 </section>}</div>
}
