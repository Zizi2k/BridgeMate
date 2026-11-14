import {randomInt} from 'node:crypto';
import {PracticeError} from './practice.ts';
import {docxText,readDocxTree,type DocxNode} from './read-docx.ts';

export type Vocabulary={word:string;meaning:string;example:string;partOfSpeech:string};
export type AptisQuestion=Vocabulary & {options:string[];correct:number};
export type AptisChallenge={id:string;questions:AptisQuestion[];scores:(boolean|null)[];passed:boolean};

function children(nodes:DocxNode[],tag:string):DocxNode[][]{
 return nodes.flatMap(node=>Array.isArray(node[tag])?[node[tag]]:[]);
}

function normalize(value:string){return value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');}

export async function readAptisDocx(buffer:Buffer){
 const tree=await readDocxTree(buffer,4*1024*1024);
 const tables=children(children(children(tree,'document').flat(),'body').flat(),'tbl');
 const entries=new Map<string,Vocabulary>();
 for(const table of tables){
  const rows=children(table,'tr').map(row=>children(row,'tc').map(cell=>docxText(cell).trim()));
  let word=-1,meaning=-1,example=-1,partOfSpeech=-1;
  for(const cells of rows){
   const headers=cells.map(normalize);
   const wordHeader=headers.findIndex(header=>['từ vựng','từ','word','vocabulary'].includes(header));
   const meaningHeader=headers.findIndex(header=>['nghĩa của từ','nghĩa','meaning'].includes(header));
   if(wordHeader!==-1&&meaningHeader!==-1){
    word=wordHeader; meaning=meaningHeader;
    example=headers.findIndex(header=>['câu ví dụ','ví dụ','example'].includes(header));
    partOfSpeech=headers.findIndex(header=>['loại từ','part of speech'].includes(header));
    continue;
   }
   if(word<0||!cells[word]||!cells[meaning])continue;
   const entry={word:cells[word],meaning:cells[meaning],example:cells[example]||'',partOfSpeech:cells[partOfSpeech]||''};
   if(entry.word.length>100||entry.meaning.length>250||entry.example.length>350||entry.partOfSpeech.length>80)throw new PracticeError('APTIS_CELL_TOO_LONG');
   entries.set(normalize(entry.word),entry);
   if(entries.size>1500)throw new PracticeError('APTIS_TOO_MANY_WORDS');
  }
 }
 const vocabulary=[...entries.values()];
 if(new Set(vocabulary.map(entry=>normalize(entry.meaning))).size<5)throw new PracticeError('APTIS_NEEDS_VOCABULARY');
 return vocabulary;
}

function shuffle<T>(values:readonly T[]){
 const copy=[...values];
 for(let i=copy.length-1;i>0;i--){
  const j=randomInt(i+1);
  [copy[i],copy[j]]=[copy[j],copy[i]];
 }
 return copy;
}

export function createAptisQuestions(bank:Vocabulary[]):AptisQuestion[]{
 const available=new Map<string,Vocabulary>();
 for(const entry of shuffle(bank)){
  const key=normalize(entry.meaning);
  if(!available.has(key))available.set(key,entry);
 }
 return [...available.values()].slice(0,5).map(entry=>{
  const distractors=[...available.values()].filter(other=>other!==entry);
  const similar=distractors.filter(other=>other.partOfSpeech===entry.partOfSpeech);
  const remaining=distractors.filter(other=>other.partOfSpeech!==entry.partOfSpeech);
  const options=shuffle([entry.meaning,...[...shuffle(similar),...shuffle(remaining)].slice(0,3).map(other=>other.meaning)]);
  return {...entry,options,correct:options.indexOf(entry.meaning)};
 });
}

export function publicAptisQuestions(questions:AptisQuestion[]){
 return questions.map(({word,options})=>({word,options}));
}

export function aptisExample(question:AptisQuestion){
 const pattern=question.word.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return question.example.replace(new RegExp('\\b'+pattern+'\\b','gi'),'___');
}
