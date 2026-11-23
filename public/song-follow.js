(function(root){
 function followLyrics(lines,measured,duration){
  const cues=measured.map(cue=>({...cue,nearby:[]}));
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
 if(typeof module==='object')module.exports={followLyrics};
 else root.EPSongFollow={followLyrics};
})(globalThis);
