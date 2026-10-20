"""Prepare images for the site. Run locally (needs Pillow) whenever an image in assets/ changes, and commit the results.

- Writes a WebP copy of every PNG/JPG chart in assets/ (max 1600 px wide), which the pages load instead of the PNG.
- Records every image's pixel size in assets/image_sizes.json, so build_site.py can set width/height (no layout shift)
  without needing Pillow in the deploy job.
- Draws the 1200x630 link-preview image assets/og-image.png.
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
MAX_WIDTH = 1600


def to_webp(src: Path) -> Path:
    dst = src.with_suffix(".webp")
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst
    with Image.open(src) as im:
        im = im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im
        if im.width > MAX_WIDTH:
            im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=82, method=6)
    return dst


def font(names, size):
    for name in names:
        for folder in (Path("C:/Windows/Fonts"), Path("/usr/share/fonts/truetype/dejavu")):
            if (folder / name).exists():
                return ImageFont.truetype(str(folder / name), size)
    return ImageFont.load_default()


def og_image():
    w, h = 1200, 630
    im = Image.new("RGB", (w, h), "#0f172a")
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 14, h], fill="#38bdf8")
    bold = ["segoeuib.ttf", "DejaVuSans-Bold.ttf"]
    regular = ["segoeui.ttf", "DejaVuSans.ttf"]
    d.text((80, 150), "Deshraj Jogiya", font=font(bold, 84), fill="#f8fafc")
    d.text((80, 265), "Data Engineer & Machine Learning Engineer", font=font(regular, 40), fill="#38bdf8")
    d.text((80, 330), "Tempe, AZ  ·  open to relocation  ·  MS IT, Arizona State (4.0)", font=font(regular, 30), fill="#cbd5e1")
    d.text((80, 430), "Career Pilot: job-search platform in production,", font=font(regular, 30), fill="#e2e8f0")
    d.text((80, 472), "1,100+ tests, form filling on 7 applicant-tracking systems", font=font(regular, 30), fill="#e2e8f0")
    d.text((80, 560), "deshraj-jogiya.github.io", font=font(bold, 28), fill="#94a3b8")
    im.save(ASSETS / "og-image.png", optimize=True)


def main():
    og_image()
    sizes = {}
    for src in sorted(ASSETS.iterdir()):
        if src.suffix.lower() not in (".png", ".jpg", ".jpeg") or src.name == "og-image.png":
            continue
        with Image.open(src) as im:
            sizes[f"assets/{src.name}"] = [im.width, im.height]
        if src.suffix.lower() == ".png":
            webp = to_webp(src)
            with Image.open(webp) as im:
                sizes[f"assets/{webp.name}"] = [im.width, im.height]
    for svg in sorted(ASSETS.glob("*.svg")):
        m = re.search(r'viewBox="0 0 ([0-9.]+) ([0-9.]+)"', svg.read_text(encoding="utf-8"))
        if m:
            sizes[f"assets/{svg.name}"] = [round(float(m.group(1))), round(float(m.group(2)))]
    (ASSETS / "image_sizes.json").write_text(json.dumps(sizes, indent=1, sort_keys=True), encoding="utf-8")
    print(f"Prepared {len(sizes)} images and og-image.png")


if __name__ == "__main__":
    main()
