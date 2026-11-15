import type { LevelDef } from './LevelTypes';
import { seg, wall, rect, zone, rails } from './helpers';

/**
 * WORLD 2 — HYDRO STATION
 * Teaches (in order): water drag → choosing a route → river drift → hole hang-time → breakable glass
 * → energised bumpers → switches across a river → concrete → bumper fields → stopping on an island
 * → portals + current + glass → two-colour delta → expert precision chains.
 */
const W = 2, theme = 'hydro' as const;
const base = { world: W, theme, switches: [], barriers: [], portals: [], hoops: [] };

export const WORLD2: LevelDef[] = [
  // 2-1 ─ Water drag: hit hard enough to make it across the pool.
  {
    ...base, id: 'w2-spillway', name: 'Spillway', sector: '2-1', difficulty: 1, par: 1,
    briefing: 'Water drag eats speed fast. Too soft and the cue sinks — the forecast shows your entry speed.',
    floors: [rect(-6, 8, -1.5, 1.5, 0, 'tile')],
    walls: rails(-6, 8, -1.5, 1.5),
    water: [zone(0, 3, -1.5, 1.5)],
    balls: [{ kind: 'cue', x: -4.5, z: 0 }],
    pockets: [{ id: 'fin', x: 6.6, z: 0, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Cross the pool and sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 1, z: 0, dist: 19 },
  },
  // 2-2 ─ Choose a route: brute force through deep water or bank around it.
  {
    ...base, id: 'w2-ford', name: 'Ford or Detour', sector: '2-2', difficulty: 2, par: 1,
    briefing: 'A deep pool blocks the straight line. Power through it — or bank the dry way round.',
    floors: [rect(-6, 6, -5, 5, 0, 'tile')],
    walls: [...rails(-6, 6, -5, 5), seg(-1, 1.6, -1, 5), seg(2.6, 1.6, 2.6, 5)],
    water: [zone(-1, 2.6, -5, 1.6)],
    balls: [{ kind: 'cue', x: -4.5, z: -3.2 }],
    pockets: [{ id: 'fin', x: 4.6, z: -3.6, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  // 2-3 ─ River drift: aim upstream; the channel spills off the south edge.
  {
    ...base, id: 'w2-undertow', name: 'Undertow', sector: '2-3', difficulty: 2, par: 1,
    briefing: 'The river pushes south toward the falls. Aim upstream and give it enough pace to cross.',
    floors: [rect(-7, -1.5, -4, 4, 0, 'tile'), rect(-1.5, 1.5, -4, 6.5, 0, 'tile'), rect(1.5, 7, -4, 4, 0, 'tile')],
    walls: [
      seg(-7, -4, 7, -4), seg(-7, -4, -7, 4), seg(7, -4, 7, 4),
      seg(-7, 4, -1.5, 4), seg(1.5, 4, 7, 4),
      seg(-1.5, 4, -1.5, 6.5), seg(1.5, 4, 1.5, 6.5),
    ],
    currents: [{ ...zone(-1.5, 1.5, -4, 6.5), fx: 0, fz: 3.2 }],
    balls: [{ kind: 'cue', x: -5.5, z: 2.4 }],
    pockets: [{ id: 'fin', x: 5.6, z: 2.4, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Cross the river & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 1, dist: 22 },
  },
  // 2-4 ─ Holes: a sphere drops if it hangs over the opening longer than √(2h/g).
  {
    ...base, id: 'w2-potholes', name: 'Pothole Row', sector: '2-4', difficulty: 3, par: 1,
    briefing: 'Open drains in the deck. Fast spheres skim over, slow ones drop. The last stretch is wet.',
    floors: [rect(-7, 7.5, -1.2, 1.2, 0, 'tile')],
    walls: rails(-7, 7.5, -1.2, 1.2),
    holes: [{ x: -2.4, z: 0, r: 0.55 }, { x: 0.6, z: 0.15, r: 0.6 }, { x: 3.4, z: -0.2, r: 0.6 }],
    water: [zone(4.6, 6.0, -1.2, 1.2)],
    balls: [{ kind: 'cue', x: -6, z: 0 }],
    pockets: [{ id: 'fin', x: 6.8, z: 0, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Skim the drains & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0.3, z: 0, dist: 19 },
  },
  // 2-5 ─ Glass: only a hard enough NORMAL impact (≥3 m/s) shatters it. Glancing blows bounce.
  {
    ...base, id: 'w2-glass', name: 'Glass Partition', sector: '2-5', difficulty: 3, par: 2,
    briefing: 'Glass shatters only at ≥3 m/s of NORMAL impact. The divider forces a bank, so your hit on the panel is oblique — read the forecast.',
    floors: [rect(-6, 6, -4, 4, 0, 'concrete')],
    walls: [...rails(-6, 6, -4, 4), seg(1.5, -4, 1.5, -1.6), seg(1.5, 1.6, 1.5, 4), { ...wall('glass', 1.5, -1.6, 1.5, 1.6), id: 'pane' }, seg(-2.5, -0.8, -2.5, 4)],
    balls: [{ kind: 'cue', x: -4.5, z: 2.8 }],
    pockets: [{ id: 'fin', x: 4.6, z: 0, color: 'finish', style: 'snooker' }],
    objectives: [{ label: 'Shatter the glass partition', signal: 'broken:pane' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  // 2-6 ─ Bumper plate: adds a kick along its normal, so θ_out ≠ θ_in. South edge is open.
  {
    ...base, id: 'w2-rebound', name: 'Rebound Chamber', sector: '2-6', difficulty: 4, par: 1,
    briefing: 'The magenta plate kicks back harder than you hit it — the exit angle steepens. Miss the pocket and you fly off the open edge.',
    floors: [rect(-5, 5, -3, 3, 0, 'concrete')],
    walls: [wall('bumper', -5, -3, 5, -3), seg(-5, -3, -5, 3), seg(5, -3, 5, 3), seg(-1.0, -0.2, -1.0, 3)],
    balls: [{ kind: 'cue', x: -3.2, z: 2.2 }],
    pockets: [{ id: 'fin', x: 2.6, z: 2.4, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Kick off the bumper into the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 19 },
  },
  // 2-7 ─ Switch across the river; the river spills off the east edge.
  {
    ...base, id: 'w2-sluice', name: 'Sluice Gate', sector: '2-7', difficulty: 4, par: 2,
    briefing: 'The sluice switch is on the far bank. Cross the river to trigger it, then cross back through the open gate.',
    floors: [rect(-7, 7, -6, 6, 0, 'tile'), rect(7, 8.5, -1, 1, 0, 'tile')],
    walls: [
      seg(-7, -6, 7, -6), seg(-7, 6, 7, 6), seg(-7, -6, -7, 6),
      seg(7, -6, 7, -1), seg(7, 1, 7, 6), seg(7, -1, 8.5, -1), seg(7, 1, 8.5, 1),
      seg(2.8, 2.6, 2.8, 6),
    ],
    currents: [{ ...zone(-7, 8.5, -1, 1), fx: 3.6, fz: 0 }],
    switches: [{ id: 'sl', type: 'toggle', x: 1.5, z: -4.2 }],
    barriers: [{ id: 'gate', kind: 'gate', box: seg(2.8, 2.6, 7, 2.6), requires: ['sl'], label: 'SLUICE GATE' }],
    balls: [{ kind: 'cue', x: -4, z: 4 }],
    pockets: [{ id: 'fin', x: 5, z: 4.6, color: 'finish', requires: ['sl'], style: 'american' }],
    objectives: [
      { label: 'Trigger the SLUICE switch', signal: 'sl' },
      { label: 'Sink the FINISH', signal: 'sunk:fin' },
    ],
    camera: { x: 0.5, z: 0, dist: 24 },
  },
  // 2-8 ─ Concrete: two hits ≥4 m/s each. A pool in front bleeds your speed.
  {
    ...base, id: 'w2-concrete', name: 'Concrete Lock', sector: '2-8', difficulty: 4, par: 3,
    briefing: 'Concrete needs two impacts of 4 m/s or more — and the moat in front drains your pace. Then pot the red.',
    floors: [rect(-6, 6, -5, 5, 0, 'concrete')],
    walls: [...rails(-6, 6, -5, 5), seg(-6, -1, -1.6, -1), seg(1.6, -1, 6, -1), { ...wall('concrete', -1.6, -1, 1.6, -1), id: 'lock' }],
    water: [zone(-1.6, 1.6, -0.85, 1.3)],
    balls: [{ kind: 'cue', x: 0, z: 3.6 }, { kind: 'red', x: 1.2, z: -2.6, required: true }],
    pockets: [{ id: 'rp', x: 5.35, z: -4.35, color: 'red', style: 'snooker' }],
    objectives: [{ label: 'Break the concrete lock', signal: 'broken:lock' }, { label: 'Sink RED in the red pocket', signal: 'sunk:rp' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  // 2-9 ─ Bumper field with drains between the posts.
  {
    ...base, id: 'w2-pinball', name: 'Pinball Basin', sector: '2-9', difficulty: 5, par: 2,
    briefing: 'Kick posts and open drains. Every post adds 3 m/s along its normal — read the forecast before you commit.',
    floors: [rect(-6, 6, -5, 5, 0, 'tile')],
    walls: rails(-6, 6, -5, 5),
    bumpers: [{ x: -2, z: 1, r: 0.45 }, { x: 0.5, z: -1, r: 0.45 }, { x: 2.5, z: 1.8, r: 0.45 }, { x: -0.5, z: 3, r: 0.45 }, { x: 3, z: -3, r: 0.45 }],
    holes: [{ x: -1.2, z: -1.6, r: 0.6 }, { x: 1.7, z: 0.3, r: 0.55 }, { x: 0.6, z: 2.2, r: 0.5 }, { x: 4.3, z: -1.2, r: 0.55 }],
    balls: [{ kind: 'cue', x: -4.5, z: 3.8 }],
    pockets: [{ id: 'fin', x: 5.2, z: -4.2, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Thread the basin & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  // 2-10 ─ Stop dead on an island: enough to cross the water, little enough to stay on 2.4 m of dry deck.
  {
    ...base, id: 'w2-reservoir', name: 'Reservoir', sector: '2-10', difficulty: 5, par: 2,
    briefing: 'Land the cue on the island switch and let it REST there — swim 3 m of water, then let the rubber brake-mat stop you.',
    floors: [rect(-8, 8, -5, 5, 0, 'tile'), rect(0, 2.4, -1.2, 1.2, 0, 'rubber')],
    walls: [...rails(-8, 8, -5, 5), seg(6.0, -2, 8, -2), seg(6.0, 2, 8, 2)],
    water: [zone(-3, 0, -5, 5), zone(2.4, 5, -5, 5), zone(0, 2.4, -5, -1.2), zone(0, 2.4, 1.2, 5)],
    // the island is a ribbed rubber brake-mat — the only way to stop on 2.4 m after the swim

    switches: [{ id: 'isl', type: 'hold', x: 1.2, z: 0 }],
    barriers: [{ id: 'lock', kind: 'gate', box: seg(6.0, -2, 6.0, 2), requires: ['isl'], latch: true, label: 'FLOOD LOCK' }],
    balls: [{ kind: 'cue', x: -6, z: 0 }],
    pockets: [{ id: 'fin', x: 7.2, z: 0, color: 'finish', requires: ['lock'], style: 'standard' }],
    objectives: [{ label: 'Rest the cue on the ISLAND switch', signal: 'lock' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 24 },
  },
  // 2-11 ─ Portal fed through a river; the exit drives into a glass wall.
  {
    ...base, id: 'w2-turbine', name: 'Turbine Hall', sector: '2-11', difficulty: 6, par: 2,
    briefing: 'Fight the turbine current into the portal. Your exit speed equals your entry speed — it must still shatter the glass.',
    floors: [rect(-11, -3, -3, 3, 0, 'tile'), rect(2, 9, -3, 3, 0, 'concrete')],
    walls: [
      seg(-11, 3, -3, 3), seg(-11, -3, -11, 3), seg(-11, -3, -8, -3), seg(-6, -3, -3, -3),
      seg(-3, -3, -3, -0.95), seg(-3, 0.95, -3, 3),
      ...rails(2, 9, -3, 3), { ...wall('glass', 6, -3, 6, 3), id: 'turbine' },
    ],
    currents: [{ ...zone(-8, -6, -3, 3), fx: 0, fz: -3.4 }],
    portals: [
      { id: 'pa', link: 'pb', x: -3.3, z: 0, facing: 180, width: 1.8 },
      { id: 'pb', link: 'pa', x: 2.3, z: 1.8, facing: 0, width: 1.6 },
    ],
    balls: [{ kind: 'cue', x: -10, z: 1.5 }],
    pockets: [{ id: 'fin', x: 8.2, z: -2.2, color: 'finish', style: 'snooker' }],
    objectives: [{ label: 'Shatter the turbine glass', signal: 'broken:turbine' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -1, z: 0, dist: 27 },
  },
  // 2-12 ─ Two spheres, two pockets, one river between them.
  {
    ...base, id: 'w2-delta', name: 'Delta', sector: '2-12', difficulty: 6, par: 4,
    briefing: 'Red and blue must each reach their own pocket on the far side of the river. Object balls drift too.',
    floors: [rect(-5, 5, -4, 4, 0, 'tile'), rect(5, 6.5, -0.8, 0.8, 0, 'tile')],
    walls: [
      seg(-5, -4, 5, -4), seg(-5, 4, 5, 4), seg(-5, -4, -5, 4),
      seg(5, -4, 5, -0.8), seg(5, 0.8, 5, 4), seg(5, -0.8, 6.5, -0.8), seg(5, 0.8, 6.5, 0.8),
    ],
    currents: [{ ...zone(-5, 6.5, -0.8, 0.8), fx: 2.6, fz: 0 }],
    holes: [{ x: 2.2, z: 2.6, r: 0.5 }, { x: 2.2, z: -2.6, r: 0.5 }],
    balls: [{ kind: 'cue', x: -4, z: 3 }, { kind: 'red', x: -0.5, z: 1.8, required: true }, { kind: 'blue', x: -0.5, z: -1.8, required: true }],
    pockets: [{ id: 'rp', x: 4.35, z: -3.35, color: 'red', style: 'american' }, { id: 'bp', x: 4.35, z: 3.35, color: 'blue', style: 'american' }],
    objectives: [{ label: 'Sink RED (north-east, across the river)', signal: 'sunk:rp' }, { label: 'Sink BLUE (south-east, across the river)', signal: 'sunk:bp' }],
    camera: { x: 0.5, z: 0, dist: 19 },
  },
  // 2-13 ─ Expert: one shot must break glass, clear a drain AND stop on a ledge switch.
  {
    ...base, id: 'w2-cascade', name: 'Cascade Ledge', sector: '2-13', difficulty: 7, par: 2,
    briefing: 'One stroke: shatter the glass (≥3 m/s), keep enough pace to skim the drain, then let the rubber brake-mat stop you ON the ledge switch before the drop.',
    floors: [rect(-8, 7, -1.3, 1.3, 0, 'tile'), rect(2.0, 7, -1.3, 1.3, 0, 'rubber'), rect(3, 7, 4, 6.5, 0, 'concrete')],
    walls: [
      seg(-8, -1.3, 7, -1.3), seg(-8, -1.3, -8, 1.3), seg(-8, 1.3, 4.6, 1.3), seg(6.6, 1.3, 7, 1.3),
      wall('glass', -2, -1.3, -2, 1.3),
      seg(3, 6.5, 7, 6.5), seg(7, 4, 7, 6.5), seg(3, 4, 3, 6.5), seg(3, 4, 4.6, 4), seg(6.6, 4, 7, 4),
    ],
    holes: [{ x: -0.6, z: 0, r: 0.3 }],
    switches: [{ id: 'ledge', type: 'hold', x: 5.6, z: 0 }],
    barriers: [{ id: 'bridge', kind: 'bridge', box: { x: 5.6, z: 2.65, w: 2.0, d: 2.7, y: 0 }, requires: ['ledge'], latch: true, label: 'SPILL BRIDGE' }],
    balls: [{ kind: 'cue', x: -6.8, z: 0 }],
    pockets: [{ id: 'fin', x: 5.6, z: 5.6, color: 'finish', requires: ['bridge'], style: 'standard' }],
    objectives: [{ label: 'Rest on the LEDGE switch (one clean stroke)', signal: 'bridge' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -0.5, z: 1.5, dist: 23 },
  },
  // 2-14 ─ Expert finale: river, concrete, bumper, toggle, gate, red sphere.
  {
    ...base, id: 'w2-floodgate', name: 'Floodgate', sector: '2-14', difficulty: 7, par: 4,
    briefing: 'Everything at once. Breach the concrete vault hard enough that the cue rolls on onto its switch, ferry the red across the river, then finish.',
    floors: [rect(-9, 9, -6, 6, 0, 'concrete'), rect(-1, 1, 6, 7.5, 0, 'tile')],
    walls: [
      seg(-9, -6, 9, -6), seg(-9, -6, -9, 6), seg(9, -6, 9, 6),
      seg(-9, 6, -1, 6), seg(1, 6, 9, 6), seg(-1, 6, -1, 7.5), seg(1, 6, 1, 7.5),
      // vault around the switch (north-west), concrete front
      seg(-9, -2.5, -6.2, -2.5), { ...wall('concrete', -6.2, -2.5, -3.6, -2.5), id: 'vault' }, seg(-3.6, -2.5, -3.6, -3.8),
      // bumper plate on the east wall
      wall('bumper', 8.8, -5.5, 8.8, -1.5),
      // finish enclosure (south-east), gated
      seg(4, 3, 4, 6),
    ],
    currents: [{ ...zone(-1, 1, -6, 7.5), fx: 0, fz: 3.0 }],
    switches: [{ id: 'fs', type: 'toggle', x: -4.9, z: -4.4 }],
    barriers: [{ id: 'fg', kind: 'gate', box: seg(4, 3, 9, 3), requires: ['fs', 'sunk:rp'], label: 'FLOODGATE' }],
    balls: [{ kind: 'cue', x: -6, z: 3.5 }, { kind: 'red', x: -2.4, z: -4.6, required: true }],
    pockets: [{ id: 'rp', x: 4.2, z: -5.35, color: 'red', style: 'snooker' }, { id: 'fin', x: 6.5, z: 5, color: 'finish', requires: ['fg'], style: 'standard' }],
    objectives: [
      { label: 'Trigger the vault switch', signal: 'fs' },
      { label: 'Sink RED across the river', signal: 'sunk:rp' },
      { label: 'Sink the FINISH', signal: 'sunk:fin' },
    ],
    camera: { x: 0, z: 0, dist: 28 },
  },
];
