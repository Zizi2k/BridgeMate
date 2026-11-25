export function shouldQueueRecovery(previous:{status:string;requestedAt:string}|undefined,time=Date.now()){
 return !previous||(previous.status!=='pending'&&time-Date.parse(previous.requestedAt)>=3600000);
}
export function validReplacementPassword(current:string,next:string){return next.length>=8&&next.length<=128&&next!==current}
