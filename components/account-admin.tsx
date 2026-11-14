'use client';

import {useEffect,useState} from 'react';

import {modules,moduleLabels,type Module,type Permission} from '../lib/module-access';
import {AptisBank} from './aptis';
import {PrintTemplateEditor} from './print-payroll';

type Account={id:string;name:string;email:string;accountRole:'admin'|'member';suspended:boolean;permissions:Partial<Record<Module,Permission>>};

async function request(path:string, body?:object,method='PATCH'){
 const response=await fetch('/api/admin/accounts'+path,body?{
  method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
 }:{cache:'no-store'});
 if(response.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 if(!response.ok)throw Error('ACCOUNT_REQUEST_FAILED');
 return (await response.json()).data;
}

function ModuleVisibility({lang}:{lang:string}){
 const vi=lang==='vi';
 const [state,setState]=useState<{links:boolean;payroll:boolean}|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  fetch('/api/module-visibility',{cache:'no-store'}).then(async res=>{
   if(!res.ok)throw Error();
   setState((await res.json()).data);
  }).catch(()=>setMessage(vi?'Không tải được cấu hình hiển thị.':'Unable to load visibility settings.'));
 },[vi]);
 async function toggle(module:'links'|'payroll',hidden:boolean){
  setBusy(true);setMessage('');
  try{
   const res=await fetch('/api/module-visibility',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({module,hidden})});
   if(!res.ok)throw Error();
   setState((await res.json()).data);
   setMessage(vi?'Đã lưu.':'Saved.');
  }catch{setMessage(vi?'Không lưu được thay đổi.':'Unable to save changes.')}
  finally{setBusy(false)}
 }
 return <fieldset className="review-card">
  <legend>{vi?'Hiển thị tính năng với tài khoản khác':'Feature visibility for other accounts'}</legend>
  {state&&<div style={{display:'flex',flexWrap:'wrap',gap:'1rem'}}>
   <label><input type="checkbox" checked={state.links} disabled={busy} onChange={e=>void toggle('links',e.target.checked)}/> {vi?'Ẩn Kho liên kết':'Hide My links'}</label>
   <label><input type="checkbox" checked={state.payroll} disabled={busy} onChange={e=>void toggle('payroll',e.target.checked)}/> {vi?'Ẩn Bảng lương':'Hide Payroll'}</label>
  </div>}
  {message&&<p role="status">{message}</p>}
 </fieldset>;
}

export default function AccountAdmin({lang}:{lang:string}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [page,setPage]=useState(1),[rows,setRows]=useState<Account[]>([]),[hasMore,setHasMore]=useState(false);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(''),[error,setError]=useState(false);
 useEffect(()=>{
  let active=true;
  request('?page='+page).then(data=>{if(active){setRows(data.rows);setHasMore(data.hasMore)}})
   .catch(()=>{if(active)setError(true)}).finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[page]);
 function move(next:number){setError(false);setLoading(true);setPage(next)}
 async function toggle(account:Account){
  const suspended=!account.suspended;
  if(suspended&&!window.confirm(t('Suspend account: ','Khóa tài khoản: ')+account.email+'?'))return;
  setBusy(account.id);setError(false);
  try{
   await request('/'+encodeURIComponent(account.id),{suspended});
   setRows(current=>current.map(row=>row.id===account.id?{...row,suspended}:row));
  }catch{setError(true)}
  finally{setBusy('')}
 }
 async function changeAccess(account:Account,module:Module,status:'approved'|'denied'){
  setBusy(account.id);setError(false);
  try{
   await request('/'+encodeURIComponent(account.id),{module,status});
   setRows(current=>current.map(row=>row.id===account.id?{...row,permissions:{...row.permissions,[module]:status}}:row));
  }catch{setError(true)}finally{setBusy('')}
 }
 async function remove(account:Account){
  if(!window.confirm(t('Remove access and hide this account: ','Xóa tài khoản, thu hồi quyền truy cập và giữ lịch sử công việc của: ')+account.email+'?'))return;
  setBusy(account.id);setError(false);
  try{
   await request('/'+encodeURIComponent(account.id),{},'DELETE');
   setRows(current=>current.filter(row=>row.id!==account.id));
  }catch{setError(true)}finally{setBusy('')}
 }
 return <section>
  <div className="page-heading"><div><h1>{t('Account administration','Quản trị tài khoản')}</h1></div></div>
  <ModuleVisibility lang={lang}/>
  <PrintTemplateEditor/>
  <AptisBank lang={lang}/>
  {error&&<p role="alert">{t('Could not complete the request. Reload and try again.','Không thể thực hiện thao tác. Tải lại trang và thử lại.')}</p>}
  {loading?<p role="status">{t('Loading accounts…','Đang tải tài khoản…')}</p>:
   <div className="members-grid">{rows.map(account=><article className="member-card" key={account.id}>
    <h3>{account.name}</h3><p style={{overflowWrap:'anywhere'}}>{account.email}</p>
    <p>{account.accountRole==='admin'?t('Administrator','Quản trị viên'):t('Member','Thành viên')} · {account.suspended?t('Suspended','Đã khóa'):t('Active','Đang hoạt động')}</p>
    {account.accountRole!=='admin'&&modules.map(module=><div key={module}>
     <strong>{moduleLabels[module][lang==='vi'?1:0]}</strong>
     <p>{account.permissions[module]==='pending'?t('Pending','Chờ duyệt'):account.permissions[module]==='approved'?t('Approved','Đã cấp'):t('No access','Chưa cấp')}</p>
     <button type="button" className="btn" disabled={!!busy||account.permissions[module]==='approved'} onClick={()=>void changeAccess(account,module,'approved')}>{t('Approve','Duyệt')}</button>
     <button type="button" className="btn" disabled={!!busy||!['pending','approved'].includes(account.permissions[module]||'')} onClick={()=>void changeAccess(account,module,'denied')}>{t('Deny / revoke','Từ chối / thu hồi')}</button>
    </div>)}
    {account.accountRole!=='admin'&&<button type="button" className="btn" disabled={!!busy} onClick={()=>void remove(account)}>{t('Delete account','Xóa tài khoản')}</button>}
    {account.accountRole!=='admin'&&<button className="btn" disabled={!!busy} onClick={()=>void toggle(account)}>{account.suspended?t('Restore access','Mở khóa'):t('Suspend','Khóa tài khoản')}</button>}
   </article>)}</div>}
  <div className="board-toolbar">
   <button className="btn" disabled={page===1||loading||!!busy} onClick={()=>move(page-1)}>{t('Previous','Trang trước')}</button>
   <span>{page}</span>
   <button className="btn" disabled={!hasMore||loading||!!busy} onClick={()=>move(page+1)}>{t('Next','Trang sau')}</button>
  </div>
 </section>;
}
