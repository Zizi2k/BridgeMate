import {settlePayroll,consolidateArrears,allocateSalary} from '../../../lib/payroll-arrears';
import {historicalAttendance,overlapsAttendance} from '../../../lib/attendance-supplement';
import {teamWebsite,canEditTeamWebsite} from '../../../lib/team-website';
import {payrollPdf,payrollXlsx} from '../../../lib/payroll-export';
import {validReportYear,payrollReportKey} from '../../../lib/payroll-report';
import {canManageDepartment,searchEmployee} from '../../../lib/department-policy';
import {MAX_EVIDENCE_BYTES,imageFilenameAllowed,evidenceExpiry,evidencePreviewMime,canUploadEvidence,canReplaceEvidence,canRequestEvidenceChange} from '../../../lib/attendance-evidence';
import {purgeAttendancePhotos} from '../../../lib/attendance-photo-cleanup';
import {localDay,shiftMinutes,netShiftMinutes} from '../../../lib/attendance';
import {attendancePayroll,closeAttendanceMonths} from '../../../lib/attendance-payroll';
import {aptisPhotoKey,aptisPhotoSlots} from '../../../lib/aptis-photos';
import aptisVocabulary from '../../../lib/data/aptis-vocabulary.json';
import {aptisExample,createAptisQuestions,publicAptisQuestions,readAptisDocx,type AptisChallenge,type Vocabulary} from '../../../lib/aptis';
import {vietQrBanks} from '../../../lib/vietqr-banks';
import {isModule,printDefaults,validatePrintTemplate,type Module} from '../../../lib/module-access';
import {employeeCodePattern,normalizeEmployeeCode,payPeriodPattern,payrollData,summarizePayslip} from '../../../lib/payroll';
import {accountRole} from "../../../lib/account-role";
import {personalData,validDay} from '../../../lib/personal-workspace';
import {rankTeam,completionRecipients,POINTS_PER_TASK} from '../../../lib/ranking';
import {collaboratorIds,majorityNeeded,electionWinner,taskPermissions,canUpdateSubtask,TeamworkError} from '../../../lib/teamwork';
import {createHash} from 'node:crypto';
import {composePractice,validateQuestion,PracticeError} from '../../../lib/practice';
import {readPracticeDocx} from '../../../lib/practice-docx';
import {composePhrasebook,validatePhrase,PhraseError} from '../../../lib/phrasebook';
import {validateProfile,ProfileError} from '../../../lib/profile';
import {generateAI,validateAIInput,AIError,getAIConfig} from '../../../lib/ai';
import {getDb} from '../../../db';
import {users,sessions,teams,members,tasks,understandings,comments,attempts,aiUsage,profiles,phraseEntries,practiceEntries,leaderVotes,taskCollaborators,subtasks,taskCompletions,personalEntries,accountAccess,payrollEntries,moduleApprovals,printSettings,removedAccounts,aptisChallenges,employeeAssignments,attendanceEntries,attendanceAudit,departments,accountDepartments,attendancePhotos,evidenceChangeRequests,salaryPayments,salaryPaymentBatches} from '../../../db/schema';
import {like,and,eq,gt,desc,sql,inArray,isNull} from 'drizzle-orm';
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
function publicUser(u:any){return {id:u.id,name:u.name,email:u.email,demo:!!u.demo,accountRole:accountRole(u)}}
async function handle(req:Request){
 const db=getDb(),url=new URL(req.url),path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=req.method;
 const ok=(data:any,status=200,headers:Record<string,string>={})=>Response.json({data},{status,headers:{'Cache-Control':'no-store',...headers}});
 const token=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('bm_session='))?.slice(11);
 const suspended=async (id:string)=>!!(await db.select({suspended:accountAccess.suspended}).from(accountAccess).where(eq(accountAccess.userId,id)).limit(1))[0]?.suspended;
 const removed=async(id:string)=>!!(await db.select({id:removedAccounts.userId}).from(removedAccounts).where(eq(removedAccounts.userId,id)).limit(1))[0];
 let user:any=null;
 if(token){const s=await db.select().from(sessions).where(and(eq(sessions.id,token),gt(sessions.expires,Date.now()))).limit(1).then(rows=>rows[0]);if(s)user=await db.select().from(users).where(eq(users.id,s.userId)).limit(1).then(rows=>rows[0])}
 if(user&&(await suspended(user.id)||await removed(user.id)))user=null;
 if(method!=='GET'){const origin=req.headers.get('origin');check(!origin||origin===url.origin||origin===process.env.APP_ORIGIN,'ORIGIN',403);check((req.headers.get('content-type')||'').includes('application/json'),'CONTENT_TYPE',415)}
 const body:any=method==='GET'?{}:await req.json().catch(()=>{throw new ApiError('VALIDATION')});
 check(body&&typeof body==='object'&&!Array.isArray(body));
 check(JSON.stringify(body).length<(path[0]==='attendance'&&path[2]==='photos'?4300000:path[0]==='personal'&&path[1]==='links'?830000:path[0]==='profiles'&&method==='PATCH'?180000:(path[0]==='quiz'&&path[1]==='import'||path[0]==='aptis'&&['bank','photo'].includes(path[1]))?2900000:path[0]==='quiz'&&path[1]==='questions'?1800000:30000),'TOO_LARGE',413);
 async function userSummary(u:any){const [p]=await db.select({avatar:profiles.avatar,slogan:profiles.slogan}).from(profiles).where(eq(profiles.userId,u.id)).limit(1);const [employee]=await db.select().from(employeeAssignments).where(eq(employeeAssignments.userId,u.id));const [department]=await db.select({id:departments.id,name:departments.name,status:accountDepartments.status}).from(accountDepartments).innerJoin(departments,and(eq(accountDepartments.departmentId,departments.id),eq(departments.active,1))).where(eq(accountDepartments.userId,u.id));return {...publicUser(u),departmentId:department?.id||'',departmentName:department?.name||'',departmentStatus:department?.status||'',accountRole:accountRole(u)==='admin'?'admin':employee?.manager?'manager':accountRole(u),avatar:p?.avatar||'',slogan:p?.slogan||''};}
 async function session(u:any){const id=hex(crypto.getRandomValues(new Uint8Array(32)));await db.insert(sessions).values({id,userId:u.id,expires:Date.now()+604800000});return ok(await userSummary(u),200,{'Set-Cookie':`bm_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${url.protocol==='https:'?'; Secure':''}`})}
 if(path[0]==='health'){await db.execute(sql`SELECT 1`);return ok({status:'ok',database:'mysql'})}
 if(path[0]==='auth'){
  if(path[1]==='me')return ok(user?await userSummary(user):null);
  if(path[1]==='logout'&&method==='POST'){if(token)await db.delete(sessions).where(eq(sessions.id,token));return ok(null,200,{'Set-Cookie':'bm_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'})}
  if((path[1]==='register'||path[1]==='login')&&method==='POST'){
   const email=str(body.email,254).toLowerCase(),password=str(body.password,128);check(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
   const u=await db.select().from(users).where(eq(users.email,email)).limit(1).then(rows=>rows[0]);
   if(path[1]==='register'){check(password.length>=8);check(!u,'EMAIL_EXISTS',409);const n={id:uid(),name:str(body.name,80),email,password:await hash(password),demo:0};await db.insert(users).values(n);return session(n)}
   check(u&&!u.demo&&u.password===await hash(password,u.password.split(':')[0]),'INVALID_LOGIN',401);check(!await suspended(u.id)&&!await removed(u.id),'ACCOUNT_SUSPENDED',403);return session(u);
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
   ]);const completed=await tx.select().from(tasks).where(and(eq(tasks.teamId,t.id),eq(tasks.status,'done')));if(completed.length)await tx.insert(taskCompletions).values(completed.map(task=>({taskId:task.id,teamId:t.id,recipients:JSON.stringify([task.assigneeId]),completedAt:now()})));});return session(u);
  }
  throw new ApiError('NOT_FOUND',404);
 }
 check(user,'UNAUTHORIZED',401);
  const dailyLimit=Math.min(200,Math.max(1,Number(process.env.AI_DAILY_LIMIT)||30));
 async function reserveAIRequest(){
   const time=Date.now(),day=new Date(time).toISOString().slice(0,10);
   const windows=[{id:user.id+':day:'+day,limit:dailyLimit,expires:Date.parse(day+'T00:00:00Z')+86400000},{id:user.id+':minute:'+Math.floor(time/60000),limit:6,expires:time+120000}];
   await db.transaction(async tx=>{
    for(const w of windows){
     await tx.insert(aiUsage).values({id:w.id,userId:user.id,requests:1,expires:w.expires}).onDuplicateKeyUpdate({set:{requests:sql`${aiUsage.requests}+1`}});
     const [counter]=await tx.select().from(aiUsage).where(eq(aiUsage.id,w.id)).for('update');
     if(counter.requests>w.limit)throw new AIError('AI_RATE_LIMIT',429);
    }
   });
 }
 const ownerAdmin=accountRole(user)==='admin';
 const [assignment]=await db.select().from(employeeAssignments).where(eq(employeeAssignments.userId,user.id));
 const admin=ownerAdmin;
 const [currentDepartment]=await db.select({departmentId:departments.id,status:accountDepartments.status,active:departments.active}).from(accountDepartments).innerJoin(departments,eq(departments.id,accountDepartments.departmentId)).where(eq(accountDepartments.userId,user.id));
 const departmentContext=currentDepartment?{...currentDepartment,active:!!currentDepartment.active}:null;
 const departmentManager=!!assignment?.manager&&!!departmentContext?.active&&departmentContext.status==='approved';
 async function employeeDepartment(id:string){return (await db.select({departmentId:accountDepartments.departmentId}).from(accountDepartments).innerJoin(departments,and(eq(departments.id,accountDepartments.departmentId),eq(departments.active,1))).where(and(eq(accountDepartments.userId,id),eq(accountDepartments.status,'approved'))).limit(1))[0]?.departmentId}
 async function managesEmployee(id:string){return canManageDepartment(ownerAdmin,departmentManager,departmentContext,await employeeDepartment(id))}
 async function departmentEmployeeIds(){if(!departmentManager)return [];return (await db.select({userId:accountDepartments.userId}).from(accountDepartments).where(and(eq(accountDepartments.departmentId,currentDepartment.departmentId),eq(accountDepartments.status,'approved')))).map(row=>row.userId)}

 const isAptis=path[0]==='aptis'&&path.length===2;
 if(isAptis&&path[1]==='photos'&&method==='GET'){
  const entries=await db.select({id:printSettings.id}).from(printSettings)
   .where(inArray(printSettings.id,aptisPhotoSlots.map(aptisPhotoKey)));
  return ok(aptisPhotoSlots.filter(slot=>entries.some(entry=>entry.id===aptisPhotoKey(slot))));
 }
 if(isAptis&&path[1]==='photo'){
  const requested=url.searchParams.get('slot')??'1';
  const slot=aptisPhotoSlots.find(value=>String(value)===requested);
  check(slot,'APTIS_IMAGE_SLOT_INVALID');
  const id=aptisPhotoKey(slot);
  const target=eq(printSettings.id,id);
  if(method==='GET'){
   const [entry]=await db.select().from(printSettings).where(target).limit(1);
   if(!entry)return new Response(null,{status:404,headers:{'Cache-Control':'private, no-store'}});
   const {mime,base64}=entry.data as {mime:string;base64:string};
   return new Response(new Uint8Array(Buffer.from(base64,'base64')),{
    headers:{'Content-Type':mime,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'},
   });
  }
  check(admin,'FORBIDDEN',403);
  if(method==='DELETE'){
   await db.delete(printSettings).where(target);
   return ok(null);
  }
  if(method==='PATCH'){
   const image=typeof body.image==='string'&&/^data:(image\/(?:png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(body.image);
   check(image&&image[2].length%4===0,'APTIS_IMAGE_INVALID');
   const [,mime,base64]=image;
   const bytes=Buffer.from(base64,'base64');
   check(bytes.length>=24&&bytes.length<=2*1024*1024,'APTIS_IMAGE_INVALID');
   const valid=mime==='image/png'
    ? bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&bytes.toString('ascii',12,16)==='IHDR'
    : bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
   check(valid,'APTIS_IMAGE_INVALID');
   const data={mime,base64};
   await db.insert(printSettings).values({id,data}).onDuplicateKeyUpdate({set:{data}});
   return ok(null);
  }
 }
 const bankId='aptis-vocabulary';
 const configurationQuery=eq(printSettings.id,bankId);
 const [settings]=await db.select({
  enabled:sql<string|null>`JSON_UNQUOTE(JSON_EXTRACT(${printSettings.data}, '$.enabled'))`,
 }).from(printSettings).where(configurationQuery).limit(1);
 const aptisEnabled=settings?.enabled==null?process.env.APTIS_GATE_ENABLED!=='false':settings.enabled==='true';
 const sessionId=token!;
 const challengeFor=async()=>{
  const [entry]=await db.select().from(aptisChallenges).where(eq(aptisChallenges.sessionId,sessionId)).limit(1);
  return entry?.data as AptisChallenge|undefined;
 };
 const getAptisVocabulary=async()=>{
  const [entry]=await db.select().from(printSettings).where(configurationQuery).limit(1);
  return (entry?.data as {vocabulary:Vocabulary[]}|undefined)?.vocabulary??aptisVocabulary;
 };
 if(isAptis&&path[1]==='bank'){
  check(admin,'FORBIDDEN',403);
  const current=await getAptisVocabulary();
  if(method==='GET')return ok({count:current.length,enabled:aptisEnabled});
  if(method==='PATCH'){
   check(typeof body.enabled==='boolean'||typeof body.docx==='string');
   const vocabulary=typeof body.docx==='string'?await readAptisDocx(Buffer.from(body.docx,'base64')):current;
   const data={enabled:typeof body.enabled==='boolean'?body.enabled:aptisEnabled,vocabulary};
   await db.insert(printSettings).values({id:bankId,data}).onDuplicateKeyUpdate({set:{
    data:typeof body.enabled==='boolean'&&typeof body.docx==='string'?data:
     typeof body.enabled==='boolean'?sql`JSON_SET(${printSettings.data}, '$.enabled', CAST(${JSON.stringify(data.enabled)} AS JSON))`:
     sql`JSON_SET(${printSettings.data}, '$.vocabulary', CAST(${JSON.stringify(vocabulary)} AS JSON))`,
   }});
   return ok({count:vocabulary.length,enabled:data.enabled});
  }
 }
 if(isAptis&&path[1]==='skip'&&method==='POST'){
  const data={id:uid(),questions:[],scores:[],passed:false,skipped:true};
  await db.insert(aptisChallenges).values({sessionId,data}).onDuplicateKeyUpdate({set:{
   data:sql`JSON_SET(${aptisChallenges.data}, '$.skipped', CAST('true' AS JSON))`,
  }});
  return ok(null);
 }
 if(isAptis&&path[1]==='start'&&method==='POST'){
  if(!aptisEnabled)return ok(null);
  const existing=await challengeFor() as (AptisChallenge&{skipped?:boolean})|undefined;
  if(existing?.skipped||existing?.passed)return ok(null);
  const questions=createAptisQuestions(await getAptisVocabulary());
  const challenge:AptisChallenge={id:uid(),questions,scores:questions.map(()=>null),passed:false};
  await db.insert(aptisChallenges).values({sessionId,data:challenge}).onDuplicateKeyUpdate({set:{data:sql`CASE WHEN JSON_UNQUOTE(JSON_EXTRACT(${aptisChallenges.data}, '$.skipped')) = 'true' THEN ${aptisChallenges.data} ELSE CAST(${JSON.stringify(challenge)} AS JSON) END`}});
  return ok({id:challenge.id,questions:publicAptisQuestions(questions)});
 }
 if(isAptis&&path[1]==='submit'&&method==='POST'){
  return db.transaction(async tx=>{
   const [entry]=await tx.select().from(aptisChallenges).where(eq(aptisChallenges.sessionId,sessionId)).for('update');
   const challenge=entry?.data as AptisChallenge|undefined;
   check(challenge&&challenge.id===body.id,'APTIS_EXPIRED',409);
   check(Array.isArray(body.answers)&&body.answers.length===challenge.questions.length);
   const scores=challenge.questions.map((question,index)=>{
    if(challenge.scores[index]===true)return true;
    const answer=body.answers[index];
    check(Number.isInteger(answer)&&answer>=0&&answer<question.options.length);
    return answer===question.correct;
   });
   const passed=scores.every(Boolean);
   await tx.update(aptisChallenges).set({data:{...challenge,scores,passed}}).where(eq(aptisChallenges.sessionId,sessionId));
   return ok({scores,passed});
  });
 }
 if(isAptis&&path[1]==='hint'&&method==='POST'){
  const challenge=await challengeFor();
  check(challenge&&challenge.id===body.id,'APTIS_EXPIRED',409);
  const index=body.index;
  check(Number.isInteger(index)&&challenge.scores[index]===false,'APTIS_HINT_UNAVAILABLE',403);
  const question=challenge.questions[index];
  const example=aptisExample(question);
  const vi=body.language==='vi';
  const fallback={text:[question.partOfSpeech&&(vi?'Loại từ: ':'Part of speech: ')+question.partOfSpeech,
   example&&(vi?'Đọc ngữ cảnh: ':'Read the context: ')+example].filter(Boolean).join('\n')||
   (vi?'Thử đặt từ vào một câu và loại những nghĩa khác ngữ cảnh.':'Try using the word in a sentence and rule out meanings that do not fit.'),ai:false};
  try{
   const aiConfig=getAIConfig(process.env);
   if(!aiConfig.apiKey||process.env.AI_ENABLED==='false')return ok(fallback);
   await reserveAIRequest();
   const hint=await generateAI({
    action:'ask',targetLanguage:vi?'vi':'en',
    text:'Give the learner one short clue about the vocabulary word. Use a new English sentence with a blank or describe a typical situation. Never translate the word, reveal the exact meaning, state an answer option or give its letter.',
    context:JSON.stringify({word:question.word,meaning:question.meaning,partOfSpeech:question.partOfSpeech,example}),
   },aiConfig);
   return ok({text:hint.text,ai:true});
  }catch(error){
   if(error instanceof AIError)return ok(fallback);
   throw error;
  }
 }
 if(isAptis)throw new ApiError('NOT_FOUND',404);
 if(aptisEnabled){
  const [unlocked]=await db.select({sessionId:aptisChallenges.sessionId}).from(aptisChallenges).where(and(
   eq(aptisChallenges.sessionId,sessionId),
   sql`(JSON_UNQUOTE(JSON_EXTRACT(${aptisChallenges.data}, '$.passed')) = 'true' OR JSON_UNQUOTE(JSON_EXTRACT(${aptisChallenges.data}, '$.skipped')) = 'true')`,
  )).limit(1);
  check(unlocked,'APTIS_REQUIRED',403);
 }
 const visibility=async()=>{
  const rows=await db.select().from(printSettings).where(inArray(printSettings.id,['visibility-links','visibility-payroll']));
  return {links:rows.some(row=>row.id==='visibility-links'&&row.data===true),
   payroll:rows.some(row=>row.id==='visibility-payroll'&&row.data===true)};
 };
 const hidden=async(module:Module)=>(await visibility())[module==='links'?'links':'payroll'];
 if(path[0]==='module-visibility'&&path.length===1){
  if(method==='GET')return ok(await visibility());
  if(method==='PATCH'){
   check(admin,'FORBIDDEN',403);
   check(ownerAdmin||body.module!=='links','FORBIDDEN',403);
   check((body.module==='links'||body.module==='payroll')&&typeof body.hidden==='boolean');
   const id='visibility-'+body.module,data=body.hidden;
   await db.insert(printSettings).values({id,data}).onDuplicateKeyUpdate({set:{data}});
   return ok(await visibility());
  }
 }
 const approved=async (module:Module)=> (module==='links'?ownerAdmin:admin)||!user.demo&&!(await hidden(module))&&(await db.select({status:moduleApprovals.status})
  .from(moduleApprovals).where(and(eq(moduleApprovals.userId,user.id),eq(moduleApprovals.module,module))).limit(1))[0]?.status==='approved';
 if(path[0]==='access'&&path.length===1){
  if(method==='GET'){
   const rows=await db.select({module:moduleApprovals.module,status:moduleApprovals.status}).from(moduleApprovals).where(eq(moduleApprovals.userId,user.id));
   return ok({admin:ownerAdmin,manager:false,permissions:Object.fromEntries(rows.map(row=>[row.module,row.status]))});
  }
  if(method==='POST'){
   check(!user.demo,'FORBIDDEN',403);
   check(isModule(body.module));
   const module=body.module;
   check((module==='links'?ownerAdmin:admin)||!await hidden(module),'MODULE_HIDDEN',403);
   await db.insert(moduleApprovals).values({userId:user.id,module,status:'pending'}).onDuplicateKeyUpdate({
    set:{status:sql`CASE WHEN ${moduleApprovals.status} = 'approved' THEN 'approved' ELSE 'pending' END`},
   });
   return ok(null);
  }
 }
 if(path[0]==='payroll-bank-lookup'&&path.length===1&&method==='POST'){
  check(!user.demo&&(await approved('payroll-personal')||await approved('payroll-team')),'FORBIDDEN',403);
  check(typeof body.bin==='string'&&vietQrBanks.some(bank=>bank.bin===body.bin&&bank.lookupSupported),'BANK_LOOKUP_UNSUPPORTED');
  check(typeof body.accountNumber==='string'&&/^\d{4,19}$/.test(body.accountNumber));
  const clientId=process.env.VIETQR_CLIENT_ID, apiKey=process.env.VIETQR_API_KEY;
  check(clientId&&apiKey,'BANK_LOOKUP_UNCONFIGURED',503);
  const minute=Math.floor(Date.now()/60000), id=user.id+':bank:'+minute;
  await db.transaction(async tx=>{
   await tx.insert(aiUsage).values({id,userId:user.id,requests:1,expires:(minute+2)*60000})
    .onDuplicateKeyUpdate({set:{requests:sql`${aiUsage.requests}+1`}});
   const [counter]=await tx.select().from(aiUsage).where(eq(aiUsage.id,id)).for('update');
   check(counter.requests<=8,'BANK_LOOKUP_RATE_LIMIT',429);
  });
  let response:Response;
  try{response=await fetch('https://api.vietqr.io/v2/lookup',{
   method:'POST',headers:{'Content-Type':'application/json','x-client-id':clientId,'x-api-key':apiKey},
   body:JSON.stringify({bin:Number(body.bin),accountNumber:body.accountNumber}),signal:AbortSignal.timeout(8000),cache:'no-store',
  });}catch{throw new ApiError('BANK_LOOKUP_UNAVAILABLE',502)}
  if(response.status===401||response.status===403)throw new ApiError('BANK_LOOKUP_CREDENTIALS',502);
  if(response.status===429)throw new ApiError('BANK_LOOKUP_PROVIDER_LIMIT',429);
  check(response.ok,'BANK_LOOKUP_UNAVAILABLE',502);
  const result=await response.json().catch(()=>null);
  const providerCode=String(result?.code??'');
  if(providerCode==='21'||providerCode==='42')throw new ApiError('BANK_LOOKUP_INVALID_ACCOUNT',422);
  if(providerCode==='41')throw new ApiError('BANK_LOOKUP_UNSUPPORTED',422);
  if(providerCode==='45'||providerCode==='43')throw new ApiError('BANK_LOOKUP_UNAVAILABLE',502);
  const name=providerCode==='00'&&typeof result.data?.accountName==='string'?result.data.accountName.trim():'';
  check(name&&name.length<=180,'BANK_LOOKUP_UNCONFIRMED',422);
  return ok({name});
 }
 if(path[0]==='payroll-template'&&path.length===1){
  if(method==='GET'){
   check(await approved('payroll-personal')||await approved('payroll-team'),'APPROVAL_REQUIRED',403);
   const [row]=await db.select().from(printSettings).where(eq(printSettings.id,'payroll')).limit(1);
   return ok({...printDefaults,...row?.data as object});
  }
  if(method==='PATCH'){
   check(admin,'FORBIDDEN',403);
   const data=validatePrintTemplate(body);check(data);
   await db.insert(printSettings).values({id:'payroll',data}).onDuplicateKeyUpdate({set:{data}});
   return ok(data);
  }
 }

 if(path[0]==='departments'){
  check(!user.demo,'FORBIDDEN',403);
  if(method==='GET')return ok(await db.select().from(departments).where(ownerAdmin?undefined:eq(departments.active,1)).orderBy(departments.name));
  if(path[1]==='select'&&method==='POST'){
   check(!currentDepartment||currentDepartment.status==='pending','DEPARTMENT_LOCKED',403);
   const departmentId=str(body.departmentId,36);
   const [department]=await db.select().from(departments).where(and(eq(departments.id,departmentId),eq(departments.active,1)));check(department,'DEPARTMENT_REQUIRED');
   // A conditional update prevents a concurrent admin approval from being overwritten.
   await db.insert(accountDepartments).values({userId:user.id,departmentId,status:'pending'}).onDuplicateKeyUpdate({set:{departmentId:sql`CASE WHEN ${accountDepartments.status} = 'pending' THEN ${departmentId} ELSE ${accountDepartments.departmentId} END`}});
   return ok(await userSummary(user));
  }
  check(ownerAdmin,'FORBIDDEN',403);
  if(method==='POST'&&!path[1]){const name=str(body.name,120),id=uid();await db.insert(departments).values({id,name});return ok({id,name,active:1},201)}
  if(method==='PATCH'&&path[1]){const name=str(body.name,120);check(typeof body.active==='boolean');await db.update(departments).set({name,active:body.active?1:0}).where(eq(departments.id,path[1]));return ok(null)}
  throw new ApiError('NOT_FOUND',404);
 }
 if(path[0]==='salary-payments'){
  check(ownerAdmin||departmentManager,'FORBIDDEN',403);
  let recipientId=method==='GET'?url.searchParams.get('employeeId'):body.recipientId;
  let requestedDepartment=method==='GET'?url.searchParams.get('departmentId'):body.departmentId;
  let batchRows:any[]=[];
  if(path[1]&&path[2]==='void'&&method==='POST'){
   batchRows=await db.select().from(salaryPayments).where(eq(salaryPayments.batchId,path[1]));check(batchRows.length,'NOT_FOUND',404);
   recipientId=batchRows[0].recipientId;requestedDepartment=batchRows[0].departmentId;
  }
  const employeeId=str(recipientId,36),departmentId=str(requestedDepartment,36);
  check(await managesEmployee(employeeId),'FORBIDDEN',403);
  check(ownerAdmin||departmentId===currentDepartment.departmentId,'FORBIDDEN',403);
  if(method==='GET'&&!path[1]){
   const period=url.searchParams.get('period')||localDay().slice(0,7);check(payPeriodPattern.test(period));
   return ok(await db.select().from(salaryPayments).where(and(eq(salaryPayments.recipientId,employeeId),eq(salaryPayments.departmentId,departmentId),sql`${salaryPayments.period} <= ${period}`)).orderBy(desc(salaryPayments.createdAt)));
  }
  if(path[2]==='void'&&method==='POST'){
   const reason=str(body.reason,1000);
   await db.transaction(async tx=>{
    await tx.select().from(salaryPaymentBatches).where(eq(salaryPaymentBatches.id,path[1])).for('update');
    await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,employeeId)).for('update');
    const entries=await tx.select().from(salaryPayments).where(eq(salaryPayments.batchId,path[1])).for('update');
    check(entries.every(row=>row.recipientId===employeeId&&row.departmentId===departmentId),'FORBIDDEN',403);
    await tx.update(salaryPayments).set({voided:1,voidReason:reason,voidedBy:user.id,voidedAt:now()}).where(and(eq(salaryPayments.batchId,path[1]),eq(salaryPayments.voided,0)));
   });return ok(null);
  }
  check(method==='POST'&&!path[1],'NOT_FOUND',404);
  const period=str(body.period,7),batchId=str(body.batchId,36),kind=body.kind,amount=body.amount,paidAt=str(body.paidAt,10),note=typeof body.note==='string'?body.note.trim():'';
  check(payPeriodPattern.test(period)&&/^[0-9a-f-]{36}$/i.test(batchId)&&['salary','advance'].includes(kind)&&Number.isSafeInteger(amount)&&amount>0&&amount<=1e12&&validDay(paidAt)&&paidAt<=localDay()&&note.length<=1000);
  const oldestFirst=body.oldestFirst===true;
  check(kind!=='advance'||!oldestFirst);
  const requestHash=createHash('sha256').update(JSON.stringify({employeeId,departmentId,period,kind,amount,paidAt,note,oldestFirst})).digest('hex');
  return db.transaction(async tx=>{
   await tx.insert(salaryPaymentBatches).values({id:batchId,requestHash,recipientId:employeeId,departmentId,createdBy:user.id,createdAt:now()}).onDuplicateKeyUpdate({set:{id:batchId}});
   const [batch]=await tx.select().from(salaryPaymentBatches).where(eq(salaryPaymentBatches.id,batchId)).for('update');
   check(batch.requestHash===requestHash&&batch.recipientId===employeeId&&batch.departmentId===departmentId,'PAYMENT_RETRY_CHANGED',409);
   const [employee]=await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,employeeId)).for('update');check(employee,'NOT_FOUND',404);
   const previous=await tx.select().from(salaryPayments).where(eq(salaryPayments.batchId,batchId)).for('update');
   if(previous.length){check(previous.every(row=>row.requestHash===requestHash),'PAYMENT_RETRY_CHANGED',409);check(previous.every(row=>!row.voided),'PAYMENT_VOIDED',409);return ok({batchId,reused:true})}
   const source=await tx.select().from(payrollEntries).where(and(like(payrollEntries.scopeId,'team:%'),sql`JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.recipientId')) = ${employeeId}`,sql`JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.period')) <= ${period}`)).for('update');
   const currentEmployeeDepartment=await employeeDepartment(employeeId);
   const records=source.map(row=>({...row.data as Record<string,any>,id:row.id}) as Record<string,any>).filter(row=>(row.departmentId||currentEmployeeDepartment)===departmentId).map(row=>({...row,departmentId}) as Record<string,any>);
   const payments=await tx.select().from(salaryPayments).where(and(eq(salaryPayments.recipientId,employeeId),eq(salaryPayments.departmentId,departmentId),sql`${salaryPayments.period} <= ${period}`));
   const monthly=settlePayroll(records,payments);
   let allocations:{period:string;amount:number}[];
   if(kind==='salary'){try{allocations=allocateSalary(monthly,amount,period,oldestFirst)}catch{throw new ApiError('PAYMENT_EXCEEDS_BALANCE',409)}}
   else{check(records.some(row=>row.period===period),'PAYROLL_NOT_READY',409);allocations=[{period,amount}]}
   const [department]=await tx.select().from(departments).where(eq(departments.id,departmentId));check(department,'NOT_FOUND',404);
   const createdAt=now();
   for(const allocation of allocations){const id=createHash('sha256').update(batchId+':'+allocation.period).digest('hex').slice(0,36);await tx.insert(salaryPayments).values({id,batchId,requestHash,recipientId:employeeId,departmentId,period:allocation.period,kind,amount:allocation.amount,paidAt,note,metadata:{worker:employee.name,employeeCode:employee.code,departmentName:department.name},createdBy:user.id,createdAt})}
   return ok({batchId,allocations},201);
  });
 }
 if(path[0]==='department-payroll'&&method==='GET'){
  check(ownerAdmin||departmentManager,'FORBIDDEN',403);
  const year=url.searchParams.get('year'),period=year||url.searchParams.get('period')||localDay().slice(0,7);check(year?validReportYear(year):payPeriodPattern.test(period));
  const asOf=year?year+'-12':period;
  const departmentId=ownerAdmin?(url.searchParams.get('departmentId')||''):currentDepartment.departmentId;
  const memberships=await db.select({userId:accountDepartments.userId,departmentId:accountDepartments.departmentId,departmentName:departments.name}).from(accountDepartments).innerJoin(departments,eq(departments.id,accountDepartments.departmentId)).where(and(eq(accountDepartments.status,'approved'),!ownerAdmin?eq(accountDepartments.departmentId,departmentId):undefined));
  const departmentNames=await db.select().from(departments);
  const ids=memberships.map(row=>row.userId);
  const query=searchEmployee((url.searchParams.get('q')||'').slice(0,120));
  const rows=await db.select().from(payrollEntries).where(and(sql`JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.period')) <= ${asOf}`,like(payrollEntries.scopeId,'team:%'),ownerAdmin?undefined:ids.length?inArray(sql`JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.recipientId'))`,ids):sql`false`));
  const scoped:Array<Record<string,any>>=rows.flatMap(row=>{
   const data=row.data as Record<string,any>,membership=memberships.find(member=>member.userId===data.recipientId);
   if(!ownerAdmin&&(!membership||data.departmentId&&data.departmentId!==departmentId))return [];
   const payrollDepartmentId=data.departmentId||membership?.departmentId||'';
   if(ownerAdmin&&departmentId&&payrollDepartmentId!==departmentId)return [];
   if(url.searchParams.get('employeeId')&&data.recipientId!==url.searchParams.get('employeeId'))return [];
   return [{...data,id:row.id,departmentId:payrollDepartmentId,departmentName:departmentNames.find(department=>department.id===payrollDepartmentId)?.name||'Chưa phân phòng ban'}];
  });
  const payments=await db.select().from(salaryPayments).where(and(sql`${salaryPayments.period} <= ${asOf}`,ownerAdmin?undefined:eq(salaryPayments.departmentId,departmentId)));
  const authorizedPayments=payments.filter(payment=>{
   if(!ownerAdmin&&!memberships.some(member=>member.userId===payment.recipientId&&member.departmentId===payment.departmentId))return false;
   if(departmentId&&payment.departmentId!==departmentId)return false;
   return !url.searchParams.get('employeeId')||payment.recipientId===url.searchParams.get('employeeId');
  });
  const allMonthly=settlePayroll(scoped,authorizedPayments);
  const matching=new Set(allMonthly.filter(row=>!query||searchEmployee(row.employeeCode+' '+row.worker).includes(query)).map(row=>JSON.stringify([row.recipientId||row.worker,row.departmentId])));
  const monthly=allMonthly.filter(row=>matching.has(JSON.stringify([row.recipientId||row.worker,row.departmentId])));
  const selected=monthly.filter(row=>(year?row.period.startsWith(year+'-'):row.period===period)&&(!url.searchParams.get('reportKey')||payrollReportKey(row)===url.searchParams.get('reportKey')));
  const consolidated=consolidateArrears(monthly,asOf).filter(row=>!url.searchParams.get('statementKey')||JSON.stringify([row.recipientId,row.departmentId])===url.searchParams.get('statementKey'));
  const visible=url.searchParams.get('view')==='consolidated'?consolidated:selected;
  const totals:Record<string,{name:string;total:number;hours:number;balance:number;advance:number;paid:number}>={};
  for(const row of visible){const group=totals[row.departmentId]??={name:row.departmentName,total:0,hours:0,balance:0,advance:0,paid:0};group.advance+=row.advance;group.paid+=row.paid;group.total+=Number(row.total)||0;group.hours+=Number(row.hours)||0;group.balance+=Number(row.balance)||0}
  const [template]=await db.select().from(printSettings).where(eq(printSettings.id,'payroll'));
  const printTemplate={...printDefaults,...template?.data as object};
  if(path[1]==='export'){
   const format=url.searchParams.get('format'),kind=url.searchParams.get('kind');check((format==='xlsx'||format==='pdf')&&(kind==='ledger'||kind==='slips'));
   const exportRows=kind==='slips'&&!year&&url.searchParams.get('view')!=='consolidated'?visible.map(row=>consolidated.find(statement=>statement.recipientId===row.recipientId&&statement.departmentId===row.departmentId)||row):visible;
   const bytes=format==='xlsx'?await payrollXlsx(exportRows,kind,period,printTemplate.company):await payrollPdf(exportRows,kind,period,printTemplate);
   const filename=(kind==='ledger'?'Bang_luong_':'Phieu_luong_')+period+'.'+format;
   return new Response(Buffer.from(bytes),{headers:{'Content-Type':format==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'application/pdf','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  return ok({rows:visible,consolidated,asOf,totals:Object.values(totals),template:printTemplate});
 }
 if(path[0]==='admin'){
  check(admin,'FORBIDDEN',403);
  if(path[1]==='accounts'&&path.length===2&&method==='GET'){
   const page=Number(url.searchParams.get('page')||1);
   check(Number.isSafeInteger(page)&&page>=1&&page<=10000);
   const rows=await db.select({id:users.id,name:users.name,email:users.email,demo:users.demo,suspended:accountAccess.suspended,employeeCode:employeeAssignments.code,employeeName:employeeAssignments.name,rate:employeeAssignments.rate,manager:employeeAssignments.manager,departmentId:accountDepartments.departmentId,departmentStatus:accountDepartments.status})
    .from(users).leftJoin(accountDepartments,eq(users.id,accountDepartments.userId)).leftJoin(employeeAssignments,eq(users.id,employeeAssignments.userId)).leftJoin(accountAccess,eq(users.id,accountAccess.userId))
    .leftJoin(removedAccounts,eq(users.id,removedAccounts.userId))
    .where(and(eq(users.demo,0),isNull(removedAccounts.userId))).orderBy(users.email).limit(26).offset((page-1)*25);
   const visible=rows.slice(0,25);
   const permissions=visible.length?await db.select().from(moduleApprovals).where(inArray(moduleApprovals.userId,visible.map(row=>row.id))):[];
   return ok({rows:visible.map(row=>({...publicUser(row),accountRole:accountRole(row)==='admin'?'admin':row.manager?'manager':'member',employeeCode:row.employeeCode,employeeName:row.employeeName,rate:row.rate,departmentId:row.departmentId,departmentStatus:row.departmentStatus,suspended:!!row.suspended,permissions:Object.fromEntries(
    permissions.filter(item=>item.userId===row.id).map(item=>[item.module,item.status]))})),hasMore:rows.length>25});
  }
  if(path[1]==='accounts'&&path.length===3&&(method==='PATCH'||method==='DELETE')){
   const [target]=await db.select({id:users.id,demo:users.demo}).from(users).where(eq(users.id,path[2])).limit(1);
   check(target&&!target.demo,'NOT_FOUND',404);
   check(accountRole(target)!=='admin','FORBIDDEN',403);
   const [targetEmployee]=await db.select().from(employeeAssignments).where(eq(employeeAssignments.userId,target.id));
   check(ownerAdmin||!targetEmployee?.manager,'FORBIDDEN',403);
   if('employeeCode' in body){
    check(ownerAdmin,'FORBIDDEN',403);
    const code=normalizeEmployeeCode(str(body.employeeCode,32)),name=str(body.employeeName,120);
    check(employeeCodePattern.test(code)&&Number.isSafeInteger(body.rate)&&body.rate>=0&&body.rate<=1e9&&typeof body.manager==='boolean');
    const departmentId=typeof body.departmentId==='string'?body.departmentId:'';
    check(!body.manager||departmentId,'DEPARTMENT_REQUIRED');
    if(departmentId){const [department]=await db.select().from(departments).where(and(eq(departments.id,departmentId),eq(departments.active,1)));check(department,'DEPARTMENT_REQUIRED')}
    const data={code,name,rate:body.rate,manager:body.manager?1:0};
    await db.transaction(async tx=>{
     const [existing]=await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,target.id)).for('update');
     const [duplicate]=await tx.select().from(employeeAssignments).where(eq(employeeAssignments.code,code));
     check(!duplicate||duplicate.userId===target.id,'EMPLOYEE_CODE_EXISTS',409);
     if(existing)await tx.update(employeeAssignments).set(data).where(eq(employeeAssignments.userId,target.id));
     else await tx.insert(employeeAssignments).values({userId:target.id,...data});
     if(departmentId)await tx.insert(accountDepartments).values({userId:target.id,departmentId,status:'approved'}).onDuplicateKeyUpdate({set:{departmentId,status:'approved'}});
     else await tx.delete(accountDepartments).where(eq(accountDepartments.userId,target.id));
    });
    return ok(null);
   }
   if('module' in body)check(ownerAdmin||body.module!=='links','FORBIDDEN',403);
   if(method==='DELETE'){
    await db.transaction(async tx=>{
     await tx.insert(removedAccounts).values({userId:target.id}).onDuplicateKeyUpdate({set:{userId:target.id}});
     await tx.delete(sessions).where(eq(sessions.userId,target.id));
     await tx.delete(moduleApprovals).where(eq(moduleApprovals.userId,target.id));
    });
    return ok(null);
   }
   check(!await removed(target.id),'NOT_FOUND',404);
   if('module' in body){
    check(isModule(body.module)&&(body.status==='approved'||body.status==='denied'));
    await db.insert(moduleApprovals).values({userId:target.id,module:body.module,status:body.status})
     .onDuplicateKeyUpdate({set:{status:body.status}});
    return ok(null);
   }
   check(typeof body.suspended==='boolean');
   const value=body.suspended?1:0;
   await db.transaction(async tx=>{
    await tx.insert(accountAccess).values({userId:target.id,suspended:value}).onDuplicateKeyUpdate({set:{suspended:value}});
    if(value)await tx.delete(sessions).where(eq(sessions.userId,target.id));
   });
   return ok({suspended:!!value});
  }
  throw new ApiError('NOT_FOUND',404);
 }
 if(path[0]==='my-payslips'&&path.length===1&&method==='POST'){
  await closeAttendanceMonths();
  check(!user.demo,'FORBIDDEN',403);
  const employeeCode=normalizeEmployeeCode(typeof body.employeeCode==='string'?body.employeeCode:'');
  const period=typeof body.period==='string'?body.period:'';
  check(employeeCodePattern.test(employeeCode)&&payPeriodPattern.test(period));
  const rows=await db.select({id:payrollEntries.id,scopeId:payrollEntries.scopeId,data:payrollEntries.data})
   .from(payrollEntries).where(and(
    like(payrollEntries.scopeId,'team:%'),
    sql`BINARY JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.recipientId')) = ${user.id}`,
    sql`JSON_UNQUOTE(JSON_EXTRACT(${payrollEntries.data}, '$.period')) <= ${period}`,
   ));
  check(assignment?.code===employeeCode||rows.some(row=>(row.data as any).employeeCode===employeeCode),'EMPLOYEE_MISMATCH',403);
  const currentDept=await employeeDepartment(user.id)||'';
  const ownRows=rows.map(row=>({...row.data as Record<string,any>,id:row.id,departmentId:(row.data as any).departmentId||currentDept}));
  const payments=await db.select().from(salaryPayments).where(and(eq(salaryPayments.recipientId,user.id),sql`${salaryPayments.period} <= ${period}`));
  const monthly=settlePayroll(ownRows,payments),combined=consolidateArrears(monthly,period);
  const slips=monthly.filter(row=>row.period===period).map(row=>combined.find(statement=>statement.departmentId===row.departmentId)||row);
  for(const statement of combined)if(!slips.some(row=>row.departmentId===statement.departmentId))slips.push(statement);
  const [template]=await db.select().from(printSettings).where(eq(printSettings.id,'payroll')).limit(1);
  return ok({slips,template:{...printDefaults,...template?.data as object}});
 }
 if(path[0]==='attendance'){
  check(!user.demo,'FORBIDDEN',403);
  const period=url.searchParams.get('period')||localDay().slice(0,7);
  check(payPeriodPattern.test(period));
  if(method==='GET'&&!path[1]){
   await purgeAttendancePhotos();
   await closeAttendanceMonths();
   const permitted=departmentManager?await departmentEmployeeIds():[user.id];
   const ids=permitted.length?permitted:[user.id];
   const rows=await db.select().from(attendanceEntries).where(ownerAdmin?undefined:inArray(attendanceEntries.userId,ids));
   const employees=await db.select().from(employeeAssignments).where(ownerAdmin?undefined:inArray(employeeAssignments.userId,ids));
   const pendingPhotos=rows.length?await db.select({entryId:attendancePhotos.entryId}).from(evidenceChangeRequests).innerJoin(attendancePhotos,eq(attendancePhotos.id,evidenceChangeRequests.photoId)).where(and(eq(evidenceChangeRequests.status,'pending'),gt(attendancePhotos.expiresAt,now()),inArray(attendancePhotos.entryId,rows.map(row=>row.id)))):[];
   return ok({photoChangeEntryIds:[...new Set(pendingPhotos.map(row=>row.entryId))],rows:rows.filter(row=>row.day.startsWith(period)),employees,currentUserId:user.id,admin:ownerAdmin||departmentManager,ownerAdmin,departmentName:currentDepartment?((await db.select().from(departments).where(eq(departments.id,currentDepartment.departmentId)))[0]?.name):null,activeShift:rows.find(row=>row.userId===user.id&&!row.end)||null});
  }
  if(path[1]==='preview'||path[1]==='sync'){
   check(ownerAdmin||departmentManager,'FORBIDDEN',403);check(method==='POST');
   return ok(await attendancePayroll(period,path[1]==='sync',false,ownerAdmin?undefined:currentDepartment.departmentId));
  }
  if(path[1]==='supplement'&&path.length===2&&method==='POST'){
   check(ownerAdmin||departmentManager,'FORBIDDEN',403);
   const userId=str(body.userId,36);check(await managesEmployee(userId),'FORBIDDEN',403);
   check(!await removed(userId),'NOT_FOUND',404);
   let data:ReturnType<typeof historicalAttendance>;
   try{data=historicalAttendance(body)}catch(error){throw new ApiError(error instanceof Error?error.message:'VALIDATION')}
   const id=uid(),updatedAt=now();
   await db.transaction(async tx=>{
    const [employee]=await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,userId)).for('update');check(employee,'EMPLOYEE_NOT_ASSIGNED',404);
    const [existing]=await tx.select({id:attendanceEntries.id}).from(attendanceEntries).where(and(eq(attendanceEntries.userId,userId),eq(attendanceEntries.day,data.day))).for('update');check(!existing,'ATTENDANCE_EXISTS',409);
    const intervals=await tx.select({start:attendanceEntries.start,end:attendanceEntries.end}).from(attendanceEntries).where(eq(attendanceEntries.userId,userId)).for('update');
    check(!overlapsAttendance(data.start,data.end,intervals),'ATTENDANCE_OVERLAP',409);
    await tx.insert(attendanceEntries).values({id,userId,...data,supplemented:1,updatedBy:user.id,updatedAt});
    await tx.insert(attendanceAudit).values({id:uid(),entryId:id,actorId:user.id,data:{action:'attendance-supplement',employeeId:userId,...data},createdAt:updatedAt});
   });
   return ok({id,...data},201);
  }
  if(path[1]==='clock'&&method==='POST'){
   check(ownerAdmin||currentDepartment?.active&&currentDepartment.status==='approved','DEPARTMENT_REQUIRED',403);
   check(assignment&&normalizeEmployeeCode(str(body.code,32))===assignment.code&&str(body.name,120).normalize('NFC')===assignment.name.normalize('NFC'),'EMPLOYEE_MISMATCH',403);
   check(body.action==='in'||body.action==='out');
   return db.transaction(async tx=>{
    await tx.select().from(employeeAssignments).where(eq(employeeAssignments.userId,user.id)).for('update');
    const rows=await tx.select().from(attendanceEntries).where(eq(attendanceEntries.userId,user.id)).for('update');
    const opened=rows.find(row=>!row.end),time=now();
    const breakMinutes=body.breakMinutes??opened?.breakMinutes??0;
    check(Number.isInteger(breakMinutes)&&breakMinutes>=0&&breakMinutes<=1440,'INVALID_BREAK');
    if(body.action==='in'){
     check(!opened&&!rows.some(row=>row.day===localDay()),'ALREADY_CLOCKED',409);
     await tx.insert(attendanceEntries).values({id:uid(),userId:user.id,day:localDay(),start:time,breakMinutes,reason:'',updatedBy:user.id,updatedAt:time});
    }else{
     check(opened,'NO_OPEN_SHIFT',409);try{shiftMinutes(opened.start,time)}catch{throw new ApiError('INVALID_SHIFT')}
     check(breakMinutes<=shiftMinutes(opened.start,time),'INVALID_BREAK');
     await tx.update(attendanceEntries).set({end:time,breakMinutes,updatedBy:user.id,updatedAt:time}).where(eq(attendanceEntries.id,opened.id));
    }
    return ok({id:opened?.id||(await tx.select({id:attendanceEntries.id}).from(attendanceEntries).where(and(eq(attendanceEntries.userId,user.id),eq(attendanceEntries.day,localDay()))))[0]?.id});
   });
  }
  if(path[1]&&path[2]==='photos'){
   await purgeAttendancePhotos();
   const [entry]=await db.select().from(attendanceEntries).where(eq(attendanceEntries.id,path[1]));check(entry,'NOT_FOUND',404);
   const owns=entry.userId===user.id;
   check(owns||await managesEmployee(entry.userId),'FORBIDDEN',403);
   if(method==='GET'&&path[3]){
    const [photo]=await db.select().from(attendancePhotos).where(and(eq(attendancePhotos.id,path[3]),eq(attendancePhotos.entryId,entry.id),gt(attendancePhotos.expiresAt,now())));check(photo,'NOT_FOUND',404);
    const bytes=Buffer.from(photo.data,'base64'),preview=evidencePreviewMime(bytes);
    return new Response(bytes,{headers:{'Content-Type':preview||'application/octet-stream','Content-Disposition':`${preview?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(photo.name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
   }
   if(method==='GET')return ok(await db.select({id:attendancePhotos.id,name:attendancePhotos.name,mime:attendancePhotos.mime,createdAt:attendancePhotos.createdAt,expiresAt:attendancePhotos.expiresAt,changeReason:evidenceChangeRequests.reason,changeStatus:evidenceChangeRequests.status,requestedAt:evidenceChangeRequests.requestedAt}).from(attendancePhotos).leftJoin(evidenceChangeRequests,eq(evidenceChangeRequests.photoId,attendancePhotos.id)).where(and(eq(attendancePhotos.entryId,entry.id),gt(attendancePhotos.expiresAt,now()))));
   if(method==='POST'&&path[3]&&path[4]==='request-change'){
    check(canRequestEvidenceChange(ownerAdmin,await managesEmployee(entry.userId),owns),'FORBIDDEN',403);
    const reason=str(body.reason,1000),requestedAt=now();
    await db.transaction(async tx=>{
     const [photo]=await tx.select().from(attendancePhotos).where(and(eq(attendancePhotos.id,path[3]),eq(attendancePhotos.entryId,entry.id),gt(attendancePhotos.expiresAt,now()))).for('update');check(photo,'NOT_FOUND',404);
     await tx.insert(evidenceChangeRequests).values({photoId:photo.id,reason,requestedBy:user.id,requestedAt,status:'pending'}).onDuplicateKeyUpdate({set:{reason,requestedBy:user.id,requestedAt,status:'pending',resolvedAt:null}});
     await tx.insert(attendanceAudit).values({id:uid(),entryId:entry.id,actorId:user.id,data:{action:'evidence-change-request',photoId:photo.id,reason},createdAt:requestedAt});
    });
    return ok(null);
   }
   if(method==='PATCH'&&path[3]&&!path[4]){
    const name=str(body.name,180).replace(/[\\/\r\n]/g,'_'),mime=typeof body.mime==='string'?body.mime.slice(0,120):'';
    check(imageFilenameAllowed(name,mime),'IMAGE_FORMAT');
    const data=str(body.data,MAX_EVIDENCE_BYTES*4/3+4);check(/^[A-Za-z0-9+/]+={0,2}$/.test(data),'IMAGE_FORMAT');
    const bytes=Buffer.from(data,'base64');check(bytes.length>0&&bytes.length<=MAX_EVIDENCE_BYTES,'IMAGE_TOO_LARGE');
    const createdAt=now(),expiresAt=evidenceExpiry(createdAt);
    return db.transaction(async tx=>{
     const [photo]=await tx.select().from(attendancePhotos).where(and(eq(attendancePhotos.id,path[3]),eq(attendancePhotos.entryId,entry.id),gt(attendancePhotos.expiresAt,now()))).for('update');check(photo,'NOT_FOUND',404);
     const [request]=await tx.select().from(evidenceChangeRequests).where(eq(evidenceChangeRequests.photoId,photo.id)).for('update');
     check(canReplaceEvidence(ownerAdmin,owns,request?.status==='pending'),'FORBIDDEN',403);
     await tx.update(attendancePhotos).set({name,mime:evidencePreviewMime(bytes)||'application/octet-stream',data,createdAt,expiresAt}).where(eq(attendancePhotos.id,photo.id));
     if(request)await tx.update(evidenceChangeRequests).set({status:'resolved',resolvedAt:createdAt}).where(eq(evidenceChangeRequests.photoId,photo.id));
     await tx.insert(attendanceAudit).values({id:uid(),entryId:entry.id,actorId:user.id,data:{action:'evidence-replaced',photoId:photo.id,previousName:photo.name,newName:name},createdAt});
     return ok({id:photo.id,name,createdAt,expiresAt},200);
    });
   }
   if(method==='POST'&&!path[3]){
    check(canUploadEvidence(ownerAdmin,owns,!entry.end||Date.now()-Date.parse(entry.end)<15*60000||!!entry.editable||!!entry.supplemented),'FORBIDDEN',403);
    const name=str(body.name,180).replace(/[\\/\r\n]/g,'_'),mime=typeof body.mime==='string'?body.mime.slice(0,120):'';
    check(imageFilenameAllowed(name,mime),'IMAGE_FORMAT');
    const data=str(body.data,MAX_EVIDENCE_BYTES*4/3+4);check(/^[A-Za-z0-9+/]+={0,2}$/.test(data),'IMAGE_FORMAT');
    const bytes=Buffer.from(data,'base64');check(bytes.length>0&&bytes.length<=MAX_EVIDENCE_BYTES,'IMAGE_TOO_LARGE');
    const id=uid(),createdAt=now(),expiresAt=evidenceExpiry(createdAt);
    await db.transaction(async tx=>{await tx.select({id:attendanceEntries.id}).from(attendanceEntries).where(eq(attendanceEntries.id,entry.id)).for('update');const existing=await tx.select({id:attendancePhotos.id}).from(attendancePhotos).where(eq(attendancePhotos.entryId,entry.id));check(existing.length<10,'PHOTO_LIMIT');await tx.insert(attendancePhotos).values({id,entryId:entry.id,name,mime:evidencePreviewMime(bytes)||'application/octet-stream',data,createdAt,expiresAt})});
    return ok({id,name,createdAt,expiresAt},201);
   }
   throw new ApiError('NOT_FOUND',404);
  }
  if(path[1]&&method==='PATCH')return db.transaction(async tx=>{
   const [row]=await tx.select().from(attendanceEntries).where(eq(attendanceEntries.id,path[1])).for('update');
   check(row,'NOT_FOUND',404);check(await managesEmployee(row.userId)||row.userId===user.id&&!!row.editable,'FORBIDDEN',403);
   if(typeof body.editable==='boolean'){
    check(await managesEmployee(row.userId),'FORBIDDEN',403);
    await tx.insert(attendanceAudit).values({id:uid(),entryId:row.id,actorId:user.id,data:{action:'edit-permission',editable:body.editable},createdAt:now()});
    await tx.update(attendanceEntries).set({editable:body.editable?1:0}).where(eq(attendanceEntries.id,row.id));
   }else{
    const start=str(body.start,32),end=str(body.end,32),reason=str(body.reason,1000);
    try{shiftMinutes(start,end)}catch{throw new ApiError('INVALID_SHIFT')}check(localDay(new Date(start))===row.day);
    const breakMinutes=body.breakMinutes??row.breakMinutes;
    try{netShiftMinutes(start,end,breakMinutes)}catch{throw new ApiError('INVALID_BREAK')}
    const data={start:new Date(start).toISOString(),end:new Date(end).toISOString(),breakMinutes,reason,editable:0,updatedBy:user.id,updatedAt:now()};
    await tx.insert(attendanceAudit).values({id:uid(),entryId:row.id,actorId:user.id,data:{before:row,after:data},createdAt:now()});
    await tx.update(attendanceEntries).set(data).where(eq(attendanceEntries.id,row.id));
   }
   return ok(null);
  });
  throw new ApiError('NOT_FOUND',404);
 }
 if(path[0]==='payroll'){
  const [,scope,entryId,...extra]=path;
  check(scope&&extra.length===0,'NOT_FOUND',404);
  check(!user.demo,'FORBIDDEN',403);
  check(await approved(scope==='me'?'payroll-personal':'payroll-team'),'APPROVAL_REQUIRED',403);
  if(scope!=='me'){check(ownerAdmin,'FORBIDDEN',403);const [team]=await db.select().from(teams).where(and(eq(teams.id,scope),eq(teams.deleted,0)));check(team,'NOT_FOUND',404)}
  const scopeId=scope==='me'?'user:'+user.id:'team:'+scope;
  const owned=eq(payrollEntries.scopeId,scopeId);
  if(method==='GET'&&!entryId){
   const rows=await db.select({id:payrollEntries.id,data:payrollEntries.data}).from(payrollEntries).where(owned);
   return ok(rows.map(row=>({...row.data as object,id:row.id})));
  }
  async function validatedPayroll(){
   const data=payrollData(body,scope!=='me');check(data);
   if(data.recipientId){
    const [recipient]=await db.select({id:members.id}).from(members).innerJoin(users,eq(users.id,members.userId))
     .where(and(eq(members.teamId,scope),eq(members.userId,data.recipientId),eq(users.demo,0))).limit(1);
    check(recipient&&!await removed(data.recipientId),'ASSIGNEE_NOT_MEMBER',400);
   }
   return {...data,departmentId:data.recipientId?await employeeDepartment(data.recipientId)||'':''};
  }
  if(method==='POST'&&!entryId){
   const data=await validatedPayroll();
   const id=uid();
   await db.insert(payrollEntries).values({id,scopeId,data});
   return ok({...data,id},201);
  }
  if(entryId&&(method==='PATCH'||method==='DELETE')){
   const where=and(owned,eq(payrollEntries.id,entryId));
   if(method==='DELETE'){
    const [result]=await db.delete(payrollEntries).where(where);
    check(result.affectedRows,'NOT_FOUND',404);return ok(null);
   }
   const data=await validatedPayroll();
   const [result]=await db.update(payrollEntries).set({data}).where(where);
   check(result.affectedRows,'NOT_FOUND',404);return ok({...data,id:entryId});
  }
  throw new ApiError('NOT_FOUND',404);
 }
 if(path[0]==='personal'){
  const [,kind,entryId,...extra]=path;
  check((kind==='links'||kind==='tasks')&&extra.length===0,'NOT_FOUND',404);
  if(kind==='links')check(await approved('links'),'APPROVAL_REQUIRED',403);
  const owned=and(eq(personalEntries.userId,user.id),eq(personalEntries.kind,kind));
  if(method==='GET'&&!entryId){
   const day=url.searchParams.get('date')||'';
   if(kind==='tasks')check(validDay(day));
   const where=kind==='tasks'?and(owned,sql`JSON_UNQUOTE(JSON_EXTRACT(${personalEntries.data}, '$.date')) = ${day}`):
    and(owned,url.searchParams.get('hidden')==='1'?
     sql`JSON_UNQUOTE(JSON_EXTRACT(${personalEntries.data}, '$.hidden')) = 'true'`:
     sql`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${personalEntries.data}, '$.hidden')), 'false') <> 'true'`);
   const rows=await db.select({id:personalEntries.id,data:personalEntries.data}).from(personalEntries).where(where);
   return ok(rows.map(row=>({...row.data as object,id:row.id})));
  }
  if(method==='POST'&&!entryId){
   const data=personalData(kind,body);check(data);
   const id=uid();await db.insert(personalEntries).values({id,userId:user.id,kind,data});
   return ok({...data,id},201);
  }
  if(entryId&&(method==='PATCH'||method==='DELETE')){
   check(/^[0-9a-f-]{36}$/.test(entryId),'NOT_FOUND',404);
   const target=and(owned,eq(personalEntries.id,entryId));
   if(method==='DELETE'){
    const [result]=await db.delete(personalEntries).where(target);
    check(result.affectedRows,'NOT_FOUND',404);
    return ok(null);
   }
   if(kind==='links'&&'hidden' in body){
    check(typeof body.hidden==='boolean'&&Object.keys(body).length===1);
    const [result]=await db.update(personalEntries).set({
     data:sql`JSON_SET(${personalEntries.data}, '$.hidden', CAST(${JSON.stringify(body.hidden)} AS JSON))`,
    }).where(target);
    check(result.affectedRows||(await db.select({id:personalEntries.id}).from(personalEntries).where(target).limit(1)).length,'NOT_FOUND',404);
    return ok(null);
   }
   const data=personalData(kind,body);check(data);
   const [result]=await db.update(personalEntries).set({data:kind==='links'?
    sql`JSON_SET(CAST(${JSON.stringify(data)} AS JSON), '$.hidden', COALESCE(JSON_EXTRACT(${personalEntries.data}, '$.hidden'), CAST('false' AS JSON)))`:data}).where(target);
   check(result.affectedRows,'NOT_FOUND',404);
   return ok({...data,id:entryId});
  }
  throw new ApiError('NOT_FOUND',404);
 }

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
  if(path[1]==='status'&&method==='GET')return ok({configured,dailyLimit,provider:aiConfig.provider});
  if(path[1]==='assist'&&method==='POST'){
   if(!configured)throw new AIError('AI_NOT_CONFIGURED',503);
   const input=validateAIInput(body);
   if(body.taskId){check(typeof body.taskId==='string');await taskAccess(body.taskId)}
   await reserveAIRequest();
   return ok(await generateAI(input,aiConfig));
  }
 }
 if(path[0]==='teams'){
  if(path.length===1&&method==='GET'){const list=await db.select({id:teams.id,name:teams.name,description:teams.description,website:teams.website,ownerId:teams.ownerId,leaderId:teams.leaderId,invite:teams.invite}).from(teams).innerJoin(members,eq(teams.id,members.teamId)).where(and(eq(members.userId,user.id),eq(teams.deleted,0)));return ok(list)}
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
  if(path[2]==='website'&&path.length===3&&method==='PATCH'){
   check(canEditTeamWebsite(user.id,t,ownerAdmin),'FORBIDDEN',403);
   let website:string;try{website=teamWebsite(body.website)}catch{throw new ApiError('WEBSITE_INVALID')}
   await db.update(teams).set({website}).where(and(eq(teams.id,t.id),eq(teams.deleted,0)));return ok({website});
  }
  if(path[2]==='ranking'&&path.length===3&&method==='GET'){
   const [people,completions]=await Promise.all([db.select({id:users.id,name:users.name,avatar:profiles.avatar}).from(members).innerJoin(users,eq(members.userId,users.id)).leftJoin(profiles,eq(profiles.userId,users.id)).where(eq(members.teamId,t.id)),db.select({recipients:taskCompletions.recipients}).from(taskCompletions).where(eq(taskCompletions.teamId,t.id))]);
   return ok({pointsPerTask:POINTS_PER_TASK,rows:rankTeam(people,completions)})
  }
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
   check(Object.keys(update).length||rosterChanged);if(taskChanged(current,update))update.version=current.version+1;if(Object.keys(update).length)await tx.update(tasks).set(update).where(eq(tasks.id,task.id));
   // The parent-task lock serializes completion with roster edits. One immutable
   // snapshot per task prevents retries, reopening and later additions earning twice.
   if(update.status==='done')await tx.insert(taskCompletions).values({taskId:task.id,teamId:team.id,recipients:JSON.stringify(completionRecipients(primary,desired)),completedAt:now()}).onDuplicateKeyUpdate({set:{taskId:sql`${taskCompletions.taskId}`}});
   return {id:task.id};
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
async function safe(req:Request){try{return await handle(req)}catch(e){if(e instanceof TeamworkError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof PracticeError)return Response.json({error:{code:e.code,detail:e.detail}},{status:400});if(e instanceof PhraseError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof ProfileError)return Response.json({error:{code:e.code}},{status:400});if(e instanceof AIError)return Response.json({error:{code:e.code}},{status:e.status});if(e instanceof ApiError)return Response.json({error:{code:e.code}},{status:e.status});console.error('BridgeMate API error',e instanceof Error?e.name:'unknown');let cause:unknown=e;for(let depth=0;depth<4&&cause&&typeof cause==='object';depth++){const detail=cause as {code?:unknown;sqlState?:unknown;cause?:unknown;message?:unknown};if(detail.code==='HANDSHAKE_SSL_ERROR'){const text=typeof detail.message==='string'?detail.message.toLowerCase():'';const reason=text.includes('self-signed')||text.includes('self signed')?'SELF_SIGNED_CERTIFICATE':text.includes('does not support secure')?'SERVER_TLS_UNSUPPORTED':text.includes('expired')?'CERTIFICATE_EXPIRED':text.includes('unable to verify')||text.includes('unable to get local issuer')?'UNTRUSTED_CERTIFICATE_CHAIN':text.includes('hostname')||text.includes('altnames')?'CERTIFICATE_HOSTNAME_MISMATCH':'TLS_NEGOTIATION_FAILED';console.error('BridgeMate TLS diagnosis',{reason});}if(typeof detail.code==='string')console.error('BridgeMate dependency error',{code:detail.code,sqlState:typeof detail.sqlState==='string'?detail.sqlState:undefined});cause=detail.cause;}return Response.json({error:{code:'SERVER_ERROR'}},{status:500})}}
export const GET=safe;export const POST=safe;export const PATCH=safe;export const DELETE=safe;
