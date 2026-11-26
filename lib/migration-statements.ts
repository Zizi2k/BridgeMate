// Explicit Drizzle breakpoints preserve existing migration resume indexes.
// Plain SQL files may also contain multiple statements; never split quoted text.
export function migrationStatements(source:string){
 if(source.includes('--> statement-breakpoint'))return source.split('--> statement-breakpoint').map(value=>value.trim()).filter(Boolean);
 const result:string[]=[];let start=0,quote='',line=false,block=false;
 for(let i=0;i<source.length;i++){
  const char=source[i],next=source[i+1];
  if(line){if(char==='\n')line=false;continue}
  if(block){if(char==='*'&&next==='/'){block=false;i++}continue}
  if(quote){if(char==='\\'){i++;continue}if(char===quote){if(next===quote)i++;else quote=''}continue}
  if(char==='\''||char==='"'||char==='`'){quote=char;continue}
  if(char==='#'||char==='-'&&next==='-'&&/\s/.test(source[i+2]||'')){line=true;continue}
  if(char==='/'&&next==='*'){block=true;i++;continue}
  if(char===';'){const statement=source.slice(start,i).trim();if(statement)result.push(statement);start=i+1}
 }
 const last=source.slice(start).trim();if(last&&!/^(?:--[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|\s)*$/.test(last))result.push(last);
 return result;
}
