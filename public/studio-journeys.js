const savedJourneyFilters=EPFilters.read('studio-journeys',{query:'',level:''});
let studioJourneyId='',studioJourneyQuery=savedJourneyFilters.query,studioJourneyLevel=savedJourneyFilters.level,studioJourneyPage=0;
let studioJourneyIndex=null;
const studioJourneySelections=new Map();

function studioJourneysPage(){
 return `<section class="scene-detail" id="studio-journey-active" hidden></section>
  <section class="scene-gallery" id="studio-journey-gallery">
  <div class="toolbar studio-journey-filters">
  <label>${T('ابحث عن محادثة أو مفردة من صورها','Find a conversation or a word from its photos')}
   <input type="search" id="studio-journey-query" value="${H(studioJourneyQuery)}" oninput="filterStudioJourneys(this.value,studioJourneyLevel)"></label>
  <label>${T('مستوى المحادثة','Conversation level')}<select id="studio-journey-level" onchange="filterStudioJourneys(studioJourneyQuery,this.value)">
   ${learningLevelOptions(studioJourneyLevel)}
  </select></label></div>
  <p id="studio-journey-count" role="status"></p>
  <div id="studio-journey-results" class="scene-studio-grid"></div>
  <div class="buttonrow"><button type="button" class="secondary" id="studio-journey-prev" onclick="studioJourneyPage--;paintStudioJourneys()">${T('السابق','Previous')}</button>
   <button type="button" class="secondary" id="studio-journey-next" onclick="studioJourneyPage++;paintStudioJourneys()">${T('التالي','Next')}</button></div></section>`;
}
function studioJourneyRows(){
 const dialogues=PILOT?.dialogues;
 if(!dialogues||!ideaLibrary)return [];
 if(studioJourneyIndex?.dialogues===dialogues&&studioJourneyIndex.library===ideaLibrary&&
  studioJourneyIndex.lifecycles===dialogueLifecycles&&studioJourneyIndex.sequence===learningLevels)
  return studioJourneyIndex.rows;
 const library=new Map(ideaLibrary.scenes.map(scene=>[scene.id,scene]));
 const order=new Map(learningLevels.dialogueOrder.map((id,index)=>[id,index]));
 const rows=dialogues.flatMap(dialogue=>{
  const life=dialogueLifecycles[dialogue.id],entry=dialogueSceneArchive[dialogue.id];
  if(!life||!entry)return [];
  const stages=life.stages.map(stage=>({...stage,scene:library.get(entry.turns[stage.from]?.id)}));
  if(stages.some(stage=>!stage.scene))return [];
  const search=normalizeSceneQuery([dialogue.id,dialogue.en,dialogue.ar,life.goalEn,life.goalAr,
   ...stages.flatMap(({scene,en,ar})=>[en,ar,...scene.words.flatMap(word=>[word.en,word.ar])])].join(' '));
  return [{dialogue,life,stages,search,level:learningLevels.dialogues[dialogue.id]}];
 }).sort((a,b)=>(order.get(a.dialogue.id)??Infinity)-(order.get(b.dialogue.id)??Infinity));
 studioJourneyIndex={dialogues,library:ideaLibrary,lifecycles:dialogueLifecycles,sequence:learningLevels,rows};
 return rows;
}
function filterStudioJourneys(query,level){
 studioJourneyQuery=query;studioJourneyLevel=level;studioJourneyPage=0;
 paintStudioJourneys();
}
function paintStudioJourneys(){
 const host=$('#studio-journey-results');
 if(!host)return;
 const values={query:studioJourneyQuery,level:studioJourneyLevel};
 if(!document.body.dataset.linkedLearning)EPFilters.save('studio-journeys',values);
 EPFilters.show($('.studio-journey-filters'),values,()=>{
  $('#studio-journey-query').value=$('#studio-journey-level').value='';
  filterStudioJourneys('','');
  $('#studio-journey-query').focus({preventScroll:true});
 });
 const index=studioJourneyRows();
 const terms=normalizeSceneQuery(studioJourneyQuery).trim().split(/\s+/).filter(Boolean);
 const matches=index.filter(row=>(!studioJourneyLevel||studioJourneyLevel===String(row.level))&&terms.every(term=>row.search.includes(term)));
 const size=16,pages=Math.max(1,Math.ceil(matches.length/size));
 studioJourneyPage=Math.max(0,Math.min(studioJourneyPage,pages-1));
 $('#studio-journey-count').textContent=index.length?
  T(`${matches.length} محادثة · صفحة ${studioJourneyPage+1} من ${pages}`,`${matches.length} conversations · Page ${studioJourneyPage+1} of ${pages}`):
  T('جارٍ تحميل مشاهد المحادثات…','Loading conversation scenes…');
 $('#studio-journey-prev').disabled=studioJourneyPage===0;
 $('#studio-journey-next').disabled=studioJourneyPage+1>=pages;
 host.innerHTML=matches.slice(studioJourneyPage*size,(studioJourneyPage+1)*size).map(({dialogue,stages,level})=>
  sceneGalleryCard(dialogue.id,studioJourneyPhoto(stages[0].scene,1),T(dialogue.ar,dialogue.en),
   learningLevelLabel(level)+' · '+T(`${stages.length} لقطات`,`${stages.length} photos`),'selectStudioJourney')
 ).join('');
 const selected=index.find(row=>row.dialogue.id===studioJourneyId);
 if(selected&&!$('#studio-journey-active').firstElementChild)paintStudioJourney(selected);
}
function selectStudioJourney(id){
 const selected=studioJourneyRows().find(row=>row.dialogue.id===id);
 if(!selected)return;
 stopSpeech();
 studioJourneyId=id;
 paintStudioJourney(selected);
 const host=$('#studio-journey-active');
 host.querySelector('h2').focus({preventScroll:true});
 host.scrollIntoView({block:'start'});
}
function backToStudioJourneys(){
 const host=$('#studio-journey-active');
 delete host.dataset.dialogue;
 returnToSceneGallery($('#studio-journey-gallery'),host,studioJourneyId);
 studioJourneyId='';
 studioWordScene=null;
}
function studioJourneySelection(id){
 if(!studioJourneySelections.has(id))studioJourneySelections.set(id,new Set());
 return studioJourneySelections.get(id);
}
function studioJourneyPrompts(stages,selection){
 const details=stages.map(({scene},stage)=>scene.words.find((word,index)=>selection.has(stage+':'+index))).filter(Boolean);
 if(details.length<2)return [
  ['انظر إلى أول لقطتين. ماذا يريد أحد الشخصين، وما التفصيل المرئي الذي جعلك تعتقد ذلك؟','Look at the first two photos. What does one person want, and which visible detail makes you think so?'],
  ['ما الذي تغيّر بين اللقطتين؟ عبّر عنه في سؤال أو رد.','What changed between the two photos? Turn it into a question or a reply.'],
  ['افترض أن أحد الشخصين غيّر قراره في اللقطة الأخيرة. كيف سيردّ الآخر؟','Suppose one person changes their mind in the last photo. How would the other person respond?']
 ];
 const [first,second]=details,last=details.at(-1);
 return [
  [`ابدأ حوارًا يرتبط بـ«${first.ar}». ماذا يمكن أن يسأل أحد الشخصين؟`,`Start a dialogue using “${first.en}”. What might one person ask?`],
  [`انقل الحوار إلى اللقطة التي اخترت منها «${second.ar}». كيف يمكن أن يردّ الشخص الآخر؟`,`Move to the photo where you chose “${second.en}”. How might the other person reply?`],
  [`افترض أن التفصيل «${last.ar}» قد تغيّر. كيف ستعدّل السؤال أو الرد؟`,`Suppose “${last.en}” changes. How would you adapt the question or reply?`]
 ];
}
function setStudioJourneyDetail(stage,index,checked){
 const row=studioJourneyRows().find(row=>row.dialogue.id===studioJourneyId);
 if(!row?.stages[stage]?.scene.words[index])return;
 const selected=studioJourneySelection(studioJourneyId),key=stage+':'+index;
 if(checked)selected.add(key);else selected.delete(key);
 updateStudioJourneyPractice(row);
}
function updateStudioJourneyPractice(row){
 const {dialogue,stages,level}=row;
 const selection=studioJourneySelection(dialogue.id),prompts=studioJourneyPrompts(stages,selection);
 studioWordScene={id:'journey:'+dialogue.id,ar:dialogue.ar,en:dialogue.en,topic:'conversation',
  taskAr:prompts[0][0],taskEn:prompts[0][1],practiceFollowups:prompts.slice(1),journey:row,learningLevel:level};
 const count=new Set([...selection].map(key=>key.split(':')[0])).size;
 const words=stages.flatMap(({scene},stage)=>scene.words.filter((_,index)=>selection.has(stage+':'+index)));
 $('#studio-journey-selection').textContent=count>=2?
  T(`اخترت تفاصيل من ${count} لقطات. استخدمها في محاولتك.`,`You chose details from ${count} photos. Use them in your dialogue.`):
  T('اختر مفردة تحت لقطتين مختلفتين لتخصيص الأسئلة.','Choose a word under two different photos to personalize the prompts.');
 $('#studio-journey-chosen').textContent=words.map(word=>englishDisplay(word.en,word)).join(' · ');
 const coach=$('#studio-journey-coach');
 if(!coach.firstElementChild)coach.innerHTML=sceneAssistantButton(studioWordScene)+sceneAssistantPanel(studioWordScene);
 else if(sceneAssistantIsOpen(studioWordScene)){stopSceneAssistantAudio();refreshSceneAssistant(studioWordScene)}
}
function paintStudioJourney(row){
 const host=$('#studio-journey-active');
 if(!host)return;
 const {dialogue,life,stages}=row,selection=studioJourneySelection(dialogue.id);
 host.dataset.dialogue=dialogue.id;
 $('#studio-journey-gallery').hidden=true;
 host.hidden=false;
 host.innerHTML=sceneGalleryReturnButton('backToStudioJourneys',T('العودة إلى مشاهد المحادثات','Back to conversation scenes'))+`<article class="panel studio-journey-workspace">
  <h2 id="studio-journey-title" tabindex="-1">${H(T(dialogue.ar,dialogue.en))}</h2>
  <p>${T('تأمّل الصور بالترتيب. ماذا تغيّر من لقطة إلى أخرى؟ حاول تخيّل ما قاله الشخصان قبل كشف الحوار.',
   'Look at the photos in order. What changes from one to the next? Imagine what the speakers said before revealing the dialogue.')}</p>
  <ol class="studio-journey-frames">${stages.map((stage,index)=>studioJourneyFrame(stage,index,selection)).join('')}</ol>
  <section id="studio-journey-coach"></section>
  <section class="studio-journey-practice">
   <h3>${T('ابتكر حوارك','Write your own dialogue')}</h3>
   <p id="studio-journey-selection" role="status"></p>
   <p id="studio-journey-chosen" lang="en" dir="ltr"></p>
   <div id="studio-dialogue"></div>
  </section>
  <details id="studio-journey-original" class="idea-disclosure" ontoggle="if(!this.open)studioAudio?.pause()">
   <summary>${T('اكشف الحوار الأصلي وقارن محاولتك','Reveal the original and compare your dialogue')}</summary>
   ${EP.pair(life.goalAr,life.goalEn)}
   <p>${T('قارن كيف بدأ الحوار، وكيف انتقل إلى الطلب أو القرار، وبأي عبارة انتهى.',
    'Compare how each dialogue starts, reaches a request or decision, and ends.')}</p>
   ${stages.map(stage=>studioJourneyTranscript(dialogue,stage)).join('')}
   <div class="buttonrow"><button type="button" class="secondary" onclick="openStudioJourneyOriginal('${H(dialogue.id)}')">${T('افتح المحادثة في مشغّلها','Open the conversation player')} ↗</button></div>
  </details></article>`;
 updateStudioJourneyPractice(row);
 $('#studio-dialogue').innerHTML=renderIdeaRoleplay(studioWordScene,false);
 paintIdeaGuided();paintIdeaArchive();
 loadVocabulary().then(data=>{
  if(data&&host.isConnected&&host.dataset.dialogue===dialogue.id){
   paintStudioJourneyVocabulary(row);
   if(sceneAssistantIsOpen(studioWordScene)&&!sceneAssistantAudio)refreshSceneAssistant(studioWordScene);
  }
 });
}
function studioJourneyPhoto(scene,number){
 const visible=scene.words.filter(word=>word.kind==='object').map(word=>T(word.ar,word.en));
 const alt=visible.length?visible.join(T('، ', ', ')):T(`اللقطة ${number}`,`Photo ${number}`);
 return `<img src="${H(scene.path)}" width="${scene.width}" height="${scene.height}" loading="lazy" alt="${H(alt)}">`;
}
function studioJourneyFrame({scene,from,to,ar,en,purposeAr,purposeEn},index,selection){
 const number=index+1;
 return `<li><figure>
  ${studioJourneyPhoto(scene,number)}
  <figcaption><b>${T(`اللقطة ${number}`,`Photo ${number}`)}</b>
   <details class="idea-disclosure"><summary>${T('شرح اللقطة ومفرداتها','Scene meaning and vocabulary')}</summary>
    <strong>${H(T(ar,en))}</strong>
    ${EP.pair(purposeAr,purposeEn)}
    <p><small>${T('الأدوار','Turns')} <bdi>${from===to?from:from+'–'+to}</bdi></small></p>
    <ul class="studio-journey-labels">${scene.words.map((word,wordIndex)=>`<li>
     <label><input type="checkbox" ${selection.has(index+':'+wordIndex)?'checked':''} onchange="setStudioJourneyDetail(${index},${wordIndex},this.checked)">
      <span><b lang="en" dir="ltr">${H(englishDisplay(word.en,word))}</b> ${wordTypeBadge(word)}<span class="ar-content" lang="ar" dir="rtl">${H(word.ar)}</span></span></label>
     <span data-studio-label-term="${index}:${wordIndex}"></span></li>`).join('')}</ul>
    <button type="button" class="textlink" onclick="openLinkedLearning('photo','${H(scene.id)}')">${T('افتح الصورة واستمع إلى مفرداتها','Open the photo and hear its vocabulary')} ↗</button>
   </details>
  </figcaption></figure></li>`;
}
function studioJourneyTranscript(dialogue,stage){
 const {from,to}=stage;
 return `<section class="studio-journey-transcript">
  <div class="buttonrow"><h4>${H(T(stage.ar,stage.en))}</h4>
   ${dialogue.audio?`<button type="button" class="secondary" onclick="hearStudioJourney(${from-1},${to-1})">▶ ${T('استمع إلى هذه المرحلة','Hear this stage')}</button>`:''}</div>
  ${dialogue.lines.slice(from-1,to).map((line,index)=>`<div data-studio-dialogue-turn="${from-1+index}"><b>${from+index} · ${line.voice==='male'?T('عمر','Omar'):T('سارة','Sara')}</b>
   <p lang="en" dir="ltr">${dialogueWords(line)}</p>${EP.ar(line.ar)}</div>`).join('')}
  ${stage.scene.patterns.length?`<div class="buttonrow">${dialoguePatterns(stage.scene.patterns.map(pattern=>pattern.id))}</div>`:''}
  <div data-studio-transcript-terms="${from}"></div></section>`;
}
function paintStudioJourneyVocabulary({dialogue,stages}){
 const byTurn=new Map();
 for(const entry of vocabularyData.entries){
  if(!entry.ar||!['VERB','AUX','CONTR','PHRASE'].includes(entry.pos))continue;
  for(const sourceId of entry.sourceIds){
   const source=vocabularyData.sources[sourceId];
   if(source.type!=='dialogue'||source.id!==dialogue.id)continue;
   if(!byTurn.has(source.turn))byTurn.set(source.turn,[]);
   byTurn.get(source.turn).push(entry);
  }
 }
 stages.forEach(({from,to,scene},index)=>{
  scene.words.forEach((word,wordIndex)=>{
   const entry=vocabularyEntryFor(word);
   const link=$(`[data-studio-label-term="${index}:${wordIndex}"]`);
   if(entry&&link)link.innerHTML=`<button type="button" class="textlink" onclick="openVocabularyFromScene('${entry.id}','${H(scene.id)}')" aria-label="${H(T('افتح في الأطلس','Open in atlas')+' · '+word.en)}">${T('الأطلس','Atlas')} ↗</button>`;
  });
  const entries=[...new Set(Array.from({length:to-from+1},(_,offset)=>byTurn.get(from-1+offset)||[]).flat())];
  const host=$(`[data-studio-transcript-terms="${from}"]`);
  if(!entries.length||!host)return;
  host.innerHTML=`<details class="idea-disclosure"><summary>${T('الأفعال والتراكيب والعبارات في هذه الأدوار','Verbs, structures and phrases in these turns')}</summary>
   <ul class="studio-journey-terms">${entries.map(entry=>`<li><button type="button" class="textlink" lang="en" dir="ltr"
    onclick="openVocabularyFromScene('${entry.id}')">${H(vocabularyEntryName(entry))} ↗</button> ${wordTypeBadge(entry)}${EP.ar(entry.ar)}</li>`).join('')}</ul></details>`;
 });
}
function hearStudioJourney(from,to){
 const dialogue=PILOT?.dialogues.find(row=>row.id===studioJourneyId);
 playStudioDialogueRange(dialogue,from,to,$('#studio-journey-original'),true);
}
function openStudioJourneyOriginal(id){
 return openLinkedLearning('dialogue',id);
}
