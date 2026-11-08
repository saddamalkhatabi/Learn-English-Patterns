/* A visual collection separate from the sentence and dialogue libraries. */
let ideaLibrary=null,ideaPage=0,ideaTopic='',ideaQuery='',ideaAction='describe',ideaSceneId='';
let ideaSceneFilter='',ideaWordFilter='',ideaWordMode='hidden',ideaFlash=null,ideaFlashIndex=0;
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
  <section id="idea-lab-active"></section>
  <p id="idea-lab-count" role="status"></p><div id="idea-lab-grid" class="scene-studio-grid idea-lab-grid"></div>
  <div class="buttonrow"><button class="secondary" id="idea-lab-prev" onclick="ideaPage--;paintIdeaLibrary()">${T('الصفحة السابقة','Previous page')}</button>
  <button class="secondary" id="idea-lab-next" onclick="ideaPage++;paintIdeaLibrary()">${T('الصفحة التالية','Next page')}</button></div>`;
};
function currentIdeaScene(){return ideaLibrary?.scenes.find(s=>s.id===ideaSceneId)}
function findIdeaScenes(){
 const tokens=normalizeSceneQuery(ideaQuery).trim().split(/\s+/).filter(Boolean);
 const topics=new Map(ideaLibrary?.topics.map(t=>[t.id,t]));
 const saved=new Set(ideaArchive.map(entry=>entry.sceneId));
 return (ideaLibrary?.scenes||[]).filter(scene=>{
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
 ideaSceneId=scene.id;
 clearIdeaFlash();
 try{localStorage.setItem('nasaq-idea-scene',scene.id)}catch{}
 host.innerHTML=`<article class="panel idea-lab-exercise">
  <div class="idea-lab-image">
   <div class="idea-picture-frame"><button class="dialogue-image-button" onclick="enlargeDialogueScene(this)" aria-label="${T('تكبير المشهد','Enlarge scene')}">${ideaPicture(scene)}</button><div id="idea-picture-labels"></div></div>
   <div class="idea-label-controls" role="group" aria-label="${T('كلمات على الصورة','Words on the picture')}">
    ${[['hidden','إخفاء الكلمات','Hide words'],['visible','أظهر الكلمات','Show words'],['flash','ومضات الحفظ','Recall flashes']].map(([id,ar,en])=>
    `<button class="secondary" data-idea-word-mode="${id}" aria-pressed="${ideaWordMode===id}" onclick="setIdeaWordMode('${id}')">${T(ar,en)}</button>`).join('')}
   </div>
   <label class="idea-filter">${T('نوع المفردات','Vocabulary type')} <select id="idea-word-filter" onchange="setIdeaWordFilter(this.value)">
    ${[['','الكل','All'],['object','الأشياء والأشخاص','Objects and people'],['action','الأفعال','Actions'],['description','الأوصاف','Descriptions'],['phrase','عبارات المشهد','Scene phrases']].map(([id,ar,en])=>
     `<option value="${id}" ${ideaWordFilter===id?'selected':''}>${T(ar,en)}</option>`).join('')}</select></label>
   <p class="idea-picture-hint">${T('في وضع الومضات تظهر كلمة ثم تختفي. انقر علامة لتسمع الكلمة.','In flash mode, a word appears and then hides. Select a marker to hear the word.')}</p>
   <div class="buttonrow"><button class="secondary" onclick="stepIdeaScene(-1)">← ${T('المشهد السابق','Previous scene')}</button>
   <button class="secondary" onclick="stepIdeaScene(1)">${T('المشهد التالي','Next scene')} →</button></div>
  </div><div class="idea-lab-practice"><h2 tabindex="-1">${H(T(scene.ar,scene.en))}</h2>
   <div class="buttonrow idea-lab-modes">${[['describe','صِف ما ترى','Describe'],['recall','تذكّر المفردات','Recall words'],['write','اكتب فكرة','Write an idea'],['roleplay','ابتكر حوارًا','Role-play'],['patterns','أنماط تناسب الصورة','Related patterns']].map(([id,ar,en])=>
    `<button class="secondary" aria-pressed="${id===ideaAction}" data-idea-action="${id}" onclick="setIdeaAction('${id}')">${T(ar,en)}</button>`).join('')}</div>
   <div id="idea-lab-task"></div>
  </div></article>`;
 paintIdeaTask(scene);
 paintIdeaLabels(scene);
 if(scroll){host.querySelector('h2').focus({preventScroll:true});host.scrollIntoView({block:'start'})}
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
function clearIdeaFlash(){clearTimeout(ideaFlash);ideaFlash=null;ideaFlashIndex=0}
function setIdeaWordMode(mode){
 ideaWordMode=mode;
 clearIdeaFlash();
 document.querySelectorAll('[data-idea-word-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.ideaWordMode===mode)));
 paintIdeaLabels(currentIdeaScene());
}
function setIdeaWordFilter(value){
 ideaWordFilter=value;
 clearIdeaFlash();
 const scene=currentIdeaScene();
 if(['describe','recall','write'].includes(ideaAction))paintIdeaTask(scene);
 paintIdeaLabels(scene);
}
function visibleIdeaWords(scene){
 return scene.words.map((word,index)=>({ ...word,index })).filter(word=>!ideaWordFilter||word.kind===ideaWordFilter);
}
function ideaPhraseExamples(scene){
 return [{en:scene.sentenceEn,ar:scene.sentenceAr},...(scene.patterns||[]).filter(pattern=>pattern.en)];
}
function hearIdeaPhrase(index){const scene=currentIdeaScene();if(scene)speak(ideaPhraseExamples(scene)[index].en)}
function ideaWordLabel(word){
 return `<span lang="en" dir="ltr">${H(word.en)}</span><span class="ar-content" lang="ar" dir="rtl">${H(word.ar)}</span>`;
}
function showIdeaMarker(index){
 const layer=$('#idea-picture-labels');
 if(!layer)return;
 layer.querySelectorAll('.idea-map-point').forEach(point=>point.classList.toggle('selected',+point.dataset.word===index));
 hearIdeaLine(index);
}
function paintIdeaLabels(scene){
 const layer=$('#idea-picture-labels');
 if(!scene||!layer)return;
 const words=visibleIdeaWords(scene).filter(word=>Number.isFinite(word.x)&&Number.isFinite(word.y));
 if(ideaWordMode==='hidden'||!words.length){layer.innerHTML='';return}
 if(ideaWordMode==='visible'){
  layer.innerHTML=words.map(word=>`<div class="idea-map-point" data-word="${word.index}" style="--x:${word.x}%;--y:${word.y}%">
   <button type="button" class="idea-pin" onclick="showIdeaMarker(${word.index})" aria-label="${H(word.en+' · '+word.ar)}">${word.index+1}</button>
   <span class="idea-map-label">${ideaWordLabel(word)}</span></div>`).join('');
  positionIdeaLabels();
  return;
 }
 const flash=()=>{
  if(page!=='lab'||ideaWordMode!=='flash'||scene.id!==ideaSceneId||!layer.isConnected){layer.innerHTML='';return}
  const word=words[ideaFlashIndex++%words.length];
  layer.innerHTML=`<div class="idea-map-point selected" style="--x:${word.x}%;--y:${word.y}%">
   <button type="button" class="idea-pin" onclick="hearIdeaLine(${word.index})" aria-label="${H(word.en+' · '+word.ar)}">●</button>
   <span class="idea-map-label">${ideaWordLabel(word)}</span></div>`;
  positionIdeaLabels();
  ideaFlash=setTimeout(()=>{layer.innerHTML='';ideaFlash=setTimeout(flash,1500)},2300);
 };
 flash();
}
function positionIdeaLabels(){
 const layer=$('#idea-picture-labels');
 if(!layer||!layer.clientWidth)return;
 const width=layer.clientWidth,height=layer.clientHeight,placed=[];
 const overlap=(a,b)=>a.x<b.x+b.w+4&&a.x+a.w+4>b.x&&a.y<b.y+b.h+4&&a.y+a.h+4>b.y;
 const inside=(value,size,max)=>Math.min(Math.max(value,3),Math.max(3,max-size-3));
 for(const point of layer.children){
  const label=point.querySelector('.idea-map-label');
  const x=point.offsetLeft,y=point.offsetTop,w=label.offsetWidth,h=label.offsetHeight;
  const candidates=[[x+14,y-h-6],[x-w-14,y-h-6],[x+14,y+9],[x-w-14,y+9],[x-w/2,y-h-16],[x-w/2,y+16]]
   .map(([x,y])=>({x:inside(x,w,width),y:inside(y,h,height),w,h}));
  const place=candidates.find(candidate=>!placed.some(other=>overlap(candidate,other)));
  point.classList.toggle('label-crowded',!place);
  const spot=place||candidates[0];
  label.style.left=`${spot.x-x}px`;
  label.style.top=`${spot.y-y}px`;
  if(place)placed.push(place);
 }
}
window.addEventListener('resize',positionIdeaLabels);

function paintIdeaTask(scene){
 if(!scene)return;
 const entries=ideaWordFilter==='phrase'?
  ideaPhraseExamples(scene).map((phrase,index)=>`<li><button class="textlink" onclick="hearIdeaPhrase(${index})" lang="en" dir="ltr">▶ ${H(phrase.en)}</button>${EP.ar(phrase.ar)}</li>`):
  visibleIdeaWords(scene).map(word=>`<li><button class="textlink" onclick="highlightIdeaWord(${word.index})" lang="en" dir="ltr">▶ ${H(word.en)}${Number.isFinite(word.x)?` <small class="idea-word-number">${word.index+1}</small>`:''}</button>${EP.ar(word.ar)}</li>`);
 const words=`<ul class="idea-vocab">${entries.join('')}</ul>`;
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
  host.innerHTML=`<p lang="en" dir="ltr">${H(scene.taskEn)}</p>${EP.ar(scene.taskAr)}
   <label>${T('اكتب وصفك أو ردّك','Write your description or reply')}<textarea dir="ltr" lang="en" rows="4" oninput="ideaWriting.set(ideaSceneId,this.value)">${H(ideaWriting.get(scene.id)||'')}</textarea></label>
   <div class="buttonrow"><button class="secondary" onclick="hearIdeaWriting()">▶ ${T('استمع لما كتبت','Listen to your writing')}</button></div>
   ${disclose(T('جملة ومفردات تساعدك','Model sentence and words'),sentence+words)}`;
  return;
 }
 host.innerHTML=ideaAction==='recall'?
  `<p>${T('سمِّ شيئين، ثم صف فعلًا وصفة من الصورة قبل كشف المفردات.','Name two objects, then describe an action and an adjective before revealing the words.')}</p>${disclose(T('اكشف المفردات واسمعها','Reveal and hear the words'),words)}${disclose(T('اكشف جملة نموذجية','Reveal a model sentence'),sentence)}`:
  `<p>${T('صف شيئًا في المقدمة، وآخر في الخلف، واذكر ما يحدث الآن.','Describe something in the foreground and background, then say what is happening.')}</p>${sentence}${words}`;
}
function highlightIdeaWord(index){
 const word=currentIdeaScene()?.words[index];
 if(!Number.isFinite(word?.x)){hearIdeaLine(index);return}
 if(ideaWordMode!=='visible')setIdeaWordMode('visible');
 showIdeaMarker(index);
}
function hearIdeaWriting(){
 const text=ideaWriting.get(ideaSceneId)?.trim();
 if(text)speak(text);
 else toast(T('اكتب عبارة أولًا.','Write a line first.'));
}
function renderIdeaPatterns(scene){
 const cards=(scene.patterns||[]).flatMap(suggestion=>{
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
 return `<p>${T('جرّب أحد هذه التراكيب لوصف الصورة أو لبدء حوار عنها.','Use one of these structures to describe the picture or start a conversation.')}</p>
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
 renderBeforeIdeaLab();
 if(page==='lab'){paintIdeaLibrary();chooseIdeaScene(ideaSceneId,false);EP.decorate()}
};
if(page==='lab')render();
ideaLibraryReady.then(data=>{ideaLibrary=data;if(page==='lab')render()});
pilotReady.then(()=>{if(page==='lab'&&ideaAction==='patterns')paintIdeaTask(currentIdeaScene())});
