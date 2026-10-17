// Progress lives on this device for now (no accounts yet). Rank counts each question only the
// first time it is answered correctly, so repeating a question you already know cannot farm rank.
import { useSyncExternalStore } from "react";

export const RANKS = [
  { name: "Bronze", min: 0 },
  { name: "Silver", min: 25 },
  { name: "Gold", min: 100 },
  { name: "Platinum", min: 300 },
  { name: "Diamond", min: 750 },
  { name: "Glass", min: 1500 },
] as const;

export type Rec = { right: number; wrong: number; last: number; lastOk: boolean; flag?: boolean };

export type Store = {
  firstCorrect: string[];
  attempts: Record<string, Rec>;
  topics: Record<string, string>; // "track/topic" -> last 20 answers as 1/0
};

const KEY = "g2g-progress-v2";
const OLD = "g2g-progress-v1";
const EVENT = "g2g-progress";
const EMPTY: Store = { firstCorrect: [], attempts: {}, topics: {} };

let cacheRaw: string | null = null;
let cache: Store = EMPTY;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw && raw !== null) return cache;
    if (raw) {
      cacheRaw = raw;
      cache = { ...EMPTY, ...(JSON.parse(raw) as Store) };
      return cache;
    }
    const old = localStorage.getItem(OLD);
    if (old) {
      const o = JSON.parse(old) as { firstCorrect?: string[] };
      return { ...EMPTY, firstCorrect: o.firstCorrect ?? [] };
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return EMPTY;
}

function write(s: Store) {
  try {
    const raw = JSON.stringify(s);
    localStorage.setItem(KEY, raw);
    cacheRaw = raw;
    cache = s;
  } catch {
    cache = s;
    cacheRaw = null;
  }
  dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  addEventListener(EVENT, cb);
  addEventListener("storage", cb);
  return () => {
    removeEventListener(EVENT, cb);
    removeEventListener("storage", cb);
  };
}

export const onProgress = subscribe;

/** React hook: the current progress store (empty on the server). */
export function useProgress(): Store {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function recordAnswer(id: string, correct: boolean, topicKey?: string) {
  const s = structuredClone(read());
  const a = (s.attempts[id] ??= { right: 0, wrong: 0, last: 0, lastOk: false });
  if (correct) a.right++;
  else a.wrong++;
  a.last = Date.now();
  a.lastOk = correct;
  if (correct && !s.firstCorrect.includes(id)) s.firstCorrect.push(id);
  if (topicKey) s.topics[topicKey] = ((s.topics[topicKey] ?? "") + (correct ? "1" : "0")).slice(-20);
  write(s);
}

export function toggleFlag(id: string) {
  const s = structuredClone(read());
  const a = (s.attempts[id] ??= { right: 0, wrong: 0, last: 0, lastOk: false });
  a.flag = !a.flag;
  write(s);
}

export function correctCount() {
  return read().firstCorrect.length;
}

export function rankFor(count: number) {
  let i = 0;
  while (i < RANKS.length - 1 && count >= RANKS[i + 1].min) i++;
  const next = RANKS[i + 1];
  return { rank: RANKS[i].name, next: next?.name ?? null, toNext: next ? next.min - count : 0 };
}

// ---- spaced review: a right answer comes back after 1, 2, 4, 7, then 14 days ----
const DAY = 86_400_000;
const GAPS = [1, 2, 4, 7, 14];

export function isDue(r: Rec | undefined, now = Date.now()) {
  if (!r || r.right + r.wrong === 0) return false;
  if (!r.lastOk) return true;
  return now - r.last >= GAPS[Math.min(r.right - 1, GAPS.length - 1)] * DAY;
}

export type Mastery = "Not started" | "Needs work" | "Solid" | "Strong";

/** Topic mastery from the last 20 answers: Solid at 65%, Strong at 85%. */
export function masteryOf(history: string | undefined): { label: Mastery; pct: number; n: number } {
  const n = history?.length ?? 0;
  if (n < 3) return { label: "Not started", pct: 0, n };
  const pct = Math.round(([...history!].filter((c) => c === "1").length / n) * 100);
  return { label: pct >= 85 ? "Strong" : pct >= 65 ? "Solid" : "Needs work", pct, n };
}
