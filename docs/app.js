import {Simulation, clamp} from './simulation.js';
const $ = id => document.getElementById(id);
const canvas = $('rift'), simulation = new Simulation(731);
const defaults = {theme:0,quality:1,count:28,speed:.75,glow:1.1,turbulence:1,zoom:1,paused:matchMedia('(prefers-reduced-motion: reduce)').matches};
const settings = {...defaults};
const ranges = {theme:[0,3],quality:[0,2],count:[12,40],speed:[.15,2],glow:[.3,2],turbulence:[0,2],zoom:[.55,1.8]};
try {
  const stored = JSON.parse(localStorage.getItem('neon-rift-web-v1') || '{}');
  for (const key of Object.keys(ranges)) if (typeof stored[key] === 'number' && Number.isFinite(stored[key])) settings[key] = clamp(stored[key], ...ranges[key]);
  for (const key of ['theme','quality','count']) settings[key] = Math.round(settings[key]);
} catch (_) { /* Private browsing/corrupt preferences: use safe defaults. */ }
const save = () => { try {localStorage.setItem('neon-rift-web-v1',JSON.stringify(settings));} catch (_) {} };
const syncUI = () => {
  for (const key of Object.keys(ranges)) {
    $(key).value = settings[key];
    if ($(key+'Value')) $(key+'Value').textContent = key === 'count' ? settings[key] : settings[key].toFixed(2)+'×';
  }
  $('pause').textContent = settings.paused ? 'Resume' : 'Pause';
  $('pause').setAttribute('aria-pressed',String(settings.paused));
};
let gl, program, vao, uniforms = {}, shaderTexts, running = false, raf = 0, previous = 0, sampleStart = 0, sampleFrames = 0, drawCount = 0;
let width = 1, height = 1, gpu = 'Unknown', lastError = '';
function resize() {
  if (!gl) return;
  const rect = canvas.getBoundingClientRect(), cap=[600,900,1400][settings.quality];
  const scale=Math.min(devicePixelRatio || 1,cap/Math.max(rect.width,rect.height),2);
  const w=Math.max(1,Math.round(rect.width*scale)),h=Math.max(1,Math.round(rect.height*scale));
  if (canvas.width!==w || canvas.height!==h) { canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h); }
  width=w;height=h;
}
function fail(error) {
  running=false;cancelAnimationFrame(raf);lastError=String(error.message||error);
  $('loading').hidden=true;$('error').hidden=false;
  $('error').textContent='The renderer could not continue.\n\n'+lastError+'\n\nUse a browser with WebGL 2 enabled, then reload this page. This is the web edition, not the native app.';
  console.error(error);
}
function compile(type, text) {
  const shader=gl.createShader(type);gl.shaderSource(shader,text);gl.compileShader(shader);
  if (!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) { const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error); }
  return shader;
}
function initializeRenderer() {
  if (!gl) throw new Error('WebGL 2 is unavailable on this browser/device.');
  const vert=compile(gl.VERTEX_SHADER,shaderTexts[0]),frag=compile(gl.FRAGMENT_SHADER,shaderTexts[1]);
  program=gl.createProgram();gl.attachShader(program,vert);gl.attachShader(program,frag);gl.linkProgram(program);gl.deleteShader(vert);gl.deleteShader(frag);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  vao=gl.createVertexArray();gl.bindVertexArray(vao);uniforms={};
  for (const name of ['uResolution','uTime','uZoom','uGlow','uTurbulence','uTheme','uCount','uQuality','uBalls','uPointer','uTouch','uPulse']) uniforms[name]=gl.getUniformLocation(program,name==='uBalls'?'uBalls[0]':name);
  gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.disable(gl.DITHER);gpu=gl.getParameter(gl.RENDERER);
  resize();lastError='';$('error').hidden=true;$('loading').hidden=true;
  if (!document.hidden) {running=true;previous=sampleStart=sampleFrames=0;cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}
}
function frame(now) {
  if (!running || document.hidden) return;
  raf=requestAnimationFrame(frame);
  const interval=settings.quality===0?1000/30:1000/60;
  if (previous && now-previous<interval-.7) return;
  const dt=previous?Math.min(.25,(now-previous)/1000):0;previous=now;
  try {
    if (!settings.paused) simulation.step(dt,settings.speed);
    gl.useProgram(program);gl.bindVertexArray(vao);
    gl.uniform2f(uniforms.uResolution,width,height);gl.uniform1f(uniforms.uTime,simulation.time);
    gl.uniform1f(uniforms.uZoom,settings.zoom);gl.uniform1f(uniforms.uGlow,settings.glow);gl.uniform1f(uniforms.uTurbulence,settings.turbulence);
    gl.uniform1i(uniforms.uTheme,settings.theme);gl.uniform1i(uniforms.uCount,settings.count);gl.uniform1i(uniforms.uQuality,settings.quality);
    gl.uniform4fv(uniforms.uBalls,simulation.balls);gl.uniform2f(uniforms.uPointer,simulation.pointerX,simulation.pointerY);
    gl.uniform1f(uniforms.uTouch,simulation.touching?1:0);gl.uniform1f(uniforms.uPulse,simulation.pulse);
    gl.drawArrays(gl.TRIANGLES,0,3);drawCount++;sampleFrames++;
    if (!sampleStart) sampleStart=now;
    if(now-sampleStart>=1000) {
      const error=gl.getError();if(error!==gl.NO_ERROR)throw new Error('WebGL error 0x'+error.toString(16));
      $('stats').textContent=Math.round(sampleFrames*1000/(now-sampleStart))+' fps · '+width+'×'+height+' · '+['Eco','Balanced','Ultra'][settings.quality];
      sampleStart=now;sampleFrames=0;
    }
  } catch (error) {fail(error);}
}
// Read-only diagnostics used by the shipped smoke tests, not a claim of phone validation.
Object.defineProperty(window,'neonRiftDiagnostics',{get:()=>({ready:running && !lastError,error:lastError,gpu,drawCount,time:simulation.time,touching:simulation.touching,pulse:simulation.pulse,width,height,settings:{...settings}})});
for (const key of Object.keys(ranges)) $(key).addEventListener('input',event=>{settings[key]=clamp(Number(event.target.value),...ranges[key]);syncUI();save();if(key==='quality')resize();});
$('pause').onclick=()=>{settings.paused=!settings.paused;syncUI();};
$('pulse').onclick=()=>simulation.burst(0,0);
$('shuffle').onclick=()=>simulation.reset(Date.now()%2147483647);
$('resetSettings').onclick=()=>{Object.assign(settings,defaults);syncUI();resize();save();};
function setSheet(open) {$('controls').hidden=!open;$('settings').setAttribute('aria-expanded',String(open));if(open)$('closeSettings').focus();else $('settings').focus();}
$('settings').onclick=()=>setSheet($('controls').hidden);$('closeSettings').onclick=()=>setSheet(false);
function cinema(on) {document.body.classList.toggle('cinema',on);$('showUI').hidden=!on;if(on)setSheet(false);}
$('cinema').onclick=()=>cinema(true);$('showUI').onclick=()=>cinema(false);
addEventListener('keydown',event=>{if(event.key==='Escape'){setSheet(false);cinema(false);}});
const pointers=new Map();let pinch=null,tap=null;
const world=(x,y)=>{const rect=canvas.getBoundingClientRect(),short=Math.min(rect.width,rect.height);return [(2*(x-rect.left)-rect.width)/short/settings.zoom,(rect.height-2*(y-rect.top))/short/settings.zoom];};
function updatePinch() {const p=[...pointers.values()];if(p.length>=2)pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:settings.zoom};else pinch=null;}
canvas.addEventListener('pointerdown',event=>{
  event.preventDefault();canvas.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,sx:event.clientX,sy:event.clientY,start:performance.now(),moved:false,multi:pointers.size>0});
  if(pointers.size===1)simulation.touch(...world(event.clientX,event.clientY),true);
  else { for(const p of pointers.values())p.multi=true;simulation.touching=false;tap=null;updatePinch(); }
});
canvas.addEventListener('pointermove',event=>{
  const p=pointers.get(event.pointerId);if(!p)return;event.preventDefault();p.x=event.clientX;p.y=event.clientY;if(Math.hypot(p.x-p.sx,p.y-p.sy)>9)p.moved=true;
  if(pointers.size>=2 && pinch){const v=[...pointers.values()];settings.zoom=clamp(pinch.zoom*Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y)/Math.max(1,pinch.distance),.55,1.8);syncUI();}
  else simulation.touch(...world(p.x,p.y),true);
});
function releasePointer(event,cancelled=false){
  const p=pointers.get(event.pointerId);if(!p)return;pointers.delete(event.pointerId);simulation.touching=false;
  if(!cancelled&&!p.moved&&!p.multi&&performance.now()-p.start<350){
    if(tap&&performance.now()-tap.time<340&&Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<35){simulation.burst(...world(event.clientX,event.clientY));tap=null;}
    else tap={time:performance.now(),x:event.clientX,y:event.clientY};
  }
  if(pinch)save();updatePinch();
}
canvas.addEventListener('pointerup',event=>releasePointer(event));
canvas.addEventListener('pointercancel',event=>releasePointer(event,true));
canvas.addEventListener('lostpointercapture',event=>releasePointer(event,true));
canvas.addEventListener('wheel',event=>{event.preventDefault();settings.zoom=clamp(settings.zoom*Math.exp(-event.deltaY*.001),.55,1.8);syncUI();save();},{passive:false});
canvas.addEventListener('contextmenu',event=>event.preventDefault());
addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{simulation.touching=false;pointers.clear();pinch=null;tap=null;previous=0;sampleStart=sampleFrames=0;if(document.hidden){cancelAnimationFrame(raf);}else if(running){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();running=false;cancelAnimationFrame(raf);$('loading').hidden=false;$('loading').textContent='Graphics context interrupted. Waiting for the browser to restore it…';});
canvas.addEventListener('webglcontextrestored',()=>{try{initializeRenderer();}catch(error){fail(error);}});
syncUI();
try {
  gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'default'});
  if(!gl)throw new Error('WebGL 2 is not supported or is disabled.');
  shaderTexts=await Promise.all(['fullscreen.vert','rift.frag'].map(async name=>{const response=await fetch('./shaders/'+name);if(!response.ok)throw new Error('Could not load '+name+': HTTP '+response.status);return response.text();}));
  initializeRenderer();
} catch(error) {fail(error);}
