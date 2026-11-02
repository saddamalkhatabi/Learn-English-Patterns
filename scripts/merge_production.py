import os
"""Merge only exact-plan, exact-text results; validate all paths and recordings."""
import argparse,json,pathlib,shutil
from recording_validation import validate
root=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve()
ap=argparse.ArgumentParser();ap.add_argument('--incoming',required=True);args=ap.parse_args();count=0
for result_path in sorted((root/args.incoming).rglob('result.json')):
 result=json.loads(result_path.read_text(encoding='utf-8'));manifest=(root/result['manifest']).resolve();assert manifest.is_relative_to(root/'production/manifests')
 data=json.loads(manifest.read_text(encoding='utf-8'));assert data['plan_sha256']==result['plan_sha256'],'Plan changed: keep result for reconciliation'
 for row in result['records']:
  sentence=next(s for s in data['sentences'] if s['id']==row['sentence_id']);assert sentence['en']==row['text']
  r=row['recording'];gender=row['gender'];assert r['path']==sentence['recordings'][gender]['path']
  source=(result_path.parent/'public'/r['path']).resolve();assert source.is_relative_to(result_path.parent.resolve()/'dist/assets/audio')
  assert validate(r,source,sentence['en'],gender)
  target=(root/'public'/r['path']).resolve();assert target.is_relative_to(root/'dist/assets/audio')
  existing=sentence['recordings'][gender]
  if validate(existing,target,sentence['en'],gender) and existing['sha256']!=r['sha256']:continue
  target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target);sentence['recordings'][gender]=r;count+=1
 manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
 dest=root/'production/results'/f'{result["job"]}.json';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(result_path,dest)
print(f'Preserved {count} independently verified recordings')
