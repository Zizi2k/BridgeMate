export function accountRole(user:{id:string;demo:number}, adminIds=process.env.BRIDGEMATE_ADMIN_IDS||''){
 if(user.demo)return 'demo';
 return adminIds.split(',').some(id=>id.trim()===user.id)?'admin':'member';
}
