'use client';
import {useEffect,useRef,useState} from 'react';
import type {ActionFeedback} from '../lib/action-feedback';
export default function ActionNotifications(){
 const [notice,setNotice]=useState<(ActionFeedback&{id:number})|null>(null),[paused,setPaused]=useState(false);
 const ref=useRef<HTMLDivElement>(null),sequence=useRef(0);
 useEffect(()=>{const receive=(event:Event)=>{const detail=(event as CustomEvent<ActionFeedback>).detail;if(!detail?.message||!['success','error'].includes(detail.kind))return;setNotice({...detail,id:Date.now()+(sequence.current++/1000)});setPaused(false)};window.addEventListener('bm-action-feedback',receive);const invalid=()=>{receive(new CustomEvent('bm-action-feedback',{detail:{kind:'error',message:'Vui lòng điền đầy đủ và kiểm tra các trường được đánh dấu.'}}))};document.addEventListener('invalid',invalid,true);return()=>{window.removeEventListener('bm-action-feedback',receive);document.removeEventListener('invalid',invalid,true)}},[]);
 useEffect(()=>{if(!notice)return;const element=ref.current;if(element&&typeof element.showPopover==='function'){try{if(!element.matches(':popover-open'))element.showPopover()}catch{}}if(paused)return;const timer=setTimeout(()=>setNotice(null),notice.kind==='error'?8000:4500);return()=>clearTimeout(timer)},[notice,paused]);
 return notice?<div ref={ref} popover="manual" className={'action-notification '+notice.kind} role={notice.kind==='error'?'alert':'status'} aria-live={notice.kind==='error'?'assertive':'polite'} aria-atomic="true" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}><span className="action-notification-icon" aria-hidden="true">{notice.kind==='success'?'✓':'!'}</span><div><strong>{notice.kind==='success'?'Thành công':'Không thành công'}</strong><p>{notice.message}</p></div><button type="button" aria-label="Đóng thông báo" onClick={()=>setNotice(null)}>×</button></div>:null;
}
