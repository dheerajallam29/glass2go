// The homepage is a short film with five stops. The page plays the film from stop to stop on demand
// (scroll, swipe, keys or the controls): each move always plays in full, forward or backward.
// Frame numbers match blender/flight.py. Rects are fractions of the rendered frame, not the screen,
// so copy always sits in the empty stage space the camera left for it, at every window size.

export type SetName = "landscape" | "portrait";
export type Rect = { x: number; y: number; w: number; h: number };

export const FPS = 48;
export const FRAME_COUNT = 505;
export const WAYPOINTS = [1, 97, 313, 409, 505] as const;
export const LAST = WAYPOINTS.length - 1;

export type ChapterId = "hero" | "deca" | "fbla" | "ranks" | "finale";
export const CHAPTERS: { id: ChapterId; label: string }[] = [
  { id: "hero", label: "The glass is the goal" },
  { id: "deca", label: "DECA exams" },
  { id: "fbla", label: "Roleplays" },
  { id: "ranks", label: "Ranks" },
  { id: "finale", label: "Pick your glass" },
];

// Where each chapter's words go. Measured from the keyframe renders: these are the dark, empty areas.
export const ZONES: Record<ChapterId, Record<SetName, Rect & { align: "left" | "center"; v: "top" | "middle" }>> = {
  hero: {
    landscape: { x: 0.1, y: 0.075, w: 0.8, h: 0.27, align: "center", v: "top" },
    portrait: { x: 0.07, y: 0.06, w: 0.86, h: 0.31, align: "center", v: "top" },
  },
  deca: {
    landscape: { x: 0.06, y: 0.26, w: 0.44, h: 0.46, align: "left", v: "middle" },
    portrait: { x: 0.08, y: 0.65, w: 0.84, h: 0.29, align: "left", v: "top" },
  },
  fbla: {
    landscape: { x: 0.47, y: 0.26, w: 0.46, h: 0.46, align: "left", v: "middle" },
    portrait: { x: 0.08, y: 0.65, w: 0.84, h: 0.29, align: "left", v: "top" },
  },
  ranks: {
    landscape: { x: 0.1, y: 0.06, w: 0.8, h: 0.27, align: "center", v: "top" },
    portrait: { x: 0.07, y: 0.05, w: 0.86, h: 0.32, align: "center", v: "top" },
  },
  finale: {
    landscape: { x: 0.1, y: 0.05, w: 0.8, h: 0.2, align: "center", v: "top" },
    portrait: { x: 0.07, y: 0.05, w: 0.86, h: 0.27, align: "center", v: "top" },
  },
};

// The part of every frame that must never be cropped, and the pill row's height inside the frame.
export const SAFE: Record<SetName, Rect> = {
  landscape: { x: 0.06, y: 0.05, w: 0.88, h: 0.9 },
  portrait: { x: 0.08, y: 0.04, w: 0.84, h: 0.92 },
};
export const PILL_Y: Record<SetName, number> = { landscape: 0.8, portrait: 0.7 };

export type Placement = { s: number; ox: number; oy: number; w: number; h: number };

/** Where the frame goes in a cw x ch viewport. Covers the viewport when it can, but the safe box (trophies and the
 *  copy zones) is never cropped: on very wide or very short windows the frame stays smaller and its sides fade to the stage colour. */
export function place(cw: number, ch: number, fw: number, fh: number, set: SetName): Placement {
  const sf = SAFE[set];
  const cover = Math.max(cw / fw, ch / fh);
  const safe = Math.min(cw / (fw * sf.w), ch / (fh * sf.h));
  const s = Math.min(cover, safe);
  const w = fw * s;
  const h = fh * s;
  return { s, ox: (cw - w) / 2, oy: (ch - h) / 2, w, h };
}

export const pad4 = (n: number) => String(n).padStart(4, "0");

export type Tier = { name: string; width: number; height: number };
export type Manifest = { set: SetName; fps: number; frames: number; waypoints: number[]; tiers: Tier[] };
export type Bounds = Record<string, { deca: number[] | null; fbla: number[] | null }>; // frame -> [x0,y0,x1,y1]
export type TiltMeta = {
  width: number;
  height: number;
  angles: number[];
  trophies: Record<"deca" | "fbla", { x: number; y: number; w: number; h: number }>;
};
