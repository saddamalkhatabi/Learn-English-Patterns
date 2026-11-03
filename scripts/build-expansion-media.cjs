// Only accepted assets enter the public preview; authored lessons remain separately published.
const fs=require('node:fs'),assert=require('node:assert/strict');
const plan=require('../production/plans/expansion-all-153.json'),all=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
const sentences=all.filter(s=>s.image.status==='assistant-reviewed').map(s=>{
 assert(fs.existsSync('public/'+s.image.atlas));
 return{id:s.id,pattern_id:s.pattern_id,catalog_id:s.catalog_id,en:s.en,ar:s.ar,image:s.image,recordings:Object.fromEntries(['male','female'].map(g=>{const r=s.recordings[g];return[g,{path:r.path,sha256:r.sha256,voice_id:r.voice_id}]}))};
});
fs.writeFileSync('public/expansion-media.json',JSON.stringify({schema:1,notice:'Reviewed media previews, not published lessons.',sentences},null,2)+'\n');
console.log(JSON.stringify({expansion_media_previews:sentences.length}));
