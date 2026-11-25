export const MAX_EVIDENCE_BYTES=3*1024*1024;
const extensions=new Set('jpg jpeg jpe jfif png apng gif webp avif heic heif hif tif tiff bmp dib ico cur svg svgz jxl jp2 j2k jpf jpx jpm mj2 psd psb raw dng cr2 cr3 nef nrw arw srf sr2 raf orf rw2 rwl pef srw x3f 3fr fff iiq kdc dcr mos mrw erf mef xcf tga pcx pbm pgm ppm pnm pam hdr exr fits fit fts icns qoi wbmp mng'.split(' '));
export function imageFilenameAllowed(name:string,mime:string){return /^image\/[a-z0-9.+-]+$/i.test(mime)||extensions.has(name.split('.').pop()?.toLowerCase()||'')}
export function evidenceExpiry(createdAt:string){
 const date=new Date(createdAt),day=date.getUTCDate();
 date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+2);
 const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();
 date.setUTCDate(Math.min(day,last));return date.toISOString();
}
export function evidencePreviewMime(bytes:Uint8Array){
 const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10')return 'image/png';
 if(['GIF87a','GIF89a'].includes(ascii(0,6)))return 'image/gif';
 if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
 if(ascii(4,8)==='ftyp'&&['avif','avis'].includes(ascii(8,12)))return 'image/avif';
 return null;
}
