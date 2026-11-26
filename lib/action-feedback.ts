export type ActionFeedback={kind:'success'|'error';message:string};
export function showActionFeedback(message:string,kind:ActionFeedback['kind']='success'){
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent<ActionFeedback>('bm-action-feedback',{detail:{kind,message}}));
}
export function feedbackForResponse(path:string,method:string,ok:boolean,status:number,payload:any):ActionFeedback|null{
 if(path.startsWith('/api/attendance-notifications'))return null;
 const mutation=!['GET','HEAD','OPTIONS'].includes(method.toUpperCase());
 const download=/[?&]format=(xlsx|pdf|csv)(?:&|$)/.test(path);
 if(!mutation&&!download)return null;
 if(!ok){const code=payload?.error?.code;const messages:Record<string,string>={UNAUTHORIZED:'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',FORBIDDEN:'Bạn chưa có quyền thực hiện thao tác này.',SCHEDULE_FULL:'Ngày này đã đủ người đăng ký.',SCHEDULE_NOT_OPEN:'Ngày này chưa mở đăng ký.',CAPACITY_BELOW_REGISTERED:'Số lượng không được thấp hơn số người đã đăng ký.',INVALID_LOGIN:'Email hoặc mật khẩu không đúng.',VALIDATION:'Thông tin chưa hợp lệ. Kiểm tra lại các trường nhập.'};return {kind:'error',message:messages[code||'']||(status>=500?'Máy chủ đang gặp lỗi. Vui lòng thử lại.':'Thao tác chưa thành công. Kiểm tra thông tin và thử lại.')};}
 if(download)return {kind:'success',message:'Đã tạo tệp tải xuống.'};
 if(!payload||typeof payload!=='object'||!('data' in payload))return {kind:'error',message:'Chưa xác nhận được kết quả từ máy chủ. Vui lòng kiểm tra lại trước khi gửi thêm.'};
 if(Number(payload.data?.errors)>0)return {kind:'error',message:'Tệp có dòng lỗi. Kiểm tra bản xem trước và sửa trước khi lưu.'};
 if(/\/auth\/(login|register|demo)$/.test(path))return null;
 const message=path.includes('/preview')||path.endsWith('/attendance-import/preview')?'Đã tạo bản xem trước.':path.includes('/salary-payments')?'Đã cập nhật ghi nhận ứng / trả lương.':path.includes('/work-schedules/capacity')?'Đã lưu số lượng đăng ký.':method==='DELETE'?'Đã xóa thành công.':path.includes('/photos')?'Đã cập nhật ảnh minh chứng.':method==='PATCH'||method==='PUT'?'Đã lưu thay đổi.':'Thao tác thành công.';
 return {kind:'success',message};
}
export async function actionFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 const address=input instanceof Request?input.url:String(input);
 const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
 let path='';try{const base=typeof window==='undefined'?'https://bridge-mate.vercel.app':window.location.origin;const url=new URL(address,base);if(url.origin===base&&url.pathname.startsWith('/api/'))path=url.pathname+url.search}catch{}
 try{
  const response=await globalThis.fetch(input,init);
  if(path){let payload:any;const mutation=!['GET','HEAD','OPTIONS'].includes(method);if(mutation){try{payload=await response.clone().json()}catch{}}
   const feedback=feedbackForResponse(path,method,response.ok,response.status,payload);if(feedback)showActionFeedback(feedback.message,feedback.kind);
  }return response;
 }catch(error){if(path&&!['GET','HEAD','OPTIONS'].includes(method))showActionFeedback('Mất kết nối, chưa xác nhận được kết quả. Kiểm tra lại trước khi gửi thêm.','error');throw error;}
}
