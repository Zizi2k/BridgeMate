export const TEMPLATE_LIMIT=3*1024*1024;
export function savedTemplate(body:any){
 if(typeof body.name!=='string'||!body.name.trim()||body.name.length>120||typeof body.filename!=='string'||body.filename.length>200||!/^.+\.(docx|xlsx|pdf)$/i.test(body.filename)||typeof body.file!=='string'||body.file.length>4*TEMPLATE_LIMIT/3+4||!/^[A-Za-z0-9+/]+={0,2}$/.test(body.file)||typeof body.yellowOnly!=='boolean'||!Array.isArray(body.fields)||body.fields.length>150)throw Error('TEMPLATE_INVALID');
 const fields=body.fields.map((field:any)=>{if(typeof field.id!=='string'||!/^\d{1,3}$/.test(field.id)||typeof field.label!=='string'||field.label.length>120||typeof field.included!=='boolean')throw Error('TEMPLATE_INVALID');if(field.manual)throw Error('TEMPLATE_MANUAL');return {id:field.id,label:field.label,included:field.included}});
 return {name:body.name.trim(),filename:body.filename,file:body.file,yellowOnly:body.yellowOnly,fields};
}
