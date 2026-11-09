"""Cache a small, fixed GSI map area for the venue and practice course."""
from pathlib import Path
import math
import urllib.request

ROOT = Path(__file__).resolve().parent.parent


def tile_at(latitude, longitude, zoom):
    count = 2 ** zoom
    x = int((longitude + 180) / 360 * count)
    y = int((1 - math.asinh(math.tan(math.radians(latitude))) / math.pi) / 2 * count)
    return x, y


tiles = set()
for zoom in (10, 11, 12):
    west, north = tile_at(35.40, 136.05, zoom)
    east, south = tile_at(35.19, 136.32, zoom)
    for x in range(west - 1, east + 2):
        for y in range(north - 1, south + 2):
            tiles.add((zoom, x, y))
for zoom in (15, 16, 17):
    center_x, center_y = tile_at(35.29112, 136.2535, zoom)
    for x in range(center_x - 1, center_x + 2):
        for y in range(center_y - 1, center_y + 2):
            tiles.add((zoom, x, y))
for zoom, x, y in sorted(tiles):
    target = ROOT / "assets/images/map-tiles" / str(zoom) / str(x) / (str(y) + ".png")
    if target.exists():
        continue
    url = f"https://cyberjapandata.gsi.go.jp/xyz/pale/{zoom}/{x}/{y}.png"
    with urllib.request.urlopen(url, timeout=20) as response:
        data = response.read()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError("Expected PNG from GSI")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
print(f"Cached {len(tiles)} GSI tiles. Attribution: https://maps.gsi.go.jp/development/ichiran.html")
