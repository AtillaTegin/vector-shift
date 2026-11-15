import type { LevelDef } from './LevelTypes';
import { seg, wall, rect, zone, rails, poolTable } from './helpers';

/**
 * WORLD 2 — HYDRO STATION · part 2
 * New hydro mechanics: shallows (drag, no sinking), whirlpools (swirl + suction + drain), drain holes with
 * timed sliding lids, pump valves that reverse a river, spinning turbine bars — mixed with earlier tools.
 */
const base = { world: 2, theme: 'hydro' as const, switches: [], barriers: [], portals: [], hoops: [] };
const T = (...a: Parameters<typeof poolTable>) => { const t = poolTable(...a); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; };

export const WORLD2B: LevelDef[] = [
  {
    ...base, id: 'h-shallows', name: 'Shallows', sector: 'H1', difficulty: 1, par: 2,
    briefing: 'Shallow water: it slows the ball but you cannot sink here. Learn how much pace the shallows eat.',
    floors: [rect(-8, 8, -2, 2, 0, 'tile')], walls: rails(-8, 8, -2, 2),
    water: [{ ...zone(-3, 3, -2, 2), shallow: true }],
    balls: [{ kind: 'cue', x: -6.5, z: 0 }],
    pockets: [{ id: 'fin', x: 6.8, z: 0, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Wade through & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 19 },
  },
  {
    ...base, id: 'h-whirlpool', name: 'Whirlpool', sector: 'H2', difficulty: 2, par: 2,
    briefing: 'A whirlpool spins anticlockwise and sucks toward its drain. Skim its rim and let the swirl bend you toward the finish — linger and you are drained.',
    floors: [rect(-7, 7, -4, 4, 0, 'tile')], walls: rails(-7, 7, -4, 4),
    vortices: [{ x: 0, z: 0, r: 2.3, swirl: 9, pull: 4 }],
    balls: [{ kind: 'cue', x: -5.5, z: 2.6 }],
    pockets: [{ id: 'fin', x: 5.6, z: -2.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Ride the swirl & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'h-lids', name: 'Drain Lids', sector: 'H3', difficulty: 3, par: 2,
    briefing: 'Three wide drains with sliding lids. Open drains need a skim speed you cannot reach — time your stroke so every lid is shut as you pass.',
    floors: [rect(-10, 10, -1.8, 1.8, 0, 'tile')], walls: rails(-10, 10, -1.8, 1.8),
    holes: [
      { x: -4, z: 0, r: 0.75, cycle: { open: 1.4, closed: 1.8 } },
      { x: 0, z: 0, r: 0.75, cycle: { open: 1.4, closed: 1.8, offset: 0.5 } },
      { x: 4, z: 0, r: 0.75, cycle: { open: 1.4, closed: 1.8, offset: 1.0 } },
    ],
    balls: [{ kind: 'cue', x: -8.5, z: 0 }],
    pockets: [{ id: 'fin', x: 8.6, z: 0, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Pass the drains & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  {
    ...base, id: 'h-pump', name: 'Pump Room', sector: 'H4', difficulty: 3, par: 3,
    briefing: 'The river runs east to the falls. Hit the pump switch and the valve reverses it — now it carries you safely west while you cross.',
    floors: [rect(-7, 7, -6, 6, 0, 'tile'), rect(7, 8.5, -1, 1, 0, 'tile')],
    walls: [seg(-7, -6, 7, -6), seg(-7, 6, 7, 6), seg(-7, -6, -7, 6), seg(7, -6, 7, -1), seg(7, 1, 7, 6), seg(7, -1, 8.5, -1), seg(7, 1, 8.5, 1)],
    currents: [{ ...zone(-7, 8.5, -1, 1), fx: 4, fz: 0, when: 'pump' }],
    switches: [{ id: 'pump', type: 'toggle', x: -2.5, z: 3.5 }],
    balls: [{ kind: 'cue', x: -5.5, z: 4.6 }],
    pockets: [{ id: 'fin', x: 4.5, z: -4.6, color: 'finish', requires: ['pump'], style: 'standard' }],
    objectives: [{ label: 'Reverse the river (pump)', signal: 'pump' }, { label: 'Cross & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0.5, z: 0, dist: 24 },
  },
  {
    ...base, id: 'h-turbine', name: 'Turbine Gate', sector: 'H5', difficulty: 4, par: 2,
    briefing: 'A turbine bar sweeps in front of the pocket. The aim line knows where the bar will be when you arrive — pick your moment.',
    floors: [rect(-7, 7, -4, 4, 0, 'concrete')], walls: rails(-7, 7, -4, 4),
    barriers: [{ id: 'tb', kind: 'gate', spin: 1.3, box: seg(-0.4, 0, 4.4, 0), requires: [], label: 'TURBINE' }],
    balls: [{ kind: 'cue', x: -5, z: 0.6 }],
    pockets: [{ id: 'fin', x: 5.8, z: 0, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Slip past the turbine & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'h-rotation', name: 'Hydro Rotation', sector: 'H6', difficulty: 4, par: 3,
    briefing: 'A pool table split by a channel of flowing water. Rotation rules, 1 → 2 → 3 — and every ball that crosses the channel drifts.',
    rule: 'rotation',
    ...T(-7, 7, -3.5, 3.5, [
      { id: 'a', at: 'nw', color: 'universal' }, { id: 'b', at: 'ne', color: 'universal' },
      { id: 'c', at: 'sw', color: 'universal' }, { id: 'd', at: 'se', color: 'universal' },
    ], { style: 'tile' }),
    currents: [{ ...zone(-1, 1, -3.5, 3.5), fx: 0, fz: 2.5 }],
    balls: [
      { kind: 'cue', x: -4.5, z: 0 },
      { kind: 'yellow', num: 1, x: -2.5, z: -1.5, required: true }, { kind: 'blue', num: 2, x: 3, z: 1.2, required: true },
      { kind: 'red', num: 3, x: 4.2, z: -1.6, required: true },
    ],
    objectives: [{ label: 'Clear 1 → 2 → 3', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'h-aquarium', name: 'Aquarium', sector: 'H7', difficulty: 4, par: 3,
    briefing: 'The finish sits in a glass tank inside a deep moat. Cross the moat fast enough to still hit the glass at 10 u/s, then pot.',
    floors: [rect(-7, 7, -6, 6, 0, 'tile')], walls: [
      ...rails(-7, 7, -6, 6),
      { ...wall('glass', -1.5, -1.5, 1.5, -1.5), id: 'gN' }, { ...wall('glass', 1.5, -1.5, 1.5, 1.5), id: 'gE' },
      { ...wall('glass', 1.5, 1.5, -1.5, 1.5), id: 'gS' }, { ...wall('glass', -1.5, 1.5, -1.5, -1.5), id: 'gW' },
    ],
    water: [zone(-2.9, 2.9, -2.9, -1.65), zone(-2.9, 2.9, 1.65, 2.9), zone(-2.9, -1.65, -1.65, 1.65), zone(1.65, 2.9, -1.65, 1.65)],
    balls: [{ kind: 'cue', x: -5, z: 4.5 }],
    pockets: [{ id: 'fin', x: 0, z: 0, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Break into the tank & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  {
    ...base, id: 'h-twin-vortex', name: 'Twin Vortex', sector: 'H8', difficulty: 5, par: 3,
    briefing: 'Two whirlpools spinning opposite ways. Thread the S-curve between them — each one bends your line the other way.',
    floors: [rect(-10, 10, -4, 4, 0, 'tile')], walls: rails(-10, 10, -4, 4),
    vortices: [{ x: -3, z: -1, r: 2.2, swirl: 10, pull: 4 }, { x: 3, z: 1, r: 2.2, swirl: -10, pull: 4 }],
    balls: [{ kind: 'cue', x: -8.5, z: 2.6 }],
    pockets: [{ id: 'fin', x: 8.6, z: -2.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Thread both whirlpools & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 24 },
  },
  {
    ...base, id: 'h-spillway-course', name: 'Spillway Course', sector: 'H9', difficulty: 5, par: 5,
    briefing: 'A mini-golf run down the spillway: shallows, a lid-covered drain bridge, a river crossing above the falls, and a brake-mat green.',
    floors: [
      rect(-14, -4, -2.5, 2.5, 0, 'tile'), rect(-4, 4, -1.2, 1.2, 0, 'concrete'), rect(4, 10, -2.5, 2.5, 0, 'tile'),
      rect(6.5, 10, -12, -2.5, 0, 'tile'), rect(6.5, 10, -12, -9, 0, 'rubber'),
    ],
    walls: [
      ...rails(-14, -4, -2.5, 2.5, '', [['e', -1.2, 1.2]]),
      seg(-4, -1.2, 4, -1.2), seg(-4, 1.2, 4, 1.2),
      seg(4, -1.2, 4, -2.5), seg(4, 1.2, 4, 2.5), seg(4, 2.5, 10, 2.5), seg(10, 2.5, 10, -12), seg(10, -12, 6.5, -12), seg(6.5, -12, 6.5, -2.5),
    ],
    water: [{ ...zone(-11, -7, -2.5, 2.5), shallow: true }],
    holes: [{ x: -1, z: 0, r: 0.65, cycle: { open: 1.3, closed: 1.7 } }, { x: 2, z: 0, r: 0.65, cycle: { open: 1.3, closed: 1.7, offset: 0.9 } }],
    currents: [{ ...zone(6.5, 10, -6.5, -5), fx: -3.5, fz: 0 }],
    balls: [{ kind: 'cue', x: -12.5, z: 0 }],
    pockets: [{ id: 'fin', x: 8.2, z: -10.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Hole out at the bottom of the spillway', signal: 'sunk:fin' }],
    camera: { x: -1, z: -4, dist: 34 },
  },
  {
    ...base, id: 'h-pressure-lock', name: 'Pressure Lock', sector: 'H10', difficulty: 6, par: 5,
    briefing: 'Two code keys sit on opposite banks of a pumped river. Key 1, cross, key 2 — the code drains the lock and the river turns. Then crack the concrete.',
    floors: [rect(-8, 8, -6, 6, 0, 'concrete'), rect(8, 9.5, -1, 1, 0, 'tile')],
    walls: [
      seg(-8, -6, 8, -6), seg(-8, 6, 8, 6), seg(-8, -6, -8, 6), seg(8, -6, 8, -1), seg(8, 1, 8, 6), seg(8, -1, 9.5, -1), seg(8, 1, 9.5, 1),
      seg(3, -6, 3, -4), { ...wall('concrete', 3, -4, 6, -4), id: 'lock' }, seg(6, -4, 8, -4),
    ],
    currents: [{ ...zone(-8, 9.5, -1, 1), fx: 4, fz: 0, when: 'code:p' }],
    switches: [
      { id: 'p1', type: 'code', group: 'p', order: 1, x: -5, z: 4 },
      { id: 'p2', type: 'code', group: 'p', order: 2, x: -4, z: -4 },
    ],
    balls: [{ kind: 'cue', x: -6.5, z: 2.5 }],
    pockets: [{ id: 'fin', x: 5.6, z: -5.2, color: 'finish', requires: ['code:p'], style: 'standard' }],
    objectives: [{ label: 'Enter the 2-key code', signal: 'code:p' }, { label: 'Breach the concrete', signal: 'broken:lock' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 26 },
  },
  {
    ...base, id: 'h-dam-break', name: 'Dam Break', sector: 'H11', difficulty: 7, par: 6,
    briefing: 'The whole station: shallows, a whirlpool field, a turbine gate, a pump-reversed river above the falls and a glass-walled finish.',
    floors: [
      rect(-20, -10, -3, 3, 0, 'tile'), rect(-10, 0, -4, 4, 0, 'tile'), rect(0, 10, -4, 4, 0, 'concrete'), rect(10, 11.5, -0.9, 0.9, 0, 'tile'),
      rect(2, 10, -14, -4, 0, 'tile'),
    ],
    walls: [
      ...rails(-20, -10, -3, 3, '', [['e', -3, 3]]),
      seg(-10, -4, 2, -4), seg(-10, 4, 10, 4), seg(-10, -4, -10, -3), seg(-10, 3, -10, 4),
      seg(10, 4, 10, 0.9), seg(10, -0.9, 10, -14), seg(10, 0.9, 11.5, 0.9), seg(10, -0.9, 11.5, -0.9),
      seg(10, -14, 2, -14), seg(2, -14, 2, -4),
      { ...wall('glass', 2, -10, 10, -10), id: 'gfin' },
    ],
    water: [{ ...zone(-18, -12, -3, 3), shallow: true }],
    vortices: [{ x: -6, z: -1.5, r: 1.8, swirl: 9, pull: 4 }, { x: -3, z: 1.8, r: 1.6, swirl: -9, pull: 4 }],
    barriers: [{ id: 'tb', kind: 'gate', spin: 1.1, box: seg(4, 0, 4, 3.6), requires: [], label: 'TURBINE' }],
    currents: [{ ...zone(2, 11.5, -0.9, 0.9), fx: 3.5, fz: 0, when: 'valve' }],
    switches: [{ id: 'valve', type: 'toggle', x: 7.5, z: 2.6 }],
    balls: [{ kind: 'cue', x: -18.5, z: 0 }],
    pockets: [{ id: 'fin', x: 6, z: -12.4, color: 'finish', requires: ['valve'], style: 'standard' }],
    objectives: [{ label: 'Reverse the river (valve)', signal: 'valve' }, { label: 'Shatter the dam glass', signal: 'broken:gfin' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -4, z: -4, dist: 46 },
  },
];
