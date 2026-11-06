const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const corpus=require('../public/source-corpus.json'),source=require('../public/source.json'),{classify}=require('../scripts/source-taxonomy.cjs');
test('all original entries map to one of 1000 exact translated references without discarding duplicates',()=>{
 assert.equal(corpus.sentences.length,1000);const ids=new Set();
 for(const r of corpus.sentences){assert(r.ar&&/[\u0600-\u06ff]/.test(r.ar));assert(r.keywords.length);assert(r.grammar.length&&r.domains.length&&r.purposes.length);for(const id of r.source_ids){assert(!ids.has(id));ids.add(id);const original=source.find(s=>s.id===id);assert.equal(original.text,r.en);assert(r.original_rules.includes(original.rule))}}
 assert.equal(ids.size,source.length);
 assert.equal(corpus.sentences.find(s=>s.en==='You look like a million bucks.').ar,'تبدو في أبهى حلة.');
 assert.equal(corpus.sentences.find(s=>s.en==='Tom hates shots.').ar,'يكره توم الحقن.');
});
test('search distinguishes former habits, accustomed states, lack of necessity and possession',()=>{
 assert.equal(classify('I used to have a house in Boston.').construction,'past-habit');
 for(const en of ["I'm used to Tom always yelling at me.","I'm starting to get used to living here."]){const r=classify(en);assert.equal(r.construction,'accustomed');assert(!r.grammar.includes('past-habit'))}
 assert.equal(classify("You don't have to go to school today.").construction,'lack-necessity');
 assert.equal(classify('I have to think about it.').construction,'obligation');
 assert.equal(classify('I have a good job.').construction,'possession');
 assert(!classify('I knew that something was wrong.').grammar.includes('demonstrative'));
 assert.equal(classify('Tom asked Mary whether she planned to swim or not.').construction,'reported-question');
});
test('reference production keeps source IDs stable and publishes no invented measured cues',()=>{
 const plan=require('../production/plans/source-corpus-1000.json'),rows=plan.manifest_paths.flatMap(p=>JSON.parse(fs.readFileSync(p)).sentences);assert.equal(rows.length,1000);
 for(const r of rows){assert.equal(corpus.sentences.find(s=>s.id===r.id).en,r.en);assert.equal(r.recordings.male.voice_id,'am_adam');assert.equal(r.recordings.female.voice_id,'af_bella');for(const rec of Object.values(r.recordings))if(rec.status==='planned'){assert.equal(rec.words.length,0);assert(!rec.duration_ms)}assert(r.image.width<=1536&&r.image.height<=2048)}
});

test('reference library distinguishes verified WebP imports from visually approved scenes',()=>{
 for(const s of corpus.sentences){
  const key=`reference-${String(Math.floor((s.ordinal-1)/12)+1).padStart(3,'0')}`,file=`production/reference-images/${key}.json`;
  const meta=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null,cell=(s.ordinal-1)%12;
  const approved=meta?.review==='assistant visual review'&&!meta.rejected_cells?.includes(cell);
  assert.equal(s.image.status==='assistant-reviewed',Boolean(approved),s.id);
  assert.equal(s.lifecycle.image==='assistant-reviewed',Boolean(approved),s.id);
 }
 const imports=corpus.sentences.filter(s=>s.image.status==='imported-unreviewed');
 for(const s of imports)assert(s.image.atlas.startsWith('assets/scenes/imported-references/'));
 assert.equal(corpus.counts.scenes,corpus.sentences.filter(s=>['assistant-reviewed','imported-unreviewed'].includes(s.image.status)).length);
});
