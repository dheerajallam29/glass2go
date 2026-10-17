"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./GlassTile.module.css";

/** A frosted-glass link tile. A light follows the pointer across it and it tilts a few degrees toward the cursor. */
export default function GlassTile({ href, icon, title, sub, cta = "Practise", index = 0 }: { href: string; icon: ReactNode; title: string; sub?: string; cta?: string; index?: number }) {
  return (
    <Link
      href={href}
      className={styles.tile}
      style={{ "--i": index } as React.CSSProperties}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        el.style.setProperty("--rx", `${(0.5 - py) * 7}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.setProperty("--rx", "0deg");
        e.currentTarget.style.setProperty("--ry", "0deg");
      }}
    >
      <span className={styles.icon}>{icon}</span>
      <span className={styles.body}>
        <span className={styles.title}>{title}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </span>
      <span className={styles.cta}>
        {cta}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path d="M3 8h9M8.5 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </Link>
  );
}
