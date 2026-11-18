"""Build Valkyrien logo SVGs: geometric mark + VALKYRIEN wordmark outlined from Montserrat 700.

Usage: python3 tools/build-logo.py   (requires: pip install fonttools brotli)
Output: src/assets/logo/*.svg and public/favicon.svg
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent.parent
FONT = ROOT / "node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2"
OUT = ROOT / "src/assets/logo"

INK, PAPER, GOLD = "#0a192f", "#ffffff", "#b8935a"
WORD = "VALKYRIEN"
TRACKING = 0.16  # em, same as .brand__name

# Mark, 32x32 grid, 1.5px strokes: square frame + nested chevrons (outer V = structure, inner V = gold route)
def mark(frame, outer, inner, x=0.0, y=0.0, s=1.0):
    t = f' transform="translate({x:g} {y:g}) scale({s:g})"' if (x or y or s != 1) else ""
    return (
        f'<g fill="none" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter"{t}>'
        f'<rect x="1.75" y="1.75" width="28.5" height="28.5" rx="1.5" stroke="{frame}"/>'
        f'<path d="M7 8.5 16 25 25 8.5" stroke="{outer}"/>'
        f'<path d="M12 8.5 16 16 20 8.5" stroke="{inner}"/>'
        "</g>"
    )

def wordmark_path(cap_height_px):
    font = TTFont(FONT)
    font = instantiateVariableFont(font, {"wght": 700})
    gs, cmap = font.getGlyphSet(), font.getBestCmap()
    cap = font["OS/2"].sCapHeight or 700
    scale = cap_height_px / cap
    upm = font["head"].unitsPerEm
    pen = SVGPathPen(gs)
    x = 0.0
    hmtx = font["hmtx"]
    names = [cmap[ord(c)] for c in WORD]
    for i, n in enumerate(names):
        tp = TransformPen(pen, (scale, 0, 0, -scale, x, cap_height_px))
        gs[n].draw(tp)
        x += hmtx[n][0] * scale
        if i < len(names) - 1:
            x += TRACKING * upm * scale
    return pen.getCommands(), x

def write(name, svg):
    (OUT / name).write_text(svg + "\n")
    print("wrote", (OUT / name).relative_to(ROOT))

OUT.mkdir(parents=True, exist_ok=True)

# 1. Mark only
for suffix, (f, o, i) in {"": (INK, INK, GOLD), "-reversed": (PAPER, PAPER, GOLD)}.items():
    write(f"logo-mark{suffix}.svg",
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Valkyrien">{mark(f, o, i)}</svg>')

# 2. Horizontal lockup: mark 40px + 14px gap + wordmark with cap height 14px, optically centred
d, w = wordmark_path(14)
H, M, G = 40, 40, 14
width = M + G + w
for suffix, (f, o, i, txt) in {"": (INK, INK, GOLD, INK), "-reversed": (PAPER, PAPER, GOLD, PAPER)}.items():
    write(f"logo-horizontal{suffix}.svg",
          f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} {H}" role="img" aria-label="Valkyrien Holding">'
          f'{mark(f, o, i, s=M / 32)}'
          f'<path transform="translate({M + G} {(H - 14) / 2:g})" fill="{txt}" d="{d}"/></svg>')

# 3. Favicon: the navy tile is the frame; chevrons only, heavier stroke so 16px stays legible
(ROOT / "public/favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">'
    f'<rect width="32" height="32" rx="4" fill="{INK}"/>'
    '<g fill="none" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter">'
    f'<path d="M5.5 7 16 26.5 26.5 7" stroke="{PAPER}"/><path d="M11 7 16 16.5 21 7" stroke="{GOLD}"/></g></svg>\n')
print("wrote public/favicon.svg")
