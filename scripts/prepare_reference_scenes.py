import os
"""Assemble one inspected source atlas at a time into the bounded runtime grid."""
import argparse,hashlib,json,pathlib,subprocess
from prepare_scenes import cuts,dimensions
from atlas_geometry import gutter_geometry
ROOT=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve()
def save(p,d):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
ap=argparse.ArgumentParser();ap.add_argument('number',type=int);ap.add_argument('--reviewed',action='store_true');args=ap.parse_args();assert 1<=args.number<=84
key=f'reference-{args.number:03}';source=ROOT/'production/source-images'/f'{key}.png'
if not source.is_file():source=ROOT/'production/source-archives'/f'{key}.webp'
geometry=gutter_geometry(source);w,h=geometry['width'],geometry['height'];assert abs(w/h-.75)<.01,'Requires portrait 3:4 atlas'
for rect in geometry['source_rects']:assert .85<rect['width']/rect['height']<1.15,'Irregular cells: visually review and regenerate'
target=ROOT/'public/assets/scenes'/f'{key}-v1.webp'
filters=['[0:v]split=12'+''.join(f'[s{i}]' for i in range(12))]
for i in range(12):
 c=geometry['source_rects'][i];filters.append(f'[s{i}]crop={c["width"]}:{c["height"]}:{c["x"]}:{c["y"]},scale=512:512:flags=lanczos[c{i}]')
filters.append(''.join(f'[c{i}]' for i in range(12))+'xstack=inputs=12:layout='+'|'.join(f'{i%3*512}_{i//3*512}' for i in range(12))+'[out]')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-filter_complex',';'.join(filters),'-map','[out]','-frames:v','1','-c:v','libwebp','-quality','86',str(target)],check=True);assert dimensions(target)==(1536,2048)
meta={'key':key,'source':source.relative_to(ROOT).as_posix(),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source_dimensions':[w,h],'geometry':geometry,'atlas':target.relative_to(ROOT/'public').as_posix(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'width':1536,'height':2048,'tool':'built-in imagegen','review':'assistant visual review' if args.reviewed else 'pending','human_review':False}
save(ROOT/'production/reference-images'/f'{key}.json',meta)
meta['cell_count']=min(12,1000-(args.number-1)*12);save(ROOT/'production/reference-images'/f'{key}.json',meta);n=meta['cell_count']
print(json.dumps({'key':key,'scenes':n,'dimensions':[1536,2048],'review':meta['review']}))
