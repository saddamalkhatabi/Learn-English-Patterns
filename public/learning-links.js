const linkedLearningTypes={
 photo:['scene-studio','الصورة ومفرداتها','Photo and vocabulary'],
 scene:['lab','تحدّث من المشهد','Speak from the scene'],
 journey:['scene-studio','تسلسل صور المحادثة','Conversation photo sequence'],
 dialogue:['dialogues','المحادثة','Conversation'],
 atlas:['vocabulary','أطلس المفردات','Vocabulary atlas'],
 'pattern-photos':['scene-studio','تطبيق النمط بالصور','Practise the pattern with photos'],
 lesson:['','درس النمط','Pattern lesson'],
 listen:['coach','الاستماع والتدريب','Listen and practise'],
 story:['stories','قصة قصيرة','Short story']
};

function openLinkedLearning(type,id='',options={}){
 const target=linkedLearningTypes[type];
 if(!target)return;
 const trigger=document.activeElement;
 stopSpeech({keepReferencePlayer:true});
 clearIdeaFlash();
 stopExpansionAudio();
 const dialog=document.createElement('dialog');
 dialog.className='linked-learning';
 dialog.setAttribute('aria-label',T(target[1],target[2]));
 dialog.innerHTML=`<div class="linked-learning-header"><h2>${T(target[1],target[2])}</h2>
  <form method="dialog"><button type="submit" class="secondary" autofocus>${T('العودة إلى موضعي','Back to where I was')}</button></form></div>`;
 const url=new URL('index.html',location.href);
 url.searchParams.set('linked',type);
 url.searchParams.set('id',id);
 for(const [key,value] of Object.entries(options))if(value!==undefined)url.searchParams.set(key,value);
 if(target[0])url.hash=target[0];
 const frame=document.createElement('iframe');
 frame.title=T(target[1],target[2]);
 frame.allow='autoplay; microphone; clipboard-write';
 frame.src=url.href;
 dialog.append(frame);
 document.body.append(dialog);
 dialog.addEventListener('close',()=>{
  dialog.remove();
  if(trigger?.isConnected)trigger.focus({preventScroll:true});
 },{once:true});
 dialog.showModal();
}

function returnFromLinkedLearning(){
 const dialog=window.frameElement?.closest('.linked-learning');
 if(dialog?.open)dialog.close();
}

const linkedParams=new URLSearchParams(location.search);
const linkedType=Object.hasOwn(linkedLearningTypes,linkedParams.get('linked'))?linkedParams.get('linked'):'';
if(linkedType&&window.frameElement){
 const id=linkedParams.get('id');
 const targetPage=linkedLearningTypes[linkedType][0];
 document.body.dataset.linkedLearning=linkedType;
 const renderLinkedContent=render;
 // Background requests from other tabs must leave the current photo, draft or player in place.
 render=function(){};
 $('#app').textContent=T('جارٍ تحميل التدريب…','Loading practice…');
 const showError=()=>{$('#app').textContent=T('تعذّر فتح المحتوى المرتبط.','The linked material could not be opened.')};
 const closeLinkedLesson=closeLesson;
 closeLesson=function(){
  closeLinkedLesson();
  if(linkedType==='lesson')returnFromLinkedLearning();
 };
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!event.defaultPrevented&&!$('dialog[open]')&&!$('.instant-vocabulary')){
   event.preventDefault();
   returnFromLinkedLearning();
  }
 });
 Promise.all([pilotReady,learningReady,learningLevelsReady,archiveReady,ideaLibraryReady,referenceDataReady,
  linkedType==='story'?supplementReady:null]).then(async()=>{
  const archive=linkedParams.get('archive');
  const revealArchive=()=>{
   if(!archive)return;
   ideaArchiveView=archive;
   paintIdeaArchive();
   const details=$('.idea-archive');
   if(details)details.open=true;
  };
  if(linkedParams.has('step')){
   sceneAssistantVisibility.set(id,true);
   sceneAssistantSteps.set(id,Number(linkedParams.get('step'))||0);
  }
  if(targetPage){page=targetPage;renderLinkedContent()}
  if(linkedType==='photo'){
   if(dialogueScene(id)||ideaLibrary?.scenes.some(scene=>scene.id===id)){
    await openSmartScene(id);
    return revealArchive();
   }
  }else if(linkedType==='scene'){
   if(ideaLibrary?.scenes.some(scene=>scene.id===id)){
    chooseIdeaScene(id,false);
    if(archive)setIdeaAction('roleplay');
    return revealArchive();
   }
  }else if(linkedType==='journey'){
   studioMode='journeys';
   renderLinkedContent();
   if(studioJourneyRows().some(row=>row.dialogue.id===id)){
    selectStudioJourney(id);
    return revealArchive();
   }
  }else if(linkedType==='dialogue'){
   const dialogue=PILOT?.dialogues.find(item=>item.id===id);
   if(dialogue){
    openDialogue(id,false,'dialogue-player',true);
    const host=$('#dialogue-player'),audio=host.querySelector('audio');
    const turn=Number(linkedParams.get('turn'));
    if(linkedParams.has('turn')&&dialogue.lines[turn]&&audio){
     const offset=dialogue.audio.turns[turn].start_ms/1000;
     audio.currentTime=offset;
     paintDialogue(host,dialogue,offset*1000);
    }
    return;
   }
  }else if(linkedType==='atlas'){
   const atlas=await loadVocabulary();
   if(atlas&&vocabularyById.has(id))return openVocabularyTerm(id,linkedParams.get('scene')||'');
  }else if(linkedType==='pattern-photos'){
   studioPattern=Number(id);
   studioNextLesson=Number(linkedParams.get('next'))||null;
   if(PILOT?.patterns.some(pattern=>pattern.id===studioPattern)){
    renderLinkedContent();
    const first=studioMatches()[0];
    if(first)await openSmartScene(first.item.id,false);
    return;
   }
  }else if(linkedType==='lesson'){
   if(PILOT?.patterns.some(pattern=>pattern.id===Number(id))){
    $('#app').replaceChildren();
    return openLesson(Number(id));
   }
  }else if(linkedType==='listen'){
   const purpose=linkedParams.has('purpose')?CURRICULUM?.routes.find(row=>row.id===id):null;
   const patternIds=purpose?.pattern_ids||(PILOT?.patterns.some(pattern=>pattern.id===Number(id))?[Number(id)]:[]);
   if(PILOT&&patternIds.length){
    route.configure({patternIds:orderLearningPatterns(patternIds),routeId:purpose?.id,mode:'listen',rate:state.rate});
    renderLinkedContent();
    return;
   }
  }else if(linkedType==='story'&&SUPPLEMENT)return;
  showError();
 }).catch(showError);
}
