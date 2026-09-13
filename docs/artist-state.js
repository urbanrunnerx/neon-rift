import {clamp} from './simulation.js';

export const VERSION = '0.3.0';
export const DEFAULTS = Object.freeze({theme:0,quality:1,count:28,speed:.75,glow:1.1,turbulence:1,zoom:1,
  hue:0,saturation:1,exposure:1,contrast:1,stars:1,texture:1,rim:1,merge:1,size:1,rotation:0,symmetry:0,
  colorCycle:0,strength:1,tool:'attract',colorA:'#bb30ff',colorB:'#ffca57',colorC:'#58ff16',background:'#020307',paused:false});
export const RANGES = Object.freeze({theme:[0,4],quality:[0,2],count:[12,40],speed:[.15,2],glow:[0,2.5],turbulence:[0,2],zoom:[.55,1.8],
  hue:[0,360],saturation:[0,2.5],exposure:[.3,2],contrast:[.5,1.8],stars:[0,2],texture:[0,2],rim:[.4,2.5],merge:[.25,2],size:[.4,1.8],
  rotation:[0,360],symmetry:[0,8],colorCycle:[0,1],strength:[.2,2]});
export const TOOLS = ['attract','repel','swirl','counterSwirl','freeze','sculpt'];
export const COLORS = ['colorA','colorB','colorC','background'];
export function sanitize(input={}, base=DEFAULTS) {
  const out={...base};
  if (!input || typeof input!=='object') return out;
  for (const [key,range] of Object.entries(RANGES)) if (Number.isFinite(input[key])) out[key]=clamp(input[key],...range);
  for (const key of ['theme','quality','count','symmetry']) out[key]=Math.round(out[key]);
  if (![0,2,4,6,8].includes(out.symmetry)) out.symmetry=0;
  for (const key of COLORS) if (/^#[a-f\d]{6}$/i.test(input[key])) out[key]=input[key].toLowerCase();
  if (TOOLS.includes(input.tool)) out.tool=input.tool;
  if (typeof input.paused==='boolean') out.paused=input.paused;
  return out;
}
export const PRESETS = [
  {name:'Original',values:{}},
  {name:'Deep ocean',values:{theme:4,colorA:'#173cfa',colorB:'#06b6d4',colorC:'#9affdd',background:'#010b14',glow:1.2,stars:.55,speed:.45}},
  {name:'Rose quartz',values:{theme:4,colorA:'#ef80bc',colorB:'#f5c8ea',colorC:'#ffda9e',background:'#10040f',glow:.9,texture:.7,speed:.3,merge:1.45}},
  {name:'Solar ink',values:{theme:2,background:'#090100',contrast:1.35,glow:1.6,stars:.25,rim:.65,texture:1.4}},
  {name:'Prism garden',values:{theme:1,hue:70,symmetry:6,size:.7,merge:.7,rotation:22,glow:1.45,count:20,colorCycle:.2}},
  {name:'Silver silence',values:{saturation:0,glow:.75,contrast:1.25,stars:.4,speed:.2,rim:.7,background:'#07090c'}},
  {name:'Molten glass',values:{theme:4,colorA:'#ff2855',colorB:'#ffab42',colorC:'#b5ff50',glow:1.8,merge:1.7,size:1.3,texture:.3,stars:.3,turbulence:1.5}},
  {name:'Midnight mandala',values:{theme:3,symmetry:8,size:.6,count:16,rotation:15,glow:1.4,texture:1.4,stars:1.6,speed:.4}}
];
export function surprise(current,random=Math.random) {
  const pick=values=>values[Math.floor(random()*values.length)];
  return sanitize({...current,theme:pick([0,1,2,3]),hue:Math.round(random()*360),saturation:.6+random()*1.1,
    exposure:.7+random()*.6,contrast:.8+random()*.5,glow:.6+random()*1.4,stars:random()*1.8,texture:.4+random()*1.3,
    rim:.6+random()*1.3,merge:.5+random()*1.2,size:.65+random()*.65,symmetry:pick([0,0,0,2,4,6,8]),rotation:Math.round(random()*360),
    turbulence:random()*1.8,count:Math.round(12+random()*28)});
}
export function hexRGB(hex) {return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
export function snapshot(settings, simulation) {
  const motion={};
  for (const key of ['balls','phase','rate','radius','dx','dy','vx','vy']) motion[key]=Array.from(simulation[key]);
  for (const key of ['time','pulse','pointerX','pointerY']) motion[key]=simulation[key];
  return {settings:{...settings},motion};
}
export function restoreSnapshot(record,settings,simulation) {
  if (!record || !record.motion) throw new Error('Invalid artwork');
  const motion=record.motion;
  // Validate every field before changing anything, including saved/imported artwork.
  for (const key of ['balls','phase','rate','radius','dx','dy','vx','vy']) {
    if (!Array.isArray(motion[key]) || motion[key].length!==simulation[key].length || motion[key].some(x=>!Number.isFinite(x)||Math.abs(x)>1e6)) throw new Error('Invalid artwork data');
  }
  for (const key of ['time','pulse','pointerX','pointerY']) if(!Number.isFinite(motion[key])||Math.abs(motion[key])>1e9)throw new Error('Invalid artwork time');
  Object.assign(settings,sanitize(record.settings));
  for (const key of ['balls','phase','rate','radius','dx','dy','vx','vy']) simulation[key].set(motion[key]);
  for (const key of ['time','pulse','pointerX','pointerY']) simulation[key]=motion[key];
  simulation.touching=false;
}
export class History {
  constructor(limit=30){this.limit=limit;this.undoStack=[];this.redoStack=[];}
  push(record){this.undoStack.push(record);if(this.undoStack.length>this.limit)this.undoStack.shift();this.redoStack=[];}
  undo(current){if(!this.undoStack.length)return null;this.redoStack.push(current);return this.undoStack.pop();}
  redo(current){if(!this.redoStack.length)return null;this.undoStack.push(current);return this.redoStack.pop();}
}
