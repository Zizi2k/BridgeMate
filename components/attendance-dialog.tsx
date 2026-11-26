'use client';
import {useEffect,useId,useRef,type ReactNode} from 'react';
export default function AttendanceDialog({title,busy=false,onClose,children}:{title:string;busy?:boolean;onClose:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null),titleId=useId();
 useEffect(()=>{const dialog=ref.current;dialog?.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{dialog?.close();document.body.style.overflow=previous}},[]);
 return <dialog ref={ref} className="attendance-dialog" aria-labelledby={titleId} onCancel={event=>{event.preventDefault();if(!busy)onClose()}}><header><h2 id={titleId}>{title}</h2><button type="button" className="btn" aria-label="Đóng form" disabled={busy} onClick={onClose}>Đóng</button></header>{children}</dialog>;
}
