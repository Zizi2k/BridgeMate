export async function currentClockLocation(){
 if(typeof navigator==='undefined'||!navigator.geolocation)throw Error('Thiết bị hoặc trình duyệt chưa hỗ trợ định vị. Hãy dùng trình duyệt có quyền vị trí.');
 return new Promise<{latitude:number;longitude:number;accuracy:number;capturedAt:string}>((resolve,reject)=>{
  navigator.geolocation.getCurrentPosition(position=>resolve({latitude:position.coords.latitude,longitude:position.coords.longitude,accuracy:position.coords.accuracy,capturedAt:new Date(position.timestamp).toISOString()}),error=>reject(Error(error.code===1?'Bạn cần cho phép truy cập vị trí trong trình duyệt để chấm công.':error.code===3?'Lấy vị trí quá thời gian. Hãy bật định vị và thử lại.':'Chưa lấy được vị trí. Hãy bật dịch vụ định vị của thiết bị rồi thử lại.')),{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 });
}
