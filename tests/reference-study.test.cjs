const assert=require('node:assert/strict');
const test=require('node:test');
const {normalize,includesTerm}=require('../public/vocabulary-core.js');
const {describeReference}=require('../public/teaching-core.js');
const {makeReferenceStudy}=require('../scripts/reference-study.cjs');
const corpus=require('../public/source-corpus.json').sentences;
const course=[require('../public/pilot.json'),require('../public/expansion-media.json')];
const study=require('../public/reference-study.json');
const atlas=require('../public/vocabulary-index.json');

test('reference expansions reuse a matching course pattern and separate easily confused constructions',()=>{
 const hasExamples=ids=>ids.every(id=>Object.hasOwn(study.examples,id));
 assert.equal(study.rows['ref-0004'].lessonId,2);
 assert.equal(study.rows['ref-0004'].group,'obligation');
 assert.equal(study.rows['ref-0008'].lessonId,114);
 assert.equal(study.rows['ref-0009'].lessonId,107);
 assert.equal(study.rows['ref-0010'].lessonId,1);
 assert.equal(study.rows['ref-0013'].group,'offer');
 assert.equal(study.rows['ref-0020'].group,'permission');
 assert(study.rows['ref-0020'].examples.includes('study-service-return'));
 assert.equal(study.rows['ref-0023'].group,'optional');
 assert.equal(study.rows['ref-0054'].group,'accustomed');
 assert(!study.rows['ref-0054'].examples.includes('ref-0045'));
 assert.equal(study.rows['ref-0276'].group,'up-all-night');
 assert(hasExamples(study.rows['ref-0276'].examples));
 assert.notEqual(study.rows['ref-0483'].lessonId,9127);
 assert.equal(study.rows['ref-0632'].lessonId,9127);
 assert.notEqual(study.rows['ref-0378'].lessonId,9106);
 const adjective=corpus.find(row=>row.en==='This is rather expensive.');
 assert.notEqual(study.rows[adjective.id].lessonId,5);
 assert.equal(study.rows['ref-0936'].group,'question-tag');
 assert.match(study.groups['past-habit'].caution[1],/did/);
});

test('every study example, pattern link and word resolves to the material shown',()=>{
 const levels=require('../public/learning-levels.json').sentences;
 const expected=makeReferenceStudy(corpus,course,levels);
 const examples=new Map([...corpus,...course.flatMap(book=>book.sentences),...Object.values(study.examples)].map(row=>[row.id,row]));
 const patterns=new Set(course.flatMap(book=>book.patterns.map(pattern=>pattern.id)));
 const entries=new Map([...atlas.entries,...atlas.regional].map(entry=>[entry.id,entry]));
 for(const origin of corpus){
  const row=study.rows[origin.id],validSources=new Set([origin.id,...row.examples]);
  assert.deepEqual(row.examples,expected.rows[origin.id].examples,origin.id);
  if(row.lessonId)assert(patterns.has(row.lessonId),origin.id);
  if(row.group)assert(study.groups[row.group],origin.id);
  const text=row.examples.map(id=>normalize(examples.get(id).en));
  assert(!text.includes(normalize(origin.en)),origin.id);
  assert.equal(text.length,new Set(text).size,origin.id);
  for(const id of row.terms){
   const entry=entries.get(id);
   assert(entry?.ar&&entry.sourceIds.some(index=>validSources.has(atlas.sources[index].id)),origin.id+' '+id);
  }
  if(row.comparison)assert(describeReference(origin).form,origin.id);
 }
});

test('regional study pairs cite a usage source and are indexed with both forms in context',()=>{
 const expected=makeReferenceStudy(corpus,course,require('../public/learning-levels.json').sentences);
 for(const example of Object.values(expected.examples).filter(row=>row.uk)){
  assert.match(example.source,/^https:\/\/dictionary\.cambridge\.org\//);
  const index=atlas.sources.findIndex(source=>source.id===example.id);
  assert(index>=0,example.id);
  const source=atlas.sources[index];
  assert.equal(source.uk,example.uk);
  assert.equal(source.referenceId,example.referenceId);
  const pairs=atlas.regional.filter(entry=>entry.sourceIds.includes(index));
  assert(pairs.length,example.id);
  for(const entry of pairs){
   assert(includesTerm(source.en,entry.en),example.id+' '+entry.en);
   assert(includesTerm(source.uk,entry.uk),example.id+' '+entry.uk);
  }
 }
});
