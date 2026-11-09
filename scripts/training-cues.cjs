const {spokenTrainingCue,trainingCueId,spokenComparison,spokenComparisonNote,ideaWordCueId}=require('../public/training-narration.js');
const metadata=new Map(require('../public/curriculum.json').patterns.map(p=>[p.id,p]));
const course=['pilot','expansion-media'].map(name=>require('../public/'+name+'.json'));
const patterns=course.flatMap(part=>part.patterns);
const sentences=new Map(course.flatMap(part=>part.sentences).map(row=>[row.id,row]));
const references=require('../public/teaching-index.json').sentences;
const comparisons=require('../public/comparisons.json');
const words=new Set(require('../public/idea-scenes.json').scenes.flatMap(scene=>scene.words.map(word=>word.en)));
const voices=['male','female'];
const notes=new Set(comparisons.flatMap(item=>item.samples.map(sample=>sample.sentenceId)));
const expected=Object.fromEntries([
 ...patterns.flatMap(p=>['pattern-intro','explanation-intro'].map(kind=>[trainingCueId(kind,p),spokenTrainingCue(kind,p,metadata.get(p.id))])),
 ['dialogue-intro',spokenTrainingCue('dialogue-intro')],
 ...comparisons.flatMap(item=>voices.map(voice=>[`comparison-${item.id}-${voice}`,spokenComparison(item)])),
 ...[...notes].flatMap(id=>{
  const patternId=sentences.get(id)?.pattern_id;
  const note=metadata.get(patternId)?.explanation_en||patterns.find(p=>p.id===patternId)?.lesson?.explanation_en||references[id]?.rule_en;
  return note?voices.map(voice=>[`comparison-example-${id}-${voice}`,spokenComparisonNote(note)]):[];
 }),
 ...[...words].flatMap(word=>voices.map(voice=>[ideaWordCueId(word,voice),word])),
]);
module.exports=expected;
if(require.main===module)process.stdout.write(JSON.stringify(expected));
