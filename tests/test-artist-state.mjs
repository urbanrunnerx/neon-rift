import assert from 'node:assert/strict';
import {Simulation} from '../docs/simulation.js';
import {DEFAULTS,RANGES,sanitize,snapshot,restoreSnapshot,History,surprise} from '../docs/artist-state.js';

const invalid=sanitize({hue:Infinity,quality:100,count:-50,symmetry:3,colorA:'javascript:bad',tool:'bad',unknown:true});
assert.equal(invalid.hue,0);assert.equal(invalid.quality,2);assert.equal(invalid.count,12);assert.equal(invalid.symmetry,0);assert.equal(invalid.colorA,DEFAULTS.colorA);assert.equal(invalid.tool,'attract');assert.equal(invalid.unknown,undefined);
for(let i=0;i<500;i++)for(const [key,[lo,hi]]of Object.entries(RANGES)){const value=surprise(DEFAULTS)[key];assert.ok(value>=lo&&value<=hi,key);}
const sim=new Simulation(731),settings={...DEFAULTS};sim.step(.2,.8);sim.burst(.1,.2);
const original=snapshot(settings,sim);sim.reset(200);settings.hue=180;restoreSnapshot(original,settings,sim);assert.deepEqual(snapshot(settings,sim),original);
const corrupt=structuredClone(original);corrupt.motion.vx[3]=null;assert.throws(()=>restoreSnapshot(corrupt,settings,sim));assert.deepEqual(snapshot(settings,sim),original,'invalid data must not partly overwrite artwork');
const history=new History(2);history.push('a');history.push('b');history.push('c');assert.equal(history.undo('d'),'c');assert.equal(history.redo('c'),'d');assert.equal(history.undo('d'),'c');history.push('e');assert.equal(history.redo('f'),null);
const a=new Simulation(),b=new Simulation();a.touchMode='attract';b.touchMode='repel';a.touch(.2,.3,true);b.touch(.2,.3,true);a.step(.001,1);b.step(.001,1);assert.ok(a.vx[0]*b.vx[0]<0&&a.vy[0]*b.vy[0]<0);
for(const mode of ['attract','repel','swirl','counterSwirl']){const s=new Simulation();s.touchMode=mode;s.touchStrength=2;s.touch(-4,4,true);for(let i=0;i<500;i++)s.step(.25,2);assert.ok([...s.balls,...s.vx,...s.vy].every(Number.isFinite));}
const x=sim.balls[0]+.1,y=sim.balls[1]-.1;sim.sculpt(0,x,y);assert.ok(Math.abs(sim.balls[0]-x)<1e-6&&Math.abs(sim.balls[1]-y)<1e-6);assert.equal(sim.vx[0],0);
console.log('PASS: artist settings, 500 random looks, exact restore, corrupt-data rejection, undo/redo, brush stability, sculpt');
