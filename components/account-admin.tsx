'use client';

import {useEffect,useState} from 'react';

type Account={id:string;name:string;email:string;accountRole:'admin'|'member';suspended:boolean};

async function request(path:string, body?:object){
 const response=await fetch('/api/admin/accounts'+path,body?{
  method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
 }:{cache:'no-store'});
 if(response.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 if(!response.ok)throw Error('ACCOUNT_REQUEST_FAILED');
 return (await response.json()).data;
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
 return <section>
  <div className="page-heading"><div><h1>{t('Account administration','Quản trị tài khoản')}</h1></div></div>
  {error&&<p role="alert">{t('Could not complete the request. Reload and try again.','Không thể thực hiện thao tác. Tải lại trang và thử lại.')}</p>}
  {loading?<p role="status">{t('Loading accounts…','Đang tải tài khoản…')}</p>:
   <div className="members-grid">{rows.map(account=><article className="member-card" key={account.id}>
    <h3>{account.name}</h3><p style={{overflowWrap:'anywhere'}}>{account.email}</p>
    <p>{account.accountRole==='admin'?t('Administrator','Quản trị viên'):t('Member','Thành viên')} · {account.suspended?t('Suspended','Đã khóa'):t('Active','Đang hoạt động')}</p>
    {account.accountRole!=='admin'&&<button className="btn" disabled={!!busy} onClick={()=>void toggle(account)}>{account.suspended?t('Restore access','Mở khóa'):t('Suspend','Khóa tài khoản')}</button>}
   </article>)}</div>}
  <div className="board-toolbar">
   <button className="btn" disabled={page===1||loading||!!busy} onClick={()=>move(page-1)}>{t('Previous','Trang trước')}</button>
   <span>{page}</span>
   <button className="btn" disabled={!hasMore||loading||!!busy} onClick={()=>move(page+1)}>{t('Next','Trang sau')}</button>
  </div>
 </section>;
}
