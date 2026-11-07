/* One timeline drives the active turn, its scene and word cues. */
function dialogueWords(line){
 const highlighted=new Set(line.patterns.flatMap(id=>{
  const pattern=PILOT?.patterns.find(p=>p.id===id);
  return EPTeaching.describe(line,pattern).highlight;
 }));
 return line.en.split(/\s+/).map((word,i)=>`<span data-dialogue-word="${i}" class="${highlighted.has(i)?'pattern-token':''}">${H(word)}</span>`).join(' ');
}
function dialoguePanel(dialogue, jump){
 return `<section class="dialogue-panel"><h2>${H(T(dialogue.ar,dialogue.en))}</h2>
  <div class="dialogue-active" aria-label="${T('المقطع الحالي','Current turn')}"></div>
  <details class="dialogue-transcript" ${dialogue.audio?'':'open'}>
   <summary>${T('عرض كل المحادثة','Show full conversation')}</summary>
   <ol>${dialogue.lines.map((line,i)=>`<li data-dialogue-line="${i}">
    <strong>${line.voice==='male'?T('عمر','Omar'):T('سارة','Sara')}</strong>
    <p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}
    ${dialogue.audio?`<button class="textlink" onclick="${jump}(${i})">${T('استمع من هنا','Listen from here')} ▷</button>`:''}
   </li>`).join('')}</ol>
  </details></section>`;
}
function paintDialogue(panel,dialogue,ms){
 if(!panel||!dialogue?.audio)return;
 const active=panel.querySelector('.dialogue-active');
 if(!active)return;
 const turns=dialogue.audio.turns;
 let index=turns.findIndex((turn,i)=>i===turns.length-1||ms<turns[i+1].start_ms);
 if(index<0)index=0;
 const line=dialogue.lines[index], turn=turns[index];
 if(active.dataset.turn!==String(index)){
  active.dataset.turn=index;
  const example=PILOT.sentences.find(s=>s.id===line.scene);
  const speaker=line.voice==='male'?T('عمر','Omar'):T('سارة','Sara');
  active.innerHTML=`<div class="dialogue-photo">${example?.image?pilotScene(example):''}</div><div><small>${speaker} · ${index+1} / ${turns.length}</small><p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</div>`;
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
function openDialogue(id){
 const dialogue=PILOT?.dialogues.find(d=>d.id===id);
 const host=$('#dialogue-player');
 if(!dialogue||!host)return;
 if(referencePlayerOpen)closeReferencePlayer();
 stopSpeech();
 host.querySelector('audio')?.pause();
 host.innerHTML=(dialogue.audio?
  `<audio controls preload="metadata" src="${H(dialogue.audio.path)}"></audio>`:
  `<p role="status">${T('يمكنك قراءة النص الآن. التسجيل قيد الإنتاج.','Read the transcript now. Audio is in production.')}</p>`)+dialoguePanel(dialogue,'jumpStandaloneDialogue');
 const audio=host.querySelector('audio');
 if(audio){
  host.dataset.dialogue=id;
  const paint=()=>paintDialogue(host,dialogue,audio.currentTime*1000);
  audio.addEventListener('timeupdate',paint);
  audio.addEventListener('seeked',paint);
  audio.addEventListener('play',()=>stopSpeech());
  paint();
  audio.play().catch(()=>{});
 }
 host.scrollIntoView({block:'start'});
}
function jumpStandaloneDialogue(index){
 const host=$('#dialogue-player'),audio=host?.querySelector('audio');
 const turn=PILOT?.dialogues.find(d=>d.id===host?.dataset.dialogue)?.audio?.turns[index];
 if(!audio||!turn)return;
 audio.currentTime=turn.start_ms/1000;
 audio.play().catch(()=>{});
}
function dialoguesPage(){
 const items=PILOT?.dialogues||[];
 return head(T('المحادثات','Conversations'),T('استمع إلى شخصين يستخدمان الأنماط داخل موقف واحد. يمكنك فتح النص الكامل أو العودة إلى أي مقطع.','Hear two people use the patterns in context. Open the full transcript or jump to any turn.'))+
  `<div class="buttonrow">${items.map(d=>`<button class="secondary" onclick="openDialogue('${H(d.id)}')">${H(T(d.ar,d.en))}</button>`).join('')}</div><div id="dialogue-player"></div>`;
}
let patternComparisons=[];
fetch('comparisons.json').then(r=>r.ok?r.json():[]).then(rows=>{patternComparisons=rows;if(page==='comparisons')render()}).catch(()=>{});
function comparisonsPage(){
 return head(T('المقارنات','Pattern comparisons'),T('اقرأ الفرق، ثم جرّب سؤالًا يكشف متى تختار كل صيغة.','Read the distinction, then try a question that tests when to use each form.'))+
  `<div class="panel">${patternComparisons.map((item,i)=>`<details class="comparison-card"><summary>${H(T(item.ar,item.en))}</summary>
   <p>${H(T(item.noteAr,item.noteEn))}</p>
   <div class="comparison-examples">${item.examples.map((example,j)=>{
    const pattern=PILOT?.patterns.find(p=>p.id===item.patterns[j]);
    return `<div><button class="textlink pattern-form" onclick="openLesson(${item.patterns[j]})" dir="ltr">${H(pattern?.form||example)} ↗</button><p dir="ltr" lang="en">${H(example)}</p></div>`;
   }).join('')}</div>
   <p lang="en" dir="ltr">${H(item.question)}</p><div class="buttonrow">${item.options.map((option,n)=>`<button class="secondary" onclick="checkComparison(${i},${n},this)" lang="en" dir="ltr">${H(option)}</button>`).join('')}</div>
   <p role="status" class="comparison-feedback"></p></details>`).join('')}</div>`;
}
function checkComparison(index,choice,button){
 const item=patternComparisons[index], ok=choice===item.answer;
 button.closest('.comparison-card').querySelector('.comparison-feedback').textContent=
  (ok?T('صحيح. ','Correct. '):T('راجع الفرق وجرّب مجددًا. ','Review the distinction and try again. '))+T(item.noteAr,item.noteEn);
}
labels.dialogues='المحادثات';
labels.comparisons='المقارنات';
if(['dialogues','comparisons'].includes(location.hash.slice(1)))page=location.hash.slice(1);
epNavGroups[1][2].splice(2,0,['dialogues','▧','المحادثات','Conversations'],['comparisons','⇄','المقارنات','Comparisons']);
const renderBeforeDialogues=render;
render=function(){
 $('#dialogue-player audio')?.pause();
 if(!['dialogues','comparisons'].includes(page)){renderBeforeDialogues();return}
 if(route?.running)route.pause();
 nav();
 $('#app').innerHTML=page==='dialogues'?dialoguesPage():comparisonsPage();
 EP.decorate();
};
pilotReady.then(()=>{if(['dialogues','comparisons'].includes(page))render()});
render();
