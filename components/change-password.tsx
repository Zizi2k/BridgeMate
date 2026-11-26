'use client';
import {useState,type FormEvent} from 'react';
import {actionFetch,showActionFeedback} from '../lib/action-feedback';
export default function ChangePassword({lang}:{lang:string}){
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;const form=event.currentTarget,values=Object.fromEntries(new FormData(form));
  const invalid=values.newPassword!==values.confirm?t('New passwords do not match.','Hai mật khẩu mới chưa trùng nhau.'):values.newPassword===values.currentPassword?t('Choose a different new password.','Mật khẩu mới phải khác mật khẩu hiện tại.'):'';
  if(invalid){setMessage(invalid);showActionFeedback(invalid,'error');return}
  setBusy(true);setMessage('');try{
   const response=await actionFetch('/api/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}),result=await response.json();
   if(!response.ok)throw Error(result.error?.code||'SERVER_ERROR');
   form.reset();setOpen(false);setMessage(t('Password changed. Other sessions have been signed out.','Đã đổi mật khẩu. Các phiên đăng nhập khác đã được đăng xuất.'));
  }catch(error){const code=error instanceof Error?error.message:'';setMessage(code==='INVALID_LOGIN'?t('Current password is incorrect.','Mật khẩu hiện tại không đúng.'):code==='VALIDATION'?t('Use a different password with 8–128 characters.','Mật khẩu mới phải khác mật khẩu cũ và dài từ 8–128 ký tự.'):t('Could not change the password. Please try again.','Chưa đổi được mật khẩu. Vui lòng thử lại.'));}finally{setBusy(false)}
 }
 return <section className="review-card"><button type="button" className="btn" disabled={busy} aria-expanded={open} onClick={()=>{setOpen(value=>!value);setMessage('')}}>{t('Change password','Đổi mật khẩu')}</button>{open&&<form onSubmit={save}><fieldset disabled={busy} style={{border:0,padding:0,display:'grid',gap:12}}><label className="field">{t('Current password','Mật khẩu hiện tại')}<input type="password" name="currentPassword" autoComplete="current-password" required maxLength={128}/></label><label className="field">{t('New password','Mật khẩu mới')}<input type="password" name="newPassword" autoComplete="new-password" required minLength={8} maxLength={128}/></label><label className="field">{t('Confirm new password','Nhập lại mật khẩu mới')}<input type="password" name="confirm" autoComplete="new-password" required minLength={8} maxLength={128}/></label><button type="submit" className="btn primary">{busy?t('Saving…','Đang lưu…'):t('Save new password','Lưu mật khẩu mới')}</button></fieldset></form>}{message&&<p role="status">{message}</p>}</section>;
}
