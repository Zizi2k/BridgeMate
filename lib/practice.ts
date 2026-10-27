export type PracticeQuestion={id:string;en:string;vi:string;optionsEn:string[];optionsVi:string[];correct:number;explanationEn:string;explanationVi:string};
export class PracticeError extends Error{code:string;detail:string;constructor(code:string,detail=''){super(code);this.code=code;this.detail=detail}}
export function validateQuestion(value:unknown):Omit<PracticeQuestion,'id'>{
 const q=value as Record<string,unknown>;if(!q||typeof q!=='object')throw new PracticeError('QUESTION_INVALID');
 const text=(v:unknown,max=2000,optional=false)=>{if(typeof v!=='string'||v.length>max||(!optional&&!v.trim()))throw new PracticeError('QUESTION_INVALID');return v.trim()};
 const vi=text(q.vi),en=typeof q.en==='string'&&q.en.trim()?text(q.en):vi;
 if(!Array.isArray(q.optionsVi)||q.optionsVi.length<2||q.optionsVi.length>4)throw new PracticeError('QUESTION_INVALID');
 const optionsVi=q.optionsVi.map(v=>text(v,600));
 if(q.optionsEn!==undefined&&(!Array.isArray(q.optionsEn)||q.optionsEn.length!==optionsVi.length))throw new PracticeError('QUESTION_INVALID');
 const optionsEn=Array.isArray(q.optionsEn)&&q.optionsEn.length===optionsVi.length?q.optionsEn.map((v,i)=>typeof v==='string'&&v.trim()?text(v,600):optionsVi[i]):optionsVi;
 if(!Number.isInteger(q.correct)||Number(q.correct)<0||Number(q.correct)>=optionsVi.length)throw new PracticeError('QUESTION_INVALID');
 const explanationVi=text(q.explanationVi??'',2000,true),explanationEn=typeof q.explanationEn==='string'&&q.explanationEn.trim()?text(q.explanationEn,2000,true):explanationVi;
 return {vi,en,optionsVi,optionsEn,correct:Number(q.correct),explanationVi,explanationEn};
}
export function composePractice(defaults:readonly any[],records:{id:string;content:string;deleted:number}[]){const map=new Map<string,PracticeQuestion & {deleted:number}>(defaults.map(q=>[String(q.id),{...q,id:String(q.id),optionsEn:[...q.optionsEn],optionsVi:[...q.optionsVi],deleted:0}]));for(const row of [...records].sort((a,b)=>a.id.localeCompare(b.id)))map.set(row.id,{id:row.id,...validateQuestion(JSON.parse(row.content)),deleted:row.deleted});return {questions:[...map.values()].filter(q=>!q.deleted).map(({deleted,...q})=>q),deleted:[...map.values()].filter(q=>q.deleted).map(({deleted,...q})=>q)}}
export function parseQuestionLines(lines:string[]){
 const result:Omit<PracticeQuestion,'id'>[]=[];let fields:Record<string,string>|null=null,last='';
 function finish(){if(!fields)return;const f=fields;try{const letters=['A','B','C','D'].filter(l=>f[l]!==undefined);if(!letters.length||letters.some((l,i)=>l!==['A','B','C','D'][i])||!f.answer||!/^[A-D]$/i.test(f.answer.trim()))throw new Error();result.push(validateQuestion({vi:f.vi,en:f.en,optionsVi:letters.map(l=>f[l]),optionsEn:letters.map(l=>f[l+'en']||f[l]),correct:'ABCD'.indexOf(f.answer.trim().toUpperCase()),explanationVi:f.explanationVi||'',explanationEn:f.explanationEn||f.explanationVi||''}));}catch{throw new PracticeError('DOCX_FORMAT',`Câu ${result.length+1}: cần nội dung, 2–4 lựa chọn A–D liên tiếp và Đáp án hợp lệ.`)}if(result.length>100)throw new PracticeError('QUESTION_LIMIT');}
 for(const raw of lines){const line=raw.trim();if(!line)continue;const start=line.match(/^(?:Câu\s+(?:hỏi|\d+)|Question\s+\d+)\s*[:.)]\s*(.+)$/iu);if(start){finish();fields={vi:start[1]};last='vi';continue}if(!fields)continue;
 const match=line.match(/^(Question EN|[A-D] EN|[A-D]|Đáp án|Answer|Giải thích|Explanation EN)\s*[:.)]\s*(.*)$/iu);
 if(match){const label=match[1].toLowerCase();const key=label==='question en'?'en':label==='đáp án'||label==='answer'?'answer':label==='giải thích'?'explanationVi':label==='explanation en'?'explanationEn':label.endsWith(' en')?label[0].toUpperCase()+'en':label.toUpperCase();if(fields[key]!==undefined)throw new PracticeError('DOCX_FORMAT',`Câu ${result.length+1}: trùng nhãn ${match[1]}.`);fields[key]=match[2];last=key}else if(last){fields[last]+='\n'+line}
 }
 finish();if(!result.length)throw new PracticeError('DOCX_FORMAT','Không tìm thấy câu hỏi. Hãy dùng mẫu Word tải xuống.');return result;
}
