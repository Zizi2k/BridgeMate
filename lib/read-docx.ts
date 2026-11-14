import {fromBuffer} from 'yauzl';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
import {PracticeError} from './practice.ts';
export type DocxNode=Record<string,string|DocxNode[]>;
export async function readDocxTree(buffer:Buffer,maxXmlBytes=1024*1024):Promise<DocxNode[]>{
 if(buffer.length>2*1024*1024||buffer.length<4)throw new PracticeError('DOCX_SIZE');
 const xml=await new Promise<string>((resolve,reject)=>{fromBuffer(buffer,{lazyEntries:true,validateEntrySizes:true,strictFileNames:true},(err,zip)=>{if(err||!zip){reject(new PracticeError('DOCX_INVALID'));return}let found=false,count=0,settled=false;const fail=()=>{if(!settled){settled=true;zip.close();reject(new PracticeError('DOCX_INVALID'))}};zip.on('error',fail);zip.on('end',()=>{if(!found)fail()});zip.on('entry',entry=>{if(++count>1000){fail();return}if(entry.fileName!=='word/document.xml'){zip.readEntry();return}if(found||entry.uncompressedSize>maxXmlBytes){fail();return}found=true;zip.openReadStream(entry,(error,stream)=>{if(error||!stream){fail();return}const chunks:Buffer[]=[];let length=0;stream.on('error',fail);stream.on('data',(chunk:Buffer)=>{length+=chunk.length;if(length>maxXmlBytes){stream.destroy();fail()}else chunks.push(chunk)});stream.on('end',()=>{if(settled)return;settled=true;zip.close();resolve(Buffer.concat(chunks).toString('utf8'))})})});zip.readEntry()})});
 if(/<!DOCTYPE|<!ENTITY/i.test(xml)||XMLValidator.validate(xml)!==true)throw new PracticeError('DOCX_INVALID');
 // Bound tree depth before recursive paragraph traversal.
 let depth=0;for(const token of xml.matchAll(/<\/?[^>]+>/g)){if(/^<\//.test(token[0]))depth--;else if(!/^<[!?]/.test(token[0])&&!/\/>$/.test(token[0]))depth++;if(depth>100||depth<0)throw new PracticeError('DOCX_INVALID')}
 return new XMLParser({preserveOrder:true,ignoreAttributes:true,removeNSPrefix:true,parseTagValue:false,trimValues:false}).parse(xml);
}
export function docxText(nodes:DocxNode[]):string{return nodes.map(n=>Object.entries(n).map(([k,v])=>k==='#text'?String(v):k==='tab'?' ':k==='br'?'\n':k==='del'||k==='instrText'?'':Array.isArray(v)?docxText(v):'').join('')).join('')}
