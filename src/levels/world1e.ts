import type { LevelDef } from './LevelTypes';
import { seg, rect, rails, poolTable, island, incline, merge } from './helpers';

/**
 * WORLD 1 — CALIBRATION FOUNDRY · part 5: HARD multi-island sectors
 * New physics: inclined planes (g·sinθ along the fall line, friction ∝ normal force cosθ),
 * water-slide chutes (energy + banked-curve speed window), rope tension (T = m·v²/L, snaps on overload).
 */
const base = { world: 1, switches: [], barriers: [], portals: [], hoops: [] };
const U = 'universal' as const;

export const WORLD1E: LevelDef[] = [
  {
    ...base, id: 'w1-upper-table', name: 'Upper Table', sector: 'E1', difficulty: 6, par: 3,
    briefing: 'The red waits on a table 1.5 up an incline. Gravity eats your pace on the climb (g·sinθ) — arrive with exactly enough to pot it.',
    ...merge(
      island(-12, -4, -3, 3, 0, 'charcoal', '', [['e', -1.5, 1.5]]),
      { slopes: [incline(-4, 0, 0, 2, 0, 1.5, 3, 'steel')] },
      (() => { const t = poolTable(2, 10, -3, 3, [{ id: 'a', at: 'ne', color: U }, { id: 'b', at: 'se', color: U }, { id: 'c', at: 'e', color: U }], { y: 1.5, gaps: [['w', -1.5, 1.5]] }); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; })(),
    ),
    balls: [{ kind: 'cue', x: -10, z: 0.6 }, { kind: 'red', num: 3, x: 7, z: 1.2, y: 1.5, required: true }],
    objectives: [{ label: 'Pot the red on the upper table', signal: 'cleared' }],
    camera: { x: -1, z: 0, dist: 25 },
  },
  {
    ...base, id: 'w1-crane-hook', name: 'Crane Hook', sector: 'E2', difficulty: 6, par: 3,
    briefing: 'The red hangs from the crane post on a rope. Its circle never reaches a pocket — hit it hard enough to SNAP the rope (tension = m·v²/L), but straight enough to pot it.',
    ...(() => { const t = poolTable(-7, 7, -3.5, 3.5, [{ id: 'a', at: 'nw', color: U }, { id: 'b', at: 'ne', color: U }, { id: 'c', at: 'sw', color: U }, { id: 'd', at: 'se', color: U }]); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; })(),
    tethers: [{ ball: 1, x: 1, z: 0, len: 1.6, snapSpeed: 16 }],
    balls: [{ kind: 'cue', x: -5, z: 1.5 }, { kind: 'red', num: 3, x: 1, z: 1.5, required: true }],
    objectives: [{ label: 'Snap the rope', signal: 'snap:0' }, { label: 'Pot the red', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'w1-cascade', name: 'Cascade', sector: 'E3', difficulty: 6, par: 4,
    briefing: 'Three decks step down the foundry wall. Every incline adds speed — strike softly or you will fly off the next deck.',
    ...merge(
      island(-15, -8, -3, 3, 2, 'charcoal', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-8, 0, 2, -4, 0, 1, 2.4, 'steel'), incline(4, -5, 1, 4, -9, 0, 2.4, 'steel')] },
      island(-4, 7, -5, 3, 1, 'felt', '', [['w', -1.2, 1.2], ['n', 2.8, 5.2]]),
      island(-2, 9, -15, -9, 0, 'charcoal', '', [['s', 2.8, 5.2]]),
    ),
    holes: [{ x: 1.5, z: -1, r: 0.8, y: 1 }],
    balls: [{ kind: 'cue', x: -13.5, z: 0, y: 2 }],
    pockets: [{ id: 'fin', x: -0.5, z: -13.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Down the cascade & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -3, z: -6, dist: 34 },
  },
  {
    ...base, id: 'w1-pressure-line', name: 'Pressure Line', sector: 'E4', difficulty: 6, par: 4,
    briefing: 'Ride the cooling chute down to the lower deck and hit the pressure switch — it powers the finish up top. Then climb back up the incline.',
    ...merge(
      island(-10, 0, -3, 3, 1, 'charcoal', '', [['e', -1, 1], ['s', -8, -5]]),
      island(-10, 4, 6, 12, 0, 'felt', '', [['n', -8, -5]]),
      { slopes: [incline(-6.5, 6, 0, -6.5, 3, 1, 3, 'steel')] },
    ),
    chutes: [{ id: 'cool', points: [[0, 1, 0], [2, 0.9, 0], [4, 0.6, 1.5], [4.5, 0.3, 4], [3, 0, 8]], bank: 32 }],
    switches: [{ id: 'p', type: 'toggle', x: -1.5, z: 10, y: 0 }],
    balls: [{ kind: 'cue', x: -8.5, z: -1.5, y: 1 }],
    pockets: [{ id: 'fin', x: -1.2, z: -1.8, y: 1, color: 'finish', requires: ['p'], style: 'standard' }],
    objectives: [{ label: 'Chute → hit the pressure switch', signal: 'p' }, { label: 'Climb back & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -3, z: 4, dist: 27 },
  },
  {
    ...base, id: 'w1-half-pipe', name: 'Half-Pipe', sector: 'E5', difficulty: 6, par: 2,
    briefing: 'A valley between two ledges. Too soft and you roll back into the dip; too hard and you sail off the far ledge. Find the speed that just crests the climb.',
    ...merge(
      island(-12, -5, -2.5, 2.5, 1.4, 'charcoal', 'e'),
      { slopes: [incline(-5, 0, 1.4, -1, 0, 0, 5, 'steel'), incline(1, 0, 0, 5, 0, 1.4, 5, 'steel')] },
      { floors: [rect(-1, 1, -2.5, 2.5, 0, 'felt')] },
      { floors: [rect(5, 8.5, -2.5, 2.5, 1.4, 'charcoal')], walls: [seg(5, -2.5, 8.5, -2.5, 1.4), seg(5, 2.5, 8.5, 2.5, 1.4)] },
    ),
    balls: [{ kind: 'cue', x: -10.5, z: 0, y: 1.4 }],
    pockets: [{ id: 'fin', x: 7.2, z: 1, y: 1.4, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Crest the far ledge & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -2, z: 0, dist: 24 },
  },
  {
    ...base, id: 'w1-slingshot', name: 'Slingshot', sector: 'E6', difficulty: 7, par: 3,
    briefing: 'Your sphere is tethered to the post. Soft shots just swing around it. Snap the rope at the right moment and the release direction sends you across to the far deck.',
    ...merge(
      island(-6, 2, -4, 4, 0, 'charcoal', 'e'),
      island(6, 12, -4, 4, 0, 'felt', 'w'),
    ),
    ramps: [{ x: 1.4, z: 0, w: 1.2, d: 8, facing: 0, lift: 0.3 }],
    tethers: [{ ball: 0, x: -2, z: 0, len: 2.2, snapSpeed: 15 }],
    balls: [{ kind: 'cue', x: -2, z: 2.2 }],
    pockets: [{ id: 'fin', x: 10, z: -2, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Snap free', signal: 'snap:0' }, { label: 'Cross & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 3, z: 0, dist: 24 },
  },
  {
    ...base, id: 'w1-foundry-run', name: 'Foundry Run', sector: 'E7', difficulty: 7, par: 3,
    briefing: 'The full line: climb to the upper deck, hit the furnace switch, take the chute down to the casting floor, and finish behind the furnace gate.',
    ...merge(
      island(-14, -6, -3, 3, 0, 'charcoal', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-6, 0, 0, -1, 0, 1.5, 2.4, 'steel')] },
      island(-1, 6, -3, 3, 1.5, 'felt', '', [['w', -1.2, 1.2], ['e', -1, 1]]),
      island(4, 14, 7, 13, 0, 'charcoal', '', []),
    ),
    chutes: [{ id: 'cast', points: [[6, 1.5, 0], [8, 1.4, 0], [10, 1.0, 1.5], [10.5, 0.6, 4], [9, 0, 8.5]], bank: 32 }],
    switches: [{ id: 'f', type: 'toggle', x: 1.5, z: -1.8, y: 1.5 }],
    barriers: [{ id: 'fg', kind: 'gate', box: seg(10, 7, 10, 13), requires: ['f'], latch: true, label: 'FURNACE' }],
    balls: [{ kind: 'cue', x: -12.5, z: 1.5 }],
    pockets: [{ id: 'fin', x: 12.5, z: 11.5, color: 'finish', requires: ['f'], style: 'standard' }],
    objectives: [{ label: 'Hit the furnace switch', signal: 'f' }, { label: 'Chute down & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 5, dist: 37 },
  },
  {
    ...base, id: 'w1-upper-rotation', name: 'Upper Rotation', sector: 'E8', difficulty: 7, par: 4,
    briefing: 'Rotation on the upper table: 1 then 2. Every visit starts with the climb — and a miss rolls you back down the incline.',
    rule: 'rotation',
    ...merge(
      island(-12, -4, -3, 3, 0, 'charcoal', '', [['e', -1.5, 1.5]]),
      { slopes: [incline(-4, 0, 0, 1, 0, 1.2, 3, 'steel')] },
      (() => { const t = poolTable(1, 11, -3.5, 3.5, [{ id: 'a', at: 'nw', color: U }, { id: 'b', at: 'ne', color: U }, { id: 'c', at: 'sw', color: U }, { id: 'd', at: 'se', color: U }, { id: 'e', at: 'n', color: U }, { id: 'f', at: 's', color: U }], { y: 1.2, gaps: [['w', -1.5, 1.5]] }); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; })(),
    ),
    balls: [{ kind: 'cue', x: -10, z: 0 }, { kind: 'yellow', num: 1, x: 6, z: -1.6, y: 1.2, required: true }, { kind: 'blue', num: 2, x: 8.5, z: 1.8, y: 1.2, required: true }],
    objectives: [{ label: 'Pot 1 → 2 on the upper table', signal: 'cleared' }],
    camera: { x: -0.5, z: 0, dist: 25 },
  },
];
