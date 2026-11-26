import test from 'node:test';
import assert from 'node:assert/strict';
import {feedbackForResponse,actionFetch} from '../lib/action-feedback.ts';
test('mutation feedback follows the result, not merely the click',()=>{
 assert.equal(feedbackForResponse('/api/work-schedules/capacity','PATCH',true,200,{data:{saved:true}})?.kind,'success');
 assert.equal(feedbackForResponse('/api/work-schedules/capacity','PATCH',false,409,{error:{code:'CAPACITY_BELOW_REGISTERED'}})?.kind,'error');
 assert.equal(feedbackForResponse('/api/salary-payments','POST',false,500,{error:{code:'SERVER_ERROR'}})?.kind,'error');
 assert.equal(feedbackForResponse('/api/salary-payments','POST',true,200,null)?.kind,'error');
 assert.equal(feedbackForResponse('/api/attendance-import','POST',true,200,{data:{errors:2}})?.kind,'error');
});
test('background reads and mark-as-read do not produce success popups',()=>{
 assert.equal(feedbackForResponse('/api/work-schedules','GET',true,200,{data:{}}),null);
 assert.equal(feedbackForResponse('/api/attendance-notifications/read','POST',true,200,{data:{}}),null);
 assert.equal(feedbackForResponse('/api/auth/login','POST',true,200,{data:{id:'example'}}),null);
 assert.equal(feedbackForResponse('/api/attendance-report?format=pdf','GET',true,200,null)?.kind,'success');
});
test('fetch feedback preserves the response body and original mutation request',async()=>{
 const original=globalThis.fetch;let called=false;
 try{globalThis.fetch=async(input,init)=>{called=true;assert.equal(input,'/api/work-schedules/capacity');assert.equal(init?.method,'PATCH');assert.equal(init?.body,'{}');return Response.json({data:{saved:true}})};
 const response=await actionFetch('/api/work-schedules/capacity',{method:'PATCH',body:'{}'});
 assert.equal(called,true);assert.deepEqual(await response.json(),{data:{saved:true}});
 }finally{globalThis.fetch=original}
});
test('network failures are propagated and never reported as success',async()=>{
 const original=globalThis.fetch;const failure=Error('network unavailable');
 try{globalThis.fetch=async()=>{throw failure};await assert.rejects(()=>actionFetch('/api/attendance/clock',{method:'POST'}),error=>error===failure)}finally{globalThis.fetch=original}
});
