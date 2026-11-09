/* A visual collection separate from the sentence and dialogue libraries. */
let ideaLibrary=null,ideaPage=0,ideaTopic='',ideaQuery='',ideaAction='describe',ideaSceneId='';
let ideaSceneFilter='',ideaWordFilter='';
let ideaPracticePattern=null,ideaPracticeScenes=null,ideaPracticePending=false,ideaPracticeContext='';
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
 return head(T('مختبر الأفكار','Idea Lab'),T('اختر مشهدًا، لاحظ تفاصيله، ثم حوّل ما تراه إلى كلام أو حوار.','Choose a scene, notice its details, then turn what you see into speech or conversation.'))+
  `<div class="toolbar idea-lab-tools">
   <label>${T('ابحث عن شيء أو فعل أو موقف','Find an object, action or situation')} <input type="search" value="${H(ideaQuery)}" oninput="ideaQuery=this.value;ideaPage=0;paintIdeaLibrary()" placeholder="${T('مثال: حقيبة، يزرع، quiet','Example: backpack, plant, هادئ')}"></label>
   <label>${T('الموضوع','Topic')} <select onchange="ideaTopic=this.value;ideaPage=0;paintIdeaLibrary()">
    <option value="">${T('كل الموضوعات','All topics')}</option>${(ideaLibrary?.topics||[]).map(t=>`<option value="${t.id}" ${ideaTopic===t.id?'selected':''}>${H(T(t.ar,t.en))}</option>`).join('')}</select></label>
   <label>${T('المجموعة','Collection')} <select onchange="ideaSceneFilter=this.value;ideaPage=0;paintIdeaLibrary()">
    <option value="">${T('كل المشاهد','All scenes')}</option><option value="saved" ${ideaSceneFilter==='saved'?'selected':''}>${T('مشاهد لها حوارات محفوظة','Scenes with saved dialogues')}</option>
   </select></label>
   <button class="secondary" onclick="suggestIdeaScene()">✦ ${T('اقترح مشهدًا','Suggest a scene')}</button>
  </div>
  ${ideaPracticePattern?ideaPracticeBanner():''}
  <section id="idea-lab-active"></section>
  <dialog id="idea-zoom" aria-labelledby="idea-zoom-title" onclose="restoreIdeaZoom()"><div class="idea-zoom-header"><h2 id="idea-zoom-title"></h2><form method="dialog"><button class="secondary" aria-label="${T('إغلاق عرض المشهد','Close scene view')}">×</button></form></div><div class="idea-zoom-content"></div></dialog>
  <p id="idea-lab-count" role="status"></p><div id="idea-lab-grid" class="scene-studio-grid idea-lab-grid"></div>
  <div class="buttonrow"><button class="secondary" id="idea-lab-prev" onclick="ideaPage--;paintIdeaLibrary()">${T('الصفحة السابقة','Previous page')}</button>
  <button class="secondary" id="idea-lab-next" onclick="ideaPage++;paintIdeaLibrary()">${T('الصفحة التالية','Next page')}</button></div>`;
};
function currentIdeaScene(){return ideaLibrary?.scenes.find(s=>s.id===ideaSceneId)}
function ideaPracticeForm(){return PILOT?.patterns.find(row=>row.id===ideaPracticePattern)?.form}
function openAdvancedIdea(id){
 const pattern=PILOT?.patterns.find(row=>row.id===id);
 if(!pattern)return;
 const dialog=$('#lesson');
 if(dialog?.open)closeLesson();else stopSpeech();
 ideaPracticePattern=id;
 ideaPracticeContext=route?.sentence?.pattern_id===id?route.sentence.en:'';
 ideaPracticePending=true;
 ideaPracticeScenes=null;
 ideaQuery='';ideaTopic='';ideaSceneFilter='';ideaPage=0;
 ideaAction='patterns';
 navigate('lab');
}
function ideaPracticeBanner(){
 return `<div class="panel idea-practice-banner"><b>${T('ممارسة متقدمة للنمط','Advanced pattern practice')}</b>
  <strong class="pattern-form" lang="en" dir="ltr">${H(ideaPracticeForm()||'')}</strong>
  <button class="textlink" onclick="clearAdvancedIdea()">${T('عرض كل المشاهد','Show all scenes')} ↗</button></div>`;
}
function clearAdvancedIdea(){
 ideaPracticePattern=null;
 ideaPracticeScenes=null;
 ideaPracticePending=false;
 ideaPage=0;
 render();
}
function prepareAdvancedIdea(){
 if(!ideaPracticePending||!ideaLibrary)return;
 const pattern=PILOT.patterns.find(row=>row.id===ideaPracticePattern);
 const normalize=value=>normalizeSceneQuery(value).split(/[^a-z0-9\u0600-\u06ff]+/).filter(word=>word.length>=4);
 const stop=new Set(['about','some','with','from','would','when','what','that','this','there','their','have','which','using','thing']);
 const tokens=new Set(normalize([ideaPracticeContext,pattern.title,pattern.topic,...(pattern.keywords||[])].filter(Boolean).join(' ')).filter(word=>!stop.has(word)));
 const scores=ideaLibrary.scenes.map((scene,index)=>{
  const match=scene.patterns?.find(link=>link.id===pattern.id);
  const words=new Set(normalize([scene.en,scene.ar,scene.sentenceEn,scene.taskEn,...scene.words.flatMap(word=>[word.en,word.ar])].join(' ')));
  const affinity=[...tokens].reduce((score,token)=>score+Number(words.has(token)),0);
  const rank=(match?.en?200:match?100:0)+affinity;
  return {scene,rank,tie:(index+pattern.id)%ideaLibrary.scenes.length};
 }).sort((a,b)=>b.rank-a.rank||a.tie-b.tie);
 ideaPracticeScenes=scores.slice(0,12).map(item=>item.scene.id);
 ideaSceneId=ideaPracticeScenes[0]||ideaSceneId;
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
 ideaPage=Math.min(Math.max(ideaPage,0),pages-1);
 $('#idea-lab-count').textContent=ideaLibrary?
  T(`${matches.length} مشهد · صفحة ${ideaPage+1} من ${pages}`,`${matches.length} scenes · page ${ideaPage+1} of ${pages}`):
  T('جارٍ تحميل مكتبة المشاهد…','Loading the scene collection…');
 $('#idea-lab-prev').disabled=ideaPage===0;$('#idea-lab-next').disabled=ideaPage+1>=pages;
 grid.innerHTML=matches.slice(ideaPage*size,ideaPage*size+size).map(s=>`<article class="panel">
 <button class="idea-lab-card" onclick="chooseIdeaScene('${s.id}')">${ideaPicture(s)}<b>${H(T(s.ar,s.en))} ↗</b></button></article>`).join('');
}
function suggestIdeaScene(){
 const matches=findIdeaScenes();
 const choices=matches.filter(s=>s.id!==ideaSceneId);
 const scene=choices[Math.floor(Math.random()*choices.length)]||matches[0];
 if(scene)chooseIdeaScene(scene.id);
}
function chooseIdeaScene(id,scroll=true){
 const scene=ideaLibrary?.scenes.find(s=>s.id===id)||ideaLibrary?.scenes[0];
 const host=$('#idea-lab-active');
 if(!scene||!host)return;
 if(ideaSceneId!==scene.id)ideaArchiveView=null;
 const introduce=ideaAutoFlash&&!ideaIntroducedScenes.has(scene.id)&&ideaWordMode!=='visible';
 ideaSceneId=scene.id;
 clearIdeaFlash();
 if(ideaWordMode==='flash')ideaWordMode='hidden';
 if($('#idea-zoom')?.open)$('#idea-zoom .idea-zoom-content').replaceChildren();
 try{localStorage.setItem('nasaq-idea-scene',scene.id)}catch{}
 host.innerHTML=`<article class="panel idea-lab-exercise">
  <div class="idea-lab-image" id="idea-viewer-home">${ideaViewer(scene)}</div><div class="idea-lab-practice"><h2 tabindex="-1">${H(T(scene.ar,scene.en))}</h2>
   <div class="buttonrow idea-lab-modes">${[['describe','صِف ما ترى','Describe'],['recall','تذكّر المفردات','Recall words'],['write','اكتب فكرة','Write an idea'],['roleplay','ابتكر حوارًا','Role-play'],['patterns','أنماط تناسب الصورة','Related patterns']].map(([id,ar,en])=>
    `<button class="secondary" aria-pressed="${id===ideaAction}" data-idea-action="${id}" onclick="setIdeaAction('${id}')">${T(ar,en)}</button>`).join('')}</div>
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
 const matching=findIdeaScenes(),list=matching.length?matching:ideaLibrary.scenes;
 const index=list.findIndex(s=>s.id===ideaSceneId);
 const next=index<0?(delta>0?0:list.length-1):(index+delta+list.length)%list.length;
 chooseIdeaScene(list[next].id);
}
function setIdeaAction(value){
 ideaAction=value;
 document.querySelectorAll('[data-idea-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaAction===value)));
 paintIdeaTask(currentIdeaScene());
}
function setIdeaWordFilter(value){
 ideaWordFilter=value;
 clearIdeaFlash();
 const scene=currentIdeaScene();
 if(['describe','recall','write'].includes(ideaAction))paintIdeaTask(scene);
 setIdeaWordMode(ideaWordMode,false);
}
function visibleIdeaWords(scene){
 return scene.words.map((word,index)=>({ ...word,index })).filter(word=>!ideaWordFilter||word.kind===ideaWordFilter);
}
function ideaPhraseExamples(scene){
 return [{en:scene.sentenceEn,ar:scene.sentenceAr},...(scene.patterns||[]).filter(pattern=>pattern.en)];
}
function hearIdeaPhrase(index){const scene=currentIdeaScene();if(scene)speak(ideaPhraseExamples(scene)[index].en)}
function paintIdeaTask(scene){
 if(!scene)return;
 const entries=ideaWordFilter==='phrase'?
  ideaPhraseExamples(scene).map((phrase,index)=>`<li><button class="textlink" onclick="hearIdeaPhrase(${index})" lang="en" dir="ltr">▶ ${H(phrase.en)}</button>${EP.ar(phrase.ar)}</li>`):
  visibleIdeaWords(scene).map(word=>`<li data-idea-vocab="${word.index}">
   <div><strong lang="en" dir="ltr">${H(word.en)}</strong>${Number.isFinite(word.x)?` <small class="idea-word-number">${word.index+1}</small>`:''}
    <span class="idea-vocab-meaning">${EP.ar(word.ar)} <small>${ideaWordKind(word)}</small></span></div>
   <div class="idea-word-voices">${[['male','Adam'],['female','Bella']].map(([voice,name])=>
    `<button type="button" class="secondary" onclick="showIdeaMarker(${word.index},'${voice}')" aria-label="${H(word.en+' · '+name)}">▷ ${name}</button>`).join('')}</div></li>`);
 const words=`<section class="idea-vocabulary"><h3>${T('مفردات المشهد','Scene vocabulary')}</h3>
  ${ideaWordFilter!=='phrase'?ideaAudioControls():''}<ul class="idea-vocab">${entries.join('')}</ul></section>`;
 const sentence=`<div class="idea-model"><p lang="en" dir="ltr">${H(scene.sentenceEn)}</p>${EP.ar(scene.sentenceAr)}
  <button class="secondary" onclick="hearIdeaLine(-1)">▶ ${T('استمع إلى الجملة','Listen to the sentence')}</button></div>`;
 const disclose=(title,body)=>`<details><summary>${title}</summary>${body}</details>`;
 const host=$('#idea-lab-task');
 if(ideaAction==='roleplay'){
  host.innerHTML=renderIdeaRoleplay(scene);
  paintIdeaGuided();
  paintIdeaArchive();
  return;
 }
 if(ideaAction==='patterns'){host.innerHTML=renderIdeaPatterns(scene);return}
 if(ideaAction==='write'){
  const form=ideaPracticeForm();
  host.innerHTML=`<p lang="en" dir="ltr">${H(scene.taskEn)}</p>${EP.ar(scene.taskAr)}
   ${form?`<p>${T('استخدم هذا النمط في ردّك','Use this pattern in your reply')} <strong class="pattern-form" lang="en" dir="ltr">${H(form)}</strong></p>`:''}
   <label>${T('اكتب وصفك أو ردّك','Write your description or reply')}<textarea dir="ltr" lang="en" rows="4" oninput="ideaWriting.set(ideaSceneId,this.value)">${H(ideaWriting.get(scene.id)||'')}</textarea></label>
   <div class="buttonrow"><button class="secondary" onclick="hearIdeaWriting()">▶ ${T('استمع لما كتبت','Listen to your writing')}</button></div>
   ${disclose(T('جملة ومفردات تساعدك','Model sentence and words'),sentence+words)}`;
  return;
 }
 host.innerHTML=ideaAction==='recall'?
  `<p>${T('سمِّ شيئين، ثم صف فعلًا وصفة من الصورة قبل كشف المفردات.','Name two objects, then describe an action and an adjective before revealing the words.')}</p>${disclose(T('اكشف المفردات واسمعها','Reveal and hear the words'),words)}${disclose(T('اكشف جملة نموذجية','Reveal a model sentence'),sentence)}`:
  `<p>${T('صف شيئًا في المقدمة، وآخر في الخلف، واذكر ما يحدث الآن.','Describe something in the foreground and background, then say what is happening.')}</p>${sentence}${words}`;
}
function hearIdeaWriting(){
 const text=ideaWriting.get(ideaSceneId)?.trim();
 if(text)speak(text);
 else toast(T('اكتب عبارة أولًا.','Write a line first.'));
}
function renderIdeaPatterns(scene){
 const cards=(scene.patterns||[]).flatMap(suggestion=>{
  if(suggestion.id===ideaPracticePattern)return [];
  const pattern=PILOT?.patterns.find(p=>p.id===suggestion.id);
  if(!pattern)return [];
  const sample=PILOT.sentences.find(row=>row.pattern_id===pattern.id);
  const en=suggestion.en||sample?.en,ar=suggestion.ar||sample?.ar;
  return [`<article class="idea-pattern-card"><b class="pattern-form" lang="en" dir="ltr">${H(pattern.form)}</b>
   ${suggestion.en?`<span class="chip">${T('مثال من المشهد','Scene example')}</span>`:`<span class="chip">${T('مثال من الدرس','Lesson example')}</span>`}
   ${en?`<p lang="en" dir="ltr">${H(en)}</p>${EP.ar(ar)}`:''}
   <div class="buttonrow"><button class="secondary" onclick="hearIdeaPattern(${pattern.id})">▶ ${T('اسمع المثال','Hear the example')}</button>
   <button class="textlink" onclick="openLesson(${pattern.id})">${T('افتح درس النمط','Open pattern lesson')} ↗</button></div></article>`];
 });
 const active=PILOT?.patterns.find(pattern=>pattern.id===ideaPracticePattern);
 const applied=scene.patterns?.find(link=>link.id===ideaPracticePattern&&link.en);
 const exercise=active?`<section class="idea-pattern-card idea-pattern-challenge">
  <h3>${T('طبّق النمط على هذا المشهد','Apply the pattern to this scene')}</h3>
  <p><strong class="pattern-form" lang="en" dir="ltr">${H(active.form)}</strong></p>
  ${applied?`<p lang="en" dir="ltr">${H(applied.en)}</p>${EP.ar(applied.ar)}`:`<p>${T('تطبيق مفتوح: صف تفصيلًا في الصورة أو ابتكر ردًا مستخدمًا التركيب أعلاه.','Open practice: describe a detail or invent a reply using the structure above.')}</p>`}
  <div class="buttonrow"><button class="primary" onclick="setIdeaAction('write')">${T('اكتب تطبيقك','Write your example')}</button>
  <button class="secondary" onclick="setIdeaAction('roleplay')">${T('تدرّب في حوار','Practise in dialogue')}</button></div>
 </section>`:'';
 return `${exercise}<p>${T('جرّب أحد هذه التراكيب لوصف الصورة أو لبدء حوار عنها.','Use one of these structures to describe the picture or start a conversation.')}</p>
  <div class="idea-patterns">${cards.join('')||T('جارٍ تحميل الأنماط…','Loading patterns…')}</div>`;
}
function hearIdeaPattern(id){
 const selected=currentIdeaScene()?.patterns?.find(p=>p.id===id);
 const example=selected?.en||PILOT?.sentences.find(row=>row.pattern_id===id)?.en;
 if(example)speak(example);
}
function hearIdeaLine(index){
 const scene=ideaLibrary?.scenes.find(s=>s.id===ideaSceneId);
 const text=index<0?scene?.sentenceEn:scene?.words[index]?.en;
 if(text)speak(text);
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
pilotReady.then(()=>{if(page==='lab'&&ideaAction==='patterns')paintIdeaTask(currentIdeaScene())});
