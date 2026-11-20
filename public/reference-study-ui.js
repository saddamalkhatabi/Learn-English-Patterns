let referenceStudyLoad,referenceStudyCourse,referenceStudyPilot,studySpeech,studySpeechRun=0;
function loadReferenceStudy(){
 if(!referenceStudyLoad)referenceStudyLoad=fetch('reference-study.json').then(response=>{
  if(!response.ok)throw Error('reference study');
  return response.json();
 }).catch(()=>{
  referenceStudyLoad=null;
  return null;
 });
 return referenceStudyLoad;
}

function referenceExampleRow(id,data){
 if(referenceStudyPilot!==PILOT||!referenceStudyCourse){
  referenceStudyPilot=PILOT;
  referenceStudyCourse=new Map(PILOT?.sentences.map(row=>[row.id,row]));
 }
 return data?.examples[id]||referencePlayer?.rows.get(id)||referenceStudyCourse.get(id);
}

function referenceContextWords(base,examples,data,atlas){
 return referenceStudyAudio.studyWords(data?.rows[base.id]?.terms||[],vocabularyById,atlas?.sources||[],
  id=>referenceExampleRow(id,data),[base,...examples]);
}

function referenceExampleEnglish(row,format=H){
 if(!row.uk)return `<p lang="en" dir="ltr">${format(englishDisplay(row.en,row))}
  ${englishUsageButton(EPEnglish.analyze(row.en,row))}</p>`;
 const regions=EP.prefs.englishUsage==='uk'?[['UK',row.uk],['US',row.en]]:[['US',row.en],['UK',row.uk]];
 return regions.map(([region,text])=>`<p class="reference-regional-example" lang="en" dir="ltr"><b>${region}</b> ${format(text,region)}</p>`).join('');
}

function referenceExampleMarkup(row){
 return `<li class="reference-study-example" data-reference-example="${H(row.id)}" tabindex="-1">
  ${referenceExampleEnglish(row)}${EP.ar(row.ar)}
  <button type="button" class="secondary" data-example-id="${H(row.id)}" onclick="hearReferenceStudyExample(this.dataset.exampleId)">▶ ${T('استمع إلى المثال','Hear the example')}</button>
  ${row.source?`<a class="textlink reference-study-source" href="${H(row.source)}" target="_blank" rel="noopener noreferrer">${T('مرجع الاستعمال','Usage source')}</a>`:''}</li>`;
}

async function playReferenceStudyTracks(resolveTracks,voice){
 stopSpeech({keepReferencePlayer:true});
 const run=studySpeechRun;
 const tracks=await resolveTracks();
 if(run!==studySpeechRun)return;
 for(const track of tracks){
  const rate=state.rate||1;
  studySpeech=track.recording?.path?playVocabularyClip(track.recording,{rate}):synthesizeTrainingCue(track.text,rate,voice);
  let played=await studySpeech.done;
  if(run!==studySpeechRun)return;
  if(!played&&track.recording?.path){
   studySpeech=synthesizeTrainingCue(track.text,rate,voice);
   played=await studySpeech.done;
   if(run!==studySpeechRun)return;
  }
  studySpeech=null;
  if(!played){
   toast(T('تعذّر تشغيل التسجيل.','Could not play the recording.'));
   break;
  }
 }
}

const stopBeforeStudySpeech=stopSpeech;
function stopReferenceStudySpeech(){
 studySpeechRun++;
 studySpeech?.stop();
 studySpeech=null;
}
window.addEventListener('hashchange',stopReferenceStudySpeech);
stopSpeech=function(options){
 stopReferenceStudySpeech();
 stopBeforeStudySpeech(options);
};

function referenceStudySentenceTrack(row,voice){
 const text=englishAmerican(row.en,row);
 return {text,recording:row.recordings?.[voice]||referenceStudyRecording('example',text,voice)};
}

function hearReferenceStudyExample(id,voice='male',term=''){
 return playReferenceStudyTracks(async()=>{
  const [data]=await Promise.all([loadReferenceStudy(),pilotReady,trainingAudioReady,term?loadVocabulary():null]);
  const row=referenceExampleRow(id,data),entry=term&&vocabularyById.get(term);
  if(!row)return [];
  const sentence=referenceStudySentenceTrack(row,voice);
  return entry?[{text:entry.en,recording:referenceGuidedWordRecording({...entry,row},entry.en,voice)},sentence]:[sentence];
 },voice);
}

async function openReferenceStudy(detail){
 const host=detail.querySelector('.reference-study-content');
 if(host.dataset.loaded)return;
 host.dataset.loaded='loading';
 const [data]=await Promise.all([loadReferenceStudy(),pilotReady]);
 if(!host.isConnected)return;
 if(!data){
  delete host.dataset.loaded;
  host.textContent=T('تعذّر تحميل الأمثلة الإضافية. أعد فتح القسم للمحاولة.','Could not load additional practice. Reopen this section to retry.');
  return;
 }
 host.dataset.loaded='ready';
 const id=detail.dataset.referenceStudy,study=data.rows[id];
 if(!study)return;
 const group=data.groups[study.group];
 const base=referenceExampleRow(id,data);
 const examples=base?referenceGuidedExamples({base},data):[];
 const comparison=group?.comparison||study.comparison;
 host.innerHTML=`
  ${comparison?`<div class="reference-study-note"><strong>${T('قارن بين الاستعمالات','Compare usage')}</strong>${EP.pair(...comparison)}</div>`:''}
  ${group?.caution?`<div class="reference-study-note"><strong>${T('تنبيه واستثناء','Usage and exceptions')}</strong>${EP.pair(...group.caution)}</div>`:''}
  ${study.lessonId?`<button type="button" class="textlink" onclick="openLinkedLearning('lesson',${study.lessonId})">${T('افتح درس النمط','Open the pattern lesson')} ↗</button>`:''}
  ${examples.length?`<details class="reference-study-examples"><summary>${T('جمل أخرى على النمط','More sentences using the pattern')} · ${examples.length}</summary>
   <ul>${examples.map(referenceExampleMarkup).join('')}</ul></details>`:''}
  ${study.terms.length?`<details class="reference-study-words" data-reference-id="${H(id)}" ontoggle="if(this.open)openReferenceStudyWords(this)">
   <summary>${T('وسّع مفردات النمط','Expand your pattern vocabulary')}</summary><div class="reference-study-word-list"></div></details>`:''}`;
}

async function openReferenceStudyWords(detail){
 const host=detail.querySelector('.reference-study-word-list');
 if(host.dataset.loaded)return;
 host.dataset.loaded='loading';
 const [data,atlas]=await Promise.all([loadReferenceStudy(),loadVocabulary()]);
 if(!host.isConnected)return;
 if(!data||!atlas){
  delete host.dataset.loaded;
  host.textContent=T('تعذّر تحميل المفردات. أعد فتح القسم للمحاولة.','Could not load the words. Reopen this section to retry.');
  return;
 }
 host.dataset.loaded='ready';
 const referenceId=detail.dataset.referenceId,base=referenceExampleRow(referenceId,data);
 if(!base)return;
 const examples=referenceGuidedExamples({base},data);
 host.innerHTML=referenceContextWords(base,examples,data,atlas).map(entry=>{
  const source=entry.row;
  const name=vocabularyEntryName(entry);
  const displayed=EP.prefs.englishUsage==='uk'&&source.uk?source.uk:englishDisplay(source.en,source);
  const text=EPVocabulary.includesTerm(displayed,name)?displayed:source.en;
  const marked=EPVocabulary.includesTerm(text,name)?name:entry.en;
  return `<div class="reference-study-term">
   <button type="button" class="textlink" data-term="${H(entry.id)}" data-source="${H(source.id)}"
    onclick="openVocabularyFromScene(this.dataset.term,this.dataset.source)" lang="en" dir="ltr">${H(name)} ↗</button>
   ${wordTypeBadge(entry)}${vocabularyUsageTags(entry)}${EP.ar(entry.ar)}
   <p lang="en" dir="ltr">${vocabularyMarked(text,marked)}</p>${EP.ar(source.ar)}
   <div class="buttonrow">
    <button type="button" class="secondary" data-example-id="${H(source.id)}" data-term="${H(entry.id)}"
     onclick="hearReferenceStudyExample(this.dataset.exampleId,'male',this.dataset.term)">▶ ${T('المفردة ثم الجملة','Word then sentence')} · Adam</button>
    <button type="button" class="secondary" data-example-id="${H(source.id)}" data-term="${H(entry.id)}"
     onclick="hearReferenceStudyExample(this.dataset.exampleId,'female',this.dataset.term)">▶ ${T('المفردة ثم الجملة','Word then sentence')} · Bella</button>
    <button type="button" class="textlink" data-example-id="${H(source.id)}"
     onclick="hearReferenceStudyExample(this.dataset.exampleId)">▷ ${T('الجملة فقط','Sentence only')}</button>
   </div></div>`;
 }).join('');
}

async function renderLinkedReference(id,exampleId){
 const row=referencePlayer?.rows.get(id);
 if(!row)return false;
 $('#app').innerHTML=referenceCard(row);
 const detail=$('.reference-rule');
 if(detail){
  detail.open=true;
  await openReferenceStudy(detail);
  if(exampleId){
   const example=detail.querySelector(`[data-reference-example="${CSS.escape(exampleId)}"]`);
   if(example){
    example.closest('details').open=true;
    example.focus({preventScroll:true});
    example.scrollIntoView({block:'center'});
   }
  }
 }
 return true;
}
