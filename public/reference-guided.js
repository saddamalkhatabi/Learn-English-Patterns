const referenceStudyAudio=EPReferenceStudyAudio;
const referenceGuideStages=[...referenceStudyAudio.stages,['purpose','الغرض والجملة','Purpose and sentence','']];
let referenceGuided=null,referenceCourseSentences,referenceStudyRecordings=null;
let referenceGuidedVoiceMode='pattern';
const referencePurposeSteps={
 'pattern-purpose':['الغرض العام من النمط','General pattern purpose'],
 'pattern-form':['صيغة النمط','Pattern structure'],
 'example-purpose':['غرض الجملة في سياقها','Sentence purpose in context'],
 sentence:['الجملة الأساسية','Main sentence']
};
const referencePurposeOptions=Object.keys(referencePurposeSteps).slice(0,3);
const referencePurposePrefs=Object.fromEntries(referencePurposeOptions.map(key=>[key,true]));
try{
 const saved=localStorage.getItem('patterns-reference-guide-voice');
 if(referenceStudyAudio.voiceModes.includes(saved))referenceGuidedVoiceMode=saved;
 const purpose=JSON.parse(localStorage.getItem('patterns-reference-purpose-steps')||'{}');
 for(const key of referencePurposeOptions)if(typeof purpose[key]==='boolean')referencePurposePrefs[key]=purpose[key];
}catch{}
trainingAudioReady.then(cues=>{referenceStudyRecordings=cues;refreshReferenceSummary()});

function referenceStudyRecording(kind,text,voice){
 const cue=referenceStudyRecordings?.[referenceStudyAudio.cueId(kind,text,voice)];
 return cue?.text===text?cue:null;
}

function referencePatternId(pattern){return pattern.planned_pattern_id||pattern.id}
function referenceGuidedSentenceWords(row,attribute=''){
 return row.pattern_id?EP.words(row,attribute):referenceWords(row,attribute);
}
function referencePatterns(search=epReference.query){
 if(!COURSE_CATALOG||!PILOT)return [];
 const query=normalizeSceneQuery(search).trim().split(/\s+/).filter(Boolean);
 const rows=COURSE_CATALOG.patterns.filter(pattern=>
  (epReference.patternScope!=='foundation'||pattern.lifecycle.published)&&
  (!epReference.patternLevel||learningLevels.patterns[referencePatternId(pattern)]===epReference.patternLevel)&&
  EPPurposes.matches(epReference.purpose,EPPurposes.forPattern(referencePatternId(pattern)))&&
  query.every(word=>normalizeSceneQuery([
   pattern.form,pattern.title,pattern.explanation_ar,pattern.explanation_en,...pattern.keywords
  ].join(' ')).includes(word)));
 if(epReference.sort==='az'||epReference.sort==='grammar')rows.sort((a,b)=>a.form.localeCompare(b.form,'en'));
 if(epReference.sort==='level')rows.sort((a,b)=>(learningLevels.patterns[referencePatternId(a)]||'').localeCompare(learningLevels.patterns[referencePatternId(b)]||''));
 return rows;
}
function referenceCourseExamples(pattern){
 const ids=pattern.published_sentence_ids||pattern.examples.map(row=>row.id);
 referenceCourseSentences??=new Map(PILOT.sentences.map(row=>[row.id,row]));
 return ids.map(id=>referenceCourseSentences.get(id)).filter(Boolean);
}
function referencePatternPhoto(pattern,examples){
 return examples.find(row=>row.image)||pattern.reference_ids.map(id=>referencePlayer?.rows.get(id)).find(row=>row?.image);
}
function referencePatternCard(pattern){
 const id=referencePatternId(pattern);
 const examples=referenceCourseExamples(pattern),photo=referencePatternPhoto(pattern,examples);
 const level=learningLevels.patterns[id]||pattern.level;
 return `<article class="reference-card panel reference-pattern-card" data-reference-pattern="${id}">
  <div class="reference-photo">${patternsSentenceScene(photo)}</div>
  <div class="reference-card-content"><div class="reference-card-meta">
   ${pattern.lifecycle.published?`<span class="reference-foundation">★ ${T('تأسيسي','Foundation')} · ${H(level)}</span>`:`<span>${H(level)}</span>`}
  </div><h2 lang="en" dir="ltr">${H(pattern.form)}</h2>${EP.ar(pattern.title)}
  <div class="purpose-line"><span>${T(...referencePurposeSteps['pattern-purpose'])}</span>${purposeTag(EPPurposes.forPattern(id))}</div>
  ${examples[0]?`<p lang="en" dir="ltr">${referenceGuidedSentenceWords(examples[0])}</p>`:''}</div>
  <div class="reference-card-actions buttonrow">
   <button class="secondary" type="button" onclick="openReferenceGuided([${id}],{strategy:'purpose'})">▷ ${T('الغرض ثم الجملة','Purpose then sentence')}</button>
   <button class="primary" type="button" onclick="openReferenceGuided([${id}])">▷ ${T('شرح مع أمثلة إضافية','Explanation with additional examples')}</button>
   <button class="secondary" type="button" onclick="openReferenceGuided([${id}],{full:false})">▷ ${T('استمع إلى أمثلة النمط','Listen to pattern examples')}</button>
  </div></article>`;
}
pilotReady.then(()=>{
 if(page!=='references')return;
 if(epReference.section==='patterns')renderReferenceRows();
 else refreshReferenceSummary();
});

function referenceGuidedLesson(id){
 if(typeof id==='number'){
  const pattern=COURSE_CATALOG?.patterns.find(row=>referencePatternId(row)===id);
  if(!pattern||!PILOT)return null;
  const examples=referenceCourseExamples(pattern),base=examples[0];
  if(!base)return null;
  const meta=learningMeta(id)||pattern;
  const spokenPattern=PILOT.patterns.find(row=>row.id===id);
  const rule=meta.explanation_en||pattern.explanation_en;
  return {id,base,examples:examples.slice(1),form:pattern.form,rule,ar:meta.explanation_ar||pattern.explanation_ar,generalPurpose:EPPurposes.forPattern(id),
   photo:referencePatternPhoto(pattern,examples),level:learningLevels.patterns[id],
   foundation:pattern.lifecycle.published,
   titleSpeech:referenceStudyAudio.patternTitle(pattern.form),
   ruleSpeech:englishAmerican(spokenTrainingCue('explanation-intro',spokenPattern,meta))};
 }
 const base=referencePlayer?.rows.get(id);
 if(!base)return null;
 const guide=referenceGuide(base);
 return {id,base,photo:base,form:guide.form||guide.construction.replaceAll('-',' '),rule:guide.rule_en,ar:guide.rule_ar,
  generalPurpose:EPPurposes.forStructure(guide.construction,sentencePurpose(base)),
  titleSpeech:referenceStudyAudio.patternTitle(guide.form,guide.construction),
  ruleSpeech:guide.rule_en?englishAmerican(spokenComparisonNote(guide.rule_en),base):''};
}

function referenceGuidedExamples(lesson,study){
 return lesson.examples||referenceStudyAudio.examples(lesson.base,study,id=>referenceExampleRow(id,study||{examples:{}}),
  REFERENCE_CORPUS.sentences,referenceGuide);
}

function referenceGuidedWordRecording(word,text,voice){
 const cue=referenceStudyRecordings?.[ideaWordCueId(word.en,voice)];
 if(cue&&EPEnglish.sameSpeech(cue.text,text))return cue;
 const stored=word.audio?.[voice];
 return referenceStudyRecording('word',text,voice)||
  (stored&&EPEnglish.sameSpeech(stored.text,text)?stored:null)||
  referenceStudyAudio.wordExcerpt(word,text,voice,EPEnglish.sameSpeech);
}

function referenceGuidedTrackList(session,stage,examples=[],words=[]){
 const {lesson,voice,full}=session;
 const [key,,,heading]=referenceGuideStages[stage];
 const sentence=(row,word,role=voice)=>({kind:word?'context':'sentence',row,word,voice:role,...referenceStudySentenceTrack(row,role)});
 if(key==='purpose')return referencePurposeTracks(lesson);
 const tracks=full||key==='base'?[{kind:'heading',text:heading,recording:referenceStudyRecording('stage',heading,voice)}]:[];
 if(key==='base'){
  tracks.unshift({kind:'title',text:lesson.titleSpeech,recording:referenceStudyRecording('title',lesson.titleSpeech,voice)});
  tracks.push(sentence(lesson.base));
 }
 if(key==='rule'&&lesson.ruleSpeech){
  let recording=referenceStudyRecording('rule',lesson.ruleSpeech,voice);
  if(lesson.examples&&voice==='female'&&!recording){
   const cue=referenceStudyRecordings?.[`explanation-intro-${lesson.id}`];
   if(cue&&EPEnglish.sameSpeech(cue.text,lesson.ruleSpeech))recording=cue;
  }
  const narration={kind:'rule',text:lesson.ruleSpeech,recording};
  if(lesson.examples)return [narration];
  tracks.push(narration);
 }
 if(key==='examples')tracks.push(...examples.map(row=>sentence(row)));
 if(key==='words'){
  for(const word of words){
   const text=word.en;
   tracks.push({kind:'word',word,text,recording:referenceGuidedWordRecording(word,text,voice)},sentence(word.row,word));
  }
 }
 return tracks;
}

function referencePurposeTracks(lesson){
 const {base,generalPurpose,titleSpeech}=lesson;
 const {prompt:general,text,recording}=makePurposeTrack(generalPurpose);
 const context=EPCoursePurposePrompts[lesson.id]||EPReferencePurposeContext[lesson.id];
 const example=context?{prompt:{ar:context[0],en:context[1]},text:context[1],
  recording:referenceStudyRecording('purpose',context[1],'female')}:purposeTrack(base);
 return [
  {kind:'pattern-purpose',prompt:general,text,recording,voice:'female'},
  {kind:'pattern-form',text:titleSpeech,recording:referenceStudyRecording('title',titleSpeech,'male'),voice:'male'},
  {kind:'example-purpose',...example,voice:'female'},
  {kind:'sentence',row:base,...referenceStudySentenceTrack(base,'male'),voice:'male'}
 ].filter(track=>referencePurposePrefs[track.kind]!==false);
}
function changeReferencePurposeStep(session,key,enabled){
 const previous=referencePurposeTracks(session.lesson)[session.track]?.kind;
 const playing=session.playing;
 pauseReferenceGuided(session);
 referencePurposePrefs[key]=enabled;
 try{localStorage.setItem('patterns-reference-purpose-steps',JSON.stringify(referencePurposePrefs))}catch{}
 const order=Object.keys(referencePurposeSteps);
 const tracks=referencePurposeTracks(session.lesson);
 const next=tracks.findIndex(track=>order.indexOf(track.kind)>=order.indexOf(previous));
 session.track=next<0?tracks.length-1:next;
 refreshReferenceSummary();
 if(playing)runReferenceGuided(session);
 else if(!session.complete)paintReferencePurpose(session,tracks[session.track]);
}

function openReferenceGuided(ids,{voice,full=true,strategy='study'}={}){
 const lesson=referenceGuidedLesson(ids[0]);
 if(!lesson)return;
 if(referenceGuided)referenceGuided.dialog.close();
 stopSpeech();
 stopExpansionAudio();
 const dialog=document.createElement('dialog');
 dialog.className='reference-guided';
 dialog.setAttribute('aria-labelledby','reference-guided-title');
 const purpose=strategy==='purpose';
 const stages=purpose?[4]:full?[0,1,2,3]:[0,2];
 dialog.innerHTML=`<div class="reference-guided-header">
  <h2 id="reference-guided-title">${purpose?T('الغرض ثم الجملة','Purpose then sentence'):full?T('شرح الأنماط مع أمثلة إضافية','Pattern explanations with additional examples'):T('أمثلة الأنماط','Pattern examples')}</h2>
  <div class="reference-guided-window-actions">
   <button class="secondary" type="button" data-guide-mini>${T('تصغير المشغّل','Minimize player')}</button>
   <form method="dialog"><button class="secondary" data-guide-close autofocus>${T('العودة إلى المكتبة','Back to the library')}</button></form>
  </div></div>
  ${purpose?`<fieldset class="reference-purpose-settings"><legend>${T('النطق في هذا العرض','Narration in this strategy')}</legend>
   ${referencePurposeOptions.map(key=>`<label><input type="checkbox" data-purpose-step="${key}" ${referencePurposePrefs[key]?'checked':''}> ${T(...referencePurposeSteps[key])}</label>`).join('')}
   <small>${T('تُقرأ الجملة الأساسية دائمًا. أوقف أي خيار لتخطي مرحلته.','The main sentence always plays. Turn off an option to skip that step.')}</small>
  </fieldset>`:`<div class="reference-guided-steps buttonrow" role="group" aria-label="${T('مراحل الشرح','Study stages')}">
  ${stages.map(stage=>`<button class="secondary" type="button" data-guide-stage="${stage}">${stage+1} · ${T(...referenceGuideStages[stage].slice(1,3))}</button>`).join('')}</div>`}
  <div class="reference-guided-now"><b data-guide-mini-form lang="en" dir="ltr"></b><span data-guide-mini-stage></span></div>
  <div class="reference-guided-transport buttonrow">
   <button class="secondary" type="button" data-guide-move="-1">${T('النمط السابق','Previous pattern')}</button>
   <button class="primary" type="button" data-guide-play></button>
   <button class="secondary" type="button" data-guide-move="1">${T('النمط التالي','Next pattern')}</button>
   ${purpose?'':`<label class="reference-guided-voice">${T('طريقة اختيار الصوت','Voice selection')}
    <select data-guide-voice>
     <option value="pattern">${T('تناوب عند كل نمط','Alternate by pattern')}</option>
     <option value="stage">${T('تناوب عند كل مرحلة','Alternate by stage')}</option>
     <option value="male">Adam</option><option value="female">Bella</option>
    </select></label>`}
   <bdi data-guide-voice-now></bdi>
   <span data-guide-position></span>
  </div><p class="reference-guided-status" data-guide-status role="status"></p>
  <section class="reference-guided-content" data-guide-content></section>`;
 const trigger=document.activeElement;
 const voiceMode=voice==='male'||voice==='female'?voice:referenceGuidedVoiceMode;
 const session={dialog,ids,index:0,stages,stage:stages[0],track:0,voiceMode,firstVoice:referencePlayer?.state.voice||'male',
  full,purpose,run:0,sound:null,audio:new Audio(),
  rate:referencePlayer?.state.rate||1,lesson,ready:null,playing:false,complete:false};
 referenceGuided=session;
 dialog.querySelectorAll('[data-purpose-step]').forEach(input=>input.onchange=()=>
  changeReferencePurposeStep(session,input.dataset.purposeStep,input.checked));
 dialog.addEventListener('close',()=>{
  if(dialog.open||!dialog.isConnected)return;
  pauseReferenceGuided(session);
  if(referenceGuided===session)referenceGuided=null;
  dialog.remove();
  if(trigger?.isConnected&&!referenceGuided)trigger.focus({preventScroll:true});
 });
 dialog.querySelector('[data-guide-mini]').onclick=()=>toggleReferenceGuidedMini(session);
 dialog.querySelector('[data-guide-play]').onclick=()=>{
  if(session.playing)return pauseReferenceGuided(session);
  if(session.complete)positionReferenceGuided(session,0,stages[0]);
  runReferenceGuided(session);
 };
 dialog.querySelectorAll('[data-guide-stage]').forEach(button=>button.onclick=()=>{
  positionReferenceGuided(session,session.index,Number(button.dataset.guideStage));
  runReferenceGuided(session);
 });
 dialog.querySelectorAll('[data-guide-move]').forEach(button=>button.onclick=()=>{
  positionReferenceGuided(session,session.index+Number(button.dataset.guideMove),stages[0]);
  runReferenceGuided(session);
 });
 const voicePicker=dialog.querySelector('[data-guide-voice]');
 if(voicePicker)voicePicker.value=voiceMode;
 voicePicker?.addEventListener('change',()=>{
  const wasPlaying=session.playing;
  pauseReferenceGuided(session);
  session.voiceMode=referenceGuidedVoiceMode=voicePicker.value;
  try{localStorage.setItem('patterns-reference-guide-voice',referenceGuidedVoiceMode)}catch{}
  updateReferenceGuidedControls(session);
  if(wasPlaying)runReferenceGuided(session);
 });
 const overlays=$('dialog[open]');
 (overlays||document.body).append(dialog);
 dialog.showModal();
 runReferenceGuided(session);
}

function toggleReferenceGuidedMini(session){
 const {dialog}=session,mini=dialog.dataset.mini!=='true';
 dialog.close();
 dialog.dataset.mini=String(mini);
 const toggle=dialog.querySelector('[data-guide-mini]');
 toggle.textContent=mini?T('توسيع المشغّل','Expand player'):T('تصغير المشغّل','Minimize player');
 dialog.querySelector('[data-guide-close]').textContent=mini?T('إغلاق','Close'):T('العودة إلى المكتبة','Back to the library');
 if(mini)dialog.show();
 else dialog.showModal();
 toggle.focus({preventScroll:true});
}

function positionReferenceGuided(session,index,stage){
 pauseReferenceGuided(session);
 session.index=index;
 session.stage=stage;
 session.track=0;
 session.complete=false;
 session.lesson=referenceGuidedLesson(session.ids[index]);
 session.dialog.querySelector('[data-guide-content]').scrollTop=0;
}
function updateReferenceGuidedControls(session,status=''){
 const {dialog,playing,complete,index,ids,stage,stages,lesson}=session;
 session.voice=referenceStudyAudio.guideVoice(session.voiceMode,session.firstVoice,index,stage,stages);
 dialog.querySelector('[data-guide-play]').textContent=playing?T('Ⅱ إيقاف مؤقت','Ⅱ Pause'):complete?T('▷ أعد الاستماع','▷ Replay'):T('▷ تشغيل / استكمال','▷ Play / resume');
 dialog.querySelector('[data-guide-position]').textContent=`${index+1} / ${ids.length}`;
 dialog.querySelector('[data-guide-mini-form]').textContent=lesson.form;
 dialog.querySelector('[data-guide-mini-stage]').textContent=T(...referenceGuideStages[stage].slice(1,3));
 const activeVoice=session.purpose?referencePurposeTracks(lesson)[session.track]?.voice:session.voice;
 dialog.querySelector('[data-guide-voice-now]').textContent=activeVoice==='female'?'Bella':'Adam';
 dialog.querySelector('[data-guide-status]').textContent=status;
 dialog.querySelector('[data-guide-move="-1"]').disabled=index===0;
 dialog.querySelector('[data-guide-move="1"]').disabled=index===ids.length-1;
 dialog.querySelectorAll('[data-guide-stage]').forEach(button=>button.setAttribute('aria-pressed',Number(button.dataset.guideStage)===stage));
}
function pauseReferenceGuided(session){
 session.run++;
 session.playing=false;
 session.sound?.stop();
 session.sound=null;
 updateReferenceGuidedControls(session);
}
function paintReferenceGuided(session,track,examples,words){
 if(session.purpose){paintReferencePurpose(session,track);return}
 const {lesson,stage,dialog}=session,[key,ar,en]=referenceGuideStages[stage];
 const row=track.row||track.word?.row||lesson.base;
 const intro=track.kind==='title',word=track.word;
 const written=word&&englishDisplay(word.en,row);
 const photo=row.image?row:lesson.photo;
 const visibleWords=key==='words'?words:[];
 const alternate=photo&&photo.id!==row.id;
 const content=dialog.querySelector('[data-guide-content]');
 content.dataset.guideTrack=track.kind;
 content.innerHTML=`
  <div class="reference-guided-photo">${patternsSentenceScene(photo)}
   ${alternate?`<small>${T('صورة توضيحية مرتبطة بالنمط','Related illustrative scene')}</small>`:''}</div>
  <div class="reference-guided-copy"><h3>${intro?T('بداية نمط جديد','New pattern'):T(ar,en)} ${key==='examples'&&track.row?`· ${examples.indexOf(row)+1} / ${examples.length}`:''}</h3>
   <div class="reference-card-meta">${lesson.foundation?`<span class="reference-foundation">★ ${T('تأسيسي','Foundation')} · ${H(lesson.level)}</span>`:H(lesson.level||'')}</div>
   <strong class="pattern-form" lang="en" dir="ltr">${H(lesson.form)}</strong>
   ${key==='rule'?EP.pair(lesson.ar,lesson.rule):''}
   ${word?`<section class="reference-guided-term">
    <span>${words.indexOf(word)+1} / ${words.length} · ${track.kind==='word'?T('استمع إلى المفردة','Listen to the word'):T('استمع إليها في الجملة','Listen in context')}</span>
    <bdi lang="en">${H(written)}</bdi> ${wordTypeBadge(word)}
    ${EPEnglish.sameSpeech(written,word.en)?'':`<span>${T('نص التسجيل الصوتي','Audio transcript')} <bdi lang="en">${H(word.en)}</bdi></span>`}
    ${EP.ar(word.ar)}</section>`:''}
   ${intro?'':`<p class="reference-guided-sentence" lang="en" dir="ltr">${referenceGuidedSentenceWords(row,'data-guide-word')}</p>${EP.ar(row.ar)}`}
   ${key==='words'?`<ul class="reference-guided-vocabulary">${visibleWords.map(word=>`<li class="${word===track.word?'active':''}">
    <bdi lang="en">${H(englishDisplay(word.en,word.row))}</bdi>${EP.prefs.arabic?`<bdi lang="ar">${H(word.ar)}</bdi>`:''}
   </li>`).join('')}</ul>`:''}</div>`;
 if(word){
  const tokens=[...content.querySelectorAll('[data-guide-word]')];
  const match=[word.en,englishDisplay(word.en,row),englishAmerican(word.en,row)]
   .map(term=>referenceStudyAudio.termIndexes(tokens.map(token=>token.textContent),term)).find(indexes=>indexes.length)||[];
  for(const i of match)tokens[i].classList.add('reference-vocabulary-token');
 }
 window.EPOffline?.rememberSentences(photo&&photo!==row?[row,photo]:[row]);
 EP.decorate();
}

function paintReferencePurpose(session,active){
 const {lesson,dialog}=session;
 const content=dialog.querySelector('[data-guide-content]');
 content.dataset.guideTrack=active.kind;
 const tracks=referencePurposeTracks(lesson);
 const revealed=tracks.slice(0,tracks.findIndex(track=>track.kind===active.kind)+1);
 content.innerHTML=`<div class="reference-guided-photo">${patternsSentenceScene(lesson.photo)}</div>
 <div class="reference-guided-copy"><ol class="reference-purpose-timeline">${revealed.map(track=>`
  <li data-purpose-phase="${track.kind}" ${track.kind===active.kind?'aria-current="step"':''}>
   <h3>${T(...referencePurposeSteps[track.kind])}</h3>
   ${track.prompt?EP.pair(track.prompt.ar,track.prompt.en):track.kind==='pattern-form'?
    `<strong class="pattern-form" lang="en" dir="ltr">${H(lesson.form)}</strong>`:
    `<p class="reference-guided-sentence" lang="en" dir="ltr">${referenceGuidedSentenceWords(lesson.base,'data-guide-word')}</p>${EP.ar(lesson.base.ar)}`}
  </li>`).join('')}</ol></div>`;
 const current=content.querySelector('[aria-current="step"]');
 if(current.getBoundingClientRect().bottom>content.getBoundingClientRect().bottom)
  current.scrollIntoView({block:'nearest'});
 window.EPOffline?.rememberSentences([lesson.base,lesson.photo].filter(Boolean));
 EP.apply();
 EP.decorate();
}

function playReferenceGuidedRecording(session,track){
 const {audio,dialog,rate}=session,recording=track.recording;
 if(!recording?.path)return synthesizeTrainingCue(track.text,rate,track.voice||session.voice);
 if(recording.start_ms!=null)return playVocabularyClip(recording,{audio,rate});
 let finish,settled=false,frame,last=-1;
 const done=new Promise(resolve=>{finish=resolve});
 const words=track.row&&recording.words?dialog.querySelectorAll('.reference-guided-sentence [data-guide-word]'):[];
 function mark(){
  const ms=audio.currentTime*1000;
  const active=recording.words?.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms)??-1;
  if(active===last)return;
  words[last]?.classList.remove('speaking');
  words[active]?.classList.add('speaking');
  last=active;
 }
 function tick(){
  if(settled||audio.paused)return;
  mark();
  frame=requestAnimationFrame(tick);
 }
 function end(ok){
  if(settled)return;
  settled=true;
  cancelAnimationFrame(frame);
  audio.onended=audio.onerror=audio.ontimeupdate=audio.onplaying=null;
  audio.pause();
  words.forEach(word=>word.classList.remove('speaking'));
  finish(ok);
 }
 audio.src=recording.path;
 audio.playbackRate=rate;
 audio.ontimeupdate=mark;
 if(words.length)audio.onplaying=()=>{cancelAnimationFrame(frame);tick()};
 audio.onended=()=>end(true);
 audio.onerror=()=>end(false);
 audio.play().catch(()=>end(false));
 return {done,stop:()=>end(false)};
}

function waitReferenceGuided(ms){
 let finish;
 const done=new Promise(resolve=>{finish=resolve});
 const timer=setTimeout(finish,ms);
 return {done,stop(){clearTimeout(timer);finish()}};
}

async function runReferenceGuided(session){
 const run=++session.run;
 session.playing=true;
 updateReferenceGuidedControls(session);
 if(!referenceStudyRecordings)await trainingAudioReady;
 if(!session.purpose&&!session.ready){
  const references=typeof session.ids[0]==='string';
  session.ready=Promise.all([references?loadReferenceStudy():null,
   session.full?(references?loadVocabulary():loadStudioVocabulary()):null,pilotReady]);
 }
 while(session.run===run&&session.dialog.open){
  const {lesson,stage,track}=session;
  let examples=[],words=[];
  if(stage===2||stage===3){
   const [study,atlas]=await(session.ready||[]);
   if(session.run!==run)return;
   examples=lesson.relatedExamples??=referenceGuidedExamples(lesson,study);
   if(stage===3)words=lesson.words??=study?
    referenceContextWords(lesson.base,examples,study,atlas):referenceStudyAudio.words(lesson.base,examples,studioVocabulary);
  }
  const next=referenceGuidedTrackList(session,stage,examples,words)[track];
  if(next){
   session.dialog.querySelector('[data-guide-voice-now]').textContent=(next.voice||session.voice)==='female'?'Bella':'Adam';
   paintReferenceGuided(session,next,examples,words);
   session.sound=playReferenceGuidedRecording(session,next);
   let played=await session.sound.done;
   if(session.run!==run)return;
   if(!played&&next.recording){
    session.sound=synthesizeTrainingCue(next.text,session.rate,next.voice||session.voice);
    played=await session.sound.done;
    if(session.run!==run)return;
   }
   session.sound=null;
   if(!played){
    session.playing=false;
    updateReferenceGuidedControls(session,T('تعذّر تشغيل الصوت. اضغط تشغيل للمحاولة أو اختر مرحلة أخرى.','Audio could not play. Press Play to retry or choose another stage.'));
    return;
   }
   session.track++;
   session.sound=waitReferenceGuided(referenceStudyAudio.guideGap(next.kind));
   await session.sound.done;
   if(session.run!==run)return;
   session.sound=null;
   continue;
  }
  const nextStage=session.stages.indexOf(stage)+1;
  if(nextStage<session.stages.length){
   session.stage=session.stages[nextStage];
  }else if(session.index+1<session.ids.length){
   session.index++;
   session.stage=session.stages[0];
   session.lesson=referenceGuidedLesson(session.ids[session.index]);
  }else{
   session.playing=false;
   session.complete=true;
   updateReferenceGuidedControls(session,T('اكتمل الاستماع.','Listening complete.'));
   return;
  }
  session.track=0;
  session.dialog.querySelector('[data-guide-content]').scrollTop=0;
  updateReferenceGuidedControls(session);
 }
}

const stopSpeechBeforeReferenceGuided=stopSpeech;
stopSpeech=function(options){
 if(referenceGuided?.playing)pauseReferenceGuided(referenceGuided);
 stopSpeechBeforeReferenceGuided(options);
};
