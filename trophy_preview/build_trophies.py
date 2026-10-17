# Glass2Go trophy preview: DECA ICDC + FBLA NLC glass, measured from reference photos.
# Logos come from the supplied logo files (logos/), not redrawn.
# Run: blender -b -P build_trophies.py -- <out_dir>
import bpy, bmesh, math, sys, os
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else HERE
FONTS = "C:/Windows/Fonts/"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def load_font(name):
    try:
        return bpy.data.fonts.load(FONTS + name)
    except Exception:
        return None


F_DECA = load_font("Montserrat-Medium.ttf")
F_GOTHIC_B = load_font("GOTHICB.TTF")
F_GOTHIC = load_font("GOTHIC.TTF")

# ---------- logo processing: key out the white background, enlarge, sharpen ----------

def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def logo_image(path, name, colour=None, upscale=8):
    """Returns (image, aspect). colour=None keeps the logo's own colours."""
    src = bpy.data.images.load(path)
    w, h = src.size
    src.scale(w * upscale, h * upscale)
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)
    rgb = px[..., :3]
    m = rgb.min(axis=2)
    ref = np.percentile(m, 1)
    a = np.clip((1 - m) / max(1 - ref, 1e-3), 0, 1)
    a = smoothstep(0.35, 0.65, a)
    if colour is None:
        cov = np.clip((1 - m) / max(1 - ref, 1e-3), 1e-3, 1)[..., None]
        col = np.clip((rgb - (1 - cov)) / cov, 0, 1)
    else:
        col = np.broadcast_to(np.array(colour, dtype=np.float32), rgb.shape)
    ys, xs = np.where(a > 0.5)
    pad = 2 * upscale
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h - 1)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w - 1)
    out = np.concatenate([col, a[..., None]], axis=2)[y0:y1 + 1, x0:x1 + 1]
    oh, ow = out.shape[:2]
    img = bpy.data.images.new(name, ow, oh, alpha=True)
    img.pixels[:] = out.astype(np.float32).ravel()
    img.pack()
    bpy.data.images.remove(src)
    return img, ow / oh

def logo_image_hd(path, name, colour=None):
    """Vectorized RGBA logo (tools/vectorize-logos.mjs): the alpha channel is the shape, so edges stay
    razor sharp at any zoom. colour=None keeps the logo's own colours. Returns (image, aspect)."""
    src = bpy.data.images.load(path)
    w, h = src.size
    px = np.array(src.pixels[:], dtype=np.float32).reshape(h, w, 4)
    a = px[..., 3]
    ys, xs = np.where(a > 0.5)
    pad = 6
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h - 1)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w - 1)
    rgb = px[..., :3] if colour is None else np.broadcast_to(np.array(colour, dtype=np.float32), px[..., :3].shape)
    out = np.concatenate([rgb, a[..., None]], axis=2)[y0:y1 + 1, x0:x1 + 1]
    oh, ow = out.shape[:2]
    img = bpy.data.images.new(name, ow, oh, alpha=True)
    img.pixels[:] = out.astype(np.float32).ravel()
    img.pack()
    bpy.data.images.remove(src)
    return img, ow / oh


# ---------- materials ----------

def mat(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in kw.items():
        try:
            b.inputs[k].default_value = v
        except KeyError:
            pass
    return m


def decal_mat(name, image, **kw):
    m = mat(name, **kw)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Cubic"
    tex.extension = "CLIP"
    if "Base Color" not in kw:
        nt.links.new(tex.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(tex.outputs["Alpha"], b.inputs["Alpha"])
    return m


GLASS = mat("Glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.0, "IOR": 1.5,
                        "Transmission Weight": 1.0})
BLUE_ACRYLIC = mat("BlueAcrylic", **{"Base Color": (0.004, 0.032, 0.42, 1), "Roughness": 0.03,
                                     "Transmission Weight": 0.0, "IOR": 1.49,
                                     "Coat Weight": 1.0, "Coat Roughness": 0.02})
FROST_KW = {"Base Color": (0.95, 0.96, 0.97, 1), "Roughness": 0.5, "Transmission Weight": 0.1}
FROST = mat("Frost", **FROST_KW)
FBLA_NAVY = mat("FBLANavy", **{"Base Color": (0.035, 0.09, 0.42, 1), "Roughness": 0.3})
PRINT_GREY = mat("PrintGrey", **{"Base Color": (0.16, 0.17, 0.2, 1), "Roughness": 0.4})
ENGRAVE = mat("Engrave", **{"Base Color": (0.015, 0.01, 0.008, 1), "Roughness": 0.7})
SILVER = mat("Silver", **{"Base Color": (0.85, 0.85, 0.87, 1), "Metallic": 1.0, "Roughness": 0.3})
FACET_FROST = mat("FacetFrost", **{"Base Color": (0.97, 0.97, 0.98, 1), "Roughness": 0.3,
                                  "Transmission Weight": 0.55, "IOR": 1.5})
MED_FACE = mat("MedFace", **{"Base Color": (0.86, 0.87, 0.89, 1), "Roughness": 0.35})
GOLD_METAL = mat("GoldMetal", **{"Base Color": (1.0, 0.76, 0.33, 1), "Metallic": 1.0, "Roughness": 0.25})
BLACK_GLOSS = mat("BlackGloss", **{"Base Color": (0.008, 0.008, 0.01, 1), "Roughness": 0.06,
                                   "Coat Weight": 1.0, "Coat Roughness": 0.03})
FLOOR = mat("Floor", **{"Base Color": (0.018, 0.019, 0.024, 1), "Roughness": 0.3})
WALL = mat("Wall", **{"Base Color": (0.04, 0.045, 0.06, 1), "Roughness": 0.9})

deca_white, deca_aspect = logo_image_hd(os.path.join(HERE, "logos", "deca_logo_hd.png"), "DECA_white", (1, 1, 1))
deca_dark, _ = logo_image_hd(os.path.join(HERE, "logos", "deca_logo_hd.png"), "DECA_dark", (0.05, 0.05, 0.06))
fbla_col, fbla_aspect = logo_image_hd(os.path.join(HERE, "logos", "fbla_logo_hd.png"), "FBLA_colour", None)

DECA_MARK_FROST = decal_mat("DecaMarkFrost", deca_white, **FROST_KW)
DECA_MARK_DARK = decal_mat("DecaMarkDark", deca_dark, **{"Base Color": (0.05, 0.05, 0.06, 1), "Roughness": 0.4})
FBLA_MARK = decal_mat("FblaMark", fbla_col, **{"Roughness": 0.3})

# Walnut: procedural grain along the base's length
WALNUT = bpy.data.materials.new("Walnut")
WALNUT.use_nodes = True
nt = WALNUT.node_tree
bsdf = nt.nodes["Principled BSDF"]
bsdf.inputs["Roughness"].default_value = 0.35
bsdf.inputs["Coat Weight"].default_value = 0.4
tc = nt.nodes.new("ShaderNodeTexCoord")
mp = nt.nodes.new("ShaderNodeMapping")
mp.inputs["Scale"].default_value = (0.15, 1.0, 1.0)
wave = nt.nodes.new("ShaderNodeTexWave")
wave.bands_direction = "Z"
wave.inputs["Scale"].default_value = 90.0
wave.inputs["Distortion"].default_value = 8.0
wave.inputs["Detail"].default_value = 6.0
wave.inputs["Detail Roughness"].default_value = 0.7
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.2, 0.085, 0.04, 1)
ramp.color_ramp.elements[1].color = (0.42, 0.2, 0.09, 1)
nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
nt.links.new(mp.outputs["Vector"], wave.inputs["Vector"])
nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])

# ---------- geometry helpers ----------

def link(ob, material, parent):
    bpy.context.collection.objects.link(ob)
    ob.data.materials.append(material)
    ob.parent = parent
    return ob


def bevel(ob, width, segments):
    mod = ob.modifiers.new("Bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"


def prism_xz(name, pts, thickness, material, parent, y=0.0, bev=0.0, segs=2):
    """Extrude a 2D (x, z) profile along Y; front face at y - thickness/2."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    h = thickness / 2
    front = [bm.verts.new((x, y - h, z)) for x, z in pts]
    back = [bm.verts.new((x, y + h, z)) for x, z in pts]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me), material, parent)
    if bev:
        bevel(ob, bev, segs)
    return ob


def base_block(name, width, depth, height, lean, material, parent, bev=0.0015):
    """Block with a front face leaning back by `lean` metres. Returns (obj, front_rx, front_y_at(z))."""
    pts = [(-depth / 2, 0), (depth / 2, 0), (depth / 2, height), (-depth / 2 + lean, height)]
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    hw = width / 2
    left = [bm.verts.new((-hw, y, z)) for y, z in pts]
    right = [bm.verts.new((hw, y, z)) for y, z in pts]
    bm.faces.new(left)
    bm.faces.new(right[::-1])
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((left[i], right[i], right[j], left[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me), material, parent)
    bevel(ob, bev, 3)
    rx = 90 - math.degrees(math.atan2(lean, height))
    return ob, rx, (lambda z: -depth / 2 + lean * z / height - 0.0004)


def decal(name, material, cx, cz, width, aspect, y, parent):
    """Image decal plane in XZ, facing -Y, centred at (cx, cz)."""
    hw, hh = width / 2, width / aspect / 2
    me = bpy.data.meshes.new(name)
    me.from_pydata([(cx - hw, y, cz - hh), (cx + hw, y, cz - hh), (cx + hw, y, cz + hh), (cx - hw, y, cz + hh)],
                   [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new()
    for loop, co in zip(uv.data, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop.uv = co
    return link(bpy.data.objects.new(name, me), material, parent)


def text(body, location, material, parent, font, width=None, size=None, align="LEFT",
         rot_x=90.0, bold=0.0, spacing=1.0, y_fn=None, top=None):
    """Text fitted to `width` (metres) or set at `size`. location z is the line's visual centre."""
    cu = bpy.data.curves.new("txt", "FONT")
    cu.body = body
    cu.font = font
    cu.size = 1.0 if size is None else size
    cu.align_x = align
    cu.space_character = spacing
    cu.extrude = 0.00012
    ob = link(bpy.data.objects.new("T_" + body[:14], cu), material, parent)
    ob.rotation_euler = (math.radians(rot_x), 0, 0)
    bpy.context.view_layer.update()
    if width is not None:
        cu.size = width / ob.dimensions.x
        bpy.context.view_layer.update()
    if bold:
        cu.offset = cu.size * bold
        bpy.context.view_layer.update()
    x, y, z = location
    hgt = ob.dimensions.y * math.sin(math.radians(rot_x))
    z = (top - hgt) if top is not None else z - hgt / 2
    if y_fn:
        y = y_fn(z)
    ob.location = (x, y, z)
    return ob, cu.size, ob.dimensions.y


def empty(name, loc, rot_z):
    e = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(e)
    e.location = loc
    e.rotation_euler = (0, 0, math.radians(rot_z))
    return e

# ---------- DECA ICDC trophy ----------
# Near-square clear slab (w:h ~ 1:1.05). Solid royal-blue wedge fin on the right edge:
# right edge flush and vertical, left edge slanting from ~1/3 in at the base up to a point at the top right.

deca = empty("DECA_Trophy", (-0.165, 0.0, 0.0), 16)

SW, SH, T = 0.205, 0.29, 0.019     # tall slab, w:h ~ 0.7
# Fin left edge (x/SW, z/SH): nearly upright at the top, sweeping left toward the base
FIN_PTS = [(0.84 - 0.19 * (1 - i / 16) ** 2, i / 16) for i in range(17)]
B_W, B_D = 1.2 * SW, 0.07             # long, low walnut base
B_FRONT_H, B_H, B_CHAMFER = 0.019, 0.028, 0.013


def prism_yz(name, pts, width, material, parent, bev=0.0015):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    hw = width / 2
    left = [bm.verts.new((-hw, y, z)) for y, z in pts]
    right = [bm.verts.new((hw, y, z)) for y, z in pts]
    bm.faces.new(left)
    bm.faces.new(right[::-1])
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((left[i], right[i], right[j], left[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = link(bpy.data.objects.new(name, me), material, parent)
    bevel(ob, bev, 3)
    return ob


prism_yz("DECA_Base", [(-B_D / 2, 0), (B_D / 2, 0), (B_D / 2, B_H), (-B_D / 2 + B_CHAMFER, B_H),
                       (-B_D / 2, B_FRONT_H)], B_W, WALNUT, deca)

SX = -SW / 2
Z0 = B_H - 0.004
GY = (-B_D / 2 + B_CHAMFER + B_D / 2) / 2   # centre of the flat top
FRONT = GY - T / 2 - 0.00025


def fin_left(z):
    t = z / SH
    for (x0, t0), (x1, t1) in zip(FIN_PTS, FIN_PTS[1:]):
        if t <= t1:
            return SW * (x0 + (x1 - x0) * (t - t0) / (t1 - t0))
    return SW * FIN_PTS[-1][0]


edge = [(fx * SW, fz * SH) for fx, fz in FIN_PTS]
prism_xz("DECA_Glass", [(SX + x, Z0 + z) for x, z in [(0, 0)] + edge + [(0, SH)]],
         T, GLASS, deca, y=GY, bev=0.001)
prism_xz("DECA_Fin", [(SX + x, Z0 + z) for x, z in edge[:1] + [(SW, 0), (SW, SH)] + edge[:0:-1]],
         T, BLUE_ACRYLIC, deca, y=GY, bev=0.001)


def at(fx, ftop):
    """Slab-relative position: fx = fraction of width from left, ftop = fraction of height from top."""
    return SX + fx * SW, Z0 + SH * (1 - ftop)


def room(ftop, left):
    """Usable width from `left` to just before the fin at this height."""
    return SX + fin_left(SH * (1 - ftop)) - 0.009 - left


# Logo lockup: white DECA mark + wordmark, frosted
x, z = at(0.12, 0.12)
mark_w = 0.13 * SW
decal("DECA_Mark", DECA_MARK_FROST, x + mark_w / 2, z, mark_w, deca_aspect, FRONT, deca)
wx = x + mark_w + 0.04 * SW
text("DECA", (wx, FRONT, z), FROST, deca, F_DECA, width=min(0.47 * SW, room(0.12, wx) - 0.004), bold=0.012)

LX = 0.125
x, z = at(LX, 0.31)
text("FIRST PLACE", (x, FRONT, z), FROST, deca, F_DECA, width=min(0.50 * SW, room(0.31, x)), bold=0.03)
x, z = at(LX, 0.45)
_, conf_size, cap = text("INTERNATIONAL", (x, FRONT, z), FROST, deca, F_DECA,
                         width=min(0.57 * SW, room(0.45, x)), bold=0.03)
for i, line in enumerate(["CAREER", "DEVELOPMENT", "CONFERENCE"]):
    x, z = at(LX, 0.45 + 0.062 * (i + 1))
    text(line, (x, FRONT, z), FROST, deca, F_DECA, size=conf_size, bold=0.03)
x, z = at(LX, 0.79)
text("2027", (x, FRONT, z), FROST, deca, F_DECA, size=conf_size, bold=0.03)
x, z = at(LX, 0.87)
text("ANAHEIM  |  CALIFORNIA", (x, FRONT, z), FROST, deca, F_DECA, width=min(0.34 * SW, room(0.87, x)), bold=0.03)

# Thin bright edge line along the fin's left edge (as on the real award)
pts = [Vector((SX + fx * SW, Z0 + fz * SH)) for fx, fz in FIN_PTS]
verts, faces = [], []
for i, p in enumerate(pts):
    d = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
    nrm = Vector((-d.y, d.x)) * 0.0011
    verts += [(p.x, FRONT, p.y), (p.x + nrm.x, FRONT, p.y + nrm.y)]
    if i:
        faces.append((2 * i - 2, 2 * i, 2 * i + 1, 2 * i - 1))
me = bpy.data.meshes.new("DECA_FinEdge")
me.from_pydata(verts, [], faces)
link(bpy.data.objects.new("DECA_FinEdge", me), SILVER, deca)

# Silver medallion (white face, dark DECA mark) low on the fin, centred on its width
mz_rel = 0.12 * SH
fin_w = SW - fin_left(mz_rel)
mcx = SX + (fin_left(mz_rel) + SW) / 2
mcz = Z0 + mz_rel
med_r = 0.42 * fin_w
bpy.ops.mesh.primitive_cylinder_add(radius=med_r, depth=0.003, vertices=96, rotation=(math.radians(90), 0, 0))
med = bpy.context.active_object
med.data.materials.append(SILVER)
bevel(med, 0.0008, 3)
med.parent = deca
med.location = (mcx, FRONT - 0.0013, mcz)
bpy.ops.mesh.primitive_cylinder_add(radius=med_r * 0.8, depth=0.0005, vertices=96, rotation=(math.radians(90), 0, 0))
face = bpy.context.active_object
face.data.materials.append(MED_FACE)
face.parent = deca
face.location = (mcx, FRONT - 0.0030, mcz)
decal("DECA_MedMark", DECA_MARK_DARK, mcx, mcz, med_r * 1.05, deca_aspect, FRONT - 0.0034, deca)

# Base front left plain (no event name or sponsor)

# ---------- FBLA NLC trophy ----------
# Stocky shard (w ~ 0.75 h): high point on the LEFT, long straight slope down to the right,
# short clipped corner, short right edge. Thin glossy black base, two gold lines.
FBLA_LINE = "2027 FBLA First Place"   # event name intentionally left off

fbla = empty("FBLA_Trophy", (0.17, 0.02, 0.0), -16)

HL = 0.30
GW, HR, GT = 0.60 * HL, 0.70 * HL, 0.025
CLIP_X, CLIP_Z = 0.009, 0.016
FB_W, FB_D, FB_H, FB_LEAN = 1.1 * GW, 0.065, 0.024, 0.010
_, fbla_base_rx, fbla_base_y = base_block("FBLA_Base", FB_W, FB_D, FB_H, FB_LEAN, BLACK_GLOSS, fbla, bev=0.0008)

GX = -GW / 2
GZ = FB_H - 0.004
GYc = FB_LEAN / 2
SLOPE_END = (GW - CLIP_X, HR + CLIP_Z)
HR_EDGE = HL + (SLOPE_END[1] - HL) * GW / SLOPE_END[0]   # slope runs straight to the right edge (no clipped corner)
crystal = [(0, 0), (GW, 0), (GW, HR_EDGE), (0, HL)]
# Wide frosted facet along the top slope (and clipped corner): the front face's top edges are
# inset by FACET, and the faces joining them to the back's top edges slant up-and-back.
FACET = 0.02           # facet width at the right end; it tapers to almost nothing at the top-left point


def inset(poly, dists):
    """Offset each edge i (poly[i] -> poly[i+1], CCW) inward by dists[i]; return new vertices."""
    n = len(poly)
    lines = []
    for i in range(n):
        a, b = Vector(poly[i]), Vector(poly[(i + 1) % n])
        d = (b - a).normalized()
        nrm = Vector((-d.y, d.x))
        lines.append((a + nrm * dists[i], d))
    out = []
    for i in range(n):
        (p1, d1), (p2, d2) = lines[i - 1], lines[i]
        den = d1.x * d2.y - d1.y * d2.x
        t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den
        out.append(p1 + d1 * t)
    return out


back_pts = [Vector(p) for p in crystal]
front_pts = inset(crystal, [0, 0, FACET, 0])  # edges: bottom, right, slope, left
front_pts[3] = Vector((0.0, HL - 0.004))           # wedge: thin at the peak, wide toward the right
cm = bpy.data.meshes.new("FBLA_Crystal")
bm = bmesh.new()
h = GT / 2
fv = [bm.verts.new((GX + p.x, GYc - h, GZ + p.y)) for p in front_pts]
bv = [bm.verts.new((GX + p.x, GYc + h, GZ + p.y)) for p in back_pts]
bm.faces.new(fv[::-1])
bm.faces.new(bv)
for i in range(len(crystal)):
    j = (i + 1) % len(crystal)
    face = bm.faces.new((fv[i], fv[j], bv[j], bv[i]))
    if i == 2:
        face.material_index = 1
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(cm)
bm.free()
crystal_ob = link(bpy.data.objects.new("FBLA_Crystal", cm), GLASS, fbla)
crystal_ob.data.materials.append(GLASS)   # the facet is clear cut glass; its brightness comes from the glint light
bevel(crystal_ob, 0.0015, 2)
FFRONT = GYc - GT / 2 - 0.00025


def top_at(x):
    """Height of the top slope at slab-relative x."""
    return HL + (SLOPE_END[1] - HL) * x / SLOPE_END[0]


# Logo, wordmark and conference line as one stack, centred on the glass face
logo_w = 0.28 * GW
logo_h = logo_w / fbla_aspect
word, _, word_h = text("FBLA", (0.0, FFRONT, 0), FBLA_NAVY, fbla, F_GOTHIC_B, width=0.70 * GW, align="CENTER", top=0.0)
nlc, _, nlc_h = text("National Leadership Conference", (0.0, FFRONT, 0), PRINT_GREY, fbla, F_GOTHIC,
                     width=0.66 * GW, align="CENTER", bold=0.02, top=0.0)
GAP1, GAP2 = 0.011, 0.006
stack_h = logo_h + GAP1 + word_h + GAP2 + nlc_h
stack_top = GZ + 0.55 * top_at(0.5 * GW) + stack_h / 2
decal("FBLA_Mark", FBLA_MARK, 0.0, stack_top - logo_h / 2, logo_w, fbla_aspect, FFRONT, fbla)
word_top = stack_top - logo_h - GAP1
word.location.z = word_top - word_h
nlc.location.z = word_top - word_h - GAP2 - nlc_h

text(FBLA_LINE, (0, 0, FB_H * 0.5), GOLD_METAL, fbla, F_GOTHIC_B,
     width=0.44 * FB_W, align="CENTER", rot_x=fbla_base_rx, y_fn=fbla_base_y)

# Glint light for the FBLA top facet: placed where the camera's view reflects off the cut face,
# so the shaved-off slope catches a bright highlight like the real crystal.
bpy.context.view_layer.update()
_mw = crystal_ob.matrix_world


def _local(p, back):
    return Vector((GX + p.x, GYc + (h if back else -h), GZ + p.y))


_A, _B = _mw @ _local(front_pts[2], False), _mw @ _local(front_pts[3], False)
_C, _D = _mw @ _local(back_pts[3], True), _mw @ _local(back_pts[2], True)
FACET_CENTRE = (_A + _B + _C + _D) / 4
FACET_NORMAL = (_B - _A).cross(_C - _A).normalized()
if FACET_NORMAL.z < 0:
    FACET_NORMAL = -FACET_NORMAL
# ---------- studio ----------
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
bpy.context.active_object.data.materials.append(FLOOR)
bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0.75, 1.0), rotation=(math.radians(90), 0, 0))
bpy.context.active_object.data.materials.append(WALL)


def area(name, loc, rot, size, energy, color=(1, 1, 1), size_y=None):
    d = bpy.data.lights.new(name, "AREA")
    d.energy = energy
    d.color = color
    if size_y:
        d.shape = "RECTANGLE"
        d.size, d.size_y = size, size_y
    else:
        d.size = size
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    o.visible_camera = False
    return o


area("Key", (-0.45, -0.45, 0.8), (45, 0, -40), 0.6, 7)
area("Fill", (0.6, -0.5, 0.4), (70, 0, 50), 0.6, 1.5, (0.85, 0.9, 1.0))
area("RimL", (-0.45, 0.35, 0.36), (90, 0, -130), 0.05, 6, (0.8, 0.88, 1.0), size_y=0.5)
area("RimR", (0.45, 0.35, 0.36), (90, 0, 130), 0.05, 6, (0.8, 0.88, 1.0), size_y=0.5)
area("Top", (0, 0.05, 0.9), (0, 0, 0), 0.4, 3)
area("EdgeStrip", (0, -0.15, 0.55), (25, 0, 0), 0.9, 10, size_y=0.03)  # thin strip that lights the chamfers
area("WallGlow", (0, 0.2, 1.1), (-25, 0, 0), 1.5, 4, (0.5, 0.62, 1.0))
area("Front", (0, -0.8, 0.3), (90, 0, 0), 0.8, 1.2, size_y=0.25)  # gives the silver something to reflect
_cam_pos = Vector((0.0, -0.95, 0.30))
_dg = bpy.context.evaluated_depsgraph_get()
_hit, _loc, _n, _i, _ob, _m = scene.ray_cast(_dg, _cam_pos, (FACET_CENTRE - _cam_pos).normalized())
if _hit and _ob and _ob.name == "FBLA_Crystal":   # use the real (bevelled) surface the camera sees
    FACET_CENTRE, FACET_NORMAL = _loc.copy(), _n.normalized()
_v = (_cam_pos - FACET_CENTRE).normalized()
_r = 2 * FACET_NORMAL.dot(_v) * FACET_NORMAL - _v
# An emissive card (not a lamp) so it shows crisply in the glass reflection; hidden from camera,
# diffuse and shadows so it only appears as the glint on the cut face.
GLINT_MAT = bpy.data.materials.new("GlintCard")
GLINT_MAT.use_nodes = True
_gn = GLINT_MAT.node_tree
_gn.nodes.remove(_gn.nodes["Principled BSDF"])
_em = _gn.nodes.new("ShaderNodeEmission")
_em.inputs["Strength"].default_value = float(os.environ.get("G2G_GLINT", "25"))
_gn.links.new(_em.outputs["Emission"], _gn.nodes["Material Output"].inputs["Surface"])
bpy.ops.mesh.primitive_plane_add(size=1)
_g = bpy.context.active_object
_g.name = "FacetGlint"
_g.scale = (1.0, 0.35, 1)
_g.data.materials.append(GLINT_MAT)
_g.location = FACET_CENTRE + _r * 0.45
_g.rotation_euler = (FACET_CENTRE - _g.location).to_track_quat("Z", "Y").to_euler()   # emitting side faces the facet
_g.visible_camera = False
_g.visible_diffuse = False
_g.visible_shadow = False
_g.visible_transmission = False

world = bpy.data.worlds.new("World")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.014, 0.02, 1)
scene.world = world

cam_d = bpy.data.cameras.new("Cam")
cam_d.lens = 44
cam_d.dof.use_dof = True
cam_d.dof.aperture_fstop = 6.3
cam = bpy.data.objects.new("Cam", cam_d)
bpy.context.collection.objects.link(cam)
cam.location = (0.0, -0.95, 0.30)
target = Vector((0.0, 0.0, 0.185))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_d.dof.focus_distance = (target - cam.location).length
scene.camera = cam

# ---------- render ----------
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = int(os.environ.get("G2G_SAMPLES", "160"))
cy.use_denoising = True
cy.max_bounces = 24
cy.transmission_bounces = 16
cy.glossy_bounces = 8
cy.transparent_max_bounces = 32
cy.caustics_reflective = False
cy.caustics_refractive = False
cy.blur_glossy = 0.5
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
scene.render.resolution_x = int(os.environ.get("G2G_W", "1600"))
scene.render.resolution_y = int(os.environ.get("G2G_H", "1000"))
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(OUT, os.environ.get("G2G_NAME", "trophies_preview.png"))

if os.environ.get("G2G_NO_RENDER") != "1":   # flight.py imports this file to build the scene only
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "trophies.blend"))
    bpy.ops.render.render(write_still=True)
    print("DONE", scene.render.filepath)