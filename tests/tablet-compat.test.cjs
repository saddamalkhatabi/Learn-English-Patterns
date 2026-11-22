const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createServer}=require('../server.js');
const {once}=require('node:events');
const {request}=require('node:http');
const {gunzipSync}=require('node:zlib');

test('the server serves JPEG alternatives and compresses course data while preserving original media bytes',async t=>{
 const server=createServer();
 server.listen(0,'127.0.0.1');
 await once(server,'listening');
 t.after(()=>server.close());
 const origin='http://127.0.0.1:'+server.address().port;
 const asset='/assets/scenes/pattern-9039-atlas-v1.webp';
 const modern=await fetch(origin+asset,{headers:{Accept:'image/webp,image/*'}});
 assert.equal(modern.headers.get('content-type'),'image/webp');
 assert.equal(modern.headers.get('vary'),'Accept');
 assert.deepEqual(Buffer.from(await modern.arrayBuffer()),fs.readFileSync('public'+asset));
 for(const [path,accept] of [[asset,'image/png,image/*'],[asset+'?format=jpeg','*/*']]){
  const jpeg=await fetch(origin+path,{headers:{Accept:accept}});
  assert.equal(jpeg.headers.get('content-type'),'image/jpeg');
  assert.deepEqual([...new Uint8Array(await jpeg.arrayBuffer()).slice(0,3)],[255,216,255]);
 }
 const response=await new Promise((resolve,reject)=>{
  request(origin+'/pilot.json',{headers:{'Accept-Encoding':'gzip, deflate'}},res=>{
   const bytes=[];
   res.on('data',chunk=>bytes.push(chunk));
   res.on('end',()=>resolve({encoding:res.headers['content-encoding'],body:Buffer.concat(bytes)}));
   res.on('error',reject);
  }).on('error',reject).end();
 });
 assert.equal(response.encoding,'gzip');
 assert.deepEqual(gunzipSync(response.body),fs.readFileSync('public/pilot.json'));
});
