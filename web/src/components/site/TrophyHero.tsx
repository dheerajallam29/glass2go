"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";
import styles from "./TrophyHero.module.css";

const COUNT = 9;

/** The track's trophy, rendered with a transparent background, swaying slowly and following the pointer. */
export default function TrophyHero({ track }: { track: "deca" | "fbla" }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const imgs: HTMLImageElement[] = [];
    let loaded = 0;
    let dead = false;
    let raf = 0;
    let target = 0;
    let angle = 0;
    let hovering = false;
    let t0 = performance.now();
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = wrap.clientWidth;
      h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    for (let i = 0; i < COUNT; i++) {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        loaded++;
        if (loaded === COUNT) wrap.dataset.ready = "1";
      };
      im.src = asset(`/hero/${track}_${i}.webp`);
      imgs.push(im);
    }

    const draw = (now: number) => {
      if (dead) return;
      if (loaded === COUNT) {
        const idle = reduced ? 0 : Math.sin((now - t0) / 2600) * 0.55;
        const goal = hovering ? target : idle;
        angle += (goal - angle) * 0.07;
        const f = ((Math.max(-1, Math.min(1, angle)) + 1) / 2) * (COUNT - 1);
        const i0 = Math.floor(f), i1 = Math.min(COUNT - 1, i0 + 1), m = f - i0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const a = imgs[i0];
        const scale = Math.min(w / a.naturalWidth, (h * 0.86) / a.naturalHeight);
        const dw = a.naturalWidth * scale, dh = a.naturalHeight * scale;
        const dx = (w - dw) / 2, dy = h * 0.02;

        // reflection on an invisible floor
        ctx.save();
        ctx.translate(0, dy + dh * 2 - dh * 0.1);
        ctx.scale(1, -1);
        ctx.globalAlpha = 0.22;
        ctx.drawImage(a, dx, 0, dw, dh);
        if (m > 0.01) {
          ctx.globalAlpha = 0.22 * m;
          ctx.drawImage(imgs[i1], dx, 0, dw, dh);
        }
        ctx.restore();
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        const fade = ctx.createLinearGradient(0, dy + dh * 0.9, 0, dy + dh * 1.28);
        fade.addColorStop(0, "rgba(0,0,0,0)");
        fade.addColorStop(1, "rgba(0,0,0,1)");
        ctx.fillStyle = fade;
        ctx.fillRect(0, dy + dh * 0.9, w, h);
        ctx.restore();

        ctx.globalAlpha = 1;
        ctx.drawImage(a, dx, dy, dw, dh);
        if (m > 0.01) {
          ctx.globalAlpha = m;
          ctx.drawImage(imgs[i1], dx, dy, dw, dh);
          ctx.globalAlpha = 1;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect();
      target = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2.4));
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
      t0 = performance.now() - Math.asin(Math.max(-1, Math.min(1, angle / 0.55))) * 2600;
    };
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [track]);

  return (
    <div ref={wrapRef} className={styles.wrap} data-track={track} aria-hidden="true">
      <div className={styles.halo} />
      <div className={styles.spot} />
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
