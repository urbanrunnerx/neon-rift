import {Simulation,clamp} from './simulation.js';
import {VERSION,DEFAULTS,RANGES,COLORS,PRESETS,sanitize,surprise,hexRGB,snapshot,restoreSnapshot,History} from './artist-state.js';
const $=id=>document.getElementById(id), canvas=$('rift'), simulation=new Simulation(731), history=new History();
const settings={...DEFAULTS,paused:matchMedia('(prefers-reduced-motion: reduce)').matches};
const KEYS={settings:'neon-rift-web-v1',session:'neon-rift-session-v3',looks:'neon-rift-artworks-v1'};
let looks=[];
try{Object.assign(settings,sanitize(JSON.parse(localStorage.getItem(KEYS.settings)||'{}'),settings));}catch{}
try{const record=JSON.parse(localStorage.getItem(KEYS.session)||'null');if(record)restoreSnapshot(record,settings,simulation);}catch{}
try{const stored=JSON.parse(localStorage.getItem(KEYS.looks)||'[]');if(Array.isArray(stored))looks=stored.filter(x=>x&&typeof x.name==='string'&&x.record).slice(0,12);}catch{}
let dirty=true,toastTimer,editActive=false,lastExport=null,restored=!!localStorageSafe(KEYS.session);
function localStorageSafe(key){try{return localStorage.getItem(key);}catch{return null;}}
function save(){try{localStorage.setItem(KEYS.settings,JSON.stringify(settings));return true;}catch{return false;}}
function saveSession(){save();try{localStorage.setItem(KEYS.session,JSON.stringify(snapshot(settings,simulation)));return true;}catch{return false;}}
function message(text){$('kitStatus').textContent=text;$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
function record(){history.push(snapshot(settings,simulation));syncHistory();}
function syncHistory(){$('undo').disabled=!history.undoStack.length;$('redo').disabled=!history.redoStack.length;}
function beginEdit(){if(!editActive){record();editActive=true;}}
function endEdit(){editActive=false;save();dirty=true;}
const hints={attract:'Attract · Drag the light toward you',repel:'Repel · Push the droplets away',swirl:'Vortex ↻ · Stir the light clockwise',counterSwirl:'Vortex ↺ · Stir the light counterclockwise',freeze:'Stillness · Hold the void to freeze time',sculpt:'Sculpt · Drag a droplet into place'};
function syncUI(){
  for(const key of Object.keys(RANGES)){
    const input=$(key);if(!input)continue;input.value=String(settings[key]);
    const out=$(key+'Value');if(out)out.textContent=['hue','rotation'].includes(key)?Math.round(settings[key])+'°':key==='count'?String(settings[key]):settings[key].toFixed(2)+'×';
  }
  for(const key of COLORS)$(key).value=settings[key];
  $('pause').textContent=settings.paused?'Resume':'Pause';$('pause').setAttribute('aria-pressed',String(settings.paused));
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===settings.tool)));
  $('toolHint').textContent=hints[settings.tool]+' · Pinch to zoom';
  $('brushDescription').textContent=hints[settings.tool]+'. Double-tap for a ripple.';
  simulation.touchMode=settings.tool;simulation.touchStrength=settings.strength;dirty=true;syncHistory();
}
let gl,program,vao,uniforms={},shaderTexts,running=false,raf=0,previous=0,sampleStart=0,sampleFrames=0,drawCount=0;
let width=1,height=1,gpu='Unknown',lastError='',exporting=false;
function resize(){if(!gl)return;const rect=canvas.getBoundingClientRect(),cap=[600,900,1400][settings.quality],scale=Math.min(devicePixelRatio||1,cap/Math.max(rect.width,rect.height),2);setSize(Math.max(1,Math.round(rect.width*scale)),Math.max(1,Math.round(rect.height*scale)));}
function setSize(w,h){if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}width=w;height=h;gl.viewport(0,0,w,h);dirty=true;}
function fail(error){running=false;cancelAnimationFrame(raf);lastError=String(error.message||error);$('loading').hidden=true;$('error').hidden=false;$('error').textContent='The renderer could not continue.\n\n'+lastError+'\n\nTry reopening Neon Rift in a browser with WebGL 2 support.';console.error(error);}
function compile(type,text){const shader=gl.createShader(type);gl.shaderSource(shader,text);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}return shader;}
function initializeRenderer(){
  if(!gl)throw new Error('WebGL 2 is unavailable on this browser/device.');
  const vert=compile(gl.VERTEX_SHADER,shaderTexts[0]),frag=compile(gl.FRAGMENT_SHADER,shaderTexts[1]);
  program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
  vao=gl.createVertexArray();gl.bindVertexArray(vao);uniforms={};
  for(const name of ['uResolution','uTime','uZoom','uGlow','uTurbulence','uTheme','uCount','uQuality','uBalls','uPointer','uTouch','uPulse','uHue','uSaturation','uExposure','uContrast','uStars','uTexture','uRim','uMerge','uSize','uRotation','uSymmetry','uColorA','uColorB','uColorC','uBackground'])uniforms[name]=gl.getUniformLocation(program,name==='uBalls'?'uBalls[0]':name);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.DITHER);gpu=gl.getParameter(gl.RENDERER);
  resize();lastError='';$('error').hidden=true;$('loading').hidden=true;running=true;previous=sampleStart=sampleFrames=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);
}
function draw(){
  gl.useProgram(program);gl.bindVertexArray(vao);
  gl.uniform2f(uniforms.uResolution,width,height);gl.uniform1f(uniforms.uTime,simulation.time);
  for(const [uniform,key] of [['uZoom','zoom'],['uGlow','glow'],['uTurbulence','turbulence'],['uSaturation','saturation'],['uExposure','exposure'],['uContrast','contrast'],['uStars','stars'],['uTexture','texture'],['uRim','rim'],['uMerge','merge'],['uSize','size']])gl.uniform1f(uniforms[uniform],settings[key]);
  gl.uniform1f(uniforms.uHue,(settings.hue+simulation.time*settings.colorCycle*12)*Math.PI/180);gl.uniform1f(uniforms.uRotation,settings.rotation*Math.PI/180);
  for(const [uniform,key]of [['uTheme','theme'],['uCount','count'],['uQuality','quality'],['uSymmetry','symmetry']])gl.uniform1i(uniforms[uniform],settings[key]);
  for(const [uniform,key]of [['uColorA','colorA'],['uColorB','colorB'],['uColorC','colorC'],['uBackground','background']])gl.uniform3fv(uniforms[uniform],hexRGB(settings[key]));
  gl.uniform4fv(uniforms.uBalls,simulation.balls);gl.uniform2f(uniforms.uPointer,simulation.pointerX,simulation.pointerY);gl.uniform1f(uniforms.uTouch,simulation.touching?1:0);gl.uniform1f(uniforms.uPulse,simulation.pulse);
  gl.drawArrays(gl.TRIANGLES,0,3);dirty=false;drawCount++;
}
function frame(now){
  if(!running||document.hidden)return;raf=requestAnimationFrame(frame);if(exporting)return;
  const interval=settings.quality===0?1000/30:1000/60;if(previous&&now-previous<interval-.7)return;
  const dt=previous?Math.min(.25,(now-previous)/1000):0;previous=now;
  try{
    const frozen=settings.paused||(settings.tool==='freeze'&&pointers.size>0);
    if(!frozen){simulation.step(dt,settings.speed);dirty=true;}
    if(dirty){draw();sampleFrames++;}
    if(!sampleStart)sampleStart=now;
    if(now-sampleStart>=1000){const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('WebGL error 0x'+error.toString(16));$('stats').textContent=(frozen?'Paused':Math.round(sampleFrames*1000/(now-sampleStart))+' fps')+' · '+width+'×'+height+' · '+['Eco','Balanced','Ultra'][settings.quality];sampleStart=now;sampleFrames=0;}
  }catch(error){fail(error);}
}
// Read-only diagnostics for automated regression tests.
Object.defineProperty(window,'neonRiftDiagnostics',{get:()=>({version:VERSION,ready:running&&!lastError,error:lastError,gpu,drawCount,time:simulation.time,touching:simulation.touching,pulse:simulation.pulse,width,height,settings:{...settings},balls:Array.from(simulation.balls),savedLooks:looks.length,lastExport,restored})});
for(const key of [...Object.keys(RANGES),...COLORS]){
  const input=$(key);if(!input)continue;
  input.addEventListener('pointerdown',beginEdit);input.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))beginEdit();});
  input.addEventListener('input',event=>{if(!editActive)beginEdit();const value=event.target.value;settings[key]=COLORS.includes(key)?value:clamp(Number(value),...RANGES[key]);if(['theme','quality','count','symmetry'].includes(key))settings[key]=Math.round(settings[key]);if(['colorA','colorB','colorC'].includes(key))settings.theme=4;syncUI();save();if(key==='quality')resize();});
  input.addEventListener('change',endEdit);input.addEventListener('blur',endEdit);
}
$('pause').onclick=()=>{record();settings.paused=!settings.paused;syncUI();save();};
$('pulse').onclick=()=>{record();simulation.burst(0,0);dirty=true;};
$('shuffle').onclick=()=>{record();simulation.reset(Date.now()%2147483647);dirty=true;message('A new arrangement. Undo brings the last one back.');};
$('surprise').onclick=()=>{record();Object.assign(settings,surprise(settings));syncUI();save();message('A happy accident. Make it your own.');};
$('resetSettings').onclick=()=>{record();Object.assign(settings,DEFAULTS,{quality:settings.quality,paused:settings.paused});syncUI();resize();save();message('Original colors and form restored.');};
function travel(direction){const target=history[direction](snapshot(settings,simulation));if(!target)return;restoreSnapshot(target,settings,simulation);syncUI();resize();save();message(direction==='undo'?'Last change undone.':'Change restored.');}
$('undo').onclick=()=>travel('undo');$('redo').onclick=()=>travel('redo');
function setSheet(open){$('controls').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));if(open)$('closeSettings').focus();else $('settings').focus();}
$('settings').onclick=()=>setSheet($('controls').hidden);$('closeSettings').onclick=()=>setSheet(false);
function cinema(on){document.body.classList.toggle('cinema',on);$('showUI').hidden=!on;if(on){$('controls').hidden=true;$('settings').setAttribute('aria-expanded','false');$('showUI').focus();}else $('cinema').focus();}
$('cinema').onclick=()=>cinema(true);$('showUI').onclick=()=>cinema(false);
function selectTab(name){document.querySelectorAll('[data-tab]').forEach(button=>{const active=button.dataset.tab===name;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('panel-'+button.dataset.tab).hidden=!active;});}
for(const button of document.querySelectorAll('[data-tab]')){
  button.onclick=()=>selectTab(button.dataset.tab);
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],i=tabs.indexOf(button),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectTab(tabs[next].dataset.tab);tabs[next].focus();};
}
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>{record();settings.tool=button.dataset.tool;if(settings.tool==='sculpt')settings.paused=true;syncUI();save();message(hints[settings.tool]);};
for(const preset of PRESETS){const b=document.createElement('button'),dot=document.createElement('span');dot.className='preset-dot';dot.style.setProperty('--swatch',preset.values.colorC||['#b4ff6b','#7edbff','#ffb361','#9698ff'][preset.values.theme||0]);b.append(dot,document.createTextNode(preset.name));b.onclick=()=>{record();Object.assign(settings,sanitize({...DEFAULTS,...preset.values,quality:settings.quality,paused:settings.paused,tool:settings.tool}));syncUI();resize();save();message(preset.name+' — a starting point, not a rule.');};$('presets').append(b);}
function persistLooks(next){try{localStorage.setItem(KEYS.looks,JSON.stringify(next));looks=next;return true;}catch{message('Could not save on this device. Try exporting a PNG.');return false;}}
function renderLooks(){
  $('savedLooks').replaceChildren();
  if(!looks.length){const p=document.createElement('p');p.className='fine';p.textContent='Your collection is waiting for its first little universe.';$('savedLooks').append(p);}
  for(const look of looks){const row=document.createElement('div');row.className='saved-look';const load=document.createElement('button');load.className='load-look';load.textContent=look.name;load.title=look.name;
    load.onclick=()=>{const before=snapshot(settings,simulation);try{restoreSnapshot(look.record,settings,simulation);history.push(before);settings.paused=true;syncUI();resize();save();message('Loaded '+look.name+'. Resume to set it in motion.');}catch{message('That saved artwork could not be read.');}};
    const remove=document.createElement('button');remove.className='delete-look';remove.textContent='Delete';remove.setAttribute('aria-label','Delete '+look.name);remove.onclick=()=>{if(remove.dataset.confirm!=='yes'){remove.dataset.confirm='yes';remove.textContent='Confirm';return;}if(persistLooks(looks.filter(x=>x.id!==look.id)))renderLooks();};row.append(load,remove);$('savedLooks').append(row);
  }
}
$('saveLook').onclick=()=>{
  if(looks.length>=12){message('Your 12 spaces are full. Remove an artwork before saving another.');return;}
  const name=$('lookName').value.trim().slice(0,40)||'Little universe '+(looks.length+1),item={id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7),name,record:snapshot(settings,simulation)};
  if(persistLooks([...looks,item])){renderLooks();$('lookName').value='';message('Saved '+name+' on this device.');}
};
$('lookName').addEventListener('keydown',event=>{if(event.key==='Enter')$('saveLook').click();});
$('exportArt').onclick=async()=>{
  if(!running||!gl||gl.isContextLost()){message('Wait for the renderer before exporting.');return;}
  if(exporting)return;exporting=true;$('exportArt').disabled=true;
  const oldWidth=width,oldHeight=height;
  try{
    const maximum=Math.min(2048,gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));const scale=$('exportSize').value==='2048'?maximum/Math.max(width,height):1;
    setSize(Math.round(width*scale),Math.round(height*scale));draw();gl.finish();
    const exportWidth=width,exportHeight=height;
    const blobPromise=new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image export failed.')),'image/png'));
    setSize(oldWidth,oldHeight);draw();
    const blob=await blobPromise,url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Neon-Rift-'+new Date().toISOString().replace(/[:.]/g,'-')+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    lastExport={width:exportWidth,height:exportHeight,size:blob.size,type:blob.type};message('PNG exported · '+exportWidth+' × '+exportHeight);
  }catch(error){message('Export failed: '+error.message);}finally{setSize(oldWidth,oldHeight);dirty=true;exporting=false;$('exportArt').disabled=false;}
};
addEventListener('keydown',event=>{
  if(event.key==='Escape'){setSheet(false);cinema(false);}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(event.target.tagName)){event.preventDefault();travel(event.shiftKey?'redo':'undo');}
});
const pointers=new Map();let pinch=null,tap=null,sculptIndex=-1;
function world(x,y){const rect=canvas.getBoundingClientRect(),short=Math.min(rect.width,rect.height),px=(2*(x-rect.left)-rect.width)/short/settings.zoom,py=(rect.height-2*(y-rect.top))/short/settings.zoom,a=settings.rotation*Math.PI/180;let point=[Math.cos(a)*px+Math.sin(a)*py,-Math.sin(a)*px+Math.cos(a)*py];if(settings.symmetry){const sector=Math.PI*2/settings.symmetry,angle=Math.abs(((Math.atan2(point[1],point[0])+sector/2)%sector+sector)%sector-sector/2),r=Math.hypot(...point);point=[r*Math.cos(angle),r*Math.sin(angle)];}return point;}
function updatePinch(){const p=[...pointers.values()];pinch=p.length>=2?{distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:settings.zoom}:null;}
function applyPointer(x,y){const p=world(x,y);if(settings.tool==='sculpt'){if(sculptIndex>=0)simulation.sculpt(sculptIndex,...p);}else simulation.touch(...p,settings.tool!=='freeze');dirty=true;}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  if(pointers.size===0)record();pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,sx:event.clientX,sy:event.clientY,start:performance.now(),moved:false,multi:pointers.size>0});
  if(pointers.size===1){if(settings.tool==='sculpt'){const [x,y]=world(event.clientX,event.clientY);let nearest=Infinity;sculptIndex=0;for(let i=0;i<settings.count;i++){const d=Math.hypot(simulation.balls[i*4]-x,simulation.balls[i*4+1]-y);if(d<nearest){nearest=d;sculptIndex=i;}}}applyPointer(event.clientX,event.clientY);}
  else{for(const p of pointers.values())p.multi=true;simulation.touching=false;sculptIndex=-1;tap=null;updatePinch();}
});
canvas.addEventListener('pointermove',event=>{const p=pointers.get(event.pointerId);if(!p)return;event.preventDefault();p.x=event.clientX;p.y=event.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>9)p.moved=true;
  if(pointers.size>=2&&pinch){const v=[...pointers.values()];settings.zoom=clamp(pinch.zoom*Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)/Math.max(1,pinch.distance),.55,1.8);syncUI();}
  else if(!p.multi)applyPointer(p.x,p.y);
});
function releasePointer(event,cancelled=false){const p=pointers.get(event.pointerId);if(!p)return;pointers.delete(event.pointerId);simulation.touching=false;sculptIndex=-1;dirty=true;
  if(!cancelled&&!p.moved&&!p.multi&&settings.tool!=='sculpt'&&performance.now()-p.start<350){if(tap&&performance.now()-tap.time<340&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<35){simulation.burst(...world(event.clientX,event.clientY));tap=null;}else tap={time:performance.now(),x:event.clientX,y:event.clientY};}
  if(pinch)save();updatePinch();
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>releasePointer(e,event!=='pointerup'));
canvas.addEventListener('wheel',event=>{event.preventDefault();settings.zoom=clamp(settings.zoom*Math.exp(-event.deltaY*.001),.55,1.8);syncUI();save();},{passive:false});
canvas.addEventListener('contextmenu',event=>event.preventDefault());addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{simulation.touching=false;pointers.clear();pinch=null;tap=null;previous=sampleStart=sampleFrames=0;dirty=true;if(document.hidden){saveSession();cancelAnimationFrame(raf);}else if(running){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}});
addEventListener('pagehide',saveSession);addEventListener('neon-rift-before-reload',saveSession);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();running=false;cancelAnimationFrame(raf);$('loading').hidden=false;$('loading').textContent='Graphics paused. Waiting for the browser to restore the canvas…';});
canvas.addEventListener('webglcontextrestored',()=>{try{initializeRenderer();}catch(error){fail(error);}});
syncUI();renderLooks();
try{gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'default'});if(!gl)throw new Error('WebGL 2 is not supported or is disabled.');shaderTexts=await Promise.all(['fullscreen.vert','rift.frag'].map(async name=>{const r=await fetch('./shaders/'+name);if(!r.ok)throw new Error('Could not load '+name+': HTTP '+r.status);return r.text();}));initializeRenderer();}catch(error){fail(error);}
