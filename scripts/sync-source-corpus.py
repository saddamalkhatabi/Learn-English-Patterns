import os
"""Promote verified voice and scene metadata into the reference library, independently."""
import argparse,hashlib,json,pathlib
from recording_validation import validate
from prepare_scenes import dimensions
ROOT=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve();ap=argparse.ArgumentParser();ap.add_argument('--require-audio',action='store_true');ap.add_argument('--require-images',action='store_true');ap.add_argument('--fast',action='store_true');args=ap.parse_args()
file=ROOT/'public/source-corpus.json';d=json.loads(file.read_text(encoding='utf-8'));plan=json.loads((ROOT/'production/plans/source-corpus-1000.json').read_text(encoding='utf-8'));rows={s['id']:s for m in plan['manifest_paths'] for s in json.loads((ROOT/m).read_text(encoding='utf-8'))['sentences']};audio=images=cues=0;paths=set();atlases=set();unavailable=[];image_cache={}
for s in d['sentences']:
 incoming=rows[s['id']];assert incoming['en']==s['en'] and incoming['ar']==s['ar'];valid=True
 for g,r in incoming['recordings'].items():
  target=(ROOT/'public'/r['path']).resolve();assert target.is_relative_to(ROOT/'public/assets/audio')
  ok=validate(r,target,s['en'],g,probe=not args.fast);valid=valid and ok
  if ok:audio+=1;cues+=len(r['words']);paths.add(r['path']);s['recordings'][g]=r
  else:unavailable.append({'id':s['id'],'voice':g})
 s['lifecycle']['audio']='structurally_verified' if valid else 'pending'
 im=incoming['image'];key=f'reference-{(s["ordinal"]-1)//12+1:03}';sidecar=ROOT/'production/reference-images'/f'{key}.json'
 if sidecar.is_file():
  meta=json.loads(sidecar.read_text(encoding='utf-8'))
  cell=(s['ordinal']-1)%12
  if meta.get('review')=='assistant visual review' and cell not in meta.get('rejected_cells',[]):
   i=(s['ordinal']-1)%12;im={'id':'scene-'+s['id'],'atlas':meta['atlas'],'sha256':meta['sha256'],'cell':i,'columns':3,'rows':4,'width':1536,'height':2048,'tile_aspect':1,'crop':{'x':i%3*512+1,'y':i//3*512+1,'width':510,'height':510},'status':'assistant-reviewed','origin':'generated_photorealistic'}
  elif cell in meta.get('rejected_cells',[]):im={**incoming['image'],'status':'review-rejected'}
  else:im={**incoming['image'],'status':'generated-pending-review'}
 p=(ROOT/'public'/im['atlas']).resolve();assert p.is_relative_to(ROOT/'public/assets/scenes');ok=False
 if im.get('sha256') and im.get('status')=='assistant-reviewed' and p.is_file():
  if str(p) not in image_cache:image_cache[str(p)]=(hashlib.sha256(p.read_bytes()).hexdigest(),dimensions(p))
  digest,size=image_cache[str(p)];c=im['crop'];ok=digest==im['sha256'] and size==(1536,2048) and c['x']>=0 and c['y']>=0 and c['width']>0 and c['height']>0 and c['x']+c['width']<=1536 and c['y']+c['height']<=2048
  assert ok,'Invalid reviewed reference atlas'
 s['image']=im
 if ok:images+=1;atlases.add(im['atlas'])
 s['lifecycle']['image']='assistant-reviewed' if ok else 'pending';s['lifecycle']['available']=valid
assert not args.require_audio or audio==len(d['sentences'])*2,'Incomplete reference audio'
assert not args.require_images or images==len(d['sentences']),'Incomplete reference scenes'
d['counts'].update({'recordings':audio,'distinct_audio_files':len(paths),'measured_word_cues':cues,'ready_audio_references':sum(s['lifecycle']['available'] for s in d['sentences']),'scenes':images,'atlases':len(atlases)})
report={'schema':1,'counts':d['counts'],'audio_validation':'hash, exact voice, exact words, monotonic measured cues and '+('duration metadata only' if args.fast else 'decoded PCM duration'),'images_validation':'SHA-256, actual dimensions, reviewed cell order and in-bounds crop','pending_recordings':unavailable,'human_listening_review':'pending','complete_audio':audio==2000,'complete_images':images==1000}
for p,obj in [(file,d),(ROOT/'public/source-corpus-audit.json',report)]:p.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
print(json.dumps(report['counts']))

