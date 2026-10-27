'use client';

import {useEffect,useRef,useState,type ChangeEvent,type FormEvent} from 'react';
import {Camera,Check,ExternalLink,Heart,Loader2,Plus,Quote,Trash2,Upload,UserRound,X} from 'lucide-react';
type Social={platform:string;url:string};
type Profile={id:string;name:string;bio:string;interests:string[];slogan:string;socials:Social[];avatar:string;updatedAt:string|null};
const platforms=['Facebook','Instagram','LinkedIn','GitHub','TikTok','YouTube','X','Website'];
const empty:Profile={id:'',name:'',bio:'',interests:[],slogan:'',socials:[],avatar:'',updatedAt:null};
async function api(path:string,method='GET',body?:unknown){
 const r=await fetch('/api/'+path,{method,credentials:'same-origin',cache:'no-store',headers:method==='GET'?{}:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const data=await r.json();if(!r.ok)throw new Error(data.error?.code||'SERVER_ERROR');return data.data;
}
async function prepareAvatar(file:File):Promise<string>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024)throw new Error('PROFILE_IMAGE_INVALID');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  if(!image.naturalWidth||!image.naturalHeight)throw new Error('PROFILE_IMAGE_INVALID');
  const canvas=document.createElement('canvas');canvas.width=384;canvas.height=384;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('PROFILE_IMAGE_INVALID');
  const side=Math.min(image.naturalWidth,image.naturalHeight);
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,384,384);
  ctx.drawImage(image,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side,0,0,384,384);
  let result=canvas.toDataURL('image/jpeg',0.82);
  if(result.length>160000)result=canvas.toDataURL('image/jpeg',0.6);
  if(result.length>160000)throw new Error('PROFILE_IMAGE_INVALID');return result;
 }finally{URL.revokeObjectURL(url);}
}
export default function ProfilePanel({userId,viewerId,lang,onSaved}:{userId:string;viewerId:string;lang:string;onSaved:(profile:Profile)=>void}){
 const [profile,setProfile]=useState<Profile|null>(null),[draft,setDraft]=useState<Profile>(empty),[editing,setEditing]=useState(false),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[uploading,setUploading]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[interests,setInterests]=useState('');
 const fileInput=useRef<HTMLInputElement>(null),own=userId===viewerId;
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const message=(code:string)=>({PROFILE_IMAGE_INVALID:t('Choose a JPG, PNG or WebP image up to 8 MB.','Chọn ảnh JPG, PNG hoặc WebP tối đa 8 MB.'),PROFILE_LINK_INVALID:t('Use a complete HTTPS link for each social account.','Nhập liên kết HTTPS đầy đủ cho từng tài khoản mạng xã hội.'),PROFILE_INVALID:t('Check field lengths and enter at most 12 interests.','Kiểm tra độ dài thông tin và nhập tối đa 12 sở thích.'),FORBIDDEN:t('Profiles are available only to you and your teammates.','Chỉ bạn và thành viên cùng nhóm được xem hồ sơ.'),UNAUTHORIZED:t('Please sign in again.','Vui lòng đăng nhập lại.')}[code]||t('Could not load or save your profile. Please try again.','Không thể tải hoặc lưu hồ sơ. Vui lòng thử lại.'));
 useEffect(()=>{let live=true;setLoading(true);api('profiles/'+userId).then(data=>{if(live){setProfile(data);setDraft(data);setInterests(data.interests.join(', '));}}).catch(e=>{if(live)setError(message(e.message));}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[userId]);
 async function upload(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setUploading(true);setError('');try{const avatar=await prepareAvatar(file);setDraft(d=>({...d,avatar}));}catch{setError(message('PROFILE_IMAGE_INVALID'));}finally{setUploading(false);}}
 async function save(e:FormEvent){e.preventDefault();setSaving(true);setError('');setSaved(false);try{
  const updated:Profile=await api('profiles/me','PATCH',{name:draft.name,bio:draft.bio,slogan:draft.slogan,interests:interests.split(/[,\n]/).map(s=>s.trim()).filter(Boolean),socials:draft.socials.filter(s=>s.url.trim()),avatar:draft.avatar});
  setProfile(updated);setDraft(updated);setInterests(updated.interests.join(', '));setEditing(false);setSaved(true);onSaved(updated);
 }catch(e){setError(message(e instanceof Error?e.message:''));}finally{setSaving(false);}}
 if(loading)return <div className="profile-loading" role="status"><Loader2 className="spin"/>{t('Loading profile…','Đang tải hồ sơ…')}</div>;
 if(!profile)return <p className="error" role="alert">{error}</p>;
 const shown=editing?draft:profile;
 return <div className="profile-panel">
  <div className="profile-cover"><span className="eyebrow">{t('A PERSON BEHIND EVERY IDEA','MỖI Ý TƯỞNG ĐỀU CÓ MỘT CÂU CHUYỆN')}</span><span className="profile-cover-art" aria-hidden="true">✦</span></div>
  <div className="profile-heading"><div className="profile-portrait">{shown.avatar?<img src={shown.avatar} alt={shown.name}/>:<UserRound size={42}/>}</div><div><span className="eyebrow">{own?t('MY PROFILE','HỒ SƠ CỦA TÔI'):t('TEAMMATE PROFILE','HỒ SƠ THÀNH VIÊN')}</span><h2>{shown.name}</h2></div></div>
  {saved&&<p className="profile-success" role="status"><Check size={17}/>{t('Profile published. Your teammates can see the update.','Đã đăng hồ sơ. Thành viên cùng nhóm có thể xem cập nhật.')}</p>}
  {error&&<p className="error" role="alert">{error}</p>}
  {editing?<form className="profile-form" onSubmit={save}>
   <div className="profile-photo-actions"><input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} aria-label={t('Upload avatar','Tải ảnh đại diện')}/><button type="button" className="btn" onClick={()=>fileInput.current?.click()} disabled={uploading||saving}>{uploading?<Loader2 size={16} className="spin"/>:<Upload size={16}/>} {t('Upload avatar','Tải ảnh đại diện')}</button>{draft.avatar&&<button type="button" className="text-button" disabled={saving} onClick={()=>setDraft(d=>({...d,avatar:''}))}><Trash2 size={14}/>{t('Remove photo','Xóa ảnh')}</button>}<small className="muted">{t('JPG, PNG, WebP · up to 8 MB · square center crop','JPG, PNG, WebP · tối đa 8 MB · cắt vuông ở giữa')}</small></div>
   <label className="field">{t('Display name','Tên hiển thị')}<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} maxLength={80} required disabled={saving}/></label>
   <label className="field">{t('Personal slogan','Slogan cá nhân')}<input value={draft.slogan} onChange={e=>setDraft({...draft,slogan:e.target.value})} maxLength={180} placeholder={t('A sentence that sounds like you…','Một câu nói thể hiện chính bạn…')} disabled={saving}/><small className="muted">{draft.slogan.length}/180</small></label>
   <label className="field">{t('About me','Giới thiệu bản thân')}<textarea value={draft.bio} onChange={e=>setDraft({...draft,bio:e.target.value})} rows={4} maxLength={1000} disabled={saving}/></label>
   <label className="field">{t('Interests','Sở thích')}<textarea value={interests} onChange={e=>setInterests(e.target.value)} rows={2} maxLength={500} placeholder={t('Coding, swimming, music…','Lập trình, bơi lội, âm nhạc…')} disabled={saving}/><small className="muted">{t('Separate with commas. Up to 12 interests, 40 characters each.','Phân cách bằng dấu phẩy. Tối đa 12 sở thích, mỗi mục 40 ký tự.')}</small></label>
   <section className="profile-social-editor"><h3>{t('Social accounts & website','Mạng xã hội và website')}</h3>{draft.socials.map((social,i)=><div className="profile-social-row" key={i}><select value={social.platform} disabled={saving} aria-label={t('Platform','Nền tảng')} onChange={e=>setDraft({...draft,socials:draft.socials.map((s,j)=>j===i?{...s,platform:e.target.value}:s)})}>{platforms.map(p=><option key={p}>{p}</option>)}</select><input type="url" value={social.url} disabled={saving} required maxLength={500} placeholder="https://…" aria-label={t('Profile link','Liên kết hồ sơ')} onChange={e=>setDraft({...draft,socials:draft.socials.map((s,j)=>j===i?{...s,url:e.target.value}:s)})}/><button type="button" className="icon-btn" disabled={saving} aria-label={t('Remove link','Xóa liên kết')} onClick={()=>setDraft({...draft,socials:draft.socials.filter((_,j)=>j!==i)})}><X size={16}/></button></div>)}<button type="button" className="btn small-btn" disabled={saving||draft.socials.length>=8} onClick={()=>setDraft({...draft,socials:[...draft.socials,{platform:'Facebook',url:''}]})}><Plus size={15}/>{t('Add social link','Thêm mạng xã hội')}</button></section>
   <p className="profile-visibility">{t('Publish shares these details with your teammates. Your email and password are never shown here.','Đăng hồ sơ sẽ chia sẻ các thông tin này với thành viên cùng nhóm. Email và mật khẩu không hiển thị tại đây.')}</p>
   <div className="profile-form-actions"><button type="button" className="btn" disabled={saving||uploading} onClick={()=>{setDraft(profile);setInterests(profile.interests.join(', '));setEditing(false);setError('');}}>{t('Cancel','Hủy')}</button><button className="btn primary" disabled={saving||uploading}>{saving?<Loader2 size={16} className="spin"/>:<Check size={16}/>} {t('Save & publish profile','Lưu và đăng hồ sơ')}</button></div>
  </form>:<div className="profile-details">
   {shown.slogan?<blockquote className="profile-slogan"><Quote size={21}/><p>{shown.slogan}</p></blockquote>:<p className="muted">{t('A new story starts here.','Một câu chuyện mới bắt đầu từ đây.')}</p>}
   <section><h3>{t('About me','Giới thiệu bản thân')}</h3><p className="profile-bio">{shown.bio||t('No introduction yet.','Chưa có lời giới thiệu.')}</p></section>
   <section><h3><Heart size={16}/>{t('Interests','Sở thích')}</h3><div className="profile-interests">{shown.interests.length?shown.interests.map(s=><span key={s}>{s}</span>):<p className="muted">{t('No interests added yet.','Chưa thêm sở thích.')}</p>}</div></section>
   <section><h3>{t('Connect with me','Kết nối với tôi')}</h3><div className="profile-social-links">{shown.socials.length?shown.socials.map((s,i)=><a key={i} href={s.url} target="_blank" rel="noopener noreferrer"><span>{s.platform}</span><ExternalLink size={15}/></a>):<p className="muted">{t('No social links added yet.','Chưa thêm mạng xã hội.')}</p>}</div></section>
   <div className="profile-footer"><small className="muted">{t('Visible to teammates','Hiển thị với thành viên cùng nhóm')}{shown.updatedAt?' · '+new Date(shown.updatedAt).toLocaleDateString(lang==='vi'?'vi-VN':'en-GB'):''}</small>{own&&<button className="btn primary" onClick={()=>{setEditing(true);setSaved(false);setError('');}}><Camera size={16}/>{t('Edit profile','Chỉnh sửa hồ sơ')}</button>}</div>
  </div>}
 </div>;
}
