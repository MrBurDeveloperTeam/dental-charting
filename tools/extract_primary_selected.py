from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\USER\Downloads\primary teeth chart.png")
OUT = ROOT / "public/assets/images/teeth/primary"
REFERENCE = ROOT / "public/assets/images/teeth/primary-reference-corrected.png"
CENTERS = {55: 350, 54: 480, 64: 1245, 65: 1358}

def extract(im, center, half_width, y_range, target_size):
    crop = im.crop((center - half_width, y_range[0], center + half_width, y_range[1])).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pixels[x, y]
            if max(r, g, b) < 24:
                pixels[x, y] = (r, g, b, 0)
    bbox = crop.getchannel("A").getbbox()
    crop = crop.crop(bbox)
    crop.thumbnail(target_size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
    canvas.paste(crop, ((target_size[0] - crop.width) // 2, (target_size[1] - crop.height) // 2), crop)
    return canvas

def main():
    im = Image.open(SOURCE).convert("RGB")
    REFERENCE.parent.mkdir(parents=True, exist_ok=True)
    im.save(REFERENCE)
    for number, center in CENTERS.items():
        for view, y_range in (("root", (92, 272)), ("crown", (278, 400))):
            target_size = Image.open(OUT / f"{number}-{view}.png").size
            if number == 65 and view == "crown":
                target_size = (38, 32)
                # The adjacent 64 crown ends close to 65; use a tight crop
                # so no neighboring sliver enters the extracted asset.
                crop = im.crop((1310, y_range[0], 1420, y_range[1])).convert("RGBA")
                pixels = crop.load()
                for y in range(crop.height):
                    for x in range(crop.width):
                        r, g, b, _ = pixels[x, y]
                        if max(r, g, b) < 24:
                            pixels[x, y] = (r, g, b, 0)
                crop = crop.crop(crop.getchannel("A").getbbox())
                crop.thumbnail(target_size, Image.Resampling.LANCZOS)
                canvas = Image.new("RGBA", target_size, (0, 0, 0, 0))
                canvas.paste(crop, ((target_size[0]-crop.width)//2, (target_size[1]-crop.height)//2), crop)
                canvas.save(OUT / f"{number}-{view}.png")
            else:
                extract(im, center, 66, y_range, target_size).save(OUT / f"{number}-{view}.png")
    print("Updated primary reference and teeth 55, 54, 64, 65")

if __name__ == "__main__":
    main()
