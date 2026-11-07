/* Nasaq sequencer: alternate BETWEEN distinct sentences; recordings remain independent. */
(function(root){
'use strict';
class NasaqRoutePlayer{
 constructor({data,audio,storage,onchange=()=>{},now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}){
  this.data=data;this.audio=audio;this.storage=storage;this.onchange=onchange;this.now=now;this.setTimer=setTimer.bind(root);this.clearTimer=clearTimer.bind(root);this.timer=null;this.running=false;this.error='';this.boundary=null;this.lastSave=0;this.generation=0;
  this.dialoguesByPattern=new Map();
  for(const dialogue of data.dialogues||[]){
   const patterns=new Set([dialogue.after,...(dialogue.lines||[]).flatMap(line=>line.patterns||[])]);
   for(const id of patterns){
    const list=this.dialoguesByPattern.get(id)||[];
    list.push(dialogue);
    this.dialoguesByPattern.set(id,list);
   }
  }
  for(const [id,list] of this.dialoguesByPattern){
   list.sort((left,right)=>Number(right.after===id)-Number(left.after===id));
  }
  let previous;try{previous=JSON.parse(storage.getItem('nasaq-route-v2'))}catch{}
  this.session={schema:2,ids:[],cursor:0,phase:'sentence',offset:0,voice:'male',voiceMode:'alternate',rate:1,mode:'listen',completed:[],autoNextPattern:true,includeDialogues:false,readingSeconds:null,...previous};
  this.session.ids=this.session.ids.filter(id=>data.sentences.some(s=>s.id===id));
  const resumeId=this.session.ids[this.session.cursor];
  const oldPilot=this.session.ids.length===36&&this.session.ids.every(id=>/^(want|need|have)-/.test(id));
  if(oldPilot&&data.sentences.length>36&&!this.session.filters?.routeId&&!this.session.expandedFromPilot){this.session.ids=data.pattern_order.flatMap(pid=>data.sentences.filter(s=>s.pattern_id===pid).map(s=>s.id));if(this.session.phase==='finished'){this.session.cursor=36;this.session.phase='sentence';this.session.offset=0;this.session.voice='male'}this.session.expandedFromPilot=true;this.save()}
  const priorFull=(data.previous_courses||[]).some(c=>c.sentence_ids.length===this.session.ids.length&&c.sentence_ids.every(id=>this.session.ids.includes(id)));
  if((this.session.fullCourse||priorFull)&&!this.session.filters?.sample&&!this.session.filters?.routeId&&!this.session.filters?.stage&&!this.session.filters?.cefr&&this.session.curriculumRevision!==data.revision){this.session.ids=data.pattern_order.flatMap(pid=>data.sentences.filter(s=>s.pattern_id===pid).map(s=>s.id));this.session.filters={...this.session.filters,patternIds:data.pattern_order};this.session.fullCourse=true;this.session.curriculumRevision=data.revision;this.save()}
  if(resumeId&&this.session.phase!=='finished'&&this.session.ids.includes(resumeId))this.session.cursor=this.session.ids.indexOf(resumeId);
  if(!this.session.ids.length)this.configure({patternIds:data.pattern_order});
  this.session.cursor=Math.min(Math.max(0,this.session.cursor),Math.max(0,this.session.ids.length-1));
  if((this.session.phase==='interlude'&&!this.session.includeDialogues)||
     (this.session.phase==='dialogue'&&(!this.session.includeDialogues||!this.activeDialogue?.audio))){
   this.moveCursor();
  }
  audio.addEventListener('timeupdate',()=>{if(!this.hasAudio)return;this.session.offset=Number.isFinite(audio.currentTime)?audio.currentTime:0;if(this.now()-this.lastSave>250){this.save();this.lastSave=this.now()}this.emit()});
  audio.addEventListener('ended',()=>{
   if(!this.running)return;
   if(this.session.phase==='sentence')this.finishSentence();
   else if(this.session.phase==='interlude')this.finishInterlude();
   else if(this.session.phase==='dialogue')this.finishDialogue();
  });
  audio.addEventListener('error',()=>{this.error='تعذر تحميل التسجيل. لم نتجاوز الجملة؛ يمكنك المحاولة مجددًا.';this.running=false;this.emit()});
  root.addEventListener?.('pagehide',()=>this.pause());
 }
 queue({patternIds=this.data.pattern_order,stage=0,cefr='',sample=0}={}){
  return [...new Set(patternIds)].filter(id=>this.data.pattern_order.includes(id)).flatMap(pid=>{
   const rows=this.data.sentences.filter(s=>s.pattern_id===pid&&(!stage||s.difficulty.stage===+stage)&&(!cefr||s.difficulty.cefr===cefr));
   if(sample===3)return rows.slice(0,3).map(s=>s.id);
   if(sample!==6||rows.length<=sample)return rows.map(s=>s.id);
   return Array.from({length:sample},(_,i)=>rows[Math.round(i*(rows.length-1)/(sample-1))].id);
  });
 }
 configure({patternIds=this.data.pattern_order,stage=0,cefr='',mode='listen',voiceMode='alternate',rate=1,autoNextPattern=true,routeId='',sample=0,includeDialogues=false,dialoguesPerPattern=includeDialogues?1:0,readingSeconds=null}={}){
  this.pause();const ids=this.queue({patternIds,stage,cefr,sample});
  this.session={schema:2,ids,cursor:0,phase:'sentence',offset:0,voice:voiceMode==='female'?'female':'male',voiceMode,mode,rate:+rate,completed:[],autoNextPattern,includeDialogues:dialoguesPerPattern!==0,dialoguesPerPattern,readingSeconds,fullCourse:!sample&&!stage&&!cefr&&!routeId&&new Set(patternIds).size===this.data.pattern_order.length,curriculumRevision:this.data.revision,filters:{patternIds,stage:+stage,cefr,routeId,sample}};this.error='';this.save();this.emit();return ids.length;
 }
 get comparisonRemaining(){return this.comparisonEndsAt?Math.max(0,this.comparisonEndsAt-this.now()):Math.max(0,this.session.comparisonRemainingMs??this.session.comparisonDurationMs??25000)}
 get comparisonDuration(){return this.session.comparisonDurationMs||25000}
 extendComparison(ms=10000){this.session.comparisonRemainingMs=this.comparisonRemaining+ms;this.session.comparisonDurationMs=Math.max(this.comparisonDuration,this.session.comparisonRemainingMs);this.comparisonEndsAt=null;if(this.running)this.scheduleComparison();this.save();this.emit()}
 get activeInterlude(){return this.data.interlude_sequences?.find(s=>s.id===this.session.interludeId)}
 get interludeRows(){return this.activeInterlude?.items.map(item=>this.data.interludes.find(s=>s.id===item.sentence_id))||[]}
 get sentence(){if(this.session.phase==='interlude'){const s=this.interludeRows[this.session.interludeCursor||0];return s?{...s,pattern_id:this.activeInterlude.after_pattern_id,group_id:this.data.patterns.find(p=>p.id===this.activeInterlude.after_pattern_id)?.group_id}:undefined}return this.data.sentences.find(s=>s.id===this.session.ids[this.session.cursor])}
 get pattern(){return this.data.patterns.find(p=>p.id===this.sentence?.pattern_id)}
 get activeDialogue(){return this.data.dialogues?.find(d=>d.id===this.session.dialogueId)}
 get dialogueLimit(){return this.session.dialoguesPerPattern??(this.session.includeDialogues?1:0)}
 dialoguesForPattern(id){return this.dialoguesByPattern.get(id)||[]}
 get hasAudio(){return ['sentence','interlude','dialogue'].includes(this.session.phase)}
 get recording(){return this.session.phase==='dialogue'?this.activeDialogue?.audio:this.sentence?.recordings[this.session.voice]}
 get progress(){if(this.session.phase==='finished')return 100;return this.session.ids.length?100*(this.session.cursor+(['comparison','between','exercise','interlude','dialogue'].includes(this.session.phase)?1:(this.recording?.duration_ms?Math.min(1,this.session.offset*1000/this.recording.duration_ms):0)))/this.session.ids.length:0}
 get wordIndex(){const ms=this.session.offset*1000;return this.recording?.words?.findIndex(w=>w.start_ms<=ms&&ms<w.end_ms)??-1}
 save(){try{this.storage.setItem('nasaq-route-v2',JSON.stringify(this.session))}catch{this.error='تعذر حفظ موضعك على هذا المتصفح.'}}
 emit(){this.onchange(this)}
 async play(){
  if(!this.sentence){this.error='اختر مسارًا يحتوي جملًا أولًا.';this.emit();return}
  if(this.session.phase==='finished'){this.session.completed=[];this.session.completedDialogues=[];this.session.completedInterludes=[];this.jumpTo(this.session.ids[0])}
  this.error='';this.running=true;
  if(this.session.phase==='comparison'){
   if(this.comparisonRemaining>0)this.scheduleComparison();
   else this.continueAfterComparison();
   this.emit();return;
  }
  if(this.session.phase==='between'){this.continueAfterComparison();return}
  if(this.session.phase==='exercise'){this.running=false;this.emit();return}
  const r=this.recording;
  const measured=this.session.phase==='dialogue'?r?.turns?.length:r?.words?.length&&['structurally_verified','auditory_sample_reviewed'].includes(r.status);
  if(!r?.sha256||!measured){this.running=false;this.error='هذا التسجيل لم يُنتج ويُتحقق منه بعد.';this.emit();return}
  const g=++this.generation;const offset=this.session.offset;
  const seek=()=>{if(g!==this.generation)return;try{this.audio.currentTime=Math.max(0,Math.min(offset,(r.duration_ms-10)/1000))}catch{}};
  if(this.audio.getAttribute('src')!==r.path){this.audio.setAttribute('src',r.path);this.audio.load();if(this.audio.readyState>=1)seek();else this.audio.addEventListener('loadedmetadata',seek,{once:true})}else seek();
  this.audio.playbackRate=this.session.rate;
  try{await this.audio.play();if(g!==this.generation||!this.running){this.audio.pause();return}this.emit()}catch(e){if(g!==this.generation)return;this.running=false;this.error='اضغط تشغيل للسماح بالصوت في متصفحك. سيبقى موضع الاستكمال محفوظًا.';this.emit()}
 }
 pause(){if(this.session?.phase==='comparison'&&this.comparisonEndsAt){this.session.comparisonRemainingMs=this.comparisonRemaining;this.comparisonEndsAt=null}this.generation++;this.running=false;if(this.audio){if(this.hasAudio&&this.audio.getAttribute('src')&&Number.isFinite(this.audio.currentTime))this.session.offset=this.audio.currentTime;this.audio.pause()}if(this.timer)this.clearTimer(this.timer);this.timer=null;if(this.session){this.save();this.emit()}}
 finishSentence(){const sid=this.sentence.id;if(!this.session.completed.includes(sid))this.session.completed.push(sid);if(this.session.mode==='interactive'){this.audio.pause();this.session.phase='exercise';this.running=false;this.save();this.emit();return}this.advance()}
 advance(){
  const next=this.data.sentences.find(s=>s.id===this.session.ids[this.session.cursor+1]);
  if(next?.pattern_id!==this.sentence?.pattern_id){
   this.audio.pause();this.session.offset=0;
   const seconds=this.session.readingSeconds??(Number(root.EP?.prefs?.readingSeconds)||25);
   if(seconds===0){
    if(this.session.autoNextPattern||!next)this.continueAfterComparison();
    else{this.session.phase='between';this.running=false;this.save();this.emit()}
    return;
   }
   this.session.phase='comparison';this.session.comparisonDurationMs=seconds*1000;this.session.comparisonRemainingMs=this.session.comparisonDurationMs;this.comparisonEndsAt=null;this.save();if(this.running)this.scheduleComparison();this.emit();return
  }
  this.moveCursor();
 }
 scheduleComparison(){if(this.timer)this.clearTimer(this.timer);const remaining=this.comparisonRemaining;this.comparisonEndsAt=this.now()+remaining;this.timer=this.setTimer(()=>{this.timer=null;this.comparisonEndsAt=null;this.session.comparisonRemainingMs=0;if(this.running&&this.session.autoNextPattern)this.continueAfterComparison();else{this.running=false;this.save();this.emit()}},remaining)}
 continueAfterComparison(){
  if(this.timer)this.clearTimer(this.timer);
  this.timer=null;this.comparisonEndsAt=null;this.session.comparisonRemainingMs=null;
  const pid=this.data.sentences.find(s=>s.id===this.session.ids[this.session.cursor])?.pattern_id;
  if(this.session.includeDialogues){
   const available=this.dialoguesForPattern(pid).filter(dialogue=>dialogue.audio);
   const selected=this.dialogueLimit===-1?available:available.slice(0,this.dialogueLimit);
   if(selected.length){
    this.session.dialogueIds=selected.map(dialogue=>dialogue.id);
    this.session.dialogueCursor=0;
    this.startDialogue(selected[0].id);
    return;
   }
   const sequence=!this.data.dialogues&&this.data.interlude_sequences?.find(s=>s.after_pattern_id===pid&&!(this.session.completedInterludes||[]).includes(s.id));
   if(sequence){this.session.interludeId=sequence.id;this.session.interludeCursor=0;this.session.phase='interlude';this.session.offset=0;this.session.voice=sequence.items[0].voice;this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();if(this.running)this.play();return}
  }
  this.moveCursor();
 }
 startDialogue(id){
  this.generation++;
  this.audio.pause();
  this.session.dialogueId=id;this.session.phase='dialogue';this.session.offset=0;
  this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();
  if(this.running)this.play();
 }
 finishDialogue(){
  this.session.completedDialogues=[...new Set([...(this.session.completedDialogues||[]),this.session.dialogueId])];
  const next=(this.session.dialogueCursor??0)+1;
  if(this.session.dialogueIds?.[next]){
   this.session.dialogueCursor=next;
   this.startDialogue(this.session.dialogueIds[next]);
   return;
  }
  this.session.dialogueIds=[];this.session.dialogueCursor=0;
  this.moveCursor();
 }
 finishInterlude(){const sequence=this.activeInterlude;if(!sequence)return;this.generation++;this.audio.pause();this.session.offset=0;if((this.session.interludeCursor||0)+1<sequence.items.length){this.session.interludeCursor++;this.session.voice=sequence.items[this.session.interludeCursor].voice;this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();if(this.running)this.play();return}this.session.completedInterludes=[...new Set([...(this.session.completedInterludes||[]),sequence.id])];if(this.session.autoNextPattern===false){this.session.phase='comparison';this.running=false;this.save();this.emit();return}this.moveCursor()}
 jumpInterlude(index){const sequence=this.activeInterlude;if(!sequence?.items[index])return false;this.pause();this.session.phase='interlude';this.session.interludeCursor=index;this.session.offset=0;this.session.voice=sequence.items[index].voice;this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();this.play();return true}
 continueAfterExercise(){this.session.phase='sentence';this.running=true;this.advance()}
 moveCursor(){const keepPlaying=this.running;this.generation++;this.audio.pause();if(this.session.cursor+1>=this.session.ids.length){this.session.phase='finished';this.running=false;this.session.offset=0;this.save();this.emit();return}this.session.cursor++;this.session.phase='sentence';this.session.offset=0;this.session.voice=this.session.voiceMode==='alternate'?(this.session.cursor%2?'female':'male'):this.session.voiceMode;this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();if(keepPlaying)this.play()}
 jumpTo(id){const idx=this.session.ids.indexOf(id);if(idx<0)return false;this.pause();this.session.cursor=idx;this.session.phase='sentence';this.session.offset=0;this.session.voice=this.session.voiceMode==='alternate'?(idx%2?'female':'male'):this.session.voiceMode;this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();return true}
 otherVoice(){if(this.session.phase!=='sentence')return;const was=this.running;this.pause();this.session.voice=this.session.voice==='male'?'female':'male';this.session.offset=0;this.session.phase='sentence';this.audio.removeAttribute('src');this.audio.load();this.save();this.emit();if(was)this.play()}
 setRate(rate){this.session.rate=+rate;this.audio.playbackRate=+rate;this.save();this.emit()}
 seek(seconds){if(!this.hasAudio)return;const max=(this.recording?.duration_ms||0)/1000;this.session.offset=Math.max(0,Math.min(+seconds,max));if(this.audio.getAttribute('src')===this.recording?.path)this.audio.currentTime=this.session.offset;this.save();this.emit()}
}
if(typeof module!=='undefined')module.exports=NasaqRoutePlayer;else root.NasaqRoutePlayer=NasaqRoutePlayer;
})(typeof window!=='undefined'?window:globalThis);
