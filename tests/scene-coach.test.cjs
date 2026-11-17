const assert=require('node:assert/strict');
const test=require('node:test');
const {make,makeJourney}=require('../public/scene-guide.js');
const scenes=require('../public/idea-scenes.json').scenes;
const levels=require('../public/learning-levels.json');
const archive=require('../public/conversation-scenes.json');
const byId=new Map(scenes.map(scene=>[scene.id,scene]));
const dialogues=new Map([...require('../public/dialogues.json').dialogues,...require('../public/english-practice.json').dialogues]
 .map(dialogue=>[dialogue.id,dialogue]));
const forms=new Map(['pilot','expansion-media'].flatMap(name=>require('../public/'+name+'.json').patterns)
 .map(pattern=>[pattern.id,pattern.form]));
const patternForm=id=>forms.get(id);

test('photo guides have distinct bilingual rounds with playable lines and real anchors',()=>{
 const all=scenes.map(scene=>{
  const guide=make(scene,patternForm,levels.scenes[scene.id]);
  assert(guide.questions.some(question=>question.model?.form),scene.id);
  assert(guide.questions.some(question=>question.kind==='role'&&question.turn?.[0]),scene.id);
  assert(guide.questions.some(question=>question.kind==='followup'),scene.id);
  for(const question of guide.questions){
   assert(question.en&&question.ar&&question.label.every(Boolean)&&question.answer.every(Boolean),scene.id);
   assert(question.en.toLowerCase().includes(question.phrase),scene.id);
   for(const word of question.terms)assert(scene.words.includes(word),scene.id);
  }
  return guide.questions.map(question=>question.en).join('|');
 });
 assert.equal(new Set(all).size,scenes.length);
 const scene=byId.get('idea-home-01'),focus=scene.words.find(word=>word.en==='teapot');
 const original=make(scene,patternForm,'A1'),chosen=make(scene,patternForm,'A1',{focus});
 assert.equal(original.pattern.id,3);
 assert(chosen.questions[0].en.includes('teapot'));
 assert.notEqual(original.questions[0].en,chosen.questions[0].en);
 const echo=chosen.questions.find(question=>question.kind==='repeat');
 assert.equal(echo.answer[0],'teapot.');
 assert.equal(chosen.questions.find(question=>question.kind==='change'),undefined);
 const fallback=make({id:'ref-test',words:[{en:'a word',ar:'كلمة',pos:'NOUN'}],
  en:'Archive example',ar:'مثال مرجعي',sentenceEn:'I need to make a call.',sentenceAr:'أحتاج إلى إجراء مكالمة.'},patternForm,'A1');
 assert.match(fallback.questions[0].en,/Archive example/);
 assert.equal(fallback.questions[0].answer[0],'I need to make a call.');
});

test('journeys connect actual photos and roles and keep recorded turns inside the selected stage',()=>{
 for(const [id,life] of Object.entries(archive.lifecycles)){
  const dialogue=dialogues.get(id);
  const stages=life.stages.map(stage=>({...stage,scene:byId.get(archive.scenes[id].turns[stage.from].id)}));
  const row={dialogue,life,stages,level:levels.dialogues[id]};
  for(const role of ['male','female']){
   const guide=makeJourney(row,new Set(['0:1']),role,patternForm);
   assert.equal(guide.frames[0].detail,stages[0].scene.words[1]||stages[0].scene.words[0],id);
   assert.equal(guide.questions.length,stages.length+1,id);
   for(const [index,stage] of stages.entries()){
    const question=guide.questions[index],{answer,turn}=question.recordings;
    assert(question.frames.includes(index)&&question.goal.every(Boolean),id);
    if(index>0)assert(question.frames.includes(index-1),id);
    for(const [clip,voice] of [[answer,role==='male'?'female':'male'],[turn,role]]){
     if(clip===undefined)continue;
     assert(clip>=stage.from-1&&clip<=stage.to-1,id);
     assert.equal(dialogue.lines[clip].voice,voice,id);
    }
    if(answer!==undefined&&turn!==undefined)assert.equal(question.learnerStarts,turn<answer,id);
   }
   const ending=guide.questions.at(-1);
   assert(ending.hypothetical&&ending.frames.includes(0)&&ending.frames.includes(stages.length-1),id);
  }
 }
});
