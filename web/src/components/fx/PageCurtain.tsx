"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BASE_PATH } from "@/lib/asset";
import styles from "./PageCurtain.module.css";

type Mode = "off" | "cover" | "hold" | "reveal" | "zoomreveal";
export const ZOOM_KEY = "g2g-zoom";

/** Every in-app link wipes a glass curtain across the screen, then lifts it on the new page.
 *  Links that already played their own zoom (the homepage trophies) set a session flag, and the curtain lifts as if coming out of the glass. */
export default function PageCurtain() {
  const router = useRouter();
  const path = usePathname();
  const [mode, setMode] = useState<Mode>("off");
  const [tone, setTone] = useState<"deca" | "fbla" | "neutral">("neutral");
  const prev = useRef(path);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    let zoom: string | null = null;
    try {
      zoom = sessionStorage.getItem(ZOOM_KEY);
      sessionStorage.removeItem(ZOOM_KEY);
    } catch {}
    window.scrollTo(0, 0);
    setTone(zoom === "deca" || zoom === "fbla" ? zoom : "neutral");
    setMode(zoom ? "zoomreveal" : "reveal");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMode("off"), zoom ? 1300 : 560);
  }, [path]);

  // a page that ran its own transition asks for the curtain to be fully closed before it navigates, so there is no bare frame in between
  useEffect(() => {
    const onHold = (e: Event) => {
      const t = (e as CustomEvent<string>).detail;
      setTone(t === "fbla" ? "fbla" : "deca");
      setMode("hold");
    };
    window.addEventListener("g2g-curtain-hold", onHold);
    return () => window.removeEventListener("g2g-curtain-hold", onHold);
  }, []);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-no-curtain")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page (hash links, etc.)
      const rel = BASE_PATH && url.pathname.startsWith(BASE_PATH) ? url.pathname.slice(BASE_PATH.length) || "/" : url.pathname;
      e.preventDefault();
      setTone(rel.startsWith("/fbla") ? "fbla" : rel.startsWith("/deca") ? "deca" : "neutral");
      setMode("cover");
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => router.push(rel + url.search + url.hash), 260);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return <div className={styles.curtain} data-mode={mode} data-tone={tone} aria-hidden="true" />;
}
