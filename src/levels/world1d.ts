import type { LevelDef, WallDef, FloorDef } from './LevelTypes';
import { seg, rect, rails, zone, poolTable } from './helpers';

/**
 * WORLD 1 — CALIBRATION FOUNDRY · part 3
 * New island shapes (diamond, hexagon, U-yard, four-island grand prix) and new mechanics:
 * combination-lock keys, 8-ball rule, portal pockets, conveyor belts, weighbridge, gear swing-gate.
 */
const base = { world: 1, theme: 'foundry' as const, switches: [], barriers: [], portals: [], hoops: [] };
const T = (...a: Parameters<typeof poolTable>) => { const t = poolTable(...a); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; };

// hexagon (circumradius 6)
const HR = 6, HA = HR * Math.sqrt(3) / 2;
const hexFloors: FloorDef[] = [0, 1, 2].map((k) => ({ x: 0, z: 0, w: HR, d: 2 * HA, rot: (k * Math.PI) / 3 }));
const hexWalls: WallDef[] = [];
for (let k = 0; k < 6; k++) {
  const a1 = (k * Math.PI) / 3, a2 = ((k + 1) * Math.PI) / 3;
  hexWalls.push(seg(HR * Math.cos(a1), HR * Math.sin(a1), HR * Math.cos(a2), HR * Math.sin(a2)));
}

const portalTables = (() => {
  const a = poolTable(-12, -2, -3, 3, [{ id: 'pp', at: 'ne', color: 'red' }], { gaps: [['e', -1, 1]] });
  const b = poolTable(2, 12, -3, 3, [{ id: 'rp', at: 'se', color: 'red' }], { gaps: [['w', -1, 1]] });
  a.pockets[0].teleport = { x: 7, z: 0 };
  return { floors: [...a.floors, ...b.floors, rect(-2, 2, -1, 1, 0, 'steel')], walls: [...a.walls, ...b.walls], posts: [...a.posts, ...b.posts], pockets: [...a.pockets, ...b.pockets] };
})();

export const WORLD1D: LevelDef[] = [
  // ─ Diamond: a square table turned 45°; every path is a bank.
  {
    ...base, id: 'w1-diamond', name: 'Diamond Bank', sector: 'D1', difficulty: 2, par: 2,
    briefing: 'The table is a diamond — every rail is at 45°. Bank the red into the north tip and the blue into the east tip.',
    floors: [{ x: 0, z: 0, w: 8.5, d: 8.5, rot: Math.PI / 4 }],
    walls: [seg(0, -6, 6, 0), seg(6, 0, 0, 6), seg(0, 6, -6, 0), seg(-6, 0, 0, -6)],
    balls: [{ kind: 'cue', x: -3, z: 1.6 }, { kind: 'red', num: 3, x: -1.2, z: -1.6, required: true }, { kind: 'blue', num: 2, x: 1.6, z: 1.2, required: true }],
    pockets: [{ id: 'pr', x: 0, z: -4.9, color: 'red', style: 'american' }, { id: 'pb', x: 4.9, z: 0, color: 'blue', style: 'american' }],
    objectives: [{ label: 'Red → north tip', signal: 'sunk:pr' }, { label: 'Blue → east tip', signal: 'sunk:pb' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  // ─ Hexagon rotation: six pockets, four numbered balls, lowest first.
  {
    ...base, id: 'w1-hex-rotation', name: 'Hexagon Rotation', sector: 'D2', difficulty: 3, par: 4,
    briefing: 'Six pockets at the six corners. Rotation rules: 1 → 2 → 3 → 4. Use the angled rails to set up the next ball.',
    rule: 'rotation',
    floors: hexFloors, walls: hexWalls,
    pockets: [0, 1, 2, 3, 4, 5].map((k) => ({ id: `h${k}`, x: 5.05 * Math.cos((k * Math.PI) / 3), z: 5.05 * Math.sin((k * Math.PI) / 3), color: 'universal' as const, style: 'american' as const })),
    balls: [
      { kind: 'cue', x: -3.6, z: 1.4 },
      { kind: 'yellow', num: 1, x: -0.8, z: 0.2, required: true }, { kind: 'blue', num: 2, x: 1.6, z: 1.8, required: true },
      { kind: 'red', num: 3, x: 1.8, z: -2, required: true }, { kind: 'purple', num: 4, x: -2.2, z: -2.6, required: true },
    ],
    objectives: [{ label: 'Clear 1 → 2 → 3 → 4', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  // ─ Eight ball: the black must be last — pot it early and the rack is lost.
  {
    ...base, id: 'w1-eight-ball', name: 'Eight Ball', sector: 'D3', difficulty: 4, par: 4,
    briefing: '8-ball rules: clear your balls first, the black 8 LAST. Drop the 8 early — even by accident — and the frame is lost.',
    rule: '8ball',
    ...T(-7, 7, -3.5, 3.5, [
      { id: 'a', at: 'nw', color: 'universal' }, { id: 'b', at: 'ne', color: 'universal' }, { id: 'c', at: 'sw', color: 'universal' },
      { id: 'd', at: 'se', color: 'universal' }, { id: 'e', at: 'n', color: 'universal' }, { id: 'f', at: 's', color: 'universal' },
    ]),
    balls: [
      { kind: 'cue', x: -4, z: 0 },
      { kind: 'yellow', num: 1, x: 1.8, z: 1.2, required: true }, { kind: 'blue', num: 2, x: 3.6, z: -1.4, required: true },
      { kind: 'black', num: 8, x: 3.4, z: 0.7, required: true },
    ],
    objectives: [{ label: 'Pot 1 and 2, then the 8', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  // ─ Combination lock: three keys, hit in order 1-2-3; a wrong key resets.
  {
    ...base, id: 'w1-combination', name: 'Combination Key', sector: 'D4', difficulty: 4, par: 4,
    briefing: 'Three numbered keys form a combination lock. Roll over them 1 → 2 → 3. Touch a key out of order and the whole code resets.',
    floors: [rect(-6, 6, -6, 6)],
    walls: [...rails(-6, 6, -6, 6), seg(-6, 3, -3, 3)],
    switches: [
      { id: 'k1', type: 'code', group: 'k', order: 1, x: 3.8, z: -3.8 },
      { id: 'k2', type: 'code', group: 'k', order: 2, x: -3.8, z: -3.8 },
      { id: 'k3', type: 'code', group: 'k', order: 3, x: 3.8, z: 3.8 },
    ],
    barriers: [{ id: 'vault', kind: 'gate', box: seg(-3, 3, -3, 6), requires: ['code:k'], label: 'VAULT DOOR' }],
    balls: [{ kind: 'cue', x: 0, z: 0.5 }],
    pockets: [{ id: 'fin', x: -4.6, z: 4.6, color: 'finish', requires: ['code:k'], style: 'american' }],
    objectives: [{ label: 'Enter the code 1-2-3', signal: 'code:k' }, { label: 'Sink the FINISH in the vault', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  // ─ Portal pocket: pot the red on table A, it re-emerges on table B; pot it again there.
  {
    ...base, id: 'w1-portal-pocket', name: 'Portal Pocket', sector: 'D5', difficulty: 4, par: 4,
    briefing: 'The NE pocket on the left table is a portal: the red drops in and re-appears on the right table. Cross over and pot it a second time.',
    ...portalTables,
    balls: [{ kind: 'cue', x: -10, z: 0 }, { kind: 'red', num: 3, x: -6, z: -0.8, required: true }],
    objectives: [{ label: 'Pot the red into the portal pocket', signal: 'sunk:pp' }, { label: 'Pot it again on the right table', signal: 'sunk:rp' }],
    camera: { x: 0, z: 0, dist: 28 },
  },
  // ─ Conveyor yard: belts against you on the way out, with you on the way back.
  {
    ...base, id: 'w1-conveyor', name: 'Conveyor Yard', sector: 'D6', difficulty: 5, par: 3,
    briefing: 'Steel belts drag the ball toward their own speed. The outbound belt runs against you — punch through it, then ride the return belt home.',
    floors: [rect(-10, 10, -6, -2), rect(6, 10, -2, 2), rect(-10, 10, 2, 6)],
    walls: [...rails(-10, 10, -6, 6), seg(-10, -2, 6, -2), seg(6, -2, 6, 2), seg(6, 2, -10, 2)],
    conveyors: [{ ...zone(-3, 5, -6, -2), vx: -7, vz: 0 }, { ...zone(-5, 5, 2, 6), vx: -7, vz: 0 }],
    balls: [{ kind: 'cue', x: -8.5, z: -4 }],
    pockets: [{ id: 'fin', x: -8.6, z: 4, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Run the yard & hole out', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 26 },
  },
  // ─ Weighbridge: the plate needs 2 balls of mass resting on it to latch the lock.
  {
    ...base, id: 'w1-weighbridge', name: 'Weighbridge', sector: 'D7', difficulty: 5, par: 4,
    briefing: 'The weighbridge reads mass: it needs 2 ball-weights at rest on the plate. Park two spheres on it to latch the lock, then go for the finish.',
    floors: [rect(-7, 7, -4, 4)],
    walls: [...rails(-7, 7, -4, 4), seg(-7, -1.5, -4, -1.5)],
    switches: [{ id: 'wb', type: 'scale', mass: 2, x: 3.2, z: 0 }],
    barriers: [{ id: 'lock', kind: 'gate', box: seg(-4, -1.5, -4, -4), requires: ['wb'], latch: true, label: 'LOCK' }],
    balls: [{ kind: 'cue', x: -4, z: 2 }, { kind: 'red', num: 3, x: -0.5, z: 1.2 }, { kind: 'blue', num: 2, x: -0.5, z: -1.2 }],
    pockets: [{ id: 'fin', x: -5.6, z: -2.8, color: 'finish', requires: ['lock'], style: 'american' }],
    objectives: [{ label: 'Load 2 ball-weights on the bridge', signal: 'lock' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  // ─ Gear bridge: a gear train turns the central wall 90° — opening one path, closing another.
  {
    ...base, id: 'w1-gear', name: 'Gear Bridge', sector: 'D8', difficulty: 5, par: 3,
    briefing: 'The switch drives a gear train that swings the central wall through 90°. It opens the way east — and closes the way you came.',
    floors: [rect(-7, 7, -4.5, 4.5)],
    walls: rails(-7, 7, -4.5, 4.5),
    switches: [{ id: 'g', type: 'toggle', x: -4.5, z: -3 }],
    barriers: [{ id: 'gw', kind: 'gate', swing: true, box: seg(0, -4.5, 0, 4.5), requires: ['g'], label: 'GEAR WALL' }],
    balls: [{ kind: 'cue', x: -4.8, z: 2.8 }],
    pockets: [{ id: 'fin', x: 5.4, z: -3, color: 'finish', requires: ['g'], style: 'american' }],
    objectives: [{ label: 'Drive the gear (switch)', signal: 'g' }, { label: 'Sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  // ─ Snooker gauntlet: escort the green down a long hall into a snooker pocket.
  {
    ...base, id: 'w1-gauntlet', name: 'Wind Gauntlet', sector: 'D9', difficulty: 6, par: 4,
    briefing: 'Escort the green down the hall: two timed gates, a crosswind, and a narrow corner pocket at the far end — the wind pins balls to the south rail, use it.',
    ...T(-14, 14, -2.2, 2.2, [{ id: 'sg', at: 'se', color: 'green', style: 'standard' }]),
    barriers: [
      { id: 't1', kind: 'gate', box: seg(-4, -2.2, -4, 2.2), requires: [], cycle: { open: 2.4, closed: 1.2 }, label: 'GATE 1' },
      { id: 't2', kind: 'gate', box: seg(5, -2.2, 5, 2.2), requires: [], cycle: { open: 2.4, closed: 1.2, offset: 0.8 }, label: 'GATE 2' },
    ],
    winds: [{ ...zone(-1, 2, -2.2, 2.2), fx: 0, fz: 3 }],
    balls: [{ kind: 'cue', x: -12.5, z: -0.6 }, { kind: 'green', num: 6, x: -10, z: 0.4, required: true }],
    objectives: [{ label: 'Pot the green at the end of the hall', signal: 'sunk:sg' }],
    camera: { x: 0, z: 0, dist: 32 },
  },
  // ─ Grand Prix: four islands — belt, windy bridge, code-locked jump, timed dogleg.
  {
    ...base, id: 'w1-grand-prix', name: 'Foundry Grand Prix', sector: 'D10', difficulty: 7, par: 8,
    briefing: 'Four islands, every Foundry trick: ride the belt, cross the windy bridge, crack the 2-key code to open the ramp, jump the gap, beat the timed gate.',
    floors: [
      rect(-24, -14, -3, 3), rect(-14, -6, -1.4, 1.4, 0, 'steel'), rect(-6, 4, -4, 4), rect(-6, -3, 1, 4, 0, 'sand'),
      rect(7, 16, -4, 4), rect(12, 16, -14, -4),
    ],
    walls: [
      ...rails(-24, -14, -3, 3, '', [['e', -1.4, 1.4]]),
      ...rails(-6, 4, -4, 4, '', [['w', -1.4, 1.4], ['e', -1.6, 1.6]]),
      seg(7, -4, 7, 4), seg(7, 4, 16, 4), seg(16, 4, 16, -14), seg(16, -14, 12, -14), seg(12, -14, 12, -4), seg(12, -4, 7, -4),
    ],
    conveyors: [{ ...zone(-21, -15, -3, 3), vx: 6, vz: 0 }],
    winds: [{ ...zone(-14, -6, -2.5, 2.5), fx: 0, fz: 4 }],
    switches: [
      { id: 'c1', type: 'code', group: 'gp', order: 1, x: -3.5, z: -2.6 },
      { id: 'c2', type: 'code', group: 'gp', order: 2, x: 1.5, z: 2.6 },
    ],
    barriers: [
      { id: 'rampgate', kind: 'gate', box: seg(4, -1.6, 4, 1.6), requires: ['code:gp'], label: 'RAMP GATE' },
      { id: 'tg', kind: 'gate', box: seg(12, -8, 16, -8), requires: [], cycle: { open: 1.5, closed: 1.5 }, label: 'TIMED GATE' },
    ],
    ramps: [{ x: 3.3, z: 0, w: 1.2, d: 3.2, facing: 0, lift: 0.55 }],
    balls: [{ kind: 'cue', x: -22.5, z: 0 }],
    pockets: [{ id: 'fin', x: 14, z: -12.5, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Crack the 2-key code', signal: 'code:gp' }, { label: 'Hole out after the jump', signal: 'sunk:fin' }],
    camera: { x: -4, z: -3, dist: 52 },
  },
];
