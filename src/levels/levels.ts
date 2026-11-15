import type { LevelDef } from './LevelTypes';
import SOLUTIONS from '../../tools/solutions.json';
import { WORLD1 } from './world1';
import { WORLD2 } from './world2';
import { WORLD1B } from './world1b';
import { WORLD1C } from './world1c';
import { WORLD1D } from './world1d';
import { WORLD1E } from './world1e';
import { WORLD2B } from './world2b';
import { WORLD2C } from './world2c';
import { WORLD3 } from './world3';
import { WORLD3B } from './world3b';
import { WORLD3C } from './world3c';
import { WORLD3D } from './world3d';

export const WORLDS = [
  { id: 1, name: 'Calibration Foundry', theme: 'foundry' as const, blurb: 'Reflection, switches, portals, tungsten.' },
  { id: 2, name: 'Hydro Station', theme: 'hydro' as const, blurb: 'Water drag, rivers, open holes, breakable panels, bumpers.' },
  { id: 3, name: 'Caravanserai', theme: 'caravan' as const, blurb: 'Girih stars, wind towers, bazaar deliveries, desert dunes.' },
];
export const DIFFICULTY_LABELS = ['', 'VERY EASY', 'EASY', 'EASY-MEDIUM', 'MEDIUM', 'MEDIUM-HARD', 'HARD', 'EXPERT'];
/** World 1 is ordered by difficulty (stable), sectors renumbered 1-1 … 1-N. */
const W1: LevelDef[] = [...WORLD1, ...WORLD1B, ...WORLD1C, ...WORLD1D, ...WORLD1E]
  .map((l, i) => ({ l, i })).sort((a, b) => a.l.difficulty - b.l.difficulty || a.i - b.i)
  .map(({ l }, i) => ({ ...l, sector: `1-${i + 1}` }));
/** World 2 likewise sorted by difficulty, sectors 2-1 … 2-N. */
const W2: LevelDef[] = [...WORLD2, ...WORLD2B, ...WORLD2C]
  .map((l, i) => ({ l, i })).sort((a, b) => a.l.difficulty - b.l.difficulty || a.i - b.i)
  .map(({ l }, i) => ({ ...l, sector: `2-${i + 1}` }));
const W3: LevelDef[] = [...WORLD3, ...WORLD3B, ...WORLD3C, ...WORLD3D]
  .map((l, i) => ({ l, i })).sort((a, b) => a.l.difficulty - b.l.difficulty || a.i - b.i)
  .map(({ l }, i) => ({ ...l, sector: `3-${i + 1}` }));
/** Every 5th sector of a world is a mandatory challenge: the stroke limit is the verified solution length. */
const shotsOf = (id: string) => ((SOLUTIONS as Record<string, string>)[id] ?? '').split(',').filter(Boolean).length;
const challenge = (list: LevelDef[]) => list.map((l, i) => ((i + 1) % 5 === 0 && shotsOf(l.id) > 0 ? { ...l, challenge: { maxStrokes: shotsOf(l.id) } } : l));
export const LEVELS: LevelDef[] = [...challenge(W1), ...challenge(W2), ...challenge(W3)];
/** A sector is locked while an earlier challenge of the same world is unbeaten. */
export function isLocked(index: number, best: Record<string, number>) {
  const L = LEVELS[index];
  for (let i = 0; i < index; i++) { const p = LEVELS[i]; if (p.world === L.world && p.challenge && best[p.id] === undefined) return true; }
  return false;
}
