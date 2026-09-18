const {createRequire}=require('node:module');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const repo='/Users/user/Luie';
const req=createRequire(`${repo}/package.json`);
const esbuild=createRequire(req.resolve('vite'))('esbuild');
const Database=req('better-sqlite3');
const tmp=fs.mkdtempSync('/private/tmp/luie-package-atomicity-');
const logger={info(){},warn(){},debug(){},error(){}};
const payload={meta:{projectId:'atomicity-audit',title:'Synthetic',createdAt:'2020-01-01T00:00:00.000Z',updatedAt:'2020-01-01T00:00:00.000Z',chapters:[{id:'c0',title:'Chapter',order:0,file:'manuscript/c0.md'}]},chapters:[{id:'c0',content:'before'}],characters:[],terms:[],snapshots:[]};
function inspect(path){const d=new Database(path,{readonly:true});try{return {body:d.prepare('SELECT content FROM LuieContainerEntry WHERE path=?').get('manuscript/c0.md').content,meta:JSON.parse(d.prepare('SELECT content FROM LuieContainerEntry WHERE path=?').get('meta.json').content),infoUpdatedAt:d.prepare('SELECT updatedAt FROM LuieContainerInfo WHERE id=1').get().updatedAt};}finally{d.close();}}
(async()=>{try{
 await esbuild.build({entryPoints:[`${repo}/src/main/services/io/luieContainer.ts`],outfile:`${tmp}/writer.cjs`,bundle:true,platform:'node',format:'cjs',packages:'external',logLevel:'silent'});
 const api=require(`${tmp}/writer.cjs`);const cases=[];
 for(const stage of ['metadata','container-info']){
  const targetPath=`${tmp}/${stage}.luie`;await api.writeLuieContainer({targetPath,payload,logger});
  const before=inspect(targetPath);const d=new Database(targetPath);
  if(stage==='metadata')d.exec(`CREATE TRIGGER audit_fail_meta BEFORE UPDATE ON LuieContainerEntry WHEN NEW.path='meta.json' BEGIN SELECT RAISE(ABORT,'injected metadata failure'); END;`);
  else d.exec(`CREATE TRIGGER audit_fail_info BEFORE UPDATE ON LuieContainerInfo BEGIN SELECT RAISE(ABORT,'injected container info failure'); END;`);
  d.close();let error=null;try{await api.writeLuieContainerEntry({targetPath,entryPath:'manuscript/c0.md',content:'after',logger});}catch(e){error=e.message;}
  const after=inspect(targetPath);assert(error);assert.equal(after.body,'after');
  if(stage==='metadata')assert.equal(after.meta.updatedAt,before.meta.updatedAt);else assert.notEqual(after.meta.updatedAt,before.meta.updatedAt);
  assert.equal(after.infoUpdatedAt,before.infoUpdatedAt);
  cases.push({stage,error,bodyCommittedDespiteRejectedPromise:after.body==='after',metaChanged:after.meta.updatedAt!==before.meta.updatedAt,infoChanged:after.infoUpdatedAt!==before.infoUpdatedAt,before,after});
 }
 const out={runtime:{node:process.version,platform:process.platform,arch:process.arch},scope:'actual current writeLuieContainerEntry source; synthetic temp package; SQLite triggers simulate failure of later statements, not actual power-loss or disk-full',cases};
 fs.writeFileSync('/private/tmp/luie-package-atomicity-results.json',JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));
}finally{fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
