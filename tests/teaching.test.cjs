const test=require('node:test'),assert=require('node:assert/strict');const {describe,describeReference}=require('../public/teaching-core.js');
test('teaching cues distinguish past habits, accustomed states and lack of necessity',()=>{
 const a=describe({en:'I used to work here.',construction:'past-habit'}),b=describe({en:'I am used to working here.',construction:'accustomed'}),c=describe({en:"You don't have to leave.",construction:'lack-necessity'});
 assert.equal(a.form,'used to + base verb');assert.deepEqual(a.highlight,[1,2]);assert.match(b.form,/-ing/);assert.deepEqual(b.highlight,[1,2,3]);assert.match(c.note_en,/prohibition/);
});
test('every learning entry preserves the exact source word indexes and offers bilingual guidance',()=>{
 const index=require('../public/teaching-index.json'),corpus=require('../public/source-corpus.json'),pilot=require('../public/pilot.json');
 for(const s of [...corpus.sentences,...pilot.sentences]){const e=index.sentences[s.id];assert(e&&e.rule_ar&&e.rule_en&&e.form,s.id);const words=s.en.split(/\s+/);for(const i of e.highlight)assert(Number.isInteger(i)&&i>=0&&i<words.length)}
});
test('reference notes distinguish the purpose and construction of the actual sentence',()=>{
 const corpus=require('../public/source-corpus.json');
 const guide=ordinal=>describeReference(corpus.sentences[ordinal-1]);
 const offer=guide(13),invitation=guide(14),permission=guide(20);
 assert.equal(offer.construction,'offer-invitation');
 assert.equal(offer.purpose,'offer');
 assert.notEqual(offer.purpose_ar,invitation.purpose_ar);
 assert.deepEqual(offer.highlight,[0,1,2]);
 assert.equal(permission.purpose_en,'Ask for permission');
 assert.equal(guide(54).construction,'accustomed');
 assert.deepEqual(guide(54).highlight,[0,1,2]);
 assert.equal(guide(165).purpose,'narration');
 assert.equal(guide(276).form,'be up all night');
 assert(guide(276).keywords.includes('up all night'));
 assert.equal(guide(718).construction,'indirect-question');
 assert.equal(guide(936).purpose,'request');
});
test('all 1000 references have bilingual purposes and keywords, with notes tied to real words',()=>{
 const corpus=require('../public/source-corpus.json');
 const purposes=new Set(corpus.taxonomy.purposes.map(item=>item.id));
 const constructions=new Set([...corpus.taxonomy.grammar.map(item=>item.id),'offer-invitation']);
 for(const s of corpus.sentences){
  const guide=describeReference(s),words=s.en.split(/\s+/);
  assert(purposes.has(guide.purpose)&&constructions.has(guide.construction),s.id);
  assert(guide.purpose_ar&&guide.purpose_en&&guide.keywords.length,s.id);
  assert.equal(new Set(guide.keywords).size,guide.keywords.length,s.id);
  for(const index of guide.highlight)assert(Number.isInteger(index)&&index>=0&&index<words.length,s.id);
  assert.equal(Boolean(guide.rule_ar&&guide.rule_en&&guide.form),Boolean(guide.highlight.length),s.id);
 }
});
test('each full lesson has its main sentence’s recorded purpose in the course download',()=>{
 const prompts=require('../public/course-purpose-prompts.js');
 const {cueId}=require('../public/reference-study-audio.js');
 const cues=require('../public/coach-cues.json');
 const catalog=require('../public/pattern-catalog.json').patterns;
 const sentences=['pilot','expansion-media'].flatMap(source=>require('../public/'+source+'.json').sentences);
 const courseMedia=new Map(require('../public/offline-manifest.json').media.filter(asset=>asset.groups.includes('course')).map(asset=>[asset.path,asset.sha256]));
 for(const pattern of catalog){
  const id=pattern.planned_pattern_id||pattern.id;
  const sentence=sentences.find(row=>row.pattern_id===id);
  assert.equal(sentence.id,pattern.published_sentence_ids?.[0]||pattern.examples[0].id);
  const [ar,text]=prompts[id];
  assert(ar&&text);
  const cue=cues[cueId('purpose',text,'female')];
  assert.equal(cue.text,text);
  assert.equal(courseMedia.get(cue.path),cue.sha256);
 }
});
