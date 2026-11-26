export async function readScheduleResponse(response:Response):Promise<{data?:any;error?:{code?:string}}>{
 const text=await response.text();
 let result:any;try{result=JSON.parse(text)}catch{throw Error(`Máy chủ chưa trả về dữ liệu hợp lệ (HTTP ${response.status}). Vui lòng thử lại; các số lượng đang nhập vẫn được giữ nguyên.`)}
 if(!result||typeof result!=='object'||Array.isArray(result)||(!('data' in result)&&!('error' in result)))throw Error('Phản hồi máy chủ không hợp lệ. Vui lòng làm mới lịch và thử lại.');
 return result;
}
