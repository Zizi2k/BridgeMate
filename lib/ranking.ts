export const POINTS_PER_TASK=10;
export type RankName='diamond'|'gold'|'platinum'|'ruby';
export type RankingRow={id:string;name:string;avatar:string|null;completedTasks:number;points:number;position:number|null;rank:RankName|null};
export function rankTeam(people:{id:string;name:string;avatar?:string|null}[],completions:{recipients:string}[]):RankingRow[]{
 const counts=new Map(people.map(p=>[p.id,0]));
 for(const completion of completions){const ids:unknown=JSON.parse(completion.recipients);if(!Array.isArray(ids))throw Error('INVALID_COMPLETION');for(const id of new Set(ids))if(typeof id==='string'&&counts.has(id))counts.set(id,counts.get(id)!+1)}
 const rows=people.map(p=>({id:p.id,name:p.name,avatar:p.avatar||null,completedTasks:counts.get(p.id)||0,points:(counts.get(p.id)||0)*POINTS_PER_TASK,position:null,rank:null} as RankingRow)).sort((a,b)=>b.points-a.points||a.name.localeCompare(b.name,'vi')||a.id.localeCompare(b.id));
 const ranks:RankName[]=['diamond','gold','platinum','ruby'];
 for(let i=0;i<rows.length;i++){const row=rows[i];if(row.points===0)continue;row.position=i>0&&rows[i-1].points===row.points?rows[i-1].position:i+1;row.rank=row.position&&row.position<=4?ranks[row.position-1]:null}
 return rows;
}
export function completionRecipients(primary:string,collaborators:string[]){return [...new Set([primary,...collaborators])]}
