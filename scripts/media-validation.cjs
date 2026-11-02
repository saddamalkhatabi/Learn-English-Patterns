const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const voices={male:'am_adam',female:'af_bella'},sha=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function validate(r,file,text,gender){if(!r||!fs.existsSync(file)||r.text!==text||r.voice_id!==voices[gender]||!r.sha256||sha(file)!==r.sha256)return false;const tokens=text.trim().split(/\s+/),w=r.words;if(!Number.isFinite(r.duration_ms)||r.duration_ms<=0||!Array.isArray(w)||w.length!==tokens.length)return false;return w.every((x,i)=>x.index===i&&x.text===tokens[i]&&Number.isFinite(x.start_ms)&&Number.isFinite(x.end_ms)&&0<=x.start_ms&&x.start_ms<x.end_ms&&x.end_ms<=r.duration_ms+45&&(!i||w[i-1].end_ms<=x.start_ms))}
function asset(root,relative){const base=path.resolve(root,'public'),p=path.resolve(base,relative);if(!p.startsWith(base+path.sep))throw Error('Asset outside public');return p}
module.exports={validate,sha,asset,voices};
