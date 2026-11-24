let songSearchRows=[],songSearchQuery=EPFilters.read('songs',{query:''}).query;
let songLibraryScope='foundation';
const songCatalogReady=epFetchJSON('song-library.json').catch(()=>null);
const referenceSongCatalogReady=epFetchJSON('reference-song-library.json').catch(()=>null);
Promise.all([songCatalogReady,referenceSongCatalogReady]).then(([foundation,references])=>{
 songSearchRows=[...(foundation||[]),...(references||[])];
});
function filterSongsByTitle(title,collection='foundation'){
 songLibraryScope=collection;
 songSearchQuery=title;
 if(page==='songs')renderSongLibrary();
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
 let catalog, tracks, lyrics, timings={}, practice={}, selected, level, query, scope, root, audio, language, host;
 let loading=false, loadFailed=false, playbackFailed=false, pendingStart=false;
 let sequence='off';
 const filterKey=()=>scope==='combined'?'songs-combined':'songs';
 const playlistKey=()=>scope==='foundation'?'patterns-song-playlist':`patterns-song-playlist-${scope}`;
 let checkpoint,attempt,bufferTimer;
 let timeline=[],sceneCues=[],focusLines=[],shownCue,activeCue,activeScene,activeLine,activeWord,focusedWord,lyricFrame;
 let practiceTrack, practiceWindows=[], practiceModels, shownPractice, dismissedPractice, manualPractice=false, practiceListChoice;
 const patternKey=pattern=>String(pattern.referenceId??pattern.id);
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
   T('تعذّر تشغيل الأغنية. اختر عنوانها للمحاولة من جديد.','Could not play the song. Choose its title to retry.')):'';
  const playAll=root.querySelector('[data-songs-play-all]');
  playAll.textContent=sequence==='playing'?
   T('إيقاف تشغيل الكل','Stop playlist'):T('▶ تشغيل الأغاني كلها','▶ Play all songs');
  const savedTrack=tracks.find(track=>track.id===checkpoint?.id);
  const resume=root.querySelector('[data-songs-resume]');
  resume.hidden=!savedTrack||sequence==='playing'&&!audio.paused;
  if(savedTrack)resume.textContent=T(`استكمال القائمة · ${savedTrack.title}`,`Resume playlist · ${savedTrack.title}`);
  const position=tracks.indexOf(selected)+1, total=tracks.length;
  root.querySelector('.song-queue-status').textContent=sequence==='playing'?
   T(`الأغنية ${position} من ${total}`,`Song ${position} of ${total}`):
   sequence==='finished'?T('اكتمل تشغيل جميع الأغاني.','All songs have finished playing.'):'';
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
  const exact=new Map(trackTiming?.lines?.map(cue=>[cue.line,cue]));
  practiceModels=new Map();
  for(const [index,scene] of scenes.entries()){
   const pattern=scene.referenceId?selected.patterns.find(item=>item.referenceId===scene.referenceId):selected.patterns[index];
   const cue=exact.get(scene.line);
   if(!pattern||practiceModels.has(patternKey(pattern)))continue;
   practiceModels.set(patternKey(pattern),{time:cue?.start_ms,text:lyricLine(lines[scene.line],highlights[scene.line])});
  }
  root.querySelector('#song-practice-examples').innerHTML=selected.patterns.map(pattern=>
   `<li>${practiceExample(pattern,true)}</li>`).join('');
 }

 function practiceExample(pattern,replay=false){
  const model=practiceModels.get(patternKey(pattern));
  return `<div class="song-practice-phrase" lang="en" dir="ltr">${model?.text??H(pattern.en)}</div>
   ${EP.prefs.arabic?`<p class="song-practice-translation" lang="ar" dir="rtl">${H(pattern.ar)}</p>`:''}
   ${replay&&model?.time!=null?`<button type="button" class="textlink" data-song-practice-model="${model.time}">${T('▶ اسمعها في الأغنية','▶ Hear it in the song')}</button>`:''}`;
 }

 function activeSongPractice(time=audio.currentTime*1000){
  const duration=Number.isFinite(audio.duration)?audio.duration:selected.duration;
  return EPSongFollow.practiceAt(practiceWindows,time,duration*1000,audio.ended);
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
  const {text,highlights,scenes=[],translations={}}=lyrics[selected.id];
  const lines=text.split('\n');
  timeline=EPSongFollow.followLyrics(lines,timings[selected.id]?.lines||[],selected.duration*1000,
   {measuredOnly:selected.collection==='reference'});
  const byLine=new Map(timeline.map(cue=>[cue.line,cue]));
  focusLines=lines.map((line,index)=>lyricLine(line,highlights[index],byLine.get(index)?.words));
  sceneCues=scenes.flatMap((scene,index)=>{
   const purpose=byLine.get(scene.purposeLine),example=byLine.get(scene.line);
   if(!purpose&&!example)return [];
   const pattern=scene.referenceId?selected.patterns.find(item=>item.referenceId===scene.referenceId):selected.patterns[index];
   return pattern?[{...scene,pattern,start:(purpose||example).start_ms,end:(example||purpose).end_ms}]:[];
  });
  const panel=root.querySelector('.song-lyrics-text');
  panel.innerHTML=focusLines.map((line,index)=>line?`<div class="song-transcript-row">
   <span class="song-lyric-line" data-song-line="${index}" lang="en" dir="ltr">${line}</span>
   ${EP.prefs.arabic&&translations[index]?`<small class="song-translation" lang="ar" dir="rtl">${H(translations[index])}</small>`:''}
  </div>`:'').join('');
  panel.scrollTop=0;
  root.querySelector('.song-sync-label').hidden=!timings[selected.id]?.lines.length;
  const coverage=root.querySelector('.song-sync-coverage');
  const covered=selected.collection==='reference'?new Set(scenes.map(scene=>scene.referenceId)).size:0;
  coverage.hidden=selected.collection!=='reference'||covered===selected.patterns.length;
  if(!coverage.hidden)coverage.textContent=T(
   `المزامنة متاحة لـ ${covered} من ${selected.patterns.length} جملة تعليمية في هذا التسجيل.`,
   `${covered} of ${selected.patterns.length} lesson sentences are synced to the recording.`);
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
   visual.innerHTML=pilotScene({...scene.pattern,context:scene.context,image:scene.image},'song-scene-frame');
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
  const time=audio.currentTime*1000;
  paintSongPractice(time);
  let previous,cue;
  for(const line of timeline){
   if(line.start_ms>time)break;
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
  const displayed=selected.collection==='reference'&&previous&&time-previous.end_ms>450?null:previous;
  if(displayed!==shownCue){
   shownCue=displayed;
   const translations=lyrics[selected.id].translations||{};
   stage.dataset.approximate=String(Boolean(displayed?.approximate));
   stage.querySelector('.song-estimate').textContent=displayed?.approximate?T('توقيت تقريبي','Estimated timing'):'';
   stage.querySelector('.song-example-translation').textContent=EP.prefs.arabic&&displayed?translations[displayed.line]||'':'';
   if(displayed){
    focus.innerHTML=focusLines[displayed.line];
    focus.lang='en';
    focus.dir='ltr';
   }else if(previous){
    focus.removeAttribute('lang');
    focus.removeAttribute('dir');
    focus.textContent='';
   }else showSongLead(focus);
  }
  if(cue!==activeCue){
   activeCue=cue;
   if(cue)focus.setAttribute('aria-current','true');
   else focus.removeAttribute('aria-current');
   const nearby=stage.querySelector('.song-nearby');
   nearby.hidden=!cue?.nearby.length;
   if(!nearby.hidden){
    const translations=lyrics[selected.id].translations||{};
    nearby.innerHTML=`<b>${T('سطور محتملة في هذا المقطع','Possible lines in this section')}</b>`
     +cue.nearby.map(line=>`<div lang="en" dir="ltr">${focusLines[line]}</div>
      ${EP.prefs.arabic&&translations[line]?`<small class="song-translation" lang="ar" dir="rtl">${H(translations[line])}</small>`:''}`).join('');
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
  const word=cue?.words.findIndex(([, ,start,end])=>start<=time&&time<end)??-1;
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

 function paintSelection(){
  const heading=root.querySelector('#song-title');
  heading.textContent=selected.title;
  root.querySelector('.song-topic').textContent=T(selected.topicAr,selected.topicEn);
  root.querySelector('.song-level').textContent=[selected.number,learningLevelLabel(selected.level)].filter(Boolean).join(' · ');
  paintTranscriptButton();
  prepareSongStage();
  const measuredExamples=new Map();
  for(const scene of sceneCues)if(scene.referenceId&&!measuredExamples.has(scene.referenceId))measuredExamples.set(scene.referenceId,scene.start);
  root.querySelector('.song-patterns').innerHTML=`
   <h3>${T('أنماط وأمثلة للترديد','Patterns and examples to repeat')}</h3>
   <ul>${selected.patterns.map(({id,referenceId,form,en,ar})=>`
    <li>
     ${form?`<small class="song-form" lang="en" dir="ltr">${H(form)}</small>`:''}
     <p class="song-example" lang="en" dir="ltr">${H(en)}</p>
     ${EP.ar(ar)}
     ${referenceId?`<div class="song-example-actions">
      ${measuredExamples.has(referenceId)?`<button class="textlink" type="button" data-song-example-time="${measuredExamples.get(referenceId)}">${T('▶ اسمعها في الأغنية','▶ Hear it in the song')}</button>`:''}
      <button class="textlink" type="button" data-song-reference="${H(referenceId)}">${T('افتح الجملة في المكتبة','Open library sentence')}</button>
     </div>`:`${dialoguePurposeMarkup(EPPurposes.forPattern(id))}
      <button class="textlink" type="button" data-song-lesson="${id}">${T('افتح درس النمط','Open pattern lesson')}</button>`}
    </li>`).join('')}</ul>`;
  for(const button of root.querySelectorAll('[data-song-track]')){
   button.setAttribute('aria-current',String(button.dataset.songTrack===selected.id));
  }
  paintPlaybackStatus();
 }

 function paintFilter(){
  for(const button of root.querySelectorAll('[data-song-level]')){
   button.setAttribute('aria-pressed',String(button.dataset.songLevel===level));
  }
  for(const row of root.querySelectorAll('[data-track-level]')){
   const song=tracks.find(item=>item.id===row.querySelector('[data-song-track]').dataset.songTrack);
   const match=normalizeSearchTerm([song.title,song.number,song.topicAr,song.topicEn].join(' '));
   row.hidden=Boolean(level&&row.dataset.trackLevel!==level)||!normalizeSearchTerm(query).split(' ').every(term=>match.includes(term));
  }
  root.querySelector('.song-tracks').scrollTop=0;
  if(scope!=='combined')songSearchQuery=query;
  EPFilters.save(filterKey(),{level,query});
  EPFilters.show(root.querySelector('.song-filters'),{level,query},()=>{
   level='';
   query='';
   root.querySelector('#song-search').value='';
   paintFilter();
   root.querySelector('[data-song-level=""]').focus({preventScroll:true});
  });
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
  root.querySelector('.song-intro').hidden=scope==='combined';
  root.querySelector('.song-intro').innerHTML=scope==='combined'?'':`
   <h1>${T(...epLabel('songs'))}</h1>
   <p>${T('تابع صورة الموقف مع الجملة، وردّد الكلمات المضيئة.',
    'Follow the scene with its sentence, and sing along with the highlighted words.')}</p>`;
  const collections=root.querySelector('.song-collections');
  collections.hidden=scope==='combined';
  collections.setAttribute('aria-label',T('مجموعة الأغاني','Song collection'));
  collections.innerHTML=scope==='combined'?'':[
   ['foundation','الأنماط الأساسية','Foundation patterns'],['reference','بقية الأنماط','More patterns']
  ].map(([id,ar,en])=>`<button class="secondary" type="button" data-song-collection="${id}" aria-pressed="${scope===id}">
   ${T(ar,en)}${catalog?.[id].length?` <bdi>${catalog[id].length}</bdi>`:''}</button>`).join('');
  const message=root.querySelector('.song-loading');
  message.hidden=Boolean(tracks?.length);
  root.querySelector('.song-layout').hidden=!tracks?.length;
  if(!tracks?.length){
   message.innerHTML=loadFailed||catalog&&!loading?
    `<p role="status">${T('تعذّر تحميل قائمة الأغاني.','Could not load the song list.')}</p>
     <button class="secondary" type="button" data-song-retry>${T('أعد المحاولة','Retry')}</button>`:
    `<p role="status">${T('جارٍ تحميل الأغاني…','Loading songs…')}</p>`;
   return;
  }
  root.querySelector('#song-list-title').textContent=T('قائمة الأغاني','Songs');
  root.querySelector('[data-song-list]').textContent=T('قائمة الأغاني ↓','Song list ↓');
  root.querySelector('#song-lyrics-title').textContent=T('كلمات الأغنية','Lyrics');
  paintTranscriptButton();
  root.querySelector('.song-sync-label').textContent=T('متابعة مع الغناء','Synced to the vocals');
  const filters=root.querySelector('.song-filters');
  filters.setAttribute('aria-label',T('فلترة قائمة الأغاني حسب المستوى','Filter songs by level'));
  filters.innerHTML=['',...Object.keys(learningLevelNames)].map(value=>
   `<button type="button" data-song-level="${value}">${value||T('الكل','All')}</button>`).join('');
  filters.insertAdjacentHTML('afterbegin',`<input type="search" id="song-search" value="${H(query)}"
   aria-label="${T('ابحث في الأغاني','Search songs')}" placeholder="${T('عنوان الأغنية أو موضوعها','Song title or topic')}">`);
  filters.querySelector('#song-search').oninput=event=>{query=event.target.value;paintFilter()};
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
  if(!audio.hasAttribute('src'))audio.src=selected.path;
 }

 async function loadTracks(){
  if(loading)return;
  loading=true;
  loadFailed=false;
  paintPage();
  try{
   const [data,texts,lineTimes,reference,referenceSync,practiceData]=await Promise.all([
    songCatalogReady.then(rows=>rows||epFetchJSON('song-library.json')),epFetchJSON('song-lyrics.json'),
    epFetchJSON('song-timing.json').catch(()=>({})),
    referenceSongCatalogReady.then(rows=>rows||epFetchJSON('reference-song-library.json')).catch(()=>null),
    epFetchJSON('reference-song-sync.json').catch(()=>null),epFetchJSON('song-practice.json').catch(()=>null)
   ]);
   if(!Array.isArray(data)||!data.length||!data.every(song=>texts?.[song.id]?.text)){
    throw Error('Song catalog or lyrics are unavailable');
   }
   const references=Array.isArray(reference)?reference.filter(song=>referenceSync?.lyrics?.[song.id]?.text):[];
   lyrics={...texts,...referenceSync?.lyrics};
   timings={...lineTimes,...referenceSync?.timings};
   practice=practiceData?.tracks||{};
   catalog={foundation:data,reference:references,combined:[...data,...references]};
   songSearchRows=catalog.combined;
   if(root?.isConnected)setTracks();
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
  if(!Number.isFinite(seconds)||!force&&checkpoint?.id===selected.id&&Math.abs(checkpoint.seconds-seconds)<2)return;
  storeCheckpoint({id:selected.id,seconds});
 }

 function failPlayback(current,reason){
  if(current!==attempt)return;
  clearTimeout(bufferTimer);
  if(sequence==='playing'){
   rememberPlaylist(true);
   if(!current?.retried&&reason!=='NotAllowedError'){
    playTrack(selected,{offset:checkpoint.seconds,retried:true,reload:true});
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

 function playTrack(track,{offset=0,retried=false,reload=false}={}){
  const player=audio;
  clearTimeout(bufferTimer);
  const current={offset:offset>0?offset:null,retried};
  attempt=current;
  playbackFailed=false;
  if(track!==selected){
   selected=track;
   player.src=track.path;
   paintSelection();
   revealPlayingTrack();
  }else{
   if(reload||player.error)player.load();
   if(player.readyState>=1){
    player.currentTime=Math.min(offset,Math.max(0,(player.duration||offset)-.05));
    current.offset=null;
   }
   paintPlaybackStatus();
  }
  if(sequence==='playing')storeCheckpoint({id:track.id,seconds:offset});
  Promise.resolve(player.play()).catch(error=>{
   if(error.name!=='AbortError')failPlayback(current,error.name);
  });
  watchBuffer();
 }

 function toggleSequence(resume=false){
  if(!resume&&sequence==='playing'){
   rememberPlaylist(true);
   sequence='paused';
   clearTimeout(bufferTimer);
   attempt=null;
   audio.pause();
   paintPlaybackStatus();
   return;
  }
  const saved=resume&&tracks.find(track=>track.id===checkpoint?.id);
  sequence='playing';
  playTrack(saved||tracks[0],{offset:saved&&Number.isFinite(checkpoint.seconds)?Math.max(0,checkpoint.seconds):0});
 }

 function startPlaylist(target){
  if(target!==host)return;
  pendingStart=!tracks?.length;
  if(!pendingStart)toggleSequence(Boolean(checkpoint));
 }

 function pauseSongPlayer(){
  if(!audio)return;
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

 function setTracks(){
  tracks=catalog?.[scope];
  selected=tracks?.[0];
  if(selected)audio.src=selected.path;
  else audio.removeAttribute('src');
 }

 function selectCollection(next){
  pauseSongPlayer();
  scope=next;
  sequence='off';
  playbackFailed=false;
  checkpoint=null;
  try{checkpoint=JSON.parse(localStorage.getItem(playlistKey())||'null')}catch{}
  const saved=EPFilters.read(filterKey(),{level:'',query:''});
  level=saved.level;
  query=scope==='combined'?saved.query:songSearchQuery;
  setTracks();
 }

 function closePlayer(target){
  if(!root||target!==host)return;
  pauseSongPlayer();
  cancelAnimationFrame(lyricFrame);
  pendingStart=false;
  activeLine=activeWord=null;
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
    <div class="song-collections" role="group"></div>
    <div class="panel song-loading"></div>
    <div class="song-layout" hidden>
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
         <button type="button" class="primary song-play-all" data-songs-play-all></button>
         <button type="button" class="secondary" data-songs-resume hidden></button>
         <button type="button" class="secondary" data-song-practice-toggle aria-expanded="false" aria-controls="song-practice"></button>
         <button type="button" class="secondary" data-song-list></button>
        </div>
        <p class="song-queue-status" role="status"></p>
        <p class="song-playback-status" role="status"></p>
       </div>
      </div>
      <section class="song-lyrics" aria-labelledby="song-lyrics-title">
       <section class="song-practice" id="song-practice" aria-labelledby="song-practice-title" hidden>
        <h3 id="song-practice-title" aria-live="polite"></h3>
        <div class="song-practice-prompt"></div>
        <div class="song-practice-actions">
         <button type="button" class="secondary" data-song-practice-pause hidden></button>
         <button type="button" class="secondary" data-song-practice-list aria-expanded="false" aria-controls="song-practice-examples"></button>
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
     </section>
     <section class="panel song-list" aria-labelledby="song-list-title">
      <h2 id="song-list-title"></h2>
      <div class="song-filters" role="group"></div>
      <ul class="song-tracks"></ul>
     </section>
     <section class="panel song-patterns"></section>
    </div>
   </section>`;
  root=host.querySelector('.song-library');
  audio=root.querySelector('audio');
  language=null;
  selectCollection(host.id==='reference-song-player'?'combined':songLibraryScope);
  const player=audio;
  player.addEventListener('play',()=>{
   if(player!==audio)return;
   stopOtherAudio();
   playbackFailed=false;
   paintPlaybackStatus();
   paintPracticeTransport();
   paintSongTiming();
   const target=window.innerHeight<450?'.song-lyrics':'.song-player';
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
   paintSongTiming();
   paintPracticeTransport();
   if(sequence!=='playing')return;
   clearTimeout(bufferTimer);
   const next=tracks[tracks.indexOf(selected)+1];
   if(next){
    playTrack(next);
    return;
   }
   sequence='finished';
   attempt=null;
   storeCheckpoint(null);
   paintPlaybackStatus();
  });
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button)return;
   if(button.dataset.songCollection){
    if(scope===button.dataset.songCollection)return;
    songSearchQuery='';
    EPFilters.save('songs',{level:'',query:''});
    songLibraryScope=button.dataset.songCollection;
    selectCollection(songLibraryScope);
    paintPage();
    root.querySelector('[aria-pressed="true"][data-song-collection]')?.focus({preventScroll:true});
   }else if(button.hasAttribute('data-song-level')){
    level=button.dataset.songLevel;
    paintFilter();
   }else if(button.hasAttribute('data-songs-play-all')){
    toggleSequence();
   }else if(button.hasAttribute('data-songs-resume')){
    toggleSequence(true);
   }else if(button.hasAttribute('data-song-list')){
    root.querySelector('.song-list').scrollIntoView({block:'start'});
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
   }else if(button.hasAttribute('data-song-transcript')){
    const transcript=root.querySelector('#song-full-lyrics');
    transcript.hidden=!transcript.hidden;
    paintTranscriptButton();
    if(!transcript.hidden&&activeLine)transcript.scrollTop=activeLine.parentElement.offsetTop;
   }else if(button.dataset.songTrack){
    rememberPlaylist(true);
    sequence='off';
    const track=tracks.find(song=>song.id===button.dataset.songTrack);
    playTrack(track,{offset:track===selected&&!audio.ended?audio.currentTime:0});
   }else if(button.dataset.songLesson){
    openLinkedLearning('lesson',Number(button.dataset.songLesson));
   }else if(button.dataset.songReference){
    openLinkedLearning('reference',button.dataset.songReference);
   }else if(button.dataset.songPracticeModel||button.dataset.songExampleTime){
    rememberPlaylist(true);
    sequence='off';
    if(button.dataset.songPracticeModel)manualPractice=true;
    playTrack(selected,{offset:Number(button.dataset.songPracticeModel??button.dataset.songExampleTime)/1000});
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
  const display=`${EP.prefs.language}|${EP.prefs.arabic}`;
  const changeScope=scope!=='combined'&&scope!==songLibraryScope;
  const changeQuery=scope!=='combined'&&query!==songSearchQuery;
  if(changeScope)selectCollection(songLibraryScope);
  if(changeQuery)query=songSearchQuery;
  if(language===display&&!changeScope&&!changeQuery)return;
  language=display;
  if(catalog||loading||loadFailed)paintPage();
  else loadTracks();
 }
 renderPlayer.pause=pauseSongPlayer;
 renderPlayer.close=closePlayer;
 renderPlayer.start=startPlaylist;
 return renderPlayer;
})();
