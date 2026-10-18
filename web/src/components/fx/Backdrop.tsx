"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Shard = {
  x: number; y: number; z: number; // z: depth, 0.2 (far) to 1 (near)
  pts: [number, number][];         // an irregular, elongated outline in a unit box
  facets: [number, number, number, number][];
  rot: number; vr: number;
  flip: number; vflip: number;    // tumbling about its own axis: the shard turns edge-on and back
  drift: number; phase: number; hue: number; size: number;
};
type Mote = { x: number; y: number; z: number; s: number; ph: number };

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** A broken-glass outline: 4 to 6 points, long and thin, with a sharp tip. */
function makeShard(): Pick<Shard, "pts" | "facets"> {
  const n = 4 + Math.floor(Math.random() * 3);
  const len = rnd(0.9, 1.5), wid = rnd(0.28, 0.6);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(-0.35, 0.35);
    const rad = rnd(0.6, 1.0);
    pts.push([Math.cos(a) * wid * rad, Math.sin(a) * len * rad * (Math.sin(a) > 0 ? 1 : rnd(0.55, 1))]);
  }
  pts.sort((p, q) => Math.atan2(p[1], p[0]) - Math.atan2(q[1], q[0]));
  const facets: [number, number, number, number][] = [];
  const k = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < k; i++) {
    const a = pts[Math.floor(Math.random() * n)], b = pts[Math.floor(Math.random() * n)];
    if (a !== b) facets.push([a[0], a[1], b[0] * 0.5, b[1] * 0.5]);
  }
  return { pts, facets };
}

/** Floating glass shards and light motes behind every page except the homepage film. They tumble, catch the light, drift
 *  with the pointer and with scroll, and the page behind them shifts from blue to black as you scroll. */
export default function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const path = usePathname();
  const off = path === "/";

  useEffect(() => {
    if (off) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, dpr = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    let scrollY = 0, smoothScroll = 0;
    let raf = 0;
    let shards: Shard[] = [];
    let motes: Mote[] = [];
    const blurOK = typeof ctx.filter === "string";

    const seed = () => {
      const n = Math.max(10, Math.min(24, Math.round((w * h) / 100000)));
      shards = Array.from({ length: n }, () => ({
        x: Math.random(), y: Math.random(), z: rnd(0.2, 1),
        ...makeShard(),
        rot: rnd(0, 6.28), vr: rnd(-0.18, 0.18),
        flip: rnd(0, 6.28), vflip: rnd(0.15, 0.5) * (Math.random() < 0.5 ? -1 : 1),
        drift: rnd(6, 16), phase: rnd(0, 6.28), hue: rnd(206, 226), size: rnd(46, 130),
      }));
      motes = Array.from({ length: n * 3 }, () => ({ x: Math.random(), y: Math.random(), z: rnd(0.2, 1), s: rnd(0.8, 2.2), ph: rnd(0, 6.28) }));
    };
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = innerWidth;
      h = innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      seed();
    };
    resize();
    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / w - 0.5;
      mouse.ty = e.clientY / h - 0.5;
    };
    const onScroll = () => {
      scrollY = window.scrollY;
    };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const wrap = (v: number, m: number) => ((v % m) + m) % m;

    const drawShard = (s: Shard, time: number) => {
      const px = wrap(s.x * w - mouse.x * 90 * s.z + Math.sin(time * 0.2 + s.phase) * s.drift, w + 220) - 110;
      const py = wrap(s.y * h - smoothScroll * 0.16 * s.z + Math.cos(time * 0.17 + s.phase) * s.drift, h + 220) - 110;
      const sc = s.size * s.z;
      const turn = Math.cos(s.flip + time * s.vflip);               // 1 face-on, 0 edge-on
      const sx = (0.18 + 0.82 * Math.abs(turn)) * sc;
      const sy = sc;
      const light = 0.5 + 0.5 * turn * Math.sin(s.rot + time * s.vr);  // how squarely it catches the light
      // depth of field: far and very near shards are soft, the middle ones are sharp
      const soft = Math.abs(s.z - 0.62) * 5.2;
      if (blurOK) ctx.filter = soft > 0.6 ? `blur(${soft.toFixed(1)}px)` : "none";
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(s.rot + time * s.vr + mouse.x * 0.4 * s.z);
      ctx.scale(sx, sy);
      ctx.beginPath();
      s.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      const g = ctx.createLinearGradient(-0.6, -1, 0.6, 1);
      g.addColorStop(0, `hsla(${s.hue}, 100%, 88%, ${0.22 * s.z + 0.12 * light})`);
      g.addColorStop(0.45, `hsla(${s.hue}, 90%, 58%, ${0.05 + 0.04 * s.z})`);
      g.addColorStop(1, `hsla(${s.hue + 14}, 100%, 74%, ${0.2 * s.z + 0.1 * light})`);
      ctx.fillStyle = g;
      ctx.fill();
      // sharp fracture edges, with a hot specular line on the side facing the light
      ctx.lineWidth = 1 / Math.max(sx, sy);
      ctx.strokeStyle = `hsla(${s.hue}, 100%, 90%, ${0.28 * s.z})`;
      ctx.stroke();
      ctx.strokeStyle = `hsla(${s.hue - 8}, 100%, 97%, ${(0.2 + 0.55 * light) * s.z})`;
      ctx.lineWidth = 1.6 / Math.max(sx, sy);
      ctx.beginPath();
      ctx.moveTo(s.pts[0][0], s.pts[0][1]);
      ctx.lineTo(s.pts[1][0], s.pts[1][1]);
      ctx.stroke();
      // internal crack facets
      ctx.strokeStyle = `hsla(${s.hue}, 100%, 90%, ${0.12 * s.z})`;
      ctx.lineWidth = 0.7 / Math.max(sx, sy);
      for (const [a, b, c, d] of s.facets) {
        ctx.beginPath();
        ctx.moveTo(a, b);
        ctx.lineTo(c, d);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawFrame = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.045;
      mouse.y += (mouse.ty - mouse.y) * 0.045;
      smoothScroll += (scrollY - smoothScroll) * 0.07;
      const time = reduced ? 0 : t / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (blurOK) ctx.filter = "none";
      ctx.clearRect(0, 0, w, h);

      // blue at the top of the page, fading to black the further down you read
      const doc = Math.max(1, document.documentElement.scrollHeight - h);
      const frac = Math.min(1, smoothScroll / doc);
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, `rgba(24, 56, 150, ${0.34 * (1 - frac) + 0.05})`);
      bg.addColorStop(0.55, `rgba(10, 24, 80, ${0.2 * (1 - frac) + 0.03})`);
      bg.addColorStop(1, "rgba(2, 3, 8, 0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const ax = w * (0.78 - mouse.x * 0.1), ay = h * (0.08 - mouse.y * 0.06);
      const lg = ctx.createRadialGradient(ax, ay, 0, ax, ay, Math.max(w, h) * 0.6);
      lg.addColorStop(0, `rgba(59, 116, 255, ${0.14 * (1 - frac * 0.6)})`);
      lg.addColorStop(1, "rgba(59, 116, 255, 0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);

      for (const m of motes) {
        const px = wrap(m.x * w - mouse.x * 40 * m.z + Math.sin(time * 0.3 + m.ph) * 8, w);
        const py = wrap(m.y * h - smoothScroll * 0.06 * m.z - time * 6 * m.z, h);
        ctx.fillStyle = `rgba(150, 185, 255, ${0.16 + 0.28 * m.z * (0.6 + 0.4 * Math.sin(time * 1.4 + m.ph))})`;
        ctx.beginPath();
        ctx.arc(px, py, m.s * m.z, 0, 6.28);
        ctx.fill();
      }

      // far shards first so near ones overlap them
      for (const s of [...shards].sort((a, b) => a.z - b.z)) drawShard(s, time);
      if (blurOK) ctx.filter = "none";
      if (!reduced) raf = requestAnimationFrame(drawFrame);
    };
    raf = requestAnimationFrame(drawFrame);
    const vis = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else if (!raf && !reduced) raf = requestAnimationFrame(drawFrame);
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, [off]);

  if (off) return null;
  return <canvas ref={ref} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}
