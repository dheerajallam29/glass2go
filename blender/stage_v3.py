# The stage (v3): a real awards-stage set, built into the scene by flight.py (exec'd after the bokeh block).
# A ring of truss with fixtures overhead, soft shafts of light down onto the trophies, glowing rings set into the
# floor, and an arc of LED panels far behind. Everything stays dim toward the top of the frame, where the page's words sit.
# Names used from flight.py: bpy, math, os, Vector, scene, rng, spot.


def _mat_emit(name, colour, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*colour, 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], o.inputs[0])
    return m


def _mat_metal(name, rough=0.32, colour=(0.03, 0.035, 0.05)):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*colour, 1)
    b.inputs["Metallic"].default_value = 0.9
    b.inputs["Roughness"].default_value = rough
    return m


def _no_light(ob):
    ob.visible_shadow = ob.visible_diffuse = False


STAGE_BLUE = (0.10, 0.30, 1.0)

if os.environ.get("G2G_STAGE", "1") == "1":
    # fewer, nearer bokeh so they read as soft stage glints
    for _b in [o for o in bpy.data.objects if o.name.startswith("Bokeh")]:
        if _b.name[5:].isdigit() and int(_b.name[5:]) > 15:
            bpy.data.objects.remove(_b, do_unlink=True)
        else:
            _b.location = (_b.location.x * 0.5, rng.uniform(1.6, 3.4), _b.location.z)
            _b.scale = (0.55, 0.55, 0.55)

    # glowing rings set into the floor
    for name, rad, minor, k in (("RingA", 0.74, 0.004, 3.0), ("RingB", 1.22, 0.003, 1.2), ("RingC", 1.9, 0.0025, 0.5)):
        bpy.ops.mesh.primitive_torus_add(major_radius=rad, minor_radius=minor, major_segments=120, minor_segments=8, location=(0, 0.02, 0.004))
        r = bpy.context.active_object
        r.name = name
        r.data.materials.append(_mat_emit(name, STAGE_BLUE, k))
        _no_light(r)

    # overhead truss
    bpy.ops.mesh.primitive_torus_add(major_radius=1.75, minor_radius=0.022, major_segments=96, minor_segments=8, location=(0, 0.1, 1.85))
    bpy.context.active_object.data.materials.append(_mat_metal("Truss", 0.4))
    bpy.ops.mesh.primitive_torus_add(major_radius=1.75, minor_radius=0.012, major_segments=96, minor_segments=6, location=(0, 0.1, 1.74))
    bpy.context.active_object.data.materials.append(_mat_metal("Truss", 0.4))

    # the soft shaft material: brightest at the floor end, fading at the edges and toward the fixture
    CONE = bpy.data.materials.new("Shaft")
    CONE.use_nodes = True
    n = CONE.node_tree
    n.nodes.clear()
    out = n.nodes.new("ShaderNodeOutputMaterial")
    mix = n.nodes.new("ShaderNodeMixShader")
    tr = n.nodes.new("ShaderNodeBsdfTransparent")
    emi = n.nodes.new("ShaderNodeEmission")
    emi.inputs["Color"].default_value = (0.35, 0.55, 1.0, 1)
    emi.inputs["Strength"].default_value = 2.2
    lw = n.nodes.new("ShaderNodeLayerWeight")
    lw.inputs["Blend"].default_value = 0.5
    pw = n.nodes.new("ShaderNodeMath")
    pw.operation = "POWER"
    pw.inputs[1].default_value = 0.8
    inv = n.nodes.new("ShaderNodeMath")
    inv.operation = "SUBTRACT"
    inv.inputs[0].default_value = 1.0
    tc = n.nodes.new("ShaderNodeTexCoord")
    sep = n.nodes.new("ShaderNodeSeparateXYZ")
    mul = n.nodes.new("ShaderNodeMath")
    mul.operation = "MULTIPLY"
    mulk = n.nodes.new("ShaderNodeMath")
    mulk.operation = "MULTIPLY"
    mulk.inputs[1].default_value = float(os.environ.get("G2G_SHAFT", "0.013"))
    # generated Z runs 0 at the cone's floor end to 1 at the apex; flip so the floor end is brightest
    flip = n.nodes.new("ShaderNodeMath")
    flip.operation = "SUBTRACT"
    flip.inputs[0].default_value = 1.0
    n.links.new(lw.outputs["Facing"], pw.inputs[0])
    n.links.new(pw.outputs[0], inv.inputs[1])
    n.links.new(tc.outputs["Generated"], sep.inputs[0])
    n.links.new(sep.outputs["Z"], flip.inputs[1])
    n.links.new(inv.outputs[0], mul.inputs[0])
    n.links.new(flip.outputs[0], mul.inputs[1])
    n.links.new(mul.outputs[0], mulk.inputs[0])
    n.links.new(mulk.outputs[0], mix.inputs[0])
    n.links.new(tr.outputs[0], mix.inputs[1])
    n.links.new(emi.outputs[0], mix.inputs[2])
    n.links.new(mix.outputs[0], out.inputs[0])

    FIX = _mat_metal("Fixture", 0.3)
    LENS = _mat_emit("FixtureLens", (0.7, 0.85, 1.0), 40.0)
    aim = Vector((0.0, 0.0, 0.14))
    # fixtures sit out at the left and right of the stage, so the light comes in from the sides and the middle stays quiet
    SIDE = [(-1.9, -0.55), (-2.1, 0.45), (1.9, -0.55), (2.1, 0.45)]
    for i, (sx, sy) in enumerate(SIDE):
        top = Vector((sx, sy, 1.55))
        foot = aim + Vector((math.copysign(0.34, sx), 0.05, -0.14))
        d = top - foot
        L = d.length
        q = d.normalized().to_track_quat("Z", "Y").to_euler()
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.13, radius2=0.012, depth=L, location=(foot + top) / 2)
        c = bpy.context.active_object
        c.name = f"Shaft{i}"
        c.rotation_euler = q
        c.data.materials.append(CONE)
        c.visible_shadow = c.visible_diffuse = c.visible_glossy = False
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.06, depth=0.14, location=top)
        f = bpy.context.active_object
        f.name = f"Fixture{i}"
        f.rotation_euler = q
        f.data.materials.append(FIX)
        bpy.ops.mesh.primitive_circle_add(vertices=24, radius=0.05, fill_type="NGON", location=top - d.normalized() * 0.075)
        lens = bpy.context.active_object
        lens.name = f"Lens{i}"
        lens.rotation_euler = q
        lens.data.materials.append(LENS)
        _no_light(lens)
        # a real light puts a soft pool on the floor and rims the glass
        spot(f"Stage{i}", top, foot, 4.5, colour=(0.62, 0.78, 1.0), size_deg=20)

    # a far arc of LED panels, brightest at mid-height and dark toward the top and bottom
    PANEL = bpy.data.materials.new("LED")
    PANEL.use_nodes = True
    p = PANEL.node_tree
    p.nodes.clear()
    po = p.nodes.new("ShaderNodeOutputMaterial")
    pe = p.nodes.new("ShaderNodeEmission")
    pc = p.nodes.new("ShaderNodeValToRGB")
    pt = p.nodes.new("ShaderNodeTexCoord")
    ps = p.nodes.new("ShaderNodeSeparateXYZ")
    pg = p.nodes.new("ShaderNodeTexBrick")
    pg.inputs["Scale"].default_value = 14.0
    pg.inputs["Mortar Size"].default_value = 0.03
    pg.inputs["Color1"].default_value = (1, 1, 1, 1)
    pg.inputs["Color2"].default_value = (0.7, 0.7, 0.7, 1)
    pg.inputs["Mortar"].default_value = (0.0, 0.0, 0.0, 1)
    pm = p.nodes.new("ShaderNodeMix")
    pm.data_type = "RGBA"
    pm.blend_type = "MULTIPLY"
    pm.inputs[0].default_value = 1.0
    pc.color_ramp.elements[0].color = (0.0, 0.004, 0.02, 1)
    pc.color_ramp.elements[1].position = 1.0
    pc.color_ramp.elements[1].color = (0.0, 0.006, 0.03, 1)
    _mid = pc.color_ramp.elements.new(0.34)
    _mid.color = (0.10, 0.30, 1.0, 1)
    pe.inputs["Strength"].default_value = float(os.environ.get("G2G_LED", "0.09"))
    p.links.new(pt.outputs["Generated"], ps.inputs[0])
    p.links.new(ps.outputs["Y"], pc.inputs["Fac"])
    p.links.new(pt.outputs["UV"], pg.inputs["Vector"])
    p.links.new(pc.outputs["Color"], pm.inputs[6])
    p.links.new(pg.outputs["Color"], pm.inputs[7])
    p.links.new(pm.outputs[2], pe.inputs["Color"])
    p.links.new(pe.outputs[0], po.inputs[0])
    for i in range(13):
        a = math.radians(-78 + i * 13)
        R = 3.6
        x, y = math.sin(a) * R, math.cos(a) * R * 0.9 + 0.2
        bpy.ops.mesh.primitive_plane_add(size=1, location=(x, y, 0.62))
        pn = bpy.context.active_object
        pn.name = f"LED{i}"
        pn.scale = (0.78, 1.45, 1)
        pn.rotation_euler = (math.radians(90), 0, -a)
        pn.data.materials.append(PANEL)
        _no_light(pn)
