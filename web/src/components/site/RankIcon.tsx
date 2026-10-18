import type { ReactNode } from "react";

// One icon per rank, drawn on a 24 grid. Bronze, Silver and Gold are medals on a ribbon in their own metal; Platinum is a
// shield, Diamond a cut gem, and Glass the glass trophy itself.
type Metal = { id: string; stops: [string, string, string]; ring: string };
const METALS: Record<string, Metal> = {
  Bronze: { id: "rk-bronze", stops: ["#f3c19a", "#c9783a", "#8a4a1c"], ring: "#6e3a14" },
  Silver: { id: "rk-silver", stops: ["#ffffff", "#c3cddd", "#8795ad"], ring: "#5d6c86" },
  Gold: { id: "rk-gold", stops: ["#fff0b0", "#f7b733", "#c97f08"], ring: "#8a5300" },
  Platinum: { id: "rk-plat", stops: ["#ffffff", "#d7e4f7", "#9fb5d6"], ring: "#6f86ad" },
};

const Grad = ({ m }: { m: Metal }) => (
  <linearGradient id={m.id} x1="0.1" y1="0" x2="0.9" y2="1">
    <stop offset="0" stopColor={m.stops[0]} />
    <stop offset="0.5" stopColor={m.stops[1]} />
    <stop offset="1" stopColor={m.stops[2]} />
  </linearGradient>
);

const Star = ({ cx, cy, R, r, fill }: { cx: number; cy: number; R: number; r: number; fill: string }) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} strokeLinejoin="round" />;
};

function medal(rank: "Bronze" | "Silver" | "Gold"): ReactNode {
  const m = METALS[rank];
  return (
    <>
      <defs><Grad m={m} /></defs>
      <path d="M7 1.500 12 11.500M17 1.500 12 11.500" stroke="#4a78ff" strokeWidth="3.600" strokeLinecap="round" />
      <path d="M7 1.500 12 11.500M17 1.500 12 11.500" stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="12" cy="15.500" r="7.500" fill={`url(#${m.id})`} stroke={m.ring} strokeWidth="1" />
      <circle cx="12" cy="15.500" r="5.200" fill="none" stroke={m.ring} strokeOpacity="0.55" strokeWidth="0.9" />
      <Star cx={12} cy={15.600} R={3.300} r={1.400} fill={m.ring} />
      <path d="M7.200 12.800a6 6 0 0 1 4-2.600" stroke="rgba(255,255,255,0.7)" strokeWidth="1.200" strokeLinecap="round" fill="none" />
    </>
  );
}

const RANKS: Record<string, ReactNode> = {
  Bronze: medal("Bronze"),
  Silver: medal("Silver"),
  Gold: medal("Gold"),
  Platinum: (
    <>
      <defs><Grad m={METALS.Platinum} /></defs>
      <path d="M12 1.500 20.500 5v6.500c0 5.300-3.600 9.300-8.500 11-4.900-1.700-8.500-5.700-8.500-11V5z" fill="url(#rk-plat)" stroke="#6f86ad" strokeWidth="1" strokeLinejoin="round" />
      <path d="M12 1.500 20.500 5v3.500C17.500 7.800 14.500 5 12 1.500z" fill="rgba(255,255,255,0.45)" />
      <Star cx={12} cy={12} R={5} r={2.200} fill="#5b73a3" />
    </>
  ),
  Diamond: (
    <>
      <defs>
        <linearGradient id="rk-dia" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d5f7ff" />
          <stop offset="0.5" stopColor="#5fc7ff" />
          <stop offset="1" stopColor="#2f6bff" />
        </linearGradient>
      </defs>
      <path d="M6 3.500h12l4.500 5.500L12 21.500 1.500 9z" fill="url(#rk-dia)" stroke="#1f55c9" strokeWidth="1" strokeLinejoin="round" />
      <path d="M1.500 9h21M9 3.500 7 9l5 12.500M15 3.500 17 9l-5 12.500" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.9" strokeLinejoin="round" />
      <path d="M6 3.500 7 9 12 9 9 3.500z" fill="rgba(255,255,255,0.35)" />
    </>
  ),
  Glass: (
    <>
      <defs>
        <linearGradient id="rk-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6f0ff" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="#7fa8ff" stopOpacity="0.75" />
          <stop offset="1" stopColor="#3b6bff" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect x="4" y="2" width="13" height="16" rx="1.600" fill="url(#rk-glass)" stroke="#e9f0ff" strokeWidth="1" />
      <path d="M12.500 2H17v16h-1.500C13.500 13 13 7 12.500 2z" fill="#2f5fe8" />
      <path d="M7 5.500h4M7 8.500h2.500" stroke="#fff" strokeWidth="1.300" strokeLinecap="round" />
      <rect x="2.500" y="18" width="16" height="3.600" rx="1.200" fill="#16224a" stroke="#7fa6ff" strokeWidth="1" />
      <path d="M20.500 4.500v4M18.500 6.500h4" stroke="#fff6c8" strokeWidth="1.400" strokeLinecap="round" />
    </>
  ),
};

export default function RankIcon({ rank, size = 20 }: { rank: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false" style={{ overflow: "visible", flex: "none", filter: "drop-shadow(0 1px 2px rgba(5, 12, 50, 0.6))" }}>
      {RANKS[rank] ?? RANKS.Bronze}
    </svg>
  );
}
