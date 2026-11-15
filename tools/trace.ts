// Trace one shot after a prefix: tsx tools/trace.ts <level> "<prefix>" <angle> <power>
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const [lv, prefix, ang, pw] = process.argv.slice(2);
const sim = new Simulation(RAPIER, LEVELS[Number(lv) - 1]);
const shot = (a: number, p: number) => sim.shoot({ angle: (a * Math.PI) / 180, power: p, spin: { x: 0, y: 0 } });
for (const s of prefix.split(',').filter(Boolean)) { const [a, p] = s.split('@').map(Number); shot(a, p); sim.runToRest(); }
sim.events = [];
shot(Number(ang), Number(pw));
let i = 0;
while (sim.state === 'rolling' && i < 4000) {
  sim.step();
  for (const e of sim.events) if (e.type !== 'clack' && e.type !== 'cushion') console.log((i / 120).toFixed(2), JSON.stringify(e));
  sim.events = [];
  if (i % 30 === 0) { const c = sim.cue.pos(); console.log((i / 120).toFixed(2), sim.cue.status, c.x.toFixed(2), c.y.toFixed(2), c.z.toFixed(2)); }
  i++;
}
console.log('final', sim.state, sim.strokes);
