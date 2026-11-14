'use client';

import {useEffect,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import styles from './aptis.module.css';

const duration=4400;
const colors=['#ffd785','#ff668e','#83e6d1','#b99bff','#fff4da'];
const fireworks=[{x:19,y:28,delay:.65},{x:79,y:20,delay:1.25},{x:67,y:42,delay:2.05}];

export default function AptisCelebration({lang,onContinue}:{lang:string;onContinue:()=>void}){
 const [imageMissing,setImageMissing]=useState(false);
 const vi=lang==='vi';

 useEffect(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=window.setTimeout(onContinue,reduce?2300:duration);
  return ()=>window.clearTimeout(timer);
 },[onContinue]);

 return <main className={styles.celebration} aria-labelledby="aptis-congratulations">
  <div className={styles.effects} aria-hidden="true">
   {fireworks.map(({x,y,delay})=>Array.from({length:18},(_,index)=>{
    const angle=index*Math.PI/9;
    const radius=62+(index%3)*18;
    const vars={
     '--x':x+'%','--y':y+'%','--dx':Math.cos(angle)*radius+'px','--dy':Math.sin(angle)*radius+'px',
     '--delay':delay+'s','--color':colors[index%colors.length],
    } as CSSProperties;
    return <i className={styles.spark} key={x+'-'+index} style={vars}/>;
   }))}
   {Array.from({length:10},(_,index)=>{
    const vars={'--x':(8+index*9.2)+'%','--delay':(.45+(index%5)*.23)+'s','--drift':(index%2===0?44:-44)+'px'} as CSSProperties;
    return <span className={styles.rose} key={index} style={vars}>🌹</span>;
   })}
  </div>
  <div className={styles.celebrationContent}>
   <h1 id="aptis-congratulations" lang="en">Congratulations!</h1>
   <p role="status">{vi?'Đúng 5/5 câu Aptis':'5/5 Aptis questions correct'}</p>
   {!imageMissing&&<Image src="/api/aptis/photo" onError={()=>setImageMissing(true)} alt="" width={640} height={720} loading="eager" unoptimized className={styles.celebrationPhoto}/>}
   <button className="btn primary" type="button" onClick={onContinue}>{vi?'Vào BridgeMate':'Enter BridgeMate'}</button>
  </div>
 </main>;
}
