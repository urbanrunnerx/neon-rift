import assert from 'node:assert/strict';
import {Simulation} from '../docs/simulation.js';
let assertions=0;
const check=(x,msg)=>{assert.ok(x,msg);assertions++;};
const a=new Simulation(731),b=new Simulation(731);
assert.deepEqual(a.balls,b.balls);assertions++;
for(let frame=0;frame<1200;frame++){
 if(frame%180===0){a.burst(.1,-.2);b.burst(.1,-.2);}
 a.touch(.3,-.4,frame%90<45);b.touch(.3,-.4,frame%90<45);
 a.step(1/60,1.5);b.step(1/60,1.5);
 for(let i=0;i<40;i++){
  check(Number.isFinite(a.balls[i*4])&&Math.abs(a.balls[i*4])<3,'finite bounded x');
  check(Number.isFinite(a.balls[i*4+1])&&Math.abs(a.balls[i*4+1])<3,'finite bounded y');
  check(a.balls[i*4+2]>0&&a.balls[i*4+2]<.3,'positive bounded radius');
 }
}
assert.deepEqual(a.balls,b.balls);assertions++;
const before=Array.from(a.balls),time=a.time;a.step(NaN,1);a.step(1,Infinity);a.step(-1,1);a.step(1,0);check(a.time===time,'reject invalid steps');assert.deepEqual(Array.from(a.balls),before);assertions++;
a.reset(731);assert.deepEqual(a.balls,new Simulation(731).balls);assertions++;
console.log(JSON.stringify({suite:'JavaScript motion model',passed:true,frames:1200,assertions,notes:'Most assertions are repeated finite/bounds checks, not independent scenarios.'},null,2));
