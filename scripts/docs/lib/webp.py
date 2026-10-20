"""Writes WebP derivatives of one PNG master (Pillow).

    python3 webp.py <master.png> <out-prefix> <width> [<width> ...]

Writes <out-prefix>-<w>.webp for each width (never upscaled: a width above
the master's is clamped to it). Quality starts at 80 and steps down for the
largest file until it is at most 120 KB (floor 60). Prints one JSON line:
{"files": [{"path": ..., "width": w, "height": h, "bytes": n}], "quality": q,
 "master": [w, h]}
"""
import json
import os
import sys

from PIL import Image

MAX_BYTES = 120 * 1024
QUALITIES = [80, 74, 68, 62]


def main() -> None:
    master, prefix, *widths = sys.argv[1:]
    im = Image.open(master).convert("RGB")
    targets = sorted({min(int(w), im.width) for w in widths})
    os.makedirs(os.path.dirname(prefix) or ".", exist_ok=True)
    files = []
    chosen = QUALITIES[0]
    largest = targets[-1]
    # Pick the quality on the largest derivative, then use it for all.
    for q in QUALITIES:
        chosen = q
        size = _write(im, prefix, largest, q)["bytes"]
        if size <= MAX_BYTES:
            break
    for w in targets:
        files.append(_write(im, prefix, w, chosen))
    print(json.dumps({"files": files, "quality": chosen, "master": [im.width, im.height]}))


def _write(im: Image.Image, prefix: str, width: int, quality: int) -> dict:
    height = round(im.height * width / im.width)
    out = im if width == im.width else im.resize((width, height), Image.LANCZOS)
    path = f"{prefix}-{width}.webp"
    out.save(path, "WEBP", quality=quality, method=6)
    return {"path": path, "width": width, "height": height, "bytes": os.path.getsize(path)}


if __name__ == "__main__":
    main()
