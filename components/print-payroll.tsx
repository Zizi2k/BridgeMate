'use client';
import {actionFetch} from '../lib/action-feedback';
import {vietQrBanks} from '../lib/vietqr-banks';
import {payrollQr} from '../lib/payroll-qr';
import {useEffect,useState,type FormEvent} from 'react';
import {printDefaults,type PrintTemplate} from '../lib/module-access';

type Slip={workDetails?:import('../lib/daily-work').WorkDetail[];paid?:number;isConsolidated?:boolean;fromPeriod?:string;periods?:{period:string;total:number;advance:number;paid:number;balance:number}[];id:string;worker:string;work:string;employeeCode?:string;period:string;total:number;commission:number;advance:number;balance:number};
const keys=Object.keys(printDefaults) as Array<keyof PrintTemplate>;
const headings:Partial<Record<keyof PrintTemplate,string>>={company:'Công ty',address:'Địa chỉ',salaryTitle:'Tiêu đề phiếu lương',advanceTitle:'Tiêu đề phiếu tạm ứng'};

async function settings(data?:PrintTemplate):Promise<PrintTemplate>{
 const response=await actionFetch('/api/payroll-template',data?{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{cache:'no-store'});
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

export default function PrintPayroll({entry,advance,onClose,readOnlyTemplate}:{entry:Slip;advance:boolean;onClose:()=>void;readOnlyTemplate?:PrintTemplate}){
 const [template,setTemplate]=useState<PrintTemplate|null>(readOnlyTemplate??null),[error,setError]=useState(false);
 const [code,setCode]=useState(entry.employeeCode??''),[position,setPosition]=useState('');
 const [date,setDate]=useState(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date()));
 useEffect(()=>{if(readOnlyTemplate)return;let active=true;settings().then(data=>{if(active)setTemplate(data)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[readOnlyTemplate]);
 const [adjustments,setAdjustments]=useState({allowance:0,insurance:0,tax:0});
 const total=entry.total+adjustments.allowance;
 const remaining=entry.balance+adjustments.allowance-adjustments.insurance-adjustments.tax;
 const [bank,setBank]=useState('');
 const [bankQuery,setBankQuery]=useState('');
 const [searchOpen,setSearchOpen]=useState(false);
 const [owner,setOwner]=useState<{key:string;name:string}|null>(null);
 const [lookup,setLookup]=useState<{key:string;message:string}|null>(null);
 const [lookupBusy,setLookupBusy]=useState(false);
 const fold=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
 const matchedBanks=vietQrBanks.filter(item=>fold([item.name,item.fullName,item.code,item.bin].join(' ')).includes(fold(bankQuery.trim())));
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
 const lookupKey=bin+':'+receiverAccount;
 const ownerName=owner?.key===lookupKey?owner.name:'';
 async function findOwner(){
  if(!selectedBank?.lookupSupported||!/^\d{4,19}$/.test(receiverAccount))return;
  setLookupBusy(true);setLookup(null);setOwner(null);
  try{
   const response=await actionFetch('/api/payroll-bank-lookup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bin,accountNumber:receiverAccount})});
   const data=await response.json();
   if(!response.ok){
    const code=data.error?.code;
    throw Error(code==='BANK_LOOKUP_UNCONFIGURED'?'Chưa cấu hình dịch vụ tra cứu VietQR.':
     code==='BANK_LOOKUP_INVALID_ACCOUNT'?'VietQR báo số tài khoản không hợp lệ. Kiểm tra lại ngân hàng và số tài khoản.':
     code==='BANK_LOOKUP_UNSUPPORTED'?'VietQR chưa hỗ trợ tra tên ở ngân hàng này.':
     code==='BANK_LOOKUP_CREDENTIALS'?'VietQR từ chối xác thực hoặc quyền tra cứu. Kiểm tra Client ID, API Key và quyền sử dụng API.':
     code==='BANK_LOOKUP_PROVIDER_LIMIT'?'Đã đạt giới hạn tra cứu của VietQR.':
     code==='BANK_LOOKUP_UNAVAILABLE'?'Dịch vụ VietQR đang gặp lỗi hoặc quá thời gian phản hồi. Thử lại sau.':
     code==='BANK_LOOKUP_RATE_LIMIT'?'Bạn đã tra cứu nhiều lần. Thử lại sau một phút.':
     code==='BANK_LOOKUP_UNCONFIRMED'?'VietQR chưa xác nhận được tên chủ tài khoản.':'Tra cứu chưa thành công. Vui lòng thử lại.');
   }
   setOwner({key:lookupKey,name:data.data.name});
  }catch(error){setLookup({key:lookupKey,message:error instanceof Error?error.message:'Tra cứu chưa thành công.'})}
  finally{setLookupBusy(false)}
 }
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
   {template&&!readOnlyTemplate&&<><label>{template.code}<input value={code} onChange={event=>setCode(event.target.value)}/></label>
    <label>{template.position}<input value={position} onChange={event=>setPosition(event.target.value)}/></label>
    <label>Ngày lập<input type="date" value={date} onChange={event=>setDate(event.target.value)}/></label>
    {!advance&&(['allowance','insurance','tax'] as const).map(key=><label key={key}>{template[key]} (₫)
     <input type="number" min={0} max={1000000000000} step={1} value={adjustments[key]} onChange={event=>{
      const value=Number(event.target.value);
      if(Number.isSafeInteger(value)&&value>=0&&value<=1e12)setAdjustments(current=>({...current,[key]:value}));
     }}/></label>)}
    <fieldset className="pay-slip-bank">
     <legend>Thông tin nhận chuyển khoản</legend>
     <div className="pay-slip-bank-search">
      <label>Ngân hàng<input type="search" placeholder="Tìm theo tên hoặc mã BIN" value={bankQuery}
       aria-expanded={searchOpen} aria-controls="payroll-bank-options"
       onFocus={()=>setSearchOpen(true)} onKeyDown={event=>{if(event.key==='Escape')setSearchOpen(false)}}
       onChange={event=>{setBankQuery(event.target.value);setBank('');setSearchOpen(true)}}/></label>
      {searchOpen&&<ul id="payroll-bank-options" aria-label="Kết quả tìm ngân hàng">
       {matchedBanks.map(item=><li key={item.bin}><button type="button" disabled={!item.transferSupported}
        onClick={()=>{setBank(item.bin);setBankQuery(item.name);setSearchOpen(false)}}>{item.name} · {item.bin}{!item.transferSupported?' · Chưa hỗ trợ QR':''}</button></li>)}
       {matchedBanks.length===0&&<li>Không tìm thấy ngân hàng.</li>}
       <li><button type="button" onClick={()=>{setBank('other');setBankQuery('Ngân hàng khác');setSearchOpen(false)}}>Nhập mã BIN thủ công</button></li>
      </ul>}
     </div>
     {bank==='other'&&<label>Mã BIN ngân hàng (6 số)<input inputMode="numeric" maxLength={6} value={otherBin} onChange={event=>setOtherBin(event.target.value)}/></label>}
     <label>Số tài khoản người nhận<input inputMode="numeric" maxLength={19} value={account} onChange={event=>setAccount(event.target.value)}/></label>
     <button className="btn" type="button" disabled={!selectedBank?.lookupSupported||!/^\d{4,19}$/.test(receiverAccount)||lookupBusy} onClick={()=>void findOwner()}>{lookupBusy?'Đang tra cứu…':'Tra tên chủ tài khoản'}</button>
     {lookup?.key===lookupKey&&<small role="status">{lookup.message}</small>}
     {ownerName&&<small role="status">Chủ tài khoản: {ownerName}</small>}
     <small>Khi bấm tra tên, ngân hàng và số tài khoản được gửi tới VietQR để xác minh.</small>
     <button className="btn" type="button" disabled={!payload||qrBusy} onClick={()=>void makeQr()}>{qrBusy?'Đang tạo mã…':'Tạo mã QR'}</button>
     <small>{amount<=0?'Phiếu không có số tiền dương để tạo QR.':'Kiểm tra ngân hàng, số tài khoản và tên người nhận trên ứng dụng ngân hàng trước khi xác nhận chuyển tiền.'}</small>
     {qrError&&<small role="alert">{qrError}</small>}
    </fieldset>
   </>}
   {template&&<button type="button" className="btn primary" disabled={!date} onClick={()=>window.print()}>In / Lưu PDF</button>}
   {!advance&&template&&!readOnlyTemplate&&<small>Phụ cấp, bảo hiểm và thuế nhập tại đây chỉ áp dụng cho phiếu in này.</small>}
   {error&&<p role="alert">Không tải được mẫu in.</p>}
  </div>
  {template&&<article className="pay-slip-page">
   <header><strong>{template.company}</strong><p>{template.address}</p></header>
   <h2>{entry.isConsolidated?'PHIẾU LƯƠNG CỘNG GỘP':advance?template.advanceTitle:template.salaryTitle}</h2>
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
    {!advance&&<tr><td>12</td><th scope="row">Lương đã thanh toán</th><td>{money(entry.paid||0)}</td></tr>}
    {!advance&&<tr><td>13</td><th scope="row">{template.balance}</th><td>{money(remaining)}</td></tr>}
   </tbody></table>
   {!!entry.workDetails?.length&&<><h3>Chi tiết công việc tính đơn giá riêng</h3><table><thead><tr><th>Ngày / Công việc</th><th>Cách tính</th><th>Tiền công</th><th>Điều chỉnh vào lương</th><th>Ghi chú</th></tr></thead><tbody>{entry.workDetails.map(item=><tr key={item.id}><td>{item.day}<br/>{item.title}</td><td>{item.kind==='replace'?'Đổi đơn giá':'Ngoài ca'}<br/>{item.basis==='hour'?`${item.minutes/60} giờ × ${money(item.rate)}`:'Trọn việc'}</td><td>{money(item.earned)}</td><td>{money(item.amount)}</td><td style={{whiteSpace:'pre-wrap'}}>{item.note}</td></tr>)}</tbody></table><p>Đổi đơn giá chỉ cộng/trừ phần chênh lệch so với lương thường để không tính trùng.</p></>}
   {entry.isConsolidated&&entry.periods&&<><h3>Chi tiết công nợ từng kỳ</h3><table><thead><tr><th>Kỳ lương</th><th>Tổng lương</th><th>Đã ứng</th><th>Đã trả</th><th>Còn phải trả</th></tr></thead><tbody>{entry.periods.map(row=><tr key={row.period}><td>{row.period}</td><td>{money(row.total)}</td><td>{money(row.advance)}</td><td>{money(row.paid)}</td><td>{money(row.balance)}</td></tr>)}</tbody></table><p>Còn phải trả = tổng lương − các khoản đã ứng − lương đã thanh toán.</p></>}
   {payload&&<section className="pay-slip-transfer" aria-label="Thông tin chuyển khoản">
    <div><strong>Thông tin chuyển khoản</strong>
     <p>Ngân hàng: {selectedBank?.name||'BIN '+bin}</p>
     <p>Số tài khoản: {receiverAccount}</p>
     {ownerName&&<p>Chủ tài khoản: {ownerName}</p>}
     <p>Số tiền: {money(amount)}</p>
     {qr&&<p>Nội dung: {reference}</p>}
    </div>
    {qr&&<img src={qr} alt="Mã VietQR chuyển khoản" width={144} height={144}/>}
   </section>}
   <footer><strong>{template.payer}</strong><strong>{template.receiver}</strong></footer>
  </article>}
 </div>;
}
