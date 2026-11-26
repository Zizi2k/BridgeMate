export function cameraImageSize(width:number,height:number,limit=2048){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||!Number.isFinite(limit)||limit<=0)throw Error('INVALID_IMAGE_SIZE');
 const scale=Math.min(1,limit/Math.max(width,height));return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
