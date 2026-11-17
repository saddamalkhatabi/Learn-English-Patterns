/* Guided practice used by the smart photo library. */
let ideaLibrary=null,ideaAction='observe',ideaWordFilter='';
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
window.addEventListener('storage',event=>{
 if(event.key!=='nasaq-idea-dialogues-v1')return;
 try{
  const entries=JSON.parse(event.newValue||'[]');
  if(!Array.isArray(entries))return;
  ideaArchive=entries.filter(entry=>entry?.id&&entry.sceneId&&Array.isArray(entry.turns));
  paintIdeaArchive();
  refreshSavedPhotoResults();
 }catch{}
});
const ideaLibraryReady=fetch('api/idea-scenes',{signal:AbortSignal.timeout?.(3500)})
 .then(async response=>{
  if(!response.ok)return null;
  const data=await response.json();
  return data.schema===2&&Array.isArray(data.scenes)?data:null;
 })
 .catch(()=>null)
 .then(data=>data||fetch('idea-scenes.json').then(r=>r.ok?r.json():null).catch(()=>null))
 .then(data=>{ideaLibrary=data;return data});
function currentIdeaScene(){return page==='scene-studio'?studioWordScene:null}
function scenePhotoKey(id){return id?.replace(/^studio:/,'')||''}
function ideaPicture(scene){
 if(scene.sentenceId)return studioPicture(dialogueScene(scene.sentenceId),scene.sentenceAr,scene.sentenceEn);
 return `<img src="${H(scene.path)}" width="${scene.width}" height="${scene.height}" loading="lazy" alt="${H(T(scene.sentenceAr,scene.sentenceEn))}">`;
}
function setIdeaAction(value,focus=false){
 stopSpeech();
 ideaAction=value;
 document.querySelectorAll('[data-idea-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaAction===value)));
 paintIdeaTask(currentIdeaScene(),true);
 if(focus)$('#idea-lab-task h3')?.focus();
}
function setIdeaWordFilter(value){
 ideaWordFilter=value;
 clearIdeaFlash();
 const scene=currentIdeaScene();
 if(ideaAction==='observe')paintIdeaTask(scene,true);
 setIdeaWordMode(ideaWordMode);
}
function visibleIdeaWords(scene){
 return scene.words.map((word,index)=>({ ...word,index })).filter(word=>{
  if(!ideaWordFilter)return true;
  const wanted={object:['NOUN','PROPN'],action:['VERB','AUX'],description:['ADJ','ADV'],phrase:['PHRASE','ADP']}[ideaWordFilter]||[];
  return wanted.includes(EPVocabulary.posFor(word));
 });
}
function ideaPracticeControls(){
 return `<div class="idea-lab-modes" role="group" aria-label="${T('خطوات الممارسة','Practice steps')}">${ideaActions.map(([id,ar,en])=>
  `<button type="button" class="secondary" aria-pressed="${id===ideaAction}" data-idea-action="${id}" onclick="setIdeaAction('${id}')">${T(ar,en)}</button>`).join('')}</div>`;
}
function ideaPracticeTask(scene){return [scene.taskAr,scene.taskEn]}
function ideaModel(en,ar,id){
 const pattern=PILOT?.patterns.find(p=>p.id===id);
 return `<div class="idea-model"><p lang="en" dir="ltr">${englishIndexedMarkup(en,{ar},
  text=>id==='model'?H(text):comparisonModel(text,pattern,false))}</p>${EP.ar(ar)}
  <button class="secondary" onclick="hearIdeaExample('${id}')">▶ ${T('استمع','Listen')}</button></div>`;
}
function ideaVocabulary(scene,open){
 const words=visibleIdeaWords(scene);
 const pictureWords=scene.words.some(hasIdeaPoint);
 const title=scene.sentenceId?
  pictureWords?T('مفردات الصورة والجملة','Picture and sentence vocabulary'):T('مفردات الجملة','Sentence vocabulary'):
  T('مفردات الصورة','Picture vocabulary');
 const entries=words.map(word=>{
  const term=vocabularyEntryFor(word),usage=EPEnglish.analyze(word.en,word);
  return `<li data-idea-vocab="${word.index}">
  <div><button type="button" class="idea-show-word" lang="en" dir="ltr" onclick="showIdeaMarker(${word.index},{clickedLanguage:'en',fromList:true})">${H(usage[EP.prefs.englishUsage])}</button>
  ${englishUsageButton(usage)}
  ${hasIdeaPoint(word)?` <button type="button" class="idea-word-dot" onclick="showIdeaMarker(${word.index},{fromList:true})"
   aria-label="${H(T('أبرز في الصورة','Highlight in the picture')+' · '+word.en)}"></button>`:''}
  <span class="idea-vocab-meaning">${word.ar?`<button type="button" class="idea-show-word ar-content" lang="ar" dir="rtl"
   onclick="showIdeaMarker(${word.index},{clickedLanguage:'ar',fromList:true})">${H(word.ar)}</button>`:''} ${wordTypeBadge(word)}</span></div>
  <button type="button" class="secondary idea-single-word" onclick="showIdeaMarker(${word.index},{voice:ideaSoloVoice,fromList:true})"
   aria-label="${H(T('انطق','Hear')+' '+word.en)}">▶</button>
  ${term?`<button type="button" class="textlink" onclick="openVocabularyFromScene('${term.id}','${H(scene.id.replace(/^studio:/,''))}')">${T('الأطلس','Atlas')} ↗</button>`:''}</li>`;
 });
 return `<details class="idea-vocabulary idea-disclosure" ${open?'open':''}><summary>${title} · ${words.length}</summary>
  ${scene.sentenceId&&pictureWords&&!scene.reviewed?`<p class="lesson-hint">${T('مواضع المفردات مقترحة آليًا.','Vocabulary positions are suggested automatically.')}</p>`:''}
  ${ideaAudioControls()}
  ${entries.length?`<ul class="idea-vocab">${entries.join('')}</ul>`:`<p>${T('لا مفردات ضمن هذا النوع.','No vocabulary of this type.')}</p>`}</details>`;
}
function paintIdeaTask(scene,keepVocabulary=false){
 const host=$('#idea-lab-task');
 if(!scene||!host)return;
 const heading=(ar,en)=>`<h3 tabindex="-1">${T(ar,en)}</h3>`;
 if(ideaAction==='roleplay'){
  host.innerHTML=heading('تحاور في هذا الموقف','Talk through the situation')+renderIdeaRoleplay(scene);
  paintIdeaGuided();
  paintIdeaArchive();
  return;
 }
 if(ideaAction==='apply'){
  const [ar,en]=ideaPracticeTask(scene);
  const activity=state.dailyPractice?.[practiceDate()]||[];
  const saved=[scene.id,'studio:'+scenePhotoKey(scene.id)].some(id=>activity.includes('scene:'+id));
  host.innerHTML=`${heading('كوّن جملة وقلها بصوتك','Make a sentence and say it aloud')}
   <p>${H(T(ar,en))}</p>
   <details class="idea-disclosure"><summary>${T('مثال يصف المشهد','A scene example')}</summary>${ideaModel(scene.sentenceEn,scene.sentenceAr,'model')}</details>
   <label>${T('اكتبها إذا احتجت إلى مسودة','Write it down if you need a draft')}<textarea dir="ltr" lang="en" rows="3" oninput="ideaWriting.set(ideaPracticeKey(currentIdeaScene()),this.value)">${H(ideaWriting.get(ideaPracticeKey(scene))||'')}</textarea></label>
   <div class="buttonrow"><button class="primary" onclick="completeIdeaPractice(this)" ${saved?'disabled':''}>${saved?T('✓ سُجّلت الممارسة','✓ Practice logged'):T('قلت جملتي','I said my sentence')}</button>
    <button class="textlink" onclick="hearIdeaWriting()">▶ ${T('استمع لمسودّتك','Hear your draft')}</button></div>
   <p id="idea-practice-feedback" role="status"></p>`;
  return;
 }
 host.innerHTML=`${heading('ماذا ترى؟','What can you see?')}
  <p>${sceneLearningLevel(scene)==='A1'?T('اختر شيئًا واحدًا، واسمع اسمه ثم كرّره. استمع إلى سؤال وردّ قصير في مساعد المشهد.','Choose one thing, hear its name, and repeat it. Listen to a short question and reply in the scene coach.'):T('سمِّ شيئين تراهما، ثم صف فعلًا يجري في المشهد. اكشف الكلمات لتراجع ما تذكّرته.','Name two things you see, then describe one action. Reveal the words to check what you remembered.')}</p>
  ${ideaVocabulary(scene,keepVocabulary||host.querySelector('.idea-vocabulary')?.open)}`;
}
function ideaPracticeKey(scene){return scene?.id||''}
function completeIdeaPractice(button){
 recordDailyPractice('scene',ideaPracticeKey(currentIdeaScene()));
 button.disabled=true;
 button.textContent=T('✓ سُجّلت الممارسة','✓ Practice logged');
 $('#idea-practice-feedback').textContent=T('يمكنك الآن تجربة النمط في الخطوة «تحاور».','You can now try the pattern in the Role-play step.');
}
function hearIdeaWriting(){
 const text=ideaWriting.get(ideaPracticeKey(currentIdeaScene()))?.trim();
 if(text)speak(text);
 else toast(T('اكتب عبارة أولًا.','Write a line first.'));
}
function hearIdeaExample(id){
 const scene=currentIdeaScene();
 const example=id==='model'?{en:scene?.sentenceEn,ar:scene?.sentenceAr}:scene?.patterns.find(p=>p.id===Number(id));
 if(!example?.en)return;
 const text=englishSpeakable(example.en,example);
 stopSpeech();
 const voice=ideaSoloVoice;
 const playback=playIdeaAudio(text,ideaSceneCueId(scenePhotoKey(scene.id),id,voice),voice);
 ideaVoice=playback;
 playback.done.then(ok=>{
  if(ideaVoice!==playback)return;
  ideaVoice=null;
  if(!ok)toast(T('تعذّر تشغيل المثال.','Could not play the example.'));
 });
}
