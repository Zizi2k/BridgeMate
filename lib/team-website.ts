export function teamWebsite(value:unknown){
 if(typeof value!=='string'||value.length>2048)throw Error('WEBSITE_INVALID');
 const raw=value.trim();if(!raw)return '';
 if(/[\x00-\x1f\x7f]/.test(raw))throw Error('WEBSITE_INVALID');
 try{
  const url=new URL(raw.startsWith('//')?'https:'+raw:/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:'https://'+raw);
  if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.href.length>2048)throw Error('WEBSITE_INVALID');
  return url.href;
 }catch{throw Error('WEBSITE_INVALID')}
}
export function canEditTeamWebsite(userId:string,team:{ownerId:string;leaderId?:string|null},admin=false){return admin||team.ownerId===userId||team.leaderId===userId}
