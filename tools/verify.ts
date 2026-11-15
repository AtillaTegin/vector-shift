/**
 * Regression check: replays a known solution for every level through the real (headless)
 * Simulation and asserts it wins within PAR.   npm run verify
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();

// angle(deg)@power per level id — generated with tools/chain.ts
import SOLUTIONS from './solutions.json' with { type: 'json' };

let ok = true;
for (const L of LEVELS) {
  const sim = new Simulation(RAPIER, L);
  const sol = (SOLUTIONS as Record<string, string>)[L.id];
  if (!sol) { ok = false; console.log(`MISSING  ${L.sector}  ${L.name}`); continue; }
  for (const s of sol.split(',')) {
    const [a, p, w = 0] = s.split('@').map(Number);
    for (let i = 0; i < Math.round(w * 240); i++) sim.step();
    sim.shoot({ angle: (a * Math.PI) / 180, power: p, spin: { x: 0, y: 0 } });
    sim.runToRest();
  }
  const pass = sim.state === 'won' && sim.strokes <= L.par;
  ok &&= pass;
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${L.sector}  ${L.name.padEnd(24)} strokes ${sim.strokes} / par ${L.par}  (${sim.state})`);
  sim.dispose();
}
process.exit(ok ? 0 : 1);
