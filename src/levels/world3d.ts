import type { LevelDef } from './LevelTypes';
import { seg, rect, zone, rails, poolTable, island, incline, merge } from './helpers';

/**
 * WORLD 3 — CARAVANSERAI · part 4: HARD multi-level sectors
 * Dune inclines, qanat water channels, hitched camels (circular motion on a rope: the rope supplies the
 * centripetal force m·v²/L), runaway camels (snap the rope), mesas and the summit table.
 */
const base = { world: 3, theme: 'caravan' as const, switches: [], barriers: [], portals: [], hoops: [] };
const U = 'universal' as const;

export const WORLD3D: LevelDef[] = [
  {
    ...base, id: 'c-dune-face', name: 'Dune Face', sector: 'C26', difficulty: 6, par: 2,
    briefing: 'Climb the dune road to the plateau while a sandstorm gusts across it. The road has no walls — a gust on the climb blows you off the side.',
    ...merge(
      island(-12, -4, -3, 3, 0, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-4, 0, 0, 3, 0, 1.6, 2.4, 'tile')] },
      island(3, 10, -4, 4, 1.6, 'tile', '', [['w', -1.2, 1.2]]),
    ),
    winds: [{ ...zone(-3, 2, -3, 3), fx: 0, fz: 10, gust: { open: 1.4, closed: 1.8 } }],
    balls: [{ kind: 'cue', x: -10, z: 0 }],
    pockets: [{ id: 'fin', x: 8.5, z: -2.5, y: 1.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Climb the dune & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -1, z: 0, dist: 25 },
  },
  {
    ...base, id: 'c-hitching-post', name: 'Hitching Post', sector: 'C27', difficulty: 6, par: 2,
    briefing: 'The camel is hitched to a post. It can only move on its rope circle — the rope pulls it round (centripetal force). Strike it along the circle so it swings round behind the wall into the stall.',
    floors: [rect(-8, 8, -5, 5, 0, 'tile')],
    walls: [...rails(-8, 8, -5, 5), seg(2.6, -1.4, 2.6, 1.4)],
    tethers: [{ ball: 1, x: 0, z: 0, len: 3.4 }],
    balls: [{ kind: 'cue', x: -5.5, z: -3.5 }, { kind: 'orange', num: 1, x: -3.4, z: 0, required: true }],
    pockets: [{ id: 'stall', x: 3.4, z: 0, color: U, style: 'american' }],
    objectives: [{ label: 'Swing the camel into its stall', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  {
    ...base, id: 'c-qanat', name: 'Qanat', sector: 'C28', difficulty: 6, par: 3,
    briefing: 'An underground qanat carries water from the mountain to the oasis. Drop into its channel in the right speed window; the oasis shallows will brake you at the far end.',
    ...merge(
      island(-12, -4, -3, 3, 2.2, 'tile', '', [['e', -0.8, 0.8]]),
      island(-6, 8, 7, 14, 0, 'tile'),
    ),
    chutes: [{ id: 'q', points: [[-4, 2.2, 0], [-2, 2.1, 0], [0, 1.6, 0.4], [1.8, 1.1, 1.8], [2.2, 0.6, 4], [0.8, 0.2, 6], [-1.5, 0, 8]], bank: 30 }],
    water: [{ ...zone(-6, 2, 8, 14), shallow: true }],
    balls: [{ kind: 'cue', x: -10.5, z: 1.5, y: 2.2 }],
    pockets: [{ id: 'fin', x: 6.5, z: 12.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Through the qanat & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -2, z: 5, dist: 30 },
  },
  {
    ...base, id: 'c-caravan-climb', name: 'Caravan Climb', sector: 'C29', difficulty: 6, par: 3,
    briefing: 'Haul the roped pair up the incline to the upper market. The rope only pulls: drive the lead camel up and the second follows — if the lead stalls, both roll back down.',
    ...merge(
      island(-10, -3, -3, 3, 0, 'tile', '', [['e', -1.5, 1.5]]),
      { slopes: [incline(-3, 0, 0, 2, 0, 1, 3, 'tile')] },
      (() => { const t = poolTable(2, 10, -3, 3, [{ id: 'a', at: 'ne', color: U }, { id: 'b', at: 'se', color: U }, { id: 'c', at: 'e', color: U }], { y: 1, gaps: [['w', -1.5, 1.5]] }); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; })(),
    ),
    chains: [[1, 2, 1.4]],
    balls: [{ kind: 'cue', x: -8.5, z: 0 }, { kind: 'orange', num: 1, x: -5, z: 0, required: true }, { kind: 'purple', num: 2, x: -6.2, z: 0.6, required: true }],
    objectives: [{ label: 'Both camels into the upper stalls', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 24 },
  },
  {
    ...base, id: 'c-badgir-jump', name: 'Badgir Jump', sector: 'C30', difficulty: 6, par: 2,
    briefing: 'A dune kicker throws you across the gap to a narrow mesa — through a sandstorm. Time the jump so the gust does not push you off the landing.',
    ...merge(
      island(-12, -3, -3, 3, 0, 'tile', 'e'),
      island(4, 8, -1.5, 1.5, 0, 'tile', 'w'),
      island(8, 13, -4, 4, 0, 'tile', '', [['w', -1.5, 1.5]]),
    ),
    ramps: [{ x: -3.6, z: 0, w: 1.2, d: 6, facing: 0, lift: 0.35 }],
    winds: [{ ...zone(-3, 8, -4, 4), fx: 0, fz: 7, gust: { open: 1.2, closed: 2 } }],
    balls: [{ kind: 'cue', x: -10, z: 0 }],
    pockets: [{ id: 'fin', x: 11.5, z: 2.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Jump the gap & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 25 },
  },
  {
    ...base, id: 'c-three-mesas', name: 'Three Mesas', sector: 'C31', difficulty: 7, par: 5,
    briefing: 'Three mesas at three heights. Ring the bell on the high mesa to open the gate on the low one, then take the qanat down. Every incline changes your pace.',
    ...merge(
      island(-12, -5, -3, 3, 0, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-5, 0, 0, 0, 0, 1.8, 2.4, 'tile')] },
      island(0, 6, -3, 3, 1.8, 'tile', '', [['w', -1.2, 1.2], ['e', -0.8, 0.8]]),
      island(6, 16, 7, 13, 0, 'tile'),
    ),
    chutes: [{ id: 'q', points: [[6, 1.8, 0], [8, 1.7, 0], [10, 1.2, 1.4], [10.6, 0.7, 4], [10, 0, 8.5]], bank: 32 }],
    switches: [{ id: 'bell', type: 'toggle', x: 3, z: 2, y: 1.8 }],
    barriers: [{ id: 'gate', kind: 'gate', box: seg(12, 7, 12, 13), requires: ['bell'], latch: true, label: 'GATE' }],
    balls: [{ kind: 'cue', x: -10.5, z: 1.5 }],
    pockets: [{ id: 'fin', x: 14.5, z: 11.5, color: 'finish', requires: ['bell'], style: 'standard' }],
    objectives: [{ label: 'Ring the bell on the high mesa', signal: 'bell' }, { label: 'Qanat → gate → FINISH', signal: 'sunk:fin' }],
    camera: { x: 2, z: 5, dist: 36 },
  },
  {
    ...base, id: 'c-runaway-camel', name: 'Runaway Camel', sector: 'C32', difficulty: 7, par: 3,
    briefing: 'The camel is tied at the top of the dune. Snap its rope with a hard hit and it runs down the dune road into the stall below — but keep your own sphere on the plateau.',
    ...merge(
      island(-6, 4, -4, 4, 1.6, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(4, 0, 1.6, 9, 0, 0, 2.4, 'tile')] },
      island(9, 15, -4, 4, 0, 'tile', '', [['w', -1.2, 1.2]]),
    ),
    tethers: [{ ball: 1, x: 1.2, z: 0, len: 1.2, snapSpeed: 15 }],
    balls: [{ kind: 'cue', x: -4, z: 2.5, y: 1.6 }, { kind: 'orange', num: 1, x: 1.2, z: 1.2, y: 1.6, required: true }],
    pockets: [{ id: 'stall', x: 13.5, z: 2.5, color: U, style: 'standard' }],
    objectives: [{ label: 'Snap the camel loose', signal: 'snap:0' }, { label: 'Camel into the stall below', signal: 'cleared' }],
    camera: { x: 4.5, z: 0, dist: 26 },
  },
  {
    ...base, id: 'c-silk-summit', name: 'Silk Summit', sector: 'C33', difficulty: 7, par: 5,
    briefing: 'The summit market: climb two dune roads through the storm, then play rotation on the summit table — 1 then 2. A miss on the table can roll you back down.',
    rule: 'rotation',
    ...merge(
      island(-14, -8, -3, 3, 0, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-8, 0, 0, -4, 0, 1, 2.4, 'tile'), incline(0, 0, 1, 4, 0, 2, 2.4, 'tile')] },
      island(-4, 0, -2.5, 2.5, 1, 'tile', '', [['w', -1.2, 1.2], ['e', -1.2, 1.2]]),
      (() => { const t = poolTable(4, 12, -3, 3, [{ id: 'a', at: 'ne', color: U }, { id: 'b', at: 'se', color: U }, { id: 'c', at: 'n', color: U }, { id: 'd', at: 's', color: U }], { y: 2, gaps: [['w', -1.2, 1.2]] }); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; })(),
    ),
    winds: [{ ...zone(-8, -4, -3, 3), fx: 0, fz: 8, gust: { open: 1.5, closed: 2 } }],
    balls: [{ kind: 'cue', x: -12.5, z: 0 }, { kind: 'yellow', num: 1, x: 8, z: -1.5, y: 2, required: true }, { kind: 'blue', num: 2, x: 9.5, z: 1.4, y: 2, required: true }],
    objectives: [{ label: 'Summit rotation: 1 → 2', signal: 'cleared' }],
    camera: { x: -1, z: 0, dist: 30 },
  },
];
