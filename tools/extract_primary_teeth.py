"""Extract primary-dentition crown and root photographs from the corrected atlas."""

from collections import deque
from pathlib import Path
from PIL import Image, ImageFilter


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "public" / "assets" / "images" / "teeth" / "primary-reference-corrected.png"
OUTPUT = PROJECT / "public" / "assets" / "images" / "teeth" / "primary"

UPPER_NUMBERS = [17, 16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26, 27]
UPPER_CENTERS = [95, 214, 340, 468, 588, 706, 816, 921, 1028, 1140, 1248, 1361, 1473, 1585]

LOWER_NUMBERS = [47, 46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36, 37]
LOWER_CENTERS = [96, 217, 343, 469, 588, 706, 817, 921, 1026, 1140, 1249, 1364, 1476, 1589]


def horizontal_bounds(centers, index):
    left = 34 if index == 0 else round((centers[index - 1] + centers[index]) / 2)
    right = 1642 if index == len(centers) - 1 else round((centers[index] + centers[index + 1]) / 2)
    return left, right


def keep_central_component(alpha):
    width, height = alpha.size
    source = alpha.load()
    seen = bytearray(width * height)
    components = []
    for y in range(height):
        for x in range(width):
            offset = y * width + x
            if seen[offset] or source[x, y] < 28:
                continue
            queue = deque([(x, y)])
            seen[offset] = 1
            points = []
            while queue:
                px, py = queue.popleft()
                points.append((px, py))
                for nx, ny in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        no = ny * width + nx
                        if not seen[no] and source[nx, ny] >= 28:
                            seen[no] = 1
                            queue.append((nx, ny))
            components.append(points)
    if not components:
        return alpha
    center = (width / 2, height / 2)
    viable = [part for part in components if len(part) >= 30]
    chosen = min(
        viable or components,
        key=lambda part: min((px - center[0]) ** 2 + (py - center[1]) ** 2 for px, py in part) - len(part) * 0.15,
    )
    kept = Image.new("L", alpha.size)
    kept_pixels = kept.load()
    chosen_set = set(chosen)
    for x, y in chosen_set:
        kept_pixels[x, y] = source[x, y]
    return kept.filter(ImageFilter.GaussianBlur(0.25))


def transparent_cutout(image, box):
    crop = image.crop(box).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pixels[x, y]
            luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
            alpha = max(0, min(255, round((luminance - 28) * 12)))
            pixels[x, y] = (r, g, b, alpha)
    alpha = crop.getchannel("A").filter(ImageFilter.GaussianBlur(0.35))
    alpha = keep_central_component(alpha)
    crop.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        crop = crop.crop(bbox)
    padded = Image.new("RGBA", (crop.width + 8, crop.height + 8))
    padded.alpha_composite(crop, (4, 4))
    return padded


def export_row(image, numbers, centers, crown_y, root_y):
    for index, number in enumerate(numbers):
        left, right = horizontal_bounds(centers, index)
        transparent_cutout(image, (left, crown_y[0], right, crown_y[1])).save(OUTPUT / f"{number}-crown.png")
        transparent_cutout(image, (left, root_y[0], right, root_y[1])).save(OUTPUT / f"{number}-root.png")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE).convert("RGB")
    export_row(image, UPPER_NUMBERS, UPPER_CENTERS, (285, 385), (95, 265))
    export_row(image, LOWER_NUMBERS, LOWER_CENTERS, (535, 640), (655, 815))
    print(f"Exported {len(list(OUTPUT.glob('*.png')))} primary chart assets to {OUTPUT}")


if __name__ == "__main__":
    main()
