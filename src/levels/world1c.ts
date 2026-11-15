import type { LevelDef } from './LevelTypes';
import { seg, rect, rails, zone } from './helpers';

/**
 * WORLD 1 — CALIBRATION FOUNDRY · Mini-golf courses
 * Bigger multi-section courses in the spirit of mini-golf: several strokes per hole (par 3–8),
 * timed windmill gates, sand bunkers, crosswind bridges without rails and kicker-ramp jumps over the abyss.
 */
const base = { world: 1, theme: 'foundry' as const, switches: [], barriers: [], portals: [], hoops: [] };

export const WORLD1C: LevelDef[] = [
  // ─ Dogleg: an L-shaped fairway; the elbow bunker punishes overhit.
  {
    ...base, id: 'g-dogleg', name: 'Dogleg', sector: 'G1', difficulty: 2, par: 3,
    briefing: 'Mini-golf rules: take as many strokes as you need. Play the corner — overhit and the sand bunker at the elbow swallows your pace.',
    floors: [rect(-12, 2, -2, 2), rect(-2, 2, -14, -2), rect(0.2, 2, -0.6, 2, 0, 'sand')],
    walls: [seg(-12, -2, -2, -2), seg(-2, -2, -2, -14), seg(-2, -14, 2, -14), seg(2, -14, 2, 2), seg(2, 2, -12, 2), seg(-12, 2, -12, -2)],
    balls: [{ kind: 'cue', x: -10.5, z: 0 }],
    pockets: [{ id: 'fin', x: 0, z: -12.5, color: 'finish' }],
    objectives: [{ label: 'Hole out', signal: 'sunk:fin' }],
    camera: { x: -3, z: -5, dist: 28 },
  },
  // ─ Windmill: two timed gates on a long lane, a bunker guarding the cup.
  {
    ...base, id: 'g-windmill', name: 'Windmill Lane', sector: 'G2', difficulty: 3, par: 4,
    briefing: 'The red gates open and close on a timer. Watch the rhythm — the aim line shows whether the gate will be open when the ball arrives.',
    floors: [rect(-14, 14, -2.5, 2.5), rect(8, 10.5, -2.5, 0.2, 0, 'sand')],
    walls: rails(-14, 14, -2.5, 2.5),
    barriers: [
      { id: 'g1', kind: 'gate', box: seg(-4, -2.5, -4, 2.5), requires: [], cycle: { open: 1.4, closed: 1.6 }, label: 'GATE 1' },
      { id: 'g2', kind: 'gate', box: seg(4, -2.5, 4, 2.5), requires: [], cycle: { open: 1.2, closed: 1.8, offset: 1.1 }, label: 'GATE 2' },
    ],
    balls: [{ kind: 'cue', x: -12.5, z: 0 }],
    pockets: [{ id: 'fin', x: 12.4, z: -1.2, color: 'finish' }],
    objectives: [{ label: 'Hole out through both gates', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 30 },
  },
  // ─ Crosswind: a rail-less bridge with a side wind; too slow and you are blown into the abyss.
  {
    ...base, id: 'g-crosswind', name: 'Crosswind Bridge', sector: 'G3', difficulty: 4, par: 4,
    briefing: 'A fan blows across the open bridge. A slow ball drifts off the edge — go fast, or aim upwind and let the wind bend it home.',
    floors: [rect(-12, -5, -3, 3), rect(-5, 5, -1.3, 1.3, 0, 'steel'), rect(5, 12, -3, 3)],
    walls: [
      ...rails(-12, -5, -3, 3, '', [['e', -1.3, 1.3]]),
      ...rails(5, 12, -3, 3, '', [['w', -1.3, 1.3]]),
    ],
    winds: [{ ...zone(-5, 5, -2.5, 2.5), fx: 0, fz: 7 }],
    balls: [{ kind: 'cue', x: -10.5, z: 0 }],
    pockets: [{ id: 'fin', x: 10.2, z: -1.6, color: 'finish' }],
    objectives: [{ label: 'Cross the windy bridge & hole out', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 28 },
  },
  // ─ Ramp jump over the abyss, then a dogleg through a timed gate.
  {
    ...base, id: 'g-jump', name: 'Abyss Jump', sector: 'G4', difficulty: 5, par: 5,
    briefing: 'Hit the kicker ramp with pace to jump the gap — too soft and you drop into the abyss. Then thread the timed gate up the dogleg.',
    floors: [rect(-12, -3, -2.5, 2.5), rect(1, 8, -3, 3), rect(4, 8, -13, -3), rect(1, 3.2, -3, 0.5, 0, 'sand')],
    walls: [
      ...rails(-12, -3, -2.5, 2.5, 'e'),
      seg(1, -3, 1, 3), seg(1, 3, 8, 3), seg(8, 3, 8, -13), seg(8, -13, 4, -13), seg(4, -13, 4, -3), seg(4, -3, 1, -3),
    ],
    ramps: [{ x: -3.6, z: 0, w: 1.2, d: 5, facing: 0, lift: 0.55 }],
    barriers: [{ id: 'gt', kind: 'gate', box: seg(4, -7, 8, -7), requires: [], cycle: { open: 1.5, closed: 1.5 }, label: 'GATE' }],
    balls: [{ kind: 'cue', x: -10.5, z: 0 }],
    pockets: [{ id: 'fin', x: 6, z: -11.5, color: 'finish' }],
    objectives: [{ label: 'Jump the abyss', signal: 'sunk:fin' }, { label: 'Hole out past the gate', signal: 'sunk:fin' }],
    camera: { x: -1, z: -4, dist: 32 },
  },
  // ─ Championship: windmill → crosswind bridge → jump → bunkered green.
  {
    ...base, id: 'g-championship', name: 'Foundry Championship', sector: 'G5', difficulty: 6, par: 6,
    briefing: 'The full course: windmill gate, a windy rail-less bridge, a jump over the abyss and a green ringed by sand.',
    floors: [
      rect(-20, -8, -2.5, 2.5),
      rect(-8, 2, -1.5, 1.5, 0, 'steel'),
      rect(2, 9, -3, 3),
      rect(13, 22, -4, 4),
      rect(13, 15, -4, 4, 0, 'sand'), rect(19.5, 22, -4, -1.5, 0, 'sand'),
    ],
    walls: [
      ...rails(-20, -8, -2.5, 2.5, '', [['e', -1.5, 1.5]]),
      ...rails(2, 9, -3, 3, 'e', [['w', -1.5, 1.5]]),
      ...rails(13, 22, -4, 4, 'w'),
    ],
    barriers: [{ id: 'wm', kind: 'gate', box: seg(-13, -2.5, -13, 2.5), requires: [], cycle: { open: 2.0, closed: 1.5 }, label: 'WINDMILL' }],
    winds: [{ ...zone(-8, 2, -2.5, 2.5), fx: 0, fz: -4 }],
    ramps: [{ x: 8.4, z: 0, w: 1.2, d: 6, facing: 0, lift: 0.55 }],
    balls: [{ kind: 'cue', x: -18.5, z: 0 }],
    pockets: [{ id: 'fin', x: 20.5, z: 1.8, color: 'finish' }],
    objectives: [{ label: 'Hole out on the championship green', signal: 'sunk:fin' }],
    camera: { x: 1, z: 0, dist: 50 },
  },
];
