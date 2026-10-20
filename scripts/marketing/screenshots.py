#!/usr/bin/env python3
"""
Turns the real product captures (PNG masters, DPR 2) into the WebP widths the
marketing site serves (src/marketing/data/screenshots.ts):

    public/marketing-assets/screenshots/v1/<key>-<lang>-<width>w.webp

Masters are named <key>-<lang>-light.png (desktop 2880x1800) and
<key>-mobile-<lang>-light.png (780x1688). Masters are not committed (SPEC D.1).
Usage: python3 -I scripts/marketing/screenshots.py <masters-dir>
"""
import sys
from pathlib import Path
from PIL import Image

# Only the screens the site shows. Left out on purpose (SPEC D.1/A.10):
# dashboard-overview (revenue widget), learner-course-player (text lesson),
# reports (protection signals / empty cohort months), signup.
DESKTOP = {
    'course-builder', 'quiz-builder', 'website-editor', 'academy-site-home',
    'academy-site-course', 'payments-review', 'payment-methods', 'students-list',
}
MOBILE = {'academy-site-home-mobile'}
DESKTOP_WIDTHS = (640, 960, 1280, 1600)
MOBILE_WIDTHS = (390, 780)

def main() -> int:
    src = Path(sys.argv[1])
    out = Path(__file__).resolve().parents[2] / 'public/marketing-assets/screenshots/v1'
    out.mkdir(parents=True, exist_ok=True)
    missing = []
    for key in sorted(DESKTOP | MOBILE):
        for lang in ('en', 'ar'):
            master = src / (f'{key[:-7]}-mobile-{lang}-light.png' if key in MOBILE else f'{key}-{lang}-light.png')
            if not master.exists():
                missing.append(master.name)
                continue
            im = Image.open(master).convert('RGB')
            if key in MOBILE:
                widths, ratio = MOBILE_WIDTHS, 1688 / 780
            else:
                widths, ratio = DESKTOP_WIDTHS, 1000 / 1600
            # Crop to the aspect ratio the page reserves (top-anchored).
            w = im.width
            h = min(im.height, round(w * ratio))
            im = im.crop((0, 0, w, h))
            for width in widths:
                frame = im.resize((width, round(width * ratio)), Image.LANCZOS)
                target = out / f'{key}-{lang}-{width}w.webp'
                frame.save(target, 'WEBP', quality=80, method=6)
    total = sum(p.stat().st_size for p in out.glob('*.webp'))
    print(f'wrote {len(list(out.glob("*.webp")))} files ({total // 1024} KB) to {out}')
    if missing:
        print('MISSING masters:', ', '.join(missing))
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
