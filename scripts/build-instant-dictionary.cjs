const fs=require('node:fs');
const {gunzipSync}=require('node:zlib');
const {normalize}=require('../public/vocabulary-core.js');

const xml=gunzipSync(fs.readFileSync('public/dictionaries/freedict-eng-ara.tei.gz')).toString('utf8');
const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const plain=value=>value.replace(/<[^>]*>/g,'').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,entity)=>
 entity[0]==='#'?String.fromCodePoint(entity[1]==='x'?parseInt(entity.slice(2),16):Number(entity.slice(1))):entities[entity]
).replace(/\s+/g,' ').trim();
const words=new Map();
for(const [,entry] of xml.matchAll(/<entry(?:\s[^>]*)?>([\s\S]*?)<\/entry>/g)){
 const head=entry.match(/<orth(?:\s[^>]*)?>([\s\S]*?)<\/orth>/)?.[1];
 if(!head)continue;
 const en=normalize(plain(head));
 if(!/^[a-z][a-z' -]*[a-z]$/.test(en)||en.split(/\s+/).length>3)continue;
 const translations=[...entry.matchAll(/<quote(?:\s[^>]*)?>([\s\S]*?)<\/quote>/g)].map(match=>plain(match[1]))
  .filter(ar=>/[\p{Script=Arabic}]/u.test(ar)&&ar.length<=120);
 if(translations.length)words.set(en,[...new Set([...(words.get(en)||[]),...translations])].slice(0,4));
}
if(words.size<30000)throw Error('FreeDict vocabulary is incomplete');
fs.writeFileSync('public/instant-dictionary.json',JSON.stringify(Object.fromEntries(words))+'\n');
console.log(`Indexed ${words.size} FreeDict vocabulary entries`);
