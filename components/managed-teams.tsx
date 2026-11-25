'use client';
import {useEffect,useState} from 'react';
async function api(path='',method='GET',body?:object){const response=await fetch('/api/managed-teams'+path,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});const result=await response.json();if(!response.ok)throw Error(response.status===403?'Bạn không có quyền quản lý nhóm hoặc nhân viên này.':'Không thực hiện được. Kiểm tra thông tin rồi thử lại.');return result.data}
const local=(date:string)=>{const d=new Date(date);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
export default function ManagedTeams(){
 const [teams,setTeams]=useState<any[]>([]),[selected,setSelected]=useState(''),[detail,setDetail]=useState<any>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{api().then(setTeams).catch(e=>setMessage(e.message)).finally(()=>setLoading(false))},[]);
 useEffect(()=>{let active=true;setDetail(null);if(selected)api('/'+selected).then(data=>{if(active)setDetail(data)}).catch(e=>{if(active)setMessage(e.message)});return()=>{active=false}},[selected]);
 async function save(path:string,method:string,body:object){setBusy(true);setMessage('');try{await api(path,method,body);const updated=await api('/'+selected);setDetail(updated);setMessage('Đã lưu deadline. Nhân viên sẽ thấy nhiệm vụ trong bảng nhiệm vụ của nhóm.')}catch(e){setMessage(e instanceof Error?e.message:'Không lưu được.')}finally{setBusy(false)}}
 return <section><h1>Nhóm của nhân viên</h1><p>Xem nhóm có nhân viên thuộc phạm vi quản lý và giao nhiệm vụ kèm deadline. Không cần tham gia nhóm.</p>{message&&<p role="status">{message}</p>}
 {loading?<p>Đang tải nhóm…</p>:<label>Chọn nhóm <select value={selected} onChange={e=>{setSelected(e.target.value);setMessage('')}}><option value="">Chọn nhóm nhân viên</option>{teams.map(team=><option key={team.id} value={team.id}>{team.name} · {team.employees.length} nhân viên</option>)}</select></label>}
 {!loading&&!teams.length&&<p>Chưa có nhóm của nhân viên đã được xác nhận phòng ban và cấp mã nhân viên.</p>}
 {detail&&<><h2>{detail.team.name}</h2><p>{detail.team.description}</p><p>Nhân viên: {detail.employees.map((person:any)=>`${person.name} (${person.code})`).join(', ')}</p>
 <form className="review-card" key={selected} onSubmit={e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));void save('/'+selected+'/tasks','POST',{...data,dueAt:new Date(String(data.dueAt)).toISOString()})}}><h2>Giao nhiệm vụ và deadline</h2>
 <label>Tên nhiệm vụ <input name="title" required maxLength={160}/></label><label>Mô tả <textarea name="description" required maxLength={4000}/></label><label>Kết quả cần bàn giao <textarea name="deliverable" required maxLength={1000}/></label>
 <label>Nhân viên phụ trách <select name="assigneeId" required>{detail.employees.map((person:any)=><option key={person.id} value={person.id}>{person.code} · {person.name}</option>)}</select></label>
 <label>Mức ưu tiên <select name="priority" defaultValue="medium"><option value="low">Thấp</option><option value="medium">Vừa</option><option value="high">Cao</option></select></label><label>Deadline <input name="dueAt" type="datetime-local" required/></label><p>Giờ địa phương: {Intl.DateTimeFormat().resolvedOptions().timeZone}</p><button className="btn primary" disabled={busy}>Giao nhiệm vụ</button></form>
 <h2>Nhiệm vụ của nhân viên thuộc quyền quản lý</h2>{!detail.tasks.length&&<p>Chưa có nhiệm vụ.</p>}
 {detail.tasks.map((task:any)=><form className="review-card" key={task.id+task.version} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void save('/'+selected+'/tasks/'+task.id,'PATCH',{dueAt:new Date(String(data.get('dueAt'))).toISOString()})}}><h3>{task.title}</h3><p>{task.description}</p><p>Kết quả: {task.deliverable}</p><p>Người phụ trách: {detail.employees.find((p:any)=>p.id===task.assigneeId)?.name} · Trạng thái: {({todo:'Cần làm',progress:'Đang làm',done:'Hoàn thành'} as Record<string,string>)[task.status]||task.status}</p><label>Deadline <input type="datetime-local" name="dueAt" required defaultValue={local(task.dueAt)}/></label><button className="btn" disabled={busy}>Cập nhật deadline</button></form>)}
 </>}
 </section>
}
