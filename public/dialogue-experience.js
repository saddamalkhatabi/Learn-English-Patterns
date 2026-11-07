/* One timeline drives the active turn, its scene and word cues. */
const dialogueCategories={
 social:['التعارف والأسرة','Social and family'],food:['الطعام والطلبات','Food and ordering'],
 travel:['السفر والمواصلات','Travel and transport'],study:['التعلم والمكتبة','Study and library'],
 daily:['الحياة اليومية','Everyday situations'],shopping:['التسوق','Shopping'],
 health:['الصحة','Health'],work:['العمل','Work']
};
const dialogueAnchors={
 1:/\bwant to\b/i,2:/\b(?:have|has) to\b/i,3:/\b(?:i['’]d|i would) like to\b/i,
 4:/\bcan i\b/i,5:/\bthis is\b/i,6:/\blet['’]s\b/i,8:/\bused to\b/i,
 9:/\bmanaged to\b/i,10:/\bit takes\b/i,11:/\b(?:it['’]s|it is) worth\b/i,
 12:/\bdo you know (?:where|if)\b/i,13:/\bneed to\b/i,102:/\bthat(?: is|['’]s)\b/i,
 103:/\bi(?: am|['’]m)\b/i,105:/\b(?:i have|do you have)\b/i,
 109:/\b(?:i['’]d|i would) like\b(?! to)/i,113:/\bmy name is\b/i,114:/\bwhat(?: is|['’]s) your name\b/i,
 116:/\bthese are\b/i,117:/\bthere is\b/i,118:/\bthere are\b/i,9023:/\bi usually\b/i,
 9044:/\b(?:don't|don’t|do not) have to\b/i,9047:/\byou should\b/i,9049:/\blet me\b/i,
 9051:/\b(?:what )?would you like\b(?! to)/i,9052:/\bwould you like to\b/i,
 9063:/\bhow do you\b/i,9066:/\bis there\b/i,9068:/\bhow many\b/i,9069:/\bhow much\b/i,
 9080:/\bi bought\b/i,9082:/\bi forgot to\b/i,9107:/\bi feel\b/i,9117:/\bi think\b/i,
 9120:/\bi prefer\b|\bto\b/gi,9126:/\bcould you please\b/i,9139:/\blet me know if\b/i,
 9140:/\bbecause\b(?! of)/i,9141:/\bbecause of\b/i
};
let dialogueQueue=null;
function releaseDialoguePlayer(){
 $('#dialogue-player audio')?.pause();
 dialogueQueue=null;
}
function dialogueWords(line){
 const highlighted=new Set(line.patterns.flatMap(id=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  return dialogueAnchors[id]?EPTeaching.indices(line.en,dialogueAnchors[id]):EPTeaching.describe(line,pattern).highlight;
 }));
 return line.en.split(/\s+/).map((word,i)=>`<span data-dialogue-word="${i}" class="${highlighted.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' ');
}
function dialoguePatterns(ids){
 return [...new Set(ids)].map(id=>{
  const p=PILOT?.patterns.find(row=>row.id===id);
  return p?`<button class="textlink pattern-form" lang="en" dir="ltr" onclick="openDialogueLesson(${id})">${H(p.form)} ↗</button>`:'';
 }).join('');
}
function openDialogueLesson(id){
 releaseDialoguePlayer();
 openLesson(id);
}
function dialoguePanel(dialogue, jump){
 return `<section class="dialogue-panel"><h2>${H(T(dialogue.ar,dialogue.en))}</h2>
  <details class="dialogue-patterns"><summary>${T('الأنماط في هذه المحادثة','Patterns in this conversation')} · ${new Set(dialogue.lines.flatMap(line=>line.patterns)).size}</summary>
  <div class="buttonrow">${dialoguePatterns(dialogue.lines.flatMap(line=>line.patterns))}</div></details>
  <div class="dialogue-active" aria-label="${T('المقطع الحالي','Current turn')}"></div>
  <details class="dialogue-transcript" ${dialogue.audio?'':'open'}>
   <summary>${T('عرض كل المحادثة','Show full conversation')}</summary>
   <ol>${dialogue.lines.map((line,i)=>`<li data-dialogue-line="${i}">
    <strong>${line.voice==='male'?T('عمر','Omar'):T('سارة','Sara')}</strong>
    <div><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</div>
    ${dialogue.audio?`<button class="textlink" onclick="${jump}(${i})" aria-label="${T('استمع من الدور','Listen from turn')} ${i+1}">▷</button>`:''}
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
 const line=isTitle?{voice:'female',en:title,ar:dialogue.ar,patterns:[],scene:dialogue.lines[0].scene}:dialogue.lines[index];
 const turn=isTitle?intro:turns[index];
 if(active.dataset.turn!==String(index)){
  active.dataset.turn=index;
  const example=PILOT.sentences.find(s=>s.id===line.scene);
  const speaker=line.voice==='male'?T('عمر','Omar'):T('سارة','Sara');
  active.innerHTML=`<div class="dialogue-photo">${example?.image?pilotScene(example):''}</div><div>
   <small>${isTitle?T('عنوان المحادثة','Conversation title'):`${speaker} · ${index+1} / ${turns.length}`}</small>
   <p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}
   <div class="dialogue-turn-patterns">${dialoguePatterns(line.patterns)}</div></div>`;
  panel.querySelectorAll('[data-dialogue-line]').forEach(row=>row.classList.toggle('active',+row.dataset.dialogueLine===index));
 }
 const cue=turn.words.findIndex(word=>word.start_ms<=ms&&ms<word.end_ms);
 panel.querySelectorAll('[data-dialogue-word]').forEach(word=>{
  const row=word.closest('[data-dialogue-line]');
  word.classList.toggle('speaking',(!row||+row.dataset.dialogueLine===index)&&+word.dataset.dialogueWord===cue);
 });
}
function jumpCoachDialogue(index){
 const turn=route.activeDialogue?.audio?.turns[index];
 if(!turn)return;
 route.seek(turn.start_ms/1000);
 if(!route.running)route.play();
}
function openDialogue(id,queued=false){
 const dialogue=PILOT?.dialogues.find(d=>d.id===id);
 const host=$('#dialogue-player');
 if(!dialogue||!host)return;
 if(!queued)dialogueQueue=null;
 if(referencePlayerOpen)closeReferencePlayer();
 stopSpeech();
 host.querySelector('audio')?.pause();
 host.innerHTML=(dialogue.audio?
  `<div class="dialogue-play-status" role="status">${queued?`${dialogueQueue.index+1} / ${dialogueQueue.ids.length} · ${T('تشغيل كل المحادثات','Playing all conversations')}`:''}</div>
  <audio controls preload="metadata" src="${H(dialogue.audio.path)}"></audio>${queued?`<div class="buttonrow">
  <button class="secondary" onclick="advanceDialogueQueue(-1)">${T('الحوار السابق','Previous conversation')}</button>
  <button class="secondary" onclick="advanceDialogueQueue(1)">${T('الحوار التالي','Next conversation')}</button>
  <button class="secondary" onclick="stopDialogueQueue()">${T('أوقف التتابع','Stop continuous play')}</button></div>`:''}`:
  `<p role="status">${T('يمكنك قراءة النص الآن. التسجيل قيد الإنتاج.','Read the transcript now. Audio is in production.')}</p>`)+dialoguePanel(dialogue,'jumpStandaloneDialogue');
 const audio=host.querySelector('audio');
 if(audio){
  host.dataset.dialogue=id;
  const paint=()=>paintDialogue(host,dialogue,audio.currentTime*1000);
  audio.addEventListener('timeupdate',paint);
  audio.addEventListener('seeked',paint);
  audio.addEventListener('play',()=>stopSpeech());
  audio.addEventListener('ended',()=>{if(queued&&dialogueQueue&&audio===host.querySelector('audio'))advanceDialogueQueue(1)});
  paint();
  audio.play().catch(()=>{});
 }
 host.scrollIntoView({block:'start'});
}
function playAllDialogues(){
 const ids=(PILOT?.dialogues||[]).filter(d=>d.audio).map(d=>d.id);
 if(!ids.length)return;
 dialogueQueue={ids,index:0};
 openDialogue(ids[0],true);
}
function advanceDialogueQueue(delta){
 if(!dialogueQueue)return;
 dialogueQueue.index=Math.max(0,dialogueQueue.index+delta);
 if(dialogueQueue.index>=dialogueQueue.ids.length){
  dialogueQueue=null;
  $('.dialogue-play-status').textContent=T('اكتمل تشغيل المحادثات.','All conversations played.');
  return;
 }
 openDialogue(dialogueQueue.ids[dialogueQueue.index],true);
}
function stopDialogueQueue(){
 dialogueQueue=null;$('#dialogue-player audio')?.pause();
 $('.dialogue-play-status').textContent=T('توقف التتابع.','Continuous play stopped.');
}
function jumpStandaloneDialogue(index){
 const host=$('#dialogue-player'),audio=host?.querySelector('audio');
 const turn=PILOT?.dialogues.find(d=>d.id===host?.dataset.dialogue)?.audio?.turns[index];
 if(!audio||!turn)return;
 audio.currentTime=turn.start_ms/1000;
 audio.play().catch(()=>{});
}
function dialoguesPage(){
 return head(T('المحادثات','Conversations'),T('استمع إلى عنوان كل محادثة ثم إلى شخصين يستخدمان الأنماط في موقف واحد. يتغيّر المشهد مع الأدوار، ويمكنك فتح النص الكامل في أي وقت.','Hear each title, then listen to two people use patterns in context. The scene follows the turns, and the full transcript is always available.'))+
  `<div class="toolbar"><button class="primary" onclick="playAllDialogues()">▷ ${T('شغّل كل المحادثات','Play all conversations')}</button>
   <input type="search" id="dialogue-query" oninput="paintDialogueCatalog()" placeholder="${T('عنوان، موقف، أو نمط…','Title, situation, or pattern…')}" aria-label="${T('بحث المحادثات','Search conversations')}">
   <select id="dialogue-category" onchange="paintDialogueCatalog()" aria-label="${T('تصنيف المحادثات','Conversation category')}">
    <option value="">${T('كل التصنيفات','All categories')}</option>
    ${Object.entries(dialogueCategories).map(([id,labels])=>`<option value="${id}">${T(...labels)}</option>`).join('')}</select></div>
   <div id="dialogue-player"></div><div class="dialogue-catalog" id="dialogue-catalog"></div>`;
}
function paintDialogueCatalog(){
 const host=$('#dialogue-catalog');
 if(!host)return;
 const term=$('#dialogue-query').value.trim().toLowerCase(),category=$('#dialogue-category').value;
 const items=(PILOT?.dialogues||[]).filter(d=>{
  const ids=new Set(d.lines.flatMap(l=>l.patterns));
  const forms=PILOT.patterns.filter(p=>ids.has(p.id)).flatMap(p=>[p.form,p.title]);
  return (!category||d.category===category)&&[d.ar,d.en,...(dialogueCategories[d.category]||[]),...forms].join(' ').toLowerCase().includes(term);
 });
 host.innerHTML=items.map(d=>{
  const scene=PILOT.sentences.find(s=>s.id===d.lines[0].scene);
  return `<article class="panel dialogue-cover">${scene?.image?pilotScene(scene):''}
   <div><small>${T(...(dialogueCategories[d.category]||dialogueCategories.daily))} · ${d.lines.length}</small>
   <h3>${H(T(d.ar,d.en))}</h3><button class="secondary" onclick="openDialogue('${H(d.id)}')">
    ${d.audio?T('استمع','Listen'):T('اقرأ النص','Read transcript')} ↗</button></div></article>`;
 }).join('');
}
labels.dialogues='المحادثات';
labels.comparisons='المقارنات';
if(['dialogues','comparisons'].includes(location.hash.slice(1)))page=location.hash.slice(1);
epNavGroups[1][2].splice(2,0,['dialogues','▧','المحادثات','Conversations'],['comparisons','⇄','المقارنات','Comparisons']);
const renderBeforeDialogues=render;
render=function(){
 releaseDialoguePlayer();
 if(!['dialogues','comparisons'].includes(page)){renderBeforeDialogues();return}
 if(route?.running)route.pause();
 nav();
 $('#app').innerHTML=page==='dialogues'?dialoguesPage():comparisonsPage();
 if(page==='comparisons')paintComparisonSelection();
 if(page==='dialogues')paintDialogueCatalog();
 EP.decorate();
};
pilotReady.then(()=>{if(['dialogues','comparisons'].includes(page))render()});
render();
