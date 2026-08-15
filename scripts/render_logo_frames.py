#!/usr/bin/env python3
"""Render the hummingbird-feeding ASCII animation into 1024x1024 logo frames.

Reproduces the look of assets/frames/kolibri-feed-*.png: white monospace glyphs
on black with per-glyph brightness mapped to gray (dim flower, bright bird), at
a 6.3x10.18 px cell, then applies the logo fixes:

  --scale   how much bigger the art is than the original render (1.0 = same)
  --shift   extra pixel offset (dx, dy) applied to the whole art so the
            hummingbird body, not just the bounding box, sits on center

Writes assets/frames/kolibri-feed-NNN.png for every frame.
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "assets", "hummingbird-feeding_data.js")
OUT = os.path.join(ROOT, "assets", "frames")
FONT = "/usr/share/fonts/TTF/DejaVuSansMono-Bold.ttf"

COLS, ROWS = 95, 39          # feeding dataset grid
CELL_W, CELL_H = 8.1, 13.0   # cell size matched to the original render (IoU search)
CANVAS = 1024
SUP = 4                      # supersample factor for crisp glyph edges


def load_frames():
    src = open(DATA, encoding="utf-8").read()
    data = json.loads(src[src.index("{"): src.rindex("}") + 1])
    out = []
    for f in data["frames"]:
        ascii_rows = f["ascii"].split("\n")
        b = f["brightness"]
        out.append((ascii_rows, b))
    return out


def render_grid(ascii_rows, brightness, cell_w, cell_h, font):
    """Draw the 95x39 grid of glyphs, each glyph in gray = its brightness."""
    if isinstance(ascii_rows, str):
        ascii_rows = ascii_rows.split("\n")
    grid_w = int(COLS * cell_w * SUP) + 8
    grid_h = int(ROWS * cell_h * SUP) + 8
    img = Image.new("L", (grid_w, grid_h), 0)
    d = ImageDraw.Draw(img)
    for y, row in enumerate(ascii_rows):
        b_row = brightness[y] if y < len(brightness) else []
        for x, ch in enumerate(row):
            if ch == " ":
                continue
            v = b_row[x] if x < len(b_row) else 0
            if v <= 0:
                continue
            d.text((x * cell_w * SUP, y * cell_h * SUP), ch,
                   fill=min(255, int(v)), font=font)
    return img


def main():
    scale = 1.2
    shift_x = 50.0
    shift_y = 0.0
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == "--scale" and i + 1 < len(args):
            scale = float(args[i + 1]); i += 2
        elif args[i] == "--shift" and i + 1 < len(args):
            sx, sy = args[i + 1].split(",")
            shift_x, shift_y = float(sx), float(sy); i += 2
        else:
            i += 1

    frames = load_frames()
    cell_w, cell_h = CELL_W * scale, CELL_H * scale
    # DejaVu Sans Mono advances 0.602 em; pick the size whose advance == cell_w
    font_size = cell_w / 0.602
    font = ImageFont.truetype(FONT, round(font_size * SUP))
    os.makedirs(OUT, exist_ok=True)

    for idx, (ascii_rows, brightness) in enumerate(frames):
        grid = render_grid(ascii_rows, brightness, cell_w, cell_h, font)
        arr = np.array(grid)
        ys, xs = np.nonzero(arr > 8)
        if len(xs) == 0:
            grid = grid.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)
        else:
            grid = grid.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        w, h = grid.size
        grid = grid.resize((max(1, round(w / SUP)), max(1, round(h / SUP))),
                           Image.Resampling.LANCZOS)
        w, h = grid.size
        canvas = Image.new("L", (CANVAS, CANVAS), 0)
        cx = round((CANVAS - w) / 2 + shift_x)
        cy = round((CANVAS - h) / 2 + shift_y)
        canvas.paste(grid, (cx, cy))
        canvas.save(os.path.join(OUT, f"kolibri-feed-{idx:03d}.png"))
    print(f"wrote {len(frames)} frames to {OUT} (scale {scale}, shift ({shift_x},{shift_y}))")


if __name__ == "__main__":
    main()
