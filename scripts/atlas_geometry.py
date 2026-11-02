import os
"""Measure actual continuous pale gutters, never photograph contrast edges."""
import subprocess
from prepare_scenes import dimensions

def gutter_geometry(path,columns=3,rows=4):
 w,h=dimensions(path);pixels=memoryview(subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','rawvideo','-pix_fmt','rgb24','-']))
 def score(axis,index):
  total=white=0
  for p in range(0,w if axis=='y' else h,3):
   off=(index*w+p)*3 if axis=='y' else (p*w+index)*3
   white+=int(min(pixels[off:off+3])>=240);total+=1
  return white/total
 def find(axis,size,count):
  spans=[]
  for i in range(1,count):
   expected=size*i/count;radius=size/count*.18;lo=max(1,round(expected-radius));hi=min(size-1,round(expected+radius));values=[(n,score(axis,n)) for n in range(lo,hi+1)];runs=[];current=[]
   for threshold in [.99,.97,.94,.90]:
    runs=[];current=[]
    for n,s in values:
     if s>=threshold:current.append((n,s))
     elif current:
      if len(current)>=1:runs.append(current)
      current=[]
    if len(current)>=1:runs.append(current)
    if runs:break
   assert runs,f'No continuous {axis} gutter near {i}/{count}; inspect grid before production'
   chosen=min(runs,key=lambda r:abs((r[0][0]+r[-1][0])/2-expected));spans.append({'start':chosen[0][0],'end':chosen[-1][0]+1,'center':round((chosen[0][0]+chosen[-1][0])/2),'white_fraction':min(s for _,s in chosen)})
  return spans
 xs=find('x',w,columns);ys=find('y',h,rows);rects=[]
 for row in range(rows):
  for col in range(columns):
   left=xs[col-1]['end'] if col else 0;right=xs[col]['start'] if col<columns-1 else w;top=ys[row-1]['end'] if row else 0;bottom=ys[row]['start'] if row<rows-1 else h
   # Exclude one additional edge pixel, including source anti-aliasing.
   rect={'x':left+1,'y':top+1,'width':right-left-2,'height':bottom-top-2};assert rect['width']>0 and rect['height']>0;rects.append(rect)
 return {'width':w,'height':h,'x_gutters':xs,'y_gutters':ys,'source_rects':rects,'method':'continuous near-white gutter runs, sampled across the entire row or column'}
