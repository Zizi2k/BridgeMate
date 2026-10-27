export type Phrase = {id:string;category:string;en:string;vi:string};
export type PhraseRecord = Phrase & {deleted:number;updatedAt:string};
export class PhraseError extends Error {code:string;constructor(code:string){super(code);this.code=code;}}
export function validatePhrase(value:unknown,categoryIds:readonly string[]):Omit<Phrase,'id'>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new PhraseError('PHRASE_INVALID');
 const b=value as Record<string,unknown>;
 if(typeof b.category!=='string'||!categoryIds.includes(b.category))throw new PhraseError('PHRASE_CATEGORY_INVALID');
 if(typeof b.en!=='string'||typeof b.vi!=='string'||!b.en.trim()||!b.vi.trim()||b.en.length>2000||b.vi.length>2000)throw new PhraseError('PHRASE_INVALID');
 return {category:b.category,en:b.en.trim(),vi:b.vi.trim()};
}
export function composePhrasebook(defaults:Phrase[],records:PhraseRecord[]){
 const entries=new Map(defaults.map(p=>[p.id,{...p,deleted:0,updatedAt:null as string|null,custom:false}]));
 for(const p of records)entries.set(p.id,{id:p.id,category:p.category,en:p.en,vi:p.vi,deleted:p.deleted,updatedAt:p.updatedAt,custom:!defaults.some(seed=>seed.id===p.id)});
 const list=[...entries.values()];
 return {phrases:list.filter(p=>!p.deleted),deleted:list.filter(p=>!!p.deleted)};
}
