import os
"""Emit jobs only after an authored plan has an explicit recorded review."""
import hashlib,json,pathlib
from recording_validation import validate
root=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve();jobs=[]
for file in sorted((root/'production/plans').glob('*.json')):
 plan=json.loads(file.read_text(encoding='utf-8'));assert plan['approval']['status']=='reviewed',f'{file}: not reviewed'
 batch_path=(root/plan['batch_path']).resolve();assert batch_path.is_relative_to(root/'content/batches');batch=json.loads(batch_path.read_text(encoding='utf-8'))
 assert plan['approval']==batch['review'];assert hashlib.sha256(json.dumps(batch,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==plan['content_sha256'],'Authoring changed after plan review'
 for manifest in plan['manifest_paths']:
  path=(root/manifest).resolve();assert path.is_relative_to(root/'production/manifests')
  data=json.loads(path.read_text(encoding='utf-8'));assert data['plan_sha256']==plan['content_sha256']
  assert all(s['en'] and s['ar'] and s['scene_description'] for s in data['sentences'])
  if any(not validate(r,root/'public'/r['path'],s['en'],g,probe=False) for s in data['sentences'] for g,r in s['recordings'].items()):jobs.append({'manifest':manifest,'job':path.stem})
print(json.dumps({'include':jobs},separators=(',',':')))
