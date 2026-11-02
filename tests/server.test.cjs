const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{createServer}=require('../server.js');
test('local server delivers exact audio ranges for seeking and resume',async()=>{
 const server=createServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const base=`http://127.0.0.1:${server.address().port}`,s=JSON.parse(fs.readFileSync('public/pilot.json')).sentences[0],file=s.recordings.male.path,bytes=fs.readFileSync('public/'+file);
  const r=await fetch(base+'/'+file,{headers:{Range:'bytes=10-109'}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes 10-109/${bytes.length}`);assert.deepEqual(Buffer.from(await r.arrayBuffer()),bytes.subarray(10,110));
  const suffix=await fetch(base+'/'+file,{headers:{Range:'bytes=-37'}});assert.equal(suffix.status,206);assert.deepEqual(Buffer.from(await suffix.arrayBuffer()),bytes.subarray(-37));
  const invalid=await fetch(base+'/'+file,{headers:{Range:'bytes=99999999-'}});assert.equal(invalid.status,416);assert.equal(invalid.headers.get('content-range'),`bytes */${bytes.length}`);
  const head=await fetch(base+'/'+file,{method:'HEAD'});assert.equal(head.headers.get('content-length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/%2e%2e%5cREADME.md')).status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
