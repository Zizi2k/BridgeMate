import type {PoolOptions} from 'mysql2/promise';
export function mysqlConfig(environment:Record<string,string|undefined>=process.env):PoolOptions{
 const host=environment.MYSQL_HOST,user=environment.MYSQL_USER,database=environment.MYSQL_DATABASE;
 if(!host||!user||!database)throw new Error('Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD and MYSQL_DATABASE. See README.md.');
 const port=Number(environment.MYSQL_PORT||3306);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('MYSQL_PORT is invalid.');
 const secure=environment.MYSQL_SSL!=='false';
 return {host,port,user,password:environment.MYSQL_PASSWORD||'',database,charset:'utf8mb4',timezone:'Z',connectionLimit:3,maxIdle:1,idleTimeout:10000,waitForConnections:true,queueLimit:20,connectTimeout:10000,...(secure?{ssl:{rejectUnauthorized:true,...(environment.MYSQL_SSL_CA?{ca:environment.MYSQL_SSL_CA.replace(/\\n/g,'\n')}:{})}}:{})};
}
