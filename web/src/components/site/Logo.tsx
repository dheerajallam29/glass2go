/** The Glass2Go mark: the two trophies as black and blue silhouettes. */
export default function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 44 34" width={size * (44 / 34)} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="g2g-blue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fa6ff" />
          <stop offset="1" stopColor="#2a5ff0" />
        </linearGradient>
        <linearGradient id="g2g-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0d1530" />
          <stop offset="1" stopColor="#04060f" />
        </linearGradient>
      </defs>
      {/* DECA: a tall slab with a blue fin and a base */}
      <rect x="3" y="4" width="15" height="22" rx="1.2" fill="url(#g2g-glass)" stroke="#3b74ff" strokeWidth="1.1" />
      <path d="M14 4h4v22h-1.2C15.2 20 15 12 14 4z" fill="url(#g2g-blue)" />
      <rect x="1.5" y="26" width="18" height="4" rx="1" fill="#0b1226" stroke="#3b74ff" strokeWidth="1" />
      <circle cx="13.5" cy="22.2" r="1.7" fill="#cfe0ff" />
      {/* FBLA: a slab with a slanted top and a dark base */}
      <path d="M23 26V9.5L40 3v23z" fill="url(#g2g-glass)" stroke="#3b74ff" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M23 9.5L40 3" stroke="#cfe0ff" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M29.5 13.2l2.8 4.9h-5.6z" fill="url(#g2g-blue)" />
      <rect x="21.5" y="26" width="20" height="4" rx="1" fill="#0b1226" stroke="#3b74ff" strokeWidth="1" />
    </svg>
  );
}
