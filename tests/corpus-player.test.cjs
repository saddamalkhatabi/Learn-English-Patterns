const test=require('node:test'),assert=require('node:assert/strict'),{CorpusPlayer}=require('../public/corpus-player.js');
class FakeAudio{constructor(){this.listeners={};this.currentTime=0;this.duration=10;this.paused=true}addEventListener(e,f){(this.listeners[e]??=[]).push(f)}emit(e){for(const f of this.listeners[e]||[])f()}getAttribute(k){return this[k]}load(){this.currentTime=0}pause(){this.paused=true;this.emit('pause')}async play(){this.paused=false}metadata(){this.emit('loadedmetadata')}}
const rows=['a','b','c'].map(id=>({id,en:'One two.',recordings:Object.fromEntries(['male','female'].map(g=>[g,{path:id+'-'+g+'.mp3',sha256:'verified',duration_ms:10000,words:[{start_ms:0,end_ms:1000},{start_ms:1200,end_ms:1800}]}]))}));
const storage=()=>({value:null,getItem(){return this.value},setItem(k,v){this.value=v}});
test('reference route alternates voices between distinct sentences and stops at the end',()=>{const audio=new FakeAudio(),p=new CorpusPlayer({sentences:rows,audio,storage:storage()});assert(p.start(['a','b','c'],'a'));audio.metadata();assert.equal(p.state.voice,'male');audio.emit('ended');assert.equal(p.sentence.id,'b');assert.equal(p.state.voice,'female');audio.metadata();audio.emit('ended');assert.equal(p.sentence.id,'c');assert.equal(p.state.voice,'male');audio.metadata();audio.emit('ended');assert(p.state.complete);assert.equal(p.state.cursor,2)});
test('voice change preserves offset and paused state and reload restores sentence, voice and speed',()=>{const saved=storage(),audio=new FakeAudio(),p=new CorpusPlayer({sentences:rows,audio,storage:saved});p.start(['a','b','c'],'b','female');audio.metadata();audio.currentTime=3.25;p.pause();p.rate(.75);p.switchVoice();audio.metadata();assert.equal(audio.currentTime,3.25);assert(audio.paused);assert.equal(p.state.voice,'male');const nextAudio=new FakeAudio(),next=new CorpusPlayer({sentences:rows,audio:nextAudio,storage:saved});assert.equal(next.sentence.id,'b');assert.equal(next.state.rate,.75);next.load();nextAudio.metadata();assert.equal(nextAudio.currentTime,3.25);assert.equal(next.state.voice,'male')});
test('measured cue follows audio time and missing references never enter the listening queue',()=>{const audio=new FakeAudio(),p=new CorpusPlayer({sentences:[...rows,{id:'pending',recordings:{}}],audio,storage:storage()});assert(!p.start(['pending'],'pending'));p.start(['missing','a','pending'],'a');audio.metadata();audio.currentTime=1.3;assert.equal(p.cue(),1);audio.currentTime=1.1;assert.equal(p.cue(),-1);assert.deepEqual(p.state.ids,['a'])});
test('stale audio events cannot overwrite the saved offset of a restored reference plan',()=>{
 const audio=new FakeAudio(),player=new CorpusPlayer({sentences:rows,audio,storage:storage()});
 player.start(['a'],'a');audio.metadata();
 player.state={...player.state,ids:['b'],offset:3.25};
 audio.currentTime=0;audio.emit('timeupdate');player.pause();
 assert.equal(player.state.offset,3.25);
});
test('a filtered reference route remembers heard items across reloads and resets on a new selection',()=>{
 const audio=new FakeAudio(),saved=storage(),player=new CorpusPlayer({sentences:rows,audio,storage:saved});
 player.start(['a','b','c'],'a');audio.metadata();
 audio.emit('ended');audio.metadata();
 player.move(1);audio.metadata();audio.emit('ended');
 assert.deepEqual(player.state.heard,['a','c']);
 player.state.practice={pictures:['a']};player.save();
 const restored=new CorpusPlayer({sentences:rows,audio:new FakeAudio(),storage:saved});
 assert.deepEqual(restored.state.heard,['a','c']);
 assert.deepEqual(restored.state.practice.pictures,['a']);
 restored.start(['b'],'b');
 assert.deepEqual(restored.state.heard,[]);
 assert.deepEqual(restored.state.practice,{});
});
