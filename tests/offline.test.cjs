const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const {ranged}=require('../public/offline-core.js');
test('offline audio serves exact closed, open and suffix ranges from a complete cached file',async()=>{
 const bytes=Uint8Array.from({length:200},(_,i)=>i),make=()=>new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}});
 for(const [range,start,end]of [['bytes=10-109',10,110],['bytes=180-',180,200],['bytes=-37',163,200]]){const r=await ranged(make(),range);assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${start}-${end-1}/200`);assert.deepEqual(new Uint8Array(await r.arrayBuffer()),bytes.slice(start,end))}
 for(const range of ['bytes=999-','bytes=-0','bytes=80-20','bytes=1-2,5-6'])assert.equal((await ranged(make(),range)).status,416);
 assert.equal((await ranged(make(),null)).status,200);
});
test('offline collections contain both exact voices and only reviewed scene atlases',()=>{
 const offline=require('../public/offline-manifest.json'),corpus=require('../public/source-corpus.json');
 const files=new Map(offline.media.map(x=>[x.path,x]));
 for(const s of corpus.sentences){for(const rec of Object.values(s.recordings)){assert(files.has(rec.path));assert.equal(files.get(rec.path).sha256,rec.sha256);assert(files.get(rec.path).groups.includes('library'))}if(s.image.status==='assistant-reviewed')assert(files.has(s.image.atlas))}
 assert(!files.has('assets/scenes/reference-008-v1.webp'));
 for(const item of offline.media)assert.equal(fs.statSync('public/'+item.path).size,item.bytes);
 for(const file of offline.shell)assert(fs.existsSync('public/'+file),file);
});
test('the shipped shell and media hashes match the update identifier',()=>{
 const manifest=require('../public/offline-manifest.json'),sha=file=>crypto.createHash('sha256').update(fs.readFileSync('public/'+file)).digest('hex');
 for(const item of manifest.media)assert.equal(sha(item.path),item.sha256,item.path);
 const shell=manifest.shell.filter(p=>!['app-version.js','app-version.json'].includes(p)).sort().map(p=>[p,sha(p)]);
 const expected=crypto.createHash('sha256').update(JSON.stringify({shell,media:manifest.media,worker:sha('sw.js')})).digest('hex').slice(0,16);
 assert.equal(manifest.version,expected,'Run npm run build after application or content edits');
 assert.equal(require('../public/app-version.json').version,expected);
});
