# Tile a folder of same-size images into one contact sheet.
#   blender -b -P contact_sheet.py -- <in_dir> <out.png> [cols]
import bpy, os, sys
import numpy as np

argv = sys.argv[sys.argv.index("--") + 1:]
src, out = argv[0], argv[1]
cols = int(argv[2]) if len(argv) > 2 else 5
files = sorted(f for f in os.listdir(src) if f.lower().endswith((".png", ".webp", ".jpg")))
imgs = []
for f in files:
    im = bpy.data.images.load(os.path.join(src, f))
    w, h = im.size
    imgs.append(np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4))
h, w = imgs[0].shape[:2]
rows = (len(imgs) + cols - 1) // cols
pad = 6
sheet = np.ones((rows * (h + pad) + pad, cols * (w + pad) + pad, 4), dtype=np.float32)
sheet[..., :3] = 0.5
for i, a in enumerate(imgs):
    r, c = divmod(i, cols)
    r = rows - 1 - r  # Blender pixel rows start at the bottom
    y, x = pad + r * (h + pad), pad + c * (w + pad)
    sheet[y:y + h, x:x + w] = a
H, W = sheet.shape[:2]
img = bpy.data.images.new("sheet", W, H, alpha=True)
img.pixels[:] = sheet.ravel()
img.filepath_raw = out
img.file_format = "PNG"
img.save()
print("SHEET", out, len(files), "images:", ", ".join(files))
