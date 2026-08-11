from pathlib import Path
import json
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "assets" / "images" / "teeth"
OUTPUT = ROOT / "js" / "tooth-silhouettes.js"


def is_primary(number):
    return number // 10 >= 5


def is_upper(number):
    return number // 10 in (1, 2, 5, 6)


def tooth_type(number):
    digit = number % 10
    if is_primary(number):
        return "molar" if digit >= 4 else "canine" if digit == 3 else "incisor"
    return "wisdom" if digit == 8 else "molar" if digit >= 6 else "premolar" if digit >= 4 else "canine" if digit == 3 else "incisor"


def display_size(number, view):
    kind, upper, central, digit, primary = tooth_type(number), is_upper(number), number % 10 == 1, number % 10, is_primary(number)
    if view == "root":
        if primary:
            width = (46 if upper else 44) if kind == "molar" else 28 if kind == "canine" else (34 if central else 30) if upper else (24 if central else 26)
            height = (84 if upper else 88) if kind == "molar" else (88 if upper else 90) if kind == "canine" else (80 if upper else 82)
        else:
            width = (52 if upper else 48) if kind == "wisdom" else (56 if upper else 52) if kind == "molar" else (40 if upper else 36) if kind == "premolar" else 32 if kind == "canine" else (40 if central else 36) if upper else (28 if central else 30)
            # Keep these in sync with the tooth-specific overrides in js/app.js.
            if number == 13:
                width = 38
            elif number == 12:
                width = 46
            height = (102 if upper else 106) if kind in ("molar", "wisdom") else (98 if upper else 96) if kind == "premolar" else (108 if upper else 110) if kind == "canine" else (100 if upper else 102)
        return width, height
    if primary:
        if number == 65 and view == "crown": return 38, 32
        return ({"width": 38, "height": 30} if digit == 4 else {"width": 42, "height": 32}).values() if kind == "molar" else ((22, 26) if upper else (24, 24)) if kind == "canine" else ((28, 22) if central else (26, 20)) if upper else ((24, 18) if central else (24, 18))
    if kind == "wisdom": return 44, 34
    if kind == "molar": return (50, 40) if digit == 6 else (48, 38)
    if kind == "premolar": return (30, 30) if digit == 4 else (32, 32)
    if kind == "canine": return (28, 34) if upper else (30, 30)
    return ((36, 26) if central else (32, 24)) if upper else ((32, 20) if central else (30, 20))


def row_runs(bits):
    runs, start = [], None
    for x, on in enumerate(bits + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((start, x))
            start = None
    return runs


def silhouette_path(path, size, flip_y=False):
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A").resize(size, Image.Resampling.LANCZOS)
    if flip_y:
        alpha = alpha.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    rows = [row_runs([value >= 28 for value in list(alpha.crop((0, y, size[0], y + 1)).getdata())]) for y in range(size[1])]
    rectangles, active = [], {}
    for y, runs in enumerate(rows + [[]]):
        current = set(runs)
        for run in list(active):
            if run not in current:
                rectangles.append((*run, active.pop(run), y))
        for run in runs:
            active.setdefault(run, y)
    return "".join(f"M{x0},{y0}H{x1}V{y1}H{x0}Z" for x0, x1, y0, y1 in rectangles)


def main():
    result = {}
    for dentition in ("permanent", "primary"):
        for path in sorted((SOURCE_ROOT / dentition).glob("*.png")):
            match = re.fullmatch(r"(\d+)-(crown|root)(?:-original)?\.png", path.name, re.IGNORECASE)
            if not match:
                continue
            number, file_view = int(match.group(1)), match.group(2)
            view = "occ" if file_view == "crown" else "front"
            size = tuple(display_size(number, file_view))
            key = f"{dentition}:{number}:{view}"
            if key not in result or "-original" not in path.name:
                result[key] = silhouette_path(path, size, file_view == "root" and is_upper(number))
    OUTPUT.write_text("const TOOTH_SILHOUETTES=" + json.dumps(result, separators=(",", ":")) + ";\n", encoding="utf-8")
    print(f"Wrote {len(result)} silhouettes to {OUTPUT}")


if __name__ == "__main__":
    main()
