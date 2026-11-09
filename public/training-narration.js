/* The same words feed the recorded cues and the system voice fallback. */
const trainingCueLabels={
 'pattern-intro':['بداية النمط','New pattern'],
 'explanation-intro':['شرح القاعدة','Rule explanation'],
 'dialogue-intro':['تطبيق بالمحادثة','Conversation practice']
};
const spokenFormParts={
 'جملة رئيسية':'main clause','الفعل الأساسي':'base verb','فعل أساسي':'base verb',
 "فعل مثبت (بدون don't)":'affirmative verb without do not','فعل بالمضارع البسيط':'verb in the simple present',
 'فعل مضارع':'present-tense verb','مكان':'place','جملة':'clause','فعل':'verb','،':','
};
function spokenTrainingCue(kind,pattern,meta){
 if(kind==='dialogue-intro')return 'Conversation practice. Listen to how the speakers use the pattern in a real situation.';
 if(!pattern)return '';
 const form=pattern.form.replace(/فعل مثبت \(بدون don't\)|فعل بالمضارع البسيط|جملة رئيسية|الفعل الأساسي|فعل أساسي|فعل مضارع|مكان|جملة|فعل|،/g,part=>spokenFormParts[part])
  .replace(/\s*\+\s*/g,', followed by ').replace(/\s*\/\s*/g,', or ');
 const rule=meta?.explanation_en||pattern.lesson?.explanation_en||pattern.comparison?.en||'';
 return kind==='pattern-intro'?`New pattern. The structure is: ${form}. ${rule}`:`Rule explanation. ${rule}`;
}
function trainingCueId(kind,pattern){return kind==='dialogue-intro'?kind:`${kind}-${pattern?.id}`}
function spokenComparison(item){
 const title=item.en.trim().replace(/[.!?]+$/,'');
 return `Next comparison. ${title}.\n${spokenComparisonNote(item.noteEn)}`;
}
function spokenComparisonNote(note){
 const text=note.trim().replace(/-ing\b/g,'I N G').replace(/\s*\/\s*/g,' or ');
 return /[.!?]$/.test(text)?text:text+'.';
}
function ideaWordCueId(text,voice){
 return `idea-word-${text.toLowerCase().trim().replace(/'/g,'-apostrophe-').replace(/\s+/g,'-')}-${voice}`;
}
function ideaSceneCueId(scene,pattern,voice){
 return `idea-example-${scene}-${pattern}-${voice}`;
}
function narrateTrainingCue(kind,pattern,rate=1){
 const text=spokenTrainingCue(kind,pattern,pattern&&learningMeta(pattern.id));
 const recording=PILOT?.trainingAudio?.[trainingCueId(kind,pattern)];
 if(recording?.text===text){
  const audio=new Audio(recording.path);audio.playbackRate=rate;
  let finish,fallback,stopped=false;
  const done=new Promise(resolve=>{finish=resolve});
  const recover=()=>{
   if(stopped||fallback)return;
   fallback=synthesizeTrainingCue(text,rate);fallback.done.then(finish);
  };
  audio.addEventListener('ended',()=>finish(true),{once:true});
  audio.addEventListener('error',recover,{once:true});
  audio.play().catch(recover);
  return {done,stop(){stopped=true;audio.pause();fallback?.stop();finish(false)}};
 }
 return synthesizeTrainingCue(text,rate);
}
function synthesizeTrainingCue(text,rate,role='female'){
 const synth=window.speechSynthesis;
 if(!synth||!window.SpeechSynthesisUtterance||!text)return {done:Promise.resolve(false),stop(){}};
 let finish,timer,settled=false;
 const done=new Promise(resolve=>{finish=resolve});
 const voice=new SpeechSynthesisUtterance(text);
 voice.lang='en-US';voice.rate=rate;
 const available=synth.getVoices().filter(v=>/^en\b/i.test(v.lang));
 const preferred=role==='male'?state.voiceFirst:state.voiceSecond;
 voice.voice=available.find(v=>v.name===preferred)||available.find(v=>v.localService)||available[0]||null;
 function end(result){if(settled)return;settled=true;clearTimeout(timer);finish(result)}
 voice.onend=()=>end(true);voice.onerror=()=>end(false);
 const stop=()=>{if(settled)return;end(false);synth.cancel()};
 timer=setTimeout(stop,Math.max(15000,text.split(/\s+/).length*1000));
 try{synth.speak(voice)}catch{end(false)}
 return {done,stop};
}
let lessonCue;
function playLessonStageCue(){
 const kind=({0:'pattern-intro',1:'explanation-intro',6:'dialogue-intro'})[stage];
 if(!kind)return;
 const pattern=PILOT?.patterns.find(p=>p.id===current.id)||current;
 lessonCue?.stop();
 lessonCue=narrateTrainingCue(kind,pattern,state.rate||1);
}
function replayLessonStageCue(){stopSpeech();playLessonStageCue()}
if(typeof module!=='undefined')module.exports={spokenTrainingCue,trainingCueId,spokenComparison,spokenComparisonNote,ideaWordCueId,ideaSceneCueId};
else{
 const stopSpeechBeforeTrainingCue=stopSpeech;
 stopSpeech=function(){lessonCue?.stop();lessonCue=null;stopSpeechBeforeTrainingCue()};
}
