'use client';
import {PasswordRecoveryAdmin} from './password-recovery';

import {useEffect,useState} from 'react';
import {DepartmentAdmin,departmentRequest,type Department} from './departments';

import {modules,moduleLabels,type Module,type Permission} from '../lib/module-access';
import {AptisBank} from './aptis';
import {PrintTemplateEditor} from './print-payroll';

type Account={id:string;name:string;email:string;accountRole:'admin'|'manager'|'member';employeeCode?:string;employeeName?:string;rate?:number;departmentId?:string;departmentStatus?:string;suspended:boolean;permissions:Partial<Record<Module,Permission>>};

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

export default function AccountAdmin({lang,ownerAdmin=false}:{lang:string;ownerAdmin?:boolean}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [departments,setDepartments]=useState<Department[]>([]);
 async function loadDepartments(){setDepartments(await departmentRequest('departments'))}
 useEffect(()=>{loadDepartments().catch(()=>setError(true))},[]);
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
  {ownerAdmin&&<ModuleVisibility lang={lang}/>}
  {ownerAdmin&&<><PasswordRecoveryAdmin/><DepartmentAdmin departments={departments} onChanged={loadDepartments}/></>}
  <PrintTemplateEditor/>
  <AptisBank lang={lang}/>
  {error&&<p role="alert">{t('Could not complete the request. Reload and try again.','Không thể thực hiện thao tác. Tải lại trang và thử lại.')}</p>}
  {loading?<p role="status">{t('Loading accounts…','Đang tải tài khoản…')}</p>:
   <div className="members-grid">{rows.map(account=><article className="member-card" key={account.id}>
    <h3>{account.name}</h3><p style={{overflowWrap:'anywhere'}}>{account.email}</p>
    <p>{account.accountRole==='admin'?t('Administrator','Quản trị viên'):account.accountRole==='manager'?t('Manager','Người quản lý'):t('Member','Thành viên')} · {account.suspended?t('Suspended','Đã khóa'):t('Active','Đang hoạt động')}</p>
    {ownerAdmin&&account.accountRole!=='admin'&&<EmployeeSetup account={account} departments={departments} saved={updated=>setRows(rows=>rows.map(row=>row.id===account.id?{...row,...updated}:row))}/>}
    {account.accountRole!=='admin'&&modules.filter(module=>ownerAdmin||module!=='links').map(module=><div key={module}>
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

function EmployeeSetup({account,departments,saved}:{account:Account;departments:Department[];saved:(value:Partial<Account>)=>void}){
 const [departmentId,setDepartmentId]=useState(account.departmentId||'');
 const [code,setCode]=useState(account.employeeCode||''),[name,setName]=useState(account.employeeName||account.name),[rate,setRate]=useState(account.rate||0),[manager,setManager]=useState(account.accountRole==='manager'),[status,setStatus]=useState('');
 return <form onSubmit={async e=>{e.preventDefault();try{await request('/'+account.id,{employeeCode:code,employeeName:name,rate,manager,departmentId});saved({departmentId,departmentStatus:'approved',employeeCode:code,employeeName:name,rate,accountRole:manager?'manager':'member'});setStatus('Đã lưu')}catch{setStatus('Không lưu được. Kiểm tra mã nhân viên có trùng không.')}}}>
 <h4>Thông tin nhân viên và quyền quản lý</h4>
 <p>{account.departmentStatus==='pending'?'Đang chờ admin xác nhận phòng ban.':''}</p>
 <label>Phòng ban <select value={departmentId} required={manager} onChange={e=>setDepartmentId(e.target.value)}><option value="">Chưa phân phòng ban</option>{departments.filter(row=>row.active||row.id===departmentId).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 <label>Mã nhân viên <input required maxLength={32} value={code} onChange={e=>setCode(e.target.value.toUpperCase())}/></label>
 <label>Tên nhân viên <input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>Lương mỗi giờ (đ) <input required type="number" min={0} max={1000000000} value={rate} onChange={e=>setRate(Number(e.target.value))}/></label>
 <label><input type="checkbox" checked={manager} onChange={e=>setManager(e.target.checked)}/> Người quản lý</label><button className="btn primary">{manager?'Duyệt phòng ban và cấp quyền quản lý':account.departmentStatus==='pending'?'Lưu và duyệt phòng ban':'Lưu thông tin và phòng ban'}</button><p role="status">{status}</p>
 </form>;
}
