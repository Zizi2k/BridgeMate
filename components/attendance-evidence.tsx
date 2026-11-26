'use client';
import {actionFetch} from '../lib/action-feedback';
import AttendancePhotoPicker from './attendance-photo-picker';
import {useEffect,useRef,useState} from 'react';
import {MAX_EVIDENCE_BYTES,imageFilenameAllowed} from '../lib/attendance-evidence';
export async function evidencePayload(file:File){
 if(file.size<=0)throw Error('Ảnh đang rỗng. Hãy chọn một ảnh khác.');
 if(file.size>MAX_EVIDENCE_BYTES)throw Error('Ảnh '+file.name+' vượt quá 3 MB. Hãy giảm dung lượng rồi tải lại.');
 if(!imageFilenameAllowed(file.name,file.type))throw Error(file.name+' không được nhận dạng là định dạng ảnh.');
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Không đọc được ảnh'));reader.readAsDataURL(file)});
 return {name:file.name,mime:file.type,data};
}
async function saveEvidence(entryId:string,file:File,photoId?:string){
 const payload=await evidencePayload(file);
 const res=await actionFetch('/api/attendance/'+entryId+'/photos'+(photoId?'/'+photoId:''),{method:photoId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 if(!res.ok)throw Error('Không tải được ảnh. Kiểm tra quyền đổi ảnh, giới hạn 3 MB/ảnh và 10 ảnh/ca rồi thử lại. Ca chấm công vẫn được giữ.');
}
export async function uploadEvidence(entryId:string,files:File[],onUploaded?:(file:File)=>void){
 if(files.length>10)throw Error('Mỗi ca chỉ lưu tối đa 10 ảnh.');
 for(const file of files){await saveEvidence(entryId,file);onUploaded?.(file)}
}
type Photo={clockAction?:string;id:string;name:string;mime:string;createdAt:string;expiresAt:string;changeReason?:string;changeStatus?:string};
export default function AttendanceEvidence({entryId,canUpload,canRequestChange=false,canAdminReplace=false,owns=false,changeRequested=false}:{entryId:string;canUpload:boolean;canRequestChange?:boolean;canAdminReplace?:boolean;owns?:boolean;changeRequested?:boolean}){
 const [open,setOpen]=useState(false),[photos,setPhotos]=useState<Photo[]>([]),[files,setFiles]=useState<File[]>([]),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 const [loaded,setLoaded]=useState(false);
 const [review,setReview]=useState<Photo|null>(null),[requesting,setRequesting]=useState(''),[reason,setReason]=useState(''),[replacements,setReplacements]=useState<Record<string,File>>({});
 const dialogRef=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(review)dialogRef.current?.showModal();else dialogRef.current?.close()},[review]);
 async function load(){const res=await actionFetch('/api/attendance/'+entryId+'/photos',{cache:'no-store'});if(!res.ok)throw Error('Không tải được danh sách ảnh.');setPhotos((await res.json()).data);setLoaded(true)}
 async function run(action:()=>Promise<void>){setBusy(true);setError('');setMessage('');try{await action();await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}
 const source=(photo:Photo)=>'/api/attendance/'+entryId+'/photos/'+photo.id+'?v='+encodeURIComponent(photo.createdAt);
 const previewable=(photo:Photo)=>['image/jpeg','image/png','image/gif','image/webp','image/avif'].includes(photo.mime);
 return <div><button className="btn" disabled={busy} onClick={()=>{if(open){setOpen(false);return}void run(async()=>{await load();setOpen(true)})}}>Xem ảnh minh chứng{(loaded?photos.some(photo=>photo.changeStatus==='pending'):changeRequested)?' · Có yêu cầu đổi ảnh':''}</button>
 {open&&<div>{photos.map(photo=><article key={photo.id+photo.createdAt} className="review-card" style={{maxWidth:420,marginTop:12}}>
 {previewable(photo)&&<button type="button" onClick={()=>setReview(photo)} aria-label={'Xem trước '+photo.name} style={{display:'block',padding:0,border:0,background:'transparent',cursor:'zoom-in'}}><img src={source(photo)} alt={photo.name} loading="lazy" style={{maxWidth:'100%',width:240,maxHeight:180,objectFit:'contain'}}/></button>}
 {photo.clockAction&&<strong>{photo.clockAction==='in'?'Ảnh chấm giờ vào':photo.clockAction==='out'?'Ảnh chấm giờ ra':'Ảnh chấm công bổ sung'}</strong>}
 <p style={{overflowWrap:'anywhere'}}>{photo.name}</p><button className="btn" onClick={()=>setReview(photo)}>Review / xem ảnh</button>
 <p>Hết hạn: {new Date(photo.expiresAt).toLocaleDateString('vi-VN')}</p>
 {photo.changeStatus==='pending'&&<p role="status"><strong>Yêu cầu đổi ảnh:</strong> {photo.changeReason}</p>}
 {photo.changeStatus==='resolved'&&<p>Đã gửi ảnh thay thế.</p>}
 {canRequestChange&&<button className="btn" disabled={busy} onClick={()=>{setRequesting(photo.id);setReason('')}}>Yêu cầu thay đổi ảnh</button>}
 {requesting===photo.id&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{const res=await actionFetch('/api/attendance/'+entryId+'/photos/'+photo.id+'/request-change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason})});if(!res.ok)throw Error('Không gửi được yêu cầu. Kiểm tra lại quyền phòng ban.');setRequesting('');setMessage('Đã gửi yêu cầu đổi ảnh cho nhân viên.')})}}>
 <label>Lý do yêu cầu <textarea required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label><button className="btn" disabled={busy}>Gửi yêu cầu</button><button className="btn" type="button" onClick={()=>setRequesting('')}>Hủy</button></form>}
 {(canAdminReplace||owns&&photo.changeStatus==='pending')&&<><AttendancePhotoPicker files={replacements[photo.id]?[replacements[photo.id]]:[]} disabled={busy} onPreparingChange={setBusy} label="Ảnh thay thế" onChange={files=>setReplacements(current=>{const next={...current};if(files[0])next[photo.id]=files[0];else delete next[photo.id];return next})}/><button className="btn" disabled={busy||!replacements[photo.id]} onClick={()=>void run(async()=>{await saveEvidence(entryId,replacements[photo.id],photo.id);setReplacements(current=>{const next={...current};delete next[photo.id];return next});setMessage('Đã thay ảnh minh chứng và hoàn tất yêu cầu.')})}>Gửi ảnh thay thế</button></>}
 </article>)}{!photos.length&&<p>Chưa có ảnh hoặc ảnh đã hết hạn lưu 2 tháng.</p>}
 {canUpload&&<><AttendancePhotoPicker key={revision} files={files} onChange={setFiles} multiple disabled={busy} onPreparingChange={setBusy} label="Thêm ảnh minh chứng (3 MB/ảnh, tối đa 10 ảnh/ca)"/><button className="btn" disabled={busy||!files.length} onClick={()=>void run(async()=>{await uploadEvidence(entryId,files,file=>setFiles(current=>current.filter(item=>item!==file)));setFiles([]);setRevision(value=>value+1)})}>Tải ảnh lên</button></>}
 </div>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}
 <dialog ref={dialogRef} onCancel={()=>setReview(null)} onClose={()=>setReview(null)} aria-label="Xem ảnh minh chứng" style={{width:'min(90vw,1000px)',maxHeight:'90vh',padding:24,borderRadius:12}}>{review&&<><button className="btn" onClick={()=>setReview(null)}>Đóng ảnh</button><h3 style={{overflowWrap:'anywhere'}}>{review.name}</h3>{previewable(review)?<img src={source(review)} alt={review.name} style={{display:'block',maxWidth:'100%',maxHeight:'65vh',objectFit:'contain',margin:'auto'}}/>:<p>Trình duyệt không xem trực tiếp định dạng này. Tải ảnh gốc để xem.</p>}<a className="btn" href={source(review)} target="_blank" rel="noopener noreferrer">Mở / tải ảnh gốc</a></>}</dialog>
 </div>;
}
