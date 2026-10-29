import {collaboratorIds,majorityNeeded,electionWinner,taskPermissions,canUpdateSubtask,TeamworkError} from '../../../lib/teamwork';
import {createHash} from 'node:crypto';
import {composePractice,validateQuestion,PracticeError} from '../../../lib/practice';
import {readPracticeDocx} from '../../../lib/practice-docx';
import {composePhrasebook,validatePhrase,PhraseError} from '../../../lib/phrasebook';
import {validateProfile,ProfileError} from '../../../lib/profile';
import {generateAI,validateAIInput,AIError,getAIConfig} from '../../../lib/ai';
import {getDb} from '../../../db';
import {users,sessions,teams,members,tasks,understandings,comments,attempts,aiUsage,profiles,phraseEntries,practiceEntries,leaderVotes,taskCollaborators,subtasks} from '../../../db/schema';
import {and,eq,gt,desc,sql} from 'drizzle-orm';
import {phrases,categories,questions} from '../../../lib/content';
import {canEdit,taskChanged,scoreAnswers} from '../../../lib/policy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const maxDuration=60;
const uid=()=>crypto.randomUUID();const now=()=>new Date().toISOString();
class ApiError extends Error{constructor(public code:string,public status=400){super(code)}}
function check(v:any,code='VALIDATION',status=400):asserts v{if(!v)throw new ApiError(code,status)}
function str(v:any,max=4000){check(typeof v==='string'&&v.trim().length>0&&v.length<=max);return v.trim()}
const hex=(v:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(v instanceof Uint8Array?v.buffer:v)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function hash(password:string,salt=hex(crypto.getRandomValues(new Uint8Array(16)))){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return salt+':'+hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:100000},key,256));}
function publicUser(u:any){return {id:u.id,name:u.name,email:u.email,demo:!!u.demo}}
async function handle(req:Request){
 const db=getDb(),url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=req.method;
 const ok=(data:any,status=200,headers:Record<string,string>={})=>Response.json({data},{status,headers:{'Cache-Control':'no-store',...headers}});
 const token=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('bm_session='))?.slice(11);
 let user:any=null;
 if(token){const s=await db.select().from(sessions).where(and(eq(sessions.id,token),gt(sessions.expires,Date.now()))).limit(1).then(rows=>rows[0]);if(s)user=await db.select().from(users).where(eq(users.id,s.userId)).limit(1).then(rows=>rows[0])}
 if(method!=='GET'){const origin=req.headers.get('origin');check(!origin||origin===url.origin||origin===process.env.APP_ORIGIN,'ORIGIN',403);check((req.headers.get('content-type')||'').includes('application/json'),'CONTENT_TYPE',415)}
 const body:any=method==='GET'?{}:await req.json().catch(()=>{throw new ApiError('VALIDATION')});
 check(body&&typeof body==='object'&&!Array.isArray(body));
 check(JSON.stringify(body).length<(path[0]==='profiles'&&method==='PATCH'?180000:path[0]==='quiz'&&path[1]==='import'?2900000:path[0]==='quiz'&&path[1]==='questions'?1800000:30000),'TOO_LARGE',413);
 async function userSummary(u:any){const [p]=await db.select({avatar:profiles.avatar,slogan:profiles.slogan}).from(profiles).where(eq(profiles.userId,u.id)).limit(1);return {...publicUser(u),avatar:p?.avatar||'',slogan:p?.slogan||''};}
 async function session(u:any){const id=hex(crypto.getRandomValues(new Uint8Array(32)));await db.insert(sessions).values({id,userId:u.id,expires:Date.now()+604800000});return ok(await userSummary(u),200,{'Set-Cookie':`bm_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`})}
 if(path[0]==='health'){await db.execute(sql`SELECT 1`);return ok({status:'ok',database:'mysql'})}
 if(path[0]==='auth'){
  if(path[1]==='me')return ok(user?await userSummary(user):null);
  if(path[1]==='logout'&&method==='POST'){if(token)await db.delete(sessions).where(eq(sessions.id,token));return ok(null,200,{'Set-Cookie':'bm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
  if((path[1]==='register'||path[1]==='login')&&method==='POST'){
   const email=str(body.email,254).toLowerCase(),password=str(body.password,128);check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
   const u=await db.select().from(users).where(eq(users.email,email)).limit(1).then(rows=>rows[0]);
   if(path[1]==='register'){check(password.length>=8);check(!u,'EMAIL_EXISTS',409);const n={id:uid(),name:str(body.name,80),email,password:await hash(password),demo:0};await db.insert(users).values(n);return session(n)}
   check(u&&!u.demo&&u.password===await hash(password,u.password.split(':')[0]),'INVALID_LOGIN',401);return session(u);
  }
  if(path[1]==='demo'&&method==='POST'){
   if(user)return ok(await userSummary(user));
   const id=uid(),u={id,name:'Alex Morgan',email:`demo-${id}@example.invalid`,password:'disabled',demo:1};
   const t={id:uid(),name:'Vietnam × WCC',description:'BridgeMate • A shared space for our student project',ownerId:id,invite:uid().replaceAll('-','').slice(0,12).toUpperCase()};
   const people=[u,...['Minh Anh','Bao Duy','Sofia Chen','James Wilson','Emma Davis'].map(name=>({id:uid(),name,email:`demo-${uid()}@example.invalid`,password:'disabled',demo:1}))];
   const due=(d:number)=>new Date(Date.now()+d*86400000).toISOString();
   await db.transaction(async tx=>{await tx.insert(users).values(people);await tx.insert(teams).values(t);await tx.insert(members).values(people.map((p,i)=>({id:uid(),teamId:t.id,userId:p.id,role:i===0?'owner':'member'})));await tx.insert(tasks).values([
    {id:uid(),teamId:t.id,title:'Design the bilingual homepage',description:'Create a welcoming homepage for Vietnamese and WCC students. Include desktop and mobile layouts.',deliverable:'A shared design link with both layouts',assigneeId:id,createdBy:id,dueAt:due(3),priority:'high',status:'todo',version:1,createdAt:now()},
    {id:uid(),teamId:t.id,title:'Review our communication phrasebook',description:'Review the English and Vietnamese phrases. Make sure the tone is clear and respectful.',deliverable:'30 reviewed bilingual phrases',assigneeId:people[1].id,createdBy:id,dueAt:due(4),priority:'medium',status:'progress',version:1,createdAt:now()},
    {id:uid(),teamId:t.id,title:'Prepare the project poster',description:'Use our sage green style. Explain the problem, solution and understanding confirmation flow.',deliverable:'An editable poster and a PDF export',assigneeId:people[3].id,createdBy:id,dueAt:due(6),priority:'medium',status:'todo',version:1,createdAt:now()},
    {id:uid(),teamId:t.id,title:'Agree on our shared project goals',description:'Discuss the core features and divide responsibilities across six members.',deliverable:'An agreed scope and team assignment',assigneeId:people[4].id,createdBy:id,dueAt:due(-1),priority:'low',status:'done',version:1,createdAt:now()}
   ]);});return session(u);
  }
  throw new ApiError('NOT_FOUND',404);
 }
 check(user,'UNAUTHORIZED',401);
 async function teamAccess(id:string){const team=await db.select().from(teams).where(eq(teams.id,id)).limit(1).then(rows=>rows[0]);const member=await db.select().from(members).where(and(eq(members.teamId,id),eq(members.userId,user.id))).limit(1).then(rows=>rows[0]);check(team&&member&&!team.deleted,'FORBIDDEN',403);return team}
 async function taskAccess(id:string){const task=await db.select().from(tasks).where(eq(tasks.id,id)).limit(1).then(rows=>rows[0]);check(task&&!task.deleted,'NOT_FOUND',404);const team=await teamAccess(task.teamId);return {task,team}}
 if(path[0]==='profiles'){
  const target=path[1]==='me'?user.id:path[1];check(typeof target==='string'&&target.length<=36,'NOT_FOUND',404);
  if(method==='PATCH'){
   check(target===user.id,'FORBIDDEN',403);
   const input=validateProfile(body),updatedAt=now();
   const row={userId:user.id,bio:input.bio,interests:JSON.stringify(input.interests),slogan:input.slogan,socials:JSON.stringify(input.socials),avatar:input.avatar,updatedAt};
   await db.transaction(async tx=>{await tx.update(users).set({name:input.name}).where(eq(users.id,user.id));await tx.insert(profiles).values(row).onDuplicateKeyUpdate({set:row});});
   return ok({id:user.id,...input,updatedAt});
  }
  check(method==='GET','NOT_FOUND',404);
  if(target!==user.id){
   const viewerTeams=await db.select({teamId:members.teamId}).from(members).innerJoin(teams,eq(teams.id,members.teamId)).where(and(eq(members.userId,user.id),eq(teams.deleted,0)));
   const targetTeams=await db.select({teamId:members.teamId}).from(members).innerJoin(teams,eq(teams.id,members.teamId)).where(and(eq(members.userId,target),eq(teams.deleted,0)));
   check(viewerTeams.some(a=>targetTeams.some(b=>a.teamId===b.teamId)),'FORBIDDEN',403);
  }
  const [owner]=await db.select({id:users.id,name:users.name}).from(users).where(eq(users.id,target)).limit(1);check(owner,'NOT_FOUND',404);
  const [p]=await db.select().from(profiles).where(eq(profiles.userId,target)).limit(1);
  return ok({...owner,bio:p?.bio||'',interests:p?JSON.parse(p.interests):[],slogan:p?.slogan||'',socials:p?JSON.parse(p.socials):[],avatar:p?.avatar||'',updatedAt:p?.updatedAt||null});
 }
 if(path[0]==='ai'){
  const aiConfig=getAIConfig(process.env);
  const configured=!!aiConfig.apiKey&&process.env.AI_ENABLED!=='false';
  const dailyLimit=Math.min(200,Math.max(1,Number(process.env.AI_DAILY_LIMIT)||30));
  if(path[1]==='status'&&method==='GET')return ok({configured,dailyLimit,provider:aiConfig.provider});
  if(path[1]==='assist'&&method==='POST'){
   if(!configured)throw new AIError('AI_NOT_CONFIGURED',503);
   const input=validateAIInput(body);
   if(body.taskId){check(typeof body.taskId==='string');await taskAccess(body.taskId)}
   const time=Date.now(),day=new Date(time).toISOString().slice(0,10);
   const windows=[{id:user.id+':day:'+day,limit:dailyLimit,expires:Date.parse(day+'T00:00:00Z')+86400000},{id:user.id+':minute:'+Math.floor(time/60000),limit:6,expires:time+120000}];
   await db.transaction(async tx=>{
    for(const w of windows){
     await tx.insert(aiUsage).values({id:w.id,userId:user.id,requests:1,expires:w.expires}).onDuplicateKeyUpdate({set:{requests:sql`${aiUsage.requests}+1`}});
     const [counter]=await tx.select().from(aiUsage).where(eq(aiUsage.id,w.id)).for('update');
     if(counter.requests>w.limit)throw new AIError('AI_RATE_LIMIT',429);
    }
   });
   return ok(await generateAI(input,aiConfig));
  }
 }
 if(path[0]==='teams'){
  if(path.length===1&&method==='GET'){const list=await db.select({id:teams.id,name:teams.name,description:teams.description,ownerId:teams.ownerId,leaderId:teams.leaderId,invite:teams.invite}).from(teams).innerJoin(members,eq(teams.id,members.teamId)).where(and(eq(members.userId,user.id),eq(teams.deleted,0)));return ok(list)}
  if(path.length===1&&method==='POST'){const t={id:uid(),name:str(body.name,80),description:typeof body.description==='string'?body.description.slice(0,500):'',ownerId:user.id,invite:uid().replaceAll('-','').slice(0,12).toUpperCase()};await db.transaction(async tx=>{await tx.insert(teams).values(t);await tx.insert(members).values({id:uid(),teamId:t.id,userId:user.id,role:'owner'})});return ok(t,201)}
  if(path[1]==='join'&&method==='POST'){
   const invite=str(body.invite,32).toUpperCase();const joined=await db.transaction(async tx=>{const [t]=await tx.select().from(teams).where(eq(teams.invite,invite)).for('update');check(t&&!t.deleted,'INVALID_INVITE',404);const [m]=await tx.select().from(members).where(and(eq(members.teamId,t.id),eq(members.userId,user.id))).limit(1);if(!m)await tx.insert(members).values({id:uid(),teamId:t.id,userId:user.id,role:'member'});return t});return ok(joined)
  }
  if(path[1]==='trash'&&method==='GET'&&path.length===2)return ok(await db.select({id:teams.id,name:teams.name,description:teams.description}).from(teams).where(and(eq(teams.ownerId,user.id),eq(teams.deleted,1))));
  if((path.length===2&&(method==='PATCH'||method==='DELETE'))||(path.length===3&&path[2]==='restore'&&method==='POST')){
   return ok(await db.transaction(async tx=>{const [tm]=await tx.select().from(teams).where(eq(teams.id,path[1])).for('update');check(tm&&tm.ownerId===user.id,'FORBIDDEN',403);
    if(path[2]==='restore'){check(tm.deleted,'NOT_FOUND',404);await tx.update(teams).set({deleted:0}).where(eq(teams.id,tm.id));return {id:tm.id}}
    check(!tm.deleted,'NOT_FOUND',404);
    if(method==='DELETE'){check(body.confirmName===tm.name,'TEAM_CONFIRMATION');await tx.update(teams).set({deleted:1}).where(eq(teams.id,tm.id));return {id:tm.id}}
    const update:{name?:string;description?:string}={};if('name'in body)update.name=str(body.name,80);if('description'in body){check(typeof body.description==='string'&&body.description.length<=500);update.description=body.description.trim()}check(Object.keys(update).length);await tx.update(teams).set(update).where(eq(teams.id,tm.id));return {...tm,...update}
   }));
  }
  const t=await teamAccess(path[1]);
  if(path[2]==='leadership'){
   if(method==='GET'){const ms=await db.select({id:members.userId}).from(members).where(eq(members.teamId,t.id)),votes=await db.select().from(leaderVotes).where(eq(leaderVotes.teamId,t.id));return ok({leaderId:t.leaderId,needed:majorityNeeded(ms.length),myVote:votes.find(v=>v.voterId===user.id)?.candidateId||'',counts:ms.map(m=>({id:m.id,votes:votes.filter(v=>v.candidateId===m.id).length}))})}
   if(method==='POST'){const candidate=str(body.candidateId,36);return ok(await db.transaction(async tx=>{const [activeTeam]=await tx.select().from(teams).where(eq(teams.id,t.id)).for('update');check(activeTeam&&!activeTeam.deleted,'FORBIDDEN',403);const ms=await tx.select({id:members.userId}).from(members).where(eq(members.teamId,t.id));check(ms.some(m=>m.id===candidate),'CANDIDATE_NOT_MEMBER');await tx.insert(leaderVotes).values({teamId:t.id,voterId:user.id,candidateId:candidate}).onDuplicateKeyUpdate({set:{candidateId:candidate}});const votes=await tx.select().from(leaderVotes).where(eq(leaderVotes.teamId,t.id));const winner=electionWinner(votes,ms.map(m=>m.id));if(winner){await tx.update(teams).set({leaderId:winner}).where(eq(teams.id,t.id));await tx.delete(leaderVotes).where(eq(leaderVotes.teamId,t.id))}return {elected:!!winner,leaderId:winner}}))}
  }
  if(path[2]==='members'&&method==='GET')return ok(await db.select({id:users.id,name:users.name,role:members.role,demo:users.demo,avatar:profiles.avatar,slogan:profiles.slogan}).from(members).innerJoin(users,eq(members.userId,users.id)).leftJoin(profiles,eq(profiles.userId,users.id)).where(eq(members.teamId,t.id)));
  if(path[2]==='tasks'){
   if(method==='GET'){
    const ts=await db.select().from(tasks).where(and(eq(tasks.teamId,t.id),eq(tasks.deleted,0))).orderBy(desc(tasks.createdAt));
    const all=await db.select().from(understandings).innerJoin(tasks,eq(tasks.id,understandings.taskId)).where(eq(tasks.teamId,t.id));
    const cs=await db.select({taskId:taskCollaborators.taskId,userId:taskCollaborators.userId}).from(taskCollaborators).innerJoin(tasks,eq(tasks.id,taskCollaborators.taskId)).where(eq(tasks.teamId,t.id));
    const ss=await db.select({taskId:subtasks.taskId,status:subtasks.status}).from(subtasks).innerJoin(tasks,eq(tasks.id,subtasks.taskId)).where(and(eq(tasks.teamId,t.id),eq(subtasks.deleted,0)));
    return ok(ts.map(x=>({...x,collaboratorIds:cs.filter(c=>c.taskId===x.id&&c.userId!==x.assigneeId).map(c=>c.userId),subtaskTotal:ss.filter(c=>c.taskId===x.id).length,subtaskDone:ss.filter(c=>c.taskId===x.id&&c.status==='done').length,understanding:all.filter(r=>r.understandings.taskId===x.id&&r.understandings.taskVersion===x.version).sort((a,b)=>b.understandings.createdAt.localeCompare(a.understandings.createdAt))[0]?.understandings.status||'pending'})))
   }
   if(method==='POST'){
    check(['low','medium','high'].includes(body.priority));check(Number.isFinite(Date.parse(body.dueAt)));const ids=collaboratorIds(body.collaboratorIds,body.assigneeId);
    const task={id:uid(),teamId:t.id,title:str(body.title,160),description:str(body.description),deliverable:str(body.deliverable,1000),assigneeId:str(body.assigneeId,36),createdBy:user.id,dueAt:new Date(body.dueAt).toISOString(),priority:body.priority,status:'todo',version:1,createdAt:now()};
    await db.transaction(async tx=>{const [activeTeam]=await tx.select().from(teams).where(eq(teams.id,t.id)).for('update');check(activeTeam&&!activeTeam.deleted,'FORBIDDEN',403);const ms=await tx.select({id:members.userId}).from(members).where(eq(members.teamId,t.id));check([task.assigneeId,...ids].every(id=>ms.some(m=>m.id===id)),'ASSIGNEE_NOT_MEMBER');await tx.insert(tasks).values(task);if(ids.length)await tx.insert(taskCollaborators).values(ids.map(userId=>({taskId:task.id,userId}))) });return ok({...task,collaboratorIds:ids},201)
   }
  }
  if(path.length===2&&method==='GET')return ok(t);
 }
 if(path[0]==='tasks'){
  const {task,team}=await taskAccess(path[1]);
  const collaborators=await db.select({id:taskCollaborators.userId}).from(taskCollaborators).where(eq(taskCollaborators.taskId,task.id));
  const permissions=taskPermissions(task,user.id,team,collaborators.map(c=>c.id));
  if(path.length===2&&method==='GET')return ok({...task,permissions,leaderId:team.leaderId,collaboratorIds:collaborators.map(c=>c.id).filter(id=>id!==task.assigneeId),subtasks:await db.select().from(subtasks).where(and(eq(subtasks.taskId,task.id),eq(subtasks.deleted,0))).orderBy(subtasks.createdAt,subtasks.id),understandings:await db.select().from(understandings).where(eq(understandings.taskId,task.id)).orderBy(desc(understandings.createdAt)),comments:await db.select({id:comments.id,authorId:comments.authorId,content:comments.content,createdAt:comments.createdAt,name:users.name}).from(comments).innerJoin(users,eq(comments.authorId,users.id)).where(eq(comments.taskId,task.id)).orderBy(comments.createdAt)});
  // Every task mutation locks the team before the parent task, sharing the same
  // ordering as elections so role changes and participant assignments serialize.
  async function mutate(fn:(tx:any,current:any,perms:ReturnType<typeof taskPermissions>,ids:string[])=>Promise<any>){return db.transaction(async tx=>{const [tm]=await tx.select().from(teams).where(eq(teams.id,team.id)).for('update');check(tm&&!tm.deleted,'FORBIDDEN',403);const [current]=await tx.select().from(tasks).where(eq(tasks.id,task.id)).for('update');check(current&&!current.deleted,'NOT_FOUND',404);const cs=await tx.select({id:taskCollaborators.userId}).from(taskCollaborators).where(eq(taskCollaborators.taskId,task.id));const ids=cs.map(c=>c.id);return fn(tx,current,taskPermissions(current,user.id,tm,ids),ids)})}
  if(path.length===2&&method==='DELETE')return ok(await mutate(async(tx,current,p)=>{check(p.delete,'FORBIDDEN',403);await tx.update(tasks).set({deleted:1}).where(eq(tasks.id,current.id));return {id:current.id}}));
  if(path.length===2&&method==='PATCH')return ok(await mutate(async(tx,current,p,ids)=>{
   check(p.progress,'FORBIDDEN',403);const update:any={};
   for(const k of ['title','description','deliverable','assigneeId','dueAt','priority'])if(k in body){check(p.edit,'FORBIDDEN',403);update[k]=str(body[k],k==='description'?4000:1000)}
   if(update.title)check(update.title.length<=160);if(update.priority)check(['low','medium','high'].includes(update.priority));
   if(update.dueAt){check(Number.isFinite(Date.parse(update.dueAt)));update.dueAt=new Date(update.dueAt).toISOString()}
   const primary=update.assigneeId||current.assigneeId;
   if(update.assigneeId)check(await tx.select().from(members).where(and(eq(members.teamId,team.id),eq(members.userId,primary))).limit(1).then((rows:any[])=>rows[0]),'ASSIGNEE_NOT_MEMBER');
   if('status'in body){check(['todo','progress','done'].includes(body.status));update.status=body.status}
   const rosterChanged='collaboratorIds'in body;
   const desired=rosterChanged?collaboratorIds(body.collaboratorIds,primary):ids.filter(id=>id!==primary);
   if(rosterChanged){check(p.manage,'FORBIDDEN',403);const ms=await tx.select({id:members.userId}).from(members).where(eq(members.teamId,team.id));check(desired.every(id=>ms.some((m:any)=>m.id===id)),'ASSIGNEE_NOT_MEMBER')}
   if(rosterChanged||update.assigneeId){const assigned=await tx.select({id:subtasks.assigneeId}).from(subtasks).where(and(eq(subtasks.taskId,task.id),eq(subtasks.deleted,0)));check(assigned.every((s:any)=>[primary,...desired].includes(s.id)),'SUBTASK_ASSIGNEE',409);await tx.delete(taskCollaborators).where(eq(taskCollaborators.taskId,task.id));if(desired.length)await tx.insert(taskCollaborators).values(desired.map(userId=>({taskId:task.id,userId})))}
   check(Object.keys(update).length||rosterChanged);if(taskChanged(current,update))update.version=current.version+1;if(Object.keys(update).length)await tx.update(tasks).set(update).where(eq(tasks.id,task.id));return {id:task.id};
  }));
  if(path[2]==='subtasks')return ok(await mutate(async(tx,current,p,ids)=>{
   const validAssignee=async(id:string)=>{check([current.assigneeId,...ids].includes(id),'SUBTASK_PARTICIPANT');check(await tx.select().from(members).where(and(eq(members.teamId,team.id),eq(members.userId,id))).limit(1).then((r:any[])=>r[0]),'ASSIGNEE_NOT_MEMBER')};
   const dateValue=(v:unknown)=>{if(v==='')return '';check(typeof v==='string'&&Number.isFinite(Date.parse(v)));return new Date(v).toISOString()};
   if(path.length===3&&method==='POST'){
    check(p.manage,'FORBIDDEN',403);const existing=await tx.select({id:subtasks.id}).from(subtasks).where(and(eq(subtasks.taskId,task.id),eq(subtasks.deleted,0)));check(existing.length<100,'SUBTASK_LIMIT');const assigneeId=str(body.assigneeId,36);await validAssignee(assigneeId);
    const row={id:uid(),taskId:task.id,title:str(body.title,160),description:typeof body.description==='string'?body.description.slice(0,2000):'',assigneeId,dueAt:dateValue(body.dueAt||''),status:'todo',deleted:0,createdAt:now()};await tx.insert(subtasks).values(row);await tx.update(tasks).set({version:current.version+1}).where(eq(tasks.id,task.id));return row;
   }
   const [sub]=await tx.select().from(subtasks).where(and(eq(subtasks.id,path[3]||''),eq(subtasks.taskId,task.id),eq(subtasks.deleted,0))).limit(1);check(sub,'NOT_FOUND',404);
   if(method==='DELETE'&&path.length===4){check(p.manage,'FORBIDDEN',403);await tx.update(subtasks).set({deleted:1}).where(eq(subtasks.id,sub.id));await tx.update(tasks).set({version:current.version+1}).where(eq(tasks.id,task.id));return {id:sub.id}}
   if(method==='PATCH'&&path.length===4){check(canUpdateSubtask(p.manage,sub.assigneeId,user.id,body),'FORBIDDEN',403);const update:any={};for(const k of ['title','description','assigneeId'])if(k in body){update[k]=k==='description'?(typeof body[k]==='string'&&body[k].length<=2000?body[k]:(()=>{throw new ApiError('VALIDATION')})()):str(body[k],k==='title'?160:36)}if(update.assigneeId)await validAssignee(update.assigneeId);if('dueAt'in body)update.dueAt=dateValue(body.dueAt);if('status'in body){check(['todo','progress','done'].includes(body.status));update.status=body.status}check(Object.keys(update).length);await tx.update(subtasks).set(update).where(eq(subtasks.id,sub.id));if(['title','description','assigneeId','dueAt'].some(k=>k in update&&update[k]!==sub[k]))await tx.update(tasks).set({version:current.version+1}).where(eq(tasks.id,task.id));return {id:sub.id}}
   throw new ApiError('NOT_FOUND',404)
  }),method==='POST'&&path.length===3?201:200);
  if(path[2]==='understandings'&&method==='POST'){check(task.assigneeId===user.id,'FORBIDDEN',403);const row={id:uid(),taskId:task.id,taskVersion:task.version,authorId:user.id,content:str(body.content,2000),status:'submitted',feedback:'',createdAt:now()};await db.insert(understandings).values(row);return ok(row,201)}
  if(path[2]==='comments'&&method==='POST'){const c={id:uid(),taskId:task.id,authorId:user.id,content:str(body.content,2000),createdAt:now()};await db.insert(comments).values(c);return ok(c,201)}
 }
 if(path[0]==='understandings'&&path[2]==='review'&&method==='PATCH'){
  const u=await db.select().from(understandings).where(eq(understandings.id,path[1])).limit(1).then(rows=>rows[0]);check(u,'NOT_FOUND',404);const {task,team}=await taskAccess(u.taskId);check(canEdit(task,user.id,team.ownerId)||team.leaderId===user.id,'FORBIDDEN',403);check(u.taskVersion===task.version,'STALE_VERSION',409);check(u.status==='submitted','ALREADY_REVIEWED',409);
  const latest=await db.select().from(understandings).where(eq(understandings.taskId,task.id)).orderBy(desc(understandings.createdAt)).limit(1).then(rows=>rows[0]);check(latest?.id===u.id,'STALE_VERSION',409);check(['confirmed','clarify'].includes(body.status));const feedback=body.status==='clarify'?str(body.feedback,2000):(typeof body.feedback==='string'?body.feedback.slice(0,2000):'');await db.update(understandings).set({status:body.status,feedback}).where(eq(understandings.id,u.id));return ok({id:u.id});
 }
 if(path[0]==='phrases'){
  if(path.length===1&&method==='GET'){
   const records=await db.select().from(phraseEntries).where(eq(phraseEntries.userId,user.id)).orderBy(phraseEntries.updatedAt);
   return ok({...composePhrasebook(phrases,records),categories});
  }
  if(path.length===1&&method==='POST'){
   const input=validatePhrase(body,categories.map(c=>c.id));const row={id:uid(),userId:user.id,...input,deleted:0,updatedAt:now()};await db.insert(phraseEntries).values(row);return ok({id:row.id,...input,custom:true},201);
  }
  const id=path[1];check(typeof id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(id),'NOT_FOUND',404);
  const [saved]=await db.select().from(phraseEntries).where(and(eq(phraseEntries.userId,user.id),eq(phraseEntries.id,id))).limit(1);
  const original=phrases.find(p=>p.id===id),current=saved||original;check(current,'NOT_FOUND',404);
  if((path.length===2&&(method==='PATCH'||method==='DELETE'))||(path.length===3&&path[2]==='restore'&&method==='POST')){
   const restore=path[2]==='restore';
   if(restore)check(saved?.deleted,'NOT_FOUND',404);
   if(method==='PATCH')check(!saved?.deleted,'PHRASE_DELETED',409);
   const input=method==='PATCH'?validatePhrase(body,categories.map(c=>c.id)):{category:current.category,en:current.en,vi:current.vi};
   const row={id,userId:user.id,...input,deleted:method==='DELETE'?1:0,updatedAt:now()};
   await db.insert(phraseEntries).values(row).onDuplicateKeyUpdate({set:row});return ok({id,...input,deleted:!!row.deleted});
  }
  throw new ApiError('NOT_FOUND',404);
 }

 if(path[0]==='quiz'){
  const records=await db.select().from(practiceEntries).where(eq(practiceEntries.userId,user.id));
  const book=composePractice(questions,records),revision=createHash('sha256').update(JSON.stringify(book.questions)).digest('hex');
  const save=async(id:string,input:ReturnType<typeof validateQuestion>,deleted=0)=>{const row={id,userId:user.id,content:JSON.stringify(input),deleted,updatedAt:now()};await db.insert(practiceEntries).values(row).onDuplicateKeyUpdate({set:row});};
  if(method==='GET'&&path.length===1)return ok({questions:book.questions.map(({correct,explanationEn,explanationVi,...q})=>q),revision,attempts:await db.select({id:attempts.id,score:attempts.score,answers:attempts.answers,createdAt:attempts.createdAt}).from(attempts).where(eq(attempts.userId,user.id)).orderBy(desc(attempts.createdAt)).limit(10).then(rows=>rows.map(({answers,...a})=>{let total=10;try{const data=JSON.parse(answers);total=Array.isArray(data)?data.length:data.total}catch{}return {...a,total}}))});
  if(method==='GET'&&path[1]==='manage')return ok(book);
  if(method==='POST'&&path[1]==='import'){
   check(typeof body.file==='string'&&body.file.length<=2800000&&/^[A-Za-z0-9+/]+={0,2}$/.test(body.file),'DOCX_INVALID');
   return ok({questions:await readPracticeDocx(Buffer.from(body.file,'base64'))});
  }
  if(method==='POST'&&path[1]==='questions'&&path.length===2){
   const inputs=Array.isArray(body.questions)?body.questions:[body];check(inputs.length>0&&inputs.length<=100,'QUESTION_LIMIT');check(records.length+inputs.length<=500,'QUESTION_LIMIT');
   const values:ReturnType<typeof validateQuestion>[]=inputs.map(validateQuestion);await db.transaction(async tx=>{await tx.insert(practiceEntries).values(values.map(q=>({id:uid(),userId:user.id,content:JSON.stringify(q),deleted:0,updatedAt:now()})))});return ok({imported:values.length},201);
  }
  if(path[1]==='questions'&&path[2]){
   const id=path[2];const current=[...book.questions,...book.deleted].find(q=>q.id===id);check(current,'NOT_FOUND',404);
   if(method==='PATCH'&&path.length===3){check(!book.deleted.some(q=>q.id===id),'QUESTION_DELETED',409);await save(id,validateQuestion(body));return ok({id})}
   if(method==='DELETE'&&path.length===3){await save(id,validateQuestion(current),1);return ok({id})}
   if(method==='POST'&&path[3]==='restore'){await save(id,validateQuestion(current));return ok({id})}
  }
  if(method==='POST'&&path.length===1){
   check(book.questions.length>0,'QUIZ_EMPTY');check(!body.revision||body.revision===revision,'QUIZ_CHANGED',409);
   let score;try{score=scoreAnswers(body.answers,book.questions)}catch{throw new ApiError('VALIDATION')}
   await db.insert(attempts).values({id:uid(),userId:user.id,score,answers:JSON.stringify({answers:body.answers,total:book.questions.length}),createdAt:now()});
   return ok({score,total:book.questions.length,review:book.questions.map(q=>({id:q.id,correct:q.correct,en:q.explanationEn,vi:q.explanationVi}))});
  }
 }
 throw new ApiError('NOT_FOUND',404);
}
async function safe(req:Request){try{return await handle(req)}catch(e){if(e instanceof TeamworkError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof PracticeError)return Response.json({error:{code:e.code,detail:e.detail}},{status:400});if(e instanceof PhraseError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof ProfileError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof AIError)return Response.json({error:{code:e.code}},{status:e.status});if(e instanceof ApiError)return Response.json({error:{code:e.code}},{status:e.status});console.error('BridgeMate API error',e instanceof Error?e.message:'unknown');let cause:unknown=e;for(let depth=0;depth<4&&cause&&typeof cause==='object';depth++){const detail=cause as {code?:unknown;sqlState?:unknown;cause?:unknown;message?:unknown};if(detail.code==='HANDSHAKE_SSL_ERROR'){const text=typeof detail.message==='string'?detail.message.toLowerCase():'';const reason=text.includes('self-signed')||text.includes('self signed')?'SELF_SIGNED_CERTIFICATE':text.includes('does not support secure')?'SERVER_TLS_UNSUPPORTED':text.includes('expired')?'CERTIFICATE_EXPIRED':text.includes('unable to verify')||text.includes('unable to get local issuer')?'UNTRUSTED_CERTIFICATE_CHAIN':text.includes('hostname')||text.includes('altnames')?'CERTIFICATE_HOSTNAME_MISMATCH':'TLS_NEGOTIATION_FAILED';console.error('BridgeMate TLS diagnosis',{reason});}if(typeof detail.code==='string')console.error('BridgeMate dependency error',{code:detail.code,sqlState:typeof detail.sqlState==='string'?detail.sqlState:undefined});cause=detail.cause;}return Response.json({error:{code:'SERVER_ERROR'}},{status:500})}}
export const GET=safe;export const POST=safe;export const PATCH=safe;export const DELETE=safe;
