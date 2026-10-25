import type { ReactNode } from "react";

// One emblem per rank, drawn on a 48 grid. Bronze, Silver and Gold are scalloped medals on a ribbon (one, two and three stars);
// Platinum is a winged shield, Diamond a cut gem with sparkles, and Glass the glass trophy itself.
type Metal = { id: string; light: string; mid: string; dark: string; rim: string; deep: string };
const METALS: Record<string, Metal> = {
  Bronze: { id: "rk-bronze", light: "#ffd9b8", mid: "#d98a4a", dark: "#9a521f", rim: "#6b3510", deep: "#7a4116" },
  Silver: { id: "rk-silver", light: "#ffffff", mid: "#cfd8e6", dark: "#8c9ab3", rim: "#566581", deep: "#6b7a96" },
  Gold: { id: "rk-gold", light: "#fff6c2", mid: "#fbc531", dark: "#d08a05", rim: "#8a5600", deep: "#a86a00" },
};

const Metals = ({ m }: { m: Metal }) => (
  <defs>
    <linearGradient id={m.id} x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor={m.light} />
      <stop offset="0.45" stopColor={m.mid} />
      <stop offset="1" stopColor={m.dark} />
    </linearGradient>
    <linearGradient id={`${m.id}-in`} x1="0.85" y1="0" x2="0.15" y2="1">
      <stop offset="0" stopColor={m.dark} />
      <stop offset="0.55" stopColor={m.mid} />
      <stop offset="1" stopColor={m.light} />
    </linearGradient>
  </defs>
);

const poly = (cx: number, cy: number, n: number, R: number, r: number, rot = -Math.PI / 2) =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = rot + (i * Math.PI) / n;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`;
  }).join(" ");

const Star = ({ cx, cy, R, fill, stroke }: { cx: number; cy: number; R: number; fill: string; stroke?: string }) => (
  <polygon points={poly(cx, cy, 5, R, R * 0.42)} fill={fill} stroke={stroke} strokeWidth={stroke ? 0.6 : 0} strokeLinejoin="round" />
);

const Sparkle = ({ cx, cy, s, fill = "#ffffff" }: { cx: number; cy: number; s: number; fill?: string }) => (
  <path d={`M${cx} ${cy - s}Q${cx + s * 0.18} ${cy - s * 0.18} ${cx + s} ${cy}Q${cx + s * 0.18} ${cy + s * 0.18} ${cx} ${cy + s}Q${cx - s * 0.18} ${cy + s * 0.18} ${cx - s} ${cy}Q${cx - s * 0.18} ${cy - s * 0.18} ${cx} ${cy - s}Z`} fill={fill} />
);

// two laurel branches hugging the lower half of the medal face
const Laurel = ({ cx, cy, stroke }: { cx: number; cy: number; stroke: string }) => (
  <g fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round">
    <path d={`M${cx - 9.5} ${cy - 2}Q${cx - 11} ${cy + 6} ${cx - 3} ${cy + 10}`} />
    <path d={`M${cx + 9.5} ${cy - 2}Q${cx + 11} ${cy + 6} ${cx + 3} ${cy + 10}`} />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <path d={`M${cx - 10.2 + i * 0.9} ${cy + 0.5 + i * 3.4}l-2.6 -1.1`} />
        <path d={`M${cx + 10.2 - i * 0.9} ${cy + 0.5 + i * 3.4}l2.6 -1.1`} />
      </g>
    ))}
  </g>
);

function medal(rank: "Bronze" | "Silver" | "Gold", stars: 1 | 2 | 3): ReactNode {
  const m = METALS[rank];
  const cx = 24, cy = 30;
  return (
    <>
      <Metals m={m} />
      {/* ribbon: two crossing straps */}
      <path d="M10 2h10l9 19h-10z" fill="#2c54d8" />
      <path d="M38 2H28L19 21h10z" fill="#4a7bff" />
      <path d="M10 2h10l2 4.2L12 2z" fill="rgba(255,255,255,0.28)" />
      <path d="M20 21l9 0 -1.500 3 -9 0z" fill="rgba(5,12,50,0.28)" />
      {/* scalloped edge, then the rim and face */}
      <polygon points={poly(cx, cy, 20, 16.800, 15.200)} fill={`url(#${m.id})`} stroke={m.rim} strokeWidth="1" strokeLinejoin="round" />
      <circle cx={cx} cy={cy} r="13.300" fill={`url(#${m.id}-in)`} stroke={m.rim} strokeWidth="1" />
      <circle cx={cx} cy={cy} r="10.800" fill={`url(#${m.id})`} stroke={m.rim} strokeOpacity="0.55" strokeWidth="0.8" />
      {rank !== "Bronze" && <Laurel cx={cx} cy={cy} stroke={m.deep} />}
      {stars === 1 && <Star cx={cx} cy={cy + 0.4} R={6.200} fill={m.deep} stroke={m.rim} />}
      {stars === 2 && (
        <>
          <Star cx={cx - 3.800} cy={cy + 0.6} R={4.200} fill={m.deep} stroke={m.rim} />
          <Star cx={cx + 3.800} cy={cy + 0.6} R={4.200} fill={m.deep} stroke={m.rim} />
        </>
      )}
      {stars === 3 && (
        <>
          <Star cx={cx} cy={cy - 1.600} R={4.600} fill={m.deep} stroke={m.rim} />
          <Star cx={cx - 4.800} cy={cy + 3.200} R={3.400} fill={m.deep} stroke={m.rim} />
          <Star cx={cx + 4.800} cy={cy + 3.200} R={3.400} fill={m.deep} stroke={m.rim} />
        </>
      )}
      {/* light catching the upper left of the medal */}
      <path d={`M${cx - 12} ${cy - 3.500}A12.500 12.500 0 0 1 ${cx - 2.500} ${cy - 12.200}`} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.800" strokeLinecap="round" />
      <Sparkle cx={cx + 12.500} cy={cy - 11} s={rank === "Gold" ? 3.600 : 2.600} fill="rgba(255,255,255,0.95)" />
    </>
  );
}

const RANKS: Record<string, ReactNode> = {
  Bronze: medal("Bronze", 1),
  Silver: medal("Silver", 2),
  Gold: medal("Gold", 3),
  Platinum: (
    <>
      <defs>
        <linearGradient id="rk-plat" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#d6e3f8" />
          <stop offset="1" stopColor="#8fa7cf" />
        </linearGradient>
        <linearGradient id="rk-plat-in" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5c78b4" />
          <stop offset="1" stopColor="#2f4a86" />
        </linearGradient>
      </defs>
      {/* wings */}
      <path d="M8 14C3 14 1 19 2 24c3-2 6-2.500 8-2.200C8.500 20 8.200 17 8 14z" fill="url(#rk-plat)" stroke="#6f86ad" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M40 14c5 0 7 5 6 10-3-2-6-2.500-8-2.200C39.500 20 39.800 17 40 14z" fill="url(#rk-plat)" stroke="#6f86ad" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M3 24c2.500-0.800 5-1 7-0.600M45 24c-2.500-0.800-5-1-7-0.600" stroke="#8fa7cf" strokeWidth="0.9" strokeLinecap="round" fill="none" />
      {/* shield */}
      <path d="M24 2 39 8v15c0 10-6.500 17.500-15 21.500C15.500 40.500 9 33 9 23V8z" fill="url(#rk-plat)" stroke="#6f86ad" strokeWidth="1.200" strokeLinejoin="round" />
      <path d="M24 6.200 35.500 10.800V23c0 7.800-4.800 13.600-11.500 17.200C17.300 36.600 12.500 30.800 12.500 23V10.800z" fill="url(#rk-plat-in)" stroke="#e9f0ff" strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M17 20.500l7-4.500 7 4.500M17 26.500l7-4.500 7 4.500" fill="none" stroke="#f2f7ff" strokeWidth="2.200" strokeLinecap="round" strokeLinejoin="round" />
      <Star cx={24} cy={12.800} R={2.600} fill="#fff6c8" />
      <path d="M24 2 39 8v6C34 12.500 28 9 24 2z" fill="rgba(255,255,255,0.5)" />
      <Sparkle cx={40} cy={36} s={3} />
    </>
  ),
  Diamond: (
    <>
      <defs>
        <linearGradient id="rk-dia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4fbff" />
          <stop offset="0.5" stopColor="#62cbff" />
          <stop offset="1" stopColor="#2e62ff" />
        </linearGradient>
        <linearGradient id="rk-dia-d" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4fb6ff" />
          <stop offset="1" stopColor="#1f45c9" />
        </linearGradient>
        <linearGradient id="rk-dia-l" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2fdff" />
          <stop offset="1" stopColor="#8fdcff" />
        </linearGradient>
      </defs>
      <path d="M13 8h22l11 12L24 43 2 20z" fill="url(#rk-dia)" stroke="#1f55c9" strokeWidth="1.200" strokeLinejoin="round" />
      {/* crown facets */}
      <path d="M13 8l-4 12h12zM35 8l4 12H27zM21 20h6L24 8z" fill="url(#rk-dia-l)" opacity="0.9" />
      <path d="M13 8l8 12M35 8l-8 12M24 8v0M21 20 24 43M27 20 24 43" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="0.9" strokeLinejoin="round" />
      {/* pavilion facets */}
      <path d="M2 20h20.500L24 43zM46 20H25.500L24 43z" fill="url(#rk-dia-d)" opacity="0.55" />
      <path d="M2 20h44" stroke="rgba(255,255,255,0.85)" strokeWidth="1" />
      <Sparkle cx={39} cy={8} s={4.200} />
      <Sparkle cx={8} cy={31} s={2.600} fill="rgba(255,255,255,0.9)" />
      <Sparkle cx={31} cy={30} s={1.800} fill="rgba(255,255,255,0.75)" />
    </>
  ),
  Glass: (
    <>
      <defs>
        <linearGradient id="rk-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2f7ff" stopOpacity="0.98" />
          <stop offset="0.5" stopColor="#8fb2ff" stopOpacity="0.82" />
          <stop offset="1" stopColor="#3b6bff" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="rk-fin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6f9bff" />
          <stop offset="1" stopColor="#1f45c9" />
        </linearGradient>
        <linearGradient id="rk-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26356e" />
          <stop offset="1" stopColor="#0b1230" />
        </linearGradient>
        <radialGradient id="rk-halo" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7fa6ff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#7fa6ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="27" rx="23" ry="22" fill="url(#rk-halo)" />
      {/* the glass slab with a blue fin down its right edge */}
      <path d="M11 4h25l1.500 31H9.500z" fill="url(#rk-glass)" stroke="#eaf1ff" strokeWidth="1.200" strokeLinejoin="round" />
      <path d="M30 4h6l1.500 31h-4.200C31.500 24 30.700 13 30 4z" fill="url(#rk-fin)" />
      <path d="M14.500 8.500 24 7.500 12.500 24z" fill="rgba(255,255,255,0.55)" />
      <path d="M15 14h9M15 19h6.500" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.95" />
      <circle cx="31.500" cy="29" r="3.200" fill="#dbe7ff" stroke="#6f93ff" strokeWidth="1" />
      <path d="M30.200 29h2.600M31.500 27.700v2.600" stroke="#2f5fe8" strokeWidth="1" strokeLinecap="round" />
      {/* base */}
      <rect x="7" y="35" width="34" height="5" rx="1.600" fill="url(#rk-base)" stroke="#8fb0ff" strokeWidth="1" />
      <rect x="4" y="40" width="40" height="4.500" rx="1.600" fill="url(#rk-base)" stroke="#6f93ff" strokeWidth="1" />
      <path d="M9 37.500h30" stroke="rgba(255,255,255,0.35)" strokeWidth="0.8" strokeLinecap="round" />
      <Sparkle cx={41} cy={9} s={4.500} fill="#fff6c8" />
      <Sparkle cx={6} cy={18} s={2.400} fill="#ffffff" />
    </>
  ),
};

export default function RankIcon({ rank, size = 20 }: { rank: string; size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible", flex: "none", filter: "drop-shadow(0 1.500px 2.500px rgba(5, 12, 50, 0.65))" }}>
      {RANKS[rank] ?? RANKS.Bronze}
    </svg>
  );
}
