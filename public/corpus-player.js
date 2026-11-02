(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.NasaqCorpusPlayer=api})(typeof globalThis!=='undefined'?globalThis:this,function(){
 class CorpusPlayer{
  constructor({sentences,audio,storage,onChange=()=>{},beforePlay=()=>{}}){this.rows=new Map(sentences.map(s=>[s.id,s]));this.audio=audio;this.storage=storage;this.onChange=onChange;this.beforePlay=beforePlay;this.error='';this.state={ids:[],cursor:0,voice:'male',offset:0,rate:.85,auto:true,complete:false};
   try{const s=JSON.parse(storage?.getItem('nasaq-corpus-session-v1'));if(s&&Array.isArray(s.ids)){const selected=s.ids[s.cursor],ids=s.ids.filter(id=>this.ready(this.rows.get(id)));this.state={...this.state,...s,ids,cursor:Math.max(0,ids.indexOf(selected)),voice:s.voice==='female'?'female':'male',offset:Math.max(0,Number(s.offset)||0),rate:[.65,.75,.85,1,1.15].includes(s.rate)?s.rate:.85}}}catch{}
   for(const e of ['timeupdate','pause','ratechange','seeked'])audio.addEventListener(e,()=>{if(this.loading)return;this.state.offset=audio.currentTime||0;this.save();this.onChange(this)});
   audio.addEventListener('ended',()=>this.ended());audio.addEventListener('error',()=>{this.error='تعذر تحميل التسجيل. تحقق من الاتصال ثم حاول مجددًا.';this.onChange(this)});
   audio.addEventListener('loadedmetadata',()=>{if(!this.loading)return;audio.currentTime=Math.min(this.state.offset,Math.max(0,(audio.duration||Infinity)-.02));audio.playbackRate=this.state.rate;this.loading=false;if(this.resumeRequested)this.play();else this.onChange(this)});
  }
  ready(s){return !!s&&['male','female'].every(g=>s.recordings?.[g]?.sha256&&s.recordings[g].words?.length)}
  get sentence(){return this.rows.get(this.state.ids[this.state.cursor])}
  get recording(){return this.sentence?.recordings?.[this.state.voice]}
  save(){try{this.storage?.setItem('nasaq-corpus-session-v1',JSON.stringify(this.state))}catch{}}
  load(play=false){const r=this.recording;if(!r)return;this.loading=true;this.audio.pause();this.resumeRequested=play;this.error='';this.audio.src=r.path;this.audio.playbackRate=this.state.rate;this.audio.load();this.save();this.onChange(this)}
  start(ids,id,voice='male'){const ready=ids.filter(x=>this.ready(this.rows.get(x)));if(!ready.includes(id))return false;this.audio.pause();this.state={...this.state,ids:ready,cursor:ready.indexOf(id),voice,offset:0,complete:false};this.load(true);return true}
  async play(){if(!this.recording)return;if(this.audio.getAttribute('src')!==this.recording.path){this.load(true);return}if(this.loading){this.resumeRequested=true;return}this.beforePlay();this.state.complete=false;try{await this.audio.play();this.error=''}catch{this.error='اضغط تشغيل لبدء الاستماع.'}this.save();this.onChange(this)}
  pause(){this.resumeRequested=false;this.audio.pause();if(!this.loading)this.state.offset=this.audio.currentTime||0;this.save();this.onChange(this)}
  move(delta){const next=this.state.cursor+delta;if(next<0||next>=this.state.ids.length)return false;this.state.cursor=next;this.state.offset=0;this.state.voice=this.state.voice==='male'?'female':'male';this.state.complete=false;this.load(true);return true}
  ended(){this.state.offset=0;if(this.state.auto&&this.move(1))return;this.state.complete=this.state.cursor===this.state.ids.length-1;this.save();this.onChange(this)}
  switchVoice(){const playing=!this.audio.paused;this.state.offset=this.audio.currentTime||0;this.state.voice=this.state.voice==='male'?'female':'male';this.load(playing)}
  rate(value){if(![.65,.75,.85,1,1.15].includes(Number(value)))return;this.state.rate=Number(value);this.audio.playbackRate=this.state.rate;this.save();this.onChange(this)}
  seek(value){if(!this.recording||this.loading)return;this.audio.currentTime=Math.max(0,Math.min(Number(value)||0,this.recording.duration_ms/1000));this.state.offset=this.audio.currentTime;this.save();this.onChange(this)}
  cue(){const ms=this.audio.currentTime*1000;return this.recording?.words.findIndex(w=>ms>=w.start_ms&&ms<w.end_ms)??-1}
 }
 return {CorpusPlayer};
});
