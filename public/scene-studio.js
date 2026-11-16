/* Archive labels are derived from the original brief, sentence and course tags. */
let sceneArchive, studioPage=0, studioAudio=null, studioMode='photos', studioLearningLevel='';
const archiveReady=Promise.all([fetch('scene-archive.json').then(r=>r.ok?r.json():null).catch(()=>null),courseScriptsReady,learningLevelsReady]).then(([data])=>data);
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
 const topics=new Map([...(sceneArchive?.topics||[]),...(ideaLibrary?.topics||[])].map(topic=>[topic.id,topic]));
 return head(T('مكتبة الصور الذكية','Smart photo library'),T(
  'تعلّم من صورة واحدة، أو تأمّل تسلسل محادثة وابتكر حوارك.',
  'Learn from a single photo or explore a conversation sequence and write your own dialogue.'))+
  `<nav class="studio-tabs" aria-label="${T('أقسام مكتبة الصور','Photo library sections')}">
   <button type="button" class="secondary" data-studio-mode="photos" aria-pressed="${studioMode==='photos'}" onclick="setStudioMode(this.dataset.studioMode)">${T('تصفّح الصور','Browse photos')}</button>
   <button type="button" class="secondary" data-studio-mode="journeys" aria-pressed="${studioMode==='journeys'}" onclick="setStudioMode(this.dataset.studioMode)">${T('مشاهد المحادثات','Conversation scenes')}</button>
  </nav>`+(studioMode==='journeys'?studioJourneysPage():epSectionLinks(['references','lab'])+
  `<div class="toolbar"><input type="search" id="scene-studio-query" oninput="studioPage=0;paintSceneStudio()" placeholder="${T('مسبح، مكتبة، train…','Pool, library, قطار…')}" aria-label="${T('بحث المشاهد','Search scenes')}">
  <select id="scene-studio-topic" onchange="studioPage=0;paintSceneStudio()" aria-label="${T('موضوع المشهد','Scene topic')}"><option value="">${T('كل الموضوعات','All topics')}</option><option value="conversation">${T('مشاهد المحادثات','Conversation scenes')}</option>${[...topics.values()].map(t=>`<option value="${t.id}">${H(T(t.ar,t.en))}</option>`).join('')}</select>
  <label>${T('مستوى التعلّم','Learning level')}<select onchange="setStudioLearningLevel(this.value)">${learningLevelOptions(studioLearningLevel)}</select></label>
  ${smartLibraryFilters()}<button class="secondary" onclick="surpriseScene()">${T('اقترح مشهدًا','Suggest a scene')}</button></div>
  <section id="studio-pattern-context"></section><section id="scene-studio-active"></section>
  <dialog id="idea-zoom" aria-labelledby="idea-zoom-title" onclose="restoreIdeaZoom()"><div class="idea-zoom-header"><h2 id="idea-zoom-title"></h2><form method="dialog"><button class="secondary" aria-label="${T('إغلاق عرض المشهد','Close scene view')}">×</button></form></div><div class="idea-zoom-content"></div></dialog>
  <p id="scene-studio-count" role="status"></p>
  <div id="scene-studio-results" class="scene-studio-grid"></div><div class="buttonrow">
   <button class="secondary" id="scene-studio-prev" onclick="studioPage--;paintSceneStudio()">${T('السابق','Previous')}</button>
   <button class="secondary" id="scene-studio-next" onclick="studioPage++;paintSceneStudio()">${T('التالي','Next')}</button></div>`);
}
function setStudioMode(mode){
 if(mode===studioMode)return;
 studioMode=mode;studioOpenEpoch++;
 clearIdeaFlash();
 render();
 $(`[data-studio-mode="${mode}"]`)?.focus();
}
function studioMatches(){
 const tokens=normalizeSceneQuery($('#scene-studio-query')?.value||'').trim().split(/\s+/).filter(Boolean);
 const topic=$('#scene-studio-topic')?.value, topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 const sentences=new Map([...(PILOT?.sentences||[]),...(REFERENCE_CORPUS?.sentences||[])].map(s=>[s.id,s]));
 const dialogues=new Map((PILOT?.dialogues||[]).map(dialogue=>[dialogue.id,dialogue]));
 const originals=(sceneArchive?.scenes||[]).flatMap(item=>{
  const row=sentences.get(item.id);
  if(!row||!matchesStudioContext(row)||topic&&!item.topics.includes(topic))return [];
  const labels=item.topics.flatMap(id=>[topics.get(id).ar,topics.get(id).en]);
  const text=normalizeSceneQuery([row.id,row.en,row.ar,item.description,item.descriptionAr,...item.keywords,...labels].join(' '));
  return tokens.every(word=>text.includes(word))?[{item,row,level:sentenceLearningLevel(row)}]:[];
 });
 const visualPractice=(ideaLibrary?.scenes||[]).flatMap(scene=>{
  const location=dialogueSceneLocations.get(scene.id);
  if(topic&&(topic==='conversation'?!location:location||scene.topic!==topic))return [];
  const dialogue=dialogues.get(location?.id);
  const row={id:scene.id,pattern_ids:scene.patterns.map(pattern=>pattern.id)};
  if(!matchesStudioContext(row))return [];
  const text=normalizeSceneQuery([scene.en,scene.ar,scene.sentenceEn,scene.sentenceAr,dialogue?.en,dialogue?.ar,
   ...scene.words.flatMap(word=>[word.en,word.ar])].join(' '));
  return tokens.every(word=>text.includes(word))?[{item:scene,row,scene,level:sceneLearningLevel(scene)}]:[];
 });
 const levels=Object.keys(learningLevelNames);
 const rank=new Map(learningLevels.dialogueOrder.map((id,index)=>[id,index]));
 const firstScenes=new Map(learningLevels.starterScenes.map((id,index)=>[id,index]));
 const priority=({row})=>{
  const dialogueRank=rank.get(dialogueSceneLocations.get(row.id)?.id)??Infinity;
  return firstScenes.get(row.id)??(firstScenes.size+dialogueRank);
 };
 return [...originals,...visualPractice].filter(row=>!studioLearningLevel||row.level===studioLearningLevel)
  .sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level)||
   (studioPattern?Number(Boolean(a.scene))-Number(Boolean(b.scene)):0)||priority(a)-priority(b));
}
function setStudioLearningLevel(level){
 studioLearningLevel=level;
 studioPage=0;
 studioActiveId=null;
 studioOpenEpoch++;
 studioWordScene=null;
 stopSpeech();
 clearIdeaFlash();
 $('#scene-studio-active').replaceChildren();
 paintSceneStudio();
}
function paintSceneStudio(){
 if(studioMode==='journeys'){paintStudioJourneys();return}
 if(!$('#scene-studio-results'))return;
 const matches=studioMatches(), total=Math.max(1,Math.ceil(matches.length/24));
 studioPage=Math.max(0,Math.min(studioPage,total-1));
 $('#scene-studio-count').textContent=T(`${matches.length} مشهد · صفحة ${studioPage+1} من ${total}`,`${matches.length} scenes · Page ${studioPage+1} of ${total}`);
 $('#scene-studio-prev').disabled=studioPage===0;
 $('#scene-studio-next').disabled=studioPage+1>=total;
 const topics=new Map(sceneArchive?.topics.map(t=>[t.id,t])||[]);
 $('#scene-studio-results').innerHTML=matches.slice(studioPage*24,studioPage*24+24).map(({item,row,scene,level})=>{
  if(scene)return `<article class="panel">${ideaPicture(scene)}<button class="textlink" onclick="openStudioScene('${H(scene.id)}')">${H(T(scene.ar,scene.en))} ↗</button><small>${learningLevelLabel(level)}</small></article>`;
  const {ar,en}=topics.get(item.topics[0]);
  return `<article class="panel">${studioPicture(row,ar,en)}<button class="textlink" onclick="openStudioScene('${H(item.id)}')">${H(T(ar,en))} ↗</button><small>${learningLevelLabel(level)}</small></article>`;
 }).join('');
 prepareSmartSelection();
}
function studioPicture(row,ar,en){
 return pilotScene({...row,en,ar,context:''});
}
async function copySceneAiPrompt(button){
 const panel=button.closest('.scene-ai'),box=panel.querySelector('[data-scene-ai-prompt]'),status=panel.querySelector('[data-scene-ai-status]');
 try{await navigator.clipboard.writeText(box.value);status.textContent=T('نُسخ الطلب. الصقه في مساعدك المفضل.','Prompt copied. Paste it into your preferred assistant.')}
 catch{box.hidden=false;box.focus();box.select();status.textContent=T('حُدّد النص. انسخه يدويًا.','Text selected. Copy it manually.')}
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
const stopSpeechBeforeStudio=stopSpeech;
stopSpeech=function(){studioAudio?.pause();stopSpeechBeforeStudio()};
const renderBeforeSceneStudio=render;
render=function(){
 studioAudio?.pause();
 if(page!=='scene-studio'){renderBeforeSceneStudio();return}
 releaseDialoguePlayer();stopSpeech();nav();
 $('#app').innerHTML=sceneStudioPage();paintSceneStudio();EP.decorate();
};
archiveReady.then(data=>{sceneArchive=data;if(page==='scene-studio')render()});
pilotReady.then(()=>{if(page==='scene-studio')paintSceneStudio()});
Promise.all([dialogueArchiveReady,pilotReady,dialoguePlanReady]).then(()=>{if(page==='scene-studio')paintSceneStudio()});
function playStudioDialogueTurn(id){
 const location=dialogueSceneLocations.get(id);
 const dialogue=PILOT?.dialogues.find(row=>row.id===location?.id);
 if(dialogue)playStudioDialogueRange(dialogue,location.turn,location.turn,$('#scene-studio-active'));
}
function playStudioDialogueRange(dialogue,from,to,host,byTurn=false,rate=state.rate||1){
 const turns=dialogue?.audio?.turns;
 if(!turns?.[from]||!turns[to]||!host)return;
 stopSpeech();
 const audio=new Audio(dialogue.audio.path);
 studioAudio=audio;
 let frame=0;
 audio.playbackRate=rate;
 audio.currentTime=turns[from].start_ms/1000;
 const spans=Array.from({length:to-from+1},(_,index)=>{
  const line=byTurn?host.querySelector(`[data-studio-dialogue-turn="${from+index}"]`):host;
  return [...(line?.querySelectorAll('[data-dialogue-word]')||[])];
 });
 const paint=()=>{
  const ms=audio.currentTime*1000;
  if(!audio.paused&&ms>=turns[to].end_ms)audio.pause();
  spans.forEach((words,offset)=>{
   const index=audio.paused?-1:turns[from+offset].words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
   words.forEach((word,i)=>word.classList.toggle('speaking',index===i));
  });
 };
 const tick=()=>{
  paint();
  if(!audio.paused&&studioAudio===audio)frame=requestAnimationFrame(tick);
 };
 audio.addEventListener('playing',()=>{cancelAnimationFrame(frame);tick()});
 audio.addEventListener('pause',()=>{cancelAnimationFrame(frame);paint()});
 audio.play().catch(()=>toast(T('تعذّر تشغيل الصوت.','Audio could not play.')));
}
