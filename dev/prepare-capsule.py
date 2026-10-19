"""Find atlas sprite bounds without sampling another sprite in the next cell.

Pillow is used only to read source alpha and write fitting metadata. The generated
atlases are preserved byte-for-byte; no artwork is repainted by this script.
"""
from collections import deque
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
REGIONS = {
    'top_casual_01': ('separates', (0, 0, 512, 450), 1),
    'top_cozy_02': ('separates', (512, 0, 1024, 450), 1),
    'top_preppy_03': ('separates', (1024, 0, 1536, 450), 1),
    'bottom_casual_01': ('separates', (0, 450, 512, 1024), 1),
    'bottom_cute_02': ('separates', (512, 480, 1024, 1024), 1),
    'bottom_summer_04': ('separates', (1024, 480, 1536, 1024), 1),
    'dress_elegant_02': ('dresses', (0, 0, 800, 1024), 1),
    'dress_cute_01': ('dresses', (768, 0, 1536, 1024), 1),
    'shoes_casual_01': ('details', (0, 0, 512, 490), 2),
    'shoes_cute_02': ('details', (512, 0, 1024, 490), 2),
    'shoes_chic_03': ('details', (1024, 0, 1536, 490), 2),
    'accessory_casual_01': ('details', (0, 495, 512, 1024), 1),
    'accessory_cute_03': ('details', (512, 495, 1024, 1024), 1),
    'hair_casual_01': ('details', (1024, 495, 1536, 1024), 1),
}

def components(alpha):
    width, height = alpha.size
    mask = bytearray(1 if value > 220 else 0 for value in alpha.tobytes())
    found = []
    for seed in range(len(mask)):
        if not mask[seed]:
            continue
        queue = deque([seed]); mask[seed] = 0; pixels = []
        while queue:
            p = queue.popleft(); pixels.append(p)
            x, y = p % width, p // width
            neighbors = []
            if x: neighbors.append(p - 1)
            if x + 1 < width: neighbors.append(p + 1)
            if y: neighbors.append(p - width)
            if y + 1 < height: neighbors.append(p + width)
            for n in neighbors:
                if mask[n]: mask[n] = 0; queue.append(n)
        if len(pixels) > 500: found.append(pixels)
    return sorted(found, key=len, reverse=True)

result = {}
for item_id, (atlas, region, count) in REGIONS.items():
    asset = 'assets/capsule/' + atlas + '.webp'
    image = Image.open(ROOT / asset).convert('RGBA')
    alpha = image.getchannel('A').crop(region)
    parts = components(alpha)
    assert len(parts) >= count, item_id
    points = [(p % alpha.width + region[0], p // alpha.width + region[1])
              for part in parts[:count] for p in part]
    x0, y0 = min(x for x, y in points), min(y for x, y in points)
    x1, y1 = max(x for x, y in points) + 1, max(y for x, y in points) + 1
    rows = {}
    for x, y in points:
        lo, hi = rows.get(y, (x, x + 1)); rows[y] = (min(lo, x), max(hi, x + 1))
    sampled = []
    for n in range(129):
        y = min(y1 - 1, round(y0 + (y1 - y0) * n / 128))
        if y not in rows: y = min(rows, key=lambda row: abs(row - y))
        sampled.append(list(rows[y]))
    result[item_id] = {'asset': asset, 'imageSize': list(image.size),
                       'crop': [x0, y0, x1 - x0, y1 - y0], 'sourceRows': sampled}
    print(item_id, result[item_id]['crop'])
(ROOT / 'dev/capsule-source.json').write_text(json.dumps(result, separators=(',', ':')), encoding='utf-8')
