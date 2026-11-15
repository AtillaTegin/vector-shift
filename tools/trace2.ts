// After a prefix, try one shot and print events + final positions: tsx tools/trace2.ts <lvl> "<prefix>" <a> <p>
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const [lv, prefix, a, p] = process.argv.slice(2);
const sim = new Simulation(RAPIER, LEVELS[Number(lv) - 1]);
const sh = (a: number, p: number) => { sim.shoot({ angle: (a * Math.PI) / 180, power: p, spin: { x: 0, y: 0 } }); sim.runToRest(); };
for (const s of prefix.split(',').filter(Boolean)) { const [x, y] = s.split('@').map(Number); sh(x, y); }
sim.events = []; sh(Number(a), Number(p));
console.log(sim.events.filter((e) => e.type !== 'cushion' && e.type !== 'clack').map((e) => e.type).join(' '), '|', sim.balls.map((b) => `${b.kind}:${b.status}(${b.pos().x.toFixed(1)},${b.pos().z.toFixed(1)})`).join(' '));
