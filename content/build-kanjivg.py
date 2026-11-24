"""Convert KanjiVG SVG stroke curves into small per-character recognition samples.

Input: official kanjivg-20260714.xml.gz (CC BY-SA 3.0).
Output derivative dataset keeps CC BY-SA 3.0 and attribution metadata.
Usage: python3 content/build-kanjivg.py /absolute/input.xml.gz /absolute/output.json
"""
import base64
import gzip
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from svgpathtools import parse_path

SAMPLES = 12

def resample(points):
    ds=[0.0]
    for a,b in zip(points,points[1:]):
        ds.append(ds[-1]+abs(b-a))
    if ds[-1]<1e-9:
        return [points[0]]*SAMPLES
    result=[]
    seg=1
    for i in range(SAMPLES):
        target=ds[-1]*i/(SAMPLES-1)
        while seg<len(ds)-1 and ds[seg]<target:
            seg+=1
        t=(target-ds[seg-1])/(ds[seg]-ds[seg-1] or 1)
        result.append(points[seg-1]+(points[seg]-points[seg-1])*t)
    return result

root=ET.fromstring(gzip.decompress(Path(sys.argv[1]).read_bytes()))
glyphs=[]
failed=[]
for element in root:
    identifier=element.attrib['id'].split('_',1)[1]
    if '-' in identifier:
        continue
    cp=int(identifier,16)
    # Japanese kana, CJK ideographs and Japanese iteration mark. No Latin noise.
    if not (0x3041<=cp<=0x30FA or 0x3400<=cp<=0x9FFF or 0x20000<=cp<=0x2FA1F or cp in (0x3005,0x3007)):
        continue
    paths=[x.attrib['d'] for x in element.iter('path') if x.attrib.get('d')]
    try:
        strokes=[]
        for d in paths:
            path=parse_path(d)
            strokes.append(resample([path.point(i/95) for i in range(96)]))
        all_points=[p for s in strokes for p in s]
        if not all_points:
            continue
        minx=min(p.real for p in all_points);maxx=max(p.real for p in all_points)
        miny=min(p.imag for p in all_points);maxy=max(p.imag for p in all_points)
        span=max(maxx-minx,maxy-miny,1)
        cx=(minx+maxx)/2;cy=(miny+maxy)/2
        data=bytes(max(0,min(255,round(((v-c)/span+.5)*255))) for s in strokes for p in s for v,c in ((p.real,cx),(p.imag,cy)))
        glyphs.append([chr(cp),base64.b64encode(data).decode('ascii')])
    except Exception as error:
        failed.append([identifier,str(error)])
    if len(glyphs)%1000==0:
        print('processed',len(glyphs),flush=True)
data={'version':1,'release':'r20260714','samplesPerStroke':SAMPLES,
      'source':'https://github.com/KanjiVG/kanjivg/releases/tag/r20260714',
      'copyright':'KanjiVG © Ulrich Apel and contributors',
      'license':'CC BY-SA 3.0','licenseUrl':'https://creativecommons.org/licenses/by-sa/3.0/',
      'changes':'SVG stroke curves resampled by arc distance to 12 points per stroke; normalized and quantized to 8-bit coordinates for local candidate recognition.',
      'glyphs':glyphs}
Path(sys.argv[2]).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print(json.dumps({'glyphs':len(glyphs),'bytes':Path(sys.argv[2]).stat().st_size,'failed':failed},ensure_ascii=False))
