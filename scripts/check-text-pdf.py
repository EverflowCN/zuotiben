import sys
import fitz
from PIL import Image, ImageFilter, ImageChops
raster, text = [fitz.open(p) for p in sys.argv[1:]]
assert len(raster) == len(text)
extracted=''.join(p.get_text() for p in text)
normalized=extracted.replace('\n','').replace(' ','')
assert '物理版式验证' in normalized, 'Cover title cannot be searched/copied'
assert '设' in normalized and '求' in normalized, 'Question stems cannot be extracted as searchable text'
assert len(normalized)>35, f'Text layer too short ({len(normalized)} characters)'
for i,(a,b) in enumerate(zip(raster,text)):
    assert a.rect == b.rect
    images=[]
    for page in (a,b):
        pix=page.get_pixmap(matrix=fitz.Matrix(1,1),alpha=False)
        img=Image.frombytes('RGB',[pix.width,pix.height],pix.samples).convert('L')
        images.append(img.point(lambda v: 255 if v<180 else 0))
    # Compare ink location allowing three PDF pixels for CFF/TrueType hinting and antialiasing.
    ratios=[]
    for source,target in (images,images[::-1]):
        near=target.filter(ImageFilter.MaxFilter(7))
        missing=ImageChops.subtract(source,near)
        ink=sum(source.histogram()[1:])
        absent=sum(missing.histogram()[1:])
        ratios.append(absent/max(ink,1))
    print('PDF VISUAL PAGE',i+1,'unmatched ink',ratios)
    # At the correct 9.03 pt master font (previously accidentally 10.5 pt),
    # glyph hinting differences occupy slightly more of the ink footprint.
    # A 3% mismatch cap accommodates subpixel raster/vector hinting, while\n    # still requiring 97% positional ink overlap (within a 3-pixel radius).
    assert max(ratios)<.03, 'Text PDF visibly differs from preview image PDF'
print('PASS selectable Chinese text + matching page geometry + visual ink placement')
