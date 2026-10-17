// Frame storage for the flight. Compressed frames are kept as blobs (small); decoded bitmaps (big) live
// in a small sliding window around the playhead so memory stays flat however long the film is.

export class FrameStore {
  private blobs: (Blob | null)[];
  private bitmaps = new Map<number, ImageBitmap>();
  private decoding = new Map<number, Promise<ImageBitmap | null>>();
  private pinned = new Set<number>();
  private failed = new Set<number>();
  loaded = 0;
  dead = false;

  constructor(
    readonly count: number,
    private url: (n: number) => string,
    private maxBitmaps: number,
  ) {
    this.blobs = new Array(count + 2).fill(null);
  }

  has(n: number) {
    return !!this.blobs[n];
  }

  async fetch(n: number): Promise<void> {
    if (this.dead || this.blobs[n] || this.failed.has(n)) return;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(this.url(n));
        if (!res.ok) throw new Error(String(res.status));
        this.blobs[n] = await res.blob();
        this.loaded++;
        return;
      } catch {
        if (this.dead) return;
      }
    }
    this.failed.add(n);
  }

  /** Fetch in the given order with a few requests in flight. */
  async fetchAll(order: number[], concurrency: number, onStep?: () => void) {
    let i = 0;
    const worker = async () => {
      while (!this.dead && i < order.length) {
        await this.fetch(order[i++]);
        onStep?.();
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  peek(n: number): ImageBitmap | undefined {
    return this.bitmaps.get(n);
  }

  /** The closest frame that is already decoded, searching outwards (used to hold a picture while decoding catches up). */
  nearest(n: number, reach = 40): ImageBitmap | undefined {
    for (let d = 0; d <= reach; d++) {
      const a = this.bitmaps.get(n - d) ?? this.bitmaps.get(n + d);
      if (a) return a;
    }
    return undefined;
  }

  decode(n: number): Promise<ImageBitmap | null> {
    const have = this.bitmaps.get(n);
    if (have) return Promise.resolve(have);
    const running = this.decoding.get(n);
    if (running) return running;
    const blob = this.blobs[n];
    if (!blob || this.dead) return Promise.resolve(null);
    const p = createImageBitmap(blob)
      .then((bm) => {
        this.decoding.delete(n);
        if (this.dead) {
          bm.close();
          return null;
        }
        this.bitmaps.set(n, bm);
        return bm;
      })
      .catch(() => {
        this.decoding.delete(n);
        return null;
      });
    this.decoding.set(n, p);
    return p;
  }

  pin(frames: Iterable<number>) {
    for (const f of frames) this.pinned.add(f);
  }

  /** Drop decoded frames outside [lo, hi] (pinned stills stay) once the window is over budget. */
  trim(lo: number, hi: number) {
    if (this.bitmaps.size <= this.maxBitmaps) return;
    for (const [n, bm] of this.bitmaps) {
      if (n < lo || n > hi) {
        if (!this.pinned.has(n)) {
          bm.close();
          this.bitmaps.delete(n);
        }
      }
    }
  }

  destroy() {
    this.dead = true;
    for (const bm of this.bitmaps.values()) bm.close();
    this.bitmaps.clear();
    this.blobs.fill(null);
  }
}
