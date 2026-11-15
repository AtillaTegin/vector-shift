/** Persists best stroke counts per level (localStorage; resilient if storage is unavailable). */
const KEY = 'vector-shift-save-v1';

export interface SaveData { best: Record<string, number>; lastLevel: number; owned: string[]; aimTier?: string }

export class SaveSystem {
  data: SaveData = { best: {}, lastLevel: 0, owned: [] };

  constructor() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = { ...this.data, ...JSON.parse(raw) };
    } catch { /* storage unavailable: play without persistence */ }
  }

  private flush() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* ignore */ }
  }

  recordResult(levelId: string, strokes: number) {
    const prev = this.data.best[levelId];
    const isBest = prev === undefined || strokes < prev;
    if (isBest) this.data.best[levelId] = strokes;
    this.flush();
    return isBest;
  }

  setLastLevel(i: number) { this.data.lastLevel = i; this.flush(); }
  grant(sku: string) { if (!this.data.owned.includes(sku)) this.data.owned.push(sku); this.flush(); }
  setAimTier(t: string) { this.data.aimTier = t; this.flush(); }
}
