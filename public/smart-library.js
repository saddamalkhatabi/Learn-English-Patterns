let studioWordScene=null,studioActiveId=null,studioPattern=null,studioPurpose='',studioNextLesson=null,studioPendingId=null,studioOpenEpoch=0;
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
 studioPattern=Number(value)||null;studioPage=0;studioActiveId=null;studioPendingId=null;
 $('#scene-studio-query').value='';$('#scene-studio-topic').value='';
 $('#scene-studio-active').replaceChildren();
 paintSceneStudio();
}
function prepareSmartSelection(){
 const context=$('#studio-pattern-context');
 if(!context)return;
 const pattern=PILOT?.patterns.find(p=>p.id===studioPattern);
 context.innerHTML=pattern?`<div class="panel studio-pattern-context"><b>${T('ممارسة النمط في صوره الأصلية','Practise the pattern in its original scenes')}</b>
  <strong class="pattern-form" lang="en" dir="ltr">${H(pattern.form)}</strong></div>`:'';
 if(!$('#scene-studio-active')?.children.length){
  const id=studioPendingId||studioActiveId||(pattern?studioMatches()[0]?.row.id:null);
  if(id){studioPendingId=null;openSmartScene(id)}
 }
}
async function openAdvancedIdea(id,next=null){
 const pattern=PILOT?.patterns.find(p=>p.id===id);if(!pattern)return;
 if($('#lesson')?.open)closeLesson();else stopSpeech();
 studioPattern=id;studioPurpose='';studioPage=0;studioActiveId=null;studioPendingId=null;studioNextLesson=next;
 await showSmartLibrary();window.scrollTo(0,0);
}
async function showSmartLibrary(){
 await Promise.all([pilotReady,archiveReady,ideaLibraryReady,typeof referenceDataReady!=='undefined'?referenceDataReady:Promise.resolve()]);
 if(page==='scene-studio'){render();return}
 const changed=new Promise(resolve=>window.addEventListener('hashchange',resolve,{once:true}));
 navigate('scene-studio');await changed;
}
async function openSmartSentence(id){
 studioPattern=null;studioPurpose='';studioActiveId=null;studioPendingId=id;studioNextLesson=null;
 await showSmartLibrary();
 await openSmartScene(id);
}
async function openSmartScene(id){
 const epoch=++studioOpenEpoch;
 const practice=dialogueSceneLocations.has(id)?ideaLibrary?.scenes.find(scene=>scene.id===id):null;
 const item=sceneArchive?.scenes.find(scene=>scene.id===id),row=dialogueScene(id);
 if(!row&&!practice)return;
 stopSpeech();studioAudio?.pause();clearIdeaFlash();ideaWordFilter='';ideaWordMode=practice?'visible':'hidden';
 const host=$('#scene-studio-active');if(!host)return;
 host.textContent=T('جارٍ تجهيز مفردات الصورة…','Preparing scene vocabulary…');
 await Promise.all([loadStudioVocabulary(),loadVocabulary()]);
 if(page!=='scene-studio'||epoch!==studioOpenEpoch)return;
 const data=studioVocabulary?.[id]||{words:[]},crop=item?row?.image?.crop:null;
 studioActiveId=id;
 studioWordScene=practice?{...practice,id:'studio:'+id}:{id:'studio:'+id,sentenceId:id,en:item?.description||row.en,ar:item?.descriptionAr||row.ar,
  sentenceEn:row.en,sentenceAr:row.ar,words:data.words,reviewed:data.reviewed,
  taskEn:'Imagine two people in this scene. Write an opening, a reply, and a follow-up question.',
  taskAr:'تخيّل شخصين في هذا المشهد واكتب افتتاحية وردًّا وسؤال متابعة.',
  width:crop?.width||500,height:crop?.height||300,patterns:[]};
 const same=studioPattern?PILOT.sentences.filter(sentence=>sentence.pattern_id===studioPattern):[];
 const location=dialogueSceneLocations.get(id);
 const dialogue=practice?PILOT?.dialogues.find(item=>item.id===location.id):null;
 const line=dialogue?.lines[location.turn];
 host.innerHTML=`<article class="panel studio-exercise">
  <div id="idea-viewer-home">${crop||practice?ideaViewer(studioWordScene):`<p>${T('لم تُضف صورة لهذه الجملة بعد.','This sentence has no scene yet.')}</p>`}</div>
  <div><section class="studio-original"><h2 tabindex="-1">${T('الجملة الأساسية للصورة','The photo’s original sentence')}</h2>
   ${practice?`<p lang="en" dir="ltr">${line?dialogueWords(line):H(practice.sentenceEn)}</p>${EP.ar(line?.ar||practice.sentenceAr)}
   ${dialogue?.audio?`<button class="primary" onclick="playStudioDialogueTurn('${H(id)}')">▶ ${T('استمع إلى دور المحادثة','Hear this conversation turn')}</button>`:''}
   <p>${H(T(practice.taskAr,practice.taskEn))}</p>`:
   `<p lang="en" dir="ltr">${EP.words(row,'data-studio-word')}</p>${EP.ar(row.ar)}
   <div class="buttonrow"><button class="primary" onclick="playStudioSentence('${H(id)}','male')">▶ Adam</button><button class="secondary" onclick="playStudioSentence('${H(id)}','female')">▶ Bella</button></div>`}
  </section>
  <div id="studio-words"></div>${practice?'':EP.rule(row,{compact:true})}
  ${same.length?`<details class="idea-disclosure"><summary>${T('جمل وصور النمط نفسه','More scenes using this pattern')} · ${same.length}</summary>
   ${same.map(sentence=>`<button class="textlink studio-related-line" onclick="openStudioScene('${sentence.id}')">${EP.words(sentence)}</button>`).join('')}</details>`:''}
  <details class="studio-dialogue-area idea-disclosure" open><summary>${T('ابتكر محادثة من الصورة','Create a conversation from this scene')}</summary>
   ${sceneAiTools(practice?'idea':'studio',id)}<div id="studio-dialogue">${renderIdeaRoleplay(studioWordScene,false)}</div>
  </details>
  ${studioPattern?`<div class="buttonrow"><button class="secondary" onclick="recordDailyPractice('pattern-scene','${studioPattern}:${id}');this.textContent=T('✓ سُجّلت الممارسة','✓ Practice logged');this.disabled=true">${T('مارست النمط بصوتي','I practised the pattern aloud')}</button>
   ${studioNextLesson?`<button class="primary" onclick="openLesson(${studioNextLesson})">${T('الدرس التالي','Next lesson')} ↗</button>`:''}</div>`:''}</div></article>`;
 paintStudioWords(studioWordScene,Boolean(practice));
 if(crop||practice)mountIdeaViewer(studioWordScene);
 paintIdeaGuided();paintIdeaArchive();
 if(row)window.EPOffline?.rememberSentences([row]);
 host.scrollIntoView({block:'start'});
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
