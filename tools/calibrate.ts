// Compares the trajectory predictor with the real simulation (flat, water, current, holes, rails, bumpers, glass).
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { VectorRaycaster } from '../src/physics/VectorRaycaster';
import type { LevelDef } from '../src/levels/LevelTypes';
import { rect, zone, seg, wall } from '../src/levels/helpers';
await RAPIER.init();
const base = (extra: Partial<LevelDef>): LevelDef => ({
  id: 't', name: 't', sector: 't', world: 0, difficulty: 1, par: 1, briefing: '', floors: [rect(-5, 400, -6, 6)], walls: [],
  balls: [{ kind: 'cue', x: 0, z: 0 }], pockets: [], switches: [], barriers: [], portals: [], hoops: [], objectives: [{ label: '', signal: 'never' }],
  camera: { x: 0, z: 0, dist: 10 }, ...extra,
});
function run(name: string, L: LevelDef, powers: number[], angle = 0, spin = { x: 0, y: 0 }) {
  for (const p of powers) {
    const sim = new Simulation(RAPIER, L);
    const tr = new VectorRaycaster(sim).predict(sim.cue, angle, p, spin);
    const t0 = performance.now();
    sim.shoot({ angle, power: p, spin }); sim.runToRest(60);
    const c = sim.cue.pos(), pr = tr.stop ?? tr.fall;
    const err = pr ? Math.hypot(pr.x - c.x, pr.z - c.z) : NaN;
    console.log(`${name.padEnd(8)} p=${p} spin=${spin.y}: sim ${sim.cue.status.padEnd(10)} (${c.x.toFixed(2)},${c.z.toFixed(2)}) t=${sim.shotTime.toFixed(1)}s | pred ${tr.fall ? 'LOST ' + tr.fall.kind : 'stop'} (${pr?.x.toFixed(2)},${pr?.z.toFixed(2)}) err=${err.toFixed(2)} ${tr.notes.map((n) => n.text).join(' ')} [${(performance.now() - t0).toFixed(0)}ms]`);
    sim.dispose();
  }
}
run('flat', base({}), [0.1, 0.3, 0.6, 1]);
run('follow', base({}), [0.3], 0, { x: 0, y: 1 });
run('draw', base({}), [0.3], 0, { x: 0, y: -1 });
run('water', base({ water: [zone(4, 8, -6, 6)] }), [0.2, 0.35, 0.5]);
run('current', base({ currents: [{ ...zone(4, 8, -6, 6), fx: 0, fz: 2.5 }] }), [0.3, 0.6]);
run('hole', base({ holes: [{ x: 4, z: 0, r: 0.6 }] }), [0.2, 0.3, 0.45]);
const box = { floors: [rect(-30, 30, -6, 6)] };
run('cushion', base({ ...box, walls: [seg(6, -6, 6, 6), seg(-30, 6, 30, 6), seg(-30, -6, 30, -6), seg(-30, -6, -30, 6)] }), [0.2, 0.4, 0.7], 0.3);
run('english', base({ ...box, walls: [seg(6, -6, 6, 6), seg(-30, 6, 30, 6), seg(-30, -6, 30, -6), seg(-30, -6, -30, 6)] }), [0.3], 0.3, { x: 1, y: 0 });
run('bumper', base({ ...box, walls: [wall('bumper', 6, -6, 6, 6), seg(-30, 6, 30, 6), seg(-30, -6, 30, -6), seg(-30, -6, -30, 6)] }), [0.2, 0.4], 0.3);
run('glass', base({ ...box, walls: [wall('glass', 6, -6, 6, 6), seg(-30, 6, 30, 6), seg(-30, -6, 30, -6), seg(-30, -6, -30, 6)] }), [0.25, 0.4], 0.3);
// wind & ramps & sand
run('wind', base({ winds: [{ ...zone(3, 12, -6, 6), fx: 0, fz: 6 }] }), [0.3, 0.5]);
run('sand', base({ floors: [rect(-5, 400, -6, 6), rect(5, 9, -6, 6, 0, 'sand')] }), [0.3, 0.6]);
run('ramp', base({ floors: [rect(-5, 6, -6, 6), rect(10, 60, -6, 6)], ramps: [{ x: 5, z: 0, w: 1.2, d: 4, facing: 0, lift: 0.6 }] }), [0.5, 0.7, 0.9]);
run('windR', base({ winds: [{ ...zone(3, 12, -6, 6), fx: 0, fz: 2 }] }), [0.3, 0.45]);
