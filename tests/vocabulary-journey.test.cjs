const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vocabulary=require('../public/vocabulary-index.json');
const {includesTerm,normalize,tokens}=require('../public/vocabulary-core.js');
const {scenes,lifecycles}=require('../public/conversation-scenes.json');
const dialogues=new Map(require('../public/dialogues.json').dialogues.map(d=>[d.id,d]));
const audio=require('../public/dialogue-audio.json');
test('the shipped browser scripts parse together as classic scripts',()=>{
 const vm=require('node:vm'),html=fs.readFileSync('public/index.html','utf8');
 const files=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
 assert(files.length>20);
 assert.doesNotThrow(()=>new vm.Script(files.map(file=>fs.readFileSync('public/'+file,'utf8')).join('\n;\n')));
});
test('reviewed conversation stages cover every turn and use their measured audio offsets',()=>{
 assert.equal(Object.keys(lifecycles).length,32);
 const annotations=new Map(require('../public/idea-scenes.json').scenes.map(scene=>[scene.id,scene]));
 const images=new Set();
 for(const [id,life] of Object.entries(lifecycles)){
  const dialogue=dialogues.get(id);let next=1;
  assert.equal(life.stages.length,4,id);
  if(life.turnPurposes){
   assert.equal(life.turnPurposes.length,dialogue.lines.length,id);
   assert(life.turnPurposes.every(pair=>pair.length===2&&pair.every(text=>typeof text==='string'&&text.trim())),id);
  }
  for(const stage of life.stages){
   assert.equal(stage.from,next,id);
   assert(stage.from<=stage.to&&stage.to<=dialogue.lines.length,id);
   const image=scenes[id].turns[stage.from];
   assert(image&&image.width>image.height,id);
   assert(image.path.startsWith('assets/scenes/conversations/life-'),id);
   assert(!images.has(image.path),id);images.add(image.path);
   const annotation=annotations.get(image.id);
   assert.equal(annotation.sha256,image.sha256,id);
   assert(annotation.words.length>=2&&annotation.words.every(word=>Number.isFinite(word.x)&&Number.isFinite(word.y)),id);
   assert(annotation.words.every(word=>vocabulary.entries.some(entry=>normalize(entry.en)===normalize(word.en)&&entry.sceneIds.includes(image.id))),id);
   for(let turn=stage.from;turn<=stage.to;turn++){
    assert.equal(scenes[id].turns[turn].id,image.id,id);
    const cue=audio[id].turns[turn-1];
    assert(cue.start_ms<cue.end_ms,id);
   }
   next=stage.to+1;
  }
  assert.equal(next,dialogue.lines.length+1,id);
 }
 assert.equal(images.size,128);
});
test('vocabulary keeps contextual roles, full words with accents, and valid content links',()=>{
 assert(vocabulary.entries.length>3000);
 assert.equal(new Set(vocabulary.entries.map(e=>e.id)).size,vocabulary.entries.length);
 assert.deepEqual(tokens('café résumé'),['café','résumé']);
 assert.deepEqual(new Set(vocabulary.entries.filter(e=>e.en.toLowerCase()==='book').map(e=>e.pos)),new Set(['NOUN','VERB']));
 const knownScenes=new Set([
  ...require('../public/scene-archive.json').scenes.map(scene=>'scene-'+scene.id),
  ...require('../public/idea-scenes.json').scenes.map(scene=>scene.id),
  ...Object.values(scenes).flatMap(entry=>[entry.cover,...Object.values(entry.turns)].filter(Boolean).map(scene=>scene.id))
 ]);
 for(const entry of vocabulary.entries){
  assert(entry.en&&entry.pos&&entry.sourceIds.length,entry.id);
  assert.equal(new Set(entry.sourceIds).size,entry.sourceIds.length,entry.id);
  for(const index of entry.sourceIds){
   const source=vocabulary.sources[index];assert(source?.en&&source.ar,entry.id);
   // Explicit picture labels can name additional visible objects beyond the sentence.
   if(!source.sceneIds.length)assert(includesTerm(source.en,entry.en),entry.id);
  }
  for(const scene of entry.sceneIds)assert(knownScenes.has(scene),scene);
  for(const clip of Object.values(entry.audio)){
   assert(fs.existsSync('public/'+clip.path),clip.path);
   if(clip.start_ms!=null)assert(clip.start_ms<clip.end_ms,entry.en);
  }
 }
 const sentenceIds=new Set(vocabulary.sources.filter(source=>source.type==='sentence').map(source=>source.id));
 for(const name of ['pilot','expansion-media','source-corpus','supplement']){
  for(const sentence of require('../public/'+name+'.json').sentences)assert(sentenceIds.has(sentence.id),sentence.id);
 }
});
