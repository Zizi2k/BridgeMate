export type PayrollBranding={departmentTitle:string;preparedBy:string;logo:string};
export function payrollBranding(input:any):PayrollBranding{
 if(!input||typeof input.departmentTitle!=='string'||input.departmentTitle.trim().length>120||typeof input.preparedBy!=='string'||input.preparedBy.trim().length>120||typeof input.logo!=='string'||input.logo.length>180000)throw Error('BRANDING_INVALID');
 if(input.logo){if(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(input.logo))throw Error('BRANDING_INVALID');const bytes=Buffer.from(input.logo.split(',')[1],'base64');if(bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||bytes.toString('ascii',12,16)!=='IHDR'||bytes.readUInt32BE(16)>600||bytes.readUInt32BE(20)>600||!bytes.readUInt32BE(16)||!bytes.readUInt32BE(20))throw Error('BRANDING_INVALID')}
 return {departmentTitle:input.departmentTitle.trim(),preparedBy:input.preparedBy.trim(),logo:input.logo};
}
