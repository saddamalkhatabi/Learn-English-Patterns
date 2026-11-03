import os
"""Bound WebP atlases and map legacy nonuniform grid cuts without replacing originals."""
import argparse,hashlib,json,pathlib,subprocess
ROOT=pathlib.Path(os.environ.get('PATTERNS_ROOT',os.getcwd())).resolve()
def dimensions(path):
 d=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','stream=width,height','-of','json',str(path)]));s=d['streams'][0];return s['width'],s['height']
def cuts(path,columns,rows):
 w,h=dimensions(path);rgb=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','rawvideo','-pix_fmt','rgb24','-']);view=memoryview(rgb)
 # Hard cuts span an entire row/column, unlike local face or object edges.
 def edge(axis,index):
  if axis=='y':
   stride=w*3;start=index*stride;prev=start-stride;return sum(abs(view[start+x]-view[prev+x]) for x in range(0,stride,9))/(stride/9)
  return sum(abs(view[(y*w+index)*3+c]-view[(y*w+index-1)*3+c]) for y in range(0,h,3) for c in range(3))/(h)
 def split(axis,size,count):
  points=[0]
  for i in range(1,count):
   center=size*i/count;radius=size/count*.18
   points.append(max(range(max(1,int(center-radius)),min(size,int(center+radius))),key=lambda n:edge(axis,n)))
  return points+[size]
 return w,h,split('x',w,columns),split('y',h,rows)
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--legacy',action='store_true');ap.add_argument('--new',action='store_true');args=ap.parse_args()
 if args.legacy:
  file=ROOT/'public/pilot.json';d=json.loads(file.read_text(encoding='utf-8'));reports=[]
  for atlas in sorted({s['image']['atlas'] for s in d['sentences']}):
   rows=[s for s in d['sentences'] if s['image']['atlas']==atlas];meta=rows[0]['image'];w,h,xs,ys=cuts(ROOT/'public'/atlas,meta['columns'],meta['rows']);reports.append({'atlas':atlas,'width':w,'height':h,'x':xs,'y':ys,'method':'whole-line RGB discontinuity near expected grid; visual QA follows'})
   for s in rows:
    im=s['image'];x=im['cell']%im['columns'];y=im['cell']//im['columns'];crop={'x':xs[x]+1,'y':ys[y]+1,'width':xs[x+1]-xs[x]-2,'height':ys[y+1]-ys[y]-2};assert crop['width']>0 and crop['height']>0
    im.update({'crop':crop,'tile_aspect':crop['width']/crop['height'],'width':w,'height':h,'geometry_status':'measured-cuts-pending-visual-review'})
  file.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n');out=ROOT/'production/legacy-scene-geometry.json';out.write_text(json.dumps(reports,indent=2)+'\n',encoding='utf-8',newline='\n');print(json.dumps(reports))
 if args.new:
  plan=json.loads((ROOT/'production/plans/foundation-one.json').read_text(encoding='utf-8'));provenance=[]
  for p in plan['patterns']:
   source=ROOT/'production/source-images'/f'{p["key"]}.png';assert source.is_file(),source
   w,h=dimensions(source);assert abs(w/h-3/4)<.002,'Wrong atlas aspect ratio: requires re-generation'
   target=ROOT/'public/assets/scenes'/f'{p["key"]}-atlas-v1.webp'
   _,_,xs,ys=cuts(source,3,4)
   filters=['[0:v]split=12'+''.join(f'[s{i}]' for i in range(12))]
   for i in range(12):
    col=i%3;row=i//3;filters.append(f'[s{i}]crop={xs[col+1]-xs[col]-4}:{ys[row+1]-ys[row]-4}:{xs[col]+2}:{ys[row]+2},scale=512:512:flags=lanczos[c{i}]')
   filters.append(''.join(f'[c{i}]' for i in range(12))+'xstack=inputs=12:layout='+'|'.join(f'{i%3*512}_{i//3*512}' for i in range(12))+'[out]')
   subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-filter_complex',';'.join(filters),'-map','[out]','-frames:v','1','-c:v','libwebp','-quality','86',str(target)],check=True)
   assert dimensions(target)==(1536,2048)
   digest=hashlib.sha256(target.read_bytes()).hexdigest();provenance.append({'key':p['key'],'generated_file':source.name,'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'source_dimensions':[w,h],'path':str(target.relative_to(ROOT/'public')).replace('\\','/'),'sha256':digest,'width':1536,'height':2048,'tool':'built-in imagegen','review':'pending'})
   for name in plan['manifest_paths']:
    file=ROOT/name;d=json.loads(file.read_text(encoding='utf-8'))
    for s in d['sentences']:
     if s['pattern_id']==p['id']:
      i=s['image'];i.update({'sha256':digest,'width':1536,'height':2048,'tile_aspect':1,'crop':{'x':(i['cell']%3)*512+1,'y':(i['cell']//3)*512+1,'width':510,'height':510},'status':'generated-pending-review'})
    file.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
  (ROOT/'production/image-sources.json').write_text(json.dumps(provenance,indent=2)+'\n',encoding='utf-8',newline='\n');print(f'{len(provenance)} bounded WebP atlases prepared')
if __name__=='__main__':main()
