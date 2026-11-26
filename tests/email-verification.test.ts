import test from 'node:test';
import assert from 'node:assert/strict';
import {verificationToken,tokenDigest,validVerificationToken,verificationThrottle,VERIFICATION_TTL,verificationMailConfigured,sendVerificationEmail} from '../lib/email-verification.ts';
test('verification tokens are unpredictable, hashed, bounded and never accepted as short codes',()=>{
 const first=verificationToken(),second=verificationToken();assert.notEqual(first.token,second.token);assert.equal(first.token.length,64);assert.notEqual(first.digest,first.token);assert.equal(tokenDigest(first.token),first.digest);assert.equal(validVerificationToken(first.token),true);
 for(const value of ['123456','',null,{},'x'.repeat(64),first.token+' '])assert.equal(validVerificationToken(value),false);assert.equal(VERIFICATION_TTL,600000);
});
test('resend cooldown and hourly mail limit include their boundary',()=>{
 const previous={sentAt:1000000,windowStart:1000000,sends:5};assert.equal(verificationThrottle(previous,1059999),'VERIFICATION_COOLDOWN');assert.equal(verificationThrottle(previous,1060000),'VERIFICATION_LIMIT');assert.equal(verificationThrottle(previous,4600000),null);assert.equal(verificationThrottle({...previous,sends:1},1060000),null);
});
test('mail requires configured verified sender and never claims success for a rejected provider',async()=>{
 const old={key:process.env.RESEND_API_KEY,from:process.env.AUTH_MAIL_FROM,attendance:process.env.ATTENDANCE_MAIL_FROM,origin:process.env.APP_ORIGIN,fetch:globalThis.fetch};
 try{
 delete process.env.RESEND_API_KEY;delete process.env.AUTH_MAIL_FROM;delete process.env.ATTENDANCE_MAIL_FROM;assert.equal(verificationMailConfigured(),false);
 process.env.RESEND_API_KEY='test-placeholder';process.env.AUTH_MAIL_FROM='BridgeMate <test@example.test>';process.env.APP_ORIGIN='https://bridge-mate.vercel.app/';assert.equal(verificationMailConfigured(),true);
 const {token}=verificationToken();let payload:any;
 globalThis.fetch=async(_input,init)=>{payload=JSON.parse(String(init?.body));return Response.json({id:'test'})};
 await sendVerificationEmail('owner@example.test',token,'test-id');assert.deepEqual(payload.to,['owner@example.test']);assert.ok(payload.text.includes('https://bridge-mate.vercel.app/?verifyEmail='+token));assert.ok(payload.text.includes('10 phút'));assert.equal(payload.from,process.env.AUTH_MAIL_FROM);
 globalThis.fetch=async()=>new Response('',{status:403});await assert.rejects(sendVerificationEmail('owner@example.test',token,'test-id'),/VERIFICATION_SEND_FAILED/);
 }finally{globalThis.fetch=old.fetch;for(const [key,value] of Object.entries({RESEND_API_KEY:old.key,AUTH_MAIL_FROM:old.from,ATTENDANCE_MAIL_FROM:old.attendance,APP_ORIGIN:old.origin}))if(value===undefined)delete process.env[key];else process.env[key]=value}
});
