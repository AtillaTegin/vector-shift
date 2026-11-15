import type { LevelDef } from './LevelTypes';
import { seg, rect, zone, rails, poolTable } from './helpers';

/**
 * WORLD 3 — CARAVANSERAI · part 3: multi-step logic puzzles
 * (combination keys on a girih star, a merchant's weighbridge, timed storm gate, counterweight bridge, smuggler's route).
 */
const base = { world: 3, theme: 'caravan' as const, switches: [], barriers: [], portals: [], hoops: [] };

/** 8-point khatam star wall ring (two squares of half-side a). */
const star = (a: number) => {
  const ro = a * Math.SQRT2, ri = a / Math.cos(Math.PI / 8);
  const p: [number, number][] = [];
  for (let k = 0; k < 16; k++) { const t = (k * Math.PI) / 8, r = k % 2 ? ri : ro; p.push([Math.cos(t) * r, Math.sin(t) * r]); }
  return p.map((q, i) => { const n = p[(i + 1) % 16]; return seg(q[0], q[1], n[0], n[1]); });
};

const smuggler = (() => {
  const a = poolTable(-11, -2, -3, 3, [{ id: 'pp', at: 'ne', color: 'red' }]);
  a.pockets[0].teleport = { x: 6, z: -1.5 };
  return { floors: [...a.floors, rect(2, 11, -4, 4, 0, 'tile')], walls: [...a.walls, ...rails(2, 11, -4, 4)], posts: a.posts, pockets: a.pockets };
})();

export const WORLD3C: LevelDef[] = [
  {
    ...base, id: 'c-khatam-lock', name: 'Khatam Lock', sector: 'C5', difficulty: 4, par: 5,
    briefing: 'The star\'s points hold a combination lock: roll over the keys 1 → 2 → 3, then the north point opens. The column blocks every straight line across the star.',
    floors: [{ x: 0, z: 0, w: 9.2, d: 9.2, rot: Math.PI / 4, style: 'felt' }, { x: 0, z: 0, y: 0.0006, w: 9.2, d: 9.2, style: 'felt' }],
    walls: star(4.6),
    posts: [{ x: 0, z: 0, r: 1.0 }],
    switches: [
      { id: 'k1', type: 'code', group: 'k', order: 1, x: 5.0, z: 0 },
      { id: 'k2', type: 'code', group: 'k', order: 2, x: 0, z: 5.0 },
      { id: 'k3', type: 'code', group: 'k', order: 3, x: -5.0, z: 0 },
    ],
    barriers: [{ id: 'door', kind: 'gate', box: seg(-1.9, -4.6, 1.9, -4.6), requires: ['code:k'], latch: true, label: 'STAR DOOR' }],
    balls: [{ kind: 'cue', x: -2.6, z: 2.6 }],
    pockets: [{ id: 'fin', x: 0, z: -5.4, color: 'finish', requires: ['code:k'], style: 'standard' }],
    objectives: [{ label: 'Keys 1 → 2 → 3', signal: 'code:k' }, { label: 'Enter the north point', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'c-weighbridge', name: "Merchant's Scale", sector: 'C6', difficulty: 4, par: 5,
    briefing: 'The customs gate opens only when the scale reads a full load: the tungsten weight AND your cue ball resting on the plate together. Then leave through the gate.',
    floors: [rect(-7, 8, -4, 4, 0, 'tile')],
    walls: [...rails(-7, 8, -4, 4), seg(4.5, -4, 4.5, -1.6), seg(4.5, 1.6, 4.5, 4)],
    switches: [{ id: 'w', type: 'scale', x: 1.5, z: 0, mass: 4.5 }],
    barriers: [{ id: 'customs', kind: 'gate', box: seg(4.5, -1.6, 4.5, 1.6), requires: ['w'], latch: true, label: 'CUSTOMS' }],
    balls: [{ kind: 'cue', x: -5, z: 1.5 }, { kind: 'heavy', x: -2, z: 0 }],
    pockets: [{ id: 'fin', x: 6.6, z: 0.4, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Load the scale (tungsten + cue)', signal: 'customs' }, { label: 'Through customs & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0.5, z: 0, dist: 20 },
  },
  {
    ...base, id: 'c-storm-gate', name: 'Storm Gate', sector: 'C10', difficulty: 5, par: 2,
    briefing: 'A timed city gate and a gusting sandstorm just in front of it. Two clocks: arrive when the gate is open — and aim for whether the wind is blowing then.',
    floors: [rect(-10, 10, -3, 3, 0, 'tile'), rect(-2, 2, 3, 5, 0, 'sand')],
    walls: [...rails(-10, 10, -3, 3, '', [['s', -2, 2]]), seg(-2, 3, -2, 5), seg(2, 3, 2, 5), seg(-2, 5, 2, 5)],
    winds: [{ ...zone(-2, 2, -3, 5), fx: 0, fz: 20, gust: { open: 1.6, closed: 1.6 } }],
    barriers: [{ id: 'cg', kind: 'gate', box: seg(5, -3, 5, 3), requires: [], cycle: { open: 0.7, closed: 2.5, offset: 0.6 }, label: 'CITY GATE' }],
    balls: [{ kind: 'cue', x: -8.5, z: 1.8 }],
    pockets: [{ id: 'fin', x: 8.6, z: -1.8, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Beat both clocks & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 1, dist: 22 },
  },
  {
    ...base, id: 'c-counterweight', name: 'Counterweight', sector: 'C14', difficulty: 5, par: 3,
    briefing: 'The bridge over the ravine is held up by a counterweight: it only stays out while the tungsten sits on the plate. Park it there first — then cross.',
    floors: [rect(-9, 0, -3, 3, 0, 'tile'), rect(3.4, 10, -3, 3, 0, 'tile')],
    walls: [...rails(-9, 0, -3, 3, '', [['e', -0.8, 0.8]]), ...rails(3.4, 10, -3, 3, '', [['w', -0.8, 0.8]])],
    switches: [{ id: 'hp', type: 'heavy', x: -2.2, z: -1.8 }],
    barriers: [{ id: 'br', kind: 'bridge', box: { x: 1.7, z: 0, w: 3.6, d: 1.6, y: 0 }, requires: ['hp'], label: 'ROPE BRIDGE' }],
    balls: [{ kind: 'cue', x: -7, z: 1.5 }, { kind: 'heavy', x: -4.5, z: -0.6 }],
    pockets: [{ id: 'fin', x: 8.4, z: 1.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Park the tungsten on the plate', signal: 'hp' }, { label: 'Cross the bridge & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0.5, z: 0, dist: 22 },
  },
  {
    ...base, id: 'c-smuggler', name: "Smuggler's Route", sector: 'C21', difficulty: 6, par: 6,
    briefing: 'Smuggle the silk: pot the red in the NE pocket and it reappears inside the walled khan. Slip in through the caravan gate, ring the bell to lift the stall shutter, and deliver the silk.',
    ...smuggler,
    portals: [{ id: 'gA', link: 'gB', x: -3.2, z: 1.6, facing: 180, width: 1.6 }, { id: 'gB', link: 'gA', x: 3.2, z: 2.6, facing: 0, width: 1.6 }],
    winds: [{ ...zone(6, 8, -4, 4), fx: 0, fz: 4 }],
    switches: [{ id: 'bell', type: 'toggle', x: 9, z: 2.5 }],
    barriers: [{ id: 'shutter', kind: 'gate', box: seg(9.3, -4, 9.3, -2.2), requires: ['bell'], latch: true, label: 'SHUTTER' }],
    balls: [{ kind: 'cue', x: -9, z: 0 }, { kind: 'red', num: 3, x: -5, z: -1.4, required: true }],
    pockets: [...smuggler.pockets, { id: 'rp', x: 10.3, z: -3.3, color: 'red', requires: ['bell'], style: 'standard' }],
    objectives: [{ label: 'Pot the silk into the smuggler pocket', signal: 'sunk:pp' }, { label: 'Ring the bell', signal: 'bell' }, { label: 'Deliver the silk to the red stall', signal: 'sunk:rp' }],
    camera: { x: 0, z: 0, dist: 25 },
  },
];
