import os
import json,os,pathlib,shutil
from recording_validation import validate
root=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve();out=root/'production-output';manifest=os.environ['MANIFEST'];job=os.environ['JOB'];data=json.loads((root/manifest).read_text(encoding='utf-8'));records=[]
for s in data['sentences']:
 for gender,r in s['recordings'].items():
  path=root/'public'/r['path']
  if validate(r,path,s['en'],gender):
   dest=out/'public'/r['path'];dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,dest);records.append({'sentence_id':s['id'],'text':s['en'],'gender':gender,'recording':r})
out.mkdir(exist_ok=True);(out/'result.json').write_text(json.dumps({'schema':1,'manifest':manifest,'plan_sha256':data['plan_sha256'],'job':job,'records':records},ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
print(f'{len(records)} validated voice results staged')
