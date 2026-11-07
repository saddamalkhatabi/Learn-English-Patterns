const {spokenTrainingCue,trainingCueId}=require('../public/training-narration.js');
const metadata=new Map(require('../public/curriculum.json').patterns.map(p=>[p.id,p]));
const patterns=[...require('../public/pilot.json').patterns,...require('../public/expansion-media.json').patterns];
const expected=Object.fromEntries([
 ...patterns.flatMap(p=>['pattern-intro','explanation-intro'].map(kind=>[trainingCueId(kind,p),spokenTrainingCue(kind,p,metadata.get(p.id))])),
 ['dialogue-intro',spokenTrainingCue('dialogue-intro')]
]);
module.exports=expected;
if(require.main===module)process.stdout.write(JSON.stringify(expected));
