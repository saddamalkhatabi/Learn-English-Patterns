const comparisonLevels={
 basic:['أساسي','Essential'],
 intermediate:['متوسط','Intermediate'],
 advanced:['متقدم','Advanced'],
};
const comparisonTypes={
 usage:['فروق الاستخدام','Usage'],
 sequence:['التسلسل والمراحل','Sequences'],
 relation:['العلاقات بين الأفكار','Relationships'],
 speech:['أساليب الكلام','Speaking styles'],
 errors:['أخطاء شائعة','Common errors'],
};
const comparisonLessonStages=[
 ['استمع واكتشف المعنى','Listen and discover'],
 ['افهم البناء','Understand the structure'],
 ['قارن الاستعمال','Compare usage'],
 ['استرجع الجملة','Recall the sentence'],
 ['عبّر بفكرة جديدة','Express a new idea'],
 ['جرّب الاختبار','Take the quiz'],
];
let patternComparisons=[];
let comparisonGuide=null;
fetch('comparisons.json').then(r=>r.ok?r.json():[]).then(rows=>{
 patternComparisons=rows;
 if(page==='comparisons')render();
}).catch(()=>{});

function comparisonsPage(){
 return head(T('المقارنات','Pattern comparisons'),T(
  'ابدأ بالفروق الأساسية، أو اختر التسلسل وأساليب الكلام والأخطاء الشائعة. استمع إلى الأمثلة مع الصور أو خذ وقتك في القراءة.',
  'Start with essential distinctions, or explore sequences, speaking styles and common errors. Hear the examples with scenes or read at your own pace.'))+
  `<div class="toolbar comparison-controls">
   ${comparisonSelect('level',T('المستوى','Level'),T('كل المستويات','All levels'),comparisonLevels)}
   ${comparisonSelect('type',T('نوع المقارنة','Comparison type'),T('كل الأنواع','All types'),comparisonTypes)}
   ${comparisonSelect('size',T('عدد الصيغ','Number of forms'),T('الكل','All'),{2:['ثنائية','Two'],3:['ثلاثية','Three'],4:['رباعية','Four'],5:['خمسة فأكثر','Five or more']})}
   <label>${T('وقفة القراءة','Reading break')} <select id="comparison-delay">
    <option value="8">8 s</option><option value="15" selected>15 s</option><option value="25">25 s</option><option value="45">45 s</option>
   </select></label>
   <label>${T('الصوت','Voice')} <select id="comparison-voice">
    <option value="alternate">${T('صوت مختلف لكل مقارنة','Alternate by comparison')}</option><option value="male">Adam</option><option value="female">Bella</option>
   </select></label>
   ${patternsImageControls()}
  </div>
  <div class="buttonrow">
   <button class="primary" id="comparison-listen-all" onclick="startComparisonGuide('listen')">▷ ${T('استمع إلى المقارنات بالتتابع','Listen to comparisons in sequence')}</button>
   <button class="secondary" id="comparison-read-all" onclick="startComparisonGuide('read')">${T('تصفّح للقراءة','Read in sequence')}</button>
  </div>
  <div id="comparison-guide"></div>
  <p id="comparison-count" role="status"></p>
  <div id="comparison-list"></div>`;
}
function comparisonSelect(key,label,all,values){
 return `<label>${label} <select id="comparison-${key}" onchange="resetComparisonSelection()">
  <option value="">${all}</option>${Object.entries(values).map(([value,names])=>`<option value="${value}">${T(...names)}</option>`).join('')}
 </select></label>`;
}
function visibleComparisons(){
 const size=Number($('#comparison-size')?.value);
 const level=$('#comparison-level')?.value;
 const type=$('#comparison-type')?.value;
 const levels=Object.keys(comparisonLevels);
 return patternComparisons.filter(item=>{
  const count=item.samples.length;
  return (!level||item.level===level)&&(!type||item.type===type)&&
   (!size||(size===5?count>=5:count===size));
 }).sort((left,right)=>levels.indexOf(left.level)-levels.indexOf(right.level));
}
function comparisonModel(example,pattern){
 const words=example.split(/\s+/);
 const fixed=new Set(pattern?EPTeaching.describe({en:example},pattern).highlight:[]);
 return words.map((word,i)=>`<span class="${fixed.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' ');
}
function comparisonStages(id){
 return `<details ontoggle="if(this.open&&this.closest('#comparison-guide'))pauseComparisonGuide()"><summary>${T('مراحل تدريب النمط','Pattern training stages')}</summary>
  <ol class="comparison-stages">${comparisonLessonStages.map((labels,index)=>
   `<li><button class="textlink" onclick="openLesson(${id},${index})">${T(...labels)} ↗</button></li>`
  ).join('')}</ol>
 </details>`;
}
function comparisonCards(item,showExamples,showDetails){
 const cards=item.patterns.map((id,i)=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  return `<article>
    <h3 class="pattern-form" dir="ltr" lang="en">${H(pattern?.form||item.examples[i])}</h3>
    ${showExamples?`<p dir="ltr" lang="en">${comparisonModel(item.examples[i],pattern)}</p>`:''}
    ${showDetails?`<details ontoggle="fillComparisonPattern(this,${id})">
     <summary>${T('القاعدة وأمثلة الدرس','Rule and lesson examples')}</summary><div></div>
    </details>${comparisonStages(id)}`:''}
  </article>`;
 });
 for(const sample of item.samples.slice(item.patterns.length)){
  const sentence=REFERENCE_CORPUS?.sentences.find(row=>row.id===sample.sentenceId);
  cards.push(`<article>
   <h3 class="pattern-form" dir="ltr" lang="en">${H(sample.form)}</h3>
   <small>${T('من مكتبة الألف جملة','From the 1,000-sentence library')}</small>
   ${showExamples&&sentence?`<p dir="ltr" lang="en">${EP.words(sentence)}</p>${EP.ar(sentence.ar)}`:''}
   ${showDetails&&sentence?referenceRule(sentence):''}
  </article>`);
 }
 return `<div class="comparison-examples">${cards.join('')}</div>`;
}
function fillComparisonPattern(details,id){
 if(!details.open||details.lastElementChild.hasChildNodes())return;
 if(details.closest('#comparison-guide'))pauseComparisonGuide();
 const lesson=learningMeta(id);
 const examples=sentenceRows(id).map(sentence=>`<p dir="ltr" lang="en">${EP.words(sentence)}</p>${EP.ar(sentence.ar)}`).join('');
 details.lastElementChild.innerHTML=EP.pair(lesson?.explanation_ar,lesson?.explanation_en)+examples;
}
function comparisonExercise(item){
 return `<p lang="en" dir="ltr">${H(item.question)}</p><div class="buttonrow">${item.options.map((option,i)=>
  `<button class="secondary" onclick="checkComparison('${H(item.id)}',${i},this)" lang="en" dir="ltr">${H(option)}</button>`).join('')}</div>
  <p role="status" class="comparison-feedback"></p>`;
}
function paintComparisonSelection(){
 const list=$('#comparison-list');
 if(!list)return;
 const items=visibleComparisons();
 const count=items.length;
 $('#comparison-count').textContent=T(`${count} مقارنة من ${patternComparisons.length}`,`${count} of ${patternComparisons.length} comparisons`);
 $('#comparison-listen-all').disabled=!count||!PILOT;
 $('#comparison-read-all').disabled=!count||!PILOT;
 list.innerHTML=count?items.map(item=>`<details class="comparison-card panel" ontoggle="fillComparisonCard(this,'${H(item.id)}')">
  <summary>${H(T(item.ar,item.en))} <small>${T(...comparisonLevels[item.level])} · ${T(...comparisonTypes[item.type])} · ${item.samples.length}</small></summary>
  <div></div>
 </details>`).join(''):`<p class="panel">${T('جرّب مستوى آخر أو غيّر نوع المقارنة.','Try another level or change the comparison type.')}</p>`;
}
function fillComparisonCard(details,id){
 if(!details.open||details.lastElementChild.hasChildNodes())return;
 const item=patternComparisons.find(comparison=>comparison.id===id);
 if(!item)return;
 details.lastElementChild.innerHTML=`<p>${H(T(item.noteAr,item.noteEn))}</p>
  <button class="secondary" onclick="startComparisonGuide('listen','${H(item.id)}')">▷ ${T('استمع إلى هذه المقارنة','Listen to this comparison')}</button>
  ${comparisonCards(item,true,true)}${comparisonExercise(item)}`;
}
function checkComparison(id,choice,button){
 const item=patternComparisons.find(c=>c.id===id);
 if(button.closest('#comparison-guide'))pauseComparisonGuide();
 button.closest('.comparison-card').querySelector('.comparison-feedback').textContent=
  (choice===item.answer?T('صحيح. ','Correct. '):T('راجع الفرق وجرّب مجددًا. ','Review the distinction and try again. '))+T(item.noteAr,item.noteEn);
}
function resetComparisonSelection(){
 releaseComparisonGuide();
 $('#comparison-guide').innerHTML='';
 paintComparisonSelection();
}

function startComparisonGuide(mode,id){
 const items=id?patternComparisons.filter(item=>item.id===id):visibleComparisons();
 if(!items.length||!PILOT)return;
 stopSpeech();
 releaseComparisonGuide();
 const sentences=new Map([...PILOT.sentences,...(REFERENCE_CORPUS?.sentences||[])].map(sentence=>[sentence.id,sentence]));
 const voiceMode=$('#comparison-voice').value;
 const delay=Number($('#comparison-delay').value)*1000;
 const steps=items.flatMap((item,index)=>{
  const voice=voiceMode==='alternate'?(index%2?'female':'male'):voiceMode;
  const opening={item,index,phase:mode==='read'?'intro':'narration',voice};
  const practice={item,index,phase:'practice'};
  if(mode==='read')return [opening,{item,index,phase:'examples'},practice];
  const available=item.samples.filter(sample=>sentences.has(sample.sentenceId));
  const examples=available.map((sample,example)=>{
   const {sentenceId,sceneId,form}=sample;
   const sentence=sentences.get(sentenceId);
   return {item,index,example,total:available.length,form,phase:'audio',sentence,scene:sentences.get(sceneId)||sentence,voice};
  });
  return [opening,...examples,practice];
 });
 comparisonGuide={steps,index:0,count:items.length,delay,left:delay,running:false,timer:null,frame:null,audio:null};
 paintComparisonGuide();
 $('#comparison-guide').scrollIntoView({block:'start'});
 resumeComparisonGuide();
}
function disposeComparisonAudio(guide){
 if(!guide.audio)return;
 guide.audio.onended=null;
 guide.audio.onplaying=null;
 guide.audio.onerror=null;
 guide.audio.pause();
 guide.audio=null;
}
function releaseComparisonGuide(){
 if(!comparisonGuide)return;
 pauseComparisonGuide();
 disposeComparisonAudio(comparisonGuide);
 comparisonGuide=null;
}
function pauseComparisonGuide(){
 const guide=comparisonGuide;
 if(!guide)return;
 const phase=guide.steps[guide.index]?.phase;
 if(guide.running&&!guide.audio&&phase!=='narration')guide.left=Math.max(0,guide.deadline-Date.now());
 guide.running=false;
 guide.narration?.stop();guide.narration=null;
 clearInterval(guide.timer);
 cancelAnimationFrame(guide.frame);
 guide.audio?.pause();
 updateComparisonGuide();
}
function resumeComparisonGuide(){
 const guide=comparisonGuide;
 if(!guide||guide.running||!$('#comparison-guide'))return;
 guide.running=true;
 $('#comparison-audio-error').textContent='';
 const audio=guide.audio;
 if(audio){
  audio.play().catch(()=>{
   if(comparisonGuide===guide&&guide.audio===audio&&guide.running)comparisonAudioError(guide);
  });
 }else if(guide.steps[guide.index].phase==='narration'){
  const step=guide.steps[guide.index];
  const narration=synthesizeTrainingCue(spokenComparison(step.item),1,step.voice);
  guide.narration=narration;
  narration.done.then(completed=>{
   if(comparisonGuide!==guide||guide.narration!==narration||!guide.running)return;
   if(completed)advanceComparisonGuide(1);else comparisonAudioError(guide);
  });
 }else{
  guide.deadline=Date.now()+guide.left;
  guide.timer=setInterval(()=>{
   if(Date.now()>=guide.deadline)advanceComparisonGuide(1);
   else updateComparisonGuide();
  },150);
 }
 updateComparisonGuide();
}
function comparisonAudioError(guide){
 if(comparisonGuide!==guide)return;
 pauseComparisonGuide();
 $('#comparison-audio-error').textContent=T(
  'تعذّر تشغيل التسجيل. جرّب الاستئناف أو انتقل إلى المثال التالي.',
  'The recording could not play. Try resuming or move to the next example.'
 );
}
function advanceComparisonGuide(delta){
 const guide=comparisonGuide;
 if(!guide)return;
 const running=guide.running;
 pauseComparisonGuide();
 disposeComparisonAudio(guide);
 guide.index=Math.max(0,guide.index+delta);
 if(guide.index>=guide.steps.length){
  releaseComparisonGuide();
  $('#comparison-guide').innerHTML=`<p class="panel" role="status">${T('اكتملت المقارنات المختارة.','The selected comparisons are complete.')}</p>`;
  return;
 }
 guide.left=guide.delay;
 paintComparisonGuide();
 const panel=$('#comparison-guide');
 if(panel.getBoundingClientRect().top<0)panel.scrollIntoView({block:'start'});
 if(running)resumeComparisonGuide();
}
function updateComparisonGuide(){
 const guide=comparisonGuide;
 const meter=$('#comparison-meter');
 if(!guide||!meter)return;
 const {audio}=guide;
 const step=guide.steps[guide.index];
 if(audio){
  const ms=audio.currentTime*1000;
  const cue=step.phase==='audio'?step.sentence.recordings[step.voice].words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms):-1;
  if(step.phase==='audio'&&guide.cue!==cue){
   guide.cue=cue;
   $('#comparison-sample').querySelectorAll('[data-comparison-word]').forEach((word,index)=>
    word.classList.toggle('speaking',index===cue)
   );
  }
  meter.value=ms;
  $('#comparison-clock').textContent=step.voice==='male'?'Adam':'Bella';
 }else if(step.phase==='narration'){
  $('#comparison-clock').textContent=step.voice==='male'?'Adam':'Bella';
 }else{
  const left=guide.running?Math.max(0,guide.deadline-Date.now()):guide.left;
  meter.value=guide.delay-left;
  $('#comparison-clock').textContent=T(`${Math.ceil(left/1000)} ثانية للقراءة`,`${Math.ceil(left/1000)} seconds to read`);
 }
 $('#comparison-play').textContent=guide.running?T('إيقاف مؤقت','Pause'):T('استئناف','Resume');
}
function comparisonSample(step){
 const {sentence,scene}=step;
 const pattern=PILOT.patterns.find(row=>row.id===sentence.pattern_id);
 return `<div class="comparison-sample" id="comparison-sample">
  <div class="comparison-photo">${pilotScene(scene)}
   ${scene!==sentence?`<small>${T('مشهد توضيحي من المكتبة','Illustrative scene from the library')}</small>`:''}
  </div>
  <div><strong class="pattern-form" lang="en" dir="ltr">${H(step.form||pattern?.form)}</strong>
   <div class="sentence" lang="en" dir="ltr">${EP.words(sentence,'data-comparison-word')}</div>
   ${EP.ar(sentence.ar)}
   ${pattern?comparisonStages(pattern.id):referenceRule(sentence)}
  </div>
 </div>`;
}
function paintComparisonGuide(){
 const guide=comparisonGuide;
 const step=guide.steps[guide.index];
 const {item,index,phase}=step;
 const titles={
  intro:T('الفكرة الأساسية','Key distinction'),
  narration:T('استمع إلى الشرح الكامل','Listen to the full explanation'),
  examples:T('جملة من كل نمط','One example per pattern'),
  audio:T(`المثال المسموع ${step.example+1} / ${step.total}`,`Recorded example ${step.example+1} / ${step.total}`),
  practice:T('توسّع وجرّب','Explore and practise'),
 };
 const candidate=PILOT.trainingAudio?.[`comparison-${item.id}-${step.voice}`];
 const recording=phase==='audio'?step.sentence.recordings[step.voice]:
  phase==='narration'&&candidate?.text===spokenComparison(item)?candidate:null;
 const content=phase==='audio'?comparisonSample(step):
  comparisonCards(item,!['intro','narration'].includes(phase),phase==='practice')+(phase==='practice'?comparisonExercise(item):'');
 $('#comparison-guide').innerHTML=`<section class="panel comparison-card">
  <p>${T('المقارنة','Comparison')} ${index+1} / ${guide.count} · ${titles[phase]}</p><h2>${H(T(item.ar,item.en))}</h2>
  <p>${H(T(item.noteAr,item.noteEn))}</p>${content}
  ${recording?`<audio id="comparison-audio" preload="auto" src="${H(recording.path)}"></audio>`:''}
  <progress id="comparison-meter" max="${recording?.duration_ms||guide.delay}" value="0"></progress> <span id="comparison-clock"></span>
  <p id="comparison-audio-error" role="status"></p>
  <div class="buttonrow"><button class="secondary" onclick="advanceComparisonGuide(-1)" ${guide.index===0?'disabled':''}>${T('السابق','Previous')}</button>
  <button class="secondary" id="comparison-play" onclick="comparisonGuide.running?pauseComparisonGuide():resumeComparisonGuide()"></button>
  <button class="primary" onclick="advanceComparisonGuide(1)">${T('التالي','Next')}</button>
  <button class="secondary" onclick="releaseComparisonGuide();$('#comparison-guide').innerHTML=''">${T('إنهاء التتابع','End sequence')}</button></div></section>`;
 if(recording){
  const audio=$('#comparison-audio');
  guide.audio=audio;
  guide.cue=null;
  audio.onplaying=()=>{
   cancelAnimationFrame(guide.frame);
   const paint=()=>{
    if(comparisonGuide!==guide||guide.audio!==audio||!guide.running)return;
    updateComparisonGuide();
    guide.frame=requestAnimationFrame(paint);
   };
   paint();
  };
  audio.onended=()=>{if(guide.running&&guide.audio===audio)advanceComparisonGuide(1)};
  audio.onerror=()=>{if(guide.audio===audio)comparisonAudioError(guide)};
  if(phase==='audio')window.EPOffline?.rememberSentences(step.scene===step.sentence?[step.sentence]:[step.sentence,step.scene]);
 }
 updateComparisonGuide();
}

const stopSpeechBeforeComparison=stopSpeech;
stopSpeech=function(){
 pauseComparisonGuide();
 stopSpeechBeforeComparison();
};
window.addEventListener('hashchange',()=>{if(location.hash!=='#comparisons')releaseComparisonGuide()});
