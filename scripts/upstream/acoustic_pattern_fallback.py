"""Acoustic recovery for corrupted Edge-TTS WordBoundary events.
The real recorded MP3 is aligned directly using a pretrained English CTC acoustic
model. Used only when WordBoundary spans are out of order or overlapping.
"""
import pathlib
import re
import numpy as np
import soundfile as sf
import torch
import torchaudio


NUMBER_ONES=["zero","one","two","three","four","five","six","seven","eight","nine",
             "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen",
             "seventeen","eighteen","nineteen"]
NUMBER_TENS=["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"]
def spoken_number(n):
    n=int(n)
    if n<20:return NUMBER_ONES[n]
    if n<100:return NUMBER_TENS[n//10]+("" if n%10==0 else NUMBER_ONES[n%10])
    if n<1000:return NUMBER_ONES[n//100]+"hundred"+("" if n%100==0 else spoken_number(n%100))
    return "".join(NUMBER_ONES[int(d)] for d in str(n))
def spoken_token(token):
    # A printed number may be read aloud in words. Preserve the original ONE-token index
    # while aligning phonemes of its spoken English equivalent in the real recording.
    def replace(m):
        raw=m.group(0)
        if ":" in raw:
            return "".join(spoken_number(part) for part in raw.split(":"))
        return spoken_number(raw)
    return re.sub(r"\d{1,2}:\d{2}|\d+",replace,token.upper())

def acoustic_symbols(token, labels):
    # '-' is the CTC blank label, never a spoken hyphen. Keep compound words
    # assigned to their original printed word index, and remove quote marks
    # around abbreviations without removing internal contraction apostrophes.
    return "".join(c for c in spoken_token(token).upper()
                   if c in labels and c not in {"|", "-"}).strip("'")

class ForcedAligner:
    def __init__(self):
        torch.set_num_threads(2)
        self.bundle=torchaudio.pipelines.WAV2VEC2_ASR_BASE_960H
        self.model=self.bundle.get_model().eval()
        self.labels={letter:i for i,letter in enumerate(self.bundle.get_labels())}

    def align(self, mp3, text):
        words=text.strip().split()
        tokens=[];owners=[]
        for i,word in enumerate(words):
            word=acoustic_symbols(word,self.labels)
            if not word:raise ValueError("No acoustic symbols for a word")
            for c in word:
                tokens.append(self.labels[c]);owners.append(i)
            if i+1<len(words):
                tokens.append(self.labels["|"]);owners.append(-1)
        data,sr=sf.read(pathlib.Path(mp3),dtype="float32")
        if data.ndim>1:data=np.mean(data,axis=1)
        duration=round(len(data)/sr*1000)
        wave=torch.from_numpy(np.ascontiguousarray(data)).unsqueeze(0)
        if sr!=self.bundle.sample_rate:
            wave=torchaudio.functional.resample(wave,sr,self.bundle.sample_rate)
        with torch.inference_mode():
            output,_=self.model(wave)
            emission=output.log_softmax(-1)
            raw=emission[0].argmax(-1).unique_consecutive().tolist()
            alphabet=self.bundle.get_labels()
            self.last_transcript="".join(alphabet[i] for i in raw if alphabet[i]!="-").replace("|"," ").strip()
            labels=torch.tensor([tokens],dtype=torch.int32)
            aligned,scores=torchaudio.functional.forced_align(emission,labels,blank=self.labels["-"])
            spans=torchaudio.functional.merge_tokens(aligned[0],scores[0],blank=self.labels["-"])
        if len(spans)!=len(tokens):raise ValueError("Incomplete acoustic token spans")
        ms=wave.shape[-1]/emission.shape[1]/self.bundle.sample_rate*1000
        bounds=[[None,None] for _ in words]
        for span,owner in zip(spans,owners):
            if owner<0:continue
            a,b=round(span.start*ms),round(span.end*ms)
            if bounds[owner][0] is None:bounds[owner][0]=a
            bounds[owner][1]=b
        cues=[[i,a,b] for i,(a,b) in enumerate(bounds)]
        if any(a is None or b is None or not (0<=a<b<=duration+40) for _,a,b in cues):
            raise ValueError("Invalid acoustic spans")
        if any(cues[i-1][2]>cues[i][1] for i in range(1,len(cues))):
            raise ValueError("Acoustic alignment overlapping words")
        return cues

