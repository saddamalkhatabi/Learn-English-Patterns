const assert=require('node:assert/strict');
const audio=require('../public/reference-study-audio.js');
const english=require('../public/english-usage.js');
const {describeReference}=require('../public/teaching-core.js');
const {ideaWordCueId,spokenComparisonNote,spokenTrainingCue}=require('../public/training-narration.js');
const load=name=>require(`../public/${name}.json`);
const voices=['male','female'];

module.exports=function referenceStudyCues(existing){
 const regions=load('english-usage-audio').sentences;
 const project=row=>english.projectSentence(row,regions[row.id]);
 const references=load('source-corpus').sentences.map(project);
 const parts=['pilot','expansion-media'].map(load);
 const course=new Map(parts.flatMap(part=>part.sentences).map(project).map(row=>[row.id,row]));
 const patterns=new Map(parts.flatMap(part=>part.patterns).map(row=>[row.id,row]));
 const catalog=load('pattern-catalog').patterns;
 const curriculum=new Map(load('curriculum').patterns.map(row=>[row.id,row]));
 const study=load('reference-study'),scenes=load('scene-vocabulary').sentences;
 const rows=new Map([...course,...references.map(row=>[row.id,row])]);
 const lookup=id=>study.examples[id]||rows.get(id);
 const guides=new Map(references.map(row=>[row.id,describeReference(row)]));
 const cues={};
 function add(kind,text,voice){
  const id=audio.cueId(kind,text,voice);
  assert(!cues[id]||cues[id]===text,`Conflicting narration for ${id}`);
  cues[id]=text;
 }
 function addLesson(base,examples){
  for(const row of examples){
   const text=english.analyze(row.en,row).us;
   for(const voice of voices)if(!row.recordings?.[voice]?.path)add('example',text,voice);
  }
  for(const word of audio.words(base,examples,scenes)){
   const text=word.en;
   for(const voice of voices){
    const prior=existing[ideaWordCueId(word.en,voice)];
    if(prior&&english.sameSpeech(prior,text))continue;
    add('word',text,voice);
   }
  }
 }
 for(const [,,,text] of audio.stages)for(const voice of voices)add('stage',text,voice);
 for(const row of catalog){
  const id=row.planned_pattern_id||row.id,pattern=patterns.get(id);
  if(!pattern)continue;
  const [base,...examples]=(row.published_sentence_ids||row.examples.map(example=>example.id)).map(key=>course.get(key)).filter(Boolean);
  if(!base)continue;
  for(const voice of voices)add('title',audio.patternTitle(row.form),voice);
  const text=english.analyze(spokenTrainingCue('explanation-intro',pattern,curriculum.get(id)||pattern.lesson)).us;
  add('rule',text,'male');
  if(!english.sameSpeech(existing[`explanation-intro-${id}`]||'',text))add('rule',text,'female');
  addLesson(base,examples);
 }
 for(const row of references){
  const guide=guides.get(row.id),rule=guide.rule_en;
  for(const voice of voices)add('title',audio.patternTitle(guide.form,guide.construction),voice);
  if(rule){
   const text=english.analyze(spokenComparisonNote(rule),row).us;
   for(const voice of voices)add('rule',text,voice);
  }
  addLesson(row,audio.examples(row,study,lookup,references,example=>guides.get(example.id)));
 }
 return cues;
};
