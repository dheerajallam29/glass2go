"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { BASE_PATH } from "@/lib/asset";

const LEAVE_MS = 200;

/** A clean page-to-page transition: the current page fades and lifts away, then the next one settles in.
 *  It works on `.page-root` (see globals.css), so the floating backdrop behind it never blinks. */
export default function PageCurtain() {
  const router = useRouter();
  const path = usePathname();
  const prev = useRef(path);
  const pending = useRef(false);

  // new page: settle in
  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    pending.current = false;
    const root = document.querySelector<HTMLElement>(".page-root");
    if (!root) return;
    window.scrollTo(0, 0);
    delete root.dataset.leaving;
    root.dataset.entering = "1";
    const done = window.setTimeout(() => delete root.dataset.entering, 520);
    return () => window.clearTimeout(done);
  }, [path]);

  // in-app links: fade out, then navigate
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-no-curtain")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname) return; // same page (hash links, etc.)
      e.preventDefault();
      if (pending.current) return;
      pending.current = true;
      const rel = BASE_PATH && url.pathname.startsWith(BASE_PATH) ? url.pathname.slice(BASE_PATH.length) || "/" : url.pathname;
      document.querySelector<HTMLElement>(".page-root")?.setAttribute("data-leaving", "1");
      window.setTimeout(() => router.push(rel + url.search + url.hash), LEAVE_MS);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return null;
}
