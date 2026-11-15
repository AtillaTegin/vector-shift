// Print state after a shot list: tsx tools/state.ts <level> "<a@p,...>"
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const [lv, shots] = process.argv.slice(2);
const sim = new Simulation(RAPIER, LEVELS[Number(lv) - 1]);
for (const s of shots.split(',').filter(Boolean)) { const [a, p] = s.split('@').map(Number); sim.shoot({ angle: (a * Math.PI) / 180, power: p, spin: { x: 0, y: 0 } }); sim.runToRest(); }
console.log('state', sim.state, 'strokes', sim.strokes, 'signals', [...sim.signals].filter(([, v]) => v).map(([k]) => k).join(','));
for (const b of sim.balls) console.log(b.kind, b.status, JSON.stringify(b.pos()));
for (const b of sim.barriers) console.log(b.def.id, b.triggered, b.offset.toFixed(2));
