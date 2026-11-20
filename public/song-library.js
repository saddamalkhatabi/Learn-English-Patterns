const renderSongLibrary=(()=>{
 let tracks, lyrics, timings={}, selected, level=EPFilters.read('songs',{level:''}).level, root, audio, language;
 let loading=false, loadFailed=false, playbackFailed=false;
 let sequence='off';
 let activeLine,activeWord,lyricFrame;
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

 function lyricsMarkup({text,highlights},timeline){
  const timed=new Map(timeline.map(cue=>[cue.line,cue.words]));
  return text.split('\n').map((line,index)=>{
   if(/^\[(Verse \d+|Chorus)\]$/.test(line))return `<span class="song-verse">${H(line)}</span>`;
   const words=timed.get(index);
   const segment=(from,to)=>{
    let cursor=from,html='';
    for(const [word,[start,stop]] of (words||[]).entries()){
     if(start<from||stop>to)continue;
     html+=H(line.slice(cursor,start))+`<span data-song-word="${word}">${H(line.slice(start,stop))}</span>`;
     cursor=stop;
    }
    return html+H(line.slice(cursor,to));
   };
   let end=0, marked='';
   for(const [start,stop] of highlights[index]||[]){
    marked+=segment(end,start)+`<strong class="pattern-token">${segment(start,stop)}</strong>`;
    end=stop;
   }
   marked+=segment(end,line.length);
   return words?`<span class="song-lyric-line" data-song-line="${index}">${marked}</span>`:marked;
  }).join('\n');
 }

 function paintSongTiming(){
  if(!root||!selected||!audio)return;
  const time=audio.currentTime*1000;
  const cue=timings[selected.id]?.lines.find(line=>line.start_ms<=time&&time<line.end_ms);
  const panel=root.querySelector('.song-lyrics-text');
  if(cue?.line!==Number(activeLine?.dataset.songLine)||!activeLine?.isConnected){
   activeLine?.removeAttribute('aria-current');
   activeLine=cue?panel.querySelector(`[data-song-line="${cue.line}"]`):null;
   if(activeLine){
    activeLine.setAttribute('aria-current','true');
    const line=activeLine.getBoundingClientRect(), viewport=panel.getBoundingClientRect();
    if(line.top<viewport.top+12||line.bottom>viewport.bottom-12){
     panel.scrollTop+=line.top-viewport.top-viewport.height*.27;
    }
   }
  }
  const word=cue?.words.findIndex(([, ,start,end])=>start<=time&&time<end)??-1;
  const current=word<0?null:activeLine?.querySelector(`[data-song-word="${word}"]`);
  if(current===activeWord)return;
  activeWord?.classList.remove('song-word-current');
  activeWord=current;
  activeWord?.classList.add('song-word-current');
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
  const lyricsPanel=root.querySelector('.song-lyrics-text');
  const timeline=timings[selected.id]?.lines||[];
  lyricsPanel.innerHTML=lyricsMarkup(lyrics[selected.id],timeline);
  root.querySelector('.song-sync-label').hidden=!timeline.length;
  lyricsPanel.scrollTop=0;
  paintSongTiming();
  root.querySelector('.song-patterns').innerHTML=`
   <h3>${T('أنماط وأمثلة للترديد','Patterns and examples to repeat')}</h3>
   <ul>${selected.patterns.map(({id,form,en,ar})=>`
    <li>
     <small class="song-form" lang="en" dir="ltr">${H(form)}</small>
     <p class="song-example" lang="en" dir="ltr">${H(en)}</p>
     ${EP.ar(ar)}
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
   row.hidden=Boolean(level&&row.dataset.trackLevel!==level);
  }
  root.querySelector('.song-tracks').scrollTop=0;
  EPFilters.save('songs',{level});
  EPFilters.show(root.querySelector('.song-filters'),{level},()=>{
   level='';
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
   <p>${T('استمع وردّد مع كلمات الأغنية، وتابع الأنماط المميّزة بالأحمر.',
    'Listen and sing along, and look for the patterns highlighted in red.')}</p>`;
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
  root.querySelector('#song-lyrics-title').textContent=T('كلمات الأغنية','Lyrics');
  root.querySelector('.song-sync-label').textContent=T('متابعة مع الغناء','Synced to the vocals');
  const filters=root.querySelector('.song-filters');
  filters.setAttribute('aria-label',T('فلترة قائمة الأغاني حسب المستوى','Filter songs by level'));
  filters.innerHTML=['',...Object.keys(learningLevelNames)].map(value=>
   `<button type="button" data-song-level="${value}">${value||T('الكل','All')}</button>`).join('');
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
   const load=async file=>{
    const response=await fetch(file);
    if(!response.ok)throw Error(`Could not load ${file}`);
    return response.json();
   };
   const [data,texts,lineTimes]=await Promise.all([
    load('song-library.json'),load('song-lyrics.json'),load('song-timing.json').catch(()=>({}))
   ]);
   if(!Array.isArray(data)||!data.length||!data.every(song=>texts?.[song.id]?.text)){
    throw Error('Song catalog or lyrics are unavailable');
   }
   lyrics=texts;
   timings=lineTimes;
   tracks=data;
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
     <section class="panel song-list" aria-labelledby="song-list-title">
      <h2 id="song-list-title"></h2>
      <button type="button" class="primary song-play-all" data-songs-play-all></button>
      <div class="song-filters" role="group"></div>
      <ul class="song-tracks"></ul>
     </section>
     <section class="panel song-player" aria-labelledby="song-title">
      <div class="song-now">
       <p class="song-level"></p>
       <h2 id="song-title" dir="ltr" lang="en"></h2>
       <p class="song-topic"></p>
       <audio controls preload="none" dir="ltr" aria-labelledby="song-title"></audio>
       <p class="song-queue-status" role="status"></p>
       <p class="song-playback-status" role="status"></p>
      </div>
      <section class="song-lyrics" aria-labelledby="song-lyrics-title">
       <div class="song-lyrics-heading"><h3 id="song-lyrics-title"></h3><small class="song-sync-label" hidden></small></div>
       <div class="song-lyrics-text" lang="en" dir="ltr" tabindex="0" role="region" aria-labelledby="song-lyrics-title"></div>
      </section>
      <div class="song-patterns"></div>
     </section>
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
   root.querySelector('.song-lyrics').scrollIntoView({
    block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'
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
if(page==='songs')render();
