'use client';
import {useState} from 'react';
import {MAX_EVIDENCE_BYTES,imageFilenameAllowed} from '../lib/attendance-evidence';
export async function uploadEvidence(entryId:string,files:File[],onUploaded?:(file:File)=>void){
 if(files.length>10)throw Error('Mỗi ca chỉ lưu tối đa 10 ảnh.');
 for(const file of files){
  if(file.size>MAX_EVIDENCE_BYTES)throw Error('Ảnh '+file.name+' vượt quá 3 MB. Hãy giảm dung lượng rồi tải lại.');
  if(!imageFilenameAllowed(file.name,file.type))throw Error(file.name+' không được nhận dạng là định dạng ảnh.');
  const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Không đọc được ảnh'));reader.readAsDataURL(file)});
  const res=await fetch('/api/attendance/'+entryId+'/photos',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,mime:file.type,data})});
  if(!res.ok)throw Error('Không tải được ảnh '+file.name+'. Ca chấm công đã được lưu. Kiểm tra quyền tải ảnh và giới hạn 10 ảnh/ca rồi tải lại tại mục Ảnh minh chứng.');
  onUploaded?.(file);
 }
}
export default function AttendanceEvidence({entryId,canUpload}:{entryId:string;canUpload:boolean}){
 const [open,setOpen]=useState(false),[photos,setPhotos]=useState<any[]>([]),[files,setFiles]=useState<File[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0);
 async function load(){const res=await fetch('/api/attendance/'+entryId+'/photos',{cache:'no-store'});if(!res.ok)throw Error('Không tải được danh sách ảnh.');setPhotos((await res.json()).data)}
 return <div><button className="btn" disabled={busy} onClick={async()=>{if(open){setOpen(false);return}setBusy(true);setError('');try{await load();setOpen(true)}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>Ảnh minh chứng</button>
 {open&&<div>{photos.map(photo=><div key={photo.id}><a href={'/api/attendance/'+entryId+'/photos/'+photo.id} target="_blank" rel="noopener noreferrer">{photo.name} · Xem / tải ảnh</a><p>Hết hạn: {new Date(photo.expiresAt).toLocaleDateString('vi-VN')}</p></div>)}{!photos.length&&<p>Chưa có ảnh hoặc ảnh đã hết hạn lưu 2 tháng.</p>}
 {canUpload&&<><label>Thêm ảnh (tối đa 3 MB/ảnh, 10 ảnh/ca)<input key={revision} type="file" multiple onChange={e=>setFiles(Array.from(e.target.files||[]))}/></label><button className="btn" disabled={busy||!files.length} onClick={async()=>{setBusy(true);setError('');try{await uploadEvidence(entryId,files,file=>setFiles(current=>current.filter(item=>item!==file)));setFiles([]);setRevision(value=>value+1);await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>Tải ảnh lên</button></>}
 </div>}{error&&<p role="alert">{error}</p>}</div>;
}
