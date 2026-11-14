'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import {aptisPhotoPath,type AptisPhotoSlot} from '../lib/aptis-photos';
import Image from 'next/image';
import styles from './aptis.module.css';

const introDuration=850;
const waveDuration=4000;
const waveInterval=waveDuration;
const colors=['#ffd785','#ff668e','#83e6d1','#b99bff','#fff4da'];
const fireworks=[{x:19,y:28,delay:.65},{x:79,y:20,delay:1.25},{x:67,y:42,delay:2.05}];

export default function AptisCelebration({lang,onContinue}:{lang:string;onContinue:()=>void}){
 const [slots,setSlots]=useState<AptisPhotoSlot[]|null>(null);
 const [settled,setSettled]=useState<Partial<Record<AptisPhotoSlot,boolean>>>({});
 const ready=slots!==null&&slots.every(slot=>settled[slot]!==undefined);
 const visibleSlots=slots?.filter(slot=>settled[slot]!==false)??[];
 const visibleCount=visibleSlots.length;
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
  if(!slots||ready)return;
  const timeout=window.setTimeout(()=>setSettled(current=>{
   const next={...current};
   for(const slot of slots)next[slot]??=false;
   return next;
  }),6000);
  return ()=>window.clearTimeout(timeout);
 },[slots,ready]);

 useEffect(()=>{
  if(!ready)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration=Math.max(4400,introDuration+(visibleCount-1)*waveInterval+waveDuration+400);
  const timer=window.setTimeout(onContinue,reduce?4400:duration);
  return ()=>window.clearTimeout(timer);
 },[onContinue,ready,visibleCount]);

 const bursts=[...fireworks,...(ready?visibleSlots:[]).map((_,index)=>({x:index%2?80:20,y:34-index%3*6,delay:(introDuration+index*waveInterval)/1000}))];

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
   {Array.from({length:10+(ready?visibleSlots.length*3:0)},(_,index)=>{
    const wave=ready&&index>=10?introDuration+Math.floor((index-10)/3)*waveInterval:0;
    const vars={'--x':(8+(index*23)%83)+'%','--delay':(wave/1000+.35+(index%3)*.13)+'s','--drift':(index%2===0?44:-44)+'px'} as CSSProperties;
    return <span className={styles.rose} key={index} style={vars}>🌹</span>;
   })}
  </div>
  <div className={styles.celebrationContent}>
   <h1 id="aptis-congratulations" lang="en">Congratulations!</h1>
   <p role="status">{vi?'Đúng 5/5 câu Aptis':'5/5 Aptis questions correct'}</p>
   {!!slots?.length&&<div className={styles.waveStage} data-ready={ready} aria-hidden="true">
    {visibleSlots.map((slot,index)=><Image key={slot} src={'/api/aptis/'+aptisPhotoPath(slot)}
     alt="" width={640} height={720} loading="eager" unoptimized
     onLoad={()=>setSettled(current=>({...current,[slot]:true}))}
     onError={()=>setSettled(current=>({...current,[slot]:false}))}
     className={styles.celebrationPhoto}
     style={{'--wave-delay':introDuration+index*waveInterval+'ms','--wave-duration':waveDuration+'ms','--wave-direction':index%2===0?1:-1} as CSSProperties}/>)}
   </div>}
   <button className="btn primary" type="button" onClick={onContinue}>{vi?'Vào BridgeMate':'Enter BridgeMate'}</button>
  </div>
 </main>;
}
