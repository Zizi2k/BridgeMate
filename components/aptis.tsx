'use client';

import {useEffect,useRef,useState,type ReactNode} from 'react';
import {BookOpen,CheckCircle2,Lightbulb,Loader2} from 'lucide-react';
import BrandMark from './brand-mark';
import {aptisPhotoSlots,aptisPhotoPath,type AptisPhotoSlot} from '../lib/aptis-photos';
import AptisCelebration from './aptis-celebration';
import styles from './aptis.module.css';

type Question={word:string;options:string[]};
type Challenge={id:string;questions:Question[]};
type Result={scores:boolean[];passed:boolean};
type Hint={text:string;ai:boolean};
type Bank={count:number;enabled:boolean};

async function aptisRequest<T>(action:string,method='GET',body?:object):Promise<T>{
 const response=await fetch('/api/aptis/'+action,{
  method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),
 });
 const result=await response.json();
 if(response.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 if(!response.ok)throw new Error(result.error?.code||'APTIS_ERROR');
 return result.data;
}

export function AptisGate({lang,controls,onContinue,onLogout}:{
 lang:string;controls:ReactNode;onContinue:()=>void;onLogout:()=>Promise<void>;
}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [challenge,setChallenge]=useState<Challenge|null>(null),[answers,setAnswers]=useState<number[]>([]);
 const [result,setResult]=useState<Result|null>(null),[hints,setHints]=useState<Record<number,Hint>>({});
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[hintIndex,setHintIndex]=useState<number|null>(null);
 const [error,setError]=useState(''),[revision,setRevision]=useState(0);

 useEffect(()=>{
  let active=true;
  aptisRequest<Challenge|null>('start','POST',{}).then(data=>{
   if(!active)return;
   if(!data){onContinue();return;}
   setChallenge(data);
   setAnswers(data.questions.map(()=>-1));
  }).catch(err=>{if(active)setError(err.message)}).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false};
 },[revision,onContinue]);

 function restart(){
  setLoading(true);setChallenge(null);setResult(null);setHints({});setError('');setRevision(value=>value+1);
 }

 async function submit(){
  if(!challenge)return;
  setError('');setBusy(true);
  try{
   const next=await aptisRequest<Result>('submit','POST',{id:challenge.id,answers});
   setResult(next);
   if(!next.passed)setAnswers(current=>current.map((answer,index)=>next.scores[index]?answer:-1));
  }catch(err){
   setError((err as Error).message);
  }finally{setBusy(false)}
 }

 async function hint(index:number){
  if(!challenge)return;
  setHintIndex(index);setError('');
  try{
   const data=await aptisRequest<Hint>('hint','POST',{id:challenge.id,index,language:lang});
   setHints(current=>({...current,[index]:data}));
  }catch(err){setError((err as Error).message)}
  finally{setHintIndex(null)}
 }

 async function skip(){
  setBusy(true);setError('');
  try{await aptisRequest('skip','POST',{});onContinue()}
  catch(err){setError((err as Error).message)}
  finally{setBusy(false)}
 }

 async function logout(){
  setBusy(true);setError('');
  try{await onLogout()}
  catch(err){setError((err as Error).message)}
  finally{setBusy(false)}
 }

 if(result?.passed)return <AptisCelebration lang={lang} onContinue={onContinue}/>;

 const score=result?.scores.filter(Boolean).length??0;
 return <main className={styles.gate}>
  <header className={styles.header}>
   <span className="brand"><BrandMark/>BridgeMate</span>
   <div className={styles.actions}>{controls}<button type="button" className="btn ghost" disabled={busy} onClick={()=>void logout()}>{t('Log out','Đăng xuất')}</button></div>
  </header>
  <section className={styles.intro} aria-labelledby="aptis-title">
   <BookOpen size={24} aria-hidden="true"/>
   <div><h1 id="aptis-title">{t('Aptis vocabulary','Từ vựng Aptis')}</h1><p>{t('Practice 5 vocabulary questions, or skip to open your workspace.','Luyện 5 câu từ vựng, hoặc bỏ qua để vào không gian làm việc.')}</p></div>
   <strong className={styles.score}>{score}/5</strong>
  </section>
  <div className={styles.actions}><button type="button" className="btn" disabled={busy} onClick={()=>void skip()}>{t('Skip and enter workspace','Bỏ qua và vào web')}</button></div>
  {loading&&<p className={styles.status} role="status"><Loader2 className="spin" size={18}/>{t('Preparing your questions…','Đang chuẩn bị câu hỏi…')}</p>}
  {error&&<div className="error" role="alert">
   {error==='APTIS_EXPIRED'?t('This set was replaced in another tab. Start a new set.','Bộ câu hỏi đã được thay ở tab khác. Hãy tải bộ mới.'):t('Could not complete the request. Please try again.','Chưa thực hiện được yêu cầu. Vui lòng thử lại.')}
   {(!challenge||error==='APTIS_EXPIRED')&&<button type="button" className="btn" onClick={restart}>{t('New set','Tải bộ câu mới')}</button>}
  </div>}
  {challenge&&<form onSubmit={event=>{event.preventDefault();void submit()}}>
   {challenge.questions.map((question,index)=>{
    const correct=result?.scores[index]===true;
    return <fieldset key={question.word} className={styles.question}>
     <legend>{index+1}. <span lang="en">{question.word}</span></legend>
     <div className={styles.options}>
      {question.options.map((option,choice)=><label key={option} className={answers[index]===choice?styles.selected:undefined}>
       <input type="radio" name={`aptis-${index}`} checked={answers[index]===choice} required disabled={busy||correct}
        onChange={()=>setAnswers(current=>current.map((answer,i)=>i===index?choice:answer))}/>
       <span lang="vi">{option}</span>
      </label>)}
     </div>
     {correct&&<p className={styles.status}><CheckCircle2 size={16}/>{t('Correct','Đúng')}</p>}
     {result?.scores[index]===false&&<div className={styles.feedback}>
      <p>{t('Try this question again.','Chọn lại đáp án cho câu này.')}</p>
      {hints[index]?<p className={styles.hint}><strong>{hints[index].ai?t('AI hint','Gợi ý AI'):t('Vocabulary hint','Gợi ý từ vựng')}</strong><br/>{hints[index].text}</p>:
       <button type="button" className="btn" disabled={busy||hintIndex!==null} onClick={()=>void hint(index)}>
        {hintIndex===index?<Loader2 className="spin" size={16}/>:<Lightbulb size={16}/>}
        {t('Get an AI hint','Nhận gợi ý AI')}
       </button>}
     </div>}
    </fieldset>;
   })}
   <div className={styles.submit} role="status">
    {result&&<strong>{t(`${score}/5 correct. Retry the remaining questions.`,`Đúng ${score}/5. Hãy làm lại các câu còn sai.`)}</strong>}
    <button type="submit" className="btn primary" disabled={busy||hintIndex!==null||answers.some(answer=>answer<0)}>
     {busy&&<Loader2 className="spin" size={16}/>} {t('Check answers','Kiểm tra đáp án')}
    </button>
   </div>
  </form>}
 </main>;
}

export function AptisBank({lang}:{lang:string}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const [bank,setBank]=useState<Bank|null>(null),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  aptisRequest<Bank>('bank').then(data=>{if(active)setBank(data)}).catch(()=>{if(active)setError('APTIS_ERROR')});
  return ()=>{active=false};
 },[]);

 async function save(makeBody:()=>Promise<object>){
  setBusy(true);setMessage('');setError('');
  try{
   const next=await aptisRequest<Bank>('bank','PATCH',await makeBody());
   setBank(next);
   setMessage('saved');
  }catch(err){setError((err as Error).message)}
  finally{setBusy(false)}
 }

 async function upload(){
  if(!file)return;
  await save(async()=>{
   if(file.size>2*1024*1024||!file.name.toLowerCase().endsWith('.docx'))throw new Error('DOCX_SIZE');
   const dataUrl=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(new Error('DOCX_INVALID'));
    reader.readAsDataURL(file);
   });
   return {docx:dataUrl.slice(dataUrl.indexOf(',')+1)};
  });
 }

 return <fieldset className="review-card">
  <legend>{t('Aptis vocabulary bank','Ngân hàng từ vựng Aptis')}</legend>
  {bank&&<>
   <p>{t(`${bank.count} words and phrases in use`,`Đang dùng ${bank.count} từ và cụm từ`)}</p>
   <label className={styles.toggle}><input type="checkbox" checked={bank.enabled} disabled={busy}
    onChange={event=>{const enabled=event.currentTarget.checked;void save(async()=>({enabled}))}}/>
    {t('Require 5/5 when opening BridgeMate','Yêu cầu đúng 5/5 khi mở BridgeMate')}
   </label>
   <form onSubmit={event=>{event.preventDefault();void upload()}}>
    <label className="field">{t('Import a replacement Word bank','Nhập bộ từ vựng thay thế từ Word')}
     <input type="file" accept=".docx" disabled={busy} onChange={event=>setFile(event.currentTarget.files?.[0]??null)}/>
    </label>
    <p>{t('Use a .docx up to 2 MB with Vocabulary and Meaning columns and at least 5 distinct meanings. Example and Part of Speech are optional.',
     'Dùng file .docx tối đa 2 MB có cột Từ vựng, Nghĩa của từ và ít nhất 5 nghĩa khác nhau. Có thể thêm cột Loại từ và Câu ví dụ.')}</p>
    <button className="btn" type="submit" disabled={busy||!file}>{busy&&<Loader2 size={15} className="spin"/>}{t('Replace vocabulary bank','Thay ngân hàng từ vựng')}</button>
   </form>
  </>}
  <fieldset className={styles.photoSettings}>
   <legend>{t('Celebration images','Ảnh chúc mừng')}</legend>
   <p>{t('Up to 6 transparent PNG or WebP images, 2 MB each. Images play in numbered order.','Tối đa 6 ảnh PNG hoặc WebP đã tách nền, mỗi ảnh tối đa 2 MB. Ảnh xuất hiện theo thứ tự từ 1 đến 6.')}</p>
   <div className={styles.photoSlots}>{aptisPhotoSlots.map(slot=><AptisPhotoEditor key={slot} slot={slot} lang={lang}/>)}</div>
  </fieldset>
  {message&&<p role="status">{t('Saved. New quizzes use the current bank.','Đã lưu. Bài mới sẽ dùng ngân hàng hiện tại.')}</p>}
  {error&&<p role="alert">{error==='DOCX_SIZE'||error==='TOO_LARGE'?t('Choose a .docx file up to 2 MB.','Chọn file .docx tối đa 2 MB.'):
   error==='APTIS_NEEDS_VOCABULARY'?t('Check the column names and add at least 5 distinct meanings.','Kiểm tra tên cột và bổ sung ít nhất 5 nghĩa khác nhau.'):
   error==='APTIS_TOO_MANY_WORDS'?t('The bank supports up to 1,500 entries.','Ngân hàng hỗ trợ tối đa 1.500 từ và cụm từ.'):
   t('Could not read or save the vocabulary bank.','Chưa đọc hoặc lưu được ngân hàng từ vựng.')}</p>}
 </fieldset>;
}

function AptisPhotoEditor({slot,lang}:{slot:AptisPhotoSlot;lang:string}){
 const t=(en:string,vi:string)=>lang==='vi'?vi:en;
 const photoInput=useRef<HTMLInputElement>(null);
 const [photoVersion,setPhotoVersion]=useState(0),[photoBusy,setPhotoBusy]=useState(false),[photoMessage,setPhotoMessage]=useState('');
 async function changePhoto(remove=false){
  const file=photoInput.current?.files?.[0];
  if(!remove&&!file)return;
  setPhotoBusy(true);setPhotoMessage('');
  try{
   if(remove)await aptisRequest(aptisPhotoPath(slot),'DELETE',{});
   else if(file){
    if(file.size>2*1024*1024||!['image/png','image/webp'].includes(file.type))throw Error();
    const image=await new Promise<string>((resolve,reject)=>{
     const reader=new FileReader();
     reader.onload=()=>resolve(String(reader.result));
     reader.onerror=()=>reject(new Error());
     reader.readAsDataURL(file);
    });
    await aptisRequest(aptisPhotoPath(slot),'PATCH',{image});
   }
   if(photoInput.current)photoInput.current.value='';
   setPhotoVersion(version=>version+1);
   setPhotoMessage(remove?t('Photo removed.','Đã gỡ ảnh.'):t('Celebration photo saved.','Đã lưu ảnh chúc mừng.'));
  }catch{setPhotoMessage(t('Could not update the photo. Use a PNG or WebP up to 2 MB.','Chưa cập nhật được ảnh. Hãy chọn PNG hoặc WebP tối đa 2 MB.'))}
  finally{setPhotoBusy(false)}
 }

 return <form onSubmit={event=>{event.preventDefault();void changePhoto()}}>
   <label className="field">{t('Image','Ảnh')} {slot}
    <input ref={photoInput} type="file" accept="image/png,image/webp" disabled={photoBusy}/>
   </label>
   <div className={styles.actions}>
    <button type="submit" className="btn" disabled={photoBusy}>{t('Upload image','Tải ảnh lên')}</button>
    <button type="button" className="btn" disabled={photoBusy} onClick={()=>void changePhoto(true)}>{t('Remove image','Gỡ ảnh')}</button>
   </div>
   {photoMessage&&<p role="status">{photoMessage}</p>}
   <img key={photoVersion} src={`/api/aptis/${aptisPhotoPath(slot)}&v=${photoVersion}`} alt={t('Current celebration image','Ảnh chúc mừng hiện tại')}
    className={styles.photoPreview} onError={event=>{event.currentTarget.hidden=true}}/>
  </form>;
}
