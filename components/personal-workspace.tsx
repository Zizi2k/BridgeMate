'use client';

import {useEffect,useState,type FormEvent} from 'react';
import {CalendarDays,ExternalLink,Link2,Plus} from 'lucide-react';
import styles from './personal-workspace.module.css';

type Kind='links'|'tasks';
type Entry={id:string;title:string;note:string;url?:string;image?:string;category?:string;date?:string;start?:string;end?:string;done?:boolean};
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
const fold=(value:string)=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const newEntry=(date:string):Entry=>({id:'',title:'',note:'',date,start:'09:00',end:'10:00'});

function websiteHost(url?:string){
 if(!url)return '';
 try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}
}

async function cover(file:File){
 if(file.size>12*1024*1024||!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type))throw Error('IMAGE');
 const bitmap=await createImageBitmap(file).catch(()=>{throw Error('IMAGE')});
 const scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(bitmap.width*scale));
 canvas.height=Math.max(1,Math.round(bitmap.height*scale));
 try{
  const context=canvas.getContext('2d');
  if(!context)throw Error('IMAGE');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const image=canvas.toDataURL('image/webp',.8);
  if(!image.startsWith('data:image/webp;')||image.length>800000)throw Error('IMAGE');
  return image;
 }finally{bitmap.close()}
}

async function request(path:string,method='GET',body?:object){
 const response=await fetch('/api/personal/'+path,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 const result=await response.json();
 if(!response.ok){
  if(response.status===401)window.dispatchEvent(new Event('bm-session-expired'));
  throw Error(result.error?.code||'SERVER_ERROR');
 }
 return result.data;
}

export default function PersonalWorkspace({kind,lang}:{kind:Kind;lang:string}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const links=kind==='links';
 const [day,setDay]=useState(today),[rows,setRows]=useState<Entry[]>([]);
 const [query,setQuery]=useState(''),[category,setCategory]=useState('');
 const [edit,setEdit]=useState<Entry|null>(null),[busy,setBusy]=useState(false);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true),[reload,setReload]=useState(0);
 const [showHidden,setShowHidden]=useState(false);
 const path=links?(showHidden?'links?hidden=1':'links'):'tasks?date='+encodeURIComponent(day);

 useEffect(()=>{
  let active=true;
  setLoading(true);setRows([]);setError('');
  request(path).then(data=>{if(active)setRows(data)})
    .catch(e=>{if(active)setError(e.message)})
    .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[path,reload]);

 function changeDay(date:string){if(date&&date!==day){setLoading(true);setDay(date)}}
 function shift(offset:number){
  const date=new Date(day+'T12:00:00Z');
  date.setUTCDate(date.getUTCDate()+offset);
  changeDay(date.toISOString().slice(0,10));
 }
 async function perform(action:()=>Promise<void>){
  setBusy(true);setError('');
  try{await action()}catch(e){setError(e instanceof Error?e.message:'SERVER_ERROR')}
  finally{setBusy(false)}
 }
 function put(item:Entry){
  setRows(current=>item.id&&current.some(row=>row.id===item.id)
    ?current.map(row=>row.id===item.id?item:row):[item,...current]);
 }
 function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(!edit)return;
  const values=new FormData(event.currentTarget), value=(name:string)=>String(values.get(name)||'').trim();
  void perform(async()=>{
   const payload:Partial<Entry>={title:value('title'),note:value('note')};
   if(links){
    const address=value('url');
    payload.url=/^[a-z][a-z0-9+.-]*:\/\//i.test(address)?address:'https://'+address;
    const file=values.get('file');
    payload.image=file instanceof File&&file.size?await cover(file):
      values.has('remove')?'':value('image')||(edit.image?.startsWith('data:')?edit.image:'');
    payload.category=value('category');
   }else Object.assign(payload,{date:value('date'),start:value('start'),end:value('end'),done:edit.done||false});
   const result:Entry=await request(kind+(edit.id?'/'+edit.id:''),edit.id?'PATCH':'POST',payload);
   if(!links&&result.date&&result.date!==day)changeDay(result.date);
   else put(result);
   setEdit(null);
  });
 }
 const categories=[...new Set(rows.map(item=>item.category||'').filter(Boolean))].sort();
 const visible=links?rows.filter(row=>(!category||category===row.category)&&fold([row.title,row.url,row.note,row.category].join(' ')).includes(fold(query.trim()))):
   [...rows].sort((a,b)=>(a.start||'').localeCompare(b.start||'')||a.title.localeCompare(b.title));
 const errorText=error==='IMAGE'?t('Choose a JPG, PNG, WebP or GIF under 12 MB.','Chọn ảnh JPG, PNG, WebP hoặc GIF dưới 12 MB.'):
  error==='VALIDATION'?t('Check the URL or make sure the end time follows the start time.','Kiểm tra địa chỉ website hoặc đặt giờ kết thúc sau giờ bắt đầu.'):
  t('Unable to complete the request. Please try again.','Thao tác chưa thành công. Vui lòng thử lại.');

 return <section className={styles.workspace}>
  <div className="page-heading">
   <div><h1>{links?t('My links','Kho liên kết'):t('Daily planner','Kế hoạch ngày')}</h1><p>{links?t('Save and open your websites.','Lưu và mở nhanh các website của bạn.'):t('Plan your work in time blocks.','Sắp xếp công việc theo khung giờ.')}</p></div>
   <button className="btn primary" disabled={busy||loading||!!edit||showHidden} onClick={()=>{setError('');setEdit(newEntry(day))}}><Plus size={17}/>{links?t('Add link','Thêm liên kết'):t('Add task','Thêm công việc')}</button>
  </div>
  <div className={styles.toolbar}>
   {links?<><input type="search" aria-label={t('Find a link','Tìm liên kết')} placeholder={t('Find a link…','Tìm liên kết…')} value={query} onChange={e=>setQuery(e.target.value)}/>
    <select aria-label={t('Link visibility','Trạng thái hiển thị')} value={showHidden?'hidden':'visible'} disabled={busy||!!edit}
     onChange={event=>{setCategory('');setLoading(true);setRows([]);setShowHidden(event.target.value==='hidden')}}>
     <option value="visible">{t('Visible links','Đang hiển thị')}</option><option value="hidden">{t('Hidden links','Đã ẩn')}</option>
    </select>
    <select aria-label={t('Category','Danh mục')} value={category} onChange={e=>setCategory(e.target.value)}><option value="">{t('All categories','Tất cả danh mục')}</option>{categories.map(c=><option key={c}>{c}</option>)}</select></>:
    <><button className="btn" disabled={busy||!!edit} aria-label={t('Previous day','Ngày trước')} onClick={()=>shift(-1)}>‹</button>
    <input type="date" disabled={busy||!!edit} aria-label={t('Work date','Ngày làm việc')} value={day} onChange={e=>changeDay(e.target.value)}/>
    <button className="btn" disabled={busy||!!edit} aria-label={t('Next day','Ngày sau')} onClick={()=>shift(1)}>›</button>
    <button className="btn" disabled={busy||!!edit} onClick={()=>changeDay(today())}>{t('Today','Hôm nay')}</button>
    <span>{rows.filter(r=>r.done).length}/{rows.length} {t('completed','hoàn thành')}</span></>}
  </div>
  {error&&<p role="alert">{errorText} {!edit&&<button className="btn" onClick={()=>setReload(value=>value+1)}>{t('Reload','Tải lại')}</button>}</p>}
  {edit&&<form className={styles.editor} onSubmit={save}>
   <h2>{edit.id?t('Edit item','Chỉnh sửa'):links?t('New link','Liên kết mới'):t('New task','Công việc mới')}</h2>
   <label>{t('Title','Tên')}<input name="title" required maxLength={120} defaultValue={edit.title}/></label>
   {links?<><label>{t('Website URL','Địa chỉ website')}<input name="url" required maxLength={2048} defaultValue={edit.url} placeholder="https://example.com"/></label>
    <label>{t('Category','Danh mục')}<input name="category" maxLength={40} defaultValue={edit.category}/></label>
    <label>{t('Cover URL','Địa chỉ ảnh bìa')}<input name="image" type="url" maxLength={2048} defaultValue={edit.image?.startsWith('data:')?'':edit.image}/></label>
    <label>{t('Upload cover','Tải ảnh bìa')}<input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"/></label>
    {edit.image&&<label className={styles.check}><input name="remove" type="checkbox"/>{t('Remove cover','Bỏ ảnh bìa')}</label>}</>:
    <><label>{t('Date','Ngày')}<input name="date" type="date" required defaultValue={edit.date}/></label>
    <div className={styles.toolbar}><label>{t('Start','Bắt đầu')}<input name="start" type="time" required defaultValue={edit.start}/></label>
    <label>{t('End','Kết thúc')}<input name="end" type="time" required defaultValue={edit.end}/></label></div></>}
   <label>{t('Notes','Ghi chú')}<textarea name="note" maxLength={500} defaultValue={edit.note}/></label>
   <div className={styles.toolbar}><button className="btn primary" disabled={busy}>{t('Save','Lưu')}</button><button className="btn" type="button" disabled={busy} onClick={()=>{setEdit(null);setError('')}}>{t('Cancel','Hủy')}</button></div>
  </form>}
  {loading?<div className="empty" role="status">{t('Loading…','Đang tải…')}</div>:visible.length?
   <div className={links?styles.grid:styles.list}>{visible.map(item=><article className={links?styles.linkCard:styles.card} key={item.id}>
    {links?<><a className={styles.cover} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={t('Open website: ','Mở website: ')+item.title}>
     <span className={styles.coverPlaceholder} aria-hidden="true"><Link2 size={28}/></span>
     {item.image&&<img key={item.image} src={item.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true}}/>}
     <span className={styles.openIcon} aria-hidden="true"><ExternalLink size={16}/></span>
    </a>
    <div className={styles.linkDetails}>
     {item.category&&<span className={styles.category}>{item.category}</span>}
     <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
     <span className={styles.domain}>{websiteHost(item.url)}</span>
    </div></>:
     <><div className={styles.toolbar}><CalendarDays size={17}/><span>{item.start} – {item.end}</span></div><h3>{item.title}</h3>
     <label className={styles.check}><input type="checkbox" checked={!!item.done} disabled={busy||!!edit} onChange={e=>{const done=e.currentTarget.checked;void perform(async()=>put(await request(kind+'/'+item.id,'PATCH',{...item,done})))}}/>{t('Completed','Hoàn thành')}</label></>}
    {item.note&&<p className={links?styles.linkNote:undefined}>{item.note}</p>}
    <div className={links?styles.linkActions:styles.toolbar}><button className="btn" disabled={busy||!!edit} onClick={()=>{setError('');setEdit(item)}}>{t('Edit','Sửa')}</button>
     {links&&<button type="button" className="btn" disabled={busy||!!edit} aria-label={(showHidden?t('Show ','Hiện '):t('Hide ','Ẩn '))+item.title} onClick={()=>void perform(async()=>{
      await request('links/'+item.id,'PATCH',{hidden:!showHidden});
      setRows(current=>current.filter(row=>row.id!==item.id));
     })}>{showHidden?t('Show','Hiện'):t('Hide','Ẩn')}</button>}
     <button className="btn" disabled={busy||!!edit} onClick={()=>{if(window.confirm(t('Delete this item?','Xóa mục này?')))void perform(async()=>{
      await request(kind+'/'+item.id,'DELETE',{});setRows(current=>current.filter(row=>row.id!==item.id));
     })}}>{t('Delete','Xóa')}</button></div>
   </article>)}</div>:<div className="empty">{links?t('No matching links.','Không có liên kết phù hợp.'):t('No tasks for this day.','Chưa có công việc trong ngày này.')}</div>}
 </section>;
}
