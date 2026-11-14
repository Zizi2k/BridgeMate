'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {moduleLabels,type Module,type Permission} from '../lib/module-access';

export default function ModuleGate({module,lang,children}:{module:Module;lang:string;children:ReactNode}){
 const [status,setStatus]=useState<Permission|'required'|'loading'|'error'>('loading');
 const [revision,setRevision]=useState(0);
 const [busy,setBusy]=useState(false);
 const vi=lang==='vi';
 useEffect(()=>{
  let active=true;
  setStatus('loading');
  fetch('/api/access',{cache:'no-store'}).then(async response=>{
   if(!response.ok)throw Error();
   const {data}=await response.json();
   if(active)setStatus(data.admin?'approved':data.permissions[module]||'required');
  }).catch(()=>{if(active)setStatus('error')});
  return()=>{active=false};
 },[module,revision]);
 async function apply(){
  setBusy(true);
  try{
   const response=await fetch('/api/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({module})});
   if(!response.ok)throw Error();
   setStatus('pending');
  }catch{setStatus('error')}finally{setBusy(false)}
 }
 if(status==='approved')return children;
 return <section className="empty">
  <h2>{moduleLabels[module][vi?1:0]}</h2>
  <p role="status">{status==='loading'?(vi?'Đang kiểm tra quyền…':'Checking access…'):
   status==='pending'?(vi?'Đang chờ quản trị viên duyệt.':'Awaiting administrator approval.'):
   status==='denied'?(vi?'Quyền đã bị từ chối hoặc thu hồi.':'Access was denied or revoked.'):
   status==='error'?(vi?'Không thể kiểm tra quyền. Hãy thử lại.':'Unable to check access. Please retry.'):
   (vi?'Cần quản trị viên duyệt trước khi sử dụng.':'Administrator approval is required.')}</p>
  {(status==='pending'||status==='error')&&<button type="button" className="btn" disabled={busy} onClick={()=>setRevision(value=>value+1)}>{vi?'Kiểm tra lại':'Check again'}</button>}
  {(status==='required'||status==='denied')&&<button type="button" className="btn primary" disabled={busy} onClick={()=>void apply()}>{vi?'Gửi yêu cầu cấp quyền':'Request access'}</button>}
 </section>;
}
