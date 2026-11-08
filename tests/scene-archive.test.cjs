const test=require('node:test'),assert=require('node:assert/strict');
const archive=require('../public/scene-archive.json');
const rows=[...require('../public/pilot.json').sentences,...require('../public/source-corpus.json').sentences,...require('../public/expansion-media.json').sentences];
const visible=new Set(['assistant-reviewed','visually_reviewed','imported-unreviewed']);
test('Idea Lab offers 100 distinct bilingual scenes and conversation art resolves by cover or turn',()=>{
 const fs=require('node:fs');
 const {asset,sha,webpSize}=require('../scripts/media-validation.cjs');
 const {scenes,topics}=require('../public/idea-scenes.json');
 const offline=new Map(require('../public/offline-manifest.json').media.map(row=>[row.path,row]));
 assert(scenes.length>=100);
 assert.equal(new Set(scenes.map(s=>s.sha256)).size,scenes.length);
 assert.equal(new Set(scenes.map(s=>s.taskEn)).size,scenes.length);
 const patternIds=new Set([...require('../public/pilot.json').patterns,...require('../public/expansion-media.json').patterns].map(p=>p.id));
 assert(scenes.reduce((n,scene)=>n+scene.words.filter(w=>w.x!==undefined).length,0)>=600);
 const verify=image=>{
  const file=asset(process.cwd(),image.path);
  assert.equal(sha(file),image.sha256);
  assert.deepEqual(webpSize(fs.readFileSync(file)),[image.width,image.height]);
  assert(offline.get(image.path)?.groups.includes('course'),image.id);
 };
 for(const scene of scenes){
  verify(scene);
  assert(scene.sentenceEn&&scene.sentenceAr&&scene.taskAr&&scene.words.length>=4);
  assert(topics.some(topic=>topic.id===scene.topic),scene.id);
  assert(scene.words.every(word=>word.en&&word.ar&&['object','action','description'].includes(word.kind)),scene.id);
  for(const word of scene.words){
   assert((word.x===undefined&&word.y===undefined)||[word.x,word.y].every(n=>Number.isFinite(n)&&n>=0&&n<=100),scene.id);
  }
  assert(scene.patterns.length>=2&&scene.patterns.every(pattern=>patternIds.has(pattern.id)),scene.id);
 }
 const dialogues=new Map(require('../public/dialogues.json').dialogues.map(d=>[d.id,d]));
 for(const [id,entry] of Object.entries(require('../public/conversation-scenes.json').scenes)){
  assert(dialogues.has(id),id);
  if(entry.cover)verify(entry.cover);
  for(const [turn,image] of Object.entries(entry.turns)){
   assert(+turn>0&&+turn<=dialogues.get(id).lines.length,id);
   verify(image);
  }
 }
});
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
test('comparison panels cover all course patterns and have recorded samples with scenes',()=>{
 const patterns=new Set([...require('../public/pilot.json').patterns,...require('../public/expansion-media.json').patterns].map(p=>p.id));
 const comparisons=require('../public/comparisons.json');
 const sentences=new Map(rows.map(sentence=>[sentence.id,sentence]));
 const seen=new Set();
 assert.equal(new Set(comparisons.map(item=>item.id)).size,comparisons.length);
 for(const item of comparisons){
  assert.equal(new Set(item.patterns).size,item.patterns.length,item.id);
  assert.equal(item.examples.length,item.patterns.length,item.id);
  assert(item.options[item.answer],item.id);
  assert(item.samples.length>=2&&item.samples.length>=item.patterns.length,item.id);
  for(const [index,sample] of item.samples.entries()){
   const sentence=sentences.get(sample.sentenceId);
   assert(sentence,sample.sentenceId);
   if(index<item.patterns.length){
    assert.equal(sentence.pattern_id,item.patterns[index],item.id);
    seen.add(sentence.pattern_id);
   }else{
    assert(sample.form&&sentence.id.startsWith('ref-'),item.id);
   }
   for(const voice of ['male','female']){
    const recording=sentence.recordings[voice];
    assert(recording?.sha256&&recording.words.length===sentence.en.split(/\s+/).length,sample.sentenceId);
   }
   const scene=sentences.get(sample.sceneId||sample.sentenceId);
   assert(visible.has(scene?.image?.status),sample.sentenceId);
  }
 }
 assert.deepEqual(seen,patterns);
 assert([2,3,4,5].every(size=>comparisons.some(c=>c.samples.length===size)));
 assert.deepEqual(new Set(comparisons.map(c=>c.level)),new Set(['basic','intermediate','advanced']));
});
