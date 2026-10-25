"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { asset } from "@/lib/asset";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./GlassFlight.module.css";
import RankIcon from "@/components/site/RankIcon";
import { authEnabled, signInWithGoogle, useAuth } from "@/lib/auth";
import { FrameStore } from "./frames";
import {
  CHAPTERS,
  FPS,
  FRAME_COUNT,
  LAST,
  PILL_Y,
  WAYPOINTS,
  ZONES,
  pad4,
  place,
  type Bounds,
  type ChapterId,
  type Manifest,
  type Placement,
  type Rect,
  type SetName,
  type Tier,
  type TiltMeta,
} from "./timeline";

type Trophy = "deca" | "fbla";
const TROPHIES: Trophy[] = ["deca", "fbla"];
const CANVAS_COLOUR = "#05070d";
const LOOK = 26; // frames decoded ahead of the playhead (the film is 48 fps)
const LOCK_MS = 700; // ignore input right after a move lands (trackpad inertia)

const zoneVars = (id: ChapterId, set: SetName): CSSProperties => {
  const z = ZONES[id][set];
  return { "--zx": z.x, "--zy": z.y, "--zw": z.w, "--zh": z.h } as CSSProperties;
};

/** Soften a tilt crop's edges so it melts into the frame underneath. */
function feather(bm: ImageBitmap): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = bm.width;
  c.height = bm.height;
  const g = c.getContext("2d")!;
  g.drawImage(bm, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const edge = 0.06;
  for (const [x1, y1] of [[c.width, 0], [0, c.height]] as const) {
    const grad = g.createLinearGradient(0, 0, x1, y1);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(edge, "#000");
    grad.addColorStop(1 - edge, "#000");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

export default function GlassFlight() {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const goRef = useRef<(to: number) => void>(() => {});
  const tiltTarget = useRef({ deca: 0, fbla: 0 });
  const nudgeCancel = useRef(false);

  const [set, setSet] = useState<SetName>("landscape");
  const [active, setActive] = useState(0); // chapter whose words are showing; -1 while the camera is moving
  const [index, setIndex] = useState(0); // last chapter reached
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState(false);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [zooming, setZooming] = useState<Trophy | null>(null);
  const auth = useAuth();
  const [askSignIn, setAskSignIn] = useState<Trophy | null>(null); // trophy waiting behind the sign-in offer
  const router = useRouter();
  const pathname = usePathname();

  /** Step into a trophy: the film drifts toward the glass and fades out, then the next page settles in. */
  const zoomInto = useCallback(
    (k: Trophy) => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      const b = bounds?.[String(WAYPOINTS[LAST])]?.[k];
      if (!stage || !canvas || !b || zooming) {
        router.push(`/${k}`);
        return;
      }
      const cs = getComputedStyle(stage);
      const ox = parseFloat(cs.getPropertyValue("--ox")) || 0;
      const oy = parseFloat(cs.getPropertyValue("--oy")) || 0;
      const fw = parseFloat(cs.getPropertyValue("--fw")) || stage.clientWidth;
      const fh = parseFloat(cs.getPropertyValue("--fh")) || stage.clientHeight;
      const cx = ox + ((b[0] + b[2]) / 2) * fw;
      const cy = oy + (b[1] + (b[3] - b[1]) * 0.42) * fh;
      setZooming(k);
      canvas.style.transformOrigin = `${cx}px ${cy}px`;
      canvas.style.transition = "transform 520ms cubic-bezier(0.4, 0, 0.6, 1), opacity 520ms ease-in";
      requestAnimationFrame(() => {
        canvas.style.transform = "scale(1.18)";
        canvas.style.opacity = "0";
      });
      window.setTimeout(() => router.push(`/${k}`), 480);
    },
    [bounds, router, zooming],
  );

  // Coming back to the homepage (browser back, or the logo) must undo the zoom-out: the page can be kept alive while it is
  // hidden, which left the film faded to black with the zoom state still set.
  useEffect(() => {
    const restore = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transition = "none";
        canvas.style.transform = "";
        canvas.style.opacity = "";
      }
      setZooming(null);
      setAskSignIn(null);
    };
    restore();
    const onShow = (e: PageTransitionEvent) => e.persisted && restore();
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [pathname]);

  // where the trophies sit in the finale, for hit areas
  useEffect(() => {
    let off = false;
    fetch(asset("/flight/layout.json"))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => !off && j && setBounds(j[set] ?? null))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [set]);

  useEffect(() => {
    const stage = stageRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d", { alpha: false })!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // portrait frames for tall windows; the choice has some hysteresis so resizing does not flap
    const aspect = () => stage.clientWidth / Math.max(stage.clientHeight, 1);
    const wanted: SetName = set === "portrait" ? (aspect() > 1.02 ? "landscape" : "portrait") : aspect() < 0.92 ? "portrait" : "landscape";
    if (wanted !== set) {
      setSet(wanted);
      return;
    }

    let dead = false;
    let store: FrameStore | null = null;
    let tier: Tier | null = null;
    let dpr = 1;
    let cw = 0;
    let ch = 0;
    let pl: Placement = { s: 1, ox: 0, oy: 0, w: 1, h: 1 };
    const E = {
      pos: 1,
      target: 1,
      dir: 0 as -1 | 0 | 1,
      speed: 1,
      lastT: performance.now(),
      moving: false,
      playing: false,
      index: 0,
      lockUntil: 0,
      dirty: true,
      fade: null as null | { from: number; to: number; t0: number },
      origin: 1,
      nudged: false,
      nudgeT0: 0,
    };
    const tilt = {
      meta: null as TiltMeta | null,
      imgs: { deca: [] as HTMLCanvasElement[], fbla: [] as HTMLCanvasElement[] },
      angle: { deca: 0, fbla: 0 },
    };

    const layout = () => {
      if (!tier) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      cw = Math.round(vw * dpr);
      ch = Math.round(vh * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      pl = place(vw, vh, tier.width, tier.height, set);
      stage.style.setProperty("--fw", `${pl.w}px`);
      stage.style.setProperty("--fh", `${pl.h}px`);
      stage.style.setProperty("--ox", `${pl.ox}px`);
      stage.style.setProperty("--oy", `${pl.oy}px`);
      E.dirty = true;
    };

    const draw = () => {
      if (!store) return;
      ctx.fillStyle = CANVAS_COLOUR;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const dx = pl.ox * dpr, dy = pl.oy * dpr, dw = pl.w * dpr, dh = pl.h * dpr;

      if (E.fade) {
        const t = Math.min(1, (performance.now() - E.fade.t0) / 380);
        const a = store.peek(E.fade.from) ?? store.nearest(E.fade.from);
        const b = store.peek(E.fade.to) ?? store.nearest(E.fade.to);
        if (a) ctx.drawImage(a, dx, dy, dw, dh);
        if (b) {
          ctx.globalAlpha = t;
          ctx.drawImage(b, dx, dy, dw, dh);
          ctx.globalAlpha = 1;
        }
        if (t >= 1) E.fade = null;
        return;
      }

      const f0 = Math.max(1, Math.min(FRAME_COUNT, Math.floor(E.pos)));
      const mix = E.pos - f0;
      const A = store.peek(f0) ?? store.nearest(f0);
      if (A) ctx.drawImage(A, dx, dy, dw, dh);
      const B = mix > 0.01 && f0 < FRAME_COUNT ? store.peek(f0 + 1) : undefined;
      if (B) {
        ctx.globalAlpha = mix;
        ctx.drawImage(B, dx, dy, dw, dh);
        ctx.globalAlpha = 1;
      }

      // the finale's hover tilt: swap each trophy for a rendered crop at a slightly different angle
      if (tilt.meta && !E.moving && E.index === LAST) {
        const n = tilt.meta.angles.length;
        const k = pl.s * dpr * (tier!.width / tilt.meta.width);
        for (const key of TROPHIES) {
          const a = tilt.angle[key];
          if (Math.abs(a) < 0.004) continue;
          const f = ((a + 1) / 2) * (n - 1);
          const i0 = Math.floor(f);
          const m = f - i0;
          const r = tilt.meta.trophies[key];
          const x = dx + r.x * k, y = dy + r.y * k, w = r.w * k, h = r.h * k;
          const c0 = tilt.imgs[key][i0];
          const c1 = tilt.imgs[key][Math.min(n - 1, i0 + 1)];
          if (c0) ctx.drawImage(c0, x, y, w, h);
          if (c1 && m > 0.01) {
            ctx.globalAlpha = m;
            ctx.drawImage(c1, x, y, w, h);
            ctx.globalAlpha = 1;
          }
        }
      }
    };

    const arrive = (i: number, now: number) => {
      E.index = i;
      E.moving = false;
      E.playing = false;
      E.lockUntil = now + LOCK_MS;
      E.dirty = true;
      setIndex(i);
      setActive(i);
      if (i === LAST && !E.nudged && !reduced) {
        // once: let each trophy sway a little, so it is obvious they respond and can be clicked
        E.nudged = true;
        E.nudgeT0 = now + 650;
        nudgeCancel.current = false;
      }
    };

    const go = async (to: number) => {
      if (!store || E.moving || to < 0 || to > LAST || to === E.index) return;
      const from = E.index;
      const a = WAYPOINTS[from], b = WAYPOINTS[to];
      E.moving = true;
      setActive(-1);

      if (reduced) {
        await Promise.all([store.fetch(a), store.fetch(b)]);
        await Promise.all([store.decode(a), store.decode(b)]);
        E.fade = { from: a, to: b, t0: performance.now() };
        E.pos = b;
        window.setTimeout(() => arrive(to, performance.now()), 380);
        return;
      }

      // every frame of this move must have arrived, and the first stretch be decoded, before it starts
      const lo = Math.min(a, b), hi = Math.max(a, b);
      const missingFrames: number[] = [];
      for (let n = lo; n <= hi; n++) if (!store.has(n)) missingFrames.push(n);
      if (missingFrames.length) {
        setWaiting(true);
        if (b < a) missingFrames.reverse();
        await store.fetchAll(missingFrames, 6);
        setWaiting(false);
      }
      const dir: 1 | -1 = b > a ? 1 : -1;
      await Promise.all(Array.from({ length: 10 }, (_, i) => store!.decode(Math.min(hi, Math.max(lo, a + dir * i)))));
      if (dead) return;
      E.dir = dir;
      E.origin = a;
      E.target = b;
      E.speed = Math.abs(to - from) > 1 ? 1.7 : 1;
      E.lastT = performance.now();
      E.playing = true;
    };
    goRef.current = go;

    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - E.lastT) / 1000);
      E.lastT = now;

      if (E.playing) {
        // ease in and out: the camera eases away from each stop and settles into the next, instead of starting and ending at full speed
        const edge = Math.min(Math.abs(E.pos - E.origin), Math.abs(E.target - E.pos));
        const ease = Math.min(1, 0.3 + 0.7 * Math.sin((Math.min(edge, FPS * 0.4) / (FPS * 0.4)) * Math.PI * 0.5));
        E.pos += E.dir * E.speed * ease * FPS * dt;
        const done = E.dir > 0 ? E.pos >= E.target : E.pos <= E.target;
        if (done) {
          E.pos = E.target;
          arrive(WAYPOINTS.indexOf(E.target as (typeof WAYPOINTS)[number]), now);
        }
        if (store) {
          const f = Math.floor(E.pos);
          for (let i = 0; i <= LOOK; i++) void store.decode(Math.max(1, Math.min(FRAME_COUNT, f + E.dir * i)));
          store.trim(f - 40, f + 40);
        }
        E.dirty = true;
      }

      // tilt: pointer-driven, with a one-time sway that plays when the finale lands
      let tiltMoving = false;
      if (tilt.meta && E.index === LAST && !E.moving) {
        if (E.nudged && !nudgeCancel.current) {
          const t = (now - E.nudgeT0) / 1000;
          for (const [k, key] of TROPHIES.entries()) {
            const u = (t - k * 0.45) / 1.5;
            tiltTarget.current[key] = u >= 0 && u <= 1 ? Math.sin(u * Math.PI * 2) * 0.75 * Math.sin(u * Math.PI) ** 0.5 : 0;
          }
          if (t > 2.6) nudgeCancel.current = true;
        }
        for (const key of TROPHIES) {
          const d = tiltTarget.current[key] - tilt.angle[key];
          if (Math.abs(d) > 0.002) {
            tilt.angle[key] += d * 0.16;
            tiltMoving = true;
          } else if (tilt.angle[key] !== tiltTarget.current[key]) {
            tilt.angle[key] = tiltTarget.current[key];
            tiltMoving = true;
          }
        }
      }

      if (E.dirty || E.fade || tiltMoving) {
        draw();
        E.dirty = !!(E.playing || E.fade);
      }
      raf = requestAnimationFrame(tick);
    };

    // ----- input: any scroll, swipe or key plays the next move in full -----
    let acc = 0;
    let lastWheel = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (E.moving || now < E.lockUntil) {
        acc = 0;
        return;
      }
      if (now - lastWheel > 220) acc = 0;
      lastWheel = now;
      acc += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      if (Math.abs(acc) >= 36) {
        void go(E.index + Math.sign(acc));
        acc = 0;
      }
    };
    let touchY = 0;
    let touchX = 0;
    let touchDone = false;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0].clientY;
      touchX = e.touches[0].clientX;
      touchDone = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchDone || E.moving || performance.now() < E.lockUntil) return;
      const dy = touchY - e.touches[0].clientY;
      const dx = touchX - e.touches[0].clientX;
      if (Math.abs(dy) > 36 && Math.abs(dy) > Math.abs(dx)) {
        touchDone = true;
        void go(E.index + Math.sign(dy));
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const interactive = !!el?.closest("a,button,input,textarea,select,[role=button]");
      const down = ["ArrowDown", "PageDown", "ArrowRight"].includes(e.key) || (e.key === " " && !interactive);
      const up = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
      if (down || up) {
        e.preventDefault();
        void go(E.index + (down ? 1 : -1));
      } else if (e.key === "Home") void go(0);
      else if (e.key === "End") void go(LAST);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    stage.addEventListener("touchstart", onTouchStart, { passive: true });
    stage.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    const ro = new ResizeObserver(() => {
      const nowAspect = aspect();
      if ((set === "landscape" && nowAspect < 0.92) || (set === "portrait" && nowAspect > 1.02)) {
        setSet(set === "landscape" ? "portrait" : "landscape");
        return;
      }
      layout();
    });
    ro.observe(stage);

    // ----- boot: manifest, the five stills first, then everything else in playback order -----
    (async () => {
      const manifest: Manifest | null = await fetch(asset(`/flight/${set}/manifest.json`))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (dead) return;
      if (!manifest || !manifest.tiers.length) {
        setMissing(true);
        return;
      }
      const vw = stage.clientWidth * Math.min(window.devicePixelRatio || 1, 2);
      const want = new URLSearchParams(location.search).get("tier");
      const tiers = [...manifest.tiers].sort((a, b) => a.width - b.width);
      tier = tiers.find((t) => t.name === want) ?? tiers.find((t) => t.width >= vw * 0.95) ?? tiers[tiers.length - 1];
      const bytes = tier.width * tier.height * 4;
      // the frames the page rests on (the waypoints) also exist as full 1920x1200 renders, so they are sharp at rest even though the moving film is 1280 wide
      const hi = set === "landscape" ? new Set(manifest.waypoints) : null;
      store = new FrameStore(manifest.frames, (n) => asset(hi?.has(n) ? `/flight/landscape/hi/${pad4(n)}.webp` : `/flight/${set}/${tier!.name}/${pad4(n)}.webp`), Math.max(28, Math.min(64, Math.floor(380e6 / bytes))));
      layout();

      await Promise.all(WAYPOINTS.map((n) => store!.fetch(n)));
      store.pin(WAYPOINTS);
      await Promise.all(WAYPOINTS.map((n) => store!.decode(n)));
      if (dead) return;
      E.dirty = true;
      setReady(true);

      if (!reduced) {
        const order: number[] = [];
        for (let n = 1; n <= FRAME_COUNT; n++) if (!WAYPOINTS.includes(n as (typeof WAYPOINTS)[number])) order.push(n);
        void store
          .fetchAll(order, 6, () => {
            if (store && store.loaded % 6 === 0) setProgress(store.loaded / FRAME_COUNT);
          })
          .then(() => !dead && setProgress(1));

        if (set === "landscape") {
          const meta: TiltMeta | null = await fetch(asset(`/flight/landscape/tilt/tilt.json`))
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          if (meta && !dead) {
            const tmp: Record<Trophy, HTMLCanvasElement[]> = { deca: [], fbla: [] };
            await Promise.all(
              TROPHIES.flatMap((k) =>
                meta.angles.map(async (_, i) => {
                  const res = await fetch(asset(`/flight/landscape/tilt/${k}_${i}.webp`));
                  if (!res.ok) throw new Error("tilt");
                  tmp[k][i] = feather(await createImageBitmap(await res.blob()));
                }),
              ),
            ).then(
              () => {
                if (dead) return;
                tilt.imgs = tmp;
                tilt.meta = meta;
              },
              () => {},
            );
          }
        }
      }
    })();

    raf = requestAnimationFrame(tick);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener("wheel", onWheel);
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      store?.destroy();
      goRef.current = () => {};
    };
  }, [set]);

  const go = useCallback((to: number) => goRef.current(to), []);

  const hit = (k: Trophy): CSSProperties | undefined => {
    const b = bounds?.[String(WAYPOINTS[LAST])]?.[k];
    if (!b) return undefined;
    const pad = 0.02;
    const r: Rect = { x: Math.max(0, b[0] - pad), y: Math.max(0, b[1] - pad), w: b[2] - b[0] + 2 * pad, h: b[3] - b[1] + 2 * pad };
    return { "--hx": r.x, "--hy": r.y, "--hw": r.w, "--hh": r.h, "--py": PILL_Y[set] } as CSSProperties;
  };

  const onFinale = active === LAST;

  return (
    <div ref={stageRef} className={styles.stage} data-set={set} data-ready={ready || undefined} data-zoom={zooming || undefined}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <div className={styles.edgeL} aria-hidden="true" />
      <div className={styles.edgeR} aria-hidden="true" />
      <div className={styles.floorFade} aria-hidden="true" />
      {progress < 1 && ready && <div className={styles.loading} style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />}

      <Copy id="hero" set={set} on={active === 0}>
        <h1 className={styles.h1}>The glass is the goal.</h1>
        <p className={styles.lede}>Free practice for DECA and FBLA. Exams built from the real blueprints, roleplays judged like the real thing.</p>

      </Copy>

      <Copy id="deca" set={set} on={active === 1}>
        <h2 className={styles.h2}>Every exam, built from its blueprint.</h2>
        <p className={styles.lede}>All seven DECA exams, weighted like the real ones, with a reason behind every answer.</p>
      </Copy>

      <Copy id="fbla" set={set} on={active === 2}>
        <h2 className={styles.h2}>Roleplays, judged like the real thing.</h2>
        <p className={styles.lede}>Prep against the clock, present out loud, then score yourself on the same rubric your judge uses.</p>
      </Copy>

      <Copy id="ranks" set={set} on={active === 3}>
        <h2 className={styles.h2}>Climb from Bronze to Glass.</h2>
        <ol className={styles.ladder} aria-label="Ranks, lowest to highest">
          {["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Glass"].map((r) => (
            <li key={r} className={r === "Glass" ? styles.top : undefined}>
              <RankIcon rank={r} size={26} />
              {r}
            </li>
          ))}
        </ol>
        <p className={styles.lede}>Every right answer moves you up. Glass is the top rank.</p>
      </Copy>

      <Copy id="finale" set={set} on={onFinale}>
        <h2 className={styles.h1}>Pick your glass.</h2>
        <p className={styles.lede}>Click a trophy to step inside.</p>
      </Copy>

      <nav className={styles.hits} aria-label="Choose a competition">
        {TROPHIES.map((k) => (
          <Link
            key={k}
            href={`/${k}`}
            className={styles.hit}
            style={hit(k)}
            data-on={onFinale || undefined}
            data-trophy={k}
            data-no-curtain=""
            tabIndex={onFinale ? 0 : -1}
            aria-hidden={!onFinale || undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              let offered = false;
              try {
                offered = sessionStorage.getItem("g2g-signin-offer") === "1";
              } catch {}
              // offer sign-in once per visit, only when it is switched on and the student is not already signed in
              if (authEnabled && auth.ready && !auth.user && !offered) {
                setAskSignIn(k);
                return;
              }
              zoomInto(k);
            }}
            onPointerEnter={() => (nudgeCancel.current = true)}
            onPointerMove={(e) => {
              if (e.pointerType !== "mouse") return;
              const r = e.currentTarget.getBoundingClientRect();
              tiltTarget.current[k] = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
            }}
            onPointerLeave={() => (tiltTarget.current[k] = 0)}
            onFocus={() => (tiltTarget.current[k] = 0.55)}
            onBlur={() => (tiltTarget.current[k] = 0)}
          >
            <span className={styles.pill}>
              Enter {k.toUpperCase()}
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
        ))}
      </nav>

      {askSignIn && (
        <div
          className={styles.offer}
          role="dialog"
          aria-modal="true"
          aria-labelledby="g2g-offer-title"
          onKeyDown={(e) => e.key === "Escape" && setAskSignIn(null)}
        >
          <div className={styles.offerCard}>
            <h2 id="g2g-offer-title">Save your progress</h2>
            <p>Sign in with Google and your answers and rank follow you to any phone or computer.</p>
            <button
              className={styles.offerPrimary}
              autoFocus
              onClick={() => {
                try {
                  sessionStorage.setItem("g2g-signin-offer", "1");
                } catch {}
                void signInWithGoogle();
              }}
            >
              Sign in with Google
            </button>
            <button
              className={styles.offerSkip}
              onClick={() => {
                const k = askSignIn;
                try {
                  sessionStorage.setItem("g2g-signin-offer", "1");
                } catch {}
                setAskSignIn(null);
                zoomInto(k);
              }}
            >
              Continue to {askSignIn.toUpperCase()} without signing in
            </button>
          </div>
        </div>
      )}

      <p className={styles.fine} data-on={onFinale || undefined}>
        Independent student project. Not affiliated with DECA Inc. or FBLA.
      </p>



      <ol className={styles.rail} aria-label="Chapters">
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              onClick={() => go(i)}
              aria-label={c.label}
              aria-current={index === i ? "step" : undefined}
              data-waiting={(waiting && index === i) || undefined}
            />
          </li>
        ))}
      </ol>

      <p className={styles.sr} aria-live="polite">
        {active >= 0 ? CHAPTERS[active].label : ""}
      </p>
      {missing && <p className={styles.sr}>The animation could not load. Use the DECA and FBLA links to continue.</p>}
    </div>
  );
}

function Copy({ id, set, on, children }: { id: ChapterId; set: SetName; on: boolean; children: React.ReactNode }) {
  const z = ZONES[id][set];
  return (
    <section
      className={styles.copy}
      style={zoneVars(id, set)}
      data-on={on || undefined}
      data-align={z.align}
      data-v={z.v}
      data-zone={id}
      aria-hidden={!on || undefined}
      inert={!on}
    >
      {children}
    </section>
  );
}
