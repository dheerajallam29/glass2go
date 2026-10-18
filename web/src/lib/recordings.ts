// Practice recordings live in this browser only (IndexedDB). Nothing is uploaded anywhere.

export type Recording = {
  id: string;
  createdAt: number;
  eventSlug: string;
  eventName: string;
  scenarioId: string;
  seconds: number; // length of what was recorded
  mime: string;
  hasVideo: boolean;
  notes: string;
  scores: Record<string, number>;
  reflection: string;
  marks: { t: number; label: string }[]; // moments flagged while watching back
  blob: Blob;
};

const DB_NAME = "g2g-recordings";
const STORE = "recordings";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    t.oncomplete = () => db.close();
  });
}

export const saveRecording = (r: Recording) => tx("readwrite", (s) => s.put(r));
export const getRecording = (id: string) => tx<Recording | undefined>("readonly", (s) => s.get(id));
export const deleteRecording = (id: string) => tx("readwrite", (s) => s.delete(id));
export const listRecordings = async () => ((await tx<Recording[]>("readonly", (s) => s.getAll())) ?? []).sort((a, b) => b.createdAt - a.createdAt);

export async function updateRecording(id: string, patch: Partial<Omit<Recording, "id" | "blob">>) {
  const cur = await getRecording(id);
  if (cur) await saveRecording({ ...cur, ...patch });
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** The best container this browser can record in. */
export function pickMime(video: boolean): string {
  const list = video
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return list.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}
