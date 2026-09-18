const { createRequire } = require('node:module');
const repo = '/Users/user/Luie';
const req = createRequire(`${repo}/package.json`);
const esbuild = createRequire(req.resolve('vite'))('esbuild');
const Database = req('better-sqlite3');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const tmp = fs.mkdtempSync('/private/tmp/luie-package-cost-');
let active = null;
const rounded = x => +x.toFixed(3);
const newCounters = () => ({sqliteOpens:0,sqliteCloses:0,sqlitePrepareCount:0,sqliteRunCount:0,entryUpserts:0,entryContentUtf8Bytes:0,explicitTransactions:0,sqliteRunMs:0,sqliteTransactionMs:0,sqliteSetupMs:0,jsonStringifyCalls:0,jsonStringifyMs:0,jsonStringifyUtf8Bytes:0,jsonParseCalls:0,jsonParseMs:0,fs:{},fsBytesRead:0,fsMs:0,heapBefore:process.memoryUsage().heapUsed,heapAfterSerializationSample:0});
const nativeStringify = JSON.stringify;
const nativeParse = JSON.parse;
JSON.stringify = function(...args) {const t=performance.now();const value=nativeStringify.apply(this,args);if(active){active.jsonStringifyCalls++;active.jsonStringifyMs+=performance.now()-t;active.jsonStringifyUtf8Bytes+=typeof value==='string'?Buffer.byteLength(value):0;}return value;};
JSON.parse = function(...args) {const t=performance.now();const value=nativeParse.apply(this,args);if(active){active.jsonParseCalls++;active.jsonParseMs+=performance.now()-t;}return value;};
global.__auditFsp = new Proxy(fsp,{get(target,key){const original=target[key];if(typeof original!=='function')return original;return async(...args)=>{const c=active,t=performance.now();if(c)c.fs[key]=(c.fs[key]||0)+1;const value=await original.apply(target,args);if(c)c.fsMs+=performance.now()-t;if(key==='open'&&c){const handle=value;const originalRead=handle.read.bind(handle);handle.read=async(...readArgs)=>{const out=await originalRead(...readArgs);c.fsBytesRead+=out.bytesRead;return out;};}return value;};}});
global.__auditDatabase=function(...args){const c=active,t=performance.now();const d=new Database(...args);if(c){c.sqliteOpens++;c.sqliteSetupMs+=performance.now()-t;}
 const originalPrepare=d.prepare.bind(d);d.prepare=sql=>{if(active)active.sqlitePrepareCount++;const stmt=originalPrepare(sql);const originalRun=stmt.run.bind(stmt);stmt.run=(...params)=>{const m=active,t=performance.now();const out=originalRun(...params);if(m){m.sqliteRunCount++;m.sqliteRunMs+=performance.now()-t;if(/INSERT INTO "LuieContainerEntry"/i.test(sql)){m.entryUpserts++;m.entryContentUtf8Bytes+=Buffer.byteLength(String(params[1]??''));}}return out;};return stmt;};
 const originalTransaction=d.transaction.bind(d);d.transaction=fn=>{const native=originalTransaction(fn);return (...params)=>{const m=active;if(m){m.explicitTransactions++;m.heapAfterSerializationSample=process.memoryUsage().heapUsed;}const t=performance.now();const out=native(...params);if(m)m.sqliteTransactionMs+=performance.now()-t;return out;};};
 for(const key of ['pragma','exec']){const original=d[key].bind(d);d[key]=(...params)=>{const t=performance.now();const out=original(...params);if(active)active.sqliteSetupMs+=performance.now()-t;return out;};}
 const originalClose=d.close.bind(d);d.close=()=>{const out=originalClose();if(active)active.sqliteCloses++;return out;};return d;
};
const plugins=[{name:'instrument-only',setup(b){b.onResolve({filter:/^better-sqlite3$/},()=>({path:'sqlite',namespace:'audit'}));b.onResolve({filter:/^(node:)?fs\/promises$/},()=>({path:'fsp',namespace:'audit'}));b.onLoad({filter:/.*/,namespace:'audit'},a=>({contents:a.path==='sqlite'?'module.exports=globalThis.__auditDatabase;':'module.exports=globalThis.__auditFsp;',loader:'js',resolveDir:repo}));}}];
const logger={info(){},warn(){},debug(){},error(){}};
function payload(chapters,snapshots=20){const body=('A narrative paragraph about Luie. '.repeat(2100)).slice(0,65536);return {meta:{projectId:'audit-project',title:'Synthetic package audit',createdAt:'2026-09-08T00:00:00.000Z',updatedAt:'2026-09-08T00:00:00.000Z',chapters:Array.from({length:chapters},(_,i)=>({id:`c${i}`,title:`Chapter ${i}`,order:i,file:`manuscript/c${i}.md`}))},chapters:Array.from({length:chapters},(_,i)=>({id:`c${i}`,content:body.slice(0,-6)+String(i).padStart(6,'0')})),characters:[],terms:[],snapshots:Array.from({length:snapshots},(_,i)=>({id:`s${i}`,chapterId:'c0',content:body,description:'snapshot',createdAt:'2026-09-08T00:00:00.000Z'}))};}
function filePagesDiff(a,b,pageSize=4096){let pages=0;for(let pos=0;pos<Math.max(a.length,b.length);pos+=pageSize){if(!a.subarray(pos,pos+pageSize).equals(b.subarray(pos,pos+pageSize)))pages++;}return pages;}
async function runMeasured(method,p,targetPath,iteration,api){const before=fs.readFileSync(targetPath);const beforeStat=fs.statSync(targetPath);const content=p.chapters[0].content.slice(0,-1)+String(iteration%10);p.chapters[0].content=content;
 active=newCounters();const t=performance.now();
 if(method==='full-current'){await api.writeLuieContainer({targetPath,payload:p,logger});}
 else {await api.writeLuieContainerEntry({targetPath,entryPath:'manuscript/c0.md',content,logger});}
 const elapsed=performance.now()-t;const counters=active;active=null;
 const after=fs.readFileSync(targetPath),afterStat=fs.statSync(targetPath);const d=new Database(targetPath,{readonly:true});assert.equal(d.prepare('SELECT content FROM LuieContainerEntry WHERE path=?').get('manuscript/c0.md').content,content);const rows=d.prepare('SELECT count(*) AS n FROM LuieContainerEntry').get().n;const journalMode=d.pragma('journal_mode',{simple:true});d.close();
 for(const k of Object.keys(counters))if(k.endsWith('Ms'))counters[k]=rounded(counters[k]);
 return {method,iteration,wallMs:rounded(elapsed),fileBytes:after.length,fileSizeGrowth:after.length-before.length,fileInodeChanged:beforeStat.ino!==afterStat.ino,pagesWithDifferentFinalBytes:filePagesDiff(before,after),finalEntryRows:rows,journalMode,...counters};}
(async()=>{try{
 await esbuild.build({entryPoints:[`${repo}/src/main/services/io/luieContainer.ts`],outfile:`${tmp}/writer.cjs`,bundle:true,platform:'node',format:'cjs',packages:'external',plugins,logLevel:'silent'});
 const api=require(`${tmp}/writer.cjs`);const all=[];
 for(const count of [50,250,1000]){const p=payload(count);const targetPath=`${tmp}/package-${count}.luie`;await api.writeLuieContainer({targetPath,payload:p,logger});const runs=[];for(let i=0;i<3;i++)runs.push(await runMeasured('full-current',p,targetPath,i+1,api));for(let i=0;i<3;i++)runs.push(await runMeasured('entry-current',p,targetPath,i+4,api));const d=new Database(targetPath,{readonly:true});const index=d.prepare('SELECT content FROM LuieContainerEntry WHERE path=?').get('snapshots/index.json').content;const snap=d.prepare('SELECT content FROM LuieContainerEntry WHERE path=?').get('snapshots/s0.snap').content;assert.equal(JSON.parse(index).snapshots[0].content,JSON.parse(snap).content);d.close();all.push({chapters:count,chapterUtf8Bytes:65536,snapshots:20,snapshotUtf8Bytes:65536,snapshotContentDuplicated:true,runs});}
 const med=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const summaries=all.map(x=>({chapters:x.chapters,fileBytes:x.runs[0].fileBytes,...Object.fromEntries(['full-current','entry-current'].map(method=>{const rs=x.runs.filter(r=>r.method===method);return [method,{medianWallMs:med(rs.map(r=>r.wallMs)),entryUpserts:rs[0].entryUpserts,entryContentUtf8Bytes:rs[0].entryContentUtf8Bytes,medianSqliteRunMs:med(rs.map(r=>r.sqliteRunMs)),medianSqliteTransactionMs:med(rs.map(r=>r.sqliteTransactionMs)),medianJsonStringifyMs:med(rs.map(r=>r.jsonStringifyMs)),jsonStringifyUtf8Bytes:rs[0].jsonStringifyUtf8Bytes,explicitTransactions:rs[0].explicitTransactions,fileInodeChanged:rs[0].fileInodeChanged,pagesWithDifferentFinalBytes:rs[0].pagesWithDifferentFinalBytes,fs:rs[0].fs}];}))}));
 const report={runtime:{node:process.version,platform:process.platform,arch:process.arch},scope:'actual writeLuieContainer/writeLuieContainerEntry source; synthetic payload already materialized; function-level wrappers add instrumentation; no app/main-DB collection measured; logical content bytes and final page differences are not kernel physical write bytes/fsync counts',summaries,all};
 fs.writeFileSync('/private/tmp/luie-package-cost-results.json',nativeStringify(report,null,2));console.log(nativeStringify(summaries,null,2));
}finally{JSON.stringify=nativeStringify;JSON.parse=nativeParse;fs.rmSync(tmp,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
