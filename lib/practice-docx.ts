import {parseQuestionLines} from './practice.ts';
import {docxText,readDocxTree,type DocxNode} from './read-docx.ts';

export async function readPracticeDocx(buffer:Buffer){
 const tree=await readDocxTree(buffer);
 const lines:string[]=[];
 function visit(nodes:DocxNode[]){
  for(const node of nodes)for(const [kind,children] of Object.entries(node)){
   if(!Array.isArray(children)||kind==='del')continue;
   if(kind==='p')lines.push(...docxText(children).split('\n'));
   else visit(children);
  }
 }
 visit(tree);
 return parseQuestionLines(lines);
}
