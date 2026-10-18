import type { ReactNode } from "react";

// Event icons: flat vector art on a 48 grid. Every icon uses the same four fills (blue glass, deep blue, white, gold) with a light
// edge, so the set reads as one family. The gradients are defined once per SVG, so each icon stands alone.
const EDGE = { stroke: "rgba(255,255,255,0.42)", strokeWidth: 1 } as const;
const BLUE = { fill: "url(#xi-b)", ...EDGE } as const;
const DEEP = { fill: "url(#xi-d)", ...EDGE } as const;
const GOLD = { fill: "url(#xi-g)", stroke: "rgba(255,240,200,0.6)", strokeWidth: 0.8 } as const;
const WHITE = { fill: "url(#xi-w)" } as const;
const LINE = { fill: "none", stroke: "#eaf1ff", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const Star = ({ cx, cy, R, r }: { cx: number; cy: number; R: number; r: number }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} {...GOLD} strokeLinejoin="round" />;
};

const ICONS: Record<string, ReactNode> = {
  // ---- DECA
  core: (
    <>
      <path d="M17 17v-3.5A3.500 3.500 0 0 1 20.500 10h7a3.500 3.500 0 0 1 3.500 3.500V17" {...LINE} strokeWidth={3} />
      <rect x="5" y="16" width="38" height="25" rx="6" {...BLUE} />
      <path d="M5 27h38v-5a6 6 0 0 0-6-6H11a6 6 0 0 0-6 6z" fill="rgba(255,255,255,0.14)" />
      <rect x="5" y="26.500" width="38" height="3.200" fill="url(#xi-d)" />
      <rect x="19.500" y="24" width="9" height="8.500" rx="2.500" {...GOLD} />
      <circle cx="24" cy="28.200" r="1.300" fill="#9a5b00" />
    </>
  ),
  bma: (
    <>
      <path d="M24 17v7M13 31v-7h22v7" {...LINE} />
      <rect x="15" y="5" width="18" height="12" rx="3.500" {...DEEP} />
      <circle cx="24" cy="11" r="2.800" {...GOLD} />
      <rect x="4" y="31" width="18" height="12" rx="3.500" {...BLUE} />
      <rect x="26" y="31" width="18" height="12" rx="3.500" {...BLUE} />
      <path d="M8.500 37h9M30.500 37h9" stroke="#eaf1ff" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  finance: (
    <>
      <rect x="5" y="29" width="9" height="12" rx="2.500" {...BLUE} />
      <rect x="19.500" y="21" width="9" height="20" rx="2.500" {...BLUE} />
      <rect x="34" y="13" width="9" height="28" rx="2.500" {...DEEP} />
      <path d="M3.500 42.500h41" {...LINE} strokeWidth={2.200} />
      <circle cx="38.500" cy="7" r="5" {...GOLD} />
      <text x="38.500" y="10.300" fontSize="8.500" fontWeight="800" textAnchor="middle" fill="#8a4f00" style={{ fontFamily: "system-ui, sans-serif" }}>$</text>
    </>
  ),
  hospitality: (
    <>
      <circle cx="24" cy="10.500" r="3.200" {...GOLD} />
      <rect x="22.500" y="12" width="3" height="5" rx="1" fill="url(#xi-w)" />
      <path d="M7 34a17 17 0 0 1 34 0z" {...BLUE} />
      <path d="M12 30a12.500 12.500 0 0 1 9-9.500" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.400" strokeLinecap="round" />
      <rect x="4" y="34" width="40" height="6" rx="3" {...DEEP} />
      <rect x="8" y="40" width="32" height="2.500" rx="1.250" fill="url(#xi-g)" />
    </>
  ),
  marketing: (
    <>
      <path d="M39 21a8 8 0 0 1 0 8M43 17a14 14 0 0 1 0 16" fill="none" stroke="#eaf1ff" strokeWidth="2.600" strokeLinecap="round" opacity="0.9" />
      <path d="M13 31v7a3 3 0 0 0 3 3h3a3 3 0 0 0 3-3v-4" {...DEEP} />
      <path d="M13 17.500 31 8v34L13 32.500z" {...BLUE} strokeLinejoin="round" />
      <rect x="4" y="17" width="11" height="16" rx="4.500" {...DEEP} />
      <rect x="29" y="7" width="5" height="36" rx="2.500" {...GOLD} />
    </>
  ),
  entrepreneurship: (
    <>
      <path d="M24 2.500v3M10.500 8l2 2M37.500 8l-2 2M4 21h3M41 21h3" {...LINE} strokeWidth={2.200} />
      <path d="M24 8c-7.200 0-12.500 5.400-12.500 12 0 4.200 2 7.200 4.600 9.600 1.200 1.100 1.900 2.400 1.900 4.400h12c0-2 .7-3.300 1.900-4.400 2.600-2.400 4.600-5.400 4.600-9.600C36.500 13.400 31.200 8 24 8z" {...BLUE} />
      <path d="M18 14.500c1.500-2.200 3.600-3.300 6-3.300" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.200" strokeLinecap="round" />
      <path d="M19.500 21.500 24 27l4.500-5.500" fill="none" stroke="url(#xi-g)" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="17.500" y="35.500" width="13" height="3.600" rx="1.800" {...WHITE} />
      <rect x="19.500" y="40" width="9" height="3.600" rx="1.800" {...DEEP} />
    </>
  ),
  pfl: (
    <>
      <circle cx="24" cy="24" r="20" {...GOLD} />
      <circle cx="24" cy="24" r="15.500" fill="none" stroke="rgba(154,91,0,0.55)" strokeWidth="1.800" />
      <path d="M13 17a15 15 0 0 1 12-8" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.200" strokeLinecap="round" />
      <path d="M28.500 19.500c-.8-2-2.700-3-4.700-3-2.700 0-4.700 1.500-4.700 3.600 0 5.300 9.700 2.300 9.700 7.700 0 2.200-2.200 3.800-5 3.800-2.500 0-4.400-1.100-5.200-3M24 12.500v4M24 31v4" fill="none" stroke="#8a4f00" strokeWidth="2.600" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // ---- FBLA
  accounting: (
    <>
      <rect x="8" y="3.500" width="32" height="41" rx="7" {...BLUE} />
      <rect x="13" y="8.500" width="22" height="10.500" rx="3" fill="#0b1a4c" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <path d="M17 14.500h5M26 14.500h6" stroke="#8fe3ff" strokeWidth="2.200" strokeLinecap="round" />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <circle key={`${r}${c}`} cx={17 + c * 7} cy={26 + r * 7} r="2.700" {...(c === 2 && r > 0 ? GOLD : WHITE)} />
        )),
      )}
    </>
  ),
  "business-law": (
    <>
      <path d="M9 12 3 26M9 12l6 14M39 12l-6 14M39 12l6 14" stroke="#eaf1ff" strokeWidth="1.600" strokeLinecap="round" fill="none" />
      <path d="M2 26h14c0 5.500-3 8.500-7 8.500S2 31.500 2 26z" {...BLUE} />
      <path d="M32 26h14c0 5.500-3 8.500-7 8.500S32 31.500 32 26z" {...BLUE} />
      <rect x="22.500" y="9" width="3" height="29" rx="1.500" {...WHITE} />
      <rect x="6" y="9.500" width="36" height="3.600" rx="1.800" {...WHITE} />
      <circle cx="24" cy="8" r="3.400" {...GOLD} />
      <path d="M14 38.500h20l2 4.500H12z" {...DEEP} />
    </>
  ),
  economics: (
    <>
      <path d="M8 5v35.500h36" {...LINE} strokeWidth={3} />
      <path d="M12 33l9-10 7 6 12-15v22.500H12z" fill="url(#xi-b)" opacity="0.55" />
      <path d="M12 33l9-10 7 6 12-15" {...LINE} stroke="url(#xi-g)" strokeWidth={3.600} />
      <path d="M33 13.500h7.500V21" {...LINE} stroke="url(#xi-g)" strokeWidth={3.200} />
      <circle cx="21" cy="23" r="3" {...WHITE} />
      <circle cx="28" cy="29" r="3" {...WHITE} />
    </>
  ),
  "personal-finance": (
    <>
      <rect x="3" y="9" width="42" height="30" rx="6.500" {...BLUE} />
      <rect x="3" y="16.500" width="42" height="7" fill="#0b1a4c" />
      <rect x="8" y="28" width="11" height="8" rx="2.200" {...GOLD} />
      <path d="M8 32h11M13.500 28v8" stroke="rgba(154,91,0,0.5)" strokeWidth="0.900" />
      <path d="M26 32h5M34 32h5" stroke="#eaf1ff" strokeWidth="2.400" strokeLinecap="round" />
    </>
  ),
  securities: (
    <>
      <path d="M12 12v28M24 6v30M36 15v27" stroke="#eaf1ff" strokeWidth="2.200" strokeLinecap="round" />
      <rect x="7.500" y="19" width="9" height="14" rx="2.500" {...BLUE} />
      <rect x="19.500" y="11" width="9" height="17" rx="2.500" {...WHITE} />
      <rect x="31.500" y="22" width="9" height="15" rx="2.500" {...DEEP} />
      <path d="M3.500 43h41" {...LINE} strokeWidth={2.200} />
      <circle cx="24" cy="5" r="3" {...GOLD} />
    </>
  ),
  leadership: (
    <>
      <Star cx={24} cy={12} R={10} r={4.400} />
      <rect x="4" y="29" width="12.500" height="13" rx="2.500" {...BLUE} />
      <rect x="17.750" y="23" width="12.500" height="19" rx="2.500" {...DEEP} />
      <rect x="31.500" y="33" width="12.500" height="9" rx="2.500" {...BLUE} />
      <path d="M24 28.500v8M21.500 31l2.500-2.500 2.500 2.500" stroke="#eaf1ff" strokeWidth="2" strokeLinecap="round" fill="none" />
    </>
  ),
  "data-science-ai": (
    <>
      <path d="M17 4v7M24 4v7M31 4v7M17 37v7M24 37v7M31 37v7M4 17h7M4 24h7M4 31h7M37 17h7M37 24h7M37 31h7" {...LINE} strokeWidth={2.800} />
      <rect x="10" y="10" width="28" height="28" rx="6" {...BLUE} />
      <rect x="16" y="16" width="16" height="16" rx="3.500" fill="#0b1a4c" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
      <path d="M19.500 28v-6l2.500-3 2.500 3v6M19.500 25.500h5M28 19v9" stroke="#8fe3ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="34" cy="14" r="2" {...GOLD} />
    </>
  ),
  "healthcare-administration": (
    <>
      <path d="M24 4.500 40 10v11.500c0 10.500-6.500 17.500-16 22-9.500-4.500-16-11.500-16-22V10z" {...BLUE} strokeLinejoin="round" />
      <path d="M24 4.500 40 10v6C33 14 28 10 24 4.500z" fill="rgba(255,255,255,0.16)" />
      <rect x="20.500" y="13.500" width="7" height="20" rx="2.200" {...WHITE} />
      <rect x="14" y="20" width="20" height="7" rx="2.200" {...WHITE} />
    </>
  ),
  "intro-business": (
    <>
      <path d="M11 23v9c0 4.200 5.800 7.500 13 7.500S37 36.200 37 32v-9l-13 6z" {...BLUE} strokeLinejoin="round" />
      <path d="M24 7 45 18 24 29 3 18z" {...DEEP} strokeLinejoin="round" />
      <path d="M24 7 45 18 24 18z" fill="rgba(255,255,255,0.14)" />
      <path d="M41 19.500v13" stroke="url(#xi-g)" strokeWidth="2.200" strokeLinecap="round" />
      <circle cx="41" cy="35" r="3" {...GOLD} />
    </>
  ),
};

export default function ExamIcon({ slug, size = 30 }: { slug: string; size?: number }) {
  const s = Math.round(size * 1.5);
  return (
    <svg viewBox="0 0 48 48" width={s} height={s} aria-hidden="true" focusable="false" style={{ overflow: "visible", filter: "drop-shadow(0 3px 4px rgba(10, 25, 90, 0.5))" }}>
      <defs>
        <linearGradient id="xi-b" x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#b4cdff" />
          <stop offset="0.45" stopColor="#5f8dfa" />
          <stop offset="1" stopColor="#2a4fd0" />
        </linearGradient>
        <linearGradient id="xi-d" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#6f9bff" />
          <stop offset="1" stopColor="#1c3bb0" />
        </linearGradient>
        <linearGradient id="xi-w" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9dbff" />
        </linearGradient>
        <linearGradient id="xi-g" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#ffe9a3" />
          <stop offset="0.55" stopColor="#f7b733" />
          <stop offset="1" stopColor="#d98a0b" />
        </linearGradient>
      </defs>
      {ICONS[slug] ?? ICONS.core}
    </svg>
  );
}
