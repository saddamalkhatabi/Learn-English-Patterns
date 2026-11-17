let studioWordScene=null,studioActiveId=null,studioPattern=null,studioPurpose='',studioNextLesson=null,studioOpenEpoch=0;
let studioVocabulary=null,studioVocabularyLoad=null;
function loadStudioVocabulary(){
 if(!studioVocabularyLoad)studioVocabularyLoad=fetch('scene-vocabulary.json').then(response=>response.ok?response.json():null).then(data=>{studioVocabulary=data?.sentences||{};return data}).catch(()=>null);
 return studioVocabularyLoad;
}
function smartLibraryFilters(){
 return `<label>${T('النمط','Pattern')}<select id="studio-pattern" onchange="selectStudioPattern(this.value)">
  <option value="">${T('كل الأنماط','All patterns')}</option>${(PILOT?.patterns||[]).map(p=>
   `<option value="${p.id}" ${studioPattern===p.id?'selected':''}>${H(p.form)}</option>`
  ).join('')}</select></label>
  <label>${T('الغرض','Purpose')}<select id="studio-purpose" onchange="studioPurpose=this.value;studioPage=0;paintSceneStudio()">
   <option value="">${T('كل الأغراض','All purposes')}</option>${(CURRICULUM?.routes||[]).filter(route=>route.id!=='full-course').map(route=>
    `<option value="${route.id}" ${studioPurpose===route.id?'selected':''}>${H(T(route.title,EP.dictionary.get(route.title)||route.title))}</option>`
   ).join('')}</select></label>`;
}
function smartSentencePatterns(row){
 if(row.pattern_id)return [row.pattern_id];
 return (row.pattern_ids||[]).map(id=>COURSE_CATALOG?.patterns.find(pattern=>pattern.id===id)?.planned_pattern_id||id);
}
function matchesStudioContext(row){
 const ids=smartSentencePatterns(row);
 if(studioPattern&&!ids.includes(studioPattern))return false;
 const route=CURRICULUM?.routes.find(route=>route.id===studioPurpose);
 return !route||route.pattern_ids.some(id=>ids.includes(id));
}
function selectStudioPattern(value){
 studioPattern=Number(value)||null;studioPage=0;
 $('#scene-studio-query').value='';$('#scene-studio-topic').value='';
 paintSceneStudio();
}
function prepareSmartSelection(){
 const context=$('#studio-pattern-context');
 if(!context)return;
 const pattern=PILOT?.patterns.find(p=>p.id===studioPattern);
 context.innerHTML=pattern?`<div class="panel studio-pattern-context"><b>${T('ممارسة النمط في صوره الأصلية','Practise the pattern in its original scenes')}</b>
  <strong class="pattern-form" lang="en" dir="ltr">${H(pattern.form)}</strong></div>`:'';
 if(studioActiveId&&!$('#scene-studio-active').children.length)openSmartScene(studioActiveId,false);
}
function openAdvancedIdea(id,next=null){
 const pattern=PILOT?.patterns.find(p=>p.id===id);if(!pattern)return;
 return openLinkedLearning('pattern-photos',id,{next:next??undefined});
}
function backToStudioGallery(){
 const id=studioActiveId;
 studioActiveId=null;
 studioOpenEpoch++;
 returnToSceneGallery($('#scene-studio-gallery'),$('#scene-studio-active'),id,'#scene-studio-suggest');
 studioWordScene=null;
}
async function openSmartScene(id,focus=true){
 const host=$('#scene-studio-active');
 const practice=ideaLibrary?.scenes.find(scene=>scene.id===id);
 const item=sceneArchive?.scenes.find(scene=>scene.id===id),row=dialogueScene(id);
 if(!host||(!row&&!practice))return;
 const epoch=++studioOpenEpoch;
 stopSpeech();clearIdeaFlash();ideaWordFilter='';ideaWordMode='visible';
 studioActiveId=id;
 studioWordScene=null;
 $('#scene-studio-gallery').hidden=true;
 host.hidden=false;
 $('#idea-zoom .idea-zoom-content')?.replaceChildren();
 const back=sceneGalleryReturnButton('backToStudioGallery');
 host.innerHTML=back+`<p role="status">${T('جارٍ تجهيز مفردات الصورة…','Preparing scene vocabulary…')}</p>`;
 await Promise.all([loadStudioVocabulary(),loadVocabulary()]);
 if(!host.isConnected||page!=='scene-studio'||studioMode!=='photos'||epoch!==studioOpenEpoch)return;
 const data=studioVocabulary?.[id]||{words:[]},crop=row?.image?.crop;
 studioWordScene=practice?{...practice,id:'studio:'+id}:{id:'studio:'+id,sentenceId:id,en:item?.description||row.en,ar:item?.descriptionAr||row.ar,
  topic:item?.topics[0],
  sentenceEn:row.en,sentenceAr:row.ar,words:data.words,reviewed:data.reviewed,
  taskEn:'Imagine two people in this scene. Write an opening, a reply, and a follow-up question.',
  taskAr:'تخيّل شخصين في هذا المشهد واكتب افتتاحية وردًّا وسؤال متابعة.',
  width:crop?.width||500,height:crop?.height||300,
  patterns:smartSentencePatterns(row).map(id=>({id,en:row.en,ar:row.ar}))};
 studioWordScene.practicePatternId=studioPattern;
 const same=studioPattern?PILOT.sentences.filter(sentence=>sentence.pattern_id===studioPattern):[];
 const location=dialogueSceneLocations.get(id);
 const dialogue=location?PILOT?.dialogues.find(item=>item.id===location.id):null;
 const line=dialogue?.lines[location?.turn];
 host.innerHTML=back+`<article class="panel studio-exercise">
  <div id="idea-viewer-home">${crop||practice?ideaViewer(studioWordScene):`<p>${T('لم تُضف صورة لهذه الجملة بعد.','This sentence has no scene yet.')}</p>`}</div>
  <div><section class="studio-original"><h2 tabindex="-1">${T('الجملة الأساسية للصورة','The photo’s original sentence')}</h2>
   ${practice?`<p lang="en" dir="ltr">${line?dialogueWords(line):H(practice.sentenceEn)}</p>${EP.ar(line?.ar||practice.sentenceAr)}
   ${dialogue?.audio?`<button class="primary" onclick="playStudioDialogueTurn('${H(id)}')">▶ ${T('استمع إلى دور المحادثة','Hear this conversation turn')}</button>`:''}
   ${!dialogue?`<button class="primary" onclick="hearIdeaExample('model')">▶ ${T('استمع إلى جملة المشهد','Hear the scene sentence')}</button>`:''}
   ${dialogueLifecycles[dialogue?.id]?`<button class="secondary" onclick="openLinkedLearning('journey','${H(dialogue.id)}')">${T('شاهد تسلسل المحادثة','View the conversation sequence')} ↗</button>`:''}
   <p>${H(T(practice.taskAr,practice.taskEn))}</p>`:
   `<p lang="en" dir="ltr">${EP.words(row,'data-studio-word')}</p>${EP.ar(row.ar)}
   <div class="buttonrow"><button class="primary" onclick="playStudioSentence('${H(id)}','male')">▶ Adam</button><button class="secondary" onclick="playStudioSentence('${H(id)}','female')">▶ Bella</button></div>`}
  <p class="lesson-hint">${learningLevelLabel(sceneLearningLevel(studioWordScene))}</p></section>
  <div id="studio-words"></div>${practice?'':EP.rule(row,{compact:true})}
  ${same.length?`<details class="idea-disclosure"><summary>${T('جمل وصور النمط نفسه','More scenes using this pattern')} · ${same.length}</summary>
   ${same.map(sentence=>`<button class="textlink studio-related-line" onclick="openStudioScene('${sentence.id}')">${EP.words(sentence)}</button>`).join('')}</details>`:''}
  <details class="studio-dialogue-area idea-disclosure" open><summary>${T('ابتكر محادثة من الصورة','Create a conversation from this scene')}</summary>
   <div id="studio-dialogue">${renderIdeaRoleplay(studioWordScene)}</div>
  </details>
  ${studioPattern?`<div class="buttonrow"><button class="secondary" onclick="recordDailyPractice('pattern-scene','${studioPattern}:${id}');this.textContent=T('✓ سُجّلت الممارسة','✓ Practice logged');this.disabled=true">${T('مارست النمط بصوتي','I practised the pattern aloud')}</button>
   ${studioNextLesson?`<button class="primary" onclick="openLinkedLearning('lesson',${studioNextLesson})">${T('الدرس التالي','Next lesson')} ↗</button>`:''}</div>`:''}</div></article>`;
 paintStudioWords(studioWordScene,true);
 if(crop||practice)mountIdeaViewer(studioWordScene);
 paintIdeaGuided();paintIdeaArchive();
 if(row)window.EPOffline?.rememberSentences([row]);
 if(focus&&!$('#idea-zoom')?.open){
  host.querySelector('h2').focus({preventScroll:true});
  host.scrollIntoView({block:'start'});
 }
}
ideaLibraryReady.then(()=>{if(page==='scene-studio')paintSceneStudio()});
function paintStudioWords(scene,open=false){
 const host=$('#studio-words');if(host)host.innerHTML=ideaVocabulary(scene,open);
}
function stepStudioScene(delta){
 const list=studioMatches(),index=list.findIndex(entry=>entry.row.id===studioActiveId);
 if(!list.length)return;
 openStudioScene(list[(index+delta+list.length)%list.length].row.id);
}
