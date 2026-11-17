const fs=require('node:fs'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const nlp=require('wink-nlp')(require('wink-eng-lite-web-model'));
const {normalize,tokens,posFor,includesTerm}=require('../public/vocabulary-core.js');
const sceneGuide=require('../public/scene-guide.js');
const english=require('../public/english-usage.js');
const read=name=>require('../public/'+name+'.json');
const {makeReferenceStudy}=require('./reference-study.cjs');
const ideas=read('idea-scenes'),dialogues=[...read('dialogues').dialogues,...read('english-practice').dialogues],art=read('conversation-scenes').scenes;
const learningLevels=read('learning-levels');
const referenceRows=read('source-corpus').sentences;
const referenceStudy=makeReferenceStudy(referenceRows,[read('pilot'),read('expansion-media')],learningLevels.sentences);
const studyWords=new Map();
const regionalAudio=read('english-usage-audio');
const imageWords=require('../production/scene-word-maps.json');
const detectedWords=require('../production/scene-detected-words.json').scenes;
const glossary=new Map(fs.readFileSync('production/vocabulary-glosses.tsv','utf8').trim().split(/\r?\n/).map(line=>{
 const [word,ar]=line.split('|');assert(word&&ar,line);return [normalize(word),ar];
}));
const senses=new Map(fs.readFileSync('production/vocabulary-senses.tsv','utf8').trim().split(/\r?\n/).map(line=>{
 const [word,pos,ar]=line.split('|');assert(word&&pos&&ar,line);return [normalize(word)+'|'+pos,ar];
}));
for(const scene of ideas.scenes)for(const word of scene.words)if(!glossary.has(normalize(word.en)))glossary.set(normalize(word.en),word.ar);
for(const words of Object.values(imageWords))for(const word of words)if(!glossary.has(normalize(word.en)))glossary.set(normalize(word.en),word.ar);
for(const words of Object.values(detectedWords))for(const word of words)if(!glossary.has(normalize(word.en)))glossary.set(normalize(word.en),word.ar);
const contractions={
 "i'm":'I am',"you're":'you are',"we're":'we are',"they're":'they are',"he's":'he is',"she's":'she is',
 "it's":'it is',"that's":'that is',"there's":'there is',"what's":'what is',"who's":'who is',
 "i've":'I have',"you've":'you have',"we've":'we have',"they've":'they have',
 "i'll":'I will',"you'll":'you will',"he'll":'he will',"she'll":'she will',"we'll":'we will',"they'll":'they will',
 "i'd":'I would',"you'd":'you would',"he'd":'he would',"she'd":'she would',"we'd":'we would',"they'd":'they would',
 "don't":'do not',"doesn't":'does not',"didn't":'did not',"isn't":'is not',"aren't":'are not',"wasn't":'was not',
 "weren't":'were not',"can't":'cannot',"couldn't":'could not',"won't":'will not',"wouldn't":'would not',
 "shouldn't":'should not',"haven't":'have not',"hasn't":'has not',"hadn't":'had not',"let's":'let us',
 "it'll":'it will',"how's":'how is',"everybody's":'everybody is',"everyone's":'everyone is',"everything's":'everything is'
};
const sources=[],entries=new Map(),sourceTokens=[],sourceAudio=new Map(),sceneWords={},sentenceRows=new Map();
const audio=read('training-audio');
const catalog=read('pattern-catalog').patterns;
function add(en,pos,lemma,sourceId,voiceAudio){
 const word=normalize(en),key=word+'|'+pos;
 if(!entries.has(key))entries.set(key,{id:'lex-'+crypto.createHash('sha256').update(key).digest('hex').slice(0,16),en,lemma,
  ar:senses.get(key)||senses.get(lemma+'|'+pos)||glossary.get(word)||glossary.get(lemma)||'',
  pos,sourceIds:new Set(),sceneIds:new Set(),patternIds:new Set(),audio:{}});
 const entry=entries.get(key),source=sources[sourceId];
 entry.sourceIds.add(sourceId);
 source.sceneIds.forEach(id=>entry.sceneIds.add(id));
 source.patternIds.forEach(id=>entry.patternIds.add(id));
 if(voiceAudio)for(const [voice,clip] of Object.entries(voiceAudio))if(!entry.audio[voice])entry.audio[voice]=clip;
 return entry;
}
function addSource(source,recordings={}){
 const registry=source.type==='dialogue'?learningLevels.dialogues:source.type==='sentence'?learningLevels.sentences:learningLevels.scenes;
 source.level=source.level||registry[source.id];
 assert(source.level,`Missing learning level for ${source.type} ${source.id}`);
 const sourceId=sources.length;sources.push(source);
 if(Object.keys(recordings).length)sourceAudio.set(sourceId,recordings);
 const raw=tokens(source.en),expanded=source.en.replace(/[a-zA-Z]+['’][a-zA-Z]+/g,word=>contractions[normalize(word)]||word);
 const parsed=new Map();
 nlp.readDoc(expanded).tokens().each(token=>{
  const pos=token.out(nlp.its.pos),value=normalize(token.out());
  if(!tokens(value).length||pos==='PUNCT'||pos==='SPACE')return;
  if(!parsed.has(value))parsed.set(value,[]);
  parsed.get(value).push({pos,lemma:normalize(token.out(nlp.its.lemma))});
 });
 const words=raw.map((word,index)=>{
  const normal=normalize(word),contract=contractions[normal];
  const tagged=contract?{pos:'CONTR',lemma:normal}:parsed.get(normal)?.shift()||{pos:'X',lemma:normal};
  if(source.pos&&raw.length===1)tagged.pos=source.pos;
  else if(/^(?:every|some|any|no)(?:thing|one|body)$/.test(normal))tagged.pos='PRON';
  else if(tagged.pos==='VERB'&&normal==='right'&&/^(?:right[.!?,]|.*\b(?:all|you're|you are|that's|were|was|is|the) right\b)/i.test(source.en))
   tagged.pos=/^right[.!?,]|\ball right\b/i.test(source.en)?'INTJ':/\bthe right\b/i.test(source.en)?'NOUN':'ADJ';
  else if(tagged.pos==='VERB'&&['breakfast','lunch','dinner'].includes(normal)&&/\b(?:have|has|had|eat|eats|ate|skip|skips|skipped|after|before|for)\s+(?:a\s+)?(?:breakfast|lunch|dinner)\b/i.test(source.en))
   tagged.pos='NOUN';
  if(tagged.pos==='X'){
   const fallback={in:'ADP',cannot:'AUX',ill:'ADJ',no:'DET',i:'PRON',wash:'VERB',sun:'NOUN'};
   tagged.pos=fallback[normal]||(normal.endsWith("'s")?(/^[A-Z]/.test(word)?'PROPN':'NOUN'):'X');
  }
  const recording={};
  for(const [voice,clip] of Object.entries(recordings)){
   const cue=clip.words?.[index];
   if(cue&&normalize(source.en.split(/\s+/)[index]?.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9'’]+$/g,''))===normal)
    recording[voice]={path:clip.path,start_ms:cue.start_ms,end_ms:cue.end_ms,text:word};
  }
  const entry=add(word,tagged.pos,tagged.lemma,sourceId,recording);
  if(contract){
   const alternate=normal.endsWith("'d")?contract.replace(/ would$/,' had'):
    normal.endsWith("'s")?contract.replace(/ is$/,' has'):contract;
   entry.expansion=alternate===contract?contract:contract+' / '+alternate;
  }
  return {en:word,ar:entry.ar,pos:tagged.pos,termId:entry.id};
 });
 sourceTokens.push(new Set(raw.map(normalize)));
 if(source.type==='sentence'||source.type==='reference-example')studyWords.set(source.id,words);
 return words;
}
function phraseRecordings(phrase,sourceId){
 const recordings=sourceAudio.get(sourceId);
 if(!recordings)return;
 const words=sources[sourceId].en.split(/\s+/).map(word=>tokens(word).map(normalize));
 const terms=tokens(phrase).map(normalize);
 const from=words.findIndex((_,index)=>terms.every((term,offset)=>{
  const word=words[index+offset];
  return word?.length===1&&word[0]===term;
 }));
 if(from<0)return;
 const to=from+terms.length-1;
 return Object.fromEntries(Object.entries(recordings).flatMap(([voice,clip])=>{
  if(clip.words?.length!==words.length)return [];
  const start=clip.words[from].start_ms,end=clip.words[to].end_ms;
  return Number.isFinite(start)&&Number.isFinite(end)&&end>start?
   [[voice,{path:clip.path,start_ms:start,end_ms:end,text:phrase}]]:[];
 }));
}
for(const name of ['pilot','expansion-media','source-corpus','supplement'])for(const row of read(name).sentences){
 const patterns=row.pattern_id?[row.pattern_id]:(row.pattern_ids||[]).map(id=>catalog.find(pattern=>pattern.id===id)?.planned_pattern_id||id);
 const sceneIds=row.image?.crop&&['assistant-reviewed','visually_reviewed','imported-unreviewed'].includes(row.image.status)?['scene-'+row.id]:[];
 const source={type:'sentence',id:row.id,en:row.en,ar:row.ar,patternIds:patterns,sceneIds};
 const words=addSource(source,row.recordings);
 sentenceRows.set(row.id,row);
 const reviewed=imageWords[row.id],mapped=reviewed||detectedWords[row.id]||[];
 const mappedTerms=new Set(mapped.map(word=>normalize(word.en)+'|'+word.pos));
 mapped.forEach(word=>{
  const entry=add(word.en,word.pos,normalize(word.en),sources.length-1);
  if(!entry.ar)entry.ar=word.ar;
 });
 const sentenceVocabulary=words.filter(word=>['NOUN','PROPN','VERB','ADJ','ADV','CONTR'].includes(word.pos)&&
  !mappedTerms.has(normalize(word.en)+'|'+word.pos));
 sceneWords[row.id]={reviewed:Boolean(reviewed),words:[...mapped,...sentenceVocabulary]};
}
for(const {id,en,ar,uk,level,referenceId,patternIds} of Object.values(referenceStudy.examples)){
 addSource({type:'reference-example',id,en,ar,uk,level,referenceId,patternIds,sceneIds:[]});
}
for(const dialogue of dialogues){
 const originalRecording=read('dialogue-audio')[dialogue.id];
 const regional=regionalAudio.dialogues[dialogue.id];
 dialogue.lines.forEach((line,index)=>{
  const image=art[dialogue.id]?.turns[index+1]||art[dialogue.id]?.cover;
  const original=sentenceRows.get(line.scene)?.image;
  const sceneIds=image?[image.id]:original?.crop&&['assistant-reviewed','visually_reviewed','imported-unreviewed'].includes(original.status)?['scene-'+line.scene]:[];
  const recording=regional?.signature[index]?.[0]===line.en?regional:originalRecording;
  const turn=recording?.turns[index],recordings=turn?{[line.voice]:{path:recording.path,words:turn.words}}:{};
  addSource({type:'dialogue',id:dialogue.id,turn:index,en:line.en,ar:line.ar,title:dialogue.ar,
   patternIds:line.patterns,sceneIds},recordings);
 });
}
for(const scene of ideas.scenes){
 const patternIds=scene.patterns.map(pattern=>pattern.id);
 addSource({type:'idea',id:scene.id,en:scene.sentenceEn,ar:scene.sentenceAr,patternIds,sceneIds:[scene.id]});
 for(const word of scene.words){
  // Image briefs explicitly identify the grammatical role of these labels.
  const pos=posFor(word);
  addSource({type:'idea-word',id:scene.id,en:word.en,ar:word.ar,pos,patternIds,sceneIds:[scene.id]});
  const sourceId=sources.length-1;
  const entry=add(word.en,pos,normalize(word.en),sourceId);
  if(!entry.ar)entry.ar=word.ar;
 }
 for(const pattern of scene.patterns.filter(pattern=>pattern.en))addSource({type:'idea-example',id:scene.id,pattern:pattern.id,en:pattern.en,ar:pattern.ar,patternIds:[pattern.id],sceneIds:[scene.id]});
}
const guidePatternForms=new Map(['pilot','expansion-media'].flatMap(name=>read(name).patterns.map(pattern=>[pattern.id,pattern.form])));
const guideFor=scene=>sceneGuide.make(scene,id=>guidePatternForms.get(id),learningLevels.scenes[scene.id]);
const guideScenes=new Map();
const expressionScenes=new Map();
const priority=new Set(learningLevels.starterScenes);
for(const scene of [...ideas.scenes].sort((a,b)=>Number(priority.has(b.id))-Number(priority.has(a.id)))){
 const key=scene.topic+'|'+learningLevels.scenes[scene.id];
 if(!guideScenes.has(key))guideScenes.set(key,scene);
 for(const question of guideFor(scene).questions){
  if(!expressionScenes.has(question.phrase))expressionScenes.set(question.phrase,scene);
 }
}
const extraGuideScenes=ideas.scenes.filter(scene=>priority.has(scene.id)||scene.id==='conv-life-l3-200-1');
for(const scene of new Set([...extraGuideScenes,...guideScenes.values(),...expressionScenes.values()])){
 guideFor(scene).questions.forEach((question,step)=>{
  const context={id:scene.id,step,title:scene.ar,patternIds:question.model?.id?[question.model.id]:[],sceneIds:[scene.id]};
  addSource({...context,type:'idea-guide',en:question.en,ar:question.ar});
  if(question.answer)addSource({...context,type:'idea-guide-reply',en:question.answer[0],ar:question.answer[1]});
 });
}
const phrases=new Map(fs.readFileSync('production/vocabulary-phrases.tsv','utf8').trim().split(/\r?\n/).map(line=>{
 const [phrase,ar]=line.split('|');return [normalize(phrase),[phrase,ar]];
}));
for(const [phrase,ar] of Object.entries(sceneGuide.phrases))if(!phrases.has(phrase))phrases.set(phrase,[phrase,ar]);
for(const [phrase,ar] of phrases.values()){
 const first=normalize(tokens(phrase)[0]);
 sources.forEach((source,index)=>{
  if(sourceTokens[index].has(first)&&includesTerm(source.en,phrase)){
   const entry=add(phrase,'PHRASE',normalize(phrase),index,phraseRecordings(phrase,index));
   entry.ar=ar;entry.common=true;
   if(english.shared.has(normalize(phrase)))entry.shared=true;
   studyWords.get(source.id)?.push({termId:entry.id});
  }
 });
}
for(const entry of entries.values()){
 for(const voice of ['male','female']){
  const id=require('../public/training-narration.js').ideaWordCueId(entry.en,voice),clip=audio[id];
  if(clip?.text.toLowerCase()===entry.en.toLowerCase())entry.audio[voice]={path:clip.path,text:clip.text};
 }
 entry.sourceIds=[...entry.sourceIds];entry.sceneIds=[...entry.sceneIds];entry.patternIds=[...entry.patternIds];
}
const regionalEntries=new Map();
function addRegional(source,index,{id,kind,ar,pos,us,uk}){
 const key=id+'|'+normalize(us)+'|'+normalize(uk);
 if(!regionalEntries.has(key))regionalEntries.set(key,{id:'use-'+crypto.createHash('sha256').update(key).digest('hex').slice(0,16),
  en:us,uk,family:id,kind,ar,pos,sourceIds:new Set(),sceneIds:new Set(),patternIds:new Set(),audio:{}});
 const entry=regionalEntries.get(key);
 entry.sourceIds.add(index);
 source.sceneIds.forEach(id=>entry.sceneIds.add(id));
 source.patternIds.forEach(id=>entry.patternIds.add(id));
 return entry;
}
for(const [index,source] of sources.entries()){
 for(const change of english.analyze(source.en,source).changes){
  if(source.uk&&!includesTerm(source.uk,change.uk))continue;
  const rule=english.familyById.get(change.id);
  const entry=addRegional(source,index,{...change,ar:rule.ar,pos:rule.pos});
  if(change.region==='us')for(const [voice,clip] of Object.entries(phraseRecordings(change.us,index)||{})){
   if(!entry.audio[voice])entry.audio[voice]=clip;
  }
 }
 const pair=referenceStudy.examples[source.id]?.pair;
 if(pair){
  const [id,kind,us,uk,ar,pos]=pair;
  addRegional(source,index,{id,kind,ar,pos,us,uk});
 }
}
const regional=[...regionalEntries.values()].map(entry=>({...entry,sourceIds:[...entry.sourceIds],
 sceneIds:[...entry.sceneIds],patternIds:[...entry.patternIds]}));
const atlas={schema:1,classification:'contextual-automatic-with-reviewed-image-labels',sources,entries:[...entries.values()],regional};
const termsById=new Map([...atlas.entries,...regional].map(entry=>[entry.id,entry]));
for(const entry of regional)for(const index of entry.sourceIds)studyWords.get(sources[index].id)?.unshift({termId:entry.id});
const studyPositions=new Set(['VERB','ADJ','NOUN','ADV','PHRASE']);
const genericStudyWords=new Set(['be','do','go','get','have','say','thing','very','really','some']);
for(const row of referenceRows){
 const study=referenceStudy.rows[row.id],terms=new Map();
 for(const id of [row.id,...study.examples]){
  const words=studyWords.get(id)||[];
  const usable=new Set(words.map(word=>word.termId));
  for(const termId of usable){
   const entry=termsById.get(termId);
   if(!entry?.ar||!studyPositions.has(entry.pos)||genericStudyWords.has(entry.lemma))continue;
   const key=entry.pos+'|'+entry.lemma;
   if(!terms.has(key))terms.set(key,{id:entry.id,pos:entry.pos,count:0});
   terms.get(key).count++;
  }
 }
 const byFrequency=[...terms.values()].sort((a,b)=>b.count-a.count);
 study.terms=[...studyPositions].flatMap(pos=>byFrequency.filter(term=>term.pos===pos).slice(0,3).map(term=>term.id));
}
for(const example of Object.values(referenceStudy.examples))delete example.pair;
fs.writeFileSync('public/vocabulary-index.json',JSON.stringify(atlas)+'\n');
fs.writeFileSync('public/scene-vocabulary.json',JSON.stringify({schema:1,sentences:sceneWords})+'\n');
fs.writeFileSync('public/reference-study.json',JSON.stringify(referenceStudy)+'\n');
console.log(JSON.stringify({vocabulary:entries.size,sources:sources.length,sentenceLists:Object.keys(sceneWords).length}));
