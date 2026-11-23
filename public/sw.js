/* The build identifier changes on each shipped application/content revision. */
if(typeof globalThis==='undefined')self.globalThis=self;
importScripts('./app-version.js','./offline-core.js');
const SHELL='ep-shell-'+self.EP_BUILD.version,MEDIA='ep-media-v2',BASE=new URL('./',self.location.href),inflight=new Map();
let manifestPromise,mediaIndex,downloadCancelled=false,downloading=false;
const absolute=p=>new URL(p,BASE).href;
function manifest(){
 if(!manifestPromise)manifestPromise=(async()=>{
  const cache=await caches.open(SHELL).catch(()=>null);
  let response=cache&&await cache.match(absolute('offline-manifest.json')).catch(()=>null);
  if(!response)response=await fetch(absolute('offline-manifest.json'),{cache:'no-store'});
  if(!response.ok)throw Error('manifest unavailable');
  return response.json();
 })().catch(error=>{manifestPromise=null;throw error});
 return manifestPromise;
}
async function listedMedia(url){
 if(!mediaIndex){
  const m=await manifest();
  if(!mediaIndex)mediaIndex=new Map(m.media.map(x=>[absolute(x.path),x]));
 }
 return mediaIndex.get(url);
}
self.addEventListener('install',event=>event.waitUntil((async()=>{const r=await fetch(absolute('offline-manifest.json'),{cache:'no-store'});if(!r.ok)throw Error('offline manifest unavailable');const m=await r.clone().json(),cache=await caches.open(SHELL);await cache.addAll(m.shell.map(p=>new Request(absolute(p),{cache:'reload'})));await cache.put(absolute('offline-manifest.json'),r);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('ep-shell-')&&name!==SHELL)await caches.delete(name);await self.clients.claim();for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'EP_VERSION',version:self.EP_BUILD.version})})()));
async function verifiedMedia(url){
 const entry=await listedMedia(url);
 if(!entry)throw Error('Unlisted media');
 const cache=await caches.open(MEDIA).catch(()=>null);
 const previous=cache&&await cache.match(url).catch(()=>null);
 if(previous&&previous.headers.get('X-EP-Hash')===entry.sha256)return {response:previous,saved:true};
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok||response.status!==200)throw Error('Full media download failed');
 const bytes=await response.arrayBuffer();
 const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==entry.sha256)throw Error('Media changed; refresh application');
 const headers=new Headers(response.headers);
 headers.set('X-EP-Hash',digest);
 headers.set('Content-Length',String(bytes.byteLength));
 const complete=new Response(bytes,{status:200,headers});
 const saved=cache?await cache.put(url,complete.clone()).then(()=>true,()=>false):false;
 return {response:complete,saved};
}
async function fullMedia(url,requireSaved=false){
 if(!inflight.has(url))inflight.set(url,verifiedMedia(url).finally(()=>inflight.delete(url)));
 const {response,saved}=await inflight.get(url);
 if(requireSaved&&!saved)throw Error('Media could not be saved');
 return response.clone();
}
async function streamSong(request,url){
 try{
  const cache=await caches.open(MEDIA),cached=await cache.match(url);
  if(cached){
   const entry=await listedMedia(url);
   if(entry&&cached.headers.get('X-EP-Hash')===entry.sha256)return EPOfflineCore.ranged(cached,request.headers.get('Range'));
  }
 }catch(error){}
 return fetch(request);
}
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==BASE.origin||!url.href.startsWith(BASE.href))return;
 if(url.pathname.endsWith('.webp')&&url.searchParams.get('format')==='jpeg')return;
 if(url.href.startsWith(absolute('assets/audio/songs/'))&&url.pathname.endsWith('.mp3')){
  event.respondWith(streamSong(request,url.href));return;
 }
 if(/\.(mp3|webp)$/.test(url.pathname)){
  event.respondWith(fullMedia(url.href).then(r=>EPOfflineCore.ranged(r,request.headers.get('Range'))).catch(()=>{
   if(url.pathname.endsWith('.webp'))return fetch(request);
   return new Response('Content not downloaded for offline use',{status:503,headers:{'Content-Type':'text/plain'}});
  }));return;
 }
 event.respondWith((async()=>{const cache=await caches.open(SHELL).catch(()=>null);if(request.mode==='navigate'){
  if(url.searchParams.has('share'))try{const response=await fetch(request);if(response.ok)return response}catch(error){}
  return (cache&&await cache.match(absolute('index.html')).catch(()=>null))||fetch(request);
 }const cached=cache&&await cache.match(request).catch(()=>null);if(cached)return cached;return fetch(request)})());
});
self.addEventListener('message',event=>{const data=event.data||{},port=event.ports&&event.ports[0],send=message=>{if(port)port.postMessage(message)};if(data.type==='EP_CANCEL'){downloadCancelled=true;send({cancelled:true});return}
 if(data.type==='EP_STATUS'){event.waitUntil((async()=>{const m=await manifest(),cache=await caches.open(MEDIA),keys=await cache.keys(),available=new Map();for(const key of keys){const r=await cache.match(key);available.set(key.url,r.headers.get('X-EP-Hash'))}const ready=m.media.filter(x=>available.get(absolute(x.path))===x.sha256);send({version:self.EP_BUILD.version,files:ready.length,bytes:ready.reduce((n,x)=>n+x.bytes,0),total:m.media.length,paths:ready.map(x=>x.path)})})().catch(error=>send({error:String(error)})));return}
 if(data.type==='EP_DOWNLOAD'){event.waitUntil((async()=>{if(downloading){send({type:'error',message:'A download is already running'});return}downloading=true;downloadCancelled=false;let cursor=0,done=0,bytes=0;const failed=[];try{const m=await manifest(),requested=new Set(data.paths||[]),items=m.media.filter(x=>requested.has(x.path));send({type:'progress',done,total:items.length,bytes});await Promise.all(Array.from({length:4},async()=>{while(cursor<items.length&&!downloadCancelled){const entry=items[cursor++];try{await fullMedia(absolute(entry.path),true);done++;bytes+=entry.bytes}catch(error){failed.push(entry.path)}send({type:'progress',done,total:items.length,bytes,failed:failed.length})}}));send({type:'complete',done,total:items.length,bytes,cancelled:downloadCancelled,failed})}finally{downloading=false}})().catch(error=>{downloading=false;send({type:'error',message:String(error)})}));return}
});
