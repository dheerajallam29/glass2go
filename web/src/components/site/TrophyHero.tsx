"use client";

import { useEffect, useRef } from "react";
import { asset } from "@/lib/asset";
import styles from "./TrophyHero.module.css";

const COUNT = 21; // 21 rendered angles across -28 to 28 degrees

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
    let targetY = 0;
    let angle = 0;
    let vel = 0;
    let tiltY = 0;
    let tiltVel = 0;
    let last = performance.now();
    let hovering = false;
    let t0 = performance.now();
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
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
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const idle = reduced ? 0 : Math.sin((now - t0) / 2600) * 0.55;
        const goal = hovering ? target : idle;
        // a damped spring: the trophy eases toward the pointer and settles without snapping
        const K = 30, C = 2 * Math.sqrt(K) * 1.0;
        vel += (K * (goal - angle) - C * vel) * dt;
        angle += vel * dt;
        tiltVel += (K * ((hovering ? targetY : 0) - tiltY) - C * tiltVel) * dt;
        tiltY += tiltVel * dt;
        canvas.style.transform = `perspective(1100px) rotateY(${(angle * 2).toFixed(2)}deg) rotateX(${(-tiltY * 2).toFixed(2)}deg)`;
        const f = ((Math.max(-1, Math.min(1, angle)) + 1) / 2) * (COUNT - 1);
        const i0 = Math.floor(f), i1 = Math.min(COUNT - 1, i0 + 1), m = f - i0;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        // the render already holds the stage, floor and reflections, so it is drawn whole; CSS fades its edges into the page
        const a = imgs[i0];
        const scale = Math.max(w / a.naturalWidth, h / a.naturalHeight);
        const dw = a.naturalWidth * scale, dh = a.naturalHeight * scale;
        const dx = (w - dw) / 2, dy = (h - dh) / 2;
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
      targetY = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
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
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
