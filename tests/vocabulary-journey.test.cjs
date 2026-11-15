const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vocabulary=require('../public/vocabulary-index.json');
const {includesTerm,normalize,posFor,tokens}=require('../public/vocabulary-core.js');
const {scenes,lifecycles}=require('../public/conversation-scenes.json');
const dialogues=new Map(require('../public/dialogues.json').dialogues.map(d=>[d.id,d]));
const audio=require('../public/dialogue-audio.json');
const trainingAudio=require('../public/training-audio.json');
const {ideaWordCueId}=require('../public/training-narration.js');
const offline=new Set(require('../public/offline-manifest.json').media.map(entry=>entry.path));
test('the shipped browser scripts parse together as classic scripts',()=>{
 const vm=require('node:vm'),html=fs.readFileSync('public/index.html','utf8');
 const files=[...html.matchAll(/<script src="([^"]+)"/g)].map(match=>match[1]);
 assert(files.length>20);
 assert.doesNotThrow(()=>new vm.Script(files.map(file=>fs.readFileSync('public/'+file,'utf8')).join('\n;\n')));
});
test('reviewed conversation stages cover every turn and use their measured audio offsets',()=>{
 const {lifecycles:authored,words:reviewedAtlasWords}=require('../scripts/conversation-scene-sources.cjs');
 assert.deepEqual(Object.keys(lifecycles),Object.keys(authored));
 const annotations=new Map(require('../public/idea-scenes.json').scenes.map(scene=>[scene.id,scene]));
 const entryByKey=new Map(vocabulary.entries.map(entry=>[normalize(entry.en)+'|'+entry.pos,entry]));
 const images=new Set();
 assert.equal(Object.keys(lifecycles).length,dialogues.size);
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
   if(reviewedAtlasWords.has(image.id)){
    assert(fs.statSync('public/'+image.path).size<=36*1024,image.path);
   }
   const annotation=annotations.get(image.id);
   assert.equal(annotation.sha256,image.sha256,id);
   assert(annotation.words.length>=2&&annotation.words.every(word=>Number.isFinite(word.x)&&Number.isFinite(word.y)),id);
   for(const word of annotation.words){
    const pos=posFor(word),entry=entryByKey.get(normalize(word.en)+'|'+pos);
    assert(entry?.ar&&entry.sceneIds.includes(image.id),word.en);
    const use=entry.sourceIds.map(index=>vocabulary.sources[index]).find(source=>
     source.type==='idea-word'&&source.id===image.id&&source.en===word.en&&source.ar===word.ar&&source.pos===pos);
    assert(use,word.en);
    assert.deepEqual(use.patternIds,annotation.patterns.map(pattern=>pattern.id),image.id);
    for(const voice of ['male','female']){
     const clip=trainingAudio[ideaWordCueId(word.en,voice)];
     if(clip){
      assert.equal(clip.text,word.en);
      assert(offline.has(clip.path),clip.path);
     }else assert.notEqual(process.env.DIALOGUE_AUDIO_REQUIRED,'1',word.en+' · '+voice);
    }
   }
   for(let turn=stage.from;turn<=stage.to;turn++){
    assert.equal(scenes[id].turns[turn].id,image.id,id);
    const recording=audio[id];
    if(recording){
     const cue=recording.turns[turn-1];
     assert(cue.start_ms<cue.end_ms,id);
    }else assert.notEqual(process.env.DIALOGUE_AUDIO_REQUIRED,'1',id);
   }
   next=stage.to+1;
  }
  assert.equal(next,dialogue.lines.length+1,id);
 }
 assert.equal(images.size,Object.keys(authored).length*4);
});
test('essential verbs, contractions and phrase units have Arabic meanings and real conversation uses',()=>{
 for(const [en,pos] of [['understand','VERB'],["I'll",'CONTR'],["I'd",'CONTR'],['could you tell me whether','PHRASE'],
  ['back in stock','PHRASE'],['sold out','PHRASE'],['on the way','PHRASE'],['pick up','PHRASE'],['as long as','PHRASE']]){
  const entry=vocabulary.entries.find(entry=>normalize(entry.en)===normalize(en)&&entry.pos===pos);
  assert(entry?.ar,en);
  assert(entry.sourceIds.some(index=>{
   const source=vocabulary.sources[index];
   return source.type==='dialogue'&&includesTerm(source.en,en)&&source.sceneIds.length>0;
  }),en);
 }
 const phrase=vocabulary.entries.find(entry=>normalize(entry.en)==='back in stock'&&entry.pos==='PHRASE');
 const recording=audio['l3-200'];
 if(recording){
  const turn=recording.turns[1];
  const first=tokens(dialogues.get('l3-200').lines[1].en).map(normalize).indexOf('back');
  assert.deepEqual(phrase.audio.female,{path:recording.path,start_ms:turn.words[first].start_ms,end_ms:turn.words[first+2].end_ms,text:'back in stock'});
 }
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
