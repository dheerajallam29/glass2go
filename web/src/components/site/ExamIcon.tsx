import type { ReactNode } from "react";

// Two-tone glass icons: a soft blue fill, a bright stroke, and one white accent. Drawn on a 32 grid.
const A = { fill: "none", stroke: "#e9f0ff", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const B = { fill: "rgba(80,130,255,0.38)", stroke: "#7fa6ff", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<string, ReactNode> = {
  // DECA
  core: (<><rect x="5" y="11" width="22" height="15" rx="3" {...B} /><path d="M12 11V8.5A2.5 2.5 0 0 1 14.5 6h3A2.5 2.5 0 0 1 20 8.5V11" {...A} /><path d="M5 18h22M14.5 18v2.5h3V18" {...A} /></>),
  bma: (<><circle cx="12" cy="11" r="4.2" {...B} /><path d="M4.5 26c.7-4.6 3.6-7 7.5-7s6.8 2.4 7.5 7" {...A} /><circle cx="22.5" cy="12" r="3" {...A} /><path d="M23 18.5c2.6.3 4.2 2.2 4.7 5.5" {...A} /></>),
  finance: (<><rect x="5" y="17" width="5" height="9" rx="1" {...B} /><rect x="13.5" y="11" width="5" height="15" rx="1" {...B} /><rect x="22" y="6" width="5" height="20" rx="1" {...B} /><path d="M4 28h24" {...A} /></>),
  hospitality: (<><path d="M6 27V12l10-7 10 7v15" {...B} /><path d="M12.5 27v-7h7v7M12 14h.01M16 14h.01M20 14h.01" {...A} /><path d="M4 27.5h24" {...A} /></>),
  marketing: (<><path d="M5 13v6l14 6V7L5 13z" {...B} /><path d="M19 12a4.5 4.5 0 0 1 0 8M9 20.5V26" {...A} /><path d="M24 9l2.5-2.5M25 16h3M24 23l2.5 2.5" {...A} /></>),
  entrepreneurship: (<><path d="M16 3.5v3M7.5 7l2 2M24.5 7l-2 2M4 15h3M25 15h3" {...A} /><path d="M11 20a7 7 0 1 1 10 0c-1 .9-1.7 1.8-1.7 3h-6.6c0-1.2-.7-2.100-1.700-3z" {...B} /><path d="M12.500 27h7M13.500 29.500h5" {...A} /></>),
  pfl: (<><circle cx="16" cy="16" r="11" {...B} /><path d="M19.800 12.300c-.6-1.400-1.900-2.100-3.700-2.100-2 0-3.500 1.100-3.500 2.700 0 4.100 7.300 1.800 7.300 5.800 0 1.700-1.700 2.800-3.800 2.800-1.800 0-3.200-.8-3.900-2.200M16 7.500v2.200M16 22.300v2.200" {...A} /></>),
  // FBLA
  accounting: (<><rect x="7" y="4.5" width="18" height="23" rx="3" {...B} /><rect x="10.500" y="8" width="11" height="5" rx="1" {...A} /><path d="M11.500 17.500h.01M16 17.500h.01M20.500 17.500h.01M11.500 22h.01M16 22h.01M20.500 22h.01" strokeWidth="2.400" stroke="#e9f0ff" strokeLinecap="round" /></>),
  "business-law": (<><path d="M16 5v22M9 27h14" {...A} /><path d="M6 10h20" {...A} /><path d="M6 10l-3.500 8a4.200 4.200 0 0 0 7 0L6 10zM26 10l-3.500 8a4.200 4.200 0 0 0 7 0L26 10z" {...B} /></>),
  economics: (<><path d="M5 5v22h22" {...A} /><path d="M9 21l5-6 4 3.500 7-9" {...A} /><path d="M9 21l5-6 4 3.500 7-9V21H9z" fill="rgba(80,130,255,0.28)" stroke="none" /><circle cx="25" cy="9.500" r="1.800" fill="#e9f0ff" /></>),
  "personal-finance": (<><rect x="4" y="8" width="24" height="16" rx="3.500" {...B} /><circle cx="16" cy="16" r="3.600" {...A} /><path d="M8.500 12h.01M23.500 20h.01" strokeWidth="2.400" stroke="#e9f0ff" strokeLinecap="round" /></>),
  securities: (<><path d="M4 24l7-8 5 4.500L27 8" {...A} /><path d="M20 8h7v7" {...A} /><path d="M4 24l7-8 5 4.500L27 8v18H4z" fill="rgba(80,130,255,0.3)" stroke="none" /><path d="M4 28h24" {...A} /></>),
  leadership: (<><circle cx="16" cy="11" r="4.500" {...B} /><path d="M7 27c.6-5.200 3.700-8 9-8s8.400 2.800 9 8" {...A} /><path d="M16 4.500v-1M9.500 6.500l-.8-.8M22.500 6.500l.8-.8" {...A} /></>),
  "data-science-ai": (<><rect x="9" y="9" width="14" height="14" rx="3" {...B} /><path d="M13 14v4M16 12.500v7M19 15v2.500" {...A} /><path d="M13 4v5M19 4v5M13 23v5M19 23v5M4 13h5M4 19h5M23 13h5M23 19h5" {...A} /></>),
  "healthcare-administration": (<><path d="M16 28S4.500 21.500 4.500 13.200A6.200 6.200 0 0 1 16 10a6.200 6.200 0 0 1 11.500 3.200C27.500 21.500 16 28 16 28z" {...B} /><path d="M16 14.500v7M12.500 18h7" {...A} /></>),
  "intro-business": (<><path d="M16 4.500l13 6.500-13 6.500L3 11l13-6.500z" {...B} /><path d="M9 14.500v7c0 2 3.100 4 7 4s7-2 7-4v-7" {...A} /><path d="M29 11v8" {...A} /></>),
};

export default function ExamIcon({ slug, size = 30 }: { slug: string; size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      {ICONS[slug] ?? ICONS.core}
    </svg>
  );
}
