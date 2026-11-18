const referenceGuideStages=[
 ['base','الجملة الأساسية','Main sentence','New pattern. Main sentence.'],
 ['rule','شرح النمط','Rule explanation','Rule explanation.'],
 ['examples','أمثلة النمط','Pattern examples','Pattern examples. Listen to how the structure is used.'],
 ['words','توسيع المفردات','Vocabulary expansion','Vocabulary expansion. Listen to words and phrases for this pattern.']
];
let referenceGuided=null,referenceCourseSentences;

function referencePatternId(pattern){return pattern.planned_pattern_id||pattern.id}
function referenceGuidedSentenceWords(row,attribute=''){
 return row.pattern_id?EP.words(row,attribute):referenceWords(row,attribute);
}
function referencePatterns(){
 if(!COURSE_CATALOG||!PILOT)return [];
 const query=normalizeSceneQuery(epReference.query).trim().split(/\s+/).filter(Boolean);
 const rows=COURSE_CATALOG.patterns.filter(pattern=>
  (epReference.patternScope!=='foundation'||pattern.lifecycle.published)&&
  (!epReference.patternLevel||learningLevels.patterns[referencePatternId(pattern)]===epReference.patternLevel)&&
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
  ${examples[0]?`<p lang="en" dir="ltr">${referenceGuidedSentenceWords(examples[0])}</p>`:''}</div>
  <div class="reference-card-actions buttonrow">
   <button class="primary" type="button" onclick="openReferenceGuided([${id}])">▷ ${T('اشرح النمط بالصور','Explain the pattern with photos')}</button>
   ${EP.prefs.referenceGuided?'':`<button class="secondary" type="button" onclick="openReferenceGuided([${id}],{full:false})">▷ ${T('استمع إلى أمثلة النمط','Listen to pattern examples')}</button>`}
  </div></article>`;
}
pilotReady.then(()=>{if(page==='references'&&epReference.section==='patterns')renderReferenceRows()});

const playReferenceSentence=playReference;
playReference=function(id,voice){
 if(EP.prefs.referenceGuided)openReferenceGuided([id],{voice});
 else playReferenceSentence(id,voice);
};
const playReferenceSentences=playReferenceResults;
playReferenceResults=function(){
 if(epReference.section==='patterns'){
  openReferenceGuided(referencePatterns().map(referencePatternId),{full:EP.prefs.referenceGuided});
 }else if(EP.prefs.referenceGuided){
  openReferenceGuided(referenceRows().map(row=>row.id));
 }else playReferenceSentences();
};

function referenceGuidedLesson(id){
 if(typeof id==='number'){
  const pattern=COURSE_CATALOG?.patterns.find(row=>referencePatternId(row)===id);
  if(!pattern||!PILOT)return null;
  const examples=referenceCourseExamples(pattern),base=examples[0];
  if(!base)return null;
  const meta=learningMeta(id)||pattern;
  const spokenPattern=PILOT.patterns.find(row=>row.id===id);
  const recording=PILOT.trainingAudio?.[`explanation-intro-${id}`];
  const rule=meta.explanation_en||pattern.explanation_en;
  return {id,base,examples:examples.slice(1),form:pattern.form,rule,ar:meta.explanation_ar||pattern.explanation_ar,
   photo:referencePatternPhoto(pattern,examples),level:learningLevels.patterns[id],
   foundation:pattern.lifecycle.published,
   ruleRecording:spokenPattern&&EPEnglish.sameSpeech(recording?.text||'',spokenTrainingCue('explanation-intro',spokenPattern,meta))?recording:null};
 }
 const base=referencePlayer?.rows.get(id);
 if(!base)return null;
 const guide=referenceGuide(base);
 return {id,base,photo:base,form:guide.form||guide.construction,rule:guide.rule_en,ar:guide.rule_ar};
}

function referenceGuidedExamples(lesson,study){
 if(lesson.examples)return lesson.examples;
 const {id,base}=lesson,guide=referenceGuide(base);
 const authored=(study?.rows[id]?.examples||[]).map(key=>referenceExampleRow(key,study)).filter(row=>row&&row.id!==id);
 if(authored.length)return authored;
 return REFERENCE_CORPUS.sentences.filter(row=>{
  if(row.id===id)return false;
  const candidate=referenceGuide(row);
  return candidate.construction===guide.construction&&candidate.form===guide.form;
 }).slice(0,4);
}
function referenceGuidedWords(lesson,examples,vocabulary){
 const chosen=new Map(),rows=[lesson.base,...examples];
 for(const row of rows){
  const inSentence=normalizeSceneQuery(row.en).replace(/[^a-z0-9' ]/g,' ');
  const words=(vocabulary?.[row.id]?.words||[]).filter(word=>word.en&&word.ar);
  const relevant=word=>` ${inSentence} `.includes(` ${normalizeSceneQuery(word.en)} `);
  const ordered=[...words.filter(relevant),...words.filter(word=>!relevant(word)&&hasIdeaPoint(word))];
  let count=0;
  for(const word of ordered){
   const key=normalizeSceneQuery(word.en);
   if(chosen.has(key))continue;
   chosen.set(key,{...word,row});
   if(chosen.size===8)return [...chosen.values()];
   if(++count===3)break;
  }
 }
 return [...chosen.values()];
}

function referenceGuidedWordRecording(word,text,voice){
 const cue=PILOT?.trainingAudio?.[ideaWordCueId(word.en,voice)];
 if(cue&&EPEnglish.sameSpeech(cue.text,text))return cue;
 const recording=word.row.recordings?.[voice],cues=recording?.words;
 if(!recording?.path||!cues?.length)return null;
 const phrase=text.split(/\s+/);
 const first=cues.findIndex((_,i)=>phrase.every((part,j)=>EPEnglish.sameSpeech(cues[i+j]?.text||'',part)));
 if(first<0)return null;
 const last=first+phrase.length-1;
 return {path:recording.path,start_ms:Math.max(cues[first-1]?.end_ms||0,cues[first].start_ms-25),
  end_ms:Math.min(cues[last+1]?.start_ms||recording.duration_ms,cues[last].end_ms+35)};
}

function referenceGuidedTrackList(session,stage,examples=[],words=[]){
 const {lesson,voice,full}=session;
 const [key,,,heading]=referenceGuideStages[stage];
 const sentence=row=>({row,text:englishAmerican(row.en,row),recording:row.recordings?.[voice]});
 const tracks=full?[{text:heading,recording:{path:`assets/audio/reference-stage-${key}.mp3`}}]:[];
 if(key==='base')tracks.push(sentence(lesson.base));
 if(key==='rule'){
  if(lesson.ruleRecording)return [{text:lesson.rule,recording:lesson.ruleRecording}];
  tracks.push({text:lesson.rule});
 }
 if(key==='examples')tracks.push(...examples.map(sentence));
 if(key==='words'){
  for(const word of words){
   const text=englishAmerican(word.en,word.row);
   tracks.push({word,text,recording:referenceGuidedWordRecording(word,text,voice)});
  }
 }
 return tracks.filter(track=>track.text);
}

function openReferenceGuided(ids,{voice='male',full=true}={}){
 const lesson=referenceGuidedLesson(ids[0]);
 if(!lesson)return;
 if(referenceGuided)referenceGuided.dialog.close();
 stopSpeech();
 stopExpansionAudio();
 const dialog=document.createElement('dialog');
 dialog.className='reference-guided';
 dialog.setAttribute('aria-labelledby','reference-guided-title');
 const stages=full?[0,1,2,3]:[0,2];
 dialog.innerHTML=`<div class="reference-guided-header">
  <h2 id="reference-guided-title">${full?T('شرح النمط بالصور','Illustrated pattern study'):T('أمثلة الأنماط','Pattern examples')}</h2>
  <form method="dialog"><button class="secondary" autofocus>${T('العودة إلى المكتبة','Back to the library')}</button></form></div>
  <div class="reference-guided-steps buttonrow" role="group" aria-label="${T('مراحل الشرح','Study stages')}">
  ${stages.map(stage=>`<button class="secondary" type="button" data-guide-stage="${stage}">${stage+1} · ${T(...referenceGuideStages[stage].slice(1,3))}</button>`).join('')}</div>
  <div class="reference-guided-transport buttonrow">
   <button class="secondary" type="button" data-guide-move="-1">${T('النمط السابق','Previous pattern')}</button>
   <button class="primary" type="button" data-guide-play></button>
   <button class="secondary" type="button" data-guide-move="1">${T('النمط التالي','Next pattern')}</button>
   <span data-guide-position></span>
  </div><p class="reference-guided-status" data-guide-status role="status"></p>
  <section class="reference-guided-content" data-guide-content></section>`;
 const trigger=document.activeElement;
 const session={dialog,ids,index:0,stages,stage:0,track:0,voice,full,run:0,sound:null,audio:new Audio(),
  rate:referencePlayer?.state.rate||1,lesson,ready:null,playing:false,complete:false};
 referenceGuided=session;
 dialog.addEventListener('close',()=>{
  pauseReferenceGuided(session);
  if(referenceGuided===session)referenceGuided=null;
  dialog.remove();
  if(trigger?.isConnected&&!referenceGuided)trigger.focus({preventScroll:true});
 },{once:true});
 dialog.querySelector('[data-guide-play]').onclick=()=>{
  if(session.playing)return pauseReferenceGuided(session);
  if(session.complete)positionReferenceGuided(session,0,0);
  runReferenceGuided(session);
 };
 dialog.querySelectorAll('[data-guide-stage]').forEach(button=>button.onclick=()=>{
  positionReferenceGuided(session,session.index,Number(button.dataset.guideStage));
  runReferenceGuided(session);
 });
 dialog.querySelectorAll('[data-guide-move]').forEach(button=>button.onclick=()=>{
  positionReferenceGuided(session,session.index+Number(button.dataset.guideMove),0);
  runReferenceGuided(session);
 });
 const overlays=$('dialog[open]');
 (overlays||document.body).append(dialog);
 dialog.showModal();
 runReferenceGuided(session);
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
 const {dialog,playing,complete,index,ids,stage}=session;
 dialog.querySelector('[data-guide-play]').textContent=playing?T('Ⅱ إيقاف مؤقت','Ⅱ Pause'):complete?T('▷ أعد الاستماع','▷ Replay'):T('▷ تشغيل / استكمال','▷ Play / resume');
 dialog.querySelector('[data-guide-position]').textContent=`${index+1} / ${ids.length}`;
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
 const {lesson,stage,dialog}=session,[key,ar,en]=referenceGuideStages[stage];
 const row=track.row||track.word?.row||lesson.base;
 const photo=row.image?row:lesson.photo;
 const visibleWords=key==='words'?words:[];
 const alternate=photo&&photo.id!==row.id;
 dialog.querySelector('[data-guide-content]').innerHTML=`
  <div class="reference-guided-photo">${patternsSentenceScene(photo)}
   ${alternate?`<small>${T('صورة توضيحية مرتبطة بالنمط','Related illustrative scene')}</small>`:''}</div>
  <div class="reference-guided-copy"><h3>${T(ar,en)} ${key==='examples'&&track.row?`· ${examples.indexOf(row)+1} / ${examples.length}`:''}</h3>
   <div class="reference-card-meta">${lesson.foundation?`<span class="reference-foundation">★ ${T('تأسيسي','Foundation')} · ${H(lesson.level)}</span>`:H(lesson.level||'')}</div>
   <strong class="pattern-form" lang="en" dir="ltr">${H(lesson.form)}</strong>
   ${key==='rule'?EP.pair(lesson.ar,lesson.rule):''}
   <p class="reference-guided-sentence" lang="en" dir="ltr">${referenceGuidedSentenceWords(row,'data-guide-word')}</p>${EP.ar(row.ar)}
   ${key==='words'?`<ul class="reference-guided-vocabulary">${visibleWords.map(word=>`<li class="${word===track.word?'active':''}">
    <bdi lang="en">${H(englishDisplay(word.en,word.row))}</bdi>${EP.prefs.arabic?`<bdi lang="ar">${H(word.ar)}</bdi>`:''}
   </li>`).join('')}</ul>`:''}</div>`;
 window.EPOffline?.rememberSentences(photo&&photo!==row?[row,photo]:[row]);
 EP.decorate();
}

function playReferenceGuidedRecording(session,track){
 const {audio,dialog,rate}=session,recording=track.recording;
 if(!recording?.path)return synthesizeTrainingCue(track.text,rate,session.voice);
 if(recording.start_ms!=null)return playVocabularyClip(recording,{audio,rate});
 let finish,settled=false;
 const done=new Promise(resolve=>{finish=resolve});
 const words=track.row&&recording.words?dialog.querySelectorAll('.reference-guided-sentence [data-guide-word]'):[];
 function mark(){
  const ms=audio.currentTime*1000;
  const active=recording.words?.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
  words.forEach((word,index)=>word.classList.toggle('speaking',index===active));
 }
 function end(ok){
  if(settled)return;
  settled=true;
  audio.onended=audio.onerror=audio.ontimeupdate=null;
  audio.pause();
  words.forEach(word=>word.classList.remove('speaking'));
  finish(ok);
 }
 audio.src=recording.path;
 audio.playbackRate=rate;
 audio.ontimeupdate=mark;
 audio.onended=()=>end(true);
 audio.onerror=()=>end(false);
 audio.play().catch(()=>end(false));
 return {done,stop:()=>end(false)};
}

async function runReferenceGuided(session){
 const run=++session.run;
 session.playing=true;
 updateReferenceGuidedControls(session);
 if(session.full&&!session.ready)session.ready=Promise.all([
  loadStudioVocabulary(),session.ids.some(id=>typeof id==='string')?loadReferenceStudy():null
 ]);
 while(session.run===run&&session.dialog.open){
  const {lesson,stage,track}=session;
  let examples=[],words=[];
  if(stage===2||stage===3){
   const [,study]=await(session.ready||[]);
   if(session.run!==run)return;
   examples=referenceGuidedExamples(lesson,study);
   if(stage===3)words=referenceGuidedWords(lesson,examples,studioVocabulary);
  }
  const next=referenceGuidedTrackList(session,stage,examples,words)[track];
  if(next){
   paintReferenceGuided(session,next,examples,words);
   session.sound=playReferenceGuidedRecording(session,next);
   let played=await session.sound.done;
   if(session.run!==run)return;
   if(!played&&next.recording){
    session.sound=synthesizeTrainingCue(next.text,session.rate,session.voice);
    played=await session.sound.done;
    if(session.run!==run)return;
   }
   session.sound=null;
   if(!played&&next.recording){
    session.playing=false;
    updateReferenceGuidedControls(session,T('تعذّر تشغيل الصوت. اضغط تشغيل للمحاولة أو اختر مرحلة أخرى.','Audio could not play. Press Play to retry or choose another stage.'));
    return;
   }
   session.track++;
   continue;
  }
  const nextStage=session.stages.indexOf(stage)+1;
  if(nextStage<session.stages.length){
   session.stage=session.stages[nextStage];
  }else if(session.index+1<session.ids.length){
   session.index++;
   session.stage=0;
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
