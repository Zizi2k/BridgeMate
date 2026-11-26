// Loaded only by the isolated MySQL integration runner, never by production.
import {appendFileSync} from 'node:fs';
if(!process.env.BRIDGEMATE_TEST_MAILBOX||!process.env.MYSQL_DATABASE?.startsWith('bridgemate_test_'))throw Error('Isolated test database and mailbox are required');
const original=globalThis.fetch;
globalThis.fetch=async(input,init)=>{
 if(String(input)==='https://api.resend.com/emails'){
  const message=JSON.parse(String(init?.body));appendFileSync(process.env.BRIDGEMATE_TEST_MAILBOX,JSON.stringify(message)+'\n');return Response.json({id:crypto.randomUUID()});
 }
 return original(input,init);
};
