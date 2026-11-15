// Greedy chain finder: for each goal in turn, grid-search the next shot and pick the median success.
// Every candidate is evaluated by a FRESH replay of the whole shot list, so results replay exactly.
//   tsx tools/chain.ts <level> "goal1;goal2;..."   goal = signal | win | cue:x,z | wallhp:<id>:<n>
import fs from 'node:fs';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const [lv, goals] = process.argv.slice(2);
const L = /^\d+$/.test(lv) ? LEVELS[Number(lv) - 1] : LEVELS.find((l) => l.id === lv)!;
const waitSteps = (sim: Simulation, w = 0) => { for (let i = 0; i < Math.round(w * 240); i++) sim.step(); };
const play = (shots: number[][]) => {
  const sim = new Simulation(RAPIER, L);
  for (const [a, p, w] of shots) { waitSteps(sim, w); sim.shoot({ angle: (a * Math.PI) / 180, power: p, spin: { x: 0, y: 0 } }); sim.runToRest(); }
  return sim;
};
const met = (sim: Simulation, g: string) => {
  if (g === 'win') return sim.state === 'won';
  if (sim.state === 'failed') return false;
  if (g.startsWith('ball:')) { const [, kind, xz] = g.split(':'); const [x, z] = xz.split(',').map(Number); const b = sim.balls.find((o) => o.kind === kind)!; const p = b.pos(); return b.active && Math.hypot(p.x - x, p.z - z) < Number(process.env.CUERAD ?? 1.2); }
  if (g.startsWith('num:')) return sim.balls.some((b) => b.num === Number(g.slice(4)) && b.status === 'sunk');
  if (g.startsWith('wallhp:')) { const [, id, n] = g.split(':'); const w = sim.staticWalls.find((x) => x.id === id)!; return w.broken || w.hp <= Number(n); }
  if (g.startsWith('cue:')) { const [x, z] = g.slice(4).split(',').map(Number); const c = sim.cue.pos(); return sim.cue.active && Math.hypot(c.x - x, c.z - z) < Number(process.env.CUERAD ?? 1.2); }
  return sim.sig(g);
};
const path: number[][] = (process.env.PREFIX ?? '').split(',').filter(Boolean).map((s) => s.split('@').map(Number) as number[]);
const aStep = Number(process.env.ASTEP ?? 1), pStep = Number(process.env.PSTEP ?? 0.04);
const aMin = Number(process.env.AMIN ?? 0), aMax = Number(process.env.AMAX ?? 360), pMin = Number(process.env.PMIN ?? 0.06), pMax = Number(process.env.PMAX ?? 1);
for (const g of goals.split(';')) {
  const ok: number[][] = [];
  const baseSim = play(path);
  const baseStrokes = baseSim.strokes;
  const snap = process.env.SNAP ? baseSim.snapshot() : null;
  const waits = (process.env.WAITS ?? '0').split(',').map(Number);
  for (const w of waits) for (let a = aMin; a < aMax; a += aStep) for (let p = pMin; p <= pMax + 1e-4; p += pStep) {
    const shot: number[] = w ? [+a.toFixed(2), +p.toFixed(3), w] : [+a.toFixed(2), +p.toFixed(3)];
    let sim: Simulation;
    if (snap) { sim = baseSim; sim.restore(snap); waitSteps(sim, shot[2]); sim.shoot({ angle: (shot[0] * Math.PI) / 180, power: shot[1], spin: { x: 0, y: 0 } }); sim.runToRest(); }
    else sim = play([...path, shot]);
    if (met(sim, g) && sim.strokes === baseStrokes + 1) ok.push(shot);
    if (!snap) sim.dispose();
  }
  baseSim.dispose();
  // pick the median option that ALSO works on a fresh replay (snapshot restores can drift on razor-thin shots)
  const order = ok.map((o, i) => ({ o, d: Math.abs(i - ok.length / 2) })).sort((x, y) => x.d - y.d).map((x) => x.o);
  let chosen: number[] | null = null;
  for (const o of order.slice(0, 40)) { const sim = play([...path, o]); const good = met(sim, g) && sim.strokes === baseStrokes + 1; sim.dispose(); if (good) { chosen = o; break; } }
  if (!chosen) { console.log(`goal ${g}: NOT FOUND after ${path.map((s) => s.join('@')).join(',')}`); process.exit(1); }
  path.push(chosen);
  const sim = play(path);
  console.log(`goal ${g}: ${ok.length} options, chose ${chosen.join('@')} -> strokes ${sim.strokes}, cue ${JSON.stringify(sim.cue.pos())}`);
}
const fin = play(path);
const str = path.map((s) => s.join('@')).join(',');
console.log('SOLUTION', L.name, `strokes=${fin.strokes} par=${L.par}`, str);
if (fin.state === 'won') {
  const file = new URL('./solutions.json', import.meta.url);
  let all: Record<string, string> = {};
  try { all = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* new */ }
  all[L.id] = str;
  fs.writeFileSync(file, JSON.stringify(all, null, 2));
}
