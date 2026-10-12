"""Build PDF-compatible TrueType outlines from the existing preview fonts.
Original fonts and preview CSS remain untouched. Metrics are copied verbatim.
"""
from pathlib import Path
from copy import deepcopy
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
source=Path('paper/assets/vendor/typst/fonts')
target=Path('paper/editor/vendor/pdf-fonts');target.mkdir(parents=True,exist_ok=True)
names=['FandolSong-Regular','FandolSong-Bold','FandolHei-Regular','FandolHei-Bold','FandolKai-Regular','TeXGyreTermesX-Regular','TeXGyreTermesX-Bold','TeXGyreTermesX-Italic']
for name in names:
    out=target/(name+'.ttf')
    if out.exists():continue
    old=TTFont(source/(name+'.otf'))
    order=old.getGlyphOrder();gs=old.getGlyphSet();glyphs={}
    for key in order:
        pen=TTGlyphPen(gs)
        gs[key].draw(Cu2QuPen(pen,max_err=old['head'].unitsPerEm/2000,reverse_direction=True))
        glyphs[key]=pen.glyph()
    fb=FontBuilder(old['head'].unitsPerEm,isTTF=True)
    fb.setupGlyphOrder(order);fb.setupCharacterMap(old.getBestCmap());fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(old['hmtx'].metrics)
    fb.setupHorizontalHeader(ascent=old['hhea'].ascent,descent=old['hhea'].descent,lineGap=old['hhea'].lineGap)
    fb.font['name']=deepcopy(old['name']);fb.font['OS/2']=deepcopy(old['OS/2'])
    fb.setupPost(italicAngle=old['post'].italicAngle,underlinePosition=old['post'].underlinePosition,underlineThickness=old['post'].underlineThickness,keepGlyphNames=False)
    fb.font['head'].macStyle=old['head'].macStyle
    fb.save(out);print('Built PDF font',name,flush=True)
