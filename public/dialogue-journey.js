function toggleDialogueOverview(button){
 const overview=button.closest('.dialogue-panel').querySelector('.dialogue-overview');
 overview.hidden=!overview.hidden;
 button.setAttribute('aria-expanded',String(!overview.hidden));
 button.textContent=overview.hidden?T('عرض كل المشاهد','Show all scenes'):T('إخفاء كل المشاهد','Hide all scenes');
}
function dialogueSceneExplanation(dialogue,turn,compact=false){
 const life=dialogueLifecycles[dialogue.id];
 const stage=turn<0?null:life?.stages.find(item=>item.from<=turn+1&&turn+1<=item.to);
 const image=dialogueSceneArchive[dialogue.id]?.turns?.[turn+1];
 const note=life?.turnPurposes?.[turn];
 const title=stage?T(stage.ar,stage.en):T('معنى المشهد','Scene meaning');
 const purpose=stage?T(stage.purposeAr,stage.purposeEn):turn<0&&life?T(life.goalAr,life.goalEn):image?T(image.ar,image.en):T('مشهد توضيحي. اقرأ العبارة وترجمتها لفهم استخدامها في الحوار.','Illustrative scene. Read the line and its translation to understand its use in the conversation.');
 return `<div class="dialogue-scene-explanation"><strong>${H(title)}</strong>${!compact||!note?`<p>${H(purpose)}</p>`:''}${note?`<p class="dialogue-line-purpose"><b>${T('غرض العبارة','Purpose of this line')}:</b> ${H(T(note[0],note[1]))}</p>`:''}</div>`;
}
function dialogueSceneGallery(dialogue,jump){
 return `<div class="dialogue-scene-gallery">${dialogue.lines.map((line,index)=>`<figure>${dialogueImageButton(dialogue,index)}<figcaption><b>${T('الدور','Turn')} ${index+1}</b>${dialogueSceneExplanation(dialogue,index)}<p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}${dialogue.audio?`<button class="secondary" onclick="${jump}(${index},this)">${T('استمع إلى العبارة','Listen to the line')} ▶</button>`:''}</figcaption></figure>`).join('')}</div>`;
}
function dialogueJourney(dialogue,jump){
 const life=dialogueLifecycles[dialogue.id];
 return `<section class="dialogue-journey" aria-label="${T('دورة المحادثة','Conversation journey')}">
  <div class="journey-center"><span>${T('من الفكرة إلى الاستجابة','From an idea to a response')}</span>
   <h3>${H(T(dialogue.ar,dialogue.en))}</h3><p>${H(T(life.goalAr,life.goalEn))}</p></div>
  ${life.stages.map((stage,index)=>{
   const image=dialogueSceneArchive[dialogue.id].turns[stage.from];
   return `<button type="button" class="journey-stage journey-stage-${index}" data-journey-stage="${index}"
    onclick="${jump}(${stage.from-1},this)" ${dialogue.audio?'':'disabled'}
    aria-label="${H(T(stage.ar,stage.en))} · ${T('استمع من الدور','Listen from turn')} ${stage.from}">
     <img src="${H(image.path)}" width="${image.width}" height="${image.height}" alt="${H(T(image.ar,image.en))}" loading="lazy">
     <span><b>${index+1} · ${H(T(stage.ar,stage.en))}</b><small>${H(T(stage.purposeAr,stage.purposeEn))}</small></span>
    </button>`;
  }).join('')}
  <div class="journey-caption" role="status">${T('انقر مرحلة للاستماع إليها، أو شغّل المحادثة لتتبع انتقالها.','Select a stage to hear it, or play the conversation and follow the journey.')}</div>
 </section>`;
}
function paintDialogueJourney(panel,dialogue,turn){
 const life=dialogueLifecycles[dialogue.id];
 if(!life)return;
 const index=turn<0?-1:life.stages.findIndex(stage=>stage.from<=turn+1&&turn+1<=stage.to);
 const journey=panel.querySelector('.dialogue-journey');
 if(!journey||journey.dataset.stage===String(index))return;
 journey.dataset.stage=String(index);
 journey.querySelectorAll('[data-journey-stage]').forEach(button=>{
  const active=Number(button.dataset.journeyStage)===index;
  button.classList.toggle('active',active);
  if(active)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
 });
 const stage=life.stages[index];
 journey.querySelector('.journey-caption').textContent=stage?
  `${index+1} / ${life.stages.length} · ${T(stage.ar,stage.en)} · ${T(stage.purposeAr,stage.purposeEn)}`:
  T(life.goalAr,life.goalEn);
}
