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
const ideaChatModes=new Map();
function ideaRoleplayRoot(){return $('#studio-dialogue')||$('#idea-lab-task')}
function renderIdeaRoleplay(scene,withAI=true){
 return `<div class="idea-roleplay">
  <p>${T('اكتب حوارًا بين شخصين، أو أجب عن أسئلة تساعدك على بنائه. يمكنك حفظه وسماع أدواره.','Write both sides of a conversation, or answer prompts that help you build one. Save it and listen to its turns.')}</p>
  <div id="idea-guided-chat"></div>
  ${withAI?`<details class="scene-ai">
   <summary>${T('ابتكر حوارًا مع مساعدك واستورده','Create and import a dialogue with your AI assistant')}</summary>
   <p>${T('يمكنك مشاركة شاشة الصورة من تطبيق مساعدك والتحاور معه، أو نسخ الطلب إليه ثم لصق حواره هنا لحفظه.','Share this scene from your assistant’s screen-sharing feature, or copy the prompt and paste its dialogue here to save it.')}</p>
   <div class="buttonrow"><button class="secondary" onclick="showIdeaDialoguePrompt()">✦ ${T('جهّز طلب الحوار','Prepare dialogue prompt')}</button>
    <button class="secondary" data-copy-scene-ai onclick="copySceneAiPrompt(this)" hidden>${T('انسخ الطلب','Copy prompt')}</button></div>
   <textarea readonly hidden data-scene-ai-prompt aria-label="${T('طلب الحوار','Dialogue prompt')}" rows="6" dir="ltr" lang="en"></textarea>
   <p data-scene-ai-status role="status"></p>
   <form onsubmit="event.preventDefault();importIdeaDialogue()">
    <label>${T('رد المساعد','Assistant reply')}<textarea id="idea-dialogue-input" maxlength="30000" rows="5" dir="auto" placeholder="A: …&#10;B: …"></textarea></label>
    <button class="primary" type="submit">${T('استورد الحوار واحفظه','Import and save dialogue')}</button>
   </form>
  </details>`:''}
  <p id="idea-dialogue-status" role="status"></p>
  <details class="idea-archive idea-disclosure"><summary>${T('حواراتي المحفوظة','Saved dialogues')}</summary>
   <p>${T('يُحفظ الأرشيف في هذا المتصفح.','Your archive is saved in this browser.')}</p>
   <label>${T('اعرض حوارات','Show dialogues for')} <select onchange="ideaArchiveScope=this.value;paintIdeaArchive()">
    <option value="scene" ${ideaArchiveScope==='scene'?'selected':''}>${T('هذا المشهد','This scene')}</option>
    <option value="all" ${ideaArchiveScope==='all'?'selected':''}>${T('كل المشاهد','All scenes')}</option></select></label>
   <div id="idea-archive-list"></div><div id="idea-archive-view"></div>
  </details></div>`;
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
 const turns=ideaGuided.get(ideaPracticeKey(currentIdeaScene()));
 if(!turns){
  host.innerHTML=`<div class="idea-dialogue-choices"><div><b>${T('حوار من كتابتك','Write your own dialogue')}</b><p>${T('اكتب كلام المتحدث الأول ثم ردّ المتحدث الثاني.','Write the first speaker’s line, then the second speaker’s reply.')}</p><button class="primary" onclick="startIdeaCompose()">${T('ابدأ كتابة الحوار','Start writing')}</button></div>
   <div><b>${T('أسئلة تفتح الحديث','Prompts to get you talking')}</b><p>${T('تلقَّ سؤالًا وأجب عنه، ثم تابع الحوار خطوة بخطوة.','Answer a prompt, then develop the conversation one step at a time.')}</p><button class="secondary" onclick="startIdeaGuided()">${T('ابدأ بالأسئلة','Start with prompts')}</button></div></div>`;
  return;
 }
 if(ideaChatModes.get(ideaPracticeKey(currentIdeaScene()))==='compose'){
  host.innerHTML=ideaChatBubbles(turns,'guided')+`
   <form class="idea-compose" onsubmit="event.preventDefault();sendIdeaComposed()">
    <label>${T('المتحدث','Speaker')}<select id="idea-compose-speaker"><option value="A" ${turns.at(-1)?.speaker==='A'?'':'selected'}>A</option><option value="B" ${turns.at(-1)?.speaker==='A'?'selected':''}>B</option></select></label>
    <label>${T('الجملة بالإنجليزية','English line')}<input id="idea-compose-en" lang="en" dir="ltr" required maxlength="650"></label>
    <label>${T('الترجمة اختياريًا','Optional translation')}<input id="idea-compose-ar" lang="ar" dir="rtl" maxlength="650"></label>
    <button class="primary" ${turns.length>=40?'disabled':''}>${T('أضف الدور','Add turn')}</button>
   </form><div class="buttonrow"><button class="secondary" onclick="saveIdeaGuided()" ${turns.length<2||new Set(turns.map(turn=>turn.speaker)).size<2?'disabled':''}>${T('احفظ حواري','Save my dialogue')}</button>
    <button class="textlink" onclick="startIdeaCompose()">${T('حوار جديد','New dialogue')}</button></div>`;
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
 const [ar,en]=ideaPracticeTask(scene);
 ideaChatModes.set(ideaPracticeKey(scene),'guided');
 ideaGuided.set(ideaPracticeKey(scene),[{speaker:T('الشريك','Partner'),en,ar}]);
 paintIdeaGuided();
 $('#idea-guided-reply')?.focus();
}
function startIdeaCompose(){
 const key=ideaPracticeKey(currentIdeaScene());if(!key)return;
 ideaChatModes.set(key,'compose');ideaGuided.set(key,[]);paintIdeaGuided();$('#idea-compose-en')?.focus();
}
function sendIdeaComposed(){
 const turns=ideaGuided.get(ideaPracticeKey(currentIdeaScene())),en=$('#idea-compose-en')?.value.trim();
 if(!turns||!en||turns.length>=40)return;
 turns.push({speaker:$('#idea-compose-speaker').value,en,ar:$('#idea-compose-ar').value.trim()});
 paintIdeaGuided();$('#idea-compose-en')?.focus();
}
function sendIdeaGuided(){
 const scene=currentIdeaScene();
 const turns=ideaGuided.get(ideaPracticeKey(currentIdeaScene()));
 const input=$('#idea-guided-reply'),en=input?.value.trim();
 if(!scene||!turns||!en||turns.length>=8)return;
 const next=[
  `Choose one visible detail, such as “${scene.words[0]?.en||'something in the scene'}”. How would you use it in your next reply?`,
  ideaFollowups[scene.topic]||'How would you answer if the situation changed?',
  'How would you close this conversation politely?'
 ][(turns.length-1)/2];
 turns.push({speaker:T('أنت','You'),en,ar:'',user:true});
 if(next)turns.push({speaker:T('الشريك','Partner'),en:next,ar:''});
 paintIdeaGuided();
 $('#idea-guided-reply')?.focus();
}
function showIdeaDialoguePrompt(){
 const scene=currentIdeaScene(),box=ideaRoleplayRoot()?.querySelector('[data-scene-ai-prompt]');
 if(!scene||!box)return;
 const examples=(scene.patterns||[]).filter(pattern=>pattern.en).map(pattern=>pattern.en);
 box.value=`Write a practical English role-play for an Arabic-speaking A2 learner.
Scene: ${scene.sentenceEn}
Task: ${ideaPracticeTask(scene)[1]}
Useful vocabulary: ${scene.words.map(word=>word.en).join(', ')}.
Optional example lines: ${examples.join(' / ')||scene.sentenceEn}
Write 6 to 10 turns between two distinct named speakers. Include a follow-up question and one practical decision. Add a natural Arabic translation to each turn. Output only valid JSON using this exact structure:
{"title":"Short title","turns":[{"speaker":"A","en":"English turn","ar":"الترجمة العربية"},{"speaker":"B","en":"English reply","ar":"الترجمة العربية"}]}`;
 box.hidden=false;
 ideaRoleplayRoot().querySelector('[data-copy-scene-ai]').hidden=false;
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
 $('.idea-archive').open=true;
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
 const turns=ideaGuided.get(ideaPracticeKey(currentIdeaScene()));
 if(turns?.length>=2&&new Set(turns.map(turn=>turn.speaker)).size>=2)
  archiveIdeaDialogue({turns},ideaChatModes.get(ideaPracticeKey(currentIdeaScene()))==='compose'?'written':'guided');
}
function paintIdeaArchive(){
 const list=$('#idea-archive-list'),view=$('#idea-archive-view');
 if(!list||!view)return;
 const currentId=currentIdeaScene()?.id;
 const rows=ideaArchive.filter(entry=>ideaArchiveScope==='all'||entry.sceneId===currentId);
 list.innerHTML=rows.length?`<ul>${rows.map(entry=>`<li><button class="textlink" data-archive-id="${H(entry.id)}" onclick="openIdeaArchivedDialogue(this.dataset.archiveId)">${H(entry.title)} ↗</button>
 <small>${entry.source==='written'?T('من كتابتي','Written'):entry.source==='guided'?T('موجّه','Guided'):T('مستورَد','Imported')} · ${entry.turns.length} ${T('أدوار','turns')}</small></li>`).join('')}</ul>`:
  `<p>${T('لا توجد حوارات محفوظة هنا بعد.','No dialogues saved here yet.')}</p>`;
 const entry=rows.find(row=>row.id===ideaArchiveView);
 view.innerHTML=entry?`<h4 dir="auto" tabindex="-1">${H(entry.title)}</h4>${ideaChatBubbles(entry.turns,'archive')}
  <div class="buttonrow"><button class="secondary" onclick="ideaArchiveView=null;paintIdeaArchive()">${T('أغلق النص','Close transcript')}</button>
  ${entry.sceneId!==currentId?`<button class="secondary" onclick="openIdeaArchiveScene()">${T('افتح المشهد المرتبط','Open linked scene')}</button>`:''}
  <button class="textlink" onclick="removeIdeaArchivedDialogue()">${T('احذف من أرشيفي','Remove from my archive')}</button></div>`:'';
}
function openIdeaArchivedDialogue(id){ideaArchiveView=id;paintIdeaArchive()}
async function openIdeaArchiveScene(){
 const id=ideaArchiveView;
 const entry=ideaArchive.find(row=>row.id===id);
 if(entry?.sceneId.startsWith('studio:')){
  await openSmartSentence(entry.sceneId.slice(7));ideaArchiveView=id;paintIdeaArchive();
  const details=$('.idea-archive');if(details)details.open=true;
  return;
 }
 if(!entry||!ideaLibrary?.scenes.some(scene=>scene.id===entry.sceneId))return;
 chooseIdeaScene(entry.sceneId);
 setIdeaAction('roleplay');
 ideaArchiveView=id;
 paintIdeaArchive();
 $('.idea-archive').open=true;
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
 const turns=kind==='guided'?ideaGuided.get(ideaPracticeKey(currentIdeaScene())):ideaArchive.find(entry=>entry.id===ideaArchiveView)?.turns;
 if(turns?.[index])speak(turns[index].en,turns[index].speaker===turns[0].speaker?0:1);
}
