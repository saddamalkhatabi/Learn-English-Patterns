import os
#!/usr/bin/env python3
"""Resume Kokoro production; validate and save each voice on its exact MP3."""
import argparse,datetime,hashlib,json,pathlib,shutil,sys,tempfile
from recording_validation import validate,measured_duration,VOICES
ROOT=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve()
def save(path,data):
 temp=path.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');temp.replace(path)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--manifest',default='public/pilot.json');ap.add_argument('--limit',type=int,default=0);ap.add_argument('--verify-only',action='store_true');args=ap.parse_args()
 manifest=(ROOT/args.manifest).resolve();assert manifest.is_relative_to(ROOT)
 data=json.loads(manifest.read_text(encoding='utf-8'));pending=[];available={};reused=0
 for name in ['pilot','supplement','source-corpus']:
  file=ROOT/'public'/f'{name}.json'
  if file.is_file():
   for sentence in json.loads(file.read_text(encoding='utf-8'))['sentences']:
    for gender,rec in sentence['recordings'].items():available[(sentence['en'],gender)]=rec
 legacy=ROOT/'production/legacy-ready-audio.json'
 if legacy.is_file():
  for row in json.loads(legacy.read_text(encoding='utf-8'))['records']:available.setdefault((row['text'],row['gender']),row['recording'])
 for s in data['sentences']:
  assert set(s['recordings'])==set(VOICES)
  for gender,r in s['recordings'].items():
   target=(ROOT/'public'/r['path']).resolve();assert target.is_relative_to(ROOT/'public/assets/audio')
   if not validate(r,target,s['en'],gender):
    prior=available.get((s['en'],gender));source=ROOT/'public'/prior['path'] if prior else None
    if prior and validate(prior,source,s['en'],gender):
     path=r['path'];target.parent.mkdir(parents=True,exist_ok=True)
     if source.resolve()!=target.resolve():shutil.copy2(source,target)
     r.clear();r.update({**prior,'path':path,'reuse_from':prior['path']});reused+=1
    else:pending.append((s,gender,r,target))
 if reused:save(manifest,data);print(f'Reused {reused} exact text/voice assets before synthesis',flush=True)
 if args.verify_only:
  assert not pending,f'{len(pending)} missing/invalid recordings';print('PASS: exact recording hashes, duration and measured cues');return
 if not pending:print('PASS: recordings reusable; no model downloaded');return
 sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'upstream'))
 from acoustic_pattern_fallback import ForcedAligner
 from generate_audio import write_clip
 import generate_audio
 generate_audio.ROOT=ROOT
 from kokoro import KPipeline
 import torch
 torch.set_num_threads(2)
 pipeline=KPipeline(lang_code='a',repo_id='hexgrad/Kokoro-82M');aligner=ForcedAligner();count=0
 for s,gender,r,target in pending:
  target.parent.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory(dir=ROOT) as directory:
   temp=pathlib.Path(directory)/'recording.mp3';write_clip(pipeline,VOICES[gender],s['en'],temp)
   cues=aligner.align(temp,s['en']);ms=measured_duration(temp)
   row={**r,'text':s['en'],'voice_id':VOICES[gender],'duration_ms':ms,'sha256':hashlib.sha256(temp.read_bytes()).hexdigest(),'words':[{'index':i,'text':s['en'].split()[i],'start_ms':a,'end_ms':b} for i,a,b in cues],'alignment':'wav2vec2-ctc-exact-mp3','status':'structurally_verified','auditory_review':'pending','ctc_transcript':aligner.last_transcript,'produced_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'model':'hexgrad/Kokoro-82M','pipeline_version':'kokoro-0.9.4'}
   row['duration_basis']='decoded-pcm-24000-mono'
   assert validate(row,temp,s['en'],gender)
   if target.exists():
    backup=ROOT/'production-backups'/hashlib.sha256(target.read_bytes()).hexdigest()/target.name;backup.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(target,backup)
   staging=target.with_suffix('.mp3.tmp');shutil.copyfile(temp,staging);staging.replace(target)
   r.clear();r.update(row);save(manifest,data);count+=1
   print(f'VERIFIED {s["id"]}/{gender} {ms}ms {len(cues)} measured words',flush=True)
   if args.limit and count>=args.limit:break
 print(f'Produced {count}; pending before run {len(pending)}',flush=True)
if __name__=='__main__':main()
