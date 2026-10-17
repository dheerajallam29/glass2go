"use client";

import { useEffect, useRef } from "react";
import type { FxDetail } from "./fx";

type P = {
  x: number; y: number; vx: number; vy: number; life: number; max: number;
  size: number; hue: number; rot: number; vr: number; kind: "spark" | "shard" | "ring";
};

/** A full-screen, click-through canvas that draws short-lived bursts: sparkles, glass shards, and ripples. */
export default function FxLayer() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dpr = 1;
    const parts: P[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);

    const spawn = (d: FxDetail) => {
      const hue = d.hue ?? 215;
      const power = d.power ?? 1;
      if (d.kind === "ripple") {
        for (let i = 0; i < 2; i++) parts.push({ x: d.x, y: d.y, vx: 0, vy: 0, life: 0, max: 0.7 + i * 0.18, size: 12 + i * 10, hue, rot: 0, vr: 0, kind: "ring" });
        return;
      }
      if (d.kind === "sparkle") {
        const n = Math.round(14 * power);
        for (let i = 0; i < n; i++) {
          const a = rnd(0, Math.PI * 2), s = rnd(60, 260) * power;
          parts.push({ x: d.x, y: d.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0, max: rnd(0.5, 0.95), size: rnd(1.6, 4.2), hue: hue + rnd(-14, 14), rot: 0, vr: 0, kind: "spark" });
        }
        return;
      }
      // shatter: glass shards thrown out and falling
      const n = Math.round(46 * power);
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2), s = rnd(120, 640) * power;
        parts.push({ x: d.x, y: d.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 260, life: 0, max: rnd(1.1, 2.1), size: rnd(5, 17), hue: hue + rnd(-30, 20), rot: rnd(0, 6.28), vr: rnd(-9, 9), kind: "shard" });
      }
    };

    const frame = (t: number) => {
      const dt = Math.min(0.04, (t - last) / 1000 || 0.016);
      last = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life += dt;
        if (p.life >= p.max) {
          parts.splice(i, 1);
          continue;
        }
        const k = p.life / p.max;
        if (p.kind === "ring") {
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 72%, ${0.55 * (1 - k)})`;
          ctx.lineWidth = 2.2 * (1 - k) + 0.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + k * 130, 0, Math.PI * 2);
          ctx.stroke();
          continue;
        }
        p.vy += (p.kind === "shard" ? 900 : 260) * dt;
        p.vx *= 1 - 1.6 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        const a = 1 - k * k;
        if (p.kind === "spark") {
          ctx.fillStyle = `hsla(${p.hue}, 100%, ${70 + 20 * (1 - k)}%, ${a})`;
          ctx.shadowColor = `hsla(${p.hue}, 100%, 65%, ${a})`;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - k * 0.6), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          const g = ctx.createLinearGradient(-p.size, -p.size, p.size, p.size);
          g.addColorStop(0, `hsla(${p.hue}, 100%, 88%, ${0.85 * a})`);
          g.addColorStop(1, `hsla(${p.hue}, 90%, 52%, ${0.35 * a})`);
          ctx.fillStyle = g;
          ctx.strokeStyle = `hsla(${p.hue}, 100%, 92%, ${0.9 * a})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.62, p.size * 0.45);
          ctx.lineTo(-p.size * 0.5, p.size * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      }
      ctx.restore();
      raf = parts.length ? requestAnimationFrame(frame) : 0;
    };

    const onFx = (e: Event) => {
      spawn((e as CustomEvent<FxDetail>).detail);
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    window.addEventListener("g2g-fx", onFx);
    return () => {
      window.removeEventListener("g2g-fx", onFx);
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 90 }} />;
}
