/* Archive labels are derived from the original brief, sentence and course tags. */
let sceneArchive, studioPage=0, studioAudio=null;
const archiveReady=Promise.all([fetch('scene-archive.json').then(r=>r.ok?r.json():null).catch(()=>null),courseScriptsReady]).then(([data])=>data);
const normalizeSceneQuery=value=>String(value).normalize('NFKD').toLowerCase()
 .replace(/[\u064b-\u065f\u0670\u0640]/g,'').replace(/[أإآ]/g,'ا');
const scenePrompts={
 home:['What are they doing at home?','I think they are getting ready for the day.','What might they do next?','Maybe they will make breakfast together.'],
 study:['What might this person be studying?','They might be preparing for a lesson.','Could we study together?','Yes. Let’s start with one example.'],
 work:['What might they be discussing?','They might be planning their next task.','When should we meet again?','Let’s meet after lunch.'],
 travel:['Where might they be going?','They might be looking for the next bus or train.','Could you tell me where to go?','Of course. Let’s look at the signs.'],
 water:['What might they say near the water?','I think they are talking about the conditions.','Is it safe to swim here?','Let’s ask someone who works here.'],
 outdoors:['How would you describe the weather?','It looks like a good day to be outside.','Would you like to go for a walk?','Yes. Let’s find a quiet place.'],
 food:['What might they order or prepare?','They might want something to eat and drink.','What would you like?','I’d like something warm, please.'],
 shopping:['What might they be looking for?','They might be deciding what to buy.','How much does this cost?','Let me check the price for you.'],
 health:['What kind of help might this person need?','They might need to ask for advice.','Could I make an appointment?','Yes. What time works for you?'],
 social:['How might these people know each other?','They might be friends or neighbors.','Would you like to join us?','Yes, thank you. What are you planning?'],
 objects:['What could someone use this object for?','They might need it to finish a task.','Can I borrow it for a moment?','Of course. I can show you how to use it.'],
 everyday:['What could be happening here?','I think the people are getting ready to do something.','What should we do next?','Let’s talk about our options.']
};
function sceneStudioPage(){
 const topics=sceneArchive?.topics||[];
 return head(T('مكتبة الصور الذكية','Smart photo library'),T(
  'ابحث عن صورة من الأرشيف، واستمع إلى جملتها، ثم استخدمها لبدء محادثة حرّة.',
  'Find an archived photo, listen to its sentence, then use it to start an open conversation.'))+epSectionLinks(['references','lab'])+
  `<div class="toolbar"><input type="search" id="scene-studio-query" oninput="studioPage=0;paintSceneStudio()" placeholder="${T('مسبح، مكتبة، train…','Pool, library, قطار…')}" aria-label="${T('بحث المشاهد','Search scenes')}">
  <select id="scene-studio-topic" onchange="studioPage=0;paintSceneStudio()" aria-label="${T('موضوع المشهد','Scene topic')}"><option value="">${T('كل الموضوعات','All topics')}</option><option value="conversation">${T('مشاهد المحادثات','Conversation scenes')}</option>${topics.map(t=>`<option value="${t.id}">${H(T(t.ar,t.en))}</option>`).join('')}</select>
  ${smartLibraryFilters()}<button class="secondary" onclick="surpriseScene()">${T('اقترح مشهدًا','Suggest a scene')}</button></div>
  <section id="studio-pattern-context"></section><section id="scene-studio-active"></section>
  <dialog id="idea-zoom" aria-labelledby="idea-zoom-title" onclose="restoreIdeaZoom()"><div class="idea-zoom-header"><h2 id="idea-zoom-title"></h2><form method="dialog"><button class="secondary" aria-label="${T('إغلاق عرض المشهد','Close scene view')}">×</button></form></div><div class="idea-zoom-content"></div></dialog>
  <p id="scene-studio-count" role="status"></p>
  <div id="scene-studio-results" class="scene-studio-grid"></div><div class="buttonrow">
   <button class="secondary" id="scene-studio-prev" onclick="studioPage--;paintSceneStudio()">${T('السابق','Previous')}</button>
   <button class="secondary" id="scene-studio-next" onclick="studioPage++;paintSceneStudio()">${T('التالي','Next')}</button></div>`;
}
function studioMatches(){
 const tokens=normalizeSceneQuery($('#scene-studio-query')?.value||'').trim().split(/\s+/).filter(Boolean);
 const topic=$('#scene-studio-topic')?.value, topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 const sentences=new Map([...(PILOT?.sentences||[]),...(REFERENCE_CORPUS?.sentences||[])].map(s=>[s.id,s]));
 const originals=(sceneArchive?.scenes||[]).flatMap(item=>{
  const row=sentences.get(item.id);
  if(!row||!matchesStudioContext(row)||topic&&!item.topics.includes(topic))return [];
  const labels=item.topics.flatMap(id=>[topics.get(id).ar,topics.get(id).en]);
  const text=normalizeSceneQuery([row.id,row.en,row.ar,item.description,item.descriptionAr,...item.keywords,...labels].join(' '));
  return tokens.every(word=>text.includes(word))?[{item,row}]:[];
 });
 const conversations=(!topic||topic==='conversation')?(ideaLibrary?.scenes||[]).flatMap(scene=>{
  const location=dialogueSceneLocations.get(scene.id);
  if(!location)return [];
  const dialogue=PILOT?.dialogues.find(dialogue=>dialogue.id===location.id);
  const row={id:scene.id,pattern_ids:scene.patterns.map(pattern=>pattern.id)};
  if(!matchesStudioContext(row))return [];
  const text=normalizeSceneQuery([scene.en,scene.ar,scene.sentenceEn,scene.sentenceAr,dialogue?.en,dialogue?.ar,
   ...scene.words.flatMap(word=>[word.en,word.ar])].join(' '));
  return tokens.every(word=>text.includes(word))?[{item:scene,row,scene}]:[];
 }):[];
 return studioPattern?[...originals,...conversations]:[...conversations,...originals];
}
function paintSceneStudio(){
 if(!$('#scene-studio-results'))return;
 const matches=studioMatches(), total=Math.max(1,Math.ceil(matches.length/24));
 studioPage=Math.max(0,Math.min(studioPage,total-1));
 $('#scene-studio-count').textContent=T(`${matches.length} مشهد · صفحة ${studioPage+1} من ${total}`,`${matches.length} scenes · Page ${studioPage+1} of ${total}`);
 $('#scene-studio-prev').disabled=studioPage===0;
 $('#scene-studio-next').disabled=studioPage+1>=total;
 const topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 $('#scene-studio-results').innerHTML=matches.slice(studioPage*24,studioPage*24+24).map(({item,row,scene})=>{
  if(scene)return `<article class="panel">${ideaPicture(scene)}<button class="textlink" onclick="openStudioScene('${H(scene.id)}')">${H(T(scene.ar,scene.en))} ↗</button></article>`;
  const {ar,en}=topics.get(item.topics[0]);
  return `<article class="panel">${studioPicture(row,ar,en)}<button class="textlink" onclick="openStudioScene('${H(item.id)}')">${H(T(ar,en))} ↗</button></article>`;
 }).join('');
 prepareSmartSelection();
}
function studioPicture(row,ar,en){
 return pilotScene({...row,en,ar,context:''});
}
function sceneAiTools(kind,id){
 return `<section class="scene-ai studio-ai" aria-labelledby="studio-ai-title"><h3 id="studio-ai-title">${T('تحاور مع مساعدك الذكي','Talk with your AI assistant')}</h3>
 <p>${T('جهّز طلبًا لهذه الصورة والصقه في مساعدك. إذا كان يدعم مشاركة الشاشة، ابدأ المشاركة من تطبيقه واختر تبويب المكتبة لتتحدّثا عمّا يظهر في الصورة.','Create a prompt for this photo and paste it into your assistant. If it supports screen sharing, start sharing from the assistant and select this library tab to discuss the photo together.')}</p>
 <div class="buttonrow"><button class="secondary" onclick="showSceneAiPrompt(this,'${kind}','${H(id)}')">${T('جهّز طلب المحادثة','Create conversation prompt')}</button>
 <button class="primary" data-copy-scene-ai onclick="copySceneAiPrompt(this)" hidden>${T('انسخ الطلب','Copy prompt')}</button></div>
 <textarea data-scene-ai-prompt aria-label="${T('نص طلب المحادثة','Conversation prompt')}" dir="ltr" lang="en" rows="7" readonly hidden></textarea>
 <p data-scene-ai-status role="status"></p></section>`;
}
function showSceneAiPrompt(button,kind,id){
 const idea=kind==='idea'?ideaLibrary?.scenes.find(s=>s.id===id):null;
 const entry=kind==='studio'?sceneArchive?.scenes.find(s=>s.id===id):null;
 const row=kind==='studio'?dialogueScene(id):null;
 if(!idea&&!row)return;
 const description=idea?.sentenceEn||entry?.description||row.en;
 const target=idea?.taskEn||'Start with two visible details, then imagine a short exchange that could happen here.';
 const terms=idea?.words.map(word=>word.en).join(', ')||entry?.keywords.filter(word=>!/[^\x00-\x7F]/.test(word)).slice(0,8).join(', ')||'objects and actions visible in the scene';
 const panel=button.closest('.scene-ai'),box=panel.querySelector('[data-scene-ai-prompt]');
 box.value=`Be my English conversation partner. I speak Arabic; begin at A2 and adjust after my first answer.
Scene: ${description}
Model line: ${idea?.sentenceEn||row.en}
Speaking task: ${target}
Useful vocabulary: ${terms}.
If I am sharing my screen and you can see it, use details you can actually identify. Otherwise use the description and ask me for one extra detail. Separate observation from imagination.
Ask one short question in English at a time and wait for me. Start by naming objects, then ask me to describe an action and compare two details. Next take a role in a practical dialogue; add one change that makes me adapt. Give a short Arabic hint only when I get stuck or ask. End with two useful corrections and three expressions to reuse.`;
 box.hidden=false;panel.querySelector('[data-copy-scene-ai]').hidden=false;box.focus();
}
async function copySceneAiPrompt(button){
 const panel=button.closest('.scene-ai'),box=panel.querySelector('[data-scene-ai-prompt]'),status=panel.querySelector('[data-scene-ai-status]');
 try{await navigator.clipboard.writeText(box.value);status.textContent=T('نُسخ الطلب. الصقه في مساعدك المفضل.','Prompt copied. Paste it into your preferred assistant.')}
 catch{box.select();status.textContent=T('حُدّد النص. انسخه يدويًا.','Text selected. Copy it manually.')}
}
function surpriseScene(){
 const matches=studioMatches();
 if(matches.length)openStudioScene(matches[Math.floor(Math.random()*matches.length)].item.id);
}
function openStudioScene(id){return openSmartScene(id)}
function playStudioSentence(id,voice){
 const row=PILOT?.sentences.find(s=>s.id===id)||REFERENCE_CORPUS?.sentences.find(s=>s.id===id);
 const recording=row?.recordings[voice];
 if(!recording?.path)return;
 stopSpeech();studioAudio?.pause();
 studioAudio=new Audio(recording.path);
 const words=$('#scene-studio-active').querySelectorAll('[data-studio-word]');
 const audio=studioAudio;
 audio.addEventListener('timeupdate',()=>{
  const cue=recording.words?.findIndex(w=>w.start_ms<=audio.currentTime*1000&&audio.currentTime*1000<w.end_ms);
  words.forEach((word,i)=>word.classList.toggle('speaking',i===cue));
 });
 studioAudio.play().catch(()=>toast(T('تعذّر تشغيل الصوت.','Audio could not play.')));
}
labels['scene-studio']='مكتبة الصور الذكية';
if(location.hash==='#scene-studio')page='scene-studio';
const renderBeforeSceneStudio=render;
render=function(){
 studioAudio?.pause();
 if(page!=='scene-studio'){renderBeforeSceneStudio();return}
 releaseDialoguePlayer();stopSpeech();nav();
 $('#app').innerHTML=sceneStudioPage();paintSceneStudio();EP.decorate();
};
archiveReady.then(data=>{sceneArchive=data;if(page==='scene-studio')render()});
pilotReady.then(()=>{if(page==='scene-studio')paintSceneStudio()});
Promise.all([dialogueArchiveReady,pilotReady]).then(()=>{if(page==='scene-studio'&&!$('#scene-studio-active')?.children.length)render()});
function playStudioDialogueTurn(id){
 const location=dialogueSceneLocations.get(id);
 const dialogue=PILOT?.dialogues.find(row=>row.id===location?.id);
 const turn=dialogue?.audio?.turns[location.turn];
 if(!turn)return;
 stopSpeech();studioAudio?.pause();
 const audio=new Audio(dialogue.audio.path);
 studioAudio=audio;
 audio.currentTime=turn.start_ms/1000;
 const words=$('#scene-studio-active').querySelectorAll('[data-dialogue-word]');
 const paint=()=>{
  const ms=audio.currentTime*1000;
  if(ms>=turn.end_ms)audio.pause();
  const index=audio.paused?-1:turn.words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
  words.forEach((word,i)=>word.classList.toggle('speaking',index===i));
 };
 audio.addEventListener('timeupdate',paint);
 audio.addEventListener('pause',paint);
 audio.play().catch(()=>toast(T('تعذّر تشغيل الصوت.','Audio could not play.')));
}
