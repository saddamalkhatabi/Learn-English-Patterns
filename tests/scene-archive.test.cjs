const test=require('node:test'),assert=require('node:assert/strict');
const archive=require('../public/scene-archive.json');
const rows=[...require('../public/pilot.json').sentences,...require('../public/source-corpus.json').sentences,...require('../public/expansion-media.json').sentences];
const visible=new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
test('scene archive covers every displayable binding with bilingual search topics and retained briefs',()=>{
 const topics=new Map(archive.topics.map(t=>[t.id,t]));
 const expected=rows.filter(s=>visible.has(s.image?.status)).map(s=>s.id).sort();
 assert.deepEqual(archive.scenes.map(s=>s.id).sort(),expected);
 for(const entry of archive.scenes){
  assert(entry.descriptionAr,entry.id);
  assert(!/[\u0600-\u06ff]/.test(entry.description),entry.id);
  assert(entry.keywords.every(k=>typeof k==='string'),entry.id);
  assert(entry.topics.length&&entry.topics.every(id=>topics.has(id)),entry.id);
  for(const id of entry.topics){assert(topics.get(id).ar&&topics.get(id).en)}
 }
 const bilingual=archive.scenes.find(s=>s.id==='want-01');
 assert(bilingual.keywords.includes('notebook')&&bilingual.keywords.includes('دفتر'));
 assert.match(bilingual.descriptionAr,/دفتر/);
});
test('comparison panels have aligned examples and valid two to five way pattern links',()=>{
 const patterns=new Set([...require('../public/pilot.json').patterns,...require('../public/expansion-media.json').patterns].map(p=>p.id));
 const comparisons=require('../public/comparisons.json');
 for(const item of comparisons){
  assert(item.patterns.every(id=>patterns.has(id)),item.id);
  assert.equal(new Set(item.patterns).size,item.patterns.length,item.id);
  assert.equal(item.examples.length,item.patterns.length,item.id);
  assert(item.options[item.answer],item.id);
 }
 assert([2,3,4,5].every(size=>comparisons.some(c=>c.patterns.length===size)));
});
