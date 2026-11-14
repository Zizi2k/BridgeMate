'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import {aptisPhotoPath,type AptisPhotoSlot} from '../lib/aptis-photos';
import Image from 'next/image';
import styles from './aptis.module.css';

const introDuration=850;
const waveDuration=1000;
const waveInterval=780;
const colors=['#ffd785','#ff668e','#83e6d1','#b99bff','#fff4da'];
const fireworks=[{x:19,y:28,delay:.65},{x:79,y:20,delay:1.25},{x:67,y:42,delay:2.05}];

export default function AptisCelebration({lang,onContinue}:{lang:string;onContinue:()=>void}){
 const [slots,setSlots]=useState<AptisPhotoSlot[]|null>(null);
 const vi=lang==='vi';

 useEffect(()=>{
  const controller=new AbortController();
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(2500)]);
  fetch('/api/aptis/photos',{cache:'no-store',signal}).then(async response=>{
   if(!response.ok)throw new Error();
   const {data}=await response.json() as {data:AptisPhotoSlot[]};
   if(!controller.signal.aborted)setSlots(data);
  }).catch(()=>{if(!controller.signal.aborted)setSlots([])});
  return ()=>controller.abort();
 },[]);

 useEffect(()=>{
  if(!slots)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=Math.max(4400,introDuration+(slots.length-1)*waveInterval+waveDuration+400);
  const timer=window.setTimeout(onContinue,reduce?2300:duration);
  return ()=>window.clearTimeout(timer);
 },[onContinue,slots]);

 const bursts=[...fireworks,...(slots??[]).map((_,index)=>({x:index%2?80:20,y:34-index%3*6,delay:(introDuration+index*waveInterval)/1000}))];

 return <main className={styles.celebration} aria-labelledby="aptis-congratulations">
  <div className={styles.effects} aria-hidden="true">
   {bursts.map(({x,y,delay},burst)=>Array.from({length:18},(_,index)=>{
    const angle=index*Math.PI/9;
    const radius=62+(index%3)*18;
    const vars={
     '--x':x+'%','--y':y+'%','--dx':Math.cos(angle)*radius+'px','--dy':Math.sin(angle)*radius+'px',
     '--delay':delay+'s','--color':colors[index%colors.length],
    } as CSSProperties;
    return <i className={styles.spark} key={burst+'-'+index} style={vars}/>;
   }))}
   {Array.from({length:Math.max(10,(slots?.length??0)*3)},(_,index)=>{
    const vars={'--x':(8+(index*23)%83)+'%','--delay':(.35+Math.floor(index/3)*.55+(index%3)*.13)+'s','--drift':(index%2===0?44:-44)+'px'} as CSSProperties;
    return <span className={styles.rose} key={index} style={vars}>🌹</span>;
   })}
  </div>
  <div className={styles.celebrationContent}>
   <h1 id="aptis-congratulations" lang="en">Congratulations!</h1>
   <p role="status">{vi?'Đúng 5/5 câu Aptis':'5/5 Aptis questions correct'}</p>
   {!!slots?.length&&<div className={styles.waveStage} aria-hidden="true">
    {slots.map((slot,index)=><Image key={slot} src={'/api/aptis/'+aptisPhotoPath(slot)}
     alt="" width={640} height={720} loading="eager" unoptimized
     onError={event=>{event.currentTarget.hidden=true}}
     className={styles.celebrationPhoto}
     style={{'--wave-delay':introDuration+index*waveInterval+'ms','--wave-duration':waveDuration+'ms','--wave-direction':index%2===0?1:-1} as CSSProperties}/>)}
   </div>}
   <button className="btn primary" type="button" onClick={onContinue}>{vi?'Vào BridgeMate':'Enter BridgeMate'}</button>
  </div>
 </main>;
}
