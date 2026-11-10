/* A visual collection separate from the sentence and dialogue libraries. */
let ideaLibrary=null,ideaPage=0,ideaTopic='',ideaQuery='',ideaAction='observe',ideaSceneId='';
let ideaSceneFilter='',ideaWordFilter='';
let ideaPracticePattern=null,ideaPracticeScenes=null,ideaPracticePending=false,ideaPracticeNext=null;
const ideaActions=[
 ['observe','لاحظ وتذكّر','Notice & recall'],
 ['apply','عبّر بطريقتك','Say it your way'],
 ['roleplay','تحاور','Role-play']
];
const ideaWriting=new Map(),ideaGuided=new Map();
let ideaArchive=[],ideaArchiveScope='scene',ideaArchiveView=null;
try{
 const entries=JSON.parse(localStorage.getItem('nasaq-idea-dialogues-v1'));
 if(Array.isArray(entries))ideaArchive=entries.filter(entry=>entry?.id&&entry.sceneId&&Array.isArray(entry.turns));
}catch{}
try{ideaSceneId=localStorage.getItem('nasaq-idea-scene')||''}catch{}
const ideaLibraryReady=fetch('api/idea-scenes',{signal:AbortSignal.timeout?.(3500)})
 .then(async response=>{
  if(!response.ok)return null;
  const data=await response.json();
  return data.schema===2&&Array.isArray(data.scenes)?data:null;
 })
 .catch(()=>null)
 .then(data=>data||fetch('idea-scenes.json').then(r=>r.ok?r.json():null).catch(()=>null));
lab=function(){
 return head(T('تحدّث من المشهد','Speak from scenes'),T('لاحظ التفاصيل، استخدم نمطًا في جملة من عندك، ثم جرّبه في حوار.','Notice the details, use a pattern in your own sentence, then try it in a conversation.'))+
  `${ideaPracticePattern?ideaPracticeBanner():''}
  <section id="idea-lab-active"></section>
  <dialog id="idea-zoom" aria-labelledby="idea-zoom-title" onclose="restoreIdeaZoom()"><div class="idea-zoom-header"><h2 id="idea-zoom-title"></h2><form method="dialog"><button class="secondary" aria-label="${T('إغلاق عرض المشهد','Close scene view')}">×</button></form></div><div class="idea-zoom-content"></div></dialog>
  <details class="panel idea-scene-picker" id="idea-scene-picker"><summary>${T('تصفّح المشاهد','Browse scenes')}</summary>
  <div class="toolbar idea-lab-tools">
   <label>${T('ابحث عن شيء أو فعل أو موقف','Find an object, action or situation')} <input type="search" value="${H(ideaQuery)}" oninput="ideaQuery=this.value;ideaPage=0;paintIdeaLibrary()" placeholder="${T('مثال: حقيبة، يزرع، quiet','Example: backpack, plant, هادئ')}"></label>
   <label>${T('الموضوع','Topic')} <select onchange="ideaTopic=this.value;ideaPage=0;paintIdeaLibrary()">
    <option value="">${T('كل الموضوعات','All topics')}</option>${(ideaLibrary?.topics||[]).map(t=>`<option value="${t.id}" ${ideaTopic===t.id?'selected':''}>${H(T(t.ar,t.en))}</option>`).join('')}</select></label>
   <label>${T('المجموعة','Collection')} <select onchange="ideaSceneFilter=this.value;ideaPage=0;paintIdeaLibrary()">
    <option value="">${T('كل المشاهد','All scenes')}</option><option value="saved" ${ideaSceneFilter==='saved'?'selected':''}>${T('مشاهد لها حوارات محفوظة','Scenes with saved dialogues')}</option>
   </select></label>
  </div>
  <p id="idea-lab-count" role="status"></p><div id="idea-lab-grid" class="scene-studio-grid idea-lab-grid"></div>
  <div class="buttonrow"><button class="secondary" id="idea-lab-prev" onclick="ideaPage--;paintIdeaLibrary()">${T('الصفحة السابقة','Previous page')}</button>
  <button class="secondary" id="idea-lab-next" onclick="ideaPage++;paintIdeaLibrary()">${T('الصفحة التالية','Next page')}</button></div></details>`;
};
function currentIdeaScene(){return ideaLibrary?.scenes.find(s=>s.id===ideaSceneId)}
function ideaPracticeForm(){return PILOT?.patterns.find(row=>row.id===ideaPracticePattern)?.form}
function openAdvancedIdea(id,next=null){
 const pattern=PILOT?.patterns.find(row=>row.id===id);
 if(!pattern)return;
 const dialog=$('#lesson');
 if(dialog?.open)closeLesson();else stopSpeech();
 ideaPracticePattern=id;
 ideaPracticeNext=next;
 ideaPracticePending=true;
 ideaPracticeScenes=null;
 ideaQuery='';ideaTopic='';ideaSceneFilter='';ideaPage=0;
 ideaAction='observe';ideaWordFilter='';
 navigate('lab');
 if(page==='lab')window.scrollTo(0,0);
}
function ideaPracticeBanner(){
 return `<div class="panel idea-practice-banner"><b>${T('تطبيق النمط في مشهد','Apply the pattern in a scene')}</b>
  <strong class="pattern-form" lang="en" dir="ltr">${H(ideaPracticeForm()||'')}</strong>
  <button class="textlink" onclick="clearAdvancedIdea()">${T('الممارسة الحرّة','Open practice')} ↗</button></div>`;
}
function clearAdvancedIdea(){
 ideaPracticePattern=null;
 ideaPracticeScenes=null;
 ideaPracticePending=false;
 ideaPracticeNext=null;
 ideaAction='observe';ideaTopic='';ideaQuery='';ideaSceneFilter='';ideaWordFilter='';
 ideaPage=0;
 render();
}
function prepareAdvancedIdea(){
 if(!ideaPracticePending||!ideaLibrary)return;
 ideaPracticeScenes=ideaLibrary.scenes.flatMap(scene=>{
  const example=scene.patterns?.find(link=>link.id===ideaPracticePattern&&link.en);
  return example?[{id:scene.id,hasTask:Boolean(example.taskEn)}]:[];
 }).sort((a,b)=>Number(b.hasTask)-Number(a.hasTask)).map(scene=>scene.id);
 ideaSceneId=ideaPracticeScenes[0]||'';
 ideaArchiveView=null;
 ideaPracticePending=false;
}
function findIdeaScenes(){
 const tokens=normalizeSceneQuery(ideaQuery).trim().split(/\s+/).filter(Boolean);
 const topics=new Map(ideaLibrary?.topics.map(t=>[t.id,t]));
 const saved=new Set(ideaArchive.map(entry=>entry.sceneId));
 const scenes=ideaLibrary?.scenes||[];
 const candidates=ideaPracticeScenes?ideaPracticeScenes.map(id=>scenes.find(scene=>scene.id===id)).filter(Boolean):scenes;
 return candidates.filter(scene=>{
  if(ideaTopic&&ideaTopic!==scene.topic)return false;
  if(ideaSceneFilter==='saved'&&!saved.has(scene.id))return false;
  const topic=topics.get(scene.topic);
  const searchable=normalizeSceneQuery([scene.ar,scene.en,scene.sentenceEn,scene.sentenceAr,scene.taskEn,scene.taskAr,
   topic?.ar,topic?.en,...scene.words.flatMap(w=>[w.en,w.ar]),...(scene.patterns||[]).flatMap(p=>[p.en,p.ar])].join(' '));
  return tokens.every(token=>searchable.includes(token));
 });
}
function ideaPicture(scene){
 return `<img src="${H(scene.path)}" width="${scene.width}" height="${scene.height}" loading="lazy" alt="${H(T(scene.sentenceAr,scene.sentenceEn))}">`;
}
function paintIdeaLibrary(){
 const grid=$('#idea-lab-grid');
 if(!grid)return;
 const matches=findIdeaScenes(),size=12,pages=Math.max(1,Math.ceil(matches.length/size));
 document.querySelectorAll('[data-idea-scene-step]').forEach(button=>{button.disabled=matches.length<2});
 ideaPage=Math.min(Math.max(ideaPage,0),pages-1);
 $('#idea-lab-count').textContent=ideaLibrary?
  T(`${matches.length} مشهد · صفحة ${ideaPage+1} من ${pages}`,`${matches.length} scenes · page ${ideaPage+1} of ${pages}`):
  T('جارٍ تحميل مكتبة المشاهد…','Loading the scene collection…');
 $('#idea-lab-prev').disabled=ideaPage===0;$('#idea-lab-next').disabled=ideaPage+1>=pages;
 grid.innerHTML=matches.slice(ideaPage*size,ideaPage*size+size).map(s=>`<article class="panel">
 <button class="idea-lab-card" onclick="chooseIdeaScene('${s.id}')">${ideaPicture(s)}<b>${H(T(s.ar,s.en))} ↗</b></button></article>`).join('');
}
function chooseIdeaScene(id,scroll=true){
 const scene=ideaLibrary?.scenes.find(s=>s.id===id)||(!ideaPracticePattern&&ideaLibrary?.scenes[0]);
 const host=$('#idea-lab-active');
 if(!host)return;
 if(!scene){
  host.textContent=ideaLibrary?T('لا يوجد مشهد مرتبط بهذا النمط في النسخة المحمّلة.','This version has no linked scene for this pattern.'):T('جارٍ تحميل المشاهد…','Loading scenes…');
  return;
 }
 if(scroll){
  ideaAction='observe';
  ideaWordFilter='';
  ideaArchiveView=null;
  $('#idea-scene-picker').open=false;
 }
 const introduce=ideaAutoFlash&&!ideaIntroducedScenes.has(scene.id)&&ideaWordMode!=='visible';
 ideaSceneId=scene.id;
 clearIdeaFlash();
 if(ideaWordMode==='flash')ideaWordMode='hidden';
 if($('#idea-zoom')?.open)$('#idea-zoom .idea-zoom-content').replaceChildren();
 try{localStorage.setItem('nasaq-idea-scene',scene.id)}catch{}
 host.innerHTML=`<article class="panel idea-lab-exercise">
  <div class="idea-lab-image" id="idea-viewer-home">${ideaViewer(scene)}</div><div class="idea-lab-practice"><h2 tabindex="-1">${H(T(scene.ar,scene.en))}</h2>
   <div class="idea-lab-modes" role="group" aria-label="${T('خطوات الممارسة','Practice steps')}">${ideaActions.map(([id,ar,en],index)=>
    `<button class="secondary" aria-pressed="${id===ideaAction}" data-idea-action="${id}" onclick="setIdeaAction('${id}')"><span>${index+1}</span> ${T(ar,en)}</button>`).join('')}</div>
   <div id="idea-lab-task"></div>
  </div></article>`;
 paintIdeaTask(scene);
 mountIdeaViewer(scene);
 if(introduce){
  ideaIntroducedScenes.add(scene.id);
  startIdeaSequence(true,false);
 }
 if(scroll&&!$('#idea-zoom')?.open){host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})}
}
function stepIdeaScene(delta){
 const list=findIdeaScenes();
 if(list.length<2)return;
 const index=list.findIndex(s=>s.id===ideaSceneId);
 const next=index<0?(delta>0?0:list.length-1):(index+delta+list.length)%list.length;
 chooseIdeaScene(list[next].id);
}
function setIdeaAction(value,focus=false){
 stopSpeech();
 ideaAction=value;
 document.querySelectorAll('[data-idea-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaAction===value)));
 paintIdeaTask(currentIdeaScene());
 if(focus)$('#idea-lab-task h3')?.focus();
}
function setIdeaWordFilter(value){
 ideaWordFilter=value;
 clearIdeaFlash();
 const scene=currentIdeaScene();
 if(ideaAction==='observe')paintIdeaTask(scene,true);
 setIdeaWordMode(ideaWordMode,false);
}
function visibleIdeaWords(scene){
 return scene.words.map((word,index)=>({ ...word,index })).filter(word=>!ideaWordFilter||word.kind===ideaWordFilter);
}
function ideaTarget(scene){
 return scene.patterns?.find(pattern=>pattern.en&&(!ideaPracticePattern||pattern.id===ideaPracticePattern));
}
function ideaPracticeTask(scene){
 const target=ideaTarget(scene);
 if(target?.taskEn)return [target.taskAr,target.taskEn];
 return target?
  ['انظر إلى المشهد وقل جملة بالنمط نفسه. غيّر تفصيلًا واحدًا في المثال ليتناسب مع ما تراه أو ما تريد قوله.',
   'Look at the scene and say a sentence using the same pattern. Change one detail in the example to suit what you see or want to say.']:
  [scene.taskAr,scene.taskEn];
}
function ideaModel(en,ar,id){
 const pattern=PILOT?.patterns.find(p=>p.id===id);
 return `<div class="idea-model"><p lang="en" dir="ltr">${id==='model'?H(en):comparisonModel(en,pattern)}</p>${EP.ar(ar)}
  <button class="secondary" onclick="hearIdeaExample('${id}')">▶ ${T('استمع','Listen')}</button></div>`;
}
function ideaVocabulary(scene,open){
 const words=visibleIdeaWords(scene);
 const entries=words.map(word=>`<li data-idea-vocab="${word.index}">
  <div><strong lang="en" dir="ltr">${H(word.en)}</strong>${Number.isFinite(word.x)?` <small class="idea-word-number">${word.index+1}</small>`:''}
  <span class="idea-vocab-meaning">${EP.ar(word.ar)} <small>${ideaWordKind(word)}</small></span></div>
  <button type="button" class="secondary idea-single-word" onclick="showIdeaMarker(${word.index},ideaSoloVoice)"
   aria-label="${H(T('انطق','Hear')+' '+word.en)}">▶</button></li>`);
 return `<details class="idea-vocabulary idea-disclosure" ${open?'open':''}><summary>${T('مفردات المشهد','Scene vocabulary')} · ${words.length}</summary>
  ${ideaAudioControls()}
  ${entries.length?`<ul class="idea-vocab">${entries.join('')}</ul>`:`<p>${T('لا مفردات ضمن هذا النوع.','No vocabulary of this type.')}</p>`}</details>`;
}
function paintIdeaTask(scene,keepVocabulary=false){
 if(!scene)return;
 const host=$('#idea-lab-task');
 const target=ideaTarget(scene);
 const form=target&&PILOT?.patterns.find(p=>p.id===target.id)?.form;
 const heading=(ar,en)=>`<h3 tabindex="-1">${T(ar,en)}</h3>`;
 const nextButton=ideaPracticeNext?`<button class="textlink" onclick="startNextIdeaLesson()">${T('انتقل إلى الدرس التالي','Go to the next lesson')} ↗</button>`:'';
 if(ideaAction==='roleplay'){
  host.innerHTML=heading('تحاور في هذا الموقف','Talk through the situation')+renderIdeaRoleplay(scene);
  paintIdeaGuided();
  paintIdeaArchive();
  return;
 }
 if(ideaAction==='apply'){
  const [ar,en]=ideaPracticeTask(scene);
  const saved=state.dailyPractice?.[practiceDate()]?.includes('scene:'+ideaPracticeKey(scene));
  host.innerHTML=`${heading('كوّن جملة وقلها بصوتك','Make a sentence and say it aloud')}
   ${form?`<p><strong class="pattern-form" lang="en" dir="ltr">${H(form)}</strong></p>`:''}
   <p>${H(T(ar,en))}</p>
   ${target?`<details class="idea-disclosure"><summary>${T('أرني مثالًا من المشهد','Show me a scene example')}</summary>${ideaModel(target.en,target.ar,target.id)}</details>`:''}
   <label>${T('اكتبها إذا احتجت إلى مسودة','Write it down if you need a draft')}<textarea dir="ltr" lang="en" rows="3" oninput="ideaWriting.set(ideaPracticeKey(currentIdeaScene()),this.value)">${H(ideaWriting.get(ideaPracticeKey(scene))||'')}</textarea></label>
   <div class="buttonrow"><button class="primary" onclick="completeIdeaPractice(this)" ${saved?'disabled':''}>${saved?T('✓ سُجّلت الممارسة','✓ Practice logged'):T('قلت جملتي','I said my sentence')}</button>
    <button class="textlink" onclick="hearIdeaWriting()">▶ ${T('استمع لمسودّتك','Hear your draft')}</button>${nextButton}</div>
   <p id="idea-practice-feedback" role="status"></p>`;
  return;
 }
 host.innerHTML=`${heading('ماذا ترى؟','What can you see?')}
  <p>${T('سمِّ شيئين تراهما، ثم صف فعلًا يجري في المشهد. اكشف الكلمات لتراجع ما تذكّرته.','Name two things you see, then describe one action. Reveal the words to check what you remembered.')}</p>
  ${form?`<p class="idea-target-line"><small>${T('النمط الذي ستستخدمه','Pattern you will use')}</small><strong class="pattern-form" lang="en" dir="ltr">${H(form)}</strong></p>`:''}
  ${ideaVocabulary(scene,keepVocabulary||host.querySelector('.idea-vocabulary')?.open)}
  <details class="idea-disclosure"><summary>${T('اكشف جملة تصف المشهد','Reveal a sentence about the scene')}</summary>${ideaModel(scene.sentenceEn,scene.sentenceAr,'model')}</details>`;
}
function ideaPracticeKey(scene){return scene?`${scene.id}:${ideaTarget(scene)?.id||'open'}`:''}
function completeIdeaPractice(button){
 recordDailyPractice('scene',ideaPracticeKey(currentIdeaScene()));
 button.disabled=true;
 button.textContent=T('✓ سُجّلت الممارسة','✓ Practice logged');
 $('#idea-practice-feedback').textContent=T('يمكنك الآن تجربة النمط في الخطوة «تحاور».','You can now try the pattern in the Role-play step.');
}
function startNextIdeaLesson(){
 const next=ideaPracticeNext;
 if(!next)return;
 clearAdvancedIdea();
 openLesson(next);
}
function hearIdeaWriting(){
 const text=ideaWriting.get(ideaPracticeKey(currentIdeaScene()))?.trim();
 if(text)speak(text);
 else toast(T('اكتب عبارة أولًا.','Write a line first.'));
}
function hearIdeaExample(id){
 const scene=currentIdeaScene();
 const text=id==='model'?scene?.sentenceEn:scene?.patterns.find(p=>p.id===Number(id))?.en;
 if(!text)return;
 stopSpeech();
 const voice=ideaSoloVoice;
 const playback=playIdeaAudio(text,ideaSceneCueId(scene.id,id,voice),voice);
 ideaVoice=playback;
 playback.done.then(ok=>{
  if(ideaVoice!==playback)return;
  ideaVoice=null;
  if(!ok)toast(T('تعذّر تشغيل المثال.','Could not play the example.'));
 });
}
const renderBeforeIdeaLab=render;
render=function(){
 clearIdeaFlash();
 ideaFrameObserver?.disconnect();
 renderBeforeIdeaLab();
 if(page==='lab'){prepareAdvancedIdea();paintIdeaLibrary();chooseIdeaScene(ideaSceneId,false);EP.decorate()}
};
if(page==='lab')render();
ideaLibraryReady.then(data=>{ideaLibrary=data;if(page==='lab')render()});
pilotReady.then(()=>{if(page==='lab')paintIdeaTask(currentIdeaScene())});
