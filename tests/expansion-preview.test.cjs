const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('expansion media previews contain exactly the approved rows and both real voice paths',()=>{
 const plan=require('../production/plans/expansion-all-153.json'),rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences).filter(s=>s.image.status==='assistant-reviewed');
 const preview=require('../public/expansion-media.json');assert.deepEqual(preview.sentences.map(s=>s.id),rows.map(s=>s.id));
 for(const s of preview.sentences){assert(fs.existsSync('public/'+s.image.atlas));for(const gender of ['male','female'])assert(fs.existsSync('public/'+s.recordings[gender].path));}
});
