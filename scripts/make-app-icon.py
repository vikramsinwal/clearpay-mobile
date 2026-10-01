from PIL import Image

src = r"C:\Users\AppExert PC\.cursor\projects\c-dev-clearpay-mobile\assets\c__Users_AppExert_PC_AppData_Roaming_Cursor_User_workspaceStorage_020b699e938d89086ba92b7b76e1a2ad_images_clearpay-logo-a8de6d49-3b06-4055-acde-4fbe00623898.png"
im = Image.open(src).convert("RGBA")
px = im.load()
w, h = im.size
minx, miny, maxx, maxy = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 20 and (r + g + b) > 40:
            minx = min(minx, x)
            miny = min(miny, y)
            maxx = max(maxx, x)
            maxy = max(maxy, y)
shield = im.crop((minx, miny, maxx + 1, maxy + 1))


def compose(size: int, scale: float = 0.58) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    target = int(size * scale)
    sw, sh = shield.size
    ratio = min(target / sw, target / sh)
    nw, nh = int(sw * ratio), int(sh * ratio)
    resized = shield.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


out = r"C:\dev\clearpay-mobile\assets\images\clearpay-app-icon.png"
compose(1024).save(out, "PNG")
sizes = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
base = r"C:\dev\clearpay-mobile\android\app\src\main\res"
for density, size in sizes.items():
    compose(size).save(f"{base}\\mipmap-{density}\\ic_launcher_foreground.webp", "WEBP", quality=95)
    Image.new("RGB", (size, size), (0, 0, 0)).save(
        f"{base}\\mipmap-{density}\\ic_launcher_background.webp", "WEBP", quality=90
    )
for density, size in legacy.items():
    icon = compose(size, 0.72)
    icon.save(f"{base}\\mipmap-{density}\\ic_launcher.webp", "WEBP", quality=95)
    icon.save(f"{base}\\mipmap-{density}\\ic_launcher_round.webp", "WEBP", quality=95)
print("wrote", out, "bounds", minx, miny, maxx, maxy)
