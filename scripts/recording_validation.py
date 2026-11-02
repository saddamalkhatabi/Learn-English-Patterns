import os
"""Shared dependency-free recording validation; never estimates word timing."""
import hashlib,math,subprocess
VOICES={'male':'am_adam','female':'af_bella'}
def measured_duration(path):
 # MP3 format.duration includes encoder delay/padding in some FFmpeg versions.
 # Decoded samples are the portable media timeline used for acoustic alignment.
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-f','s16le','-ac','1','-ar','24000','-'])
 return round(len(pcm)/48)
def encoded_duration(path):
 values=subprocess.check_output(['ffprobe','-v','error','-show_entries','packet=duration_time','-of','csv=p=0',str(path)],text=True)
 return round(sum(float(x.split(',')[0]) for x in values.splitlines() if x and x.split(',')[0].replace('.','',1).isdigit())*1000)
def validate(recording,path,text,gender,probe=True):
 try:
  r=recording;words=r.get('words',[]);tokens=text.split()
  if not path.is_file() or r.get('text')!=text or r.get('voice_id')!=VOICES[gender]:return False
  if r.get('sha256')!=hashlib.sha256(path.read_bytes()).hexdigest():return False
  duration=r.get('duration_ms');assert isinstance(duration,(int,float)) and math.isfinite(duration) and duration>0
  if r.get('alignment') not in ['wav2vec2-ctc-exact-mp3','imported-measured-kokoro-mp3']:return False
  if len(words)!=len(tokens) or not words:return False
  for i,w in enumerate(words):
   if w['index']!=i or w['text']!=tokens[i] or not 0<=w['start_ms']<w['end_ms']<=duration+45:return False
   if i and words[i-1]['end_ms']>w['start_ms']:return False
  return not probe or abs((measured_duration(path) if r.get('duration_basis')=='decoded-pcm-24000-mono' else encoded_duration(path))-duration)<=2
 except (KeyError,TypeError,ValueError,AssertionError,OSError,subprocess.SubprocessError):return False
