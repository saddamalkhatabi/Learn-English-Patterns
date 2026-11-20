(function(root,factory){
 const api=factory(typeof module==='object'?require('./vocabulary-core.js'):root.EPVocabulary);
 if(typeof module==='object')module.exports=api;
 else root.EPReferenceStudyAudio=api;
})(globalThis,function(vocabulary){
 const stages=[
  ['base','الجملة الأساسية','Main sentence','Main sentence.'],
  ['rule','شرح النمط','Rule explanation','Rule explanation.'],
  ['examples','أمثلة النمط','Pattern examples','Pattern examples. Listen to how the structure is used.'],
  ['words','توسيع المفردات','Vocabulary expansion','Vocabulary expansion. Listen to words and phrases for this pattern.']
 ];
 function cueId(kind,text,voice){
  // Content-addressed names let the same rule or word reuse one recording across lessons.
  let key=0xcbf29ce484222325n;
  for(const unit of text.normalize('NFC'))key=BigInt.asUintN(64,(key^BigInt(unit.codePointAt(0)))*0x100000001b3n);
  return `reference-study-${kind}-${key.toString(16)}-${voice}`;
 }
 const formParts={
  "فعل مثبت (بدون don't)":'affirmative verb',
  'فعل بالمضارع البسيط':'simple present verb','جملة رئيسية':'main clause',
  'الفعل الأساسي':'base verb','فعل أساسي':'base verb','فعل مضارع':'present tense verb',
  'اسم مفرد أو غير معدود':'singular or uncountable noun','اسم مفرد':'singular noun',
  'اسم جمع':'plural noun','اسم علم':'proper noun','اسم':'noun','صفة':'adjective',
  'مكان':'place','جملة':'clause','فعل':'verb','أو':'or','مع':'with','،':','
 };
 function patternTitle(form,construction='statement'){
  const title=(form||construction.replaceAll('-',' '))
   .replace(/فعل مثبت \(بدون don't\)|فعل بالمضارع البسيط|جملة رئيسية|الفعل الأساسي|فعل أساسي|فعل مضارع|اسم مفرد أو غير معدود|اسم مفرد|اسم جمع|اسم علم|اسم|صفة|مكان|جملة|فعل|أو|مع|،/g,part=>formParts[part])
   .replace(/\s*\+\s*/g,', followed by ').replace(/\s*\/\s*/g,' or ')
   .replace(/\s*=\s*/g,', or ')
   .replace(/(^|[\s(])-ing\b/g,'$1the I N G form').replace(/\.{3}|…/g,' ')
   .replace(/\s+([,.!?])/g,'$1').replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');
  return `New pattern. ${title}.`;
 }
 function examples(base,study,lookup,references,guideFor){
  const authored=(study?.rows[base.id]?.examples||[]).map(lookup).filter(row=>row&&row.id!==base.id);
  if(authored.length)return authored;
  const guide=guideFor(base),related=[];
  for(const row of references){
   if(row.id===base.id)continue;
   const candidate=guideFor(row);
   if(candidate.construction!==guide.construction||candidate.form!==guide.form)continue;
   related.push(row);
   if(related.length===4)break;
  }
  return related;
 }
 function words(base,examples,scenes){
  const chosen=new Map();
  for(const row of [base,...examples]){
   const candidates=(scenes?.[row.id]?.words||[]).filter(word=>word.en&&word.ar&&vocabulary.includesTerm(row.en,word.en));
   let count=0;
   for(const word of candidates){
    const key=vocabulary.normalize(word.en);
    if(chosen.has(key))continue;
    chosen.set(key,{...word,row});
    if(chosen.size===8)return [...chosen.values()];
    if(++count===3)break;
   }
  }
  return [...chosen.values()];
 }
 function termIndexes(displayed,word){
  const wanted=vocabulary.tokens(word).map(vocabulary.normalize);
  const tokens=displayed.flatMap((part,index)=>vocabulary.tokens(part).map(value=>({index,word:vocabulary.normalize(value)})));
  if(!wanted.length)return [];
  const start=tokens.findIndex((_,i)=>wanted.every((value,j)=>tokens[i+j]?.word===value));
  return start<0?[]:[...new Set(tokens.slice(start,start+wanted.length).map(token=>token.index))];
 }
 function guideGap(kind){
  return {title:500,heading:330,word:480,context:760,sentence:420,rule:550}[kind]||0;
 }
 const voiceModes=['pattern','stage','male','female'];
 function guideVoice(mode,first,index,stage,indexedStages){
  if(mode==='male'||mode==='female')return mode;
  const offset=mode==='stage'?index*indexedStages.length+indexedStages.indexOf(stage):index;
  return offset%2===0?first:first==='male'?'female':'male';
 }
 function wordExcerpt(word,text,voice,sameSpeech){
  const recording=word.row.recordings?.[voice],cues=recording?.words;
  if(!recording?.path||!cues?.length)return null;
  const normalize=value=>vocabulary.tokens(value||'').map(vocabulary.normalize).join(' ');
  const phrase=vocabulary.tokens(text).map(vocabulary.normalize);
  if(!phrase.length)return null;
  const first=cues.findIndex((_,i)=>phrase.every((part,j)=>sameSpeech(normalize(cues[i+j]?.text),part)));
  if(first<0)return null;
  const last=first+phrase.length-1;
  return {path:recording.path,start_ms:Math.max(cues[first-1]?.end_ms||0,cues[first].start_ms-25),
   end_ms:Math.min(cues[last+1]?.start_ms||recording.duration_ms,cues[last].end_ms+35)};
 }
 return {stages,cueId,patternTitle,examples,words,termIndexes,guideGap,voiceModes,guideVoice,wordExcerpt};
});
