// Measures real acceptance of rail-cut pockets: shoots the cue at the corner pocket with lateral offsets
// and speeds and reports which drop. tsx tools/pocketTest.ts
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation } from '../src/physics/Simulation';
import { poolTable } from '../src/levels/helpers';
import type { LevelDef } from '../src/levels/LevelTypes';
await RAPIER.init();
for (const style of ['american', 'snooker', 'russian'] as const) {
  for (const set of style === 'russian' ? (['russian'] as const) : (['american'] as const)) {
    const t = poolTable(-4, 4, -2, 2, [{ id: 'fin', at: 'ne', color: 'finish', style }], { set });
    const D = (set === 'russian' ? 0.34 : 0.28) * 2;
    const rows: string[] = [];
    for (const speed of [0.2, 0.45, 0.8]) {
      let ok = 0; const hits: string[] = [];
      for (let off = -0.3; off <= 0.3001; off += 0.025) {
        // aim along the pocket axis from 3 units away, offset laterally
        const ax = -1 / Math.SQRT2, az = 1 / Math.SQRT2; // into table from NE corner
        const lx = -az, lz = ax;
        const sx = 4 + ax * 3.2 + lx * off, sz = -2 + az * 3.2 + lz * off;
        const L: LevelDef = { id: 't', name: 't', sector: '', world: 0, difficulty: 1, par: 1, briefing: '', ...t, ballSet: set,
          balls: [{ kind: 'cue', x: sx, z: sz }], switches: [], barriers: [], portals: [], hoops: [], objectives: [{ label: '', signal: 'sunk:fin' }], camera: { x: 0, z: 0, dist: 1 } };
        const sim = new Simulation(RAPIER, L);
        sim.shoot({ angle: Math.atan2(-az, -ax), power: speed, spin: { x: 0, y: 0 } }); sim.runToRest(20);
        const won = sim.state === 'won'; if (won) ok++;
        hits.push(won ? '#' : '.');
        sim.dispose();
      }
      rows.push(`  power ${speed}: ${hits.join('')}  (${ok} of 25 offsets, step 0.025u = ${(0.025 / D * 57).toFixed(1)}mm-equiv)`);
    }
    console.log(`${style} (${set} balls, mouth ${(D * ({ american: 2, snooker: 1.64, russian: 1.045 })[style]).toFixed(2)}u):\n${rows.join('\n')}`);
  }
}
