let songSearchRows=[];
const songFilterKey='song-library';
const defaultSongFilters={collection:'',level:'',query:''};
const songStudyModes=[
 ['song','الأغنية مباشرة','Song only'],
 ['sentences','الجمل ثم الأغنية','Sentences, then the song'],
 ['purposes','الغرض والجملة ثم الأغنية','Purpose and sentence, then the song']
];
const songCatalogReady=epFetchJSON('song-library.json').catch(()=>null);
const referenceSongCatalogReady=epFetchJSON('reference-song-library.json').catch(()=>null);
Promise.all([songCatalogReady,referenceSongCatalogReady]).then(([foundation,references])=>{
 songSearchRows=[...(foundation||[]),...(references||[])];
});
function filterSongsByTitle(title,collection='foundation'){
 if(page==='songs')renderSongLibrary.filter({collection,level:'',query:title});
}
function paintReferenceSongButton(button){
 button.textContent=button.getAttribute('aria-expanded')==='true'?
  T('إغلاق مشغّل الأغاني','Close song player'):
  T('▶ تشغيل أغاني الأنماط بالتسلسل','▶ Play pattern songs in order');
}
function toggleReferenceSongs(button){
 const host=document.getElementById(button.getAttribute('aria-controls'));
 if(host.hidden){
  host.hidden=false;
  button.setAttribute('aria-expanded','true');
  renderSongLibrary(host);
  renderSongLibrary.start(host);
 }else{
  renderSongLibrary.close(host);
  host.hidden=true;
  button.setAttribute('aria-expanded','false');
 }
 paintReferenceSongButton(button);
}
const renderSongLibrary=(()=>{
 let tracks, visibleTracks=[], filters, lyrics, timings={}, extras={}, recovery={}, practice={}, study={}, selected, root, audio, language, host;
 let loading=false, loadFailed=false, playbackFailed=false, pendingStart=false;
 let sequence='off', studyMode='song', prelude=null;
 function playlistKey({collection,level,query}=filters){
  const search=normalizeSearchTerm(query);
  const key=level||search?'patterns-song-playlist-filter:'+JSON.stringify([collection,level,search]):
   collection==='foundation'?'patterns-song-playlist':
   collection==='reference'?'patterns-song-playlist-reference':'patterns-song-playlist-combined';
  return studyMode==='song'?key:key+':'+studyMode;
 }
 let checkpoint,attempt,bufferTimer;
 let timeline=[],sceneCues=[],focusLines=[],songTranslations={},shownCue,activeCue,activeScene,activeLine,activeWord,focusedWord,lyricFrame;
 let studyLine,studyWord,studyWords=[];
 let practiceTrack, practiceWindows=[], practiceModels, practicePictures, shownPractice, dismissedPractice, manualPractice=false, practiceListChoice;
 let endReviewTimer=null;
 const patternKey=pattern=>String(pattern.referenceId??pattern.id);
 function patternForScene(scene,index){
  const identity=scene.referenceId??scene.patternId;
  return identity==null?selected.patterns[index]:selected.patterns.find(pattern=>patternKey(pattern)===String(identity));
 }
 let preloadedScenes=new Set();
 const stopOtherAudio=stopSpeech;
 stopSpeech=function(options){
  pauseSongPlayer();
  stopOtherAudio(options);
 };

 function timeLabel(seconds){
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 }

 function paintPlaybackStatus(){
  const status=root.querySelector('.song-playback-status');
  status.textContent=playbackFailed?(sequence==='paused'?
   T('توقف تشغيل القائمة. يمكنك الاستكمال من موضع التوقف.','The playlist stopped. You can continue where it left off.'):
   prelude?T('تعذّر تشغيل التسجيل. حاول مجددًا أو انتقل إلى الأغنية.','The recording could not play. Retry or skip to the song.'):
   T('تعذّر تشغيل الأغنية. اختر عنوانها للمحاولة من جديد.','Could not play the song. Choose its title to retry.')):'';
  const playAll=root.querySelector('[data-songs-play-all]');
  playAll.disabled=!visibleTracks.length;
  playAll.textContent=sequence==='playing'?
   T('إيقاف القائمة','Stop playlist'):hasSongFilters()?
   T('▶ تشغيل نتائج الفلترة','▶ Play filtered songs'):T('▶ تشغيل كل الأغاني','▶ Play all songs');
  const savedTrack=visibleTracks.find(track=>track.id===checkpoint?.id);
  const resume=root.querySelector('[data-songs-resume]');
  resume.hidden=!savedTrack||sequence==='playing'&&!audio.paused;
  if(savedTrack)resume.textContent=T(`استكمال القائمة · ${savedTrack.title}`,`Resume playlist · ${savedTrack.title}`);
  const position=visibleTracks.indexOf(selected)+1, total=visibleTracks.length;
  root.querySelector('.song-queue-status').textContent=sequence==='playing'?
   T(`الأغنية ${position} من ${total}`,`Song ${position} of ${total}`):
   sequence==='finished'?T('اكتمل تشغيل القائمة.','The playlist has finished.'):'';
 }

 function lyricLine(line,highlights=[],words=[]){
  if(/^\[(Verse \d+|Chorus)\]$/.test(line))return `<span class="song-verse">${H(line)}</span>`;
  const segment=(from,to)=>{
   let cursor=from,html='';
   for(const [word,[start,stop]] of words.entries()){
    if(start<from||stop>to)continue;
    html+=H(line.slice(cursor,start))+`<span data-song-word="${word}">${H(line.slice(start,stop))}</span>`;
    cursor=stop;
   }
   return html+H(line.slice(cursor,to));
  };
  let end=0,marked='';
  for(const [start,stop] of highlights){
   marked+=segment(end,start)+`<strong class="pattern-token">${segment(start,stop)}</strong>`;
   end=stop;
  }
  return marked+segment(end,line.length);
 }

 function prepareSongPractice(scenes,lines,highlights){
  if(practiceTrack!==selected){
   practiceTrack=selected;
   manualPractice=false;
   dismissedPractice=null;
   practiceListChoice=undefined;
  }
  shownPractice=undefined;
  const trackTiming=timings[selected.id];
  const guided=practice[selected.id];
  practiceWindows=guided&&guided.sha256===trackTiming?.sha256?guided.windows:[];
  practicePictures=EPSongFollow.studyPictures(lyrics[selected.id].scenes||[],extras[selected.id]?.examples||[],selected.patterns);
  const byLine=new Map(timeline.map(cue=>[cue.line,cue]));
  practiceModels=new Map();
  for(const [index,scene] of scenes.entries()){
   const pattern=patternForScene(scene,index);
   const cue=byLine.get(scene.line);
   if(!pattern||cue?.approximate||practiceModels.has(patternKey(pattern)))continue;
   const line=lines[scene.line],fixed=highlights[scene.line];
   practiceModels.set(patternKey(pattern),{scene,time:cue?.start_ms,line,highlights:fixed,text:lyricLine(line,fixed)});
  }
  for(const extra of extras[selected.id]?.examples||[]){
   const pattern=selected.patterns.find(item=>item.referenceId===extra.referenceId);
   if(pattern&&!practiceModels.has(extra.referenceId)){
    practiceModels.set(extra.referenceId,{scene:extra,line:pattern.en,highlights:extra.highlights,text:lyricLine(pattern.en,extra.highlights)});
   }
  }
  root.querySelector('#song-practice-examples').innerHTML=selected.patterns.map(pattern=>
   `<li>${practiceExample(pattern,true)}</li>`).join('');
 }

 function practiceExample(pattern,replay=false){
  const model=practiceModels.get(patternKey(pattern));
  const picture=songExamplePicture(pattern,practicePictures.get(patternKey(pattern)));
  return `<div class="song-practice-example${picture?' has-picture':''}">
   ${picture}
   <div class="song-practice-copy"><div class="song-practice-phrase" lang="en" dir="ltr">${model?.text??H(pattern.en)}</div>
   ${EP.prefs.arabic?`<p class="song-practice-translation" lang="ar" dir="rtl">${H(pattern.ar)}</p>`:''}
   ${replay&&model?.time!=null?`<button type="button" class="textlink" data-song-practice-model="${model.time}">${T('▶ اسمعها في الأغنية','▶ Hear it in the song')}</button>`:''}</div></div>`;
 }

 function songExamplePicture(pattern,scene,loading='lazy'){
  const picture=scene?.photo?
   `<img loading="${loading}" src="${H(scene.photo)}" alt="${H(T(pattern.ar,pattern.en))}">`:
   pilotScene({...pattern,image:scene?.image,context:scene?.context});
  return picture?`<figure class="song-practice-picture">${picture}</figure>`:'';
 }

 function activeSongPractice(time=audio.currentTime*1000){
  if(audio.ended)return EPSongFollow.reviewPractice;
  const duration=Number.isFinite(audio.duration)?audio.duration:selected.duration;
  return EPSongFollow.practiceAt(practiceWindows,time,duration*1000,false,timeline.at(-1)?.end_ms);
 }

 function paintPracticeList(){
  const button=root.querySelector('[data-song-practice-list]');
  const list=root.querySelector('#song-practice-examples');
  const expanded=practiceListChoice??(shownPractice?.kind==='review');
  list.hidden=!expanded;
  button.setAttribute('aria-expanded',String(expanded));
  button.textContent=expanded?T('إخفاء قائمة الجمل','Hide sentence list'):
   T(`كل جمل الأغنية (${selected.patterns.length})`,`All song sentences (${selected.patterns.length})`);
 }

 function paintPracticeTransport(){
  const button=root.querySelector('[data-song-practice-pause]');
  button.hidden=!shownPractice||audio.ended||(audio.paused&&audio.currentTime===0);
  button.textContent=audio.paused?T('تابع الأغنية','Continue song'):T('وقفة للترديد','Pause to practise');
  root.querySelector('[data-song-next]').hidden=endReviewTimer===null;
 }

 function paintSongPractice(time){
  const automatic=activeSongPractice(time);
  if(dismissedPractice!==automatic)dismissedPractice=null;
  const step=(automatic!==dismissedPractice?automatic:null)||(manualPractice?EPSongFollow.reviewPractice:null);
  if(step===shownPractice)return;
  if(step===EPSongFollow.reviewPractice)practiceListChoice=undefined;
  shownPractice=step;
  const panel=root.querySelector('#song-practice');
  const button=root.querySelector('[data-song-practice-toggle]');
  if(!step&&panel.contains(document.activeElement))button.focus({preventScroll:true});
  panel.hidden=!step;
  button.setAttribute('aria-expanded',String(Boolean(step)));
  button.textContent=step?T('إخفاء الممارسة','Hide practice'):T('تدرّب على الجمل','Practise the sentences');
  if(!step)return;
  panel.dataset.phase=step.kind;
  const targets=step.targets?.map(id=>selected.patterns.find(pattern=>patternKey(pattern)===id)).filter(Boolean)||[];
  const heading=panel.querySelector('#song-practice-title');
  const prompt=panel.querySelector('.song-practice-prompt');
  if(step.kind==='repeat'){
   heading.textContent=targets.length>1?T('دورك · ردّد الجمل','Your turn · Repeat the sentences'):T('دورك · ردّد الجملة','Your turn · Repeat the sentence');
   prompt.innerHTML=targets.map(pattern=>practiceExample(pattern)).join('');
  }else if(step.kind==='transfer'){
   heading.textContent=T('دورك · كوّن جملة','Your turn · Make a sentence');
   prompt.innerHTML=`<p class="song-practice-direction">${H(T(step.promptAr,step.promptEn))}</p>
    ${step.starter?`<div class="song-practice-phrase" lang="en" dir="ltr">${H(step.starter)}</div>`:''}
    ${targets.map(pattern=>practiceExample(pattern)).join('')}`;
  }else{
   heading.textContent=T('مراجعة جمل الأغنية','Review the song sentences');
   prompt.innerHTML=`<p class="song-practice-direction">${T('قل الجمل بصوتك، ثم جرّب تغيير كلمة في إحداها.','Say the sentences aloud, then try changing one word in an example.')}</p>`;
  }
  paintPracticeList();
  paintPracticeTransport();
 }

 function prepareSongStage(){
  const track=timings[selected.id];
  const reference=selected.collection==='reference';
  const estimatesEnabled=EP.prefs.songEstimates!==false;
  const base=reference?EPSongFollow.withEstimatedExamples(
   lyrics[selected.id],track,estimatesEnabled?extras[selected.id]:null,selected.patterns):lyrics[selected.id];
  const duration=selected.duration*1000;
  const content=EPSongFollow.withVocalRecovery(base,track,recovery[selected.id],extras[selected.id]?.examples||[],
   selected.patterns,{reference,duration,estimates:estimatesEnabled});
  const {text,highlights,scenes=[],translations={}}=content;
  const lines=text.split('\n');
  timeline=EPSongFollow.followLyrics(lines,content.lines||track?.lines||[],duration,
   {measuredOnly:reference||content.recordedOrder||!estimatesEnabled});
  songTranslations=translations;
  const byLine=new Map(timeline.map(cue=>[cue.line,cue]));
  focusLines=lines.map((line,index)=>lyricLine(line,highlights[index],byLine.get(index)?.words));
  sceneCues=scenes.flatMap((scene,index)=>{
   const purpose=byLine.get(scene.purposeLine),example=byLine.get(scene.line);
   if(!purpose&&!example)return [];
   const pattern=patternForScene(scene,index);
   return pattern?[{...scene,pattern,start:(purpose||example).start_ms,end:(example||purpose).end_ms,
    approximate:Boolean(example?.approximate)}]:[];
  });
  const panel=root.querySelector('.song-lyrics-text');
  const unplaced=new Set(content.unplaced);
  panel.innerHTML=focusLines.map((line,index)=>line?`<div class="song-transcript-row">
   <span class="song-lyric-line" data-song-line="${index}" lang="en" dir="ltr">${line}</span>
   ${byLine.get(index)?.approximate?`<small class="song-transcript-estimate">${T('توقيت تقديري','Estimated timing')}</small>`:
    unplaced.has(index)?`<small class="song-transcript-estimate">${T('في النص المكتوب · توقيته غير مؤكّد','From the script · Timing unconfirmed')}</small>`:''}
   ${EP.prefs.arabic&&translations[index]?`<small class="song-translation" lang="ar" dir="rtl">${H(translations[index])}</small>`:''}
  </div>`:'').join('');
  panel.scrollTop=0;
  root.querySelector('.song-sync-label').hidden=!track?.lines.length;
  const coverage=root.querySelector('.song-sync-coverage');
  const needsReview=reference&&new Set(scenes.map(scene=>scene.referenceId)).size<selected.patterns.length;
  coverage.hidden=!needsReview;
  if(!coverage.hidden)coverage.textContent=T(
   'تجد في المراجعة أيضًا جملًا من النص لم يتضح موضعها في التسجيل.',
   'The review also includes script examples whose position in the recording is unclear.');
  const stage=root.querySelector('.song-stage');
  const focus=stage.querySelector('.song-focus-line');
  showSongLead(focus);
  focus.removeAttribute('aria-current');
  delete stage.dataset.phase;
  delete stage.dataset.approximate;
  stage.querySelector('.song-estimate').textContent='';
  stage.querySelector('.song-example-translation').textContent='';
  stage.querySelector('.song-nearby').hidden=true;
  shownCue=activeCue=activeLine=activeWord=focusedWord=undefined;
  activeScene=null;
  preloadedScenes.clear();
  prepareSongPractice(scenes,lines,highlights);
  paintSongTiming();
 }

 function showSongLead(focus){
  focus.removeAttribute('dir');
  focus.removeAttribute('lang');
  focus.textContent=timeline.length?
   T('تظهر الكلمات مع بدء الغناء.','The lyrics appear when the singing starts.'):
   T('كلمات هذه الأغنية متاحة في النص الكامل أدناه.','Read this song in the full lyrics below.');
 }

 function paintScene(scene,time){
  const visual=root.querySelector('.song-artwork');
  if(scene?.photo){
   visual.innerHTML=`<img class="song-scene-photo" src="${H(scene.photo)}" alt="${H(T(scene.pattern.ar,scene.pattern.en))}">`;
  }else if(scene){
   visual.innerHTML=pilotScene({...scene.pattern,...scene.spoken,context:scene.context,image:scene.image},'song-scene-frame');
  }else{
   visual.innerHTML='<img class="song-cover" src="assets/home/songs.webp" alt="">';
  }
  if(scene)visual.dataset.sentenceId=scene.sentenceId;
  else delete visual.dataset.sentenceId;
  const next=sceneCues.find(item=>item.start>time);
  const path=next?.photo||next?.image.atlas;
  if(path&&!preloadedScenes.has(path)){
   preloadedScenes.add(path);
   const image=new Image();
   image.src=path+(document.documentElement.classList.contains('jpeg-images')?'?format=jpeg':'');
  }
 }

 function paintSongTiming(){
  if(!root||!selected||!audio)return;
  if(prelude){paintSongStudyTiming();return}
  const time=audio.currentTime*1000;
  paintSongPractice(time);
  let previous,cue,next;
  for(const line of timeline){
   if(line.start_ms>time){next=line;break}
   previous=line;
   if(time<line.end_ms)cue=line;
  }
  const scene=sceneCues.find(item=>item.start<=time&&time<item.end);
  const stage=root.querySelector('.song-stage');
  if(scene!==activeScene){
   activeScene=scene;
   paintScene(scene,time);
  }
  const phase=scene?(cue?.line===scene.line?'example':'purpose'):'';
  if(stage.dataset.phase!==phase){
   stage.dataset.phase=phase;
   stage.querySelector('.song-phase').textContent=phase==='example'?T('جملة النمط','Pattern example'):
    phase==='purpose'?T('غرض الجملة','Why we say it'):'';
  }
  const focus=stage.querySelector('.song-focus-line');
  const shortPause=previous&&next&&next.start_ms-previous.end_ms<=3200;
  const displayed=cue||(previous&&(shortPause||time-previous.end_ms<=900)?previous:null);
  if(displayed!==shownCue){
   shownCue=displayed;
   stage.dataset.approximate=String(Boolean(displayed?.approximate));
   stage.querySelector('.song-estimate').textContent=displayed?.approximate?T('توقيت تقريبي','Estimated timing'):'';
   stage.querySelector('.song-example-translation').textContent=EP.prefs.arabic&&displayed?songTranslations[displayed.line]||'':'';
   if(displayed){
    focus.innerHTML=focusLines[displayed.line];
    focus.lang='en';
    focus.dir='ltr';
   }else if(previous){
    focus.removeAttribute('lang');
    focus.removeAttribute('dir');
    focus.textContent=T('تابع الاستماع إلى المقطع.','Keep listening to the track.');
   }else showSongLead(focus);
  }
  if(cue!==activeCue){
   activeCue=cue;
   if(cue)focus.setAttribute('aria-current','true');
   else focus.removeAttribute('aria-current');
   const nearby=stage.querySelector('.song-nearby');
   nearby.hidden=!cue?.nearby.length;
   if(!nearby.hidden){
    nearby.innerHTML=`<b>${T('سطور محتملة في هذا المقطع','Possible lines in this section')}</b>`
     +cue.nearby.map(line=>`<div lang="en" dir="ltr">${focusLines[line]}</div>
      ${EP.prefs.arabic&&songTranslations[line]?`<small class="song-translation" lang="ar" dir="rtl">${H(songTranslations[line])}</small>`:''}`).join('');
   }
   activeLine?.removeAttribute('aria-current');
   const panel=root.querySelector('.song-lyrics-text');
   activeLine=cue?panel.querySelector(`[data-song-line="${cue.line}"]`):null;
   if(activeLine){
    activeLine.setAttribute('aria-current','true');
    const line=activeLine.getBoundingClientRect(),viewport=panel.getBoundingClientRect();
    if(panel.clientHeight&&(line.top<viewport.top+12||line.bottom>viewport.bottom-12)){
     panel.scrollTop+=line.top-viewport.top-viewport.height*.27;
    }
   }
  }
  const word=EPSongFollow.wordAt(cue?.words,time);
  const current=word<0?null:activeLine?.querySelector(`[data-song-word="${word}"]`);
  const inFocus=word<0?null:focus.querySelector(`[data-song-word="${word}"]`);
  if(current===activeWord&&inFocus===focusedWord)return;
  activeWord?.classList.remove('song-word-current');
  activeWord=current;
  activeWord?.classList.add('song-word-current');
  focusedWord?.classList.remove('song-word-current');
  focusedWord=inFocus;
  focusedWord?.classList.add('song-word-current');
 }

 function tickSongLyrics(){
  paintSongTiming();
  if(audio&&!audio.paused)lyricFrame=requestAnimationFrame(tickSongLyrics);
 }

 function paintSongStudyTiming(){
  if(!studyLine)return;
  const word=audio.readyState>=1&&audio.currentSrc===audio.src?
   EPSongFollow.wordAt(studyWords,audio.currentTime*1000):-1;
  const current=word<0?null:studyLine.querySelector(`[data-song-word="${word}"]`);
  if(current===studyWord)return;
  studyWord?.classList.remove('song-word-current');
  studyWord=current;
  studyWord?.classList.add('song-word-current');
 }

 function paintSongStudy(){
  const panel=root.querySelector('.song-study-panel');
  panel.hidden=!prelude;
  root.querySelector('.song-recording-view').hidden=Boolean(prelude);
  root.querySelector('[data-song-practice-toggle]').hidden=Boolean(prelude);
  studyWord?.classList.remove('song-word-current');
  studyLine=studyWord=null;
  studyWords=[];
  if(!prelude)return;
  const step=prelude.steps[prelude.index];
  const pattern=selected.patterns[step.index];
  const details=study[selected.id][step.index];
  panel.dataset.stage=step.kind;
  panel.querySelector('#song-study-title').textContent=step.kind==='purpose'?
   T('غرض الجملة','Sentence purpose'):T('استمع إلى الجملة','Listen to the sentence');
  panel.querySelector('[data-song-study-position]').textContent=T(
   `الجملة ${step.index+1} من ${selected.patterns.length}`,`Sentence ${step.index+1} of ${selected.patterns.length}`);
  panel.querySelector('[data-song-skip-prelude]').textContent=T('انتقل إلى الأغنية','Skip to the song');
  const model=practiceModels.get(patternKey(pattern));
  const picture=songExamplePicture(pattern,practicePictures.get(patternKey(pattern)),'eager');
  const speakingPurpose=step.kind==='purpose';
  const fixed=model?.line===pattern.en?model.highlights:undefined;
  const example=panel.querySelector('.song-study-example');
  example.classList.toggle('has-picture',Boolean(picture));
  example.innerHTML=`${picture}<div class="song-study-copy">
   ${prelude.mode==='purposes'?`<p class="song-study-prompt" lang="en" dir="ltr">${lyricLine(details.purpose.en,[],speakingPurpose?details.purpose.words:undefined)}</p>
    ${EP.prefs.arabic?EP.ar(details.purpose.ar):''}`:''}
   <div class="song-practice-phrase" lang="en" dir="ltr">${lyricLine(pattern.en,fixed,speakingPurpose?undefined:details.sentenceWords)}</div>
   ${EP.prefs.arabic?`<p class="song-practice-translation" lang="ar" dir="rtl">${H(pattern.ar)}</p>`:''}
   ${generalSongPurpose(details.general)}</div>`;
  studyWords=speakingPurpose?details.purpose.words:details.sentenceWords;
  studyLine=example.querySelector(speakingPurpose?'.song-study-prompt':'.song-practice-phrase');
  paintSongStudyTiming();
 }

 function generalSongPurpose(id){
  if(!id)return '';
  return `<p class="song-general-purpose">${T('الغرض العام','General purpose')} · ${H(purposeLabel(id))}</p>`;
 }

 function paintSelection(){
  const heading=root.querySelector('#song-title');
  heading.textContent=selected.title;
  root.querySelector('.song-topic').textContent=T(selected.topicAr,selected.topicEn);
  root.querySelector('.song-level').textContent=[selected.number,learningLevelLabel(selected.level)].filter(Boolean).join(' · ');
  paintTranscriptButton();
  prepareSongStage();
  const measuredExamples=new Map();
  for(const scene of sceneCues)if(scene.referenceId&&!scene.approximate&&!measuredExamples.has(scene.referenceId))measuredExamples.set(scene.referenceId,scene.start);
  root.querySelector('.song-patterns').innerHTML=`
   <h3>${T('أنماط وأمثلة للترديد','Patterns and examples to repeat')}</h3>
   <ul>${selected.patterns.map((pattern,index)=>{
    const {id,referenceId,form,en,ar}=pattern;
    const general=study[selected.id]?.[index]?.general||(id?EPPurposes.forPattern(id):null);
    return `
    <li>
     ${form?`<small class="song-form" lang="en" dir="ltr">${H(form)}</small>`:''}
     <p class="song-example" lang="en" dir="ltr">${practiceModels.get(patternKey(pattern))?.text??H(en)}</p>
     ${EP.ar(ar)}
     ${generalSongPurpose(general)}
     ${referenceId?`<div class="song-example-actions">
      ${measuredExamples.has(referenceId)?`<button class="textlink" type="button" data-song-example-time="${measuredExamples.get(referenceId)}">${T('▶ اسمعها في الأغنية','▶ Hear it in the song')}</button>`:''}
      <button class="textlink" type="button" data-song-reference="${H(referenceId)}">${T('افتح الجملة في المكتبة','Open library sentence')}</button>
     </div>`:`
      <button class="textlink" type="button" data-song-lesson="${id}">${T('افتح درس النمط','Open pattern lesson')}</button>`}
    </li>`}).join('')}</ul>`;
  for(const button of root.querySelectorAll('[data-song-track]')){
   button.setAttribute('aria-current',String(button.dataset.songTrack===selected.id));
  }
  paintSongStudy();
  paintPlaybackStatus();
 }

 function hasSongFilters(){
  return Boolean(filters.collection||filters.level||normalizeSearchTerm(filters.query));
 }

 function matchingTracks(){
  const {collection,level,query}=filters;
  const terms=normalizeSearchTerm(query).split(/\s+/).filter(Boolean);
  return tracks.filter(song=>{
   if((collection&&collection!==(song.collection||'foundation'))||(level&&level!==song.level))return false;
   const text=normalizeSearchTerm([song.title,song.number||song.id,song.topicAr,song.topicEn].join(' '));
   return terms.every(term=>text.includes(term));
  });
 }

 function paintFilter(){
  visibleTracks=matchingTracks();
  const visibleIds=new Set(visibleTracks.map(song=>song.id));
  for(const button of root.querySelectorAll('[data-song-collection]')){
   button.setAttribute('aria-pressed',String(button.dataset.songCollection===filters.collection));
  }
  for(const button of root.querySelectorAll('[data-song-level]')){
   button.setAttribute('aria-pressed',String(button.dataset.songLevel===filters.level));
  }
  for(const row of root.querySelectorAll('[data-track-level]')){
   row.hidden=!visibleIds.has(row.firstElementChild.dataset.songTrack);
  }
  root.querySelector('.song-tracks').scrollTop=0;
  root.querySelector('.song-filter-empty').hidden=Boolean(visibleTracks.length);
  root.querySelector('[data-song-clear]').hidden=!hasSongFilters();
  paintPlaybackStatus();
 }

 function readPlaylistCheckpoint(){
  checkpoint=null;
  try{checkpoint=JSON.parse(localStorage.getItem(playlistKey())||'null')}catch{}
 }

 function applyFilters(next){
  const updated={...filters,...next};
  const changed=playlistKey(updated)!==playlistKey();
  if(changed&&sequence!=='off'){
   pauseSongPlayer();
   sequence='off';
   playbackFailed=false;
  }
  filters=updated;
  EPFilters.save(songFilterKey,filters);
  if(changed)readPlaylistCheckpoint();
  const search=root.querySelector('#song-search');
  if(search&&search.value!==filters.query)search.value=filters.query;
  if(!tracks?.length)return;
  paintFilter();
  if(!changed||!audio.paused||!visibleTracks.length||visibleTracks.includes(selected))return;
  cueTrack(visibleTracks[0]);
  paintSelection();
 }

 function revealPlayingTrack(){
  const list=root.querySelector('.song-tracks');
  const active=list.querySelector('[aria-current="true"]');
  if(!active||active.closest('li').hidden)return;
  const row=active.getBoundingClientRect(), viewport=list.getBoundingClientRect();
  if(row.top<viewport.top)list.scrollTop+=row.top-viewport.top;
  else if(row.bottom>viewport.bottom)list.scrollTop+=row.bottom-viewport.bottom;
 }

 function paintPage(){
  const embedded=host.id==='reference-song-player';
  root.querySelector('.song-intro').hidden=embedded;
  root.querySelector('.song-intro').innerHTML=embedded?'':`
   <h1>${T(...epLabel('songs'))}</h1>
   <p>${T('تابع صورة الموقف مع الجملة، وردّد الكلمات المضيئة.',
    'Follow the scene with its sentence, and sing along with the highlighted words.')}</p>`;
  const collections=root.querySelector('.song-collections');
  collections.setAttribute('aria-label',T('مجموعة الأغاني','Song collection'));
  collections.innerHTML=[
   ['','كل الأغاني','All songs'],
   ['foundation','الأنماط الأساسية','Foundation patterns'],['reference','بقية الأنماط','More patterns']
  ].map(([id,ar,en])=>`<button class="secondary" type="button" data-song-collection="${id}">${T(ar,en)}</button>`).join('');
  const message=root.querySelector('.song-loading');
  message.hidden=Boolean(tracks?.length);
  root.querySelector('.song-layout').hidden=!tracks?.length;
  if(!tracks?.length){
   message.innerHTML=loadFailed?
    `<p role="status">${T('تعذّر تحميل قائمة الأغاني.','Could not load the song list.')}</p>
     <button class="secondary" type="button" data-song-retry>${T('أعد المحاولة','Retry')}</button>`:
    `<p role="status">${T('جارٍ تحميل الأغاني…','Loading songs…')}</p>`;
   return;
  }
  root.querySelector('#song-list-title').textContent=T('قائمة الأغاني','Songs');
  root.querySelector('[data-song-list]').textContent=T('قائمة الأغاني والفلاتر','Songs and filters');
  root.querySelector('[data-song-match]').textContent=T('اربط الجمل بالصور','Match sentences to pictures');
  root.querySelector('[data-song-next]').textContent=T('الأغنية التالية','Next song');
  root.querySelector('[data-song-clear]').textContent=T('مسح الفلاتر','Clear filters');
  root.querySelector('.song-filter-empty').textContent=T('لا توجد أغانٍ تطابق هذه الفلاتر.','No songs match these filters.');
  root.querySelector('#song-lyrics-title').textContent=T('كلمات الأغنية','Lyrics');
  paintTranscriptButton();
  root.querySelector('.song-sync-label').textContent=T('متابعة مع الغناء','Synced to the vocals');
  const controls=root.querySelector('.song-filters');
  const mode=root.querySelector('[data-song-mode]');
  root.querySelector('.song-mode span').textContent=T('طريقة التعلّم','Study mode');
  mode.innerHTML=songStudyModes.map(([value,ar,en])=>`<option value="${value}">${T(ar,en)}</option>`).join('');
  mode.disabled=!Object.keys(study).length;
  mode.value=mode.disabled?'song':studyMode;
  controls.innerHTML=`<input type="search" id="song-search" value="${H(filters.query)}"
   aria-label="${T('ابحث في الأغاني','Search songs')}" placeholder="${T('العنوان أو الموضوع أو الرقم','Title, topic or number')}">
   <div class="song-level-options" role="group" aria-label="${T('المستوى','Level')}">
   ${['',...Object.keys(learningLevelNames).filter(value=>tracks.some(song=>song.level===value))].map(value=>
     `<button type="button" data-song-level="${value}">${value||T('كل المستويات','All levels')}</button>`).join('')}</div>`;
  controls.querySelector('#song-search').oninput=event=>applyFilters({query:event.target.value});
  root.querySelector('.song-tracks').innerHTML=tracks.map(song=>`
   <li data-track-level="${song.level}">
    <button class="song-track" type="button" data-song-track="${song.id}">
     <span class="song-play-icon" aria-hidden="true">▶</span>
     <span class="song-track-info">
      <bdi lang="en">${H(song.title)}</bdi>
      <small>${song.number?`<bdi>${song.number}</bdi> · `:''}<bdi>${song.level}</bdi> · <bdi>${timeLabel(song.duration)}</bdi></small>
     </span>
    </button>
   </li>`).join('');
  paintFilter();
  paintSelection();
  if(!audio.hasAttribute('src'))audio.src=playbackSource(selected,prelude);
 }

 async function loadTracks(){
  if(loading)return;
  loading=true;
  loadFailed=false;
  paintPage();
  try{
   const [data,texts,lineTimes,reference,referenceSync,practiceData,referenceExtras,studyData,recoveredVocals]=await Promise.all([
    songCatalogReady.then(rows=>rows||epFetchJSON('song-library.json')),epFetchJSON('song-lyrics.json'),
    epFetchJSON('song-timing.json').catch(()=>({})),
    referenceSongCatalogReady.then(rows=>rows||epFetchJSON('reference-song-library.json')).catch(()=>null),
    epFetchJSON('reference-song-sync.json').catch(()=>null),epFetchJSON('song-practice.json').catch(()=>null),
    epFetchJSON('reference-song-extras.json').catch(()=>null),epFetchJSON('song-study.json').catch(()=>null),
    epFetchJSON('song-vocal-recovery.json').catch(()=>null)
   ]);
   if(!Array.isArray(data)||!data.length||!data.every(song=>texts?.[song.id]?.text)){
    throw Error('Song catalog or lyrics are unavailable');
   }
   const references=Array.isArray(reference)?reference.filter(song=>referenceSync?.lyrics?.[song.id]?.text):[];
   lyrics={...texts,...referenceSync?.lyrics};
   timings={...lineTimes,...referenceSync?.timings};
   practice=practiceData?.tracks||{};
   extras=referenceExtras||{};
   recovery=recoveredVocals||{};
   study=studyData||{};
   tracks=[...data,...references];
   songSearchRows=tracks;
   if(root?.isConnected)selectInitialTrack();
  }catch{
   loadFailed=true;
  }finally{
   loading=false;
   if(root?.isConnected){
    paintPage();
    if(pendingStart&&tracks?.length)startPlaylist(host);
   }
  }
 }

 function storeCheckpoint(value){
  checkpoint=value;
  try{
   if(value)localStorage.setItem(playlistKey(),JSON.stringify(value));
   else localStorage.removeItem(playlistKey());
  }catch{}
 }

 function rememberPlaylist(force=false){
  if(sequence!=='playing'||!selected||!audio)return;
  const seconds=attempt?.offset??audio.currentTime;
  if(audio.error&&seconds===0&&checkpoint?.id===selected.id)return;
  if(!Number.isFinite(seconds)||!force&&checkpoint?.id===selected.id&&
   checkpoint.studyIndex===prelude?.index&&Math.abs(checkpoint.seconds-seconds)<2)return;
  storeCheckpoint({id:selected.id,seconds,studyIndex:prelude?.index});
 }

 function failPlayback(current,reason){
  if(current!==attempt)return;
  clearTimeout(bufferTimer);
  if(sequence==='playing'){
   rememberPlaylist(true);
   if(!current?.retried&&reason!=='NotAllowedError'){
    playTrack(selected,{offset:checkpoint.seconds,retried:true,reload:true,intro:prelude});
    return;
   }
   sequence='paused';
  }
  attempt=null;
  playbackFailed=true;
  audio.pause();
  paintPlaybackStatus();
 }

 function watchBuffer(){
  clearTimeout(bufferTimer);
  const current=attempt;
  if(sequence==='playing'&&current&&!audio.paused){
   const time=audio.currentTime;
   bufferTimer=setTimeout(()=>{
    if(attempt===current&&!audio.paused&&!audio.ended&&audio.currentTime===time)failPlayback(current,'timeout');
   },12000);
  }
 }

 function paintTranscriptButton(){
  const transcript=root.querySelector('#song-full-lyrics');
  const button=root.querySelector('[data-song-transcript]');
  button.setAttribute('aria-expanded',String(!transcript.hidden));
  button.textContent=selected?.collection==='reference'?
   (transcript.hidden?T('عرض الكلمات المتزامنة ↓','Show synced lyrics ↓'):T('إخفاء الكلمات المتزامنة ↑','Hide synced lyrics ↑')):
   (transcript.hidden?T('عرض كل كلمات الأغنية ↓','Show all lyrics ↓'):T('إخفاء كلمات الأغنية الكاملة ↑','Hide full lyrics ↑'));
 }

 function prepareStudy(track,index=0){
  const steps=EPSongFollow.songStudySteps(studyMode,study[track.id]);
  return steps[index]?{mode:studyMode,steps,index}:null;
 }

 function playbackSource(track,intro){
  return intro?.steps[intro.index].path||track.path;
 }

 function cueTrack(track){
  attempt=null;
  selected=track;
  prelude=track?prepareStudy(track):null;
  if(track)audio.src=playbackSource(track,prelude);
  else audio.removeAttribute('src');
 }

 function startTrack(track,saved=null,reveal=true){
  const intro=saved?(Number.isInteger(saved.studyIndex)?prepareStudy(track,saved.studyIndex):null):prepareStudy(track);
  const offset=saved&&Number.isFinite(saved.seconds)?Math.max(0,saved.seconds):0;
  playTrack(track,{offset,intro,reveal});
 }

 function playTrack(track,{offset=0,retried=false,reload=false,intro=null,reveal=false}={}){
  clearSongEndReview();
  const player=audio;
  clearTimeout(bufferTimer);
  const current={offset:offset>0?offset:null,retried,reveal};
  attempt=current;
  prelude=intro;
  playbackFailed=false;
  const source=playbackSource(track,prelude);
  const sourceChanged=player.getAttribute('src')!==source;
  if(sourceChanged)player.src=source;
  else if(reload||player.error)player.load();
  if(!sourceChanged&&!reload&&player.readyState>=1){
   player.currentTime=Math.min(offset,Math.max(0,(player.duration||offset)-.05));
   current.offset=null;
  }
  const changed=track!==selected;
  selected=track;
  if(changed){
   paintSelection();
   revealPlayingTrack();
  }else{
   paintSongStudy();
   paintSongTiming();
   paintPlaybackStatus();
  }
  if(sequence==='playing')storeCheckpoint({id:track.id,seconds:offset,studyIndex:prelude?.index});
  Promise.resolve(player.play()).catch(error=>{
   if(error.name!=='AbortError')failPlayback(current,error.name);
  });
  watchBuffer();
 }

 function toggleSequence(resume=false){
  if(!visibleTracks.length)return;
  if(!resume&&sequence==='playing'){
   clearSongEndReview();
   rememberPlaylist(true);
   sequence='paused';
   clearTimeout(bufferTimer);
   attempt=null;
   audio.pause();
   paintPlaybackStatus();
   return;
  }
  const saved=resume&&visibleTracks.find(track=>track.id===checkpoint?.id);
  sequence='playing';
  startTrack(saved||visibleTracks[0],saved?checkpoint:null);
 }

 function startPlaylist(target){
  if(target!==host)return;
  pendingStart=!tracks?.length;
  if(!pendingStart)toggleSequence(Boolean(checkpoint));
 }

 function pauseSongPlayer(){
  if(!audio)return;
  clearSongEndReview();
  pendingStart=false;
  if(sequence==='playing'){
   rememberPlaylist(true);
   sequence='paused';
  }
  clearTimeout(bufferTimer);
  attempt=null;
  audio.pause();
  if(tracks?.length)paintPlaybackStatus();
 }

 function songPictureRows(){
  return selected.patterns.map(pattern=>{
   const id=patternKey(pattern),scene=practicePictures.get(id);
   return {...pattern,id,image:scene?.image,photo:scene?.photo};
  });
 }

 function clearSongEndReview(){
  if(endReviewTimer===null)return;
  clearTimeout(endReviewTimer);
  endReviewTimer=null;
  root?.querySelector('[data-song-next]')?.setAttribute('hidden','');
 }

 function advanceSongPlaylist(){
  clearSongEndReview();
  if(sequence!=='playing')return;
  const next=visibleTracks[visibleTracks.indexOf(selected)+1];
  if(next){startTrack(next,null,false);return}
  sequence='finished';
  attempt=null;
  storeCheckpoint(null);
  paintPlaybackStatus();
 }

 function openSongPicturePractice(trigger){
  const track=selected,player=audio,playing=!audio.paused,waiting=endReviewTimer!==null;
  EPPractice.open('pictures',songPictureRows(),{trigger,
   exitLabel:waiting?T('تابع قائمة الأغاني','Continue playlist'):T('ارجع إلى الأغنية','Return to the song'),
   onStart(){clearSongEndReview();player.pause()},
   onExit(){
    if(player!==audio||track!==selected||!root?.isConnected)return;
    if(waiting||player.ended&&sequence==='playing')advanceSongPlaylist();
    else if(playing)player.play().catch(()=>paintPlaybackStatus());
   }
  });
 }

 function selectInitialTrack(){
  cueTrack(tracks?.length?(matchingTracks()[0]||tracks[0]):null);
 }

 function changeSongStudyMode(value){
  if(value===studyMode||!songStudyModes.some(([mode])=>mode===value))return;
  pauseSongPlayer();
  studyMode=value;
  try{localStorage.setItem('patterns-song-study-mode',studyMode)}catch{}
  sequence='off';
  playbackFailed=false;
  readPlaylistCheckpoint();
  cueTrack(selected);
  paintSelection();
 }

 function closePlayer(target){
  if(!root||target!==host)return;
  pauseSongPlayer();
  cancelAnimationFrame(lyricFrame);
  pendingStart=false;
  activeLine=activeWord=null;
  studyLine=studyWord=null;
  studyWords=[];
  practiceTrack=null;
  audio=root=host=null;
  language=null;
 }

 function mount(target){
  closePlayer(host);
  host=target;
  host.innerHTML=`
   <section class="song-library">
    <div class="song-intro"></div>
    <div class="panel song-loading"></div>
    <div class="song-layout" hidden>
     <section class="panel song-list" id="song-list" aria-labelledby="song-list-title">
      <div class="song-list-heading">
       <h2 id="song-list-title" tabindex="-1"></h2>
       <div class="song-collections" role="group"></div>
      </div>
      <div class="song-list-controls">
       <div class="song-filters"></div>
       <label class="song-mode"><span></span><select data-song-mode></select></label>
      </div>
      <div class="song-list-actions">
       <button type="button" class="primary song-play-all" data-songs-play-all></button>
       <button type="button" class="secondary" data-songs-resume hidden></button>
       <button type="button" class="textlink" data-song-clear hidden></button>
      </div>
      <p class="song-filter-empty" role="status" hidden></p>
      <ul class="song-tracks"></ul>
     </section>
     <section class="panel song-player" aria-labelledby="song-title">
      <div class="song-now">
       <div>
        <p class="song-level"></p>
        <h2 id="song-title" dir="ltr" lang="en"></h2>
        <p class="song-topic"></p>
       </div>
       <div class="song-transport">
        <audio controls preload="none" dir="ltr" aria-labelledby="song-title"></audio>
        <div class="song-transport-actions">
         <button type="button" class="secondary" data-song-practice-toggle aria-expanded="false" aria-controls="song-practice"></button>
         <button type="button" class="secondary" data-song-list aria-controls="song-list"></button>
        </div>
        <p class="song-queue-status" role="status"></p>
        <p class="song-playback-status" role="status"></p>
       </div>
      </div>
      <section class="song-study-panel" aria-labelledby="song-study-title" hidden>
       <div class="song-study-header">
        <div><h3 id="song-study-title" aria-live="polite"></h3><small data-song-study-position></small></div>
        <button type="button" class="secondary" data-song-skip-prelude></button>
       </div>
       <div class="song-study-example"></div>
      </section>
      <div class="song-recording-view">
      <section class="song-lyrics" aria-labelledby="song-lyrics-title">
       <section class="song-practice" id="song-practice" aria-labelledby="song-practice-title" hidden>
        <h3 id="song-practice-title" aria-live="polite"></h3>
        <div class="song-practice-prompt"></div>
        <div class="song-practice-actions">
         <button type="button" class="secondary" data-song-practice-pause hidden></button>
         <button type="button" class="secondary" data-song-practice-list aria-expanded="false" aria-controls="song-practice-examples"></button>
         <button type="button" class="secondary" data-song-match></button>
         <button type="button" class="secondary" data-song-next hidden></button>
        </div>
        <ol id="song-practice-examples" class="song-practice-examples" tabindex="0" hidden></ol>
       </section>
       <div class="song-lyrics-heading"><h3 id="song-lyrics-title"></h3><small class="song-sync-label" hidden></small></div>
       <p class="song-sync-coverage" hidden></p>
       <div class="song-stage">
        <figure class="song-artwork"></figure>
        <div class="song-readalong">
         <p class="song-phase"></p>
         <small class="song-estimate"></small>
         <div class="song-focus-line"></div>
         <p class="song-example-translation" lang="ar" dir="rtl"></p>
         <div class="song-nearby" hidden></div>
        </div>
       </div>
      </section>
      <div class="song-transcript">
       <button class="secondary" type="button" data-song-transcript aria-controls="song-full-lyrics"></button>
       <div id="song-full-lyrics" class="song-lyrics-text" tabindex="0" role="region" aria-labelledby="song-lyrics-title" hidden></div>
      </div>
      </div>
     </section>
     <section class="panel song-patterns"></section>
    </div>
   </section>`;
  root=host.querySelector('.song-library');
  audio=root.querySelector('audio');
  language=null;
  sequence='off';
  playbackFailed=false;
  visibleTracks=[];
  studyMode='song';
  try{
   const saved=localStorage.getItem('patterns-song-study-mode');
   if(songStudyModes.some(([mode])=>mode===saved))studyMode=saved;
  }catch{}
  filters=EPFilters.read(songFilterKey,defaultSongFilters);
  readPlaylistCheckpoint();
  selectInitialTrack();
  const player=audio;
  player.addEventListener('play',()=>{
   if(player!==audio)return;
   clearSongEndReview();
   stopOtherAudio();
   playbackFailed=false;
   paintPlaybackStatus();
   paintPracticeTransport();
   paintSongTiming();
   if(!attempt?.reveal)return;
   attempt.reveal=false;
   const target=window.innerHeight<450?(prelude?'.song-study-panel':'.song-lyrics'):'.song-player';
   root.querySelector(target).scrollIntoView({
    block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
   });
  });
  player.addEventListener('playing',()=>{
   if(player!==audio)return;
   clearTimeout(bufferTimer);
   cancelAnimationFrame(lyricFrame);
   tickSongLyrics();
  });
  player.addEventListener('loadedmetadata',()=>{
   if(player!==audio||attempt?.offset==null)return;
   player.currentTime=Math.min(attempt.offset,Math.max(0,player.duration-.05));
   attempt.offset=null;
  });
  for(const event of ['waiting','stalled'])player.addEventListener(event,()=>{if(player===audio)watchBuffer()});
  for(const event of ['timeupdate','seeked','pause']){
   player.addEventListener(event,()=>{
    if(player!==audio)return;
    if(event==='pause'&&!player.error&&!player.ended){
     clearTimeout(bufferTimer);
     paintPlaybackStatus();
     paintPracticeTransport();
    }
    rememberPlaylist(event!=='timeupdate');
    paintSongTiming();
    if(event==='seeked')paintPracticeTransport();
   });
  }
  player.addEventListener('error',()=>{
   if(player!==audio||!player.error)return;
   failPlayback(attempt,'media');
  });
  player.addEventListener('ended',()=>{
   if(player!==audio||!player.ended)return;
   if(prelude){
    const index=prelude.index+1;
    playTrack(selected,{intro:index<prelude.steps.length?{...prelude,index}:null});
    return;
   }
   dismissedPractice=null;
   paintSongTiming();
   paintPracticeTransport();
   if(sequence!=='playing')return;
   clearTimeout(bufferTimer);
   if(visibleTracks[visibleTracks.indexOf(selected)+1]&&EPPractice.distinctRows(songPictureRows(),'pictures').length>=2){
    endReviewTimer=setTimeout(advanceSongPlaylist,6500);
    paintPracticeTransport();
   }else advanceSongPlaylist();
  });
  root.querySelector('[data-song-mode]').addEventListener('change',event=>changeSongStudyMode(event.target.value));
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button)return;
   if(button.hasAttribute('data-song-collection')){
    applyFilters({collection:button.dataset.songCollection});
   }else if(button.hasAttribute('data-song-level')){
    applyFilters({level:button.dataset.songLevel});
   }else if(button.hasAttribute('data-song-clear')){
    applyFilters(defaultSongFilters);
    root.querySelector('#song-search').focus({preventScroll:true});
   }else if(button.hasAttribute('data-songs-play-all')){
    toggleSequence();
   }else if(button.hasAttribute('data-songs-resume')){
    toggleSequence(true);
   }else if(button.hasAttribute('data-song-skip-prelude')){
    if(prelude)playTrack(selected);
   }else if(button.hasAttribute('data-song-list')){
    root.querySelector('.song-list').scrollIntoView({block:'start'});
    root.querySelector('#song-list-title').focus({preventScroll:true});
   }else if(button.hasAttribute('data-song-practice-toggle')){
    manualPractice=!shownPractice;
    dismissedPractice=manualPractice?null:activeSongPractice();
    paintSongPractice();
    if(manualPractice)root.querySelector('#song-practice').scrollIntoView({block:'nearest'});
   }else if(button.hasAttribute('data-song-practice-list')){
    practiceListChoice=button.getAttribute('aria-expanded')!=='true';
    paintPracticeList();
   }else if(button.hasAttribute('data-song-practice-pause')){
    if(audio.paused)playTrack(selected,{offset:audio.currentTime});
    else audio.pause();
   }else if(button.hasAttribute('data-song-match')){
    openSongPicturePractice(button);
   }else if(button.hasAttribute('data-song-next')){
    advanceSongPlaylist();
   }else if(button.hasAttribute('data-song-transcript')){
    const transcript=root.querySelector('#song-full-lyrics');
    transcript.hidden=!transcript.hidden;
    paintTranscriptButton();
    if(!transcript.hidden&&activeLine)transcript.scrollTop=activeLine.parentElement.offsetTop;
   }else if(button.dataset.songTrack){
    rememberPlaylist(true);
    sequence='off';
    const track=tracks.find(song=>song.id===button.dataset.songTrack);
    if(track===selected&&!audio.ended&&(prelude||audio.currentTime>0)){
     playTrack(track,{offset:audio.currentTime,intro:prelude,reveal:true});
    }else startTrack(track);
   }else if(button.dataset.songLesson){
    openLinkedLearning('lesson',Number(button.dataset.songLesson));
   }else if(button.dataset.songReference){
    openLinkedLearning('reference',button.dataset.songReference);
   }else if(button.dataset.songPracticeModel||button.dataset.songExampleTime){
    rememberPlaylist(true);
    sequence='off';
    if(button.dataset.songPracticeModel)manualPractice=true;
    playTrack(selected,{offset:Number(button.dataset.songPracticeModel??button.dataset.songExampleTime)/1000,reveal:true});
   }else if(button.hasAttribute('data-song-retry')){
    loadTracks();
   }
  });
 }

 window.addEventListener('hashchange',()=>{
  if(root&&!root.isConnected)closePlayer(host);
 });
 window.addEventListener('pagehide',()=>rememberPlaylist(true));

 function renderPlayer(target=$('#app')){
  if(host!==target||!root?.isConnected)mount(target);
  const display=`${EP.prefs.language}|${EP.prefs.arabic}|${EP.prefs.songEstimates}`;
  if(language===display)return;
  language=display;
  if(tracks||loading||loadFailed)paintPage();
  else loadTracks();
 }
 renderPlayer.filter=next=>{
  const target=$('#app');
  if(host!==target||!root?.isConnected){
   EPFilters.save(songFilterKey,next);
   renderPlayer(target);
  }else applyFilters(next);
 };
 renderPlayer.pause=pauseSongPlayer;
 renderPlayer.close=closePlayer;
 renderPlayer.start=startPlaylist;
 return renderPlayer;
})();
