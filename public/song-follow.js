(function(root){
 const reviewPractice={kind:'review'};

 function practiceAt(windows,time,duration,ended=false){
  const active=windows.find(({start_ms,end_ms})=>start_ms<=time&&time<end_ms);
  if(active)return active;
  return ended||duration>8000&&time>=duration-8000?reviewPractice:null;
 }

 function wordAt(words=[],time){
  return words.findIndex(([, ,start,end])=>start<=time&&time<end);
 }

 function followLyrics(lines,measured,duration,{measuredOnly=false}={}){
  const cues=measured.map(cue=>({...cue,nearby:[]}));
  if(measuredOnly)return cues.sort((a,b)=>a.start_ms-b.start_ms);
  const byLine=new Map(cues.map(cue=>[cue.line,cue]));
  const missing=[];
  let previous;
  const addMissing=next=>{
   if(!missing.length)return;
   const start=previous?.end_ms??0,end=next?.start_ms??duration;
   const room=end-start;
   if(room<missing.length*600&&(next||previous)){
    (next||previous).nearby.push(...missing);
   }else if(room>0){
    const lengths=missing.map(line=>Math.max(1250,Math.min(5400,lines[line].trim().split(/\s+/).length*450)));
    const total=lengths.reduce((sum,n)=>sum+n,0);
    const span=measured.length?Math.min(total,room):room;
    const spare=room-span;
    let time=start+(previous&&next?spare/2:next?spare:0);
    missing.forEach((line,index)=>{
     const until=Math.min(end,time+span*lengths[index]/total);
     cues.push({line,start_ms:time,end_ms:until,words:[],nearby:[],approximate:true});
     time=until;
    });
   }
   missing.length=0;
  };
  for(const [line,text] of lines.entries()){
   if(!text.trim()||/^\[.*\]$/.test(text.trim()))continue;
   const exact=byLine.get(line);
   if(exact){addMissing(exact);previous=exact}
   else missing.push(line);
  }
  addMissing();
  return cues.sort((a,b)=>a.start_ms-b.start_ms);
 }
 function withEstimatedExamples(content,timing,extra,patterns){
  const lines=timing?.lines||[];
  if(!lines.length||!extra||timing.sha256!==extra.sha256)return {...content,lines};
  const byReference=new Map(patterns.map(pattern=>[pattern.referenceId,pattern]));
  const measured=new Set(content.scenes.map(scene=>scene.referenceId));
  const estimated=extra.examples.flatMap(example=>{
   const pattern=byReference.get(example.referenceId);
   return pattern&&!measured.has(example.referenceId)&&example.start_ms!=null?[{
    cue:{start_ms:example.start_ms,end_ms:example.end_ms,words:[],approximate:true},
    text:example.spoken?.en??pattern.en, translation:example.spoken?.ar??pattern.ar,
    highlights:example.spoken?.highlights??example.highlights,
    scene:{referenceId:example.referenceId,sentenceId:example.referenceId,image:example.image,
     context:example.context,spoken:example.spoken}
   }]:[];
  });
  if(!estimated.length)return {...content,lines};
  const text=content.text.split('\n');
  const scenes=new Map(content.scenes.map(scene=>[scene.line,scene]));
  const entries=lines.map(cue=>({
   cue,text:text[cue.line],translation:content.translations[cue.line],
   highlights:content.highlights[cue.line],scene:scenes.get(cue.line)
  })).concat(estimated).sort((a,b)=>a.cue.start_ms-b.cue.start_ms);
  const merged={text:entries.map(entry=>entry.text).join('\n'),lines:[],scenes:[],translations:{},highlights:{}};
  for(const [line,entry] of entries.entries()){
   merged.lines.push({...entry.cue,line});
   if(entry.scene)merged.scenes.push({...entry.scene,line});
   if(entry.translation)merged.translations[line]=entry.translation;
   if(entry.highlights?.length)merged.highlights[line]=entry.highlights;
  }
  return merged;
 }

 function songStudySteps(mode,entries=[]){
  if(mode!=='sentences'&&mode!=='purposes')return [];
  return entries.flatMap((entry,index)=>{
   const steps=[];
   if(mode==='purposes'&&entry.purpose.path)steps.push({kind:'purpose',index,path:entry.purpose.path});
   if(entry.sentence)steps.push({kind:'sentence',index,path:entry.sentence});
   return steps;
  });
 }

 function studyPictures(scenes,examples,patterns){
  const pictures=new Map();
  for(const [index,scene] of scenes.entries()){
   const id=scene.referenceId??patterns[index]?.id;
   if(id!=null&&(scene.photo||scene.image)&&!pictures.has(String(id)))pictures.set(String(id),scene);
  }
  for(const scene of examples){
   if((scene.photo||scene.image)&&!pictures.has(scene.referenceId))pictures.set(scene.referenceId,scene);
  }
  return pictures;
 }

 const api={followLyrics,withEstimatedExamples,practiceAt,reviewPractice,songStudySteps,studyPictures,wordAt};
 if(typeof module==='object')module.exports=api;
 else root.EPSongFollow=api;
})(globalThis);
