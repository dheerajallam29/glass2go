// Tiny event bus: any component can ask the FxLayer for a burst without importing it.
export type FxKind = "sparkle" | "shatter" | "ripple";
export type FxDetail = { kind: FxKind; x: number; y: number; hue?: number; power?: number };

export function fx(kind: FxKind, x: number, y: number, extra: Partial<FxDetail> = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FxDetail>("g2g-fx", { detail: { kind, x, y, ...extra } }));
}

/** Fire an effect from the middle of an element. */
export function fxAt(kind: FxKind, el: Element | null, extra: Partial<FxDetail> = {}) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  fx(kind, r.left + r.width / 2, r.top + r.height / 2, extra);
}
