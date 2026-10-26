"""Losslessly repack embedded 8-bit RGB PNGs as WebP; preserve all mesh bytes.
Requires Pillow. Run from the repository root; only smaller encodings are used.
"""
from pathlib import Path
from io import BytesIO
import json, struct
from PIL import Image


def chunks(raw):
    magic, version, length = struct.unpack_from('<III', raw)
    assert magic == 0x46546c67 and version == 2 and length == len(raw)
    n, kind = struct.unpack_from('<II', raw, 12)
    assert kind == 0x4e4f534a
    doc = json.loads(raw[20:20+n])
    size, kind = struct.unpack_from('<II', raw, 20+n)
    assert kind == 0x004e4942 and 28+n+size == len(raw)
    return doc, raw[28+n:]


def view_bytes(doc, binary, index):
    view = doc['bufferViews'][index]
    assert view.get('buffer', 0) == 0
    start = view.get('byteOffset', 0)
    return binary[start:start+view['byteLength']]


def optimize(path):
    original = path.read_bytes()
    doc, binary = chunks(original)
    assert len(doc['buffers']) == 1 and 'uri' not in doc['buffers'][0]
    replacements, converted = {}, set()
    for i, image in enumerate(doc.get('images', [])):
        if image.get('mimeType') != 'image/png' or 'bufferView' not in image:
            continue
        data = view_bytes(doc, binary, image['bufferView'])
        # Avoid silently reducing high-bit-depth images or altering color profiles.
        if data[24:26] != bytes([8, 2]):
            continue
        source = Image.open(BytesIO(data)); source.load()
        if source.info.get('icc_profile'):
            continue
        output = BytesIO()
        source.save(output, format='WEBP', lossless=True, exact=True, method=4)
        encoded = output.getvalue()
        if len(encoded) >= len(data):
            continue
        decoded = Image.open(BytesIO(encoded)); decoded.load()
        assert source.size == decoded.size
        assert source.convert('RGB').tobytes() == decoded.convert('RGB').tobytes()
        replacements[image['bufferView']] = encoded
        image['mimeType'] = 'image/webp'; converted.add(i)
    if not converted:
        return None
    for texture in doc.get('textures', []):
        if texture.get('source') in converted:
            source = texture.pop('source')
            texture.setdefault('extensions', {})['EXT_texture_webp'] = {'source': source}
    for key in ['extensionsUsed', 'extensionsRequired']:
        extensions = doc.setdefault(key, [])
        if 'EXT_texture_webp' not in extensions:
            extensions.append('EXT_texture_webp')
    payload = bytearray()
    for i, view in enumerate(doc['bufferViews']):
        data = replacements.get(i, view_bytes(doc, binary, i))
        payload.extend(b'\0' * (-len(payload) % 4))
        view['byteOffset'], view['byteLength'] = len(payload), len(data)
        payload.extend(data)
    doc['buffers'][0]['byteLength'] = len(payload)
    payload.extend(b'\0' * (-len(payload) % 4))
    encoded_doc = json.dumps(doc, separators=(',', ':'), ensure_ascii=False).encode()
    encoded_doc += b' ' * (-len(encoded_doc) % 4)
    result = (struct.pack('<III', 0x46546c67, 2, 28+len(encoded_doc)+len(payload))
              + struct.pack('<II', len(encoded_doc), 0x4e4f534a) + encoded_doc
              + struct.pack('<II', len(payload), 0x004e4942) + payload)
    # Independent read-back: all non-image bufferViews remain byte-identical.
    new_doc, new_binary = chunks(result)
    old_doc, old_binary = chunks(original)
    for i in range(len(old_doc['bufferViews'])):
        if i not in replacements:
            assert view_bytes(old_doc, old_binary, i) == view_bytes(new_doc, new_binary, i)
    assert len(result) < len(original)
    path.write_bytes(result)
    return {'path': str(path), 'before': len(original), 'after': len(result),
            'textures': len(converted), 'saved': len(original)-len(result)}


if __name__ == '__main__':
    results = []
    for path in sorted(Path('assets/models').glob('*.glb')):
        result = optimize(path)
        if result:
            results.append(result); print(json.dumps(result), flush=True)
    print(json.dumps({'models': len(results), 'textures': sum(x['textures'] for x in results),
                      'saved': sum(x['saved'] for x in results)}), flush=True)
    Path('/tmp/cosmos-lossless-applied.json').write_text(json.dumps(results))
