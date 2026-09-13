#!/usr/bin/env python3
"""Run the unmodified app GLSL on native Mesa EGL/OpenGL ES 3 (not WebGL).
Requires system libEGL, Python, Pillow, NumPy. No browser is used.
"""
import ctypes as C
import ctypes.util
import os, sys, json
from pathlib import Path
os.environ.setdefault('EGL_PLATFORM','surfaceless')
os.environ.setdefault('LIBGL_ALWAYS_SOFTWARE','1')
from PIL import Image
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
EGL=C.CDLL(ctypes.util.find_library('EGL') or 'libEGL.so.1')

def egl(name,restype,argtypes):
    f=getattr(EGL,name);f.restype=restype;f.argtypes=argtypes;return f
P=C.c_void_p; I=C.c_int; U=C.c_uint; F=C.c_float
getdisplay=egl('eglGetDisplay',P,[P])
initialize=egl('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])
bind=egl('eglBindAPI',U,[U])
choose=egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])
createcontext=egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])
createsurface=egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])
makecurrent=egl('eglMakeCurrent',U,[P,P,P,P])
getproc=egl('eglGetProcAddress',P,[C.c_char_p])
error=egl('eglGetError',U,[])
display=getdisplay(None); major=I();minor=I()
assert initialize(display,C.byref(major),C.byref(minor)),hex(error())
assert bind(0x30A0) # EGL_OPENGL_ES_API
attrs=(I*13)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3033,1,0x3040,0x40,0x3038)
config=P();num=I();assert choose(display,attrs,C.byref(config),1,C.byref(num)) and num.value
w=int(os.getenv('WIDTH','540'));h=int(os.getenv('HEIGHT','1080'))
surf=createsurface(display,config,(I*5)(0x3057,w,0x3056,h,0x3038))
ctx=createcontext(display,config,None,(I*3)(0x3098,3,0x3038))
assert ctx and surf and makecurrent(display,surf,surf,ctx),hex(error())
def gl(name,restype,argtypes):
    address=getproc(name.encode());assert address,name
    return C.CFUNCTYPE(restype,*argtypes)(address)
getstr=gl('glGetString',C.c_char_p,[U]); print('Renderer:',getstr(0x1F01).decode(),flush=True)
print('Version:',getstr(0x1F02).decode(),flush=True)
createshader=gl('glCreateShader',U,[U]);source=gl('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)])
compile_=gl('glCompileShader',None,[U]);getshader=gl('glGetShaderiv',None,[U,U,C.POINTER(I)])
shaderlog=gl('glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
program=gl('glCreateProgram',U,[])();attach=gl('glAttachShader',None,[U,U])
for name,kind in [('fullscreen.vert',0x8B31),('rift.frag',0x8B30)]:
    text=(ROOT/'app/src/main/assets/shaders'/name).read_bytes(); s=createshader(kind)
    source(s,1,C.byref(C.c_char_p(text)),None);compile_(s);ok=I();getshader(s,0x8B81,C.byref(ok))
    log=C.create_string_buffer(16384);shaderlog(s,len(log),None,log)
    if log.value:print(name,log.value.decode())
    assert ok.value,name;attach(program,s)
gl('glLinkProgram',None,[U])(program)
ok=I();gl('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(ok))
log=C.create_string_buffer(16384);gl('glGetProgramInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])(program,len(log),None,log)
assert ok.value,log.value
gl('glUseProgram',None,[U])(program);gl('glViewport',None,[I,I,I,I])(0,0,w,h)
loc=gl('glGetUniformLocation',I,[U,C.c_char_p])
u1f=gl('glUniform1f',None,[I,F]);u1i=gl('glUniform1i',None,[I,I]);u2f=gl('glUniform2f',None,[I,F,F]);u4fv=gl('glUniform4fv',None,[I,I,C.POINTER(F)])
locations={s:loc(program,s.encode()) for s in ['uResolution','uTime','uZoom','uGlow','uTurbulence','uTheme','uCount','uQuality','uBalls','uPointer','uTouch','uPulse']}
u2f(locations['uResolution'],w,h);u1f(locations['uZoom'],0.90);u1f(locations['uGlow'],1.05);u1f(locations['uTurbulence'],.8)
u2f(locations['uPointer'],0,0);u1f(locations['uTouch'],0);u1f(locations['uPulse'],0)
u1i(locations['uCount'],28);u1i(locations['uQuality'],1)
frames=json.loads((ROOT/'tests/frames.json').read_text())
draw=gl('glDrawArrays',None,[U,I,I]);read=gl('glReadPixels',None,[I,I,I,I,U,U,P]);geterror=gl('glGetError',U,[])
output=ROOT/'docs/renderer';output.mkdir(parents=True,exist_ok=True)
mode=sys.argv[1] if len(sys.argv)>1 else 'stills'
selections=[(0,0),(0,55),(1,30),(2,75),(3,100)] if mode in ('stills','matrix') else [(0,k) for k in range(len(frames))]
for index,(theme,frame) in enumerate(selections):
    data=frames[frame];u1f(locations['uTime'],data['time']);u1i(locations['uTheme'],theme)
    arr=(F*160)(*data['balls']);u4fv(locations['uBalls'],40,arr);draw(0x0004,0,3)
    pixels=np.empty((h,w,4),dtype=np.uint8);read(0,0,w,h,0x1908,0x1401,pixels.ctypes.data_as(P))
    err=geterror();assert err==0,hex(err)
    assert pixels[:,:,:3].max()>120 and pixels[:,:,:3].std()>8,'Blank/flat shader output'
    name=f'preview-{index:03}.png' if mode=='stills' else f'{mode}-{index:03}.png'
    
    if mode!='matrix': Image.fromarray(pixels[::-1]).save(output/name)
    if index%20==0:print('Rendered',name,flush=True)
print('PASS: shader compilation, link, draw, readback, nonblank output, GL errors = 0',flush=True)

if mode=='matrix':
    cases=0
    for theme in range(4):
        for quality in range(3):
            for count in [12,28,40]:
                u1i(locations['uTheme'],theme);u1i(locations['uQuality'],quality);u1i(locations['uCount'],count)
                u1f(locations['uZoom'],.9);u1f(locations['uPulse'],.6);u1f(locations['uTouch'],1)
                draw(0x0004,0,3)
                read(0,0,w,h,0x1908,0x1401,pixels.ctypes.data_as(P))
                assert geterror()==0,'GL error in parameter matrix'
                assert pixels[:,:,:3].max()>120 and pixels[:,:,:3].std()>8,'Flat output in parameter matrix'
                cases+=1
    print(f'PASS: {cases} palette/quality/droplet combinations at {w}x{h}, including pulse/touch uniforms.',flush=True)
