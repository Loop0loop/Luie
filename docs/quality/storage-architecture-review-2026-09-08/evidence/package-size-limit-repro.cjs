const {createRequire}=require('node:module');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const repo='/Users/user/Luie';
const req=createRequire(`${repo}/package.json`);
const esbuild=createRequire(req.resolve('vite'))('esbuild');
const Database=req('better-sqlite3');
const tmp=fs.mkdtempSync('/private/tmp/luie-package-size-limit-');
const logger={info(){},warn(){},debug(){},error(){}};
const content='x'.repeat(5*1024*1024+1);
const payload=body=>({meta:{projectId:'size-audit',title:'Synthetic',chapters:[{id:'c0',title:'Chapter',order:0,file:'manuscript/c0.md'}]},chapters:[{id:'c0',content:body}],characters:[],terms:[],snapshots:[]});
(async()=>{try{
 await esbuild.build({entryPoints:[`${repo}/src/main/services/io/luieContainer.ts`],outfile:`${tmp}/writer.cjs`,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent'});
 const api=require(`${tmp}/writer.cjs`);const cases=[];
 for(const mode of ['full','entry']){
  const targetPath=`${tmp}/${mode}.luie`;
  if(mode==='full')await api.writeLuieContainer({targetPath,payload:payload(content),logger});
  else {await api.writeLuieContainer({targetPath,payload:payload('small'),logger});await api.writeLuieContainerEntry({targetPath,entryPath:'manuscript/c0.md',content,logger});}
  const d=new Database(targetPath,{readonly:true});const storedBytes=d.prepare('SELECT length(CAST(content AS BLOB)) AS n FROM LuieContainerEntry WHERE path=?').get('manuscript/c0.md').n;d.close();
  let error=null;try{await api.readLuieContainerEntry(targetPath,'manuscript/c0.md',logger);}catch(e){error={message:e.message,code:e.code,details:e.details};}
  assert.equal(storedBytes,content.length);assert(error);assert.equal(error.message,'SQLite-backed .luie entry is too large');
  cases.push({mode,writerResolved:true,entryBytes:storedBytes,packageBytes:fs.statSync(targetPath).size,readerRejected:error});
 }
 const out={runtime:{node:process.version,platform:process.platform,arch:process.arch},scope:'actual current full and entry writer, actual readLuieContainerEntry; 5MiB+1 synthetic ASCII chapter; native files only in temp',cases};fs.writeFileSync('/private/tmp/luie-package-size-limit-results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
