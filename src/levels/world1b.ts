import type { LevelDef } from './LevelTypes';
import { poolTable } from './helpers';

/**
 * WORLD 1 — CALIBRATION FOUNDRY · American tables (part 1)
 * Real rail-cut pockets (WPA American corners ≈ 2·D, sides ≈ 2.24·D; snooker knuckles ≈ 1.64·D),
 * numbered American balls (1 yellow · 2 blue · 3 red · 6 green), then rules and earlier mechanics mixed in.
 */
const base = { world: 1, theme: 'foundry' as const, switches: [], barriers: [], portals: [], hoops: [] };
const T = (x0: number, x1: number, z0: number, z1: number, p: Parameters<typeof poolTable>[4], o?: Parameters<typeof poolTable>[5]) => {
  const t = poolTable(x0, x1, z0, z1, p, o);
  return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets };
};

export const WORLD1B: LevelDef[] = [
  // 1-6 ─ first real pocket: an American corner, mouth twice the ball.
  {
    ...base, id: 'w1-corner', name: 'Corner Pocket', sector: '1-6', difficulty: 1, par: 1,
    briefing: 'A real American corner pocket — the mouth is two balls wide. Send the 3-ball (red) into the red corner.',
    ...T(-7, 7, -3.5, 3.5, [{ id: 'c3', at: 'ne', color: 'red' }]),
    balls: [{ kind: 'cue', x: -4, z: 1 }, { kind: 'red', num: 3, x: 3.2, z: -1.2, required: true }],
    objectives: [{ label: 'Pot the 3-ball in the red corner', signal: 'sunk:c3' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  // 1-7 ─ side pocket: wider mouth (2.24·D) but you must come at it square.
  {
    ...base, id: 'w1-side', name: 'Side Pocket', sector: '1-7', difficulty: 2, par: 1,
    briefing: 'Side pockets are wider (2.24 balls) but their jaws are steep — a ball rolling along the rail will not drop. Cut the 2-ball in.',
    ...T(-7, 7, -3.5, 3.5, [{ id: 's2', at: 'n', color: 'blue' }]),
    balls: [{ kind: 'cue', x: -3, z: 2 }, { kind: 'blue', num: 2, x: 1, z: -1.2, required: true }],
    objectives: [{ label: 'Pot the 2-ball in the blue side pocket', signal: 'sunk:s2' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  // 1-8 ─ colour matching on one table: three balls, three pockets.
  {
    ...base, id: 'w1-colours', name: 'Three Colours', sector: '1-8', difficulty: 3, par: 3,
    briefing: 'Each ball has its own pocket. A ball dropped into the wrong colour is spat back out — plan your cue position.',
    ...T(-7, 7, -3.5, 3.5, [
      { id: 'pr', at: 'ne', color: 'red' }, { id: 'pg', at: 'sw', color: 'green' }, { id: 'pb', at: 's', color: 'blue' },
    ]),
    balls: [
      { kind: 'cue', x: -5, z: -1 },
      { kind: 'red', num: 3, x: 3, z: -1.8, required: true },
      { kind: 'green', num: 6, x: -3.4, z: 1.7, required: true },
      { kind: 'blue', num: 2, x: 0.8, z: 1.1, required: true },
    ],
    objectives: [
      { label: 'Red 3 → red corner (NE)', signal: 'sunk:pr' },
      { label: 'Green 6 → green corner (SW)', signal: 'sunk:pg' },
      { label: 'Blue 2 → blue side (S)', signal: 'sunk:pb' },
    ],
    camera: { x: 0, z: 0, dist: 21 },
  },
  // 1-9 ─ snooker jaws behind a switch: arm the pocket, then thread a tight rounded mouth.
  {
    ...base, id: 'w1-snooker-jaws', name: 'Snooker Jaws', sector: '1-9', difficulty: 3, par: 2,
    briefing: 'Snooker pockets have rounded knuckles — hit the jaw and the ball rattles out. Roll over the switch to arm the pocket, then pot the green.',
    ...T(-7, 7, -3.5, 3.5, [{ id: 'sg', at: 'se', color: 'green', style: 'snooker', requires: ['arm'] }]),
    switches: [{ id: 'arm', type: 'toggle', x: -2.5, z: -2.3 }],
    balls: [{ kind: 'cue', x: -5, z: 2 }, { kind: 'green', num: 6, x: 3.6, z: 1.6, required: true }],
    objectives: [{ label: 'Arm the pocket (switch)', signal: 'arm' }, { label: 'Pot the 6-ball through the snooker jaws', signal: 'sunk:sg' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  // 1-10 ─ rotation: lowest number first, any pocket; out of order = foul (+1, ball respotted).
  {
    ...base, id: 'w1-rotation', name: 'Rotation 1·2·3', sector: '1-10', difficulty: 4, par: 3,
    briefing: 'Rotation rules: always pot the LOWEST number on the table first. Pot a higher one early and it comes back to its spot with a stroke penalty.',
    rule: 'rotation',
    ...T(-7, 7, -3.5, 3.5, [
      { id: 'a', at: 'nw', color: 'universal' }, { id: 'b', at: 'ne', color: 'universal' },
      { id: 'c', at: 'sw', color: 'universal' }, { id: 'd', at: 'se', color: 'universal' },
    ]),
    balls: [
      { kind: 'cue', x: -4, z: 0 },
      { kind: 'yellow', num: 1, x: 1.5, z: 0.4, required: true },
      { kind: 'blue', num: 2, x: 4.2, z: 1.8, required: true },
      { kind: 'red', num: 3, x: 4.6, z: -1.6, required: true },
    ],
    objectives: [{ label: 'Clear 1 → 2 → 3 in order', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  // 1-11 ─ tungsten + rotation: the pockets stay shielded until the heavy sphere is clamped.
  {
    ...base, id: 'w1-tungsten-rotation', name: 'Tungsten Break', sector: '1-11', difficulty: 5, par: 3,
    briefing: 'All pockets are shielded until the tungsten sphere (3.5× mass) is driven onto the mag-plate. Then rotation: 1 before 2.',
    rule: 'rotation',
    ...T(-7, 7, -4, 4, [
      { id: 'a', at: 'ne', color: 'universal', requires: ['hp'] },
      { id: 'b', at: 'se', color: 'universal', requires: ['hp'] },
      { id: 'c', at: 'n', color: 'universal', requires: ['hp'] },
    ]),
    switches: [{ id: 'hp', type: 'heavy', x: 4.2, z: 0 }],
    balls: [
      { kind: 'cue', x: -5, z: 0 },
      { kind: 'heavy', x: 1.2, z: 0 },
      { kind: 'yellow', num: 1, x: -1.5, z: 2.6, required: true },
      { kind: 'blue', num: 2, x: -1.2, z: -2.6, required: true },
    ],
    objectives: [{ label: 'Clamp TUNGSTEN on the mag-plate', signal: 'hp' }, { label: 'Clear 1 → 2', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
];
