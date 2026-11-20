const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const root=path.resolve(__dirname,'..'),directory='public/assets/audio/';
const manifest=require('../public/offline-manifest.json');
const active=new Set(manifest.media.map(item=>'public/'+item.path));
const tracked=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024})
 .split('\0').filter(Boolean);
const audioPath=/^public\/assets\/audio\/[a-z0-9_.-]+\.mp3$/i;
const textPath=/\.(?:js|cjs|mjs|ts|json|jsonl|html|css|md|yml|yaml|csv|tsv|txt|py|ps1|cmd|sql|sh|xml|svg)$/i;
const candidates=tracked.filter(file=>audioPath.test(file)&&!active.has(file)&&fs.existsSync(path.join(root,file)));
const counts={unused:0,bytes:0,retainedReferences:0};
const retained=new Set();
if(candidates.length){
 const names=new Set(candidates.map(file=>file.slice(directory.length).toLowerCase()));
 // A production or archival reference can still be in use outside the offline manifest.
 for(const file of tracked){
  if(!textPath.test(file))continue;
  const location=path.join(root,file);
  if(!fs.existsSync(location))continue;
  const text=fs.readFileSync(location,'utf8');
  for(const [name] of text.matchAll(/[a-z0-9_.-]+\.mp3\b/gi)){
   if(names.has(name.toLowerCase()))retained.add(name.toLowerCase());
  }
 }
}
const apply=process.argv.includes('--delete'),list=process.argv.includes('--list');
for(const file of candidates){
 if(retained.has(file.slice(directory.length).toLowerCase())){counts.retainedReferences++;continue}
 const location=path.join(root,file);
 counts.unused++;
 counts.bytes+=fs.statSync(location).size;
 if(list)console.log(file);
 if(apply)fs.unlinkSync(location);
}
console.log(JSON.stringify({applied:apply,...counts}));
