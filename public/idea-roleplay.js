const ideaFollowups={
 home:'What should we prepare or put away next?',
 food:'Could you ask about a different amount or ingredient?',
 travel:'What would you do if the plan changed?',
 study:'Could you explain that to a classmate using an example?',
 work:'Who should handle the next step, and why?',
 neighborhood:'How would you ask a neighbor for help?',
 nature:'What might change if the weather turns?',
 health:'What would you ask to make sure you understood the instructions?',
 craft:'What should we check before we finish?',
 events:'How would you adapt if more people arrived?'
};
function renderIdeaRoleplay(scene){
 const form=ideaPracticeForm();
 return `<div class="idea-roleplay">
  <p lang="en" dir="ltr">${H(scene.taskEn)}</p>${EP.ar(scene.taskAr)}
  ${form?`<p>${T('جرّب استخدام هذا النمط في أحد ردودك','Try using this pattern in one of your replies')} <strong class="pattern-form" lang="en" dir="ltr">${H(form)}</strong></p>`:''}
  <h3>${T('الحوار الموجّه','Guided conversation')}</h3>
  <p>${T('أجب بالإنجليزية. بعد كل رد يظهر سؤال متابعة يساعدك على تطوير الحوار.','Reply in English. A follow-up after each reply helps you develop the conversation.')}</p>
  <div id="idea-guided-chat"></div>
  <details class="scene-ai">
   <summary>${T('ابتكر حوارًا مع مساعدك واستورده','Create and import a dialogue with your AI assistant')}</summary>
   <p>${T('انسخ الطلب إلى مساعدك، ثم الصق رده هنا. يمكنك لصق JSON أو حوار مكتوب بأسماء المتحدثين.','Copy the prompt to your assistant, then paste its reply here. You can paste JSON or a dialogue with speaker names.')}</p>
   <div class="buttonrow"><button class="secondary" onclick="showIdeaDialoguePrompt()">✦ ${T('جهّز طلب الحوار','Prepare dialogue prompt')}</button>
    <button class="secondary" data-copy-scene-ai onclick="copySceneAiPrompt(this)" hidden>${T('انسخ الطلب','Copy prompt')}</button></div>
   <textarea readonly hidden data-scene-ai-prompt aria-label="${T('طلب الحوار','Dialogue prompt')}" rows="6" dir="ltr" lang="en"></textarea>
   <p data-scene-ai-status role="status"></p>
   <form onsubmit="event.preventDefault();importIdeaDialogue()">
    <label>${T('رد المساعد','Assistant reply')}<textarea id="idea-dialogue-input" maxlength="30000" rows="5" dir="auto" placeholder="A: …&#10;B: …"></textarea></label>
    <button class="primary" type="submit">${T('استورد الحوار واحفظه','Import and save dialogue')}</button>
   </form>
  </details>
  <p id="idea-dialogue-status" role="status"></p>
  <section class="idea-archive"><h3>${T('أرشيف حواراتي','My dialogue archive')}</h3>
   <p>${T('يُحفظ الأرشيف في هذا المتصفح.','Your archive is saved in this browser.')}</p>
   <label>${T('اعرض حوارات','Show dialogues for')} <select onchange="ideaArchiveScope=this.value;paintIdeaArchive()">
    <option value="scene" ${ideaArchiveScope==='scene'?'selected':''}>${T('هذا المشهد','This scene')}</option>
    <option value="all" ${ideaArchiveScope==='all'?'selected':''}>${T('كل المشاهد','All scenes')}</option></select></label>
   <div id="idea-archive-list"></div><div id="idea-archive-view"></div>
  </section></div>`;
}
function ideaChatBubbles(turns,kind){
 const firstSpeaker=turns[0]?.speaker;
 return `<div class="chat idea-chat" aria-label="${T('نص الحوار','Dialogue transcript')}">${turns.map((turn,index)=>`
  <div class="bubble ${turn.user||turn.speaker!==firstSpeaker?'user':''}">
   <div class="idea-chat-line"><b dir="auto">${H(turn.speaker)}</b>
    <button class="dialogue-turn-play" onclick="hearIdeaDialogueTurn('${kind}',${index})" aria-label="${T('استمع إلى الدور','Hear turn')} ${index+1}">▶</button></div>
   <p lang="en" dir="ltr">${H(turn.en)}</p>${EP.ar(turn.ar)}
  </div>`).join('')}</div>`;
}
function paintIdeaGuided(){
 const host=$('#idea-guided-chat');
 if(!host)return;
 const turns=ideaGuided.get(ideaSceneId);
 if(!turns){
  host.innerHTML=`<button class="primary" onclick="startIdeaGuided()">${T('ابدأ الحوار','Start dialogue')} →</button>`;
  return;
 }
 host.innerHTML=ideaChatBubbles(turns,'guided')+`
  ${turns.length<8?`<form class="idea-chat-compose" onsubmit="event.preventDefault();sendIdeaGuided()">
   <label>${T('ردّك بالإنجليزية','Your reply in English')}<input id="idea-guided-reply" dir="ltr" lang="en" required maxlength="650" autocomplete="off"></label>
   <button class="primary" type="submit">${T('أرسل الرد','Send reply')}</button></form>`:`<p>${T('أكملت الحوار. يمكنك حفظه أو البدء من جديد.','You completed the dialogue. Save it or start again.')}</p>`}
  <div class="buttonrow"><button class="secondary" onclick="saveIdeaGuided()" ${turns.length<3?'disabled':''}>${T('احفظ الحوار في الأرشيف','Save dialogue to archive')}</button>
  <button class="textlink" onclick="startIdeaGuided()">${T('ابدأ من جديد','Start again')}</button></div>`;
 const chat=host.querySelector('.idea-chat');
 chat.scrollTop=chat.scrollHeight;
}
function startIdeaGuided(){
 const scene=currentIdeaScene();
 if(!scene)return;
 ideaGuided.set(scene.id,[{speaker:T('الشريك','Partner'),en:`Look at the scene. ${scene.taskEn}`,ar:scene.taskAr}]);
 paintIdeaGuided();
 $('#idea-guided-reply')?.focus();
}
function sendIdeaGuided(){
 const scene=currentIdeaScene();
 const turns=ideaGuided.get(ideaSceneId);
 const input=$('#idea-guided-reply'),en=input?.value.trim();
 if(!scene||!turns||!en||turns.length>=8)return;
 const next=[
  `Choose one visible detail, such as “${scene.words[0].en}”. How would you use it in your next reply?`,
  ideaFollowups[scene.topic]||'How would you answer if the situation changed?',
  'How would you close this conversation politely?'
 ][(turns.length-1)/2];
 turns.push({speaker:T('أنت','You'),en,ar:'',user:true});
 if(next)turns.push({speaker:T('الشريك','Partner'),en:next,ar:''});
 paintIdeaGuided();
 $('#idea-guided-reply')?.focus();
}
function showIdeaDialoguePrompt(){
 const scene=currentIdeaScene(),box=$('#idea-lab-task [data-scene-ai-prompt]');
 if(!scene||!box)return;
 const examples=[ideaPracticeForm(),...(scene.patterns||[]).map(pattern=>pattern.en||PILOT?.patterns.find(p=>p.id===pattern.id)?.form)].filter(Boolean);
 box.value=`Write a practical English role-play for an Arabic-speaking A2 learner.
Scene: ${scene.sentenceEn}
Task: ${scene.taskEn}
Useful vocabulary: ${scene.words.map(word=>word.en).join(', ')}.
Patterns to use where natural: ${examples.join(' / ')||'Can you …? / Let’s …'}
Write 6 to 10 turns between two distinct named speakers. Include a follow-up question and one practical decision. Add a natural Arabic translation to each turn. Output only valid JSON using this exact structure:
{"title":"Short title","turns":[{"speaker":"A","en":"English turn","ar":"الترجمة العربية"},{"speaker":"B","en":"English reply","ar":"الترجمة العربية"}]}`;
 box.hidden=false;
 $('#idea-lab-task [data-copy-scene-ai]').hidden=false;
 box.focus();
}
function ideaDialogueStatus(message){$('#idea-dialogue-status').textContent=message}
function archiveIdeaDialogue(draft,source){
 const scene=currentIdeaScene();
 if(!scene)return;
 if(ideaArchive.length>=250){
  ideaDialogueStatus(T('الأرشيف ممتلئ. احذف حوارًا لتضيف آخر.','The archive is full. Remove a dialogue to add another.'));
  return;
 }
 const entry={ ...draft,id:globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title:draft.title||T(scene.ar,scene.en),sceneId:scene.id,source };
 const entries=[entry,...ideaArchive];
 try{localStorage.setItem('nasaq-idea-dialogues-v1',JSON.stringify(entries))}
 catch{ideaDialogueStatus(T('تعذّر الحفظ. تحقّق من مساحة التخزين المتاحة في المتصفح.','Could not save. Check the available browser storage.'));return}
 ideaArchive=entries;
 ideaArchiveView=entry.id;
 paintIdeaArchive();
 paintIdeaLibrary();
 ideaDialogueStatus(T('حُفظ الحوار وظهر في الأرشيف.','The dialogue is saved and open in the archive.'));
 const heading=$('#idea-archive-view h4');
 heading?.focus({preventScroll:true});
 heading?.scrollIntoView({block:'nearest'});
 return entry;
}
function importIdeaDialogue(){
 const field=$('#idea-dialogue-input');
 let draft;
 try{draft=parseIdeaDialogue(field.value)}
 catch{
  ideaDialogueStatus(T('الصق حوارًا إنجليزيًا فيه سطران على الأقل لمتحدثَين. استخدم أسماء متبوعة بنقطتين أو الصيغة الموجودة في الطلب.','Paste at least two English turns from two speakers. Use names followed by colons or the format in the prompt.'));
  return;
 }
 if(archiveIdeaDialogue(draft,'import'))field.value='';
}
function saveIdeaGuided(){
 const turns=ideaGuided.get(ideaSceneId);
 if(turns?.length>=3)archiveIdeaDialogue({turns},'guided');
}
function paintIdeaArchive(){
 const list=$('#idea-archive-list'),view=$('#idea-archive-view');
 if(!list||!view)return;
 const rows=ideaArchive.filter(entry=>ideaArchiveScope==='all'||entry.sceneId===ideaSceneId);
 list.innerHTML=rows.length?`<ul>${rows.map(entry=>`<li><button class="textlink" data-archive-id="${H(entry.id)}" onclick="openIdeaArchivedDialogue(this.dataset.archiveId)">${H(entry.title)} ↗</button>
 <small>${entry.source==='guided'?T('موجّه','Guided'):T('مستورَد','Imported')} · ${entry.turns.length} ${T('أدوار','turns')}</small></li>`).join('')}</ul>`:
  `<p>${T('لا توجد حوارات محفوظة هنا بعد.','No dialogues saved here yet.')}</p>`;
 const entry=rows.find(row=>row.id===ideaArchiveView);
 view.innerHTML=entry?`<h4 dir="auto" tabindex="-1">${H(entry.title)}</h4>${ideaChatBubbles(entry.turns,'archive')}
  <div class="buttonrow"><button class="secondary" onclick="ideaArchiveView=null;paintIdeaArchive()">${T('أغلق النص','Close transcript')}</button>
  ${entry.sceneId!==ideaSceneId?`<button class="secondary" onclick="openIdeaArchiveScene()">${T('افتح المشهد المرتبط','Open linked scene')}</button>`:''}
  <button class="textlink" onclick="removeIdeaArchivedDialogue()">${T('احذف من أرشيفي','Remove from my archive')}</button></div>`:'';
}
function openIdeaArchivedDialogue(id){ideaArchiveView=id;paintIdeaArchive()}
function openIdeaArchiveScene(){
 const id=ideaArchiveView;
 const entry=ideaArchive.find(row=>row.id===id);
 if(!entry||!ideaLibrary?.scenes.some(scene=>scene.id===entry.sceneId))return;
 chooseIdeaScene(entry.sceneId);
 ideaArchiveView=id;
 paintIdeaArchive();
}
function removeIdeaArchivedDialogue(){
 const entries=ideaArchive.filter(entry=>entry.id!==ideaArchiveView);
 try{localStorage.setItem('nasaq-idea-dialogues-v1',JSON.stringify(entries))}
 catch{ideaDialogueStatus(T('تعذّر تحديث الأرشيف.','Could not update your archive.'));return}
 ideaArchive=entries;
 ideaArchiveView=null;
 paintIdeaArchive();
 paintIdeaLibrary();
 ideaDialogueStatus(T('حُذف الحوار من أرشيفك.','The dialogue was removed from your archive.'));
}
function hearIdeaDialogueTurn(kind,index){
 const turns=kind==='guided'?ideaGuided.get(ideaSceneId):ideaArchive.find(entry=>entry.id===ideaArchiveView)?.turns;
 if(turns?.[index])speak(turns[index].en,turns[index].speaker===turns[0].speaker?0:1);
}
