const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Player=require('../public/route-player.js');const source=JSON.parse(fs.readFileSync('public/pilot.json'));
function make(data=source,stored,hostTimers={}){
 const memory=new Map(stored?[['nasaq-route-v2',JSON.stringify(stored)]]:[]);let callbacks=[];
 const audio={events:{},attrs:{},currentTime:0,readyState:1,paused:true,playbackRate:1,
 addEventListener(n,f){(this.events[n]||=[]).push(f)},setAttribute(n,v){this.attrs[n]=v},getAttribute(n){return this.attrs[n]},removeAttribute(n){delete this.attrs[n]},load(){this.currentTime=0},async play(){this.paused=false},pause(){this.paused=true},fire(n){for(const f of this.events[n]||[])f()}};
 const dataCopy=JSON.parse(JSON.stringify(data));for(const s of dataCopy.sentences)for(const r of Object.values(s.recordings))Object.assign(r,{sha256:'test-only',duration_ms:3000,status:'structurally_verified',words:[{start_ms:0,end_ms:1000}]});
 const storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
 const p=new Player({data:dataCopy,audio,storage,setTimer:f=>{callbacks.push(f);return callbacks.length},clearTimer:()=>{},now:()=>Date.now(),...hostTimers});return {p,audio,storage,timer:()=>callbacks.shift()?.()};
}
test('visits all authored distinct sentences, all 12 per pattern, alternating across boundaries',async()=>{const {p,audio}=make();const visited=[];await p.play();for(let i=0;i<source.sentences.length+100&&p.session.phase!=='finished';i++){if(p.session.phase!=='interlude')visited.push([p.sentence.id,p.session.voice]);audio.fire('ended');if(p.session.phase==='comparison')p.continueAfterComparison()}assert.equal(p.session.phase,'finished');assert.equal(p.progress,100);assert.equal(visited.length,source.sentences.length);assert.equal(new Set(visited.map(x=>x[0])).size,source.sentences.length);assert.deepEqual(visited.map(x=>x[0]),source.pattern_order.flatMap(id=>source.sentences.filter(s=>s.pattern_id===id).map(s=>s.id)));assert(visited.every((x,i)=>x[1]===(i%2?'female':'male')));assert.equal(p.session.completed.length,source.sentences.length)});
test('pause and new instance restore exact sentence, audio offset and same voice',async()=>{const {p,audio,storage}=make();p.jumpTo('want-02');await p.play();audio.currentTime=1.42;audio.fire('timeupdate');p.pause();const saved=JSON.parse(storage.getItem('nasaq-route-v2'));const next=make(source,saved);assert.equal(next.p.sentence.id,'want-02');assert.equal(next.p.session.voice,'female');await next.p.play();assert.equal(next.audio.currentTime,1.42);assert.equal(next.audio.getAttribute('src'),'assets/audio/want-02-female.mp3')});
test('interactive mode holds current sentence until learner continues',async()=>{const {p,audio}=make();p.configure({patternIds:[1],mode:'interactive'});await p.play();audio.fire('ended');assert.equal(p.session.phase,'exercise');assert.equal(p.session.cursor,0);assert.equal(p.running,false);p.continueAfterExercise();assert.equal(p.session.cursor,1);assert.equal(p.session.voice,'female')});
test('selection and learning-stage filters preserve authored sequence',()=>{const {p}=make();assert.equal(p.configure({patternIds:[13,2],stage:3}),4);assert.deepEqual(p.session.ids,['need-05','need-06','have-05','have-06'])});
test('explicit other-voice replay does not advance and new sentences alternate by route index',async()=>{const {p,audio}=make();p.configure({patternIds:[1]});await p.play();p.otherVoice();assert.equal(p.sentence.id,'want-01');assert.equal(p.session.voice,'female');audio.fire('ended');assert.equal(p.sentence.id,'want-02');assert.equal(p.session.voice,'female')});
test('unproduced recordings stop without skipping or fallback timing',async()=>{const {p}=make();delete p.recording.sha256;await p.play();assert.equal(p.running,false);assert.equal(p.session.cursor,0);assert.match(p.error,/لم يُنتج/) });
test('audio speed changes use media playbackRate; cue lookup uses currentTime',()=>{const {p,audio}=make();p.setRate(.75);assert.equal(audio.playbackRate,.75);p.session.offset=.5;assert.equal(p.wordIndex,0);p.session.offset=2;assert.equal(p.wordIndex,-1)});
test('empty stage selection does not invent a sentence',async()=>{const {p}=make();p.configure({patternIds:[],stage:6});await p.play();assert.equal(p.sentence,undefined);assert.equal(p.running,false)});
test('browser timer methods preserve their required host receiver',()=>{let called=false;const {p}=make(source,null,{setTimer:function(){assert.equal(this,globalThis);called=true;return 1},clearTimer:function(){assert.equal(this,globalThis)}});p.running=true;p.scheduleComparison();p.pause();assert(called)});
test('reading stops preserve remaining time while paused and can be extended before automatic transition',async()=>{let clock=1000,scheduled;const {p,audio}=make(source,null,{now:()=>clock,setTimer:(fn,delay)=>{scheduled={fn,delay};return 1},clearTimer:()=>{}});p.configure({patternIds:[1,13]});p.jumpTo('want-12');await p.play();audio.fire('ended');assert.equal(p.session.phase,'comparison');assert.equal(scheduled.delay,25000);clock+=5000;assert.equal(p.comparisonRemaining,20000);p.pause();clock+=10000;assert.equal(p.comparisonRemaining,20000);await p.play();assert.equal(scheduled.delay,20000);p.extendComparison(10000);assert.equal(scheduled.delay,30000);clock+=30000;scheduled.fn();assert.equal(p.sentence.id,'need-01')});
test('progress never regresses when a sentence completes into comparison',async()=>{const {p,audio}=make();p.jumpTo('want-12');await p.play();p.session.offset=p.recording.duration_ms/1000;const before=p.progress;audio.fire('ended');assert.equal(p.session.phase,'comparison');assert(p.progress>=before)});
test('purpose routes preserve their declared pattern order',async()=>{const {p,audio}=make();p.configure({patternIds:[4,12,3],routeId:'questions'});assert.equal(p.session.ids[0],'can-01');p.jumpTo('can-12');await p.play();audio.fire('ended');p.continueAfterComparison();assert.equal(p.sentence.id,'know-01');assert.equal(p.session.filters.routeId,'questions')});
test('manual advance waits for the configured reading break and then requires a click',async()=>{
 const {p,audio,timer}=make();
 p.configure({patternIds:[1,13],autoNextPattern:false,readingSeconds:5});
 p.jumpTo('want-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.session.phase,'comparison');
 assert.equal(p.comparisonDuration,5000);
 timer();
 assert.equal(p.running,false);
 assert.equal(p.sentence.id,'want-12');
 await p.play();
 assert.equal(p.sentence.id,'need-01');
});
test('an earlier full pilot expands without losing the recorded resume point',()=>{const previous={ids:source.sentences.filter(s=>[1,13,2].includes(s.pattern_id)).map(s=>s.id),cursor:5,phase:'sentence',offset:1.2,voice:'female',completed:[],filters:{patternIds:[1,13,2],stage:0,cefr:''}};const {p}=make(source,previous);assert.equal(p.session.ids.length,source.sentences.length);assert.equal(p.sentence.id,'want-06');assert.equal(p.session.offset,1.2);assert.equal(p.session.voice,'female')});
test('the contextual story plays after comparison with stable character voices before the next pattern',async()=>{const {p,audio}=make();p.configure({patternIds:[3,111],includeDialogues:true});p.jumpTo('like-12');await p.play();audio.fire('ended');p.continueAfterComparison();const seen=[];for(let i=0;i<5;i++){assert.equal(p.session.phase,'interlude');seen.push([p.sentence.id,p.session.voice]);p.otherVoice();assert.equal(p.session.voice,seen.at(-1)[1]);audio.fire('ended')}assert.deepEqual(seen,[['story-01','male'],['story-02','male'],['story-03','female'],['story-04','male'],['story-05','female']]);assert.equal(p.sentence.id,'enjoy-01');assert.equal(p.session.voice,'male')});
test('story pause restores exact character, line, rate and offset without replacing the voice',async()=>{const {p,audio,storage}=make();p.configure({patternIds:[3,111],rate:.75,includeDialogues:true});p.jumpTo('like-12');await p.play();audio.fire('ended');p.continueAfterComparison();audio.fire('ended');audio.fire('ended');assert.equal(p.sentence.id,'story-03');audio.currentTime=.87;audio.fire('timeupdate');p.pause();const restored=make(source,JSON.parse(storage.getItem('nasaq-route-v2')));await restored.p.play();assert.equal(restored.p.session.phase,'interlude');assert.equal(restored.p.sentence.id,'story-03');assert.equal(restored.p.session.voice,'female');assert.equal(restored.audio.currentTime,.87);assert.equal(restored.audio.playbackRate,.75)});
test('old complete-course sessions expand by sentence identity instead of retaining an obsolete cursor',()=>{const previousIds=source.previous_courses[0].sentence_ids,anchor=previousIds[37],previous={ids:previousIds,cursor:37,phase:'sentence',offset:1.1,voice:'female',filters:{patternIds:[],stage:0,cefr:''}};const {p}=make(source,previous);assert.equal(p.sentence.id,anchor);assert.equal(p.session.offset,1.1);assert.equal(p.session.ids.length,source.sentences.length);assert.equal(p.session.voice,'female')});

test('the standard route skips legacy stories and honours hidden reading breaks',async()=>{
 const {p,audio}=make();
 p.configure({patternIds:[3,111],readingSeconds:0});
 p.jumpTo('like-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.session.phase,'sentence');
 assert.equal(p.sentence.id,'enjoy-01');
});

test('one opted-in conversation plays once at the boundary and resumes at the saved position',async()=>{
 const data={...source,dialogues:[{id:'cafe',after:3,audio:{
  path:'assets/audio/dialogue-cafe.mp3',sha256:'test-only',duration_ms:6000,turns:[{},{}]
 }}]};
 const {p,audio,storage}=make(data);
 p.configure({patternIds:[3,111],readingSeconds:0,includeDialogues:true});
 p.jumpTo('like-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.session.phase,'dialogue');
 assert.equal(audio.getAttribute('src'),data.dialogues[0].audio.path);
 p.seek(2.5);
 p.pause();
 const next=make(data,JSON.parse(storage.getItem('nasaq-route-v2')));
 await next.p.play();
 assert.equal(next.audio.currentTime,2.5);
 next.audio.fire('ended');
 assert.equal(next.p.sentence.id,'enjoy-01');
});

test('a pattern plays multiple related recordings in order and resumes the current one',async()=>{
 const recording=id=>({path:`assets/audio/dialogue-${id}.mp3`,sha256:'test-only',duration_ms:6000,turns:[{}]});
 const data={...source,dialogues:[
  {id:'tagged',after:4,lines:[{patterns:[3,3]}],audio:recording('tagged')},
  {id:'primary',after:3,audio:recording('primary')},
  {id:'unrecorded',after:3},
  {id:'extra',after:3,audio:recording('extra')},
 ]};
 const {p,audio,storage}=make(data);
 p.configure({patternIds:[3,111],readingSeconds:0,dialoguesPerPattern:3});
 p.jumpTo('like-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.activeDialogue.id,'primary');
 audio.fire('ended');
 assert.equal(p.activeDialogue.id,'extra');
 p.seek(1.4);
 p.pause();
 const next=make(data,JSON.parse(storage.getItem('nasaq-route-v2')));
 await next.p.play();
 assert.equal(next.p.activeDialogue.id,'extra');
 assert.equal(next.audio.currentTime,1.4);
 next.audio.fire('ended');
 assert.equal(next.p.activeDialogue.id,'tagged');
 next.audio.fire('ended');
 assert.equal(next.p.sentence.id,'enjoy-01');
});

test('finished listening can replay from its first selected example',async()=>{
 const {p,audio}=make();
 p.configure({patternIds:[3],readingSeconds:0});
 p.jumpTo('like-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.session.phase,'finished');
 await p.play();
 assert.equal(p.session.phase,'sentence');
 assert.equal(p.sentence.id,'like-01');
});

test('narrated stages require hearing a complete conversation and preserve coverage on reload',async()=>{
 const cueOrder=[];
 const narrate=(phase,pattern)=>{cueOrder.push([phase,pattern.id]);return {done:Promise.resolve(true),stop(){}}};
 const data={...source,requireConversation:true,dialogues:[{id:'cafe',after:3,audio:{
  path:'assets/audio/dialogue-cafe.mp3',sha256:'test-only',duration_ms:6000,
  turns:[{start_ms:500,end_ms:2500},{start_ms:2800,end_ms:6000}]
 }}]};
 const ranges=(...spans)=>({length:spans.length,start:i=>spans[i][0],end:i=>spans[i][1]});
 const {p,audio,storage}=make(data,null,{narrate});
 p.configure({patternIds:[3,111],readingSeconds:0,dialoguesPerPattern:0});
 p.jumpTo('like-12');
 await p.play();
 assert.equal(p.session.phase,'sentence');
 audio.fire('ended');
 await new Promise(setImmediate);
 assert.deepEqual(cueOrder,[['pattern-intro',3],['explanation-intro',3],['dialogue-intro',3]]);
 assert.equal(p.session.phase,'dialogue');
 assert.equal(p.finishDialogue(),false);
 audio.played=ranges([5,6]);
 audio.fire('ended');
 assert.equal(p.session.phase,'dialogue');
 assert.equal(p.session.offset,0);
 await p.play();
 audio.played=ranges([0,3]);
 audio.currentTime=3;
 p.pause();
 const restored=make(data,JSON.parse(storage.getItem('nasaq-route-v2')),{narrate});
 await restored.p.play();
 assert.equal(restored.audio.currentTime,3);
 restored.audio.played=ranges([3,6]);
 restored.audio.fire('ended');
 await new Promise(setImmediate);
 assert.equal(restored.p.sentence.id,'enjoy-01');
 assert.deepEqual(restored.p.session.completedDialogues,['cafe']);
 assert.deepEqual(cueOrder.at(-1),['pattern-intro',111]);
});

test('a missing mandatory conversation holds the current pattern and permits retry',async()=>{
 const {p,audio}=make({...source,requireConversation:true,dialogues:[]});
 p.configure({patternIds:[3,111],readingSeconds:0});
 p.jumpTo('like-12');
 await p.play();
 audio.fire('ended');
 assert.equal(p.session.phase,'conversation-pending');
 assert.equal(p.sentence.id,'like-12');
 assert.equal(p.running,false);
 await p.play();
 assert.equal(p.session.phase,'conversation-pending');
 assert.match(p.error,/لم يتوفر تسجيل/);
});
