"""Bake deterministic 3D paint zones into the existing Obsidian UV atlases.
No geometry is changed. Run from repository root with numpy and Pillow installed.
"""
import io,json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
OUT=Path('assets/skins/obsidian-chile')
OUT.mkdir(parents=True,exist_ok=True)
WHITE=np.array([226,233,244]);BLUE=np.array([20,48,115]);RED=np.array([205,30,48])
for name in (sys.argv[1:] or ['fighter','portal','inner-ring']):
    blob=Path(f'assets/models/ancestral-{name}.glb').read_bytes()
    size=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+size]);data=blob[28+size:]
    def accessor(i):
        a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
        dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];width={'VEC3':3,'VEC2':2,'SCALAR':1}[a['type']]
        return np.ndarray((a['count'],width),dtype=dtype,buffer=data,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',np.dtype(dtype).itemsize*width),np.dtype(dtype).itemsize))
    primitive=g['meshes'][0]['primitives'][0];p=accessor(primitive['attributes']['POSITION']).copy();uv=accessor(primitive['attributes']['TEXCOORD_0']);tri=accessor(primitive['indices']).reshape(-1,3)
    mat=g['materials'][0]['pbrMetallicRoughness'];image=g['images'][g['textures'][mat['baseColorTexture']['index']]['source']];v=g['bufferViews'][image['bufferView']]
    original=np.array(Image.open(io.BytesIO(data[v['byteOffset']:v['byteOffset']+v['byteLength']])).convert('RGB').resize((1024,1024)),dtype=float)
    center=(p.min(0)+p.max(0))/2;p-=center;p*=124/np.ptp(p,axis=0).max() if name=='fighter' else (98 if name=='portal' else 68)/np.ptp(p,axis=0).max()
    if name=='fighter':p=np.column_stack((-p[:,2],p[:,1],p[:,0]))
    else:
        r=np.linalg.norm(p[:,:2],axis=1);outside=r.max();p[:,:2]*=((outside-(outside-r)*.504)/np.maximum(r,1e-6))[:,None]
    canvas=np.zeros((1024,1024,3),dtype=np.uint8);coverage=np.zeros((1024,1024),dtype=np.uint8)
    for t in tri:
        q=uv[t]*1023;lo=np.maximum(np.floor(q.min(0)).astype(int),0);hi=np.minimum(np.ceil(q.max(0)).astype(int),1023)
        if np.any(hi<lo):continue
        xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1),np.arange(lo[1],hi[1]+1));a,b,c=q
        det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(det)<1e-8:continue
        w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/det;w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/det;w2=1-w0-w1
        mask=(w0>=-.001)&(w1>=-.001)&(w2>=-.001)
        if not mask.any():continue
        pos=w0[...,None]*p[t[0]]+w1[...,None]*p[t[1]]+w2[...,None]*p[t[2]];x,y,z=np.moveaxis(pos,-1,0)
        color=np.broadcast_to(BLUE,(*xx.shape,3)).copy()
        if name=='fighter':
            # White is limited to upper armor; gun barrels/exhausts stay navy.
            ax=np.abs(x);front=z<-10;upper=y>3
            flank=front&upper&(ax>8)&(ax<17)&(z>-46)
            shoulder=(ax>29)&(y>5)&(z>-8)&(z<28)
            rearPlate=(z>36)&(z<47)&(ax<9)&(y>5)
            color[flank|shoulder|rearPlate]=WHITE
            redRails=front&upper&(((ax>6)&(ax<8))|((ax>17)&(ax<19)))
            redCollar=((z>30)&(z<33))|((ax>24)&(ax<26)&(z>-12))
            color[redRails|redCollar]=RED
            # Recessed exhausts and lower gun housings retain mechanical contrast.
            color[((z>48)&(y<5))|(front&(ax>19)&(y<0))]=[12,23,44]
            color[front&(ax>19)&(ax<20)&(y>0)&(y<3)]=[33,153,224]
        else:
            radius=np.hypot(x,y);outside=np.linalg.norm(p[:,:2],axis=1).max();angle=np.arctan2(y,x)
            color[:]=WHITE;color[(np.floor((angle+np.pi)/(np.pi/3)).astype(int)%3)==0]=BLUE
            # Continuous inner and outer red rails, rather than atlas color speckles.
            color[(radius>outside-1.7)|(radius<outside-6.0)]=RED
        # Preserve original engraved panels, cavities and illuminated channels.
        # These are authored UV details; do not flatten them to a 20% shade range.
        src=original[yy,xx]/255.0
        luminance=src@np.array([.2126,.7152,.0722])
        shade=np.clip(.12+1.28*np.power(luminance,.72),.12,1.0)
        painted=color*shade[...,None]
        # Restore only the existing cyan windows/channels in their original UVs.
        cyan=np.clip((np.minimum(src[:,:,1],src[:,:,2])-src[:,:,0]-.045)/.18,0,1)
        energy=np.array([38,173,250])*(.45+.55*src.max(axis=-1))[...,None]
        result=np.clip(painted*(1-cyan[...,None])+energy*cyan[...,None],0,255).astype(np.uint8)
        canvas[yy[mask],xx[mask]]=result[mask];coverage[yy[mask],xx[mask]]=255
    # Two texels of edge padding prevent dark seams during bilinear sampling.
    for _ in range(3):
        grown=np.array(Image.fromarray(coverage).filter(ImageFilter.MaxFilter(3)));fill=(coverage==0)&(grown>0)
        for c in range(3):
            channel=np.array(Image.fromarray(canvas[:,:,c]).filter(ImageFilter.MaxFilter(3)));canvas[:,:,c][fill]=channel[fill]
        coverage=grown
    Image.fromarray(canvas).save(OUT/f'{name}.png',optimize=True)
    print(name,(OUT/f'{name}.png').stat().st_size)
