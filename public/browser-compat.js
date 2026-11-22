/* DOM fallbacks and geometry shared by older browsers and narrow viewports. */
if(!Element.prototype.toggleAttribute)Element.prototype.toggleAttribute=function(name,force){
 const enabled=arguments.length===1?!this.hasAttribute(name):Boolean(force);
 if(enabled){if(!this.hasAttribute(name))this.setAttribute(name,'')}
 else this.removeAttribute(name);
 return enabled;
};
if(!Element.prototype.replaceChildren)Element.prototype.replaceChildren=function(...children){
 while(this.firstChild)this.removeChild(this.firstChild);
 this.append(...children);
};
if(typeof document.createElement('dialog').showModal!=='function'){
 const create=document.createElement;
 const register=dialog=>{
  window.epDialogPolyfill.registerDialog(dialog);
  return dialog;
 };
 document.querySelectorAll('dialog').forEach(register);
 document.createElement=function(tag){
  const element=create.apply(this,arguments);
  return String(tag).toLowerCase()==='dialog'?register(element):element;
 };
 document.documentElement.classList.add('dialog-fallback');
}

function epFetchJSON(path,timeout=18000){
 return new Promise((resolve,reject)=>{
  const controller=typeof AbortController==='function'?new AbortController():null;
  const timer=setTimeout(()=>{
   if(controller)controller.abort();
   reject(Error('Timed out loading '+path));
  },timeout);
  fetch(path,controller?{signal:controller.signal}:undefined).then(response=>{
   if(!response.ok)throw Error(path+' returned '+response.status);
   return response.json();
  }).then(data=>{clearTimeout(timer);resolve(data)},error=>{clearTimeout(timer);reject(error)});
 });
}

function epViewportBounds(){
 const viewport=window.visualViewport,root=document.documentElement;
 const top=viewport?viewport.offsetTop:0,left=viewport?viewport.offsetLeft:0;
 const width=Math.min(root.clientWidth||window.innerWidth,viewport?viewport.width:window.innerWidth);
 const height=viewport?viewport.height:window.innerHeight;
 return {top,left,width,height,right:left+width,bottom:top+height};
}
function epPositionFloating(popup,anchor,minimumWidth=0){
 const screen=epViewportBounds(),gap=8;
 const maxWidth=Math.max(1,screen.width-2*gap);
 popup.style.maxWidth=maxWidth+'px';
 if(minimumWidth)popup.style.width=Math.min(maxWidth,Math.max(anchor.width,minimumWidth))+'px';
 const roomBelow=screen.bottom-Math.min(screen.bottom,anchor.bottom)-2*gap;
 const roomAbove=Math.max(screen.top,anchor.top)-screen.top-2*gap;
 const upper=roomBelow<Math.min(230,popup.scrollHeight)&&roomAbove>roomBelow;
 const available=Math.max(1,Math.min(screen.height-2*gap,upper?roomAbove:roomBelow));
 popup.style.maxHeight=(available>=80?Math.min(available,420):Math.max(1,screen.height-2*gap))+'px';
 const x=Math.max(screen.left+gap,Math.min(anchor.left,screen.right-popup.offsetWidth-gap));
 const y=upper?anchor.top-popup.offsetHeight-gap:anchor.bottom+gap;
 popup.style.left=x+'px';
 popup.style.top=Math.max(screen.top+gap,Math.min(y,screen.bottom-popup.offsetHeight-gap))+'px';
}
function epOnViewportChange(callback){
 window.addEventListener('resize',callback);
 if(window.visualViewport){
  window.visualViewport.addEventListener('resize',callback);
  window.visualViewport.addEventListener('scroll',callback);
 }
}
function epSizeViewport(){
 const {top,height}=epViewportBounds(),style=document.documentElement.style;
 style.setProperty('--ep-window-top',Math.round(top)+'px');
 style.setProperty('--ep-window-height',Math.round(height)+'px');
}
epSizeViewport();
epOnViewportChange(epSizeViewport);
if(!window.CSS||!CSS.supports('selector(:has(*))'))document.documentElement.classList.add('legacy-selectors');

function epUseJpegImages(){
 const root=document.documentElement;
 root.classList.add('jpeg-images');
 function jpeg(path){
  try{
   const url=new URL(path,location.href);
   if(url.origin===location.origin&&url.pathname.includes('/assets/')&&/\.webp$/i.test(url.pathname)&&!url.searchParams.has('format')){
    url.searchParams.set('format','jpeg');
    return url.href;
   }
  }catch{}
  return path;
 }
 const selector='img[src], source[srcset], img[srcset], [style*="webp"]';
 function fix(element){
  if(element.nodeType!==1)return;
  const source=element.getAttribute('src');
  if(element.tagName==='IMG'&&source){
   const alternate=jpeg(source);
   if(alternate!==source)element.setAttribute('src',alternate);
  }
  const srcset=element.getAttribute('srcset');
  if(srcset&&srcset.includes('.webp')){
   const alternate=srcset.replace(/[^\s,]+\.webp(?=\s|,|$)/gi,path=>jpeg(path));
   if(alternate!==srcset)element.setAttribute('srcset',alternate);
  }
  const background=element.style.backgroundImage;
  if(background&&background.includes('.webp')){
   const updated=background.replace(/url\((['"]?)([^'")]+)\1\)/gi,(full,quote,path)=>`url("${jpeg(path)}")`);
   if(updated!==background)element.style.backgroundImage=updated;
  }
 }
 const scan=parent=>{
  if(parent.nodeType!==1)return;
  if(parent.matches(selector))fix(parent);
  parent.querySelectorAll(selector).forEach(fix);
 };
 scan(document.body);
 new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='attributes'){if(record.target.matches(selector))fix(record.target)}
   else record.addedNodes.forEach(scan);
  }
 }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','srcset','style']});
}
const epWebpProbe=new Image();
epWebpProbe.onload=()=>{if(epWebpProbe.width!==1||epWebpProbe.height!==1)epUseJpegImages()};
epWebpProbe.onerror=epUseJpegImages;
epWebpProbe.src='data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';
