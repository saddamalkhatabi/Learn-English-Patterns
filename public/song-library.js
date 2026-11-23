let songSearchRows=[],songSearchQuery=EPFilters.read('songs',{query:''}).query;
const songCatalogReady=epFetchJSON('song-library.json')
 .then(rows=>{songSearchRows=Array.isArray(rows)?rows:[];return rows}).catch(()=>null);
function filterSongsByTitle(title){
 songSearchQuery=title;
 const input=$('#song-search');
 if(input){input.value=title;input.dispatchEvent(new Event('input',{bubbles:true}))}
}
const renderSongLibrary=(()=>{
 let tracks, lyrics, timings={}, selected, level=EPFilters.read('songs',{level:''}).level, root, audio, language;
 let loading=false, loadFailed=false, playbackFailed=false;
 let sequence='off';
 let timeline=[],sceneCues=[],focusLines=[],shownCue,activeCue,activeScene,activeLine,activeWord,focusedWord,lyricFrame;
 let preloadedScenes=new Set();
 const stopOtherAudio=stopSpeech;
 stopSpeech=function(options){
  audio?.pause();
  stopOtherAudio(options);
 };

 function timeLabel(seconds){
  return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
 }

 function paintPlaybackStatus(){
  const status=root.querySelector('.song-playback-status');
  status.textContent=playbackFailed?T('تعذّر تشغيل الأغنية. اختر عنوانها للمحاولة من جديد.','Could not play the song. Choose its title to retry.'):'';
  const playAll=root.querySelector('[data-songs-play-all]');
  playAll.textContent=sequence==='playing'?
   T('إيقاف تشغيل الكل','Stop playlist'):T('▶ تشغيل الأغاني كلها','▶ Play all songs');
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

 function prepareSongStage(){
  timeline=timings[selected.id]?.lines||[];
  const byLine=new Map(timeline.map(cue=>[cue.line,cue]));
  const {text,highlights,scenes=[]}=lyrics[selected.id];
  focusLines=text.split('\n').map((line,index)=>lyricLine(line,highlights[index],byLine.get(index)?.words));
  sceneCues=scenes.flatMap((scene,index)=>{
   const purpose=byLine.get(scene.purposeLine),example=byLine.get(scene.line);
   if(!purpose&&!example)return [];
   return [{...scene,pattern:selected.patterns[index],start:(purpose||example).start_ms,end:(example||purpose).end_ms}];
  });
  const panel=root.querySelector('.song-lyrics-text');
  panel.innerHTML=focusLines.map((line,index)=>byLine.has(index)?
   `<span class="song-lyric-line" data-song-line="${index}">${line}</span>`:line).join('\n');
  panel.scrollTop=0;
  root.querySelector('.song-sync-label').hidden=!timeline.length;
  const stage=root.querySelector('.song-stage');
  const focus=stage.querySelector('.song-focus-line');
  showSongLead(focus);
  focus.removeAttribute('aria-current');
  delete stage.dataset.phase;
  stage.querySelector('.song-example-translation').textContent='';
  shownCue=activeCue=activeLine=activeWord=focusedWord=undefined;
  activeScene=null;
  preloadedScenes.clear();
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
   stage.querySelector('.song-example-translation').textContent=phase==='example'&&EP.prefs.arabic?scene.pattern.ar:'';
  }
  const focus=stage.querySelector('.song-focus-line');
  if(previous!==shownCue){
   shownCue=previous;
   if(previous){
    focus.innerHTML=focusLines[previous.line];
    focus.lang='en';
    focus.dir='ltr';
   }else showSongLead(focus);
  }
  if(cue!==activeCue){
   activeCue=cue;
   if(cue)focus.setAttribute('aria-current','true');
   else focus.removeAttribute('aria-current');
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
  root.querySelector('.song-level').textContent=learningLevelLabel(selected.level);
  prepareSongStage();
  root.querySelector('.song-patterns').innerHTML=`
   <h3>${T('أنماط وأمثلة للترديد','Patterns and examples to repeat')}</h3>
   <ul>${selected.patterns.map(({id,form,en,ar})=>`
    <li>
     <small class="song-form" lang="en" dir="ltr">${H(form)}</small>
     <p class="song-example" lang="en" dir="ltr">${H(en)}</p>
     ${EP.ar(ar)}
     ${dialoguePurposeMarkup(EPPurposes.forPattern(id))}
     <button class="textlink" type="button" data-song-lesson="${id}">${T('افتح درس النمط','Open pattern lesson')}</button>
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
   const match=normalizeSearchTerm([song.title,song.topicAr,song.topicEn].join(' '));
   row.hidden=Boolean(level&&row.dataset.trackLevel!==level)||!normalizeSearchTerm(songSearchQuery).split(' ').every(term=>match.includes(term));
  }
  root.querySelector('.song-tracks').scrollTop=0;
  EPFilters.save('songs',{level,query:songSearchQuery});
  EPFilters.show(root.querySelector('.song-filters'),{level,query:songSearchQuery},()=>{
   level='';
   songSearchQuery='';
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
  root.querySelector('.song-intro').innerHTML=`
   <h1>${T(...epLabel('songs'))}</h1>
   <p>${T('تابع صورة الموقف من غرض الجملة إلى غنائها، وردّد الكلمات المضيئة.',
    'Follow the scene from the purpose to the example, and sing along with the highlighted words.')}</p>`;
  const message=root.querySelector('.song-loading');
  message.hidden=Boolean(tracks);
  if(!tracks){
   message.innerHTML=loadFailed?
    `<p role="status">${T('تعذّر تحميل قائمة الأغاني.','Could not load the song list.')}</p>
     <button class="secondary" type="button" data-song-retry>${T('أعد المحاولة','Retry')}</button>`:
    `<p role="status">${T('جارٍ تحميل الأغاني…','Loading songs…')}</p>`;
   return;
  }
  root.querySelector('.song-layout').hidden=false;
  root.querySelector('#song-list-title').textContent=T('قائمة الأغاني','Songs');
  root.querySelector('[data-song-list]').textContent=T('قائمة الأغاني ↓','Song list ↓');
  root.querySelector('#song-lyrics-title').textContent=T('كلمات الأغنية','Lyrics');
  root.querySelector('.song-transcript summary').textContent=T('كلمات الأغنية كاملة','Full lyrics');
  root.querySelector('.song-sync-label').textContent=T('متابعة مع الغناء','Synced to the vocals');
  const filters=root.querySelector('.song-filters');
  filters.setAttribute('aria-label',T('فلترة قائمة الأغاني حسب المستوى','Filter songs by level'));
  filters.innerHTML=['',...Object.keys(learningLevelNames)].map(value=>
   `<button type="button" data-song-level="${value}">${value||T('الكل','All')}</button>`).join('');
  filters.insertAdjacentHTML('afterbegin',`<input type="search" id="song-search" value="${H(songSearchQuery)}"
   aria-label="${T('ابحث في الأغاني','Search songs')}" placeholder="${T('عنوان الأغنية أو موضوعها','Song title or topic')}">`);
  filters.querySelector('#song-search').oninput=event=>{songSearchQuery=event.target.value;paintFilter()};
  root.querySelector('.song-tracks').innerHTML=tracks.map(song=>`
   <li data-track-level="${song.level}">
    <button class="song-track" type="button" data-song-track="${song.id}">
     <span class="song-play-icon" aria-hidden="true">▶</span>
     <span class="song-track-info">
      <bdi lang="en">${H(song.title)}</bdi>
      <small><bdi>${song.level}</bdi> · <bdi>${timeLabel(song.duration)}</bdi></small>
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
   const [data,texts,lineTimes]=await Promise.all([
    songCatalogReady.then(rows=>rows||epFetchJSON('song-library.json')),epFetchJSON('song-lyrics.json'),
    epFetchJSON('song-timing.json').catch(()=>({}))
   ]);
   if(!Array.isArray(data)||!data.length||!data.every(song=>texts?.[song.id]?.text)){
    throw Error('Song catalog or lyrics are unavailable');
   }
   lyrics=texts;
   timings=lineTimes;
   tracks=data;
   songSearchRows=tracks;
   selected=tracks[0];
  }catch{
   loadFailed=true;
  }finally{
   loading=false;
   if(root?.isConnected)paintPage();
  }
 }

 function failPlayback(){
  playbackFailed=true;
  sequence='off';
  paintPlaybackStatus();
 }

 function playTrack(track,{restart=false}={}){
  const player=audio;
  playbackFailed=false;
  if(track!==selected){
   selected=track;
   player.src=track.path;
   paintSelection();
   revealPlayingTrack();
  }else{
   if(player.error)player.load();
   if(restart)player.currentTime=0;
   paintPlaybackStatus();
  }
  player.play().catch(error=>{
   if(error.name==='AbortError'||player!==audio||selected!==track)return;
   failPlayback();
  });
 }

 function toggleSequence(){
  if(sequence==='playing'){
   sequence='off';
   audio.pause();
   paintPlaybackStatus();
   return;
  }
  sequence='playing';
  level='';
  paintFilter();
  playTrack(tracks[0],{restart:true});
 }

 function mount(){
  $('#app').innerHTML=`
   <section class="song-library">
    <div class="song-intro"></div>
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
         <button type="button" class="secondary" data-song-list></button>
        </div>
        <p class="song-queue-status" role="status"></p>
        <p class="song-playback-status" role="status"></p>
       </div>
      </div>
      <section class="song-lyrics" aria-labelledby="song-lyrics-title">
       <div class="song-lyrics-heading"><h3 id="song-lyrics-title"></h3><small class="song-sync-label" hidden></small></div>
       <div class="song-stage">
        <figure class="song-artwork"></figure>
        <div class="song-readalong">
         <p class="song-phase"></p>
         <div class="song-focus-line"></div>
         <p class="song-example-translation" lang="ar" dir="rtl"></p>
        </div>
       </div>
      </section>
      <details class="song-transcript">
       <summary></summary>
       <div class="song-lyrics-text" lang="en" dir="ltr" tabindex="0" role="region" aria-labelledby="song-lyrics-title"></div>
      </details>
     </section>
     <section class="panel song-list" aria-labelledby="song-list-title">
      <h2 id="song-list-title"></h2>
      <div class="song-filters" role="group"></div>
      <ul class="song-tracks"></ul>
     </section>
     <section class="panel song-patterns"></section>
    </div>
   </section>`;
  root=$('.song-library');
  audio=root.querySelector('audio');
  language=null;
  const player=audio;
  player.addEventListener('play',()=>{
   if(player!==audio)return;
   stopOtherAudio();
   playbackFailed=false;
   paintPlaybackStatus();
   paintSongTiming();
   const target=window.innerHeight<450?'.song-lyrics':'.song-player';
   root.querySelector(target).scrollIntoView({
    block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
   });
  });
  player.addEventListener('playing',()=>{
   if(player!==audio)return;
   cancelAnimationFrame(lyricFrame);
   tickSongLyrics();
  });
  for(const event of ['timeupdate','seeked','pause']){
   player.addEventListener(event,()=>{if(player===audio)paintSongTiming()});
  }
  player.addEventListener('error',()=>{
   if(player!==audio||!player.error)return;
   failPlayback();
  });
  player.addEventListener('ended',()=>{
   if(player!==audio||!player.ended||sequence!=='playing')return;
   const next=tracks[tracks.indexOf(selected)+1];
   if(next){
    playTrack(next);
    return;
   }
   sequence='finished';
   paintPlaybackStatus();
  });
  root.addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button)return;
   if(button.hasAttribute('data-song-level')){
    level=button.dataset.songLevel;
    paintFilter();
   }else if(button.hasAttribute('data-songs-play-all')){
    toggleSequence();
   }else if(button.hasAttribute('data-song-list')){
    root.querySelector('.song-list').scrollIntoView({block:'start'});
   }else if(button.dataset.songTrack){
    sequence='off';
    playTrack(tracks.find(song=>song.id===button.dataset.songTrack));
   }else if(button.dataset.songLesson){
    openLinkedLearning('lesson',Number(button.dataset.songLesson));
   }else if(button.hasAttribute('data-song-retry')){
    loadTracks();
   }
  });
 }

 window.addEventListener('hashchange',()=>{
  if(location.hash==='#songs'||!root)return;
  audio.pause();
  cancelAnimationFrame(lyricFrame);
  activeLine=activeWord=null;
  audio=null;
  root=null;
  language=null;
  playbackFailed=false;
  sequence='off';
 });

 return ()=>{
  if(!root?.isConnected)mount();
  if(language===EP.prefs.language)return;
  language=EP.prefs.language;
  if(tracks||loading||loadFailed)paintPage();
  else loadTracks();
 };
})();
