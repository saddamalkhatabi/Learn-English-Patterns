const fs=require('node:fs'),assert=require('node:assert/strict');
const crypto=require('node:crypto');
const nlp=require('wink-nlp')(require('wink-eng-lite-web-model'));
const {normalize,tokens,posFor,includesTerm}=require('../public/vocabulary-core.js');
const read=name=>require('../public/'+name+'.json');
const ideas=read('idea-scenes'),dialogues=read('dialogues').dialogues,art=read('conversation-scenes').scenes;
const imageWords=require('../production/scene-word-maps.json');
const glossary=new Map(fs.readFileSync('production/vocabulary-glosses.tsv','utf8').trim().split(/\r?\n/).map(line=>{
 const [word,ar]=line.split('|');assert(word&&ar,line);return [normalize(word),ar];
}));
const senses=new Map(fs.readFileSync('production/vocabulary-senses.tsv','utf8').trim().split(/\r?\n/).map(line=>{
 const [word,pos,ar]=line.split('|');assert(word&&pos&&ar,line);return [normalize(word)+'|'+pos,ar];
}));
for(const scene of ideas.scenes)for(const word of scene.words)if(!glossary.has(normalize(word.en)))glossary.set(normalize(word.en),word.ar);
for(const words of Object.values(imageWords))for(const word of words)if(!glossary.has(normalize(word.en)))glossary.set(normalize(word.en),word.ar);
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
const sources=[],entries=new Map(),sourceTokens=[],sceneWords={},sentenceRows=new Map();
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
 const sourceId=sources.length;sources.push(source);
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
  if(contract)entry.expansion=contract;
  return {en:word,ar:entry.ar,pos:tagged.pos,termId:entry.id};
 });
 sourceTokens.push(new Set(raw.map(normalize)));
 return words;
}
for(const name of ['pilot','expansion-media','source-corpus','supplement'])for(const row of read(name).sentences){
 const patterns=row.pattern_id?[row.pattern_id]:(row.pattern_ids||[]).map(id=>catalog.find(pattern=>pattern.id===id)?.planned_pattern_id||id);
 const sceneIds=row.image?.crop&&['assistant-reviewed','visually_reviewed','imported-unreviewed'].includes(row.image.status)?['scene-'+row.id]:[];
 const source={type:'sentence',id:row.id,en:row.en,ar:row.ar,patternIds:patterns,sceneIds};
 const words=addSource(source,row.recordings);
 sentenceRows.set(row.id,row);
 const mapped=imageWords[row.id];
 if(mapped){
  mapped.forEach(word=>add(word.en,word.pos,normalize(word.en),sources.length-1).ar=word.ar);
 }
 sceneWords[row.id]={reviewed:Boolean(mapped),words:mapped||words.filter(word=>['NOUN','PROPN','VERB','ADJ','ADV','CONTR'].includes(word.pos))};
}
for(const dialogue of dialogues){
 const recording=read('dialogue-audio')[dialogue.id];
 dialogue.lines.forEach((line,index)=>{
  const image=art[dialogue.id]?.turns[index+1]||art[dialogue.id]?.cover;
  const original=sentenceRows.get(line.scene)?.image;
  const sceneIds=image?[image.id]:original?.crop&&['assistant-reviewed','visually_reviewed','imported-unreviewed'].includes(original.status)?['scene-'+line.scene]:[];
  const turn=recording?.turns[index],recordings=turn?{[line.voice]:{path:recording.path,words:turn.words}}:{};
  addSource({type:'dialogue',id:dialogue.id,turn:index,en:line.en,ar:line.ar,title:dialogue.ar,
   patternIds:line.patterns,sceneIds},recordings);
 });
}
for(const scene of ideas.scenes){
 addSource({type:'idea',id:scene.id,en:scene.sentenceEn,ar:scene.sentenceAr,patternIds:[],sceneIds:[scene.id]});
 for(const word of scene.words){
  addSource({type:'idea-word',id:scene.id,en:word.en,ar:word.ar,patternIds:[],sceneIds:[scene.id]});
  // Image briefs explicitly identify the grammatical role of these labels.
  const sourceId=sources.length-1;
  const entry=add(word.en,posFor(word),normalize(word.en),sourceId);
  entry.ar=word.ar;
 }
 for(const pattern of scene.patterns.filter(pattern=>pattern.en))addSource({type:'idea-example',id:scene.id,pattern:pattern.id,en:pattern.en,ar:pattern.ar,patternIds:[pattern.id],sceneIds:[scene.id]});
}
const phrases=fs.readFileSync('production/vocabulary-phrases.tsv','utf8').trim().split(/\r?\n/).map(line=>line.split('|'));
for(const [phrase,ar] of phrases){
 const first=normalize(tokens(phrase)[0]);
 sources.forEach((source,index)=>{
  if(sourceTokens[index].has(first)&&includesTerm(source.en,phrase))add(phrase,'PHRASE',normalize(phrase),index).ar=ar;
 });
}
for(const entry of entries.values()){
 for(const voice of ['male','female']){
  const id=require('../public/training-narration.js').ideaWordCueId(entry.en,voice),clip=audio[id];
  if(clip?.text.toLowerCase()===entry.en.toLowerCase())entry.audio[voice]={path:clip.path,text:clip.text};
 }
 entry.sourceIds=[...entry.sourceIds];entry.sceneIds=[...entry.sceneIds];entry.patternIds=[...entry.patternIds];
}
const atlas={schema:1,classification:'contextual-automatic-with-reviewed-image-labels',sources,entries:[...entries.values()]};
fs.writeFileSync('public/vocabulary-index.json',JSON.stringify(atlas)+'\n');
fs.writeFileSync('public/scene-vocabulary.json',JSON.stringify({schema:1,sentences:sceneWords})+'\n');
console.log(JSON.stringify({vocabulary:entries.size,sources:sources.length,sentenceLists:Object.keys(sceneWords).length}));
