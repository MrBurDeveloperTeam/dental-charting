"""Extract the permanent tooth photographs from the supplied reference sheet."""

from pathlib import Path
from collections import deque
from PIL import Image, ImageFilter


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT / "public" / "assets" / "images" / "teeth" / "permanent-reference-corrected.png"
OUTPUT = PROJECT / "public" / "assets" / "images" / "teeth" / "permanent"

UPPER_NUMBERS = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
UPPER_CENTERS = [129, 236, 343, 449, 550, 635, 719, 805, 890, 978, 1064, 1149, 1236, 1342, 1449, 1556]

LOWER_NUMBERS = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]
LOWER_CENTERS = [129, 236, 343, 449, 550, 635, 719, 805, 890, 978, 1064, 1149, 1236, 1342, 1449, 1556]


def horizontal_bounds(centers, index):
    left = 55 if index == 0 else round((centers[index - 1] + centers[index]) / 2)
    right = 1620 if index == len(centers) - 1 else round((centers[index] + centers[index + 1]) / 2)
    return left, right


def transparent_cutout(image, box):
    crop = image.crop(box).convert("RGBA")
    pixels = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = pixels[x, y]
            # The source background is nearly neutral black. Combine luminance
            # and channel spread so warm enamel/root pixels remain fully opaque.
            luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
            alpha = max(0, min(255, round((luminance - 28) * 12)))
            pixels[x, y] = (r, g, b, alpha)

    alpha = crop.getchannel("A").filter(ImageFilter.GaussianBlur(0.35))
    alpha = keep_central_component(alpha)
    crop.putalpha(alpha)
    bbox = alpha.getbbox()
    if bbox:
        crop = crop.crop(bbox)
    # A small transparent gutter prevents edge clipping in the chart.
    padded = Image.new("RGBA", (crop.width + 8, crop.height + 8))
    padded.alpha_composite(crop, (4, 4))
    return padded


def keep_central_component(alpha):
    """Remove bright fragments from adjacent teeth at either crop boundary."""
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
    for y in range(height):
        for x in range(width):
            if (x, y) in chosen_set:
                kept_pixels[x, y] = source[x, y]
    return kept.filter(ImageFilter.GaussianBlur(0.25))


def export_row(image, numbers, centers, crown_y, root_y):
    for index, number in enumerate(numbers):
        if number is None:
            continue
        left, right = horizontal_bounds(centers, index)
        transparent_cutout(image, (left, crown_y[0], right, crown_y[1])).save(OUTPUT / f"{number}-crown.png")
        transparent_cutout(image, (left, root_y[0], right, root_y[1])).save(OUTPUT / f"{number}-root.png")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE).convert("RGB")
    export_row(image, UPPER_NUMBERS, UPPER_CENTERS, (108, 205), (220, 385))
    export_row(image, LOWER_NUMBERS, LOWER_CENTERS, (520, 610), (625, 795))
    print(f"Exported {len(list(OUTPUT.glob('*.png')))} permanent tooth assets to {OUTPUT}")


if __name__ == "__main__":
    main()
