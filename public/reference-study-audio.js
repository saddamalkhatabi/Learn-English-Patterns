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
 const lexicalTypes=new Set(['VERB','ADJ','NOUN','ADV','PHRASE']);
 const genericWords=new Set(("be am is are was were been being i'm you're he's she's it's we're they're " +
  "isn't aren't wasn't weren't ain't do does did done doing don't doesn't didn't " +
  "have has had having go get say thing very really some will would shall should can can't could may might must").split(' '));
 const structuralPhrases=new Set(['it is','it was','i am','there is','there are','is there','are there',
  'do you','does he','does she','did you','can i','can you','would you','could you']);
 function eligibleWord(word){
  const pos=word&&vocabulary.posFor(word);
  return Boolean(word?.ar&&(lexicalTypes.has(pos)||pos==='X'&&vocabulary.tokens(word.en).length>1)&&
   !structuralPhrases.has(vocabulary.normalize(word.en))&&
   ![word.en,word.lemma].some(text=>text&&genericWords.has(vocabulary.normalize(text))));
 }
 function studyWords(ids,entries,sources,lookup,priorRows){
  const prior=new Set(priorRows.map(row=>vocabulary.normalize(row.en))), used=new Set();
  const candidates=ids.map(id=>entries.get(id)).filter(eligibleWord).map(entry=>({
   entry,rows:entry.sourceIds.flatMap(index=>{
    const source=sources[index], row=source&&lookup(source.id);
    return row&&vocabulary.includesTerm(row.en,entry.en)?[row]:[];
   })
  }));
  const chosen=new Map();
  // Give terms with few contexts first choice, then preserve the atlas display order.
  for(const {entry,rows} of [...candidates].sort((a,b)=>a.rows.length-b.rows.length)){
   const available=rows.filter(row=>!used.has(vocabulary.normalize(row.en)));
   const row=available.find(row=>row.recordings?.male?.path&&row.recordings?.female?.path&&!prior.has(vocabulary.normalize(row.en)))||
    available.find(row=>!prior.has(vocabulary.normalize(row.en)))||available[0];
   if(!row)continue;
   used.add(vocabulary.normalize(row.en));
   chosen.set(entry.id,{...entry,row});
  }
  return ids.flatMap(id=>chosen.has(id)?[chosen.get(id)]:[]);
 }
 const specificPurpose={
  'This is my house.':['Whose house is this?','لمن هذا المنزل؟'],
  'I have a good job.':['How is your work situation?','كيف هو وضعك في العمل؟'],
  "I've got a job.":['Do you have a job now?','هل لديك عمل الآن؟'],
  'It was a joke.':['Were you being serious?','هل كنت تتحدث بجدية؟'],
  "What's your name?":['Ask someone you just met for their name.','اسأل شخصًا التقيته للتو عن اسمه.'],
  "I'm a student.":['What do you do?','ماذا تعمل؟'],
  'I forgot to close the window.':['Why is the window still open?','لماذا لا تزال النافذة مفتوحة؟'],
  "I'm from Yemen.":['Where are you from?','من أين أنت؟']
 };
 const questionPurposes=[
  [/^where\b/i,'Ask about a place or location.','اسأل عن المكان أو الموقع.'],
  [/^when\b/i,'Ask when something happens.','اسأل عن وقت حدوث شيء.'],
  [/^why\b/i,'Ask for the reason.','اسأل عن السبب.'],
  [/^who\b/i,'Ask about a person.','اسأل عن شخص.'],
  [/^whose\b/i,'Ask who something belongs to.','اسأل عن صاحب الشيء.'],
  [/^which\b/i,'Ask someone to choose between options.','اطلب الاختيار بين بدائل.'],
  [/^how many\b/i,'Ask for a number.','اسأل عن العدد.'],
  [/^how much\b.*\b(cost|pay|price)\b/i,'Ask about the price.','اسأل عن السعر.'],
  [/^how much\b/i,'Ask about the amount.','اسأل عن الكمية.'],
  [/^how long\b/i,'Ask about the duration or length.','اسأل عن المدة أو الطول.'],
  [/^how often\b/i,'Ask how often something happens.','اسأل عن تكرار حدوث شيء.'],
  [/^what (?:time|day)\b/i,'Ask for the time or day.','اسأل عن الوقت أو اليوم.']
 ];
 const descriptionPurposes=[
  [/^(?:this is|that is|these are|those are)\b/i,'Point out a person or thing.','أشر إلى شخص أو شيء.'],
  [/^(?:there (?:is|are|was|were)|there['’]s)\b/i,'Say what is or was there.','اذكر ما يوجد أو ما كان موجودًا.'],
  [/\b(?:usually|often|always|every day|on weekends)\b/i,'Describe a habit or routine.','صِف عادةً أو روتينًا.'],
  [/\b(?:look|looks|sound|sounds|seems)\b/i,'Describe an impression.','صِف انطباعًا.']
 ];
 function purposePrompt(row,guide){
  const cues=guide.purpose_en==='Ask for information'?questionPurposes:
   guide.purpose_en==='Describe or state a fact'?descriptionPurposes:[];
  const cue=cues.find(([match])=>match.test(row.en));
  const [en,ar]=specificPurpose[row.en]||cue?.slice(1)||[guide.purpose_en,guide.purpose_ar];
  return {en:en.replace(/[.!?]?$/,mark=>mark||'.'),ar};
 }
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
   const candidates=(scenes?.[row.id]?.words||[]).filter(word=>eligibleWord(word)&&vocabulary.includesTerm(row.en,word.en));
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
  return {title:500,heading:330,word:480,context:760,sentence:420,rule:550,purpose:500}[kind]||0;
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
 return {stages,cueId,patternTitle,examples,words,eligibleWord,studyWords,purposePrompt,termIndexes,guideGap,voiceModes,guideVoice,wordExcerpt};
});
