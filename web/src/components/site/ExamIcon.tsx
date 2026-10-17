import type { ReactNode } from "react";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

const ICONS: Record<string, ReactNode> = {
  // DECA
  core: (<><rect x="4" y="9" width="16" height="11" rx="2" /><path d="M9 9V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V9M4 14h16" /></>),
  bma: (<><circle cx="9" cy="8" r="3" /><path d="M3.5 19c.5-3.2 2.6-5 5.5-5s5 1.8 5.5 5M16 7.5a2.6 2.6 0 1 1 0 5M17 14.3c1.8.4 3 1.9 3.4 4.2" /></>),
  finance: (<><path d="M4 19V9M10 19V5M16 19v-7M3 19.5h18" /><path d="M13 6.5l3-2.2 4 2.4" /></>),
  hospitality: (<><path d="M5 20V8.5L12 4l7 4.5V20M9 20v-5h6v5M9 11h.01M12 11h.01M15 11h.01" /></>),
  marketing: (<><path d="M4 10v4l12 5V5L4 10zM16 9.5a3 3 0 0 1 0 5M7 14.5V19" /></>),
  entrepreneurship: (<><path d="M12 3v3M5.6 5.6l2 2M3 12h3M18.4 5.6l-2 2M21 12h-3" /><path d="M9 21h6M10 18h4M8.7 15a5 5 0 1 1 6.6 0c-.8.7-1.3 1.4-1.3 2.2h-4c0-.8-.5-1.5-1.3-2.2z" /></>),
  pfl: (<><circle cx="12" cy="12" r="8.5" /><path d="M14.7 9.2c-.5-1-1.5-1.5-2.7-1.5-1.5 0-2.6.8-2.6 2 0 3 5.4 1.3 5.4 4.3 0 1.2-1.2 2-2.8 2-1.3 0-2.4-.6-2.9-1.6M12 6v1.7M12 16.3V18" /></>),
  // FBLA
  accounting: (<><rect x="5" y="3.5" width="14" height="17" rx="2" /><path d="M8 7.5h8M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01" /></>),
  "business-law": (<><path d="M12 4v16M6 20h12M5 8h14M5 8l-2.5 6a3 3 0 0 0 5 0L5 8zM19 8l-2.5 6a3 3 0 0 0 5 0L19 8z" /></>),
  economics: (<><path d="M4 4v16h16" /><path d="M7 15l4-4 3 3 5-6" /></>),
  "personal-finance": (<><rect x="3.5" y="6" width="17" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.6" /><path d="M7 9.5h.01M17 14.5h.01" /></>),
  securities: (<><path d="M4 18l5-6 3.5 3L20 6" /><path d="M15 6h5v5" /></>),
  leadership: (<><circle cx="12" cy="8" r="3" /><path d="M6 20c.4-3.6 2.6-5.5 6-5.5s5.6 1.9 6 5.5M3.5 11l2 1M20.5 11l-2 1" /></>),
  "data-science-ai": (<><rect x="7" y="7" width="10" height="10" rx="2" /><path d="M10 10.5h4v3h-4zM9.5 3v4M14.5 3v4M9.5 17v4M14.5 17v4M3 9.5h4M3 14.5h4M17 9.5h4M17 14.5h4" /></>),
  "healthcare-administration": (<><path d="M12 20.5s-8-4.7-8-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 8 2.3c0 5.5-8 10.2-8 10.2z" /><path d="M12 11v4M10 13h4" /></>),
  "intro-business": (<><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" /><path d="M7 10v5c0 1.4 2.2 3 5 3s5-1.6 5-3v-5" /></>),
};

export default function ExamIcon({ slug }: { slug: string }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" {...S}>
      {ICONS[slug] ?? ICONS.core}
    </svg>
  );
}
