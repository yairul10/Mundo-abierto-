"""Repack embedded GLB images at <=1024px, preserving meshes/materials/animations.
Run on the original assets; unreferenced image bytes are removed on repack.
"""
from pathlib import Path
from PIL import Image
from io import BytesIO
import json,struct
ROOT=Path(__file__).resolve().parents[1]/'assets/models'
for name in ['spaceship (3).glb','spacecruiser (1).glb']:
 path=ROOT/name;source=path.read_bytes();length=struct.unpack_from('<I',source,12)[0]
 doc=json.loads(source[20:20+length]);binary=source[28+length:];replacements={}
 for image in doc.get('images',[]):
  index=image.get('bufferView')
  if index is None:continue
  view=doc['bufferViews'][index];start=view.get('byteOffset',0)
  im=Image.open(BytesIO(binary[start:start+view['byteLength']]))
  if max(im.size)<=1024:continue
  im.thumbnail((1024,1024),Image.Resampling.LANCZOS)
  output=BytesIO();im.save(output,format='PNG',optimize=True)
  replacements[index]=output.getvalue();image['mimeType']='image/png'
 if not replacements:print(name,'already optimized');continue
 output=bytearray()
 for i,view in enumerate(doc['bufferViews']):
  while len(output)%4:output.append(0)
  start=view.get('byteOffset',0);data=replacements.get(i,binary[start:start+view['byteLength']])
  view['byteOffset']=len(output);view['byteLength']=len(data);output.extend(data)
 doc['buffers'][0]['byteLength']=len(output)
 while len(output)%4:output.append(0)
 meta=json.dumps(doc,separators=(',',':')).encode()
 while len(meta)%4:meta+=b' '
 total=28+len(meta)+len(output)
 packed=struct.pack('<4sII',b'glTF',2,total)+struct.pack('<I4s',len(meta),b'JSON')+meta+struct.pack('<I4s',len(output),b'BIN\0')+output
 path.write_bytes(packed);print(name, f'{len(source)/1e6:.2f} → {len(packed)/1e6:.2f} MB')
