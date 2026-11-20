/* One timeline drives the active turn, its scene and word cues. */
const dialogueCategories={
 social:['التعارف والأسرة','Social and family'],food:['الطعام والطلبات','Food and ordering'],
 travel:['السفر والمواصلات','Travel and transport'],study:['التعلم والمكتبة','Study and library'],
 daily:['الحياة اليومية','Everyday situations'],shopping:['التسوق','Shopping'],
 health:['الصحة','Health'],work:['العمل','Work'],interview:['مقابلات العمل','Job interviews']
};
const dialoguePurposes={
 ask:['السؤال والتحقّق','Ask and confirm'],
 request:['الطلب والاستئذان','Request and ask permission'],
 describe:['التعارف والوصف','Introduce and describe'],
 choose:['المقارنة والاختيار','Compare and choose'],
 plan:['الاتفاق والتخطيط','Make a plan'],
 retell:['سرد ما حدث','Tell what happened'],
 explain:['التوضيح والتبرير','Explain and give reasons'],
 solve:['حلّ مشكلة','Solve a problem']
};
const dialoguePlanReady=fetch('dialogue-plan.json')
 .then(response=>response.ok?response.json():null).catch(()=>null);
let dialoguePlan=null;
let dialogueCatalogPage=0;
const dialoguesPerPage=12;
const dialogueAnchors={
 1:/\bwant to\b/i,2:/\b(?:have|has) to\b/i,3:/\b(?:i['’]d|i would) like to\b/i,
 4:/\bcan i\b/i,5:/\bthis is\b/i,6:/\blet['’]s\b/i,8:/\bused to\b/i,
 9:/\bmanaged to\b/i,10:/\bit takes\b/i,11:/\b(?:it['’]s|it is) worth\b/i,
 12:/\bdo you know (?:where|if)\b/i,13:/\bneed to\b/i,102:/\bthat(?: is|['’]s)\b/i,
 103:/\bi(?: am|['’]m)\b/i,105:/\b(?:i have|do you have)\b/i,
  109:/\b(?:i['’]d|i would) like\b(?! to)/i,113:/\bmy name is\b/i,114:/\bwhat(?: is|['’]s) your name\b/i,
  116:/\bthese are\b/i,117:/\bthere is\b/i,118:/\bthere are\b/i,9023:/\bi usually\b/i,
  9037:/\bcan you\b/i,9039:/\bis it okay if\b/i,9041:/\bi need\b(?! to)/i,
 9044:/\b(?:don't|don’t|do not) have to\b/i,9047:/\byou should\b/i,9049:/\blet me\b/i,
 9051:/\b(?:what )?would you like\b(?! to)/i,9052:/\bwould you like to\b/i,
  9050:/\bplease\b/i,9054:/\bwhere is\b/i,9056:/\bwhen is\b/i,9064:/\bdo you\b/i,
  9063:/\bhow do you\b/i,9066:/\bis there\b/i,9068:/\bhow many\b/i,9069:/\bhow much\b/i,
  9075:/\bi didn['’]t\b/i,9076:/\bdid you\b/i,9080:/\bi bought\b/i,9082:/\bi forgot to\b/i,
  9089:/\bi['’]ll\b/i,9092:/\bi['’]m going to\b/i,9094:/\bare you going to\b/i,
  9097:/\b(?:starts|leaves|opens|begins) at\b/i,9100:/\bi might\b/i,9104:/\bif\b|\bi['’]ll\b/gi,
  9107:/\bi feel\b/i,9117:/\bi think\b/i,9125:/\bexcuse me\b/i,
 9120:/\bi prefer\b|\bto\b/gi,9126:/\bcould you please\b/i,9139:/\blet me know if\b/i,
  9127:/\bwould you mind\b/i,9128:/\bdo you mind if\b/i,
  9136:/\bi['’]m sorry for\b/i,9137:/\bthat['’]s all right\b/i,9138:/\bcould you clarify\b/i,
  9140:/\bbecause\b(?! of)/i,9141:/\bbecause of\b/i,9148:/\bbut\b/i
};
let dialogueQueue=null;
let dialogueResume={};
try{dialogueResume=JSON.parse(localStorage.getItem('nasaq-dialogue-resume-v1'))||{}}catch{}
let dialoguePriority=['image','text'].includes(dialogueResume.priority)?dialogueResume.priority:'image';
let dialogueSceneArchive={},dialogueLifecycles={};
const dialogueSceneLocations=new Map();
const dialogueArchiveReady=fetch('conversation-scenes.json').then(r=>r.ok?r.json():{}).then(data=>{
 dialogueSceneArchive=data.scenes||{};dialogueLifecycles=data.lifecycles||{};
 for(const [id,entry] of Object.entries(dialogueSceneArchive)){
  for(const [position,image] of Object.entries(entry.turns)){
   if(!dialogueSceneLocations.has(image.id))dialogueSceneLocations.set(image.id,{id,turn:Number(position)-1});
  }
  if(entry.cover&&!dialogueSceneLocations.has(entry.cover.id))dialogueSceneLocations.set(entry.cover.id,{id,turn:0});
 }
}).catch(()=>{});
function saveDialogueResume(){try{localStorage.setItem('nasaq-dialogue-resume-v1',JSON.stringify(dialogueResume))}catch{}}
function setDialoguePriority(value){
 dialoguePriority=value==='image'?'image':'text';dialogueResume.priority=dialoguePriority;saveDialogueResume();
 document.querySelectorAll('.dialogue-panel').forEach(panel=>{
  panel.dataset.priority=dialoguePriority;
  panel.querySelector('[data-dialogue-priority]').value=panel.dataset.priority;
 });
}
function dialoguePriorityControl(dialogue){
 const priority=dialoguePriority;
 return `<label class="dialogue-priority">${T('أولوية المتابعة','Follow priority')} <select data-dialogue-priority onchange="setDialoguePriority(this.value)">
 <option value="text" ${priority==='text'?'selected':''}>${T('النص الكامل','Full transcript')}</option>
 <option value="image" ${priority==='image'?'selected':''}>${T('المشهد','Scene')}</option></select></label>`;
}
function dialogueResumeKey(hostId){return hostId==='lesson-dialogue-player'?`lesson-${current?.id}`:'catalog'}
function pauseDialogueAudio(except){
 document.querySelectorAll('[data-dialogue-player] audio').forEach(audio=>{
  if(audio!==except)audio.pause();
 });
}
function releaseDialoguePlayer(){
 pauseDialogueAudio();
 dialogueQueue=null;
}
const stopSpeechBeforeDialogues=stopSpeech;
stopSpeech=function(options){
 pauseDialogueAudio();
 stopSpeechBeforeDialogues(options);
};
function dialogueWords(line){
 const highlighted=new Set(line.focus??line.patterns.flatMap(id=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  return dialogueAnchors[id]?EPTeaching.indices(line.en,dialogueAnchors[id]):EPTeaching.describe(line,pattern).highlight;
 }));
 return englishIndexedMarkup(line.en,line,text=>text.split(/\s+/).map((word,i)=>
  `<span data-dialogue-word="${i}" class="${highlighted.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' '),{timed:true});
}
function dialoguePatterns(ids){
 return [...new Set(ids)].map(id=>{
  const p=PILOT?.patterns.find(row=>row.id===id);
  return p?`<button class="textlink pattern-form" lang="en" dir="ltr" onclick="openDialogueLesson(${id})">${H(p.form)} ↗</button>`:'';
 }).join('');
}
function openDialogueLesson(id){
 return openLinkedLearning('lesson',id);
}
function dialogueScene(id){
 if(id?.startsWith('ref-'))return REFERENCE_CORPUS?.sentences.find(row=>row.id===id);
 return PILOT?.sentences.find(row=>row.id===id)||SUPPLEMENT?.sentences.find(row=>row.id===id);
}
function dialoguePhotoId(dialogue,index){
 const entry=dialogueSceneArchive[dialogue.id];
 const photo=entry?.turns?.[index+1]||entry?.cover;
 const scene=dialogue.lines[Math.max(index,0)]?.scene;
 return photo?.id||(dialogueScene(scene)?.image?scene:'');
}
function dialogueVisual(dialogue,index){
 const line=dialogue.lines[Math.max(index,0)];
 const entry=dialogueSceneArchive[dialogue.id];
 const image=entry?.turns?.[index+1]||entry?.cover;
 if(image)return `<img class="dialogue-dedicated-photo" src="${H(image.path)}" width="${image.width}" height="${image.height}" alt="${H(T(image.ar,image.en))}" loading="lazy">`;
 const example=dialogueScene(line.scene);
 if(!example?.image)return '';
 return `${pilotScene(example)}<small class="dialogue-illustrative">${T('مشهد توضيحي','Illustrative scene')}</small>`;
}
function dialogueImageButton(dialogue,index,thumb=false){
 const visual=dialogueVisual(dialogue,index);
 return visual?`<button type="button" class="dialogue-image-button ${thumb?'dialogue-thumb':''}" data-dialogue-image="${H(dialogue.id)}" data-dialogue-turn="${index}" onclick="enlargeDialogueScene(this)" aria-label="${T('تكبير المشهد مع الشرح','Enlarge scene with explanation')}">${visual}</button>`:'';
}
function enlargeDialogueScene(button){
 const dialogue=PILOT?.dialogues.find(item=>item.id===button.dataset.dialogueImage);
 const index=Number(button.dataset.dialogueTurn);
 const line=dialogue?.lines[index];
 const explanation=dialogue?dialogueSceneExplanation(dialogue,index):'';
 const photoId=dialogue&&dialoguePhotoId(dialogue,index);
 const libraryButton=photoId?`<button class="secondary" onclick="openDialoguePhotoInLibrary(this,'${H(photoId)}')">${T('افتح الصورة ومفرداتها','Open photo and vocabulary')} ↗</button>`:'';
 const dialog=document.createElement('dialog');
 dialog.className='dialogue-image-dialog';
 dialog.innerHTML=`<div class="dialogue-image-heading"><h2>${T('عرض المشهد','Scene view')}</h2><form method="dialog"><button class="secondary" autofocus aria-label="${T('إغلاق الصورة','Close image')}">×</button></form></div><figure>${button.innerHTML}<figcaption>${explanation}</figcaption></figure>${line?`<div class="dialogue-live-text"><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</div>`:''}${libraryButton}`;
 // Nest within the lesson so it stays available when that lesson is modal.
 (button.closest('#lesson')||document.body).append(dialog);
 dialog.addEventListener('close',()=>{dialog.remove();button.focus()},{once:true});
 dialog.showModal();
}
function dialogueSourceNote(line){
 if(!line.referenceId)return '';
 const number=Number(line.referenceId.slice(4));
 return `<small class="dialogue-source">${T(`من مكتبة الألف جملة · ${number}`,`From the 1,000-sentence library · ${number}`)}</small>`;
}
function openDialoguePhotoInLibrary(button,id){
 return openLinkedLearning('photo',id);
}
function dialogueStarterPanel(dialogue){
 const clip=learningLevels.starter[dialogue.id];
 if(!clip||!dialogue.audio)return '';
 const lines=dialogue.lines.slice(clip.from,clip.to+1);
 return `<section class="panel dialogue-starter" data-dialogue-starter="${H(dialogue.id)}">
  <h3>${T('ابدأ بهذا المقطع','Start with this exchange')}</h3>
  <p>${H(T(clip.ar,clip.en))}</p>
  <p>${T('اسمع المقطع، ثم أعده وقل العبارات بعد المتحدثين.','Listen once, then replay and say the lines after the speakers.')}</p>
  <div class="buttonrow">
   <button type="button" class="primary" onclick="playDialogueStarter(this,.85)">▶ ${T('استمع وكرّر ببطء','Listen and repeat slowly')}</button>
   <button type="button" class="secondary" onclick="playDialogueStarter(this,1)">▶ ${T('استمع بالسرعة العادية','Listen at normal speed')}</button>
  </div>
  <ol start="${clip.from+1}">${lines.map((line,index)=>`<li data-studio-dialogue-turn="${clip.from+index}"><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</li>`).join('')}</ol>
 </section>`;
}
function playDialogueStarter(button,rate){
 const host=button.closest('[data-dialogue-starter]');
 const id=host.dataset.dialogueStarter,clip=learningLevels.starter[id];
 const dialogue=PILOT?.dialogues.find(row=>row.id===id);
 if(clip&&dialogue)playStudioDialogueRange(dialogue,clip.from,clip.to,host,true,rate);
}
function dialoguePanel(dialogue, jump){
 const patterns=[...new Set(dialogue.lines.flatMap(line=>line.patterns))];
 const referenceTurns=dialogue.lines.filter(line=>line.referenceId);
 const life=dialogueLifecycles[dialogue.id];
 const priority=dialoguePriority;
 return `<section class="dialogue-panel" data-lifecycle="${Boolean(life)}" data-priority="${priority}"><div class="dialogue-panel-title"><h2>${H(T(dialogue.ar,dialogue.en))}</h2>${dialoguePriorityControl(dialogue)}</div>
  ${learningLevels.dialogues[dialogue.id]?`<p class="lesson-hint">${learningLevelLabel(learningLevels.dialogues[dialogue.id])}</p>`:''}
  <button type="button" class="secondary dialogue-overview-toggle" aria-expanded="false" onclick="toggleDialogueOverview(this)">${T('عرض كل المشاهد','Show all scenes')}</button>
  ${life?`<button type="button" class="secondary" onclick="openLinkedLearning('journey','${H(dialogue.id)}')">${T('تدرّب بتسلسل الصور','Practise with the photo sequence')} ↗</button>`:''}
  <div class="dialogue-overview" hidden>${life?dialogueJourney(dialogue,jump):dialogueSceneGallery(dialogue,jump)}</div>
  <details class="dialogue-patterns"><summary>${T('الأنماط في هذه المحادثة','Patterns in this conversation')}</summary>
  ${patterns.length?`<div class="buttonrow">${dialoguePatterns(patterns)}</div>`:''}
  ${referenceTurns.map(line=>`<div>${dialogueSourceNote(line)}<p lang="en" dir="ltr">${dialogueWords(line)}</p></div>`).join('')}
  </details>
  <div class="dialogue-active" aria-label="${T('المقطع الحالي','Current turn')}"></div>
  <details class="dialogue-transcript" open>
   <summary><span class="transcript-show">${T('عرض المحادثة كاملة','Show full conversation')}</span><span class="transcript-hide">${T('إخفاء نص المحادثة','Hide conversation transcript')}</span></summary>
   <ol>${dialogue.lines.map((line,i)=>`<li data-dialogue-line="${i}">
    ${dialogue.audio?`<button class="dialogue-turn-play" onclick="${jump}(${i},this)" aria-label="${T('استمع من الدور','Listen from turn')} ${i+1}">▶</button>`:''}
    <div><strong>${line.voice==='male'?T('عمر','Omar'):T('سارة','Sara')}</strong><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}${dialogueSourceNote(line)}</div>
    <figure class="dialogue-turn-visual">${dialogueImageButton(dialogue,i,true)}<figcaption>${dialogueSceneExplanation(dialogue,i,true)}</figcaption></figure>
   </li>`).join('')}</ol>
  </details></section>`;
}
function paintDialogue(panel,dialogue,ms){
 if(!panel||!dialogue?.audio)return;
 const active=panel.querySelector('.dialogue-active');
 if(!active)return;
 const { turns, intro, title }=dialogue.audio;
 const isTitle=Boolean(intro&&ms<turns[0].start_ms);
 const index=isTitle?-1:turns.findIndex((turn,i)=>i===turns.length-1||ms<turns[i+1].start_ms);
 paintDialogueJourney(panel,dialogue,index);
 const line=isTitle?{voice:'female',en:title,ar:dialogue.ar,patterns:[],scene:dialogue.lines[0].scene}:dialogue.lines[index];
 const turn=isTitle?intro:turns[index];
 const turnKey=`${dialogue.id}:${index}`;
 if(active.dataset.turn!==turnKey){
  const visual=dialogueImageButton(dialogue,index);
  active.dataset.turn=turnKey;
  const speaker=line.voice==='male'?T('عمر','Omar'):T('سارة','Sara');
  const explanation=visual?dialogueSceneExplanation(dialogue,index):'';
  active.innerHTML=`<div class="dialogue-photo">${visual}${explanation&&panel.id==='coach-body'
   ?`<details><summary>${T('وصف الصورة','Photo description')}</summary>${explanation}</details>`:explanation}</div><div class="dialogue-live-text">
   <small>${isTitle?T('عنوان المحادثة','Conversation title'):`${T('تتبّع النطق','Follow the spoken line')} · ${speaker} · ${index+1} / ${turns.length}`}</small>
   <p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}${dialogueSourceNote(line)}
   <div class="dialogue-turn-patterns">${dialoguePatterns(line.patterns)}</div></div>`;
  const list=panel.querySelector('.dialogue-transcript[open] ol');
  panel.querySelectorAll('[data-dialogue-line]').forEach(row=>{
   const selected=+row.dataset.dialogueLine===index;
   row.classList.toggle('active',selected);
   if(selected&&list){
    const bounds=list.getBoundingClientRect(),lineBounds=row.getBoundingClientRect();
    if(lineBounds.bottom>bounds.bottom||lineBounds.top<bounds.top)list.scrollTop+=lineBounds.top-bounds.top-4;
   }
  });
 }
 const cue=turn.words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
 panel.querySelectorAll('[data-dialogue-word]').forEach(word=>{
  const row=word.closest('[data-dialogue-line]');
  word.classList.toggle('speaking',(active.contains(word)||row&&+row.dataset.dialogueLine===index)&&+word.dataset.dialogueWord===cue);
 });
}
function jumpCoachDialogue(index){
 const turn=route.activeDialogue?.audio?.turns[index];
 if(!turn)return;
 route.seek(turn.start_ms/1000);
 if(!route.running)route.play();
 revealCoachContent();
}
function openDialogue(id,queued=false,hostId='dialogue-player',preview=false,resume=false){
 const dialogue=PILOT?.dialogues.find(d=>d.id===id);
 const host=document.getElementById(hostId);
 if(!dialogue||!host)return;
 if(!queued)dialogueQueue=null;
 if(!preview&&!queued){
  if(referencePlayerOpen)closeReferencePlayer();
  stopSpeech();
 }
 host.querySelector('audio')?.pause();
 const key=dialogueResumeKey(hostId), saved=dialogueResume[key];
 const compatible=resume&&saved?.id===id&&saved.sha256===dialogue.audio?.sha256;
 const index=queued?dialogueQueue.index:0,total=queued?dialogueQueue.ids.length:0;
 host.innerHTML=(hostId==='dialogue-player'&&!queued?dialogueStarterPanel(dialogue):'')+(dialogue.audio?
  `<div class="dialogue-play-status" role="status">${queued?`${index+1} / ${total} · ${dialogueQueue.label}`:''}</div>
  <div class="dialogue-transport"><button type="button" class="primary" data-dialogue-toggle onclick="toggleDialogueTransport(this)">▶ ${T('تشغيل','Play')}</button>
  <audio controls preload="metadata" src="${H(dialogue.audio.path)}" aria-label="${T('مشغّل المحادثة','Conversation player')}"></audio></div>${queued?`<div class="buttonrow" data-dialogue-queue-controls>
  <button class="secondary" onclick="advanceDialogueQueue(-1)" ${index===0?'disabled':''}>${T('الحوار السابق','Previous conversation')}</button>
  <button class="secondary" onclick="advanceDialogueQueue(1)" ${index+1>=total?'disabled':''}>${T('الحوار التالي','Next conversation')}</button>
  <button class="secondary" onclick="stopDialogueQueue()">${T('أوقف التتابع','Stop continuous play')}</button></div>`:''}`:
  `<p role="status">${T('يمكنك قراءة النص الآن. التسجيل قيد الإنتاج.','Read the transcript now. Audio is in production.')}</p>`)+dialoguePanel(dialogue,'jumpStandaloneDialogue');
 const audio=host.querySelector('audio');
 if(audio){
  host.dataset.dialogue=id;
  const offset=compatible?Math.min(Number(saved.offset)||0,Math.max(0,dialogue.audio.duration_ms/1000-.05)):0;
  let coverage=compatible?saved.coverage:undefined,lastSave=0;
  const storePosition=()=>{
   if(host.querySelector('audio')!==audio||document.body.dataset.linkedLearning)return;
   const queue=dialogueQueue?.hostId===hostId?dialogueQueue:null;
   coverage=NasaqRoutePlayer.conversationCoverage(audio,coverage);
   dialogueResume[key]={id,sha256:dialogue.audio.sha256,offset:audio.ended?0:audio.currentTime,coverage:audio.ended?undefined:coverage,queue:queue?.ids};
   lastSave=Date.now();saveDialogueResume();
   const resumeButton=document.querySelector(`[data-dialogue-resume="${key}"]`);
   if(resumeButton)resumeButton.hidden=!dialogueResume[key].offset;
  };
  const paint=()=>paintDialogue(host,dialogue,audio.currentTime*1000);
  const button=host.querySelector('[data-dialogue-toggle]');
  const paintButton=()=>{button.textContent=audio.paused?T('▶ تشغيل / استكمال','▶ Play / resume'):T('Ⅱ إيقاف مؤقت','Ⅱ Pause')};
  audio.addEventListener('timeupdate',()=>{paint();if(!audio.paused&&Date.now()-lastSave>800)storePosition()});
  audio.addEventListener('seeked',paint);
  if(offset)audio.addEventListener('loadedmetadata',()=>{audio.currentTime=offset;paint()},{once:true});
  audio.addEventListener('play',()=>{
   pauseDialogueAudio(audio);
   studioAudio?.pause();
   stopSpeechBeforeDialogues();
   paintButton();
  });
  audio.addEventListener('pause',()=>{paintButton();storePosition()});
  audio.saveDialoguePosition=storePosition;
  audio.addEventListener('error',()=>{host.querySelector('.dialogue-play-status').textContent=T('تعذّر تحميل التسجيل. حاول مجددًا بعد الاتصال.','The recording could not load. Try again after connecting.')});
  audio.addEventListener('ended',()=>{
   if(audio!==host.querySelector('audio'))return;
   if(NasaqRoutePlayer.heardConversation(audio,dialogue.audio,coverage))recordDailyPractice('dialogue',dialogue.id);
   if(hostId==='lesson-dialogue-player')finishLessonConversation(dialogue,audio,coverage);
   storePosition();paintButton();
   if(queued&&dialogueQueue?.hostId===hostId)advanceDialogueQueue(1);
  });
  paintDialogue(host,dialogue,offset*1000);
  if(!preview)playDialogueMedia(audio);
 }
 if(!preview&&hostId==='dialogue-player')host.scrollIntoView({block:'start'});
}
function openDialogueCard(id){
 const starter=Boolean(learningLevels.starter[id]);
 openDialogue(id,false,'dialogue-player',starter);
 if(starter){stopSpeech();$('#dialogue-player').scrollIntoView({block:'start'})}
}
function playDialogueMedia(audio){audio?.play().catch(()=>{toast(T('اضغط تشغيل لإعادة المحاولة.','Press Play to try again.'))})}
function toggleDialogueTransport(button){
 const audio=button.closest('[data-dialogue-player]').querySelector('audio');
 if(audio.paused)playDialogueMedia(audio);else audio.pause();
}
function playAllDialogues(filtered=false){
 const rows=(filtered?filteredDialogueEntries():dialogueEntries()).map(entry=>entry.dialogue);
 const ids=rows.filter(dialogue=>dialogue?.audio).map(dialogue=>dialogue.id);
 if(!ids.length)return;
 const label=filtered?T('تشغيل نتائج البحث','Playing filtered results'):T('تشغيل كل المحادثات','Playing all conversations');
 dialogueQueue={ids,index:0,label,hostId:'dialogue-player'};
 openDialogue(ids[0],true);
}
function resumeCatalogDialogue(){
 const saved=dialogueResume.catalog;
 if(!PILOT?.dialogues.some(d=>d.id===saved?.id&&d.audio))return;
 const ids=saved.queue?.filter(id=>PILOT.dialogues.some(d=>d.id===id&&d.audio));
 if(ids?.includes(saved.id)){
  dialogueQueue={ids,index:ids.indexOf(saved.id),label:T('استكمال القائمة','Resumed queue'),hostId:'dialogue-player'};
  openDialogue(saved.id,true,'dialogue-player',false,true);
 }else openDialogue(saved.id,false,'dialogue-player',false,true);
}
function advanceDialogueQueue(delta){
 if(!dialogueQueue)return;
 dialogueQueue.index=Math.max(0,dialogueQueue.index+delta);
 const hostId=dialogueQueue.hostId;
 if(dialogueQueue.index>=dialogueQueue.ids.length){
  dialogueQueue=null;
  const host=document.getElementById(hostId);
  host.querySelector('[data-dialogue-queue-controls]')?.remove();
  host.querySelector('.dialogue-play-status').textContent=T('اكتمل تشغيل القائمة.','Playback complete.');
  return;
 }
 if(hostId==='lesson-dialogue-player')$('#lesson-dialogue-select').value=dialogueQueue.ids[dialogueQueue.index];
 openDialogue(dialogueQueue.ids[dialogueQueue.index],true,hostId);
}
function stopDialogueQueue(){
 const host=document.getElementById(dialogueQueue?.hostId);
 if(!host)return;
 host.querySelector('audio')?.pause();
 dialogueQueue=null;
 host.querySelector('[data-dialogue-queue-controls]')?.remove();
 host.querySelector('.dialogue-play-status').textContent=T('توقف التتابع.','Continuous play stopped.');
}
function jumpStandaloneDialogue(index,button){
 const host=button.closest('[data-dialogue-player]'),audio=host?.querySelector('audio');
 const turn=PILOT?.dialogues.find(d=>d.id===host?.dataset.dialogue)?.audio?.turns[index];
 if(!audio||!turn)return;
 audio.currentTime=turn.start_ms/1000;
 audio.play().catch(()=>{});
}
function lessonConversationComplete(patternId){return Boolean(state.lessonConversations?.[patternId])}
function finishLessonConversation(dialogue,audio,coverage){
 const status=$('#lesson-conversation-status');
 if(!status||stage!==6)return;
 if(!NasaqRoutePlayer.heardConversation(audio,dialogue.audio,coverage)){
  status.textContent=T('بقي جزء من التسجيل لم تستمع إليه. شغّل المحادثة من البداية.','Part of the recording was skipped. Play the conversation from the beginning.');
  return;
 }
 state.lessonConversations={...state.lessonConversations,[current.id]:dialogue.id};
 persist();
 status.textContent=T('✓ استمعت إلى محادثة كاملة. يمكنك إنهاء الدرس أو سماع محادثة أخرى.','✓ You listened to a full conversation. Finish the lesson or try another conversation.');
 $('#lesson-step-feedback').textContent='';
}
function playLessonDialogueQueue(resume=false){
 const select=$('#lesson-dialogue-select');
 const recorded=route.dialoguesForPattern(current.id).filter(d=>d.audio);
 if(!recorded.length)return;
 const saved=dialogueResume[dialogueResumeKey('lesson-dialogue-player')];
 const ids=recorded.map(d=>d.id), index=resume?Math.max(0,ids.indexOf(saved?.id)):0;
 dialogueQueue={ids,index,label:T('محادثات النمط بالتتابع','Pattern conversations in order'),hostId:'lesson-dialogue-player'};
 select.value=ids[index];
 openDialogue(ids[index],true,'lesson-dialogue-player',false,resume);
}
function lessonConversationPanel(patternId){
 const choices=route?.dialoguesForPattern(patternId)||[];
 const ordered=[...choices].sort((a,b)=>Number(Boolean(b.audio))-Number(Boolean(a.audio)));
 return `<section id="lesson-conversation">
 <h2>${T('طبّق النمط في محادثة','Apply the pattern in conversation')}</h2>
 <p>${T('اختر موقفًا واستمع إلى محادثة كاملة واحدة على الأقل. يمكنك متابعة النص أو إخفاؤه لتتدرّب بأذنك.','Choose a situation and listen to at least one full conversation. Follow the transcript or hide it to train your ear.')}</p>
 <p id="lesson-conversation-status" role="status">${lessonConversationComplete(patternId)?T('✓ أكملت الاستماع المطلوب.','✓ Required listening complete.'):''}</p>
 ${ordered.length?`<label class="field">${T('اختر محادثة','Choose a conversation')}<select id="lesson-dialogue-select" onchange="selectLessonConversation()">
 ${ordered.map(d=>`<option value="${H(d.id)}">${H(T(d.ar,d.en))}${d.audio?'':T(' · النص فقط',' · Transcript only')}</option>`).join('')}
 </select></label><div class="buttonrow"><button class="primary" id="lesson-dialogue-play" onclick="playLessonDialogueQueue()">▶ ${T('شغّل كل محادثات النمط','Play all pattern conversations')}</button>
 <button class="secondary" data-dialogue-resume="lesson-${patternId}" onclick="playLessonDialogueQueue(true)" ${dialogueResume[`lesson-${patternId}`]?.offset?'':'hidden'}>▶ ${T('استكمل من آخر موضع','Resume where you left off')}</button>
 <button class="secondary" onclick="replayLessonStageCue()">♪ ${T('اسمع تقديم المرحلة','Hear the stage introduction')}</button></div>`:`<p>${T('لم تُحمّل المحادثات بعد. أعد فتح الدرس بعد الاتصال.','Conversations have not loaded yet. Reopen the lesson after connecting.')}</p>`}
 <div id="lesson-dialogue-player" data-dialogue-player></div></section>`;
}
function selectLessonConversation(){
 const id=$('#lesson-dialogue-select')?.value;
 if(!id)return;
 openDialogue(id,false,'lesson-dialogue-player',true);
 $('#lesson-dialogue-play').disabled=!route.dialoguesForPattern(current.id).some(d=>d.audio);
}
const renderLessonBeforeDialogues=renderLesson;
renderLesson=function(){
 $('#lesson-dialogue-player audio')?.pause();
 renderLessonBeforeDialogues();
 if(stage===6)selectLessonConversation();
};
const toggleCoachBeforeDialogues=toggleCoach;
toggleCoach=function(){
 pauseDialogueAudio();
 toggleCoachBeforeDialogues();
};
const coachNextBeforeDialogues=coachNext;
coachNext=function(){
 pauseDialogueAudio();
 coachNextBeforeDialogues();
};
const coachPreviousBeforeDialogues=coachPrevious;
coachPrevious=function(){
 pauseDialogueAudio();
 coachPreviousBeforeDialogues();
};
const playCatalogBeforeDialogues=playCatalogSentence;
playCatalogSentence=function(id){
 pauseDialogueAudio();
 playCatalogBeforeDialogues(id);
};
let dialogueLearningLevel='';
function dialoguesPage(){
 const groups=new Map();
 for(const entry of dialogueEntries()){
  if(entry.status!=='planned')groups.set(entry.level,(groups.get(entry.level)||0)+1);
 }
 return head(T('المحادثات','Conversations'),T('استمع إلى عنوان كل محادثة ثم إلى شخصين يستخدمان الأنماط في موقف واحد. يتغيّر المشهد مع الأدوار، ويمكنك فتح النص الكامل في أي وقت.','Hear each title, then listen to two people use patterns in context. The scene follows the turns, and the full transcript is always available.'))+
  `<aside class="panel dialogue-story-entry"><div><b>${T('تدرّب مع قصة قصيرة','Practise with a short story')}</b>
   <p>${T('استمع إلى «مقهى في مدينة جديدة» ثم أجب عن سؤال الفهم.','Listen to “A café in a new city,” then answer a comprehension question.')}</p></div>
   <button class="secondary" onclick="openLinkedLearning('story')">${T('افتح القصة','Open story')} ↗</button></aside>`+
  `<div class="buttonrow dialogue-series">${Object.keys(learningLevelNames).map(level=>
   `<button type="button" class="secondary" data-dialogue-level="${level}" aria-pressed="${dialogueLearningLevel===level}" onclick="selectDialogueLevel('${level}')">${learningLevelLabel(level)} · ${groups.get(level)||0}</button>`
  ).join('')}</div>
  <form class="panel dialogue-filters" onsubmit="event.preventDefault()" onreset="requestAnimationFrame(resetDialogueCatalog)">
   <label class="dialogue-search">${T('البحث','Search')}<input type="search" id="dialogue-query" oninput="resetDialogueFilters()" placeholder="${T('عنوان، موقف، أو نمط…','Title, situation, or pattern…')}"></label>
   ${dialogueSelect('category',T('الموقف','Situation'),T('كل المواقف','All situations'),dialogueCategories)}
   ${dialogueSelect('purpose',T('هدف المحادثة','Speaking goal'),T('كل الأهداف','All goals'),dialoguePurposes)}
   ${dialogueSelect('visual',T('المشاهد','Visual journey'),T('كل المحادثات','All conversations'),{journey:[`دورة مصوّرة · ${Object.keys(dialogueLifecycles).length} محادثة`,`Illustrated journey · ${Object.keys(dialogueLifecycles).length} conversations`]})}
   <label>${T('مستوى التعلّم','Learning level')}<select id="dialogue-level" onchange="selectDialogueLevel(this.value)">${learningLevelOptions(dialogueLearningLevel)}</select></label>
   ${dialogueSelect('status',T('الجاهزية','Availability'),T('المحادثات المتاحة','Available conversations'),{
    audio:['مسجّلة','Recorded'],text:['نص فقط','Transcript only'],planned:['مواقف في خطة التوسّع','Planned situations']
   },'resetDialogueCatalog()')}
   <label>${T('النمط','Pattern')}<select id="dialogue-pattern" onchange="resetDialogueFilters()" dir="ltr"></select></label>
  </form>
  <p id="dialogue-level-guide" class="lesson-hint"></p>
  <div class="buttonrow">
   <button class="secondary" data-dialogue-resume="catalog" onclick="resumeCatalogDialogue()" ${dialogueResume.catalog?.offset?'':'hidden'}>▶ ${T('استكمل من آخر موضع','Resume where you left off')}</button>
   <button class="primary" id="dialogue-play-all" onclick="playAllDialogues()">▷ ${T('شغّل كل المحادثات','Play all conversations')}</button>
   <button class="secondary" id="dialogue-play-filtered" onclick="playAllDialogues(true)">▷ ${T('شغّل النتائج المسجّلة','Play recorded results')}</button>
  </div>
  <div id="dialogue-player" data-dialogue-player></div>
  <p id="dialogue-count" role="status"></p>
  <div class="dialogue-catalog" id="dialogue-catalog"></div>
  <div class="buttonrow" id="dialogue-pagination" hidden>
   <button class="secondary" id="dialogue-prev-page" onclick="moveDialoguePage(-1)">${T('السابق','Previous')}</button>
   <button class="secondary" id="dialogue-next-page" onclick="moveDialoguePage(1)">${T('التالي','Next')}</button>
  </div>`;
}
function dialogueSelect(key,label,all,choices,onchange='resetDialogueFilters()'){
 return `<label>${label}<select id="dialogue-${key}" onchange="${onchange}">
  <option value="">${all}</option>${Object.entries(choices).map(([id,names])=>`<option value="${id}">${T(...names)}</option>`).join('')}
 </select></label>`;
}
function dialogueEntries(){
 const dialogues=new Map((PILOT?.dialogues||[]).map(dialogue=>[dialogue.id,dialogue]));
 const plan=new Map((dialoguePlan?.entries||[]).map(entry=>[entry.id,entry]));
 for(const dialogue of dialogues.values()){
  if(!plan.has(dialogue.id))plan.set(dialogue.id,dialogue);
 }
 const order=new Map(learningLevels.dialogueOrder.map((id,index)=>[id,index]));
 return [...plan.values()].sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity)).map(entry=>{
  const dialogue=dialogues.get(entry.id);
  const patternIds=dialogue?dialogue.lines.flatMap(line=>line.patterns):entry.targets;
  const status=dialogue?(dialogue.audio?'audio':'text'):'planned';
  return {...entry,level:learningLevels.dialogues[entry.id]||entry.level,dialogue,status,patternIds:[...new Set(patternIds||[])]};
 });
}
function selectDialogueLevel(level){
 dialogueLearningLevel=level;
 $('#dialogue-level').value=level;
 resetDialogueCatalog();
}
function dialogueStatusMatches(entry,status){
 return status?entry.status===status:entry.status!=='planned';
}
function paintDialoguePatternOptions(){
 const status=$('#dialogue-status').value;
 const select=$('#dialogue-pattern'),previous=select.value,level=$('#dialogue-level').value;
 const patternIds=new Set(dialogueEntries().filter(entry=>dialogueStatusMatches(entry,status)&&(!level||entry.level===level)).flatMap(entry=>entry.patternIds));
 const options=(PILOT?.patterns||[]).filter(pattern=>patternIds.has(pattern.id))
  .sort((left,right)=>left.form.localeCompare(right.form,'en'));
 select.innerHTML=`<option value="">${T('كل الأنماط','All patterns')}</option>`+
  options.map(pattern=>`<option value="${pattern.id}">${H(pattern.form)}</option>`).join('');
 if(patternIds.has(Number(previous)))select.value=previous;
}
function resetDialogueFilters(){
 dialogueCatalogPage=0;
 paintDialogueCatalog();
}
function syncDialogueFilters(){
 return EPFilters.controls('conversations',$('.dialogue-filters'),Object.fromEntries(
  ['query','category','purpose','visual','level','status','pattern'].map(key=>[key,$('#dialogue-'+key)])
 ),resetDialogueCatalog);
}
function resetDialogueCatalog(){
 syncDialogueFilters();
 paintDialoguePatternOptions();
 resetDialogueFilters();
}
function moveDialoguePage(delta){
 dialogueCatalogPage+=delta;
 paintDialogueCatalog();
 $('#dialogue-count').scrollIntoView({block:'start'});
}
function normalizeDialogueSearch(value){
 return value.toLowerCase().replace(/[\u064b-\u065f\u0670\u0640]/g,'')
  .replace(/[أإآ]/g,'ا').replace(/’/g,"'");
}
function filteredDialogueEntries(){
 const status=$('#dialogue-status').value;
 const facets=['category','purpose','level'].map(key=>[key,$('#dialogue-'+key).value]);
 const patternId=Number($('#dialogue-pattern').value);
 const tokens=normalizeDialogueSearch($('#dialogue-query').value).trim().split(/\s+/).filter(Boolean);
 const patterns=new Map((PILOT?.patterns||[]).map(pattern=>[pattern.id,pattern]));
 return dialogueEntries().filter(entry=>{
  if(!dialogueStatusMatches(entry,status))return false;
  if($('#dialogue-visual')?.value==='journey'&&!dialogueLifecycles[entry.id])return false;
  if(facets.some(([key,value])=>value&&String(entry[key])!==value))return false;
  if(patternId&&!entry.patternIds.includes(patternId))return false;
  if(!tokens.length)return true;
  const forms=entry.patternIds.flatMap(id=>{
   const pattern=patterns.get(id);
   return pattern?[pattern.form,pattern.title]:[];
  });
  const text=normalizeDialogueSearch([
   entry.ar,entry.en,entry.dialogue?.englishUsage?.us,entry.dialogue?.englishUsage?.uk,entry.taskAr,entry.taskEn,
   ...(dialogueCategories[entry.category]||[]),...(dialoguePurposes[entry.purpose]||[]),...forms,
   ...(entry.dialogue?.lines||[]).flatMap(line=>[line.en,line.ar,line.englishUsage?.us,line.englishUsage?.uk])
  ].join(' '));
  return tokens.every(token=>text.includes(token));
 });
}
function paintDialogueCatalog(){
 const host=$('#dialogue-catalog');
 if(!host)return;
 syncDialogueFilters();
 const entries=filteredDialogueEntries();
 dialogueLearningLevel=$('#dialogue-level').value;
 $('#dialogue-level-guide').textContent=learningLevelGuide(dialogueLearningLevel);
 document.querySelectorAll('[data-dialogue-level]').forEach(button=>
  button.setAttribute('aria-pressed',String(button.dataset.dialogueLevel===dialogueLearningLevel)));
 const totalPages=Math.max(1,Math.ceil(entries.length/dialoguesPerPage));
 dialogueCatalogPage=Math.max(0,Math.min(dialogueCatalogPage,totalPages-1));
 const offset=dialogueCatalogPage*dialoguesPerPage;
 const pageLabel=totalPages>1?` · ${T('الصفحة','Page')} ${dialogueCatalogPage+1}/${totalPages}`:'';
 const planned=dialoguePlan?.entries.filter(entry=>entry.targets&&!PILOT?.dialogues.some(d=>d.id===entry.id)).length||0;
 const plannedLabel=planned?` · ${T(`${planned} موقفًا في خطة التوسّع`,`${planned} situations on the roadmap`)}`:'';
 $('#dialogue-count').textContent=T(`${entries.length} نتيجة`,`${entries.length} results`)+pageLabel+plannedLabel;
 $('#dialogue-pagination').hidden=totalPages===1;
 $('#dialogue-prev-page').disabled=dialogueCatalogPage===0;
 $('#dialogue-next-page').disabled=dialogueCatalogPage+1===totalPages;
 $('#dialogue-play-all').disabled=!PILOT?.dialogues.some(dialogue=>dialogue.audio);
 $('#dialogue-play-filtered').disabled=!entries.some(entry=>entry.dialogue?.audio);
 if(!entries.length){
  host.innerHTML=`<p class="panel">${PILOT?T('لا توجد نتائج لهذه الفلاتر. جرّب مسحها أو تغيير البحث.','No matches. Reset the filters or try a different search.'):T('جارٍ تحميل المحادثات…','Loading conversations…')}</p>`;
  return;
 }
 host.innerHTML=entries.slice(offset,offset+dialoguesPerPage).map(entry=>{
  const {dialogue,category,level,purpose}=entry;
  const visual=dialogue?dialogueImageButton(dialogue,-1):'';
  const meta=[learningLevelLabel(level),T(...(dialogueCategories[category]||dialogueCategories.daily)),purpose&&T(...dialoguePurposes[purpose])].filter(Boolean).join(' · ');
  const label=dialogue?.audio?T('مسجّلة','Recorded'):dialogue?T('نص متاح','Transcript available'):T('ضمن الخطة','Planned');
  const action=dialogue?`<button class="secondary" onclick="openDialogueCard('${H(dialogue.id)}')">
    ${learningLevels.starter[dialogue.id]?T('ابدأ بالمقطع القصير','Start with the short exchange'):dialogue.audio?T('استمع','Listen'):T('اقرأ النص','Read transcript')} ↗</button>`:
   `<details><summary>${T('الأنماط المستهدفة','Target patterns')}</summary><div class="buttonrow">${dialoguePatterns(entry.patternIds)}</div></details>`;
  return `<article class="panel dialogue-cover">${visual}
  <div><small>${H(meta)}</small><span class="chip dialogue-status">${label}</span>
   <h3>${EP.prefs.language==='en'?englishTextMarkup(entry.en,entry):H(entry.ar)+' '+englishUsageButton(EPEnglish.analyze(entry.en,entry))}</h3>
   ${entry.taskEn&&T(entry.taskAr,entry.taskEn)!==T(entry.ar,entry.en)?`<p>${H(T(entry.taskAr,englishDisplay(entry.taskEn)))}</p>`:''}
   ${action}</div></article>`;
 }).join('');
}
labels.dialogues='المحادثات';
labels.comparisons='المقارنات';
if(['dialogues','comparisons'].includes(location.hash.slice(1)))page=location.hash.slice(1);
const renderBeforeDialogues=render;
render=function(){
 releaseDialoguePlayer();
 releaseComparisonGuide();
 if(!['dialogues','comparisons'].includes(page)){renderBeforeDialogues();return}
 if(route?.running)route.pause();
 nav();
 $('#app').innerHTML=page==='dialogues'?dialoguesPage():comparisonsPage();
 if(page==='comparisons'){
  paintComparisonSelection();
  applyPatternsImageMode();
 }
 if(page==='dialogues')resetDialogueCatalog();
 EP.decorate();
};
Promise.all([pilotReady,dialoguePlanReady,dialogueArchiveReady,learningLevelsReady]).then(([,plan])=>{
 dialoguePlan=plan;
 if(['dialogues','comparisons'].includes(page))render();
});
window.addEventListener('pagehide',()=>{
 document.querySelectorAll('[data-dialogue-player] audio').forEach(audio=>{if(!audio.paused)audio.saveDialoguePosition?.()});
});
render();
