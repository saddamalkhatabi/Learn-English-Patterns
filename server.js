const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {previewHTML}=require('./share-preview.cjs');
const {createGzip}=require('node:zlib');
const {pipeline}=require('node:stream');
const ROOT=path.resolve(__dirname,'public');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.zip':'application/zip'};
const jpegCache=new Map(),jpegPending=new Map();
async function jpegVersion(file,stat){
 const key=file+'|'+stat.mtimeMs;
 if(jpegCache.has(key))return jpegCache.get(key);
 if(jpegPending.has(key))return jpegPending.get(key);
 const sharp=require('sharp');
 const job=sharp(file,{limitInputPixels:24_000_000}).resize(1920,1920,{fit:'inside',withoutEnlargement:true})
  .flatten({background:'#edf0e5'}).jpeg({quality:78}).toBuffer().then(bytes=>{
   if(jpegCache.size>=48)jpegCache.delete(jpegCache.keys().next().value);
   jpegCache.set(key,bytes);
   return bytes;
  }).finally(()=>jpegPending.delete(key));
 jpegPending.set(key,job);
 return job;
}
function createServer({ideaLibrary,publicOrigin=process.env.EP_PUBLIC_URL}={}){
 const index=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const endpoints=new Map([['/api/health',JSON.stringify({
  status:'ok',ideaBackend:ideaLibrary?'sqlite':'static',ideaScenes:ideaLibrary?.scenes.length??null
 })]]);
 if(ideaLibrary)endpoints.set('/api/idea-scenes',JSON.stringify(ideaLibrary));
 return http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'}).end();return}
 let input,pathname;try{input=new URL(req.url,'http://localhost');pathname=decodeURIComponent(input.pathname)}catch{res.writeHead(400).end();return}
 if(pathname.includes('\\')||pathname.includes('\0')){res.writeHead(400).end();return}
 if(endpoints.has(pathname)){
  const body=endpoints.get(pathname);
  res.writeHead(200,{'Content-Type':TYPES['.json'],'Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);return;
 }
 if((pathname==='/'||pathname==='/index.html')&&!req.headers.range){
  const body=previewHTML(index,input,req,publicOrigin);
  res.writeHead(200,{'Content-Type':TYPES['.html'],'Content-Length':Buffer.byteLength(body),
   'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
  res.end(req.method==='HEAD'?undefined:body);return;
 }
 const file=path.resolve(ROOT,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(file!==ROOT&&!file.startsWith(ROOT+path.sep)){res.writeHead(403).end();return}
 fs.stat(file,(error,stat)=>{
  if(error||!stat.isFile()){res.writeHead(404).end();return}
  const size=stat.size,compressible=/\.(html|js|css|json|svg)$/.test(file);
  const headers={'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':compressible?'no-cache':'public, max-age=86400','X-Content-Type-Options':'nosniff'};
  if(pathname.startsWith('/assets/')&&pathname.endsWith('.webp')){
   const accept=req.headers.accept||'';
   headers.Vary='Accept';
   const jpeg=input.searchParams.get('format')==='jpeg'||(!req.headers.range&&accept.includes('image/')&&!accept.includes('image/webp'));
   if(jpeg){
    jpegVersion(file,stat).then(body=>{
     if(res.destroyed)return;
     delete headers['Accept-Ranges'];
     res.writeHead(200,{...headers,'Content-Type':'image/jpeg','Content-Length':body.length});
     res.end(req.method==='HEAD'?undefined:body);
    }).catch(()=>{if(!res.destroyed)res.writeHead(500).end()});
    return;
   }
  }
  if(compressible&&size>1024){
   headers.Vary='Accept-Encoding';
   const gzip=(req.headers['accept-encoding']||'').split(',').some(value=>/^\s*gzip(?:\s*;\s*q=(?!0(?:\.0*)?\s*$)[\d.]+)?\s*$/i.test(value));
   if(gzip&&!req.headers.range){
    delete headers['Accept-Ranges'];
    headers['Content-Encoding']='gzip';
    res.writeHead(200,headers);
    if(req.method==='HEAD'){res.end();return}
    pipeline(fs.createReadStream(file),createGzip({level:4}),res,()=>{});
    return;
   }
  }
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
