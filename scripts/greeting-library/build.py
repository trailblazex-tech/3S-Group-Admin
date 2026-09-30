"""
Builds the ready-made banner library that Event Greetings offer in the admin.

Every photo in sources.json is public domain (CC0), found through Openverse,
so the school can use it on its website without credit or fees. Each one is
turned into:

  <id>.webp        a short looping animation: the photo with a festive effect
                   moving over it (diya embers, fireworks, gulal, snow ...)
  <id>-still.webp  the same picture without motion, for visitors who ask their
                   device to reduce motion
  <id>-thumb.webp  a small still for the admin's picker grid

A few festivals had no suitable free photo; those are drawn here instead
(see ILLUSTRATIONS). The files go to .build/greeting-library/; the manifest the API serves
to the admin is written to api/src/core/greeting-library.json. Upload with
`npm run library:upload`.

  pip install pillow numpy
  python scripts/greeting-library/build.py [--only diwali-1,eid-1]
"""
import io
import json
import math
import random
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).parent
ROOT = HERE.parent.parent
OUT = ROOT / '.build' / 'greeting-library'
CACHE = ROOT / '.build' / 'greeting-library-sources'

W, H = 960, 540          # output size, 16:9 like the website's popup banner
SS = 2                   # overlay supersampling for smooth particles
FRAMES = 30
FRAME_MS = 100           # 3 s loop
TAU = math.tau
UA = {'User-Agent': '3s-admin-greeting-library/1.0'}


# ---------------------------------------------------------------------------
# Sources
# ---------------------------------------------------------------------------

def fetch(entry):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{entry['id']}.img"
    if not path.exists():
        request = urllib.request.Request(entry['url'], headers=UA)
        path.write_bytes(urllib.request.urlopen(request, timeout=60).read())
    return Image.open(io.BytesIO(path.read_bytes())).convert('RGB')


def cover(image, width, height):
    """Scales and centre-crops to exactly width x height."""
    scale = max(width / image.width, height / image.height)
    resized = image.resize((math.ceil(image.width * scale), math.ceil(image.height * scale)), Image.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    return resized.crop((left, top, left + width, top + height))



# ---------------------------------------------------------------------------
# Effects. Each returns draw(frame_index) -> RGBA overlay at W*SS x H*SS.
# Every particle completes a whole number of cycles per loop, so the last
# frame flows into the first without a jump.
# ---------------------------------------------------------------------------

OW, OH = W * SS, H * SS


def rgba(hex_colour, alpha):
    hex_colour = hex_colour.lstrip('#')
    return tuple(int(hex_colour[i:i + 2], 16) for i in (0, 2, 4)) + (int(max(0, min(255, alpha))),)


def falling(rng, count, colours, size, shape, speed=(1, 2), sway=30, rising=False):
    items = [
        {
            'x': rng.uniform(0, OW),
            'y': rng.uniform(0, OH),
            'k': rng.choice(range(speed[0], speed[1] + 1)),
            'phase': rng.uniform(0, TAU),
            'spin': rng.choice([-2, -1, 1, 2]),
            'size': rng.uniform(*size),
            'colour': rng.choice(colours),
            'alpha': rng.uniform(170, 255),
        }
        for _ in range(count)
    ]

    def draw(t, d):
        for p in items:
            travel = (p['k'] * t * (OH + 80))
            y = (p['y'] + (-travel if rising else travel)) % (OH + 80) - 40
            x = p['x'] + math.sin(TAU * t * p['k'] + p['phase']) * sway * SS
            angle = p['phase'] + TAU * t * p['spin']
            s = p['size'] * SS
            colour = rgba(p['colour'], p['alpha'])
            if shape == 'rect':
                flip = abs(math.cos(angle * 1.3))  # tumbling confetti
                w, h = s, s * 0.45 * (0.25 + flip)
                pts = [(-w, -h), (w, -h), (w, h), (-w, h)]
                ca, sa = math.cos(angle), math.sin(angle)
                d.polygon([(x + px * ca - py * sa, y + px * sa + py * ca) for px, py in pts], fill=colour)
            elif shape == 'petal':
                ca, sa = math.cos(angle), math.sin(angle)
                pts = []
                for i in range(12):
                    a = TAU * i / 12
                    px, py = math.cos(a) * s, math.sin(a) * s * 0.5 * (0.4 + abs(math.cos(angle)))
                    pts.append((x + px * ca - py * sa, y + px * sa + py * ca))
                d.polygon(pts, fill=colour)
            else:
                d.ellipse((x - s, y - s, x + s, y + s), fill=colour)

    return draw


def effect_confetti(rng, palette=None):
    palette = palette or ['#f94144', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#f15bb5', '#ffffff']
    return {'layers': [falling(rng, 70, palette, (5, 9), 'rect', speed=(1, 2), sway=25)], 'glow': 0}


def effect_tricolour(rng):
    layers = [falling(rng, 60, ['#ff9933', '#ffffff', '#138808', '#ff9933', '#138808'], (5, 9), 'rect', speed=(1, 2), sway=22)]
    layers.append(twinkles(rng, 14, ['#fff4d6'], (7, 13)))
    return {'layers': layers, 'glow': 6}


def effect_snow(rng):
    return {
        'layers': [
            falling(rng, 55, ['#ffffff'], (1.5, 3.5), 'dot', speed=(1, 1), sway=18),
            falling(rng, 22, ['#ffffff'], (3.5, 6), 'dot', speed=(1, 2), sway=30),
        ],
        'glow': 4,
    }


def effect_petals(rng, palette):
    return {'layers': [falling(rng, 34, palette, (7, 12), 'petal', speed=(1, 1), sway=45)], 'glow': 0}


def effect_embers(rng):
    return {
        'layers': [
            falling(rng, 55, ['#ffb347', '#ffd166', '#ff7b00', '#fff1b8'], (1.5, 3.2), 'dot', speed=(1, 2), sway=14, rising=True),
            twinkles(rng, 10, ['#ffe7a3'], (6, 11)),
        ],
        'glow': 8,
    }


def effect_dust(rng):
    return {
        'layers': [
            falling(rng, 70, ['#fff3c4', '#ffe08a', '#ffffff'], (1.2, 2.6), 'dot', speed=(1, 1), sway=40, rising=True),
            twinkles(rng, 8, ['#fff8e1'], (6, 10)),
        ],
        'glow': 5,
    }


def twinkles(rng, count, colours, size):
    stars = [
        {
            'x': rng.uniform(0.04, 0.96) * OW,
            'y': rng.uniform(0.04, 0.8) * OH,
            'phase': rng.uniform(0, 1),
            'k': rng.choice([1, 2]),
            'size': rng.uniform(*size) * SS,
            'colour': rng.choice(colours),
        }
        for _ in range(count)
    ]

    def draw(t, d):
        for s in stars:
            v = math.sin(math.pi * ((t * s['k'] + s['phase']) % 1)) ** 4
            if v < 0.02:
                continue
            r = s['size'] * (0.4 + 0.6 * v)
            c = rgba(s['colour'], 255 * v)
            x, y = s['x'], s['y']
            thin = r * 0.13
            d.polygon([(x - r, y), (x - thin, y - thin), (x, y - r), (x + thin, y - thin), (x + r, y), (x + thin, y + thin), (x, y + r), (x - thin, y + thin)], fill=c)
            d.ellipse((x - r * 0.18, y - r * 0.18, x + r * 0.18, y + r * 0.18), fill=rgba('#ffffff', 255 * v))

    return draw


def effect_sparkle(rng):
    return {'layers': [twinkles(rng, 26, ['#fff6d8', '#ffffff', '#ffe29a'], (7, 15))], 'glow': 7}


def effect_bokeh(rng):
    orbs = [
        {
            'x': rng.uniform(0, OW),
            'y': rng.uniform(0, OH),
            'r': rng.uniform(14, 42) * SS,
            'phase': rng.uniform(0, TAU),
            'colour': rng.choice(['#fff4d6', '#ffe0a3', '#ffffff', '#d7f0ff']),
            'a': rng.uniform(35, 80),
        }
        for _ in range(18)
    ]

    def draw(t, d):
        for o in orbs:
            y = (o['y'] - t * (OH + 200)) % (OH + 200) - 100
            x = o['x'] + math.sin(TAU * t + o['phase']) * 20 * SS
            a = o['a'] * (0.6 + 0.4 * math.sin(TAU * t + o['phase']))
            d.ellipse((x - o['r'], y - o['r'], x + o['r'], y + o['r']), fill=rgba(o['colour'], a))

    return {'layers': [draw], 'glow': 0, 'soften': 6}


def effect_powder(rng):
    """Holi: clouds of gulal drifting up and blooming, with fine specks."""
    colours = ['#ff2e93', '#ffb000', '#00c2ff', '#7cff4f', '#b14cff', '#ff5a1f']
    clouds = [
        {
            'x': rng.uniform(0.05, 0.95) * OW,
            'y': rng.uniform(0.2, 1.0) * OH,
            'r': rng.uniform(60, 130) * SS,
            'phase': rng.uniform(0, 1),
            'colour': rng.choice(colours),
        }
        for _ in range(9)
    ]
    specks = falling(rng, 80, colours, (1.5, 3), 'dot', speed=(1, 2), sway=30, rising=True)

    def draw(t, d):
        for c in clouds:
            life = (t + c['phase']) % 1
            r = c['r'] * (0.5 + life)
            a = 110 * math.sin(math.pi * life) ** 2
            y = c['y'] - life * 90 * SS
            d.ellipse((c['x'] - r, y - r, c['x'] + r, y + r), fill=rgba(c['colour'], a))

    return {'layers': [draw], 'glow': 0, 'soften': 26, 'sharp': [specks]}


def effect_fireworks(rng):
    palette = ['#ffd166', '#ef476f', '#06d6a0', '#4cc9f0', '#ffffff', '#f72585', '#fb8500']
    bursts = []
    for i in range(5):
        colour = rng.choice(palette)
        sparks = []
        for _ in range(rng.randint(46, 64)):
            sparks.append({
                'a': rng.uniform(0, TAU),
                'v': rng.uniform(0.45, 1.0),
                'colour': colour if rng.random() < 0.8 else '#fff6e0',
                'twinkle': rng.uniform(0, TAU),
            })
        bursts.append({
            'x': rng.uniform(0.12, 0.88) * OW,
            'y': rng.uniform(0.14, 0.45) * OH,
            'start': i / 5 + rng.uniform(-0.03, 0.03),
            'r': rng.uniform(120, 200) * SS,
            'sparks': sparks,
        })

    def draw(t, d):
        for b in bursts:
            life = (t - b['start']) % 1
            if life > 0.6:
                continue
            p = life / 0.6
            spread = 1 - (1 - p) ** 3          # fast out, slow settle
            fade = (1 - p) ** 1.6
            drop = (p ** 2) * 70 * SS          # gravity
            for s in b['sparks']:
                reach = b['r'] * s['v']
                ca, sa = math.cos(s['a']), math.sin(s['a'])
                head = (b['x'] + ca * reach * spread, b['y'] + sa * reach * spread + drop)
                # A trail that thins and fades toward the centre
                for k, (frac, alpha) in enumerate([(0.55, 60), (0.75, 120), (0.9, 190)]):
                    tail = (b['x'] + ca * reach * spread * frac, b['y'] + sa * reach * spread * frac + drop * frac)
                    d.line((tail, head), fill=rgba(s['colour'], alpha * fade), width=int((1 + k * 0.6) * SS))
                flicker = 0.6 + 0.4 * math.sin(s['twinkle'] + p * 25)
                r = 1.8 * SS * (0.6 + fade)
                d.ellipse((head[0] - r, head[1] - r, head[0] + r, head[1] + r), fill=rgba('#ffffff', 255 * fade * flicker))

    return {'layers': [draw], 'glow': 9}


def effect_still(rng):
    return {'layers': [], 'glow': 0}


EFFECTS = {
    'confetti': effect_confetti,
    'tricolour': effect_tricolour,
    'snow': effect_snow,
    'embers': effect_embers,
    'dust': effect_dust,
    'sparkle': effect_sparkle,
    'bokeh': effect_bokeh,
    'powder': effect_powder,
    'fireworks': effect_fireworks,
    'still': effect_still,
    'petals-marigold': lambda rng: effect_petals(rng, ['#ff9f1c', '#ffbf00', '#f77f00', '#ffd23f']),
    'petals-yellow': lambda rng: effect_petals(rng, ['#ffe135', '#ffd000', '#fff3a3']),
    'petals-pink': lambda rng: effect_petals(rng, ['#ff8fab', '#ffb3c6', '#fb6f92', '#ffe5ec']),
}


def render_overlay(layers, t):
    overlay = Image.new('RGBA', (OW, OH), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for layer in layers:
        layer(t, d)
    return overlay.resize((W, H), Image.LANCZOS)


def composite(frame, spec, t):
    frame = frame.convert('RGBA')
    if spec['layers']:
        overlay = render_overlay(spec['layers'], t)
        if spec.get('soften'):
            overlay = overlay.filter(ImageFilter.GaussianBlur(spec['soften']))
        if spec.get('glow'):
            # Additive bloom so lights read as light, not as paint.
            glow = np.asarray(overlay.filter(ImageFilter.GaussianBlur(spec['glow'])), dtype=np.float32)
            base = np.asarray(frame, dtype=np.float32)
            alpha = glow[..., 3:4] / 255.0
            base[..., :3] = np.minimum(255, base[..., :3] + glow[..., :3] * alpha * 0.9)
            frame = Image.fromarray(base.astype(np.uint8), 'RGBA')
        frame = Image.alpha_composite(frame, overlay)
    for layer in spec.get('sharp', []):
        frame = Image.alpha_composite(frame, render_overlay([layer], t))
    return frame.convert('RGB')


# ---------------------------------------------------------------------------
# Illustrations, for festivals without a suitable free photo.
# Each returns (background RGB image at W x H, spec) and may animate itself.
# ---------------------------------------------------------------------------

def gradient(top, bottom, width=W, height=H):
    a = np.array(rgba(top, 255)[:3], dtype=np.float32)
    b = np.array(rgba(bottom, 255)[:3], dtype=np.float32)
    ramp = np.linspace(0, 1, height, dtype=np.float32)[:, None, None]
    img = a * (1 - ramp) + b * ramp
    return Image.fromarray(np.repeat(img, width, axis=1).astype(np.uint8), 'RGB')


def illustration_eid(rng):
    sky = gradient('#0b1d3a', '#15526b', OW, OH).convert('RGBA')
    d = ImageDraw.Draw(sky)
    # Crescent moon
    cx, cy, r = OW * 0.72, OH * 0.3, 92 * SS
    moon = Image.new('L', (OW, OH), 0)
    md = ImageDraw.Draw(moon)
    md.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    md.ellipse((cx - r * 0.55, cy - r * 1.1, cx + r * 1.35, cy + r * 0.8), fill=0)
    glow = moon.filter(ImageFilter.GaussianBlur(28 * SS))
    sky = Image.composite(Image.new('RGBA', (OW, OH), rgba('#ffe7a8', 255)), sky, glow.point(lambda v: v * 0.45))
    sky = Image.composite(Image.new('RGBA', (OW, OH), rgba('#ffe3a0', 255)), sky, moon)
    d = ImageDraw.Draw(sky)
    # Skyline of domes and minarets
    ground = OH * 0.84
    col = rgba('#07142a', 255)
    d.rectangle((0, ground, OW, OH), fill=col)
    for x, w, h in [(0.1, 150, 120), (0.33, 230, 170), (0.58, 160, 110), (0.86, 190, 140)]:
        x, w, h = x * OW, w * SS, h * SS
        d.rectangle((x - w / 2, ground - h * 0.55, x + w / 2, ground), fill=col)
        d.ellipse((x - w * 0.36, ground - h * 1.05, x + w * 0.36, ground - h * 0.35), fill=col)
        d.polygon([(x - 6 * SS, ground - h * 1.0), (x, ground - h * 1.2), (x + 6 * SS, ground - h * 1.0)], fill=col)
    for x, h in [(0.2, 260), (0.46, 300), (0.72, 250)]:
        x, h = x * OW, h * SS
        d.rectangle((x - 9 * SS, ground - h, x + 9 * SS, ground), fill=col)
        d.polygon([(x - 13 * SS, ground - h), (x, ground - h - 40 * SS), (x + 13 * SS, ground - h)], fill=col)
    background = sky.convert('RGB').resize((W, H), Image.LANCZOS)

    lanterns = [
        {'x': x * OW, 'len': l * SS, 'phase': p, 'colour': c}
        for x, l, p, c in [(0.08, 170, 0.0, '#ffb703'), (0.2, 80, 0.33, '#fb8500'), (0.33, 210, 0.66, '#ffd166'), (0.47, 110, 0.15, '#ffb703')]
    ]

    def draw(t, d2):
        for ln in lanterns:
            angle = 0.12 * math.sin(TAU * t + ln['phase'] * TAU)
            x0, y0 = ln['x'], 0
            x1 = x0 + math.sin(angle) * ln['len']
            y1 = y0 + math.cos(angle) * ln['len']
            d2.line((x0, y0, x1, y1), fill=rgba('#d9c38a', 220), width=int(2 * SS))
            s = 38 * SS
            d2.ellipse((x1 - s * 1.3, y1 - s * 0.1, x1 + s * 1.3, y1 + s * 2.7), fill=rgba(ln['colour'], 38))
            d2.polygon([(x1 - s * 0.5, y1), (x1 + s * 0.5, y1), (x1 + s * 0.8, y1 + s * 0.6), (x1 + s * 0.8, y1 + s * 2.0), (x1 + s * 0.5, y1 + s * 2.6), (x1 - s * 0.5, y1 + s * 2.6), (x1 - s * 0.8, y1 + s * 2.0), (x1 - s * 0.8, y1 + s * 0.6)], fill=rgba('#3a2a12', 255))
            d2.polygon([(x1 - s * 0.45, y1 + s * 0.7), (x1 + s * 0.45, y1 + s * 0.7), (x1 + s * 0.45, y1 + s * 1.95), (x1 - s * 0.45, y1 + s * 1.95)], fill=rgba(ln['colour'], 255))

    spec = {'layers': [draw, twinkles(rng, 30, ['#ffffff', '#fff2c7'], (4, 9))], 'glow': 9}
    return background, spec


def illustration_rakhi(rng):
    bg = gradient('#ffcf6b', '#ff7a59', OW, OH).convert('RGBA')
    d = ImageDraw.Draw(bg)
    # Faint mandala rings
    cx, cy = OW / 2, OH / 2
    for i, rr in enumerate([420, 340, 260]):
        rr *= SS
        for k in range(36):
            a = TAU * k / 36 + i * 0.1
            x, y = cx + math.cos(a) * rr, cy + math.sin(a) * rr
            s = 14 * SS
            d.ellipse((x - s, y - s, x + s, y + s), outline=rgba('#ffffff', 45), width=int(2 * SS))
    # The thread: twisted red and gold strands across the frame
    for colour, off in [('#c1121f', 0), ('#f6bd60', TAU / 2), ('#9d0208', TAU / 4)]:
        pts = [(x, cy + math.sin(x / (40 * SS) + off) * 7 * SS) for x in np.linspace(0, OW, 200)]
        d.line(pts, fill=rgba(colour, 255), width=int(9 * SS))
    # Tassels
    for side in (0.08, 0.92):
        x = OW * side
        for k in range(-3, 4):
            d.line((x, cy, x + k * 9 * SS, cy + 120 * SS), fill=rgba('#f6bd60', 255), width=int(4 * SS))
        d.ellipse((x - 16 * SS, cy - 16 * SS, x + 16 * SS, cy + 16 * SS), fill=rgba('#c1121f', 255))
    background = bg.convert('RGB').resize((W, H), Image.LANCZOS)

    def medallion(t, d2):
        spin = TAU * t / 6  # one sixth-turn per loop; petals are 6-fold symmetric
        layers = [(150, 12, '#9d0208'), (118, 12, '#e85d04'), (86, 8, '#f6bd60'), (56, 8, '#ffffff')]
        for i, (radius, n, colour) in enumerate(layers):
            radius *= SS
            direction = 1 if i % 2 == 0 else -1
            for k in range(n):
                a = TAU * k / n + direction * spin + (i * math.pi / n)
                px, py = cx + math.cos(a) * radius * 0.55, cy + math.sin(a) * radius * 0.55
                pts = []
                for j in range(14):
                    b = TAU * j / 14
                    ex, ey = math.cos(b) * radius * 0.45, math.sin(b) * radius * 0.2
                    pts.append((px + ex * math.cos(a) - ey * math.sin(a), py + ex * math.sin(a) + ey * math.cos(a)))
                d2.polygon(pts, fill=rgba(colour, 255))
        s = 36 * SS
        d2.ellipse((cx - s, cy - s, cx + s, cy + s), fill=rgba('#c1121f', 255))
        s = 20 * SS
        d2.ellipse((cx - s, cy - s, cx + s, cy + s), fill=rgba('#ffd166', 255))
        for k in range(16):
            a = TAU * k / 16 - spin
            px, py = cx + math.cos(a) * 170 * SS, cy + math.sin(a) * 170 * SS
            s = 7 * SS
            d2.ellipse((px - s, py - s, px + s, py + s), fill=rgba('#fff8e7', 255))

    spec = {'layers': [medallion], 'glow': 0, 'sharp': [twinkles(rng, 22, ['#ffffff', '#fff3c4'], (7, 13))]}
    return background, spec


ILLUSTRATIONS = {
    'eid-1': ('eid', illustration_eid),
    'rakhi-1': ('rakhi', illustration_rakhi),
}


# ---------------------------------------------------------------------------

MAX_BYTES = 900 * 1024   # the popup loads this on phones too


def save(entry_id, frames, still):
    OUT.mkdir(parents=True, exist_ok=True)
    # Busy photos compress less well; step the quality down until the loop
    # is light enough to load quickly on a phone.
    for quality in (74, 64, 55):
        frames[0].save(
            OUT / f'{entry_id}.webp',
            save_all=True,
            append_images=frames[1:],
            duration=FRAME_MS,
            loop=0,
            quality=quality,
            method=4,
        )
        if (OUT / f'{entry_id}.webp').stat().st_size <= MAX_BYTES:
            break
    still.save(OUT / f'{entry_id}-still.webp', quality=82, method=6)
    thumb = still.resize((384, 216), Image.LANCZOS)
    thumb.save(OUT / f'{entry_id}-thumb.webp', quality=72, method=6)
    return (OUT / f'{entry_id}.webp').stat().st_size


def build_photo(entry):
    rng = random.Random(entry['id'])
    photo = fetch(entry)
    # The photo itself stays still: only the effect moves, which keeps every
    # frame after the first tiny (the encoder stores just what changed).
    base = cover(photo, W, H)
    spec = EFFECTS[entry['effect']](rng)
    frames = [composite(base, spec, i / FRAMES) for i in range(FRAMES)]
    still = cover(photo, 1280, 720)
    return save(entry['id'], frames, still)


def build_illustration(entry_id, make):
    rng = random.Random(entry_id)
    background, spec = make(rng)
    frames = [composite(background, spec, i / FRAMES) for i in range(FRAMES)]
    still = frames[FRAMES // 3].resize((1280, 720), Image.LANCZOS)
    return save(entry_id, frames, still)


def main():
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))

    sources = json.loads((HERE / 'sources.json').read_text(encoding='utf-8'))
    items = []
    for entry in sources:
        if not only or entry['id'] in only:
            size = build_photo(entry)
            print(f"{entry['id']:<16} {entry['effect']:<16} {size / 1024:7.0f} KB")
        items.append({
            'id': entry['id'],
            'theme': entry['theme'],
            'credit': {'title': entry['title'], 'creator': entry['creator'], 'license': entry['license'].upper(), 'url': entry['landing']},
        })
    for entry_id, (theme, make) in ILLUSTRATIONS.items():
        if not only or entry_id in only:
            size = build_illustration(entry_id, make)
            print(f'{entry_id:<16} {"illustration":<16} {size / 1024:7.0f} KB')
        items.append({'id': entry_id, 'theme': theme, 'credit': None})

    # The API serves this manifest to the admin's pickers.
    manifest = ROOT / 'api' / 'src' / 'core' / 'greeting-library.json'
    manifest.write_text(json.dumps(items, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'{len(items)} banners -> {OUT}')


if __name__ == '__main__':
    main()
