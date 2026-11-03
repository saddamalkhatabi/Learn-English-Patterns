const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {ranged}=require('../public/offline-core.js');
test('service worker stores complete audio, serves ranges offline and preserves media across shell updates',async()=>{
 const handlers={},stored=new Map(),audio=Uint8Array.from({length:200},(_,i)=>i),hash=crypto.createHash('sha256').update(audio).digest('hex');let online=true,fetches=0;
 const cacheFor=name=>{if(!stored.has(name))stored.set(name,new Map());const data=stored.get(name);return {match:async request=>data.get(typeof request==='string'?request:request.url)?.clone(),put:async(request,response)=>data.set(typeof request==='string'?request:request.url,response.clone()),keys:async()=>[...data.keys()].map(url=>new Request(url)),addAll:async requests=>{for(const request of requests)data.set(request.url,new Response('shell'))}}};
 const manifest={shell:['index.html','offline-core.js'],media:[{path:'assets/audio/test.mp3',sha256:hash,bytes:200,groups:['all']}]};
 const caches={open:async name=>cacheFor(name),keys:async()=>[...stored.keys()],delete:async name=>stored.delete(name)};
 const self={EP_BUILD:{version:'new'},location:{href:'https://app.example/learn/sw.js'},addEventListener:(name,fn)=>handlers[name]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{},matchAll:async()=>[]}};
 const fetch=async url=>{fetches++;if(!online)throw Error('offline');if(String(url).endsWith('offline-manifest.json'))return new Response(JSON.stringify(manifest));return new Response(audio,{headers:{'Content-Type':'audio/mpeg'}})};
 const context=vm.createContext({self,caches,fetch,URL,Request,Response,Headers,Map,Set,Promise,Array,Uint8Array,crypto:crypto.webcrypto,EPOfflineCore:{ranged},importScripts:()=>{}});vm.runInContext(fs.readFileSync('public/sw.js','utf8'),context);
 let operation;handlers.install({waitUntil:p=>operation=p});await operation;
 const request=range=>{let result;handlers.fetch({request:new Request('https://app.example/learn/assets/audio/test.mp3',{headers:range?{Range:range}:{}}),respondWith:p=>result=p});return result};
 let response=await request('bytes=10-109');assert.equal(response.status,206);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),audio.slice(10,110));
 const complete=await cacheFor('ep-media-v2').match('https://app.example/learn/assets/audio/test.mp3');assert.equal(complete.status,200);assert.equal((await complete.arrayBuffer()).byteLength,200);
 online=false;const count=fetches;response=await request('bytes=-37');assert.equal(response.status,206);assert.equal(fetches,count);assert.deepEqual(new Uint8Array(await response.arrayBuffer()),audio.slice(-37));
 stored.set('ep-shell-old',new Map());stored.set('unrelated-app',new Map());handlers.activate({waitUntil:p=>operation=p});await operation;assert(!stored.has('ep-shell-old'));assert(stored.has('ep-media-v2'));assert(stored.has('unrelated-app'));
});
