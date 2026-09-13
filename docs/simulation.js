// Port of the native Java motion model. Rendering remains in the original GLSL.
export const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
export class Simulation {
  constructor(seed = 731) {
    this.balls = new Float32Array(160);
    for (const key of ['phase','rate','radius','dx','dy','vx','vy']) this[key] = new Float32Array(40);
    this.reset(seed);
  }
  reset(seed) {
    // java.util.Random's 48-bit generator, used only during initialization.
    let state = (BigInt(Math.trunc(seed)) ^ 0x5DEECE66Dn) & ((1n << 48n) - 1n);
    const random = () => { state = (state * 0x5DEECE66Dn + 11n) & ((1n << 48n) - 1n); return Number(state >> 24n) / 16777216; };
    this.time = 0; this.pulse = 0; this.touching = false; this.pointerX = 0; this.pointerY = 0;
    for (let i = 0; i < 40; i++) {
      this.phase[i] = random() * 6.2831853;
      this.rate[i] = .12 + random() * .22;
      this.radius[i] = i < 9 ? .15 + random() * .115 : .037 + random() * .10;
      this.dx[i] = this.dy[i] = this.vx[i] = this.vy[i] = 0;
    }
    this.updatePositions();
  }
  touch(x, y, down) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.pointerX = clamp(x, -4, 4); this.pointerY = clamp(y, -4, 4); this.touching = down;
  }
  burst(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.touch(x, y, false); this.pulse = .02;
    for (let i = 0; i < 40; i++) {
      const ax = this.balls[i*4]-x, ay = this.balls[i*4+1]-y, d = Math.sqrt(ax*ax+ay*ay+.02);
      this.vx[i] += ax/d * .8/(1+d); this.vy[i] += ay/d * .8/(1+d);
    }
  }
  step(seconds, speed) {
    if (!Number.isFinite(seconds) || !Number.isFinite(speed) || seconds <= 0 || speed <= 0) return;
    const total = Math.min(seconds,.25)*clamp(speed,.1,2), steps = Math.max(1,Math.ceil(total/.008333334)), dt = total/steps;
    for (let step = 0; step < steps; step++) {
      this.time += dt;
      if (this.pulse > 0) { this.pulse += dt*.82; if (this.pulse > 1.9) this.pulse = 0; }
      for (let i = 0; i < 40; i++) {
        let ax = -this.dx[i]*5.2-this.vx[i]*3.1, ay = -this.dy[i]*5.2-this.vy[i]*3.1;
        if (this.touching) {
          const tx=this.pointerX-this.balls[i*4],ty=this.pointerY-this.balls[i*4+1],influence=1.8/(.15+tx*tx+ty*ty);
          ax += clamp(tx*influence,-3.6,3.6); ay += clamp(ty*influence,-3.6,3.6);
        }
        this.vx[i]=clamp(this.vx[i]+ax*dt,-2.5,2.5);this.vy[i]=clamp(this.vy[i]+ay*dt,-2.5,2.5);
        this.dx[i]=clamp(this.dx[i]+this.vx[i]*dt,-1.2,1.2);this.dy[i]=clamp(this.dy[i]+this.vy[i]*dt,-1.2,1.2);
      }
      this.updatePositions();
    }
  }
  updatePositions() {
    for(let i=0;i<40;i++) {
      const a=this.time*this.rate[i]+this.phase[i],spread=i<9?.54:.91;
      this.balls[i*4]=Math.cos(a)*spread+Math.sin(a*1.71+this.phase[i])*.12+this.dx[i];
      this.balls[i*4+1]=Math.sin(a*.87+this.phase[i]*.4)*spread*1.12+Math.cos(a*1.31)*.17+this.dy[i];
      this.balls[i*4+2]=this.radius[i]*(.84+.16*Math.sin(a*1.8+this.phase[i]));
      this.balls[i*4+3]=this.phase[i];
    }
  }
}
