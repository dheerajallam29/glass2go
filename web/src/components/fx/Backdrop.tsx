"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

type Shard = { x: number; y: number; z: number; size: number; rot: number; vr: number; drift: number; phase: number; hue: number; sides: number };
type Mote = { x: number; y: number; z: number; s: number; ph: number };

/** Slow floating glass shards and light motes behind every page except the homepage film. Reacts to the pointer and to scroll. */
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

    const seed = () => {
      const nShards = Math.max(9, Math.min(26, Math.round((w * h) / 90000)));
      shards = Array.from({ length: nShards }, () => ({
        x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8,
        size: 16 + Math.random() * 54, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.25,
        drift: 6 + Math.random() * 14, phase: Math.random() * 6.28,
        hue: 212 + Math.random() * 22, sides: Math.random() < 0.5 ? 3 : 4,
      }));
      motes = Array.from({ length: nShards * 3 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, s: 0.8 + Math.random() * 1.8, ph: Math.random() * 6.28 }));
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

    const drawFrame = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      smoothScroll += (scrollY - smoothScroll) * 0.08;
      const time = reduced ? 0 : t / 1000;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // soft blue light pools that slide with the pointer
      const ax = w * (0.78 - mouse.x * 0.1), ay = h * (0.08 - mouse.y * 0.06);
      const lg = ctx.createRadialGradient(ax, ay, 0, ax, ay, Math.max(w, h) * 0.6);
      lg.addColorStop(0, "rgba(59,116,255,0.16)");
      lg.addColorStop(1, "rgba(59,116,255,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, w, h);
      const bx = w * (0.1 - mouse.x * 0.08), by = h * (0.95 - mouse.y * 0.05);
      const lg2 = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(w, h) * 0.5);
      lg2.addColorStop(0, "rgba(90,70,255,0.10)");
      lg2.addColorStop(1, "rgba(90,70,255,0)");
      ctx.fillStyle = lg2;
      ctx.fillRect(0, 0, w, h);

      for (const m of motes) {
        const px = wrap(m.x * w - mouse.x * 40 * m.z + Math.sin(time * 0.3 + m.ph) * 8, w);
        const py = wrap(m.y * h - smoothScroll * 0.06 * m.z - time * 6 * m.z, h);
        ctx.fillStyle = `rgba(150,185,255,${0.18 + 0.3 * m.z * (0.6 + 0.4 * Math.sin(time * 1.4 + m.ph))})`;
        ctx.beginPath();
        ctx.arc(px, py, m.s * m.z, 0, 6.28);
        ctx.fill();
      }

      for (const s of shards) {
        const px = wrap(s.x * w - mouse.x * 90 * s.z + Math.sin(time * 0.2 + s.phase) * s.drift, w + 160) - 80;
        const py = wrap(s.y * h - smoothScroll * 0.14 * s.z + Math.cos(time * 0.17 + s.phase) * s.drift, h + 160) - 80;
        const r = s.size * s.z;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(s.rot + time * s.vr + mouse.x * 0.5 * s.z);
        const g = ctx.createLinearGradient(-r, -r, r, r);
        g.addColorStop(0, `hsla(${s.hue},100%,80%,${0.12 * s.z})`);
        g.addColorStop(0.5, `hsla(${s.hue},95%,60%,${0.05 * s.z})`);
        g.addColorStop(1, `hsla(${s.hue + 20},100%,70%,${0.14 * s.z})`);
        ctx.fillStyle = g;
        ctx.strokeStyle = `hsla(${s.hue},100%,85%,${0.2 * s.z})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (s.sides === 3) {
          ctx.moveTo(0, -r);
          ctx.lineTo(r * 0.86, r * 0.5);
          ctx.lineTo(-r * 0.86, r * 0.5);
        } else {
          ctx.moveTo(-r * 0.55, -r);
          ctx.lineTo(r * 0.7, -r * 0.4);
          ctx.lineTo(r * 0.45, r);
          ctx.lineTo(-r * 0.8, r * 0.5);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
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
