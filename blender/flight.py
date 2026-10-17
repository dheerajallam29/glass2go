# Glass2Go homepage flight, v2.
#
#   blender -b -P flight.py -- <out_dir> --set landscape|portrait --mode keys|frames|tilt|bounds
#           [--quality keys|draft|final] [--samples N] [--frames A-B] [--still-samples N]
#
# The camera visits five waypoints. Between them it plays a fixed move (a "chapter"); the page decides
# when to play it. Frame numbers are the same for both sets so the page can use one timeline.
#
#   W0  hero        both trophies, full body, generous margin, empty stage above for the headline
#   W1  DECA        DECA large on one side, empty dark stage on the other for copy
#   --- flight through the DECA glass, around the back, out to the front of FBLA ---
#   W2  FBLA        FBLA large on the opposite side, empty stage for copy
#   W3  ranks       high, wide view of both trophies; empty stage above for the rank ladder
#   W4  finale      both trophies large and centred; headline above; room for buttons below
#
# Output (PNG masters, lossless):  <out>/master/<set>/NNNN.png   (frames)
#                                  <out>/master/<set>/tilt/*.png + tilt.json
#                                  <out>/master/<set>/manifest.json
import bpy, os, sys, math, json, random, runpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0]) if argv and not argv[0].startswith("--") else os.path.join(HERE, "..", "renders")


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


SET = arg("--set", "landscape")
MODE = arg("--mode", "keys")
QUALITY = arg("--quality", "final" if MODE in ("frames", "tilt", "hero") else "keys")
PORTRAIT = SET == "portrait"

FPS = 24
WP = [1, 49, 157, 205, 253]          # waypoint frames: hero, DECA, FBLA, ranks, finale
LAST = WP[-1]

SIZES = {  # (width, height) per set and quality
    ("landscape", "keys"): (640, 400), ("landscape", "draft"): (960, 600), ("landscape", "final"): (1920, 1200),
    ("portrait", "keys"): (360, 640), ("portrait", "draft"): (450, 800), ("portrait", "final"): (720, 1280),
}
W, H = SIZES[(SET, QUALITY)]
if SET == "landscape" and QUALITY == "final" and arg("--final-width"):   # e.g. 1600 for a faster, lighter render
    W = int(arg("--final-width"))
    H = round(W * 10 / 16)
SAMPLES = int(arg("--samples", {"keys": 10, "draft": 12, "final": 64}[QUALITY]))
STILL_SAMPLES = int(arg("--still-samples", 192))   # waypoint frames and tilt crops get extra samples

TROPHY = os.environ.get("G2G_TROPHY_SCRIPT", os.path.join(HERE, "..", "trophy_preview", "build_trophies.py"))
os.environ["G2G_NO_RENDER"] = "1"
runpy.run_path(TROPHY, run_name="__main__")

scene = bpy.context.scene
cam = bpy.data.objects["Cam"]
deca = bpy.data.objects["DECA_Trophy"]
fbla = bpy.data.objects["FBLA_Trophy"]
bpy.context.view_layer.update()

# ---------------------------------------------------------------- the stage
for ob in list(bpy.data.objects):
    if ob.type == "MESH" and ob.name.startswith("Plane") and abs(ob.location.y - 0.75) < 1e-3:
        bpy.data.objects.remove(ob, do_unlink=True)          # the studio back wall: the room opens into darkness
floor = next(o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("Plane"))
floor.scale = (6, 6, 1)

scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.006, 0.016, 1)
for name, colour in (("RimL", (0.35, 0.55, 1.0)), ("RimR", (0.35, 0.55, 1.0)), ("WallGlow", (0.25, 0.45, 1.0))):
    if name in bpy.data.objects:
        bpy.data.objects[name].data.color = colour
bpy.data.objects["Key"].data.energy = 4.5
if "Front" in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects["Front"], do_unlink=True)


def spot(name, loc, target, energy, colour=(0.92, 0.95, 1.0), size_deg=26):
    d = bpy.data.lights.new(name, "SPOT")
    d.energy, d.color = energy, colour
    d.spot_size, d.spot_blend, d.shadow_soft_size = math.radians(size_deg), 0.6, 0.05
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = False
    return o


spot("SpotDECA", (-0.30, -0.25, 1.25), (-0.165, 0.0, 0.0), 28)
spot("SpotFBLA", (0.32, -0.22, 1.25), (0.17, 0.02, 0.0), 28)

# The floor is glossy right under the trophies (for their reflections) and duller further out, where
# a mirror-like floor only reflects the stage lights back at the camera as a bright haze.
_fm = bpy.data.materials["Floor"]
_fn = _fm.node_tree
_fb = _fn.nodes["Principled BSDF"]
_pos = _fn.nodes.new("ShaderNodeNewGeometry")
_len = _fn.nodes.new("ShaderNodeVectorMath")
_len.operation = "LENGTH"
_rough = _fn.nodes.new("ShaderNodeMapRange")
_rough.clamp = True
_rough.inputs["From Min"].default_value, _rough.inputs["From Max"].default_value = 0.28, 0.80
_rough.inputs["To Min"].default_value, _rough.inputs["To Max"].default_value = 0.30, 0.85
_spec = _fn.nodes.new("ShaderNodeMapRange")
_spec.clamp = True
_spec.inputs["From Min"].default_value, _spec.inputs["From Max"].default_value = 0.25, 0.70
_spec.inputs["To Min"].default_value, _spec.inputs["To Max"].default_value = 0.5, 0.05
_fn.links.new(_pos.outputs["Position"], _len.inputs[0])
_fn.links.new(_len.outputs["Value"], _rough.inputs["Value"])
_fn.links.new(_len.outputs["Value"], _spec.inputs["Value"])
_fn.links.new(_rough.outputs["Result"], _fb.inputs["Roughness"])
for _sock in ("Specular IOR Level", "Specular"):
    if _sock in _fb.inputs:
        _fn.links.new(_spec.outputs["Result"], _fb.inputs[_sock])
        break

# Light linking: the chamfer strip should light the trophies only. Left unlinked, its reflection smears
# across the glossy floor between the camera and the trophies as a bright haze.
_recv = bpy.data.collections.new("TrophyReceivers")
scene.collection.children.link(_recv)
for _root in (deca, fbla):
    for _ob in [_root] + list(_root.children_recursive):
        if _ob.name not in _recv.objects:
            _recv.objects.link(_ob)
for _name in ("EdgeStrip", "Top", "WallGlow", "Key", "Fill"):
    if _name in bpy.data.objects:
        bpy.data.objects[_name].light_linking.receiver_collection = _recv

# Distant stage lights as soft bokeh. Deliberately dim and blue so they never fight the type: the
# brightest things in the frame should be the trophies.
BOKEH = bpy.data.materials.new("Bokeh")
BOKEH.use_nodes = True
_nt = BOKEH.node_tree
_nt.nodes.remove(_nt.nodes["Principled BSDF"])
_em = _nt.nodes.new("ShaderNodeEmission")
_nt.links.new(_em.outputs["Emission"], _nt.nodes["Material Output"].inputs["Surface"])
_attr = _nt.nodes.new("ShaderNodeAttribute")
_attr.attribute_type, _attr.attribute_name = "OBJECT", "bokeh_colour"
_nt.links.new(_attr.outputs["Color"], _em.inputs["Color"])
_em.inputs["Strength"].default_value = 1.0

rng = random.Random(2027)
for i in range(34):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=rng.uniform(0.03, 0.07), segments=16, ring_count=8,
                                         location=(rng.uniform(-3.6, 3.6), rng.uniform(4.0, 7.5), rng.uniform(0.15, 1.5)))
    b = bpy.context.active_object
    b.name = f"Bokeh{i}"
    b.data.materials.append(BOKEH)
    b["bokeh_colour"] = (0.22, 0.42, 1.0) if rng.random() < 0.8 else (0.7, 0.8, 1.0)
    b.visible_diffuse = b.visible_glossy = b.visible_shadow = False

# ---------------------------------------------------------------- camera rig
target = bpy.data.objects.new("CamTarget", None)
bpy.context.collection.objects.link(target)
cd = cam.data
cd.clip_start = 0.001                    # the camera passes within millimetres of, and through, the glass
cd.sensor_fit = "HORIZONTAL"             # portrait keeps the same horizontal field of view
cd.dof.use_dof = True
cd.dof.focus_object = target
for c in list(cam.constraints):
    cam.constraints.remove(c)


def local(ob, x, y, z):
    return ob.matrix_world @ Vector((x, y, z))


def front_normal(ob):
    return (ob.matrix_world.to_3x3() @ Vector((0, -1, 0))).normalized()


def right_vec(ob):
    return (ob.matrix_world.to_3x3() @ Vector((1, 0, 0))).normalized()


n_d, n_f = front_normal(deca), front_normal(fbla)
r_d, r_f = right_vec(deca), right_vec(fbla)
P_d = local(deca, -0.025, 0.0065, 0.17)      # centre of the DECA slab face
P_f = local(fbla, 0.0, 0.005, 0.17)          # centre of the FBLA crystal face

# Per-set framing. Landscape frames put the subject to one side with the other half empty for copy.
# Portrait frames put the subject high and leave the lower half empty.
if not PORTRAIT:
    D_HERO, D_FIN, D_CLOSE = 1.45, 1.25, 1.0
    HERO_Z, HERO_T = 0.42, 0.27             # camera height, look-at height
    FIN_Z, FIN_T = 0.40, 0.20
    LAT, LAT_F, VERT = 0.15, 0.26, 0.0      # how far the close-ups are shifted sideways / vertically
else:
    D_HERO, D_FIN, D_CLOSE = 0.88, 0.90, 0.50
    HERO_Z, HERO_T = 0.34, 0.205
    FIN_Z, FIN_T = 0.33, 0.20
    LAT, LAT_F, VERT = 0.0, 0.0, -0.10


def wp_hero():
    return (Vector((0.0, -D_HERO, HERO_Z)), Vector((0.0, 0.0, HERO_T)), 40, 5.6)


def wp_deca():
    t = P_d + Vector((0, 0, VERT)) - r_d * LAT           # looking left of the trophy puts it on the right
    return (P_d + n_d * D_CLOSE + Vector((0, 0, 0.03)), t, 40, 5.6)


def wp_fbla():
    t = P_f + Vector((0, 0, VERT)) + r_f * LAT_F         # looking right of the trophy puts it on the left
    return (P_f + n_f * D_CLOSE + Vector((0, 0, 0.03)), t, 40, 5.6)


def wp_ranks():
    return (Vector((0.0, -D_HERO * 1.25, HERO_Z + 0.55)), Vector((0.0, 0.02, HERO_T - 0.12)), 40, 5.6)


def wp_final():
    return (Vector((0.0, -D_FIN, FIN_Z)), Vector((0.0, 0.0, FIN_T)), 44 if not PORTRAIT else 40, 5.6)


def lerp3(a, b, t):
    return a + (b - a) * t


def segments():
    """Each segment: list of (tau, camera position, look-at target, lens, f-stop). tau in 0..1 within the segment."""
    h, d, f, r, fin = wp_hero(), wp_deca(), wp_fbla(), wp_ranks(), wp_final()
    s0 = [  # hero -> DECA: a gentle arc in
        (0.0, *h),
        (0.5, lerp3(h[0], d[0], 0.5) + r_d * 0.10 + Vector((0, 0, 0.04)), lerp3(h[1], d[1], 0.5), 40, 5.6),
        (1.0, *d),
    ]
    s1 = [  # DECA -> through the glass -> around the back -> FBLA
        (0.00, *d),
        (0.20, P_d + n_d * (D_CLOSE * 0.55), P_d - r_d * (LAT * 0.35), 40, 4.0),
        (0.34, P_d + n_d * 0.11, P_d - n_d * 0.35, 40, 3.2),
        (0.43, P_d - n_d * 0.14, P_d - n_d * 0.7 + r_d * 0.25 + Vector((0, 0, 0.03)), 40, 3.2),
        (0.52, P_d - n_d * 0.42 + r_d * 0.18 + Vector((0, 0, 0.04)), P_f + Vector((0.0, 0.0, 0.02)), 40, 3.2),
        (0.66, Vector((0.46, 0.46, 0.30)), P_f + Vector((0, 0.03, 0)), 38, 4.0),
        (0.80, Vector((0.64, -0.05, 0.28)), P_f, 38, 4.0),
        (0.91, Vector((0.50, -0.55, 0.27)) if not PORTRAIT else Vector((0.42, -0.50, 0.27)), P_f, 40, 5.6),
        (1.00, *f),
    ]
    s2 = [  # FBLA -> ranks: pull up and back
        (0.0, *f),
        (0.5, lerp3(f[0], r[0], 0.5) - r_f * 0.18 + Vector((0, 0, 0.1)), lerp3(f[1], r[1], 0.5), 40, 5.6),
        (1.0, *r),
    ]
    s3 = [  # ranks -> finale: settle forward
        (0.0, *r),
        (1.0, *fin),
    ]
    return [s0, s1, s2, s3]


SEGS = segments()


def hermite(ts, vs, t):
    n = len(ts)
    zero = vs[0] * 0
    ms = [zero] + [(vs[i + 1] - vs[i - 1]) * (1.0 / (ts[i + 1] - ts[i - 1])) for i in range(1, n - 1)] + [zero]
    i = max(j for j in range(n - 1) if ts[j] <= t) if t < ts[-1] else n - 2
    h = ts[i + 1] - ts[i]
    s = (t - ts[i]) / h
    h00, h10, h01, h11 = 2 * s**3 - 3 * s**2 + 1, s**3 - 2 * s**2 + s, -2 * s**3 + 3 * s**2, s**3 - s**2
    return vs[i] * h00 + ms[i] * (h10 * h) + vs[i + 1] * h01 + ms[i + 1] * (h11 * h)


def pose_at(frame):
    for k in range(len(WP) - 1):
        a, b = WP[k], WP[k + 1]
        if frame <= b:
            t = (frame - a) / (b - a)
            seg = SEGS[k]
            ts = [s[0] for s in seg]
            return (hermite(ts, [s[1] for s in seg], t), hermite(ts, [s[2] for s in seg], t),
                    float(hermite(ts, [Vector((s[3], 0, 0)) for s in seg], t).x),
                    float(hermite(ts, [Vector((s[4], 0, 0)) for s in seg], t).x))
    return pose_at(LAST)


def set_pose(frame):
    pos, tgt, lens, fs = pose_at(frame)
    cam.location, target.location = pos, tgt
    cam.rotation_euler = (tgt - pos).to_track_quat("-Z", "Y").to_euler()
    cd.lens = lens
    cd.dof.aperture_fstop = fs
    bpy.context.view_layer.update()


# ---------------------------------------------------------------- render settings
scene.render.engine = "CYCLES"
cy = scene.cycles
cy.samples = SAMPLES
cy.use_denoising = True
for prop, val in (("denoiser", "OPENIMAGEDENOISE"), ("denoising_input_passes", "RGB_ALBEDO_NORMAL"),
                  ("denoising_prefilter", "ACCURATE"), ("denoising_quality", "HIGH")):
    try:
        setattr(cy, prop, val)
    except Exception as e:
        print("note: could not set", prop, e)
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.012
cy.adaptive_min_samples = 16
cy.max_bounces, cy.transmission_bounces, cy.glossy_bounces, cy.diffuse_bounces = 14, 12, 4, 3
cy.transparent_max_bounces = 16
cy.caustics_reflective = cy.caustics_refractive = False
cy.blur_glossy = 0.5
cy.sample_clamp_indirect = 6.0            # tames fireflies from the small bright lights seen through glass
cy.seed = 7                               # fixed, so the tilt crops match the finale exactly
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
except Exception:
    pass
scene.render.dither_intensity = 1.0
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.image_settings.compression = 15
scene.render.use_overwrite = True

MASTER = os.path.join(OUT, "master" if QUALITY == "final" else QUALITY, SET)
os.makedirs(MASTER, exist_ok=True)


def render_to(path, samples):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return False
    cy.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    return True


def project_bounds(ob, margin=0.0):
    from bpy_extras.object_utils import world_to_camera_view
    pts = []
    for child in ob.children_recursive:
        if child.type in ("MESH", "FONT"):
            for corner in child.bound_box:
                pts.append(world_to_camera_view(scene, cam, child.matrix_world @ Vector(corner)))
    xs, ys, zs = [p.x for p in pts], [p.y for p in pts], [p.z for p in pts]
    if min(zs) <= 0:
        return None                                   # (part of it) behind the camera
    return [min(xs) - margin, 1 - max(ys) - margin, max(xs) + margin, 1 - min(ys) + margin]   # x0, y0, x1, y1 from the top-left


manifest = {"set": SET, "fps": FPS, "frames": LAST, "waypoints": WP, "width": W, "height": H}

if MODE == "keys":
    extra = [25, 80, 95, 108, 116, 124, 132, 140, 150, 180, 230]
    frames = sorted(set(WP + extra))
    bounds = {}
    for f in frames:
        set_pose(f)
        scene.render.use_overwrite = True
        cy.samples = SAMPLES
        scene.render.filepath = os.path.join(MASTER, f"{f:04d}.png")
        bpy.ops.render.render(write_still=True)
        bounds[f] = {"deca": project_bounds(deca), "fbla": project_bounds(fbla)}
    json.dump(bounds, open(os.path.join(MASTER, "bounds.json"), "w"), indent=1)
    print("DONE keys", MASTER)

elif MODE == "frames":
    a, b = (int(x) for x in arg("--frames", f"1-{LAST}").split("-"))
    done = 0
    for f in range(a, b + 1):
        set_pose(f)
        n = STILL_SAMPLES if f in WP else SAMPLES
        if render_to(os.path.join(MASTER, f"{f:04d}.png"), n):
            done += 1
    json.dump(manifest, open(os.path.join(MASTER, "manifest.json"), "w"), indent=1)
    print("DONE frames", MASTER, done)

elif MODE == "tilt":
    set_pose(LAST)
    angles = [-8, -6, -4, -2, 0, 2, 4, 6, 8]
    tdir = os.path.join(MASTER, "tilt")
    os.makedirs(tdir, exist_ok=True)
    meta = {"width": W, "height": H, "angles": angles, "trophies": {}}
    for key, ob in (("deca", deca), ("fbla", fbla)):
        bb = project_bounds(ob, 0.0)
        x0 = max(bb[0] - 0.05, 0); x1 = min(bb[2] + 0.05, 1)
        y0 = max(bb[1] - 0.04, 0); y1 = min(bb[3] + 0.13, 1)     # extra room underneath for the floor reflection
        scene.render.use_border = True
        scene.render.use_crop_to_border = True
        scene.render.border_min_x, scene.render.border_max_x = x0, x1
        scene.render.border_min_y, scene.render.border_max_y = 1 - y1, 1 - y0
        meta["trophies"][key] = {"x": round(x0 * W), "y": round(y0 * H), "w": round((x1 - x0) * W), "h": round((y1 - y0) * H)}
        base = ob.rotation_euler.z
        for i, ang in enumerate(angles):
            ob.rotation_euler.z = base + math.radians(ang)
            render_to(os.path.join(tdir, f"{key}_{i}.png"), STILL_SAMPLES)
        ob.rotation_euler.z = base
    json.dump(meta, open(os.path.join(tdir, "tilt.json"), "w"), indent=1)
    print("DONE tilt", tdir)

elif MODE == "bounds":
    out = {}
    for f in WP:
        set_pose(f)
        out[f] = {"deca": project_bounds(deca), "fbla": project_bounds(fbla)}
    json.dump(out, open(os.path.join(MASTER, "bounds.json"), "w"), indent=1)
    print("DONE bounds")

if MODE == "hero":
    # Each trophy alone, on a transparent background, at a few angles: the site's track pages sway it with the pointer.
    HW, HH = int(arg("--hero-width", 720)), int(arg("--hero-height", 960))
    scene.render.resolution_x, scene.render.resolution_y = HW, HH
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    floor.is_holdout = True
    for _b in [o for o in bpy.data.objects if o.name.startswith("Bokeh")]:
        _b.hide_render = True
    hdir = os.path.join(OUT, "master", "hero")
    os.makedirs(hdir, exist_ok=True)
    angles = [-28, -21, -14, -7, 0, 7, 14, 21, 28]
    for key, ob, other, P, n in (("deca", deca, fbla, P_d, n_d), ("fbla", fbla, deca, P_f, n_f)):
        for o in [other] + list(other.children_recursive):
            o.hide_render = True
        for o in [ob] + list(ob.children_recursive):
            o.hide_render = False
        pos = P + n * 0.74 + Vector((0, 0, 0.0))
        cam.location, target.location = pos, P
        cam.rotation_euler = (P - pos).to_track_quat("-Z", "Y").to_euler()
        cd.lens, cd.dof.aperture_fstop = 62, 8.0
        bpy.context.view_layer.update()
        base = ob.rotation_euler.z
        for i, ang in enumerate(angles):
            ob.rotation_euler.z = base + math.radians(ang)
            render_to(os.path.join(hdir, f"{key}_{i}.png"), int(arg("--samples", 96)))
        ob.rotation_euler.z = base
    json.dump({"angles": angles, "width": HW, "height": HH}, open(os.path.join(hdir, "hero.json"), "w"))
    print("DONE hero", hdir)
