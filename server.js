const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'public');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.zip':'application/zip'};
function createServer({ideaLibrary}={}){
 const endpoints=new Map([['/api/health',JSON.stringify({
  status:'ok',ideaBackend:ideaLibrary?'sqlite':'static',ideaScenes:ideaLibrary?.scenes.length??null
 })]]);
 if(ideaLibrary)endpoints.set('/api/idea-scenes',JSON.stringify(ideaLibrary));
 return http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400).end();return}
 if(pathname.includes('\\')||pathname.includes('\0')){res.writeHead(400).end();return}
 if(endpoints.has(pathname)){
  const body=endpoints.get(pathname);
  res.writeHead(200,{'Content-Type':TYPES['.json'],'Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);return;
 }
 const file=path.resolve(ROOT,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404).end();return}
  const size=stat.size,headers={'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':/\.(html|js|css|json)$/.test(file)?'no-cache':'public, max-age=86400','X-Content-Type-Options':'nosniff'};
  let start=0,end=size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let valid=!!match&&(match[1]||match[2]);
   if(valid){if(!match[1]){const suffix=Number(match[2]);valid=Number.isSafeInteger(suffix)&&suffix>0;start=Math.max(0,size-suffix)}else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;valid=Number.isSafeInteger(start)&&Number.isSafeInteger(end)&&start>=0&&start<=end&&start<size}}
   if(!valid||size===0){res.writeHead(416,{...headers,'Content-Range':`bytes */${size}`}).end();return}
   status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
  }
  headers['Content-Length']=size?end-start+1:0;res.writeHead(status,headers);
  if(req.method==='HEAD'||!size){res.end();return}
  const stream=fs.createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 });
})}
async function start(){
 require('./runtime-env.cjs');
 const client=process.env.EP_DB_CLIENT||(process.argv.includes('--sqlite')?'better-sqlite3':'static');
 if(!['static','better-sqlite3'].includes(client))throw Error(`Unsupported EP_DB_CLIENT: ${client}`);
 const useSqlite=client==='better-sqlite3';
 let ideaLibrary;
 if(useSqlite){
  console.log(`[content-db] preparing client=${client} node=${process.version}`);
  const {openContentDb,syncContent,readIdeaLibrary}=require('./db/content.cjs');
  const db=openContentDb();
  try{
   await syncContent(db);
   ideaLibrary=await readIdeaLibrary(db);
  }finally{await db.destroy()}
  console.log(`[content-db] ready client=${client} idea_scenes=${ideaLibrary.scenes.length}`);
 }
 const port=Number(process.env.PORT)||4180;
 const host=process.env.HOST||(useSqlite&&process.env.PORT?'0.0.0.0':'127.0.0.1');
 createServer({ideaLibrary}).listen(port,host,()=>console.log(`English Patterns: http://${host}:${port} (Idea Lab: ${ideaLibrary?'SQLite':'static'})`));
}
if(require.main===module)start().catch(error=>{console.error('English Patterns could not start:',error.message);process.exitCode=1});
module.exports={createServer};
