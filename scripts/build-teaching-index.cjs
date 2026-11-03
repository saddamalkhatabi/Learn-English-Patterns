const fs=require('node:fs'),{describe}=require('../public/teaching-core.js');
const pilot=require('../public/pilot.json'),curriculum=require('../public/curriculum.json'),corpus=require('../public/source-corpus.json'),supplement=require('../public/supplement.json');
const batch=require('../content/batches/expansion-all-153.json'),plan=require('../production/plans/expansion-all-153.json');
const expansion=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences),sentences={};
for(const s of [...corpus.sentences,...pilot.sentences,...supplement.sentences,...expansion]){
 const p=pilot.patterns.find(p=>p.id===s.pattern_id)||batch.patterns.find(p=>p.catalog_id===s.catalog_id);
 const meta=curriculum.patterns.find(p=>p.id===s.pattern_id);
 sentences[s.id]=describe(s,p,meta);
}
fs.writeFileSync('public/teaching-index.json',JSON.stringify({schema:1,notice:'Concise learning guidance, not automatic grammar grading. Original source rules remain separately available.',sentences},null,2)+'\n');
console.log(JSON.stringify({teaching_entries:Object.keys(sentences).length}));
