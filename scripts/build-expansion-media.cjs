// Every authored example has real dual audio; an image appears only when its file is present.
const fs=require('node:fs'),assert=require('node:assert/strict');
const plan=require('../production/plans/expansion-all-153.json'),all=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);
const visible=new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
const sentences=all.map(s=>{
 const image=visible.has(s.image.status)?s.image:null;
 if(image)assert(fs.existsSync('public/'+image.atlas));
 return{id:s.id,pattern_id:s.pattern_id,catalog_id:s.catalog_id,en:s.en,ar:s.ar,scene_description:s.scene_description,image,recordings:Object.fromEntries(['male','female'].map(g=>{const r=s.recordings[g];assert(r.sha256&&fs.existsSync('public/'+r.path));return[g,{path:r.path,sha256:r.sha256,voice_id:r.voice_id,duration_ms:r.duration_ms}]}))};
});
fs.writeFileSync('public/expansion-media.json',JSON.stringify({schema:2,notice:'All authored examples have recorded voices. Imported scenes may still await visual approval; missing or withheld scenes have no image.',sentences},null,2)+'\n');
console.log(JSON.stringify({expansion_examples:sentences.length,scenes_visible:sentences.filter(s=>s.image).length}));
