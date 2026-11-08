/* Archive labels are derived from the original brief, sentence and course tags. */
let sceneArchive, studioPage=0, studioAudio=null;
const archiveReady=fetch('scene-archive.json').then(r=>r.ok?r.json():null).catch(()=>null);
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
 return head(T('تكلّم من الصورة','Speak from a scene'),T(
  'ابحث عن مشهد بالعربية أو الإنجليزية. صِف ما ترى، ثم تخيّل الموقف واكتب حوارًا قصيرًا.',
  'Find a scene in Arabic or English. Describe what you see, then imagine a situation and write a short conversation.'))+
  `<div class="toolbar"><input type="search" id="scene-studio-query" oninput="studioPage=0;paintSceneStudio()" placeholder="${T('مسبح، مكتبة، train…','Pool, library, قطار…')}" aria-label="${T('بحث المشاهد','Search scenes')}">
  <select id="scene-studio-topic" onchange="studioPage=0;paintSceneStudio()" aria-label="${T('موضوع المشهد','Scene topic')}"><option value="">${T('كل الموضوعات','All topics')}</option>${topics.map(t=>`<option value="${t.id}">${H(T(t.ar,t.en))}</option>`).join('')}</select>
  <button class="secondary" onclick="surpriseScene()">${T('اقترح مشهدًا','Suggest a scene')}</button></div>
  <section id="scene-studio-active"></section>
  <details class="panel studio-collections"><summary>${T('المجموعات المستقلة: مختبر الأفكار ومشاهد المحادثات','Independent collections: Idea Lab and conversation scenes')}</summary>
   <div class="buttonrow"><button class="secondary" onclick="navigate('lab')">${T('افتح مكتبة مختبر الأفكار','Open the Idea Lab library')} ↗</button>
   <button class="secondary" onclick="navigate('dialogues')">${T('افتح المحادثات','Open conversations')} ↗</button></div>
   <div class="scene-studio-grid">${Object.entries(dialogueSceneArchive).map(([id,entry])=>{
    const dialogue=PILOT?.dialogues.find(d=>d.id===id);
    const visual=entry.cover||Object.values(entry.turns)[0];
    return dialogue&&visual?`<article class="panel"><button class="dialogue-image-button" onclick="enlargeDialogueScene(this)" aria-label="${T('تكبير المشهد','Enlarge scene')}"><img class="dialogue-dedicated-photo" src="${H(visual.path)}" alt="${H(T(visual.ar,visual.en))}" loading="lazy"></button><b>${H(T(dialogue.ar,dialogue.en))}</b></article>`:'';
   }).join('')}</div>
  </details>
  <p id="scene-studio-count" role="status"></p>
  <div id="scene-studio-results" class="scene-studio-grid"></div><div class="buttonrow">
   <button class="secondary" id="scene-studio-prev" onclick="studioPage--;paintSceneStudio()">${T('السابق','Previous')}</button>
   <button class="secondary" id="scene-studio-next" onclick="studioPage++;paintSceneStudio()">${T('التالي','Next')}</button></div>`;
}
function studioMatches(){
 const tokens=normalizeSceneQuery($('#scene-studio-query')?.value||'').trim().split(/\s+/).filter(Boolean);
 const topic=$('#scene-studio-topic')?.value, topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 const sentences=new Map([...(PILOT?.sentences||[]),...(REFERENCE_CORPUS?.sentences||[])].map(s=>[s.id,s]));
 return (sceneArchive?.scenes||[]).flatMap(item=>{
  const row=sentences.get(item.id);
  if(!row||topic&&!item.topics.includes(topic))return [];
  const labels=item.topics.flatMap(id=>[topics.get(id).ar,topics.get(id).en]);
  const text=normalizeSceneQuery([row.id,row.en,row.ar,item.description,item.descriptionAr,...item.keywords,...labels].join(' '));
  return tokens.every(word=>text.includes(word))?[{item,row}]:[];
 });
}
function paintSceneStudio(){
 if(!$('#scene-studio-results'))return;
 const matches=studioMatches(), total=Math.max(1,Math.ceil(matches.length/24));
 studioPage=Math.max(0,Math.min(studioPage,total-1));
 $('#scene-studio-count').textContent=T(`${matches.length} مشهد · صفحة ${studioPage+1} من ${total}`,`${matches.length} scenes · Page ${studioPage+1} of ${total}`);
 $('#scene-studio-prev').disabled=studioPage===0;
 $('#scene-studio-next').disabled=studioPage+1>=total;
 const topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 $('#scene-studio-results').innerHTML=matches.slice(studioPage*24,studioPage*24+24).map(({item,row})=>{
  const {ar,en}=topics.get(item.topics[0]);
  return `<article class="panel">${studioPicture(row,ar,en)}<button class="textlink" onclick="openStudioScene('${H(item.id)}')">${H(T(ar,en))} ↗</button></article>`;
 }).join('');
}
function studioPicture(row,ar,en){
 return pilotScene({...row,en,ar,context:''});
}
function sceneAiTools(kind,id){
 return `<details class="scene-ai"><summary>${T('تدرّب مع مساعدك الذكي','Practise with your AI assistant')}</summary>
 <p>${T('أنشئ طلبًا يضم المشهد ومهمة التحدّث، ثم انسخه إلى مساعدك. إذا كان يدعم مشاركة الشاشة، اختر نافذة هذه الصفحة من داخله، واطلب منه أن يتدرّب معك على الصورة المعروضة.','Create a prompt with this scene and speaking task, then paste it into your assistant. If your assistant supports screen sharing, share this page from that app and practise with the scene on screen.')}</p>
 <div class="buttonrow"><button class="secondary" onclick="showSceneAiPrompt(this,'${kind}','${H(id)}')">✦ ${T('جهّز طلب التدريب','Create practice prompt')}</button>
 <button class="primary" data-copy-scene-ai onclick="copySceneAiPrompt(this)" hidden>${T('انسخ الطلب','Copy prompt')}</button></div>
 <textarea data-scene-ai-prompt aria-label="${T('نص طلب التدريب','Practice prompt')}" dir="ltr" lang="en" rows="7" readonly hidden></textarea>
 <p data-scene-ai-status role="status"></p></details>`;
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
function openStudioScene(id){
 const item=sceneArchive?.scenes.find(s=>s.id===id);
 const row=PILOT?.sentences.find(s=>s.id===id)||REFERENCE_CORPUS?.sentences.find(s=>s.id===id);
 if(!item||!row)return;
 const topic=$('#scene-studio-topic').value||item.topics[0];
 const {ar,en}=sceneArchive.topics.find(t=>t.id===topic);
 const [observe,model,question,answer]=scenePrompts[topic]||scenePrompts.everyday;
 const host=$('#scene-studio-active');
 studioAudio?.pause();
 host.innerHTML=`<article class="panel studio-exercise">
  <div>${studioPicture(row,ar,en)}${item.description||EP.prefs.arabic?`<details><summary>${T('وصف المشهد في الأرشيف','Archived scene description')}</summary>${item.description?`<p lang="en" dir="ltr">${H(item.description)}</p>`:''}${EP.ar(item.descriptionAr)}</details>`:''}</div>
  <div><section class="studio-original"><h2>${T('الجملة الأساسية للصورة','The scene’s original sentence')}</h2>
    <p lang="en" dir="ltr">${EP.words(row,'data-studio-word')}</p>${EP.ar(row.ar)}
    <div class="buttonrow"><button class="primary" onclick="playStudioSentence('${H(row.id)}','male')">▶ ${T('استمع · Adam','Listen · Adam')}</button>
    <button class="secondary" onclick="playStudioSentence('${H(row.id)}','female')">▶ Bella</button></div>
  </section>
  <h2>${T('تأمّل، ثم تكلّم','Look, then speak')}</h2><ol lang="en" dir="ltr">
  <li>What can you see? Name two details.</li><li>${H(observe)}</li><li>Imagine two people here. What could one ask, and how could the other reply?</li></ol>
  <label>${T('اكتب افتتاحية وردًا وسؤال متابعة','Write an opening, a reply, and a follow-up question')}
   <textarea dir="ltr" lang="en" rows="4" placeholder="A: …&#10;B: …&#10;A: …"></textarea></label>
  <details><summary>${T('مثال للإجابة وفتح الحوار','Reveal a model answer and dialogue')}</summary>
    <small>${T('أفكار متخيّلة يمكنك تعديلها وفق ما تراه في المشهد.','Imagined ideas you can adapt to what you see in the scene.')}</small>
    <p lang="en" dir="ltr">${H(model)}</p><p lang="en" dir="ltr"><b>A</b> ${H(question)}<br><b>B</b> ${H(answer)}</p>
  </details>
  ${sceneAiTools('studio',id)}</div></article>`;
 window.EPOffline?.rememberSentences([row]);
 host.scrollIntoView({block:'start'});
}
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
labels['scene-studio']='تكلّم من الصورة';
epNavGroups[1][2].splice(2,0,['scene-studio','▦','تكلّم من الصورة','Speak from a scene']);
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
