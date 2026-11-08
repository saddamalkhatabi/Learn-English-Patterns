const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const voices={male:'am_adam',female:'af_bella'},sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function validate(r,file,text,gender){if(!r||!fs.existsSync(file)||r.text!==text||r.voice_id!==voices[gender]||!r.sha256||sha(file)!==r.sha256)return false;const tokens=text.trim().split(/\s+/),w=r.words;if(!Number.isFinite(r.duration_ms)||r.duration_ms<=0||!Array.isArray(w)||w.length!==tokens.length)return false;return w.every((x,i)=>x.index===i&&x.text===tokens[i]&&Number.isFinite(x.start_ms)&&Number.isFinite(x.end_ms)&&0<=x.start_ms&&x.start_ms<x.end_ms&&x.end_ms<=r.duration_ms+45&&(!i||w[i-1].end_ms<=x.start_ms))}
function asset(root,relative){const base=path.resolve(root,'public'),p=path.resolve(base,relative);if(!p.startsWith(base+path.sep))throw Error('Asset outside public');return p}
function webpSize(b){
 if(b.length<30||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw Error('Invalid WebP header');
 const kind=b.toString('ascii',12,16);
 if(kind==='VP8 ')return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
 if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
 if(kind==='VP8L')return [1+(((b[22]&0x3f)<<8)|b[21]),1+(((b[24]&15)<<10)|(b[23]<<2)|((b[22]&0xc0)>>6))];
 throw Error('Unsupported WebP codec '+kind);
}
module.exports={validate,sha,asset,voices,webpSize};
