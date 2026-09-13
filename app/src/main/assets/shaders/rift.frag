#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uZoom;
uniform float uGlow;
uniform float uTurbulence;
uniform int uTheme;
uniform int uCount;
uniform int uQuality;
uniform vec4 uBalls[40];
uniform vec2 uPointer;
uniform float uTouch;
uniform float uPulse;

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
float noise2(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.0-2.0*f);
    return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),
               mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
    float n=0.0, a=0.5;
    mat2 m=mat2(1.58,1.21,-1.21,1.58);
    for(int i=0;i<5;i++) {
        if(i>=3 && uQuality==0) break;
        n+=a*noise2(p); p=m*p+17.3; a*=0.5;
    }
    return n;
}
float smin(float a, float b, float k) {
    float h=clamp(0.5+0.5*(b-a)/k,0.0,1.0);
    return mix(b,a,h)-k*h*(1.0-h);
}
mat2 rotate(float a) { float s=sin(a),c=cos(a); return mat2(c,-s,s,c); }
vec3 edgePalette(vec2 p) {
    float t=clamp(0.5+p.y*0.65+sin(p.x*2.5+uTime*0.14)*0.14,0.0,1.0);
    if(uTheme==0) {
        vec3 a=mix(vec3(0.72,0.19,1.0),vec3(1.0,0.78,0.34),smoothstep(0.08,0.48,t));
        return mix(a,vec3(0.30,1.0,0.02),smoothstep(0.50,0.92,t));
    }
    if(uTheme==1) return mix(vec3(0.48,0.22,1.0),vec3(0.04,1.0,0.72),t);
    if(uTheme==2) return mix(vec3(1.0,0.08,0.16),vec3(1.0,0.84,0.25),t);
    return mix(vec3(0.25,0.29,1.0),vec3(0.45,0.85,1.0),t);
}
vec3 stars(vec2 p,float scale,float layer) {
    vec2 q=p*scale, cell=floor(q), f=fract(q)-0.5;
    float rnd=hash21(cell+layer*71.3);
    vec2 offset=vec2(hash21(cell+22.1),hash21(cell+39.8))-0.5;
    vec2 d=f-offset*0.65;
    float radius=mix(0.018,0.055,hash21(cell-17.4));
    float dotStar=exp(-dot(d,d)/(radius*radius));
    float twinkle=0.58+0.42*sin(uTime*(0.6+rnd)+rnd*81.0);
    float cross=exp(-abs(d.x)*110.0)*exp(-abs(d.y)*15.0)
              +exp(-abs(d.y)*110.0)*exp(-abs(d.x)*15.0);
    float bright=smoothstep(0.88,0.995,rnd);
    vec3 tint=mix(vec3(0.42,0.68,1.0),vec3(1.0,0.81,0.65),hash21(cell+3.7));
    return tint*(dotStar*0.9+cross*bright*0.23)*step(0.77,rnd)*twinkle;
}
void main() {
    float shortSide=min(uResolution.x,uResolution.y);
    vec2 screen=(2.0*gl_FragCoord.xy-uResolution)/shortSide;
    vec2 p=screen/uZoom;
    float time=uTime;
    vec2 warp=vec2(sin(p.y*5.1+time*0.65)+sin(p.x*8.0-time*0.43),
                   cos(p.x*4.6-time*0.47)+sin(p.y*7.6+time*0.40));
    vec2 w=p+warp*0.015*uTurbulence;
    float sdf=100.0;
    for(int i=0;i<40;i++) {
        if(i>=uCount) break;
        float d=length(w-uBalls[i].xy)-uBalls[i].z;
        sdf=smin(sdf,d,0.12+0.038*uTurbulence);
    }
    float aa=max(fwidth(sdf),1.1/(shortSide*uZoom));
    float inside=1.0-smoothstep(-aa,aa,sdf);
    vec3 edge=edgePalette(p);
    vec3 background=vec3(0.008,0.013,0.028);
    background+=vec3(0.028,0.018,0.064)*exp(-dot(screen*0.65,screen*0.65));
    background+=stars(screen+vec2(time*0.001,0.0),13.0,5.0)*0.085;
    float halo=exp(-max(sdf,0.0)*19.0)*smoothstep(-aa,aa,sdf);
    background+=edge*halo*0.24*uGlow;
    background+=edge*exp(-max(sdf,0.0)*7.0)*smoothstep(0.0,0.05,sdf)*0.045*uGlow;

    vec2 normal=normalize(vec2(dFdx(sdf),dFdy(sdf))+vec2(0.000001));
    vec2 q=p-normal*exp(-abs(sdf)*27.0)*0.035;
    q+=uPointer*0.025;
    q=rotate(time*0.025+length(q)*0.23*uTurbulence)*q;
    float n=fbm(q*3.3+vec2(time*0.032,-time*0.018));
    float dust=fbm(q*7.2+vec2(n*2.1,-n*1.7)-time*0.024);
    float band=exp(-pow((q.y+0.23*sin(q.x*3.0+time*0.07))*3.3,2.0));
    vec3 nebula=vec3(0.012,0.014,0.060);
    vec3 cool=vec3(0.028,0.12,0.82), warm=vec3(0.48,0.024,0.45);
    if(uTheme==1) {cool=vec3(0.025,0.39,0.49);warm=vec3(0.31,0.055,0.68);}
    if(uTheme==2) {cool=vec3(0.47,0.045,0.018);warm=vec3(0.71,0.15,0.025);}
    if(uTheme==3) {cool=vec3(0.09,0.11,0.44);warm=vec3(0.20,0.16,0.32);}
    nebula+=cool*pow(n,2.0)*(0.28+band*1.15);
    nebula+=warm*pow(dust,3.0)*0.65;
    nebula+=vec3(0.14,0.28,0.64)*pow(dust*band,4.0)*0.55;
    nebula+=stars(q+vec2(time*0.003,0.0),14.0,1.0)*0.75;
    if(uQuality>0) nebula+=stars(q*1.1-vec2(time*0.002,0.0),29.0,2.0)*0.38;
    if(uQuality>1) nebula+=stars(q*1.2+time*0.001,51.0,3.0)*0.22;
    // Delicate rotating arcs and filaments, visible only within the portal.
    float r=length(q-vec2(0.08,-0.04));
    float arc=exp(-abs(r-0.58)*180.0)*0.035
             +exp(-abs(r-0.88)*200.0)*0.025;
    nebula+=vec3(0.10,0.31,0.7)*arc;
    nebula+=edge*exp(-abs(sdf)*36.0)*0.15*uGlow;
    vec3 color=mix(background,nebula,inside);
    float rim=exp(-abs(sdf)*125.0);
    float core=exp(-abs(sdf)*280.0);
    float flow=0.8+0.2*sin(p.x*5.0+p.y*7.0-time*1.2);
    color+=edge*rim*(0.90+flow*0.25)*uGlow;
    color+=mix(edge,vec3(1.0),0.72)*core*0.62*uGlow;
    // A touch creates a softly expanding ripple, not a strobing flash.
    float ripple=exp(-abs(length(p-uPointer)-uPulse)*60.0);
    color+=edge*ripple*max(0.0,1.0-uPulse/1.9)*0.13*step(0.01,uPulse);
    color+=edge*exp(-length(p-uPointer)*13.0)*0.07*uTouch;
    float vignette=1.0-0.15*smoothstep(0.4,2.6,length(screen));
    color*=vignette;
    // Filmic soft rolloff keeps bright rims luminous without solid white blobs.
    color=1.0-exp(-color*1.35);
    color=pow(max(color,vec3(0.0)),vec3(0.80));
    fragColor=vec4(color,1.0);
}
