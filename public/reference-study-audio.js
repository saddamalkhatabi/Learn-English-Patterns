(function(root,factory){
 const api=factory(typeof module==='object'?require('./vocabulary-core.js'):root.EPVocabulary);
 if(typeof module==='object')module.exports=api;
 else root.EPReferenceStudyAudio=api;
})(globalThis,function(vocabulary){
 const stages=[
  ['base','الجملة الأساسية','Main sentence','New pattern. Main sentence.'],
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
   const candidates=(scenes?.[row.id]?.words||[]).filter(word=>word.en&&word.ar);
   const relevant=word=>vocabulary.includesTerm(row.en,word.en);
   const ordered=[...candidates.filter(relevant),...candidates.filter(word=>
    !relevant(word)&&Number.isFinite(word.x)&&Number.isFinite(word.y))];
   let count=0;
   for(const word of ordered){
    const key=vocabulary.normalize(word.en);
    if(chosen.has(key))continue;
    chosen.set(key,{...word,row});
    if(chosen.size===8)return [...chosen.values()];
    if(++count===3)break;
   }
  }
  return [...chosen.values()];
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
 return {stages,cueId,examples,words,wordExcerpt};
});
