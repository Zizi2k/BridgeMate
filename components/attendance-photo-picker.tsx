'use client';
import {useEffect,useRef,useState} from 'react';
import {MAX_EVIDENCE_BYTES,imageFilenameAllowed,evidencePreviewMime} from '../lib/attendance-evidence';
import {cameraImageSize} from '../lib/camera-image';
async function capturedPhoto(file:File){
 if(file.size<=MAX_EVIDENCE_BYTES)return file;
 if(file.size>25*1024*1024||!evidencePreviewMime(new Uint8Array(await file.slice(0,32).arrayBuffer())))throw Error('Hãy chọn chế độ chụp JPEG/PNG hoặc giảm kích thước ảnh trên điện thoại.');
 const url=URL.createObjectURL(file);
 try{
  const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Không tối ưu được ảnh chụp. Hãy chọn chế độ JPEG hoặc ảnh nhỏ hơn 3 MB.'));image.src=url});
  const size=cameraImageSize(image.naturalWidth,image.naturalHeight),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const context=canvas.getContext('2d');if(!context)throw Error('Thiết bị không hỗ trợ xử lý ảnh. Hãy chọn ảnh nhỏ hơn 3 MB.');context.drawImage(image,0,0,size.width,size.height);
  for(const quality of [.9,.8,.65]){const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob&&blob.size>0&&blob.size<=MAX_EVIDENCE_BYTES)return new File([blob],'cham-cong-'+Date.now()+'.jpg',{type:'image/jpeg',lastModified:Date.now()})}
  throw Error('Ảnh chụp vẫn vượt 3 MB. Hãy giảm độ phân giải camera rồi chụp lại.');
 }finally{URL.revokeObjectURL(url)}
}
export default function AttendancePhotoPicker({files,onChange,disabled=false,multiple=false,label='Ảnh minh chứng',maxFiles=10,onPreparingChange}:{files:File[];onChange:(files:File[])=>void;disabled?:boolean;multiple?:boolean;label?:string;maxFiles?:number;onPreparingChange?:(busy:boolean)=>void}){
 const camera=useRef<HTMLInputElement>(null),gallery=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false),[error,setError]=useState(''),[previews,setPreviews]=useState<{file:File;url:string}[]>([]);
 useEffect(()=>{let active=true;const urls:string[]=[];void Promise.all(files.map(async file=>{try{if(!evidencePreviewMime(new Uint8Array(await file.slice(0,32).arrayBuffer())))return null;const url=URL.createObjectURL(file);urls.push(url);return {file,url}}catch{return null}})).then(images=>{if(active)setPreviews(images.filter((image):image is {file:File;url:string}=>image!==null));else urls.forEach(url=>URL.revokeObjectURL(url))});return()=>{active=false;urls.forEach(url=>URL.revokeObjectURL(url))}},[files]);

 async function select(selected:File[],captured:boolean){if(!selected.length)return;setBusy(true);onPreparingChange?.(true);setError('');if(!multiple)onChange([]);try{
  const chosen:File[]=[];for(const source of selected){if(!imageFilenameAllowed(source.name,source.type))throw Error('Chỉ chọn định dạng ảnh hợp lệ.');const file=captured?await capturedPhoto(source):source;if(!file.size||file.size>MAX_EVIDENCE_BYTES)throw Error('Ảnh '+file.name+' phải có dung lượng từ 1 byte đến 3 MB.');chosen.push(file)}
  const next=multiple?[...files,...chosen]:[chosen[0]];if(next.length>(multiple?maxFiles:1))throw Error('Bạn có thể chọn tối đa '+(multiple?maxFiles:1)+' ảnh trong lần này.');onChange(next);
 }catch(error){setError(error instanceof Error?error.message:'Không đọc được ảnh.')}finally{setBusy(false);onPreparingChange?.(false)}}
 return <div className="attendance-photo-picker"><strong>{label}</strong><div style={{display:'flex',gap:8,flexWrap:'wrap',margin:'8px 0'}}>
 <button type="button" className="btn primary" disabled={disabled||busy} onClick={()=>camera.current?.click()}>Chụp ảnh trực tiếp</button><button type="button" className="btn" disabled={disabled||busy} onClick={()=>gallery.current?.click()}>Chọn ảnh từ máy</button>
 <input ref={camera} type="file" accept="image/*" capture="environment" hidden aria-label="Chụp ảnh minh chứng bằng camera điện thoại" disabled={disabled||busy} onChange={event=>{const selected=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void select(selected,true)}}/>
 <input ref={gallery} type="file" hidden multiple={multiple} aria-label="Chọn ảnh minh chứng từ thiết bị" disabled={disabled||busy} onChange={event=>{const selected=Array.from(event.currentTarget.files||[]);event.currentTarget.value='';void select(selected,false)}}/>
 </div><small>Trên điện thoại hỗ trợ, nút chụp mở camera. Ảnh chụp lớn sẽ được tối ưu để tải lên, tối đa 3 MB/ảnh. Trên máy không hỗ trợ camera, dùng nút chọn ảnh.</small>
 {busy&&<p role="status">Đang chuẩn bị ảnh…</p>}{error&&<p role="alert">{error}</p>}
 {files.map((file,index)=>{const preview=previews.find(item=>item.file===file);return <div key={file.name+file.lastModified+index} style={{marginTop:10,maxWidth:300}}>{preview&&<img src={preview.url} alt={'Ảnh đã chọn: '+file.name} style={{maxWidth:'100%',maxHeight:220,objectFit:'contain',borderRadius:8}}/>}<p style={{overflowWrap:'anywhere'}}>{file.name} · {(file.size/1024/1024).toFixed(2)} MB</p><button type="button" className="btn" disabled={disabled||busy} onClick={()=>onChange(files.filter((_,position)=>position!==index))}>Bỏ ảnh đã chọn</button></div>})}
 </div>
}
