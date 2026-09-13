#!/usr/bin/env python3
"""Check a native Android screenshot for a nonblank, colored portal region.
Standard-library-only PNG reader: supports the RGB/RGBA 8-bit screenshots from adb.
"""
import struct, sys, zlib
from pathlib import Path

def read_png(path):
    data=Path(path).read_bytes()
    if data[:8]!=b'\x89PNG\r\n\x1a\n': raise ValueError('Not a PNG screenshot')
    offset=8;compressed=bytearray();width=height=channels=None
    while offset<len(data):
        length=struct.unpack('>I',data[offset:offset+4])[0]
        kind=data[offset+4:offset+8];payload=data[offset+8:offset+8+length]
        if kind==b'IHDR':
            width,height,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',payload)
            if depth!=8 or color not in (2,6) or interlace!=0: raise ValueError('Unsupported screenshot PNG')
            channels=3 if color==2 else 4
        if kind==b'IDAT':compressed.extend(payload)
        offset+=length+12
        if kind==b'IEND':break
    raw=zlib.decompress(compressed);stride=width*channels
    previous=bytearray(stride);rows=[];offset=0
    for _ in range(height):
        filter_=raw[offset];offset+=1;row=bytearray(raw[offset:offset+stride]);offset+=stride
        for i in range(stride):
            left=row[i-channels] if i>=channels else 0
            up=previous[i];upperleft=previous[i-channels] if i>=channels else 0
            if filter_==1:prediction=left
            elif filter_==2:prediction=up
            elif filter_==3:prediction=(left+up)//2
            elif filter_==4:
                p=left+up-upperleft;a,b,c=abs(p-left),abs(p-up),abs(p-upperleft)
                prediction=left if a<=b and a<=c else (up if b<=c else upperleft)
            elif filter_==0:prediction=0
            else:raise ValueError('Unsupported PNG filter')
            row[i]=(row[i]+prediction)&255
        rows.append(row);previous=row
    return width,height,channels,rows

def main(path):
    w,h,c,rows=read_png(path);count=colored=0
    for y in range(int(h*.25),int(h*.70),3):
        for x in range(int(w*.08),int(w*.92),3):
            rgb=rows[y][x*c:x*c+3];count+=1
            if max(rgb)>75 and max(rgb)-min(rgb)>30:colored+=1
    ratio=colored/max(1,count)
    if ratio<.005:raise AssertionError(f'Portal region appears blank: {ratio:.4%} colored pixels')
    print(f'PASS: {w}x{h} screenshot; {ratio:.2%} bright colored samples in the portal region.')

if __name__=='__main__': main(sys.argv[1])
