'use client';
import {useEffect,useState} from 'react';
import PrintPayroll from './print-payroll';
import SalarySettlement from './salary-settlement';
import {groupPayrollReport,payrollReportKey,type PayrollReportRow} from '../lib/payroll-report';
export type Department={id:string;name:string;active:number};
export async function departmentRequest(path:string,method='GET',body?:object){
 const res=await fetch('/api/'+path,{method,cache:'no-store',...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
 if(res.status===401)window.dispatchEvent(new Event('bm-session-expired'));
 const json=await res.json();if(!res.ok)throw Error(res.status===403?'Bạn chưa được admin xác nhận phòng ban hoặc cấp quyền cho thao tác này.':'Không thực hiện được. Kiểm tra thông tin và thử lại.');return json.data;
}
export function DepartmentGate({onSelected,onLogout}:{onSelected:()=>Promise<void>;onLogout:()=>Promise<void>}){
 const [departments,setDepartments]=useState<Department[]>([]),[selected,setSelected]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{departmentRequest('departments').then(setDepartments).catch(e=>setError(e.message))},[]);
 return <main style={{maxWidth:600,margin:'5rem auto',padding:24}}><h1>Chọn phòng ban</h1><p>Chọn phòng ban đang công tác. Admin sẽ xác nhận phòng ban trước khi cấp quyền chấm công và xem lương phòng ban.</p>
 <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await departmentRequest('departments/select','POST',{departmentId:selected});await onSelected()}catch(e:any){setError(e.message)}finally{setBusy(false)}}}>
 <label>Phòng ban <select required value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Chọn phòng ban</option>{departments.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
 {!departments.length&&<p>Chưa có phòng ban. Vui lòng liên hệ admin tạo phòng ban.</p>}
 <button className="btn primary" disabled={busy||!selected}>Xác nhận phòng ban</button><button type="button" className="btn" disabled={busy} onClick={()=>void onLogout()}>Đăng xuất</button>
 </form>{error&&<p role="alert">{error}</p>}</main>;
}
export function DepartmentAdmin({departments,onChanged}:{departments:Department[];onChanged:()=>Promise<void>}){
 const [name,setName]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();await onChanged();setMessage('Đã lưu phòng ban')}catch(e:any){setMessage(e.message)}finally{setBusy(false)}}
 return <fieldset className="review-card"><legend>Phòng ban</legend><form onSubmit={e=>{e.preventDefault();void run(async()=>{await departmentRequest('departments','POST',{name});setName('')})}}><label>Tên phòng ban mới <input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button className="btn" disabled={busy}>Thêm phòng ban</button></form>
 {departments.map(row=><form key={row.id+row.name} onSubmit={e=>{e.preventDefault();const fields=new FormData(e.currentTarget);void run(async()=>{await departmentRequest('departments/'+row.id,'PATCH',{name:String(fields.get('name')),active:fields.get('active')==='on'})})}} style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
 <label>Tên phòng ban <input name="name" required maxLength={120} defaultValue={row.name}/></label><label><input name="active" type="checkbox" defaultChecked={!!row.active}/> Hoạt động</label><button className="btn" disabled={busy}>Lưu phòng ban</button></form>)}
 {message&&<p role="status">{message}</p>}</fieldset>;
}
export default function DepartmentPayroll({ownerAdmin}:{ownerAdmin:boolean}){
 const [period,setPeriod]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit'}).format(new Date())),[q,setQ]=useState(''),[departmentId,setDepartmentId]=useState(''),[departments,setDepartments]=useState<Department[]>([]);
 const [range,setRange]=useState('month'),[year,setYear]=useState(()=>String(new Date().getFullYear())),[kind,setKind]=useState<'ledger'|'slips'|'arrears'>('ledger'),[exporting,setExporting]=useState(false),[revision,setRevision]=useState(0);
 const [paymentTarget,setPaymentTarget]=useState<PayrollReportRow|null>(null),[notice,setNotice]=useState('');
 const [result,setResult]=useState<any>(null),[error,setError]=useState(''),[slip,setSlip]=useState<any>(null);
 function filters(){return new URLSearchParams({...range==='year'?{year}:{period},q,departmentId})}
 useEffect(()=>{if(ownerAdmin)departmentRequest('departments').then(setDepartments).catch(e=>setError(e.message))},[ownerAdmin]);
 useEffect(()=>{let active=true;setResult(null);setError('');const timer=setTimeout(()=>{departmentRequest('department-payroll?'+filters()).then(data=>{if(active)setResult(data)}).catch(e=>{if(active)setError(e.message)})},250);return()=>{active=false;clearTimeout(timer)}},[period,q,departmentId,range,year,revision]);
 async function download(format:'xlsx'|'pdf',selectedKind:'ledger'|'slips'|'arrears'=kind,row?:PayrollReportRow){
  setExporting(true);setError('');
  try{
   const params=filters();params.set('format',format);params.set('kind',selectedKind==='arrears'?'slips':selectedKind);if(selectedKind==='arrears')params.set('view','consolidated');
   if(row){params.delete('year');params.set('period',row.period);if(row.isConsolidated){params.set('view','consolidated');params.set('statementKey',JSON.stringify([row.recipientId,row.departmentId]))}else params.set('reportKey',payrollReportKey(row));params.delete('q')}
   const res=await fetch('/api/department-payroll/export?'+params,{cache:'no-store'});
   if(!res.ok)throw Error('Không xuất được file. Kiểm tra quyền phòng ban và bộ lọc thời gian rồi thử lại.');
   const blob=await res.blob(),url=URL.createObjectURL(blob),link=document.createElement('a');
   link.href=url;link.download=(res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1])||'Bang_luong.'+format;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
  }catch(e:any){setError(e.message)}finally{setExporting(false)}
 }
 const groups=groupPayrollReport(result?.rows||[]);
 const autoSlip=(row:PayrollReportRow)=>row.period===result?.asOf?(result.consolidated?.find((statement:PayrollReportRow)=>statement.recipientId===row.recipientId&&statement.departmentId===row.departmentId)||row):row;
 if(slip&&result)return <PrintPayroll entry={slip} advance={false} readOnlyTemplate={result.template} onClose={()=>setSlip(null)}/>;
 return <section><h1>Bảng lương nhân viên {ownerAdmin?'theo phòng ban':'phòng ban'}</h1><div className="board-toolbar" style={{flexWrap:'wrap'}}>
 <label>Thời gian <select value={range} onChange={e=>setRange(e.target.value)}><option value="month">Theo tháng</option><option value="year">Cả năm</option></select></label>
 {range==='month'?<label>Tháng <input type="month" required value={period} onChange={e=>{if(e.target.value)setPeriod(e.target.value)}}/></label>:<label>Năm <input type="number" min={1900} max={2100} value={year} onChange={e=>setYear(e.target.value)}/></label>}
 {ownerAdmin&&<label>Phòng ban <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)}><option value="">Tất cả phòng ban</option>{departments.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>}
 <label>Tìm mã hoặc tên nhân viên <input type="search" maxLength={120} value={q} onChange={e=>setQ(e.target.value)} placeholder="Mã NV hoặc họ tên"/></label>
 <button className="btn" disabled={exporting} onClick={()=>{setQ('');setRevision(value=>value+1)}}>Xem toàn bộ nhân viên phòng ban</button></div>
 <div className="board-toolbar" style={{flexWrap:'wrap'}}><label>Nội dung xuất <select value={kind} onChange={e=>setKind(e.target.value as 'ledger'|'slips'|'arrears')}><option value="ledger">Bảng lương</option><option value="slips">Toàn bộ phiếu lương</option><option value="arrears">Phiếu cộng gộp nợ quá 2 tháng</option></select></label>
 <button className="btn" disabled={exporting||!groups.length} onClick={()=>void download('xlsx')}>{exporting?'Đang xuất…':'Xuất XLSX'}</button><button className="btn" disabled={exporting||!groups.length} onClick={()=>void download('pdf')}>Xuất PDF</button></div><p>File xuất áp dụng bộ lọc phòng ban, nhân viên và thời gian đang chọn. Mỗi phiếu lương được tách riêng theo nhân viên và tháng.</p>
 {notice&&<p role="status">{notice}</p>}{paymentTarget&&<SalarySettlement key={payrollReportKey(paymentTarget)+String(paymentTarget.isConsolidated)} row={paymentTarget} onClose={()=>setPaymentTarget(null)} onSaved={()=>{setPaymentTarget(null);setNotice('Đã cập nhật ứng / thanh toán. Công nợ đã được tính lại.');setRevision(value=>value+1)}}/>}
 <p>Còn phải trả = tổng lương − tiền đã ứng − lương đã thanh toán. Hãy ghi nhận các khoản đã trả trước đây để công nợ đúng; khoản ứng đã có trong bảng lương không nhập lại.</p>
 {error&&<p role="alert">{error}</p>}{!error&&!result&&<p>Đang tải bảng lương…</p>}
 {result&&<><section className="review-card"><h2>Tổng cộng gộp công nợ</h2><p>Tính đến kỳ {result.asOf}: {result.consolidated.reduce((sum:number,row:any)=>sum+row.balance,0).toLocaleString('vi-VN')} đ còn phải trả khi có kỳ nợ quá 2 tháng.</p>
 {!result.consolidated.length&&<p>Chưa có công nợ quá 2 tháng cần cộng gộp.</p>}
 {result.consolidated.map((row:PayrollReportRow)=><article key={JSON.stringify([row.recipientId,row.departmentId])} className="review-card"><h3>{row.employeeCode} · {row.worker} · {row.departmentName}</h3><p>Kỳ gộp: {row.fromPeriod} đến {row.period}</p><p>Tổng lương: {row.total.toLocaleString('vi-VN')} đ · Đã ứng: {row.advance.toLocaleString('vi-VN')} đ · Đã thanh toán: {row.paid.toLocaleString('vi-VN')} đ</p><p><strong>Còn phải trả: {row.balance.toLocaleString('vi-VN')} đ</strong></p>
 <button className="btn" onClick={()=>setSlip(row)}>Xem phiếu cộng gộp</button><button className="btn" disabled={exporting} onClick={()=>void download('xlsx','arrears',row)}>Phiếu gộp XLSX</button><button className="btn" disabled={exporting} onClick={()=>void download('pdf','arrears',row)}>Phiếu gộp PDF</button><button className="btn" disabled={!row.recipientId||!row.departmentId} onClick={()=>setPaymentTarget(row)}>Ghi nhận thanh toán nợ</button></article>)}</section><p><strong>Tổng lương các phòng ban đang xem: {result.totals.reduce((sum:number,row:any)=>sum+row.total,0).toLocaleString('vi-VN')} đ</strong></p><div className="members-grid">{result.totals.map((row:any)=><article key={row.name} className="review-card"><h2>{row.name}</h2><p>Tổng giờ: {row.hours.toFixed(2)}</p><p>Tổng lương: {row.total.toLocaleString('vi-VN')} đ</p><p>Đã ứng: {row.advance.toLocaleString('vi-VN')} đ · Đã thanh toán: {row.paid.toLocaleString('vi-VN')} đ</p><p>Còn phải trả: {row.balance.toLocaleString('vi-VN')} đ</p></article>)}</div>
 <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:850,textAlign:'left'}}><thead><tr>{['Kỳ lương','Phòng ban','Mã NV','Nhân viên','Tổng giờ','Tổng lương','Tiền đã ứng','Đã thanh toán','Còn phải trả','Phiếu lương'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{groups.map(row=><tr key={payrollReportKey(row)}><td>{row.period}</td><td>{row.departmentName}</td><td>{row.employeeCode}</td><td>{row.worker}</td><td>{row.hours.toFixed(2)}</td><td>{row.total.toLocaleString('vi-VN')}</td><td>{row.advance.toLocaleString('vi-VN')}</td><td>{row.paid.toLocaleString('vi-VN')}</td><td>{row.balance.toLocaleString('vi-VN')}</td><td><button className="btn" onClick={()=>setSlip(autoSlip(row))}>Xem phiếu lương</button><button className="btn" disabled={exporting} onClick={()=>void download('xlsx','slips',autoSlip(row))}>Phiếu XLSX</button><button className="btn" disabled={exporting} onClick={()=>void download('pdf','slips',autoSlip(row))}>Phiếu PDF</button><button className="btn" disabled={!row.recipientId||!row.departmentId} onClick={()=>setPaymentTarget(row)}>Ghi nhận ứng / trả lương</button></td></tr>)}</tbody></table></div>
 {!groups.length&&<p>Chưa có phiếu lương phù hợp. Tổng hợp giờ vào lương từ mục Chấm công để tạo phiếu.</p>}</>}
 </section>;
}
