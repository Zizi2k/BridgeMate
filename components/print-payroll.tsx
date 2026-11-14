'use client';
import {vietQrBanks} from '../lib/vietqr-banks';
import {payrollQr} from '../lib/payroll-qr';
import {useEffect,useState,type FormEvent} from 'react';
import {printDefaults,type PrintTemplate} from '../lib/module-access';

type Slip={id:string;worker:string;work:string;period:string;total:number;commission:number;advance:number;balance:number};
const keys=Object.keys(printDefaults) as Array<keyof PrintTemplate>;
const headings:Partial<Record<keyof PrintTemplate,string>>={company:'Công ty',address:'Địa chỉ',salaryTitle:'Tiêu đề phiếu lương',advanceTitle:'Tiêu đề phiếu tạm ứng'};

async function settings(data?:PrintTemplate):Promise<PrintTemplate>{
 const response=await fetch('/api/payroll-template',data?{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});
 if(!response.ok)throw Error();
 return (await response.json()).data;
}

export function PrintTemplateEditor(){
 const [draft,setDraft]=useState<PrintTemplate|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;settings().then(data=>{if(active)setDraft(data)}).catch(()=>{if(active)setStatus('Không tải được mẫu in.')});return()=>{active=false}},[]);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!draft)return;
  setBusy(true);setStatus('');
  try{setDraft(await settings(draft));setStatus('Đã lưu mẫu in.')}catch{setStatus('Không lưu được mẫu in.')}finally{setBusy(false)}
 }
 return <details><summary>Mẫu in phiếu lương và phiếu tạm ứng</summary>
  {draft&&<form onSubmit={save} style={{display:'grid',gap:'.5rem',maxWidth:'44rem'}}>
   {keys.map(key=><label key={key}>{headings[key]||'Nhãn “'+printDefaults[key]+'”'}<input style={{display:'block',width:'100%'}} value={draft[key]} maxLength={180} required={key!=='company'&&key!=='address'} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></label>)}
   <button className="btn primary" disabled={busy}>Lưu mẫu in</button>
  </form>}
  <p role="status">{status}</p>
 </details>;
}

export default function PrintPayroll({entry,advance,onClose}:{entry:Slip;advance:boolean;onClose:()=>void}){
 const [template,setTemplate]=useState<PrintTemplate|null>(null),[error,setError]=useState(false);
 const [code,setCode]=useState(''),[position,setPosition]=useState('');
 const [date,setDate]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()));
 useEffect(()=>{let active=true;settings().then(data=>{if(active)setTemplate(data)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[]);
 const [adjustments,setAdjustments]=useState({allowance:0,insurance:0,tax:0});
 const total=entry.total+adjustments.allowance;
 const remaining=entry.balance+adjustments.allowance-adjustments.insurance-adjustments.tax;
 const [bank,setBank]=useState('');
 const [otherBin,setOtherBin]=useState('');
 const [account,setAccount]=useState('');
 const [generated,setGenerated]=useState<{payload:string;image:string}|null>(null);
 const [qrBusy,setQrBusy]=useState(false),[qrError,setQrError]=useState('');
 const amount=advance?entry.advance:remaining;
 const bin=bank==='other'?otherBin.trim():bank;
 const receiverAccount=account.trim();
 const reference=(advance?'TAM UNG ':'LUONG ')+entry.period.replace('-','');
 const selectedBank=vietQrBanks.find(item=>item.bin===bin);
 const payload=selectedBank?.transferSupported===false?null:payrollQr(bin,receiverAccount,amount,reference);
 const qr=generated?.payload===payload&&payload?generated.image:'';
 async function makeQr(){
  if(!payload)return;
  setQrBusy(true);setQrError('');
  try{
   const {toDataURL}=await import('qrcode');
   setGenerated({payload,image:await toDataURL(payload,{width:480,margin:4,errorCorrectionLevel:'M'})});
  }catch{setQrError('Không tạo được mã QR. Vui lòng thử lại.')}
  finally{setQrBusy(false)}
 }
 const money=(value:number)=>new Intl.NumberFormat('vi-VN').format(value)+' ₫';
 return <div className="pay-slip">
  <div className="pay-slip-controls">
   <button className="btn" type="button" onClick={onClose}>Đóng phiếu</button>
   {template&&<><label>{template.code}<input value={code} onChange={event=>setCode(event.target.value)}/></label>
    <label>{template.position}<input value={position} onChange={event=>setPosition(event.target.value)}/></label>
    <label>Ngày lập<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
    {!advance&&(['allowance','insurance','tax'] as const).map(key=><label key={key}>{template[key]} (₫)
     <input type="number" min={0} max={1000000000000} step={1} value={adjustments[key]} onChange={event=>{
      const value=Number(event.target.value);
      if(Number.isSafeInteger(value)&&value>=0&&value<=1e12)setAdjustments(current=>({...current,[key]:value}));
     }}/></label>)}
    <fieldset className="pay-slip-bank">
     <legend>Thông tin nhận chuyển khoản</legend>
     <label>Ngân hàng<select value={bank} onChange={event=>setBank(event.target.value)}>
      <option value="">Chọn ngân hàng</option>
      <optgroup label="Hỗ trợ chuyển khoản VietQR">
       {vietQrBanks.filter(item=>item.transferSupported).map(item=><option key={item.bin} value={item.bin}>{item.name}</option>)}
      </optgroup>
      <optgroup label="Chưa hỗ trợ chuyển khoản VietQR">
       {vietQrBanks.filter(item=>!item.transferSupported).map(item=><option key={item.bin} value={item.bin} disabled>{item.name}</option>)}
      </optgroup>
      <option value="other">Ngân hàng khác</option>
     </select></label>
     {bank==='other'&&<label>Mã BIN ngân hàng (6 số)<input inputMode="numeric" maxLength={6} value={otherBin} onChange={event=>setOtherBin(event.target.value)}/></label>}
     <label>Số tài khoản người nhận<input inputMode="numeric" maxLength={19} value={account} onChange={event=>setAccount(event.target.value)}/></label>
     <button className="btn" type="button" disabled={!payload||qrBusy} onClick={()=>void makeQr()}>{qrBusy?'Đang tạo mã…':'Tạo mã QR'}</button>
     <small>{amount<=0?'Phiếu không có số tiền dương để tạo QR.':'Kiểm tra ngân hàng, số tài khoản và tên người nhận trên ứng dụng ngân hàng trước khi xác nhận chuyển tiền.'}</small>
     {qrError&&<small role="alert">{qrError}</small>}
    </fieldset>
    <button type="button" className="btn primary" disabled={!date} onClick={()=>window.print()}>In / Lưu PDF</button></>}
   {!advance&&template&&<small>Phụ cấp, bảo hiểm và thuế nhập tại đây chỉ áp dụng cho phiếu in này.</small>}
   {error&&<p role="alert">Không tải được mẫu in.</p>}
  </div>
  {template&&<article className="pay-slip-page">
   <header><strong>{template.company}</strong><p>{template.address}</p></header>
   <h2>{advance?template.advanceTitle:template.salaryTitle}</h2>
   <p className="pay-slip-center">Ngày lập {date.split('-').reverse().join('/')} · Kỳ lương {entry.period.split('-').reverse().join('/')}</p>
   <table><thead><tr><th>STT</th><th>Thông tin</th><th>Giá trị</th></tr></thead><tbody>
    <tr><td>1</td><th scope="row">{template.code}</th><td>{code||'—'}</td></tr>
    <tr><td>2</td><th scope="row">{template.worker}</th><td>{entry.worker}</td></tr>
    <tr><td>3</td><th scope="row">{template.position}</th><td>{position||'—'}</td></tr>
    <tr><td>4</td><th scope="row">Công việc</th><td>{entry.work}</td></tr>
    {!advance&&<><tr><th colSpan={3}>{template.income}</th></tr>
     <tr><td>5</td><th scope="row">{template.base}</th><td>{money(entry.total-entry.commission)}</td></tr>
     <tr><td>6</td><th scope="row">{template.commission}</th><td>{money(entry.commission)}</td></tr>
     <tr><td>7</td><th scope="row">{template.allowance}</th><td>{money(adjustments.allowance)}</td></tr>
     <tr><td>8</td><th scope="row">{template.total}</th><td>{money(total)}</td></tr>
     <tr><th colSpan={3}>{template.deductions}</th></tr></>}
        {!advance&&<><tr><td>9</td><th scope="row">{template.insurance}</th><td>{money(adjustments.insurance)}</td></tr>
     <tr><td>10</td><th scope="row">{template.tax}</th><td>{money(adjustments.tax)}</td></tr></>}
    <tr><td>{advance?5:11}</td><th scope="row">{template.advance}</th><td>{money(entry.advance)}</td></tr>
    {!advance&&<tr><td>12</td><th scope="row">{template.balance}</th><td>{money(remaining)}</td></tr>}
   </tbody></table>
   {payload&&<section className="pay-slip-transfer" aria-label="Thông tin chuyển khoản">
    <div><strong>Thông tin chuyển khoản</strong>
     <p>Ngân hàng: {selectedBank?.name||'BIN '+bin}</p>
     <p>Số tài khoản: {receiverAccount}</p>
     <p>Số tiền: {money(amount)}</p>
     {qr&&<p>Nội dung: {reference}</p>}
    </div>
    {qr&&<img src={qr} alt="Mã VietQR chuyển khoản" width={144} height={144}/>}
   </section>}
   <footer><strong>{template.payer}</strong><strong>{template.receiver}</strong></footer>
  </article>}
 </div>;
}
