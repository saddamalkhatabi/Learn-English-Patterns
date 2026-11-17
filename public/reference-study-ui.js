let referenceStudyLoad;
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
 return data.examples[id]||referencePlayer?.rows.get(id)||PILOT?.sentences.find(row=>row.id===id);
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
  ${row.recordings?.male?.path?`<button type="button" class="secondary" data-example-id="${H(row.id)}" onclick="hearReferenceStudyExample(this.dataset.exampleId)">▶ ${T('استمع إلى المثال','Hear the example')}</button>`:''}
  ${row.source?`<a class="textlink reference-study-source" href="${H(row.source)}" target="_blank" rel="noopener noreferrer">${T('مرجع الاستعمال','Usage source')}</a>`:''}</li>`;
}

function hearReferenceStudyExample(id){
 const row=referencePlayer?.rows.get(id)||PILOT?.sentences.find(sentence=>sentence.id===id);
 const recording=row?.recordings?.male;
 if(!recording?.path)return;
 stopSpeech({keepReferencePlayer:true});
 const audio=new Audio(recording.path);
 catalogAudio=audio;
 audio.playbackRate=state.rate||1;
 audio.play().catch(()=>toast(T('تعذّر تشغيل المثال.','Could not play the example.')));
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
 const examples=study.examples.map(id=>referenceExampleRow(id,data)).filter(Boolean);
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
 const referenceId=detail.dataset.referenceId,study=data.rows[referenceId];
 const ordered=[referenceId,...study.examples];
 host.innerHTML=study.terms.map(id=>{
  const entry=vocabularyById.get(id);
  if(!entry)return '';
  const uses=new Map(entry.sourceIds.map(index=>[atlas.sources[index].id,atlas.sources[index]]));
  const source=uses.get(ordered.find(id=>uses.has(id)));
  const text=source?.uk&&EP.prefs.englishUsage==='uk'?source.uk:source&&englishDisplay(source.en,source);
  const name=vocabularyEntryName(entry);
  return `<div class="reference-study-term">
   <button type="button" class="textlink" data-term="${H(entry.id)}" data-source="${H(source?.id||referenceId)}"
    onclick="openVocabularyFromScene(this.dataset.term,this.dataset.source)" lang="en" dir="ltr">${H(name)} ↗</button>
   ${wordTypeBadge(entry)}${vocabularyUsageTags(entry)}${EP.ar(entry.ar)}
   ${text?`<p lang="en" dir="ltr">${vocabularyMarked(text,name)}</p>`:''}</div>`;
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
