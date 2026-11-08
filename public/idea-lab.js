/* A visual collection separate from the sentence and dialogue libraries. */
let ideaLibrary=null,ideaPage=0,ideaTopic='',ideaQuery='',ideaAction='describe',ideaSceneId='',ideaLegacyOpen=false;
try{ideaSceneId=localStorage.getItem('nasaq-idea-scene')||''}catch{}
const ideaLibraryReady=fetch('idea-scenes.json').then(r=>r.ok?r.json():null).catch(()=>null);
const originalIdeaLab=lab;
lab=function(){
 return head(T('مختبر الأفكار','Idea Lab'),T('اختر مشهدًا، لاحظ تفاصيله، ثم حوّل ما تراه إلى كلام أو حوار.','Choose a scene, notice its details, then turn what you see into speech or conversation.'))+
  `<div class="toolbar idea-lab-tools">
   <label>${T('ابحث عن شيء أو فعل أو موقف','Find an object, action or situation')} <input type="search" value="${H(ideaQuery)}" oninput="ideaQuery=this.value;ideaPage=0;paintIdeaLibrary()" placeholder="${T('مثال: حقيبة، يزرع، quiet','Example: backpack, plant, هادئ')}"></label>
   <label>${T('الموضوع','Topic')} <select onchange="ideaTopic=this.value;ideaPage=0;paintIdeaLibrary()">
    <option value="">${T('كل الموضوعات','All topics')}</option>${(ideaLibrary?.topics||[]).map(t=>`<option value="${t.id}" ${ideaTopic===t.id?'selected':''}>${H(T(t.ar,t.en))}</option>`).join('')}</select></label>
   <button class="secondary" onclick="suggestIdeaScene()">✦ ${T('اقترح مشهدًا','Suggest a scene')}</button>
  </div>
  <section id="idea-lab-active"></section>
  <p id="idea-lab-count" role="status"></p><div id="idea-lab-grid" class="scene-studio-grid idea-lab-grid"></div>
  <div class="buttonrow"><button class="secondary" id="idea-lab-prev" onclick="ideaPage--;paintIdeaLibrary()">${T('الصفحة السابقة','Previous page')}</button>
  <button class="secondary" id="idea-lab-next" onclick="ideaPage++;paintIdeaLibrary()">${T('الصفحة التالية','Next page')}</button></div>
  <details class="idea-legacy" ${ideaLegacyOpen?'open':''} ontoggle="ideaLegacyOpen=this.open"><summary>${T('تمارين الكتابة والحوار الموجّه','Guided writing and conversation exercises')}</summary>${originalIdeaLab()}</details>`;
};
function findIdeaScenes(){
 const tokens=normalizeSceneQuery(ideaQuery).trim().split(/\s+/).filter(Boolean);
 const topics=new Map(ideaLibrary?.topics.map(t=>[t.id,t]));
 return (ideaLibrary?.scenes||[]).filter(scene=>{
  if(ideaTopic&&ideaTopic!==scene.topic)return false;
  const topic=topics.get(scene.topic);
  const searchable=normalizeSceneQuery([scene.ar,scene.en,scene.sentenceEn,scene.sentenceAr,scene.taskEn,scene.taskAr,
   topic?.ar,topic?.en,...scene.words.flatMap(w=>[w.en,w.ar])].join(' '));
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
 ideaSceneId=scene.id;
 try{localStorage.setItem('nasaq-idea-scene',scene.id)}catch{}
 host.innerHTML=`<article class="panel idea-lab-exercise">
  <div class="idea-lab-image"><button class="dialogue-image-button" onclick="enlargeDialogueScene(this)" aria-label="${T('تكبير المشهد','Enlarge scene')}">${ideaPicture(scene)}</button>
   <div class="buttonrow"><button class="secondary" onclick="stepIdeaScene(-1)">← ${T('المشهد السابق','Previous scene')}</button>
   <button class="secondary" onclick="stepIdeaScene(1)">${T('المشهد التالي','Next scene')} →</button></div>
  </div><div class="idea-lab-practice"><h2 tabindex="-1">${H(T(scene.ar,scene.en))}</h2>
   <div class="buttonrow idea-lab-modes">${[['describe','صِف ما ترى','Describe'],['recall','تذكّر المفردات','Recall words'],['roleplay','ابتكر حوارًا','Role-play']].map(([id,ar,en])=>
    `<button class="secondary" aria-pressed="${id===ideaAction}" data-idea-action="${id}" onclick="setIdeaAction('${id}')">${T(ar,en)}</button>`).join('')}</div>
   <div id="idea-lab-task"></div>
   ${sceneAiTools('idea',scene.id)}
  </div></article>`;
 paintIdeaTask(scene);
 if(scroll){host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})}
}
function stepIdeaScene(delta){
 const matching=findIdeaScenes(),list=matching.length?matching:ideaLibrary.scenes;
 const index=list.findIndex(s=>s.id===ideaSceneId);
 chooseIdeaScene(list[(index+delta+list.length)%list.length].id);
}
function setIdeaAction(value){
 ideaAction=value;
 document.querySelectorAll('[data-idea-action]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaAction===value)));
 paintIdeaTask(ideaLibrary.scenes.find(s=>s.id===ideaSceneId));
}
function paintIdeaTask(scene){
 const words=`<ul class="idea-vocab">${scene.words.map((word,index)=>`<li><button class="textlink" onclick="hearIdeaLine(${index})" lang="en" dir="ltr">▶ ${H(word.en)}</button>${EP.ar(word.ar)}</li>`).join('')}</ul>`;
 const sentence=`<div class="idea-model"><p lang="en" dir="ltr">${H(scene.sentenceEn)}</p>${EP.ar(scene.sentenceAr)}
  <button class="secondary" onclick="hearIdeaLine(-1)">▶ ${T('استمع إلى الجملة','Listen to the sentence')}</button></div>`;
 const disclose=(title,body)=>`<details><summary>${title}</summary>${body}</details>`;
 $('#idea-lab-task').innerHTML=ideaAction==='recall'?
  `<p>${T('سمِّ شيئين، ثم صف فعلًا وصفة من الصورة قبل كشف المفردات.','Name two objects, then describe an action and an adjective before revealing the words.')}</p>${disclose(T('اكشف المفردات واسمعها','Reveal and hear the words'),words)}${disclose(T('اكشف جملة نموذجية','Reveal a model sentence'),sentence)}`:
  ideaAction==='roleplay'?`<p lang="en" dir="ltr">${H(scene.taskEn)}</p>${EP.ar(scene.taskAr)}
  <p>${T('ابدأ بسؤال، أجب عنه، ثم أضف سؤال متابعة يغيّر شيئًا في الموقف.','Start with a question, answer it, then ask a follow-up that changes something in the situation.')}</p>
  ${disclose(T('مفردات تساعدك','Useful words'),words)}`:
  `<p>${T('صف شيئًا في المقدمة، وآخر في الخلف، واذكر ما يحدث الآن.','Describe something in the foreground and background, then say what is happening.')}</p>${sentence}${words}`;
}
function hearIdeaLine(index){
 const scene=ideaLibrary?.scenes.find(s=>s.id===ideaSceneId);
 const text=index<0?scene?.sentenceEn:scene?.words[index]?.en;
 if(text)speak(text);
}
const renderBeforeIdeaLab=render;
render=function(){
 renderBeforeIdeaLab();
 if(page==='lab'){paintIdeaLibrary();chooseIdeaScene(ideaSceneId,false);EP.decorate()}
};
ideaLibraryReady.then(data=>{ideaLibrary=data;if(page==='lab')render()});
