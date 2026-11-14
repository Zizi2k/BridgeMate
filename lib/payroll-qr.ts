const field=(id:string,value:string)=>id+String(value.length).padStart(2,'0')+value;

export function payrollQr(bin:string,account:string,amount:number,reference:string){
 if(!/^\d{6}$/.test(bin)||!/^\d{4,19}$/.test(account)||
    !Number.isSafeInteger(amount)||amount<=0||amount>9999999999999||
    !/^[A-Z0-9 ]{1,25}$/.test(reference))return null;
 const recipient=field('00',bin)+field('01',account);
 const merchant=field('00','A000000727')+field('01',recipient)+field('02','QRIBFTTA');
 const data=field('00','01')+field('01','12')+field('38',merchant)+field('53','704')+
  field('54',String(amount))+field('58','VN')+field('62',field('08',reference))+'6304';
 let crc=0xffff;
 for(const byte of new TextEncoder().encode(data)){
  crc^=byte<<8;
  for(let bit=0;bit<8;bit++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;
 }
 return data+crc.toString(16).toUpperCase().padStart(4,'0');
}
