import JSZip from 'jszip';
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';

export type Target = {id:string; context:string; type:'text'|'checkbox'; hint?:string};
export type Template = {targets:Target[]; format:string; fill:(values:Record<string,string>)=>Promise<Uint8Array>};
const token = /\{\{\s*([^{}\n]{1,100}?)\s*\}\}|\[\[\s*([^\[\]\n]{1,100}?)\s*\]\]|(?:\.{3,}|…+|_{3,})/g;
const word='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const sheet='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const elements=(root:Document|Element,ns:string,name:string)=>Array.from(root.getElementsByTagNameNS(ns,name));
function xml(source:string){
 const doc=new DOMParser().parseFromString(source,'application/xml');
 if(doc.querySelector('parsererror')||doc.doctype)throw Error('INVALID_FILE');
 return doc;
}
const entries = (text:string)=>Array.from(text.matchAll(token));

export async function readTemplate(file:File, hooks?:{onRead:(percent:number)=>void;onParse:()=>void}):Promise<Template>{
 const format=file.name.split('.').pop()?.toLowerCase()||'';
 if(!['docx','xlsx','pdf'].includes(format)||file.size>8*1024*1024)throw Error('INVALID_FILE');
 const bytes=hooks?await new Promise<ArrayBuffer>((resolve,reject)=>{
  const reader=new FileReader();
  reader.onprogress=event=>{
   if(event.lengthComputable&&event.total>0)hooks.onRead(Math.floor(100*event.loaded/event.total));
  };
  reader.onload=()=>resolve(reader.result as ArrayBuffer);
  reader.onerror=()=>reject(reader.error);
  reader.onabort=()=>reject(Error('READ_ABORTED'));
  reader.readAsArrayBuffer(file);
 }):await file.arrayBuffer();
 if(hooks){
  hooks.onParse();
  await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 if(format==='pdf')return readPdf(bytes);
 const zip=await JSZip.loadAsync(bytes);
 const names=Object.keys(zip.files);
 if(names.length>2500 || names.some(name=>/vbaProject\.bin$/i.test(name)))throw Error('INVALID_FILE');
 // Read the directory sizes before inflating individual XML parts.
 const view=new DataView(bytes);
 let eocd=view.byteLength-22;
 while(eocd>=Math.max(0,view.byteLength-65557)&&view.getUint32(eocd,true)!==0x06054b50)eocd--;
 if(eocd<Math.max(0,view.byteLength-65557))throw Error('INVALID_FILE');
 let offset=view.getUint32(eocd+16,true), total=0;
 for(let i=0;i<view.getUint16(eocd+10,true);i++){
  if(offset+46>eocd||view.getUint32(offset,true)!==0x02014b50)throw Error('INVALID_FILE');
  total+=view.getUint32(offset+24,true);
  if(total>64*1024*1024)throw Error('INVALID_FILE');
  offset+=46+view.getUint16(offset+28,true)+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);
 }
 const targets:Target[]=[];
 const changes:Array<(values:Record<string,string>)=>void>=[];
 const docs=new Map<string,Document>();
 const add=(context:string,hint?:string)=>{
  if(targets.length>=150)return '';
  const id=String(targets.length+1);
  targets.push({id,context:context.trim().slice(0,180),type:'text',hint:hint?.trim()});
  return id;
 };
 if(format==='docx'){
  if(!zip.file('word/document.xml'))throw Error('INVALID_FILE');
  for(const name of names.filter(n=>/^word\/(document|header\d+|footer\d+)\.xml$/.test(n))){
   const doc=xml(await zip.file(name)!.async('string'));docs.set(name,doc);
   for(const paragraph of elements(doc,word,'p')){
    const nodes=elements(paragraph,word,'t');
    const texts=nodes.map(n=>n.textContent||'');
    const text=texts.join('');
    const matches=entries(text).map(match=>({match,id:add(text.slice(Math.max(0,match.index!-70),match.index!+100),match[1]||match[2])})).filter(x=>x.id);
    if(!matches.length)continue;
    changes.push(values=>{
     const updated=[...texts];
     for(const {match,id} of [...matches].reverse()){
      if(!values[id])continue;
      const start=match.index!,end=start+match[0].length;
      let at=0;
      for(let i=0;i<texts.length;i++){
       const next=at+texts[i].length;
       if(next>start&&at<end){
        const from=Math.max(0,start-at),to=Math.min(next,end)-at;
        updated[i]=updated[i].slice(0,from)+(start>=at?values[id]:'')+updated[i].slice(to);
       }
       at=next;
      }
     }
     nodes.forEach((node,i)=>{
      if(updated[i]===texts[i])return;
      node.textContent=updated[i];
      node.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
     });
    });
   }
  }
 }else{
  if(!zip.file('xl/workbook.xml'))throw Error('INVALID_FILE');
  const shared=zip.file('xl/sharedStrings.xml');
  const strings=shared?elements(xml(await shared.async('string')),sheet,'si').map(n=>elements(n,sheet,'t').map(t=>t.textContent||'').join('')):[];
  for(const name of names.filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n))){
   const doc=xml(await zip.file(name)!.async('string'));docs.set(name,doc);
   const cells=elements(doc,sheet,'c');
   const read=(cell:Element)=>{
    const value=elements(cell,sheet,'v')[0]?.textContent||'';
    return cell.getAttribute('t')==='s'?strings[Number(value)]||'':cell.getAttribute('t')==='inlineStr'?elements(cell,sheet,'t').map(n=>n.textContent||'').join(''):value;
   };
   for(const cell of cells){
    if(elements(cell,sheet,'f').length)continue;
    const text=read(cell), ref=cell.getAttribute('r')||'';
    const previous=cell.previousElementSibling;
    const label=previous?.localName==='c'?read(previous):'';
    const candidates:Array<{0:string;1?:string;2?:string;index?:number}>=entries(text);
    if(!text && cell.hasAttribute('s') && label && /[:：]$/.test(label.trim()))candidates.push({0:'',index:0});
    const matched=candidates.map(match=>({match,id:add(ref+' · '+label+' '+text,match[1]||match[2]||undefined)})).filter(x=>x.id);
    if(!matched.length)continue;
    changes.push(values=>{
     let value=text;
     for(const {match,id} of [...matched].reverse())if(values[id])value=value.slice(0,match.index!)+values[id]+value.slice(match.index!+match[0].length);
     if(value===text)return;
     for(const child of Array.from(cell.children))if(['v','is'].includes(child.localName))child.remove();
     cell.setAttribute('t','inlineStr');
     const inline=doc.createElementNS(sheet,'is'), content=doc.createElementNS(sheet,'t');
     content.textContent=value;
     content.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');
     inline.append(content);cell.prepend(inline);
    });
   }
  }
 }
 return {format,targets,async fill(values){
  changes.forEach(change=>change(values));
  for(const [name,doc] of docs)zip.file(name,new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 }};
}

async function readPdf(bytes:ArrayBuffer):Promise<Template>{
 const doc=await PDFDocument.load(bytes);
 const form=doc.getForm();
 const fields=form.getFields().filter(field=>!field.isReadOnly()&&(field instanceof PDFTextField||field instanceof PDFCheckBox)).slice(0,150);
 return {format:'pdf',targets:fields.map((field,index)=>({
  id:String(index+1),context:field.getName().slice(0,180),type:field instanceof PDFCheckBox?'checkbox':'text',
 })),async fill(values){
  doc.registerFontkit(fontkit);
  const response=await fetch('/fonts/form-noto-sans.ttf');
  if(!response.ok)throw Error('EXPORT');
  const font=await doc.embedFont(await response.arrayBuffer(),{subset:true});
  fields.forEach((field,index)=>{
   const value=values[String(index+1)];
   if(value===undefined||value==='')return;
   if(field instanceof PDFTextField){field.setText(value);field.updateAppearances(font)}
   if(field instanceof PDFCheckBox){if(value==='true')field.check();else field.uncheck();field.defaultUpdateAppearances();}
  });
  return doc.save({updateFieldAppearances:false});
 }};
}
