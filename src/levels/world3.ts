import type { LevelDef, WallDef, FloorDef } from './LevelTypes';
import { seg, rect, zone, rails, poolTable } from './helpers';

/**
 * WORLD 3 — CARAVANSERAI (Silk Road · Sheki, Bukhara, Samarkand)
 * Law: "value is carried". Girih geometry (octagons, 8-point khatam stars), badgir wind towers
 * (directional wind columns), bazaar delivery (each good to its merchant), sand and dunes.
 */
const base = { world: 3, theme: 'caravan' as const, switches: [], barriers: [], portals: [], hoops: [] };
const T = (...a: Parameters<typeof poolTable>) => { const t = poolTable(...a); return { floors: t.floors, walls: t.walls, posts: t.posts, pockets: t.pockets }; };

/** Closed wall ring through the given points. */
const ring = (pts: [number, number][], y = 0): WallDef[] => pts.map((p, i) => { const q = pts[(i + 1) % pts.length]; return seg(p[0], p[1], q[0], q[1], y); });
/** Regular octagon (flat sides on the axes), apothem a: floor = two squares, wall ring. */
function octagon(cx: number, cz: number, a: number, style: FloorDef['style'] = 'felt') {
  const R = a / Math.cos(Math.PI / 8);
  const pts: [number, number][] = [];
  for (let k = 0; k < 8; k++) { const t = Math.PI / 8 + (k * Math.PI) / 4; pts.push([cx + Math.cos(t) * R, cz + Math.sin(t) * R]); }
  // four crossing strips (0°, 45°, 90°, 135°) of half-width a·tan(22.5°) tile the octagon exactly
  const h = a * Math.tan(Math.PI / 8);
  const floors: FloorDef[] = [0, 1, 2, 3].map((k) => ({ x: cx, z: cz, y: k * 0.0006, w: 2 * a, d: 2 * h, rot: (k * Math.PI) / 4, style }));
  return { floors, walls: ring(pts), pts };
}
/** 8-point girih star (khatam): two squares of half-side a, one turned 45°. */
function khatam(cx: number, cz: number, a: number, style: FloorDef['style'] = 'felt') {
  const ro = a * Math.SQRT2, ri = a / Math.cos(Math.PI / 8);
  const pts: [number, number][] = [];
  for (let k = 0; k < 16; k++) { const t = (k * Math.PI) / 8, r = k % 2 ? ri : ro; pts.push([cx + Math.cos(t) * r, cz + Math.sin(t) * r]); }
  const floors: FloorDef[] = [{ x: cx, z: cz, w: 2 * a, d: 2 * a, rot: Math.PI / 4, style }, { x: cx, z: cz, y: 0.0006, w: 2 * a, d: 2 * a, style }];
  return { floors, walls: ring(pts), pts };
}

export const WORLD3: LevelDef[] = [
  {
    ...base, id: 'c-silk-road', name: 'Silk Road', sector: 'C1', difficulty: 1, par: 2,
    briefing: 'The caravan road turns at the well. Sand on the verges drinks your pace — stay on the paving.',
    floors: [rect(-9, 3, -1.5, 1.5, 0, 'tile'), rect(3, 6, -1.5, 9, 0, 'tile'), rect(-9, 3, 1.5, 3, 0, 'sand')],
    walls: [seg(-9, -1.5, 6, -1.5), seg(6, -1.5, 6, 9), seg(6, 9, 3, 9), seg(3, 9, 3, 3), seg(3, 3, -9, 3), seg(-9, 3, -9, -1.5)],
    balls: [{ kind: 'cue', x: -7.5, z: 0 }],
    pockets: [{ id: 'fin', x: 4.5, z: 7.6, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Follow the road & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -1, z: 3, dist: 22 },
  },
  {
    ...base, id: 'c-octagon', name: 'Octagon Court', sector: 'C2', difficulty: 1, par: 1,
    briefing: 'A girih courtyard: eight equal walls. The finish hides behind the court\'s centre column — one bank finds it.',
    ...(() => { const o = octagon(0, 0, 5); return { floors: o.floors, walls: o.walls }; })(),
    posts: [{ x: 0, z: 0, r: 0.9 }],
    balls: [{ kind: 'cue', x: -3.6, z: 0 }],
    pockets: [{ id: 'fin', x: 3.6, z: 0, color: 'finish', style: 'american' }],
    objectives: [{ label: 'Bank around the column & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 17 },
  },
  {
    ...base, id: 'c-badgir', name: 'Badgir', sector: 'C3', difficulty: 2, par: 2,
    briefing: 'A badgir wind tower pours air down across the road, pushing everything south. Aim into the wind.',
    floors: [rect(-9, 9, -3, 3, 0, 'tile')], walls: rails(-9, 9, -3, 3),
    winds: [{ ...zone(-3, 3, -3, 3), fx: 0, fz: 6 }],
    balls: [{ kind: 'cue', x: -7.5, z: 1.8 }],
    pockets: [{ id: 'fin', x: 7.6, z: -1.8, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Cross the wind column & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 20 },
  },
  {
    ...base, id: 'c-bazaar', name: 'Bazaar', sector: 'C4', difficulty: 2, par: 3,
    briefing: 'Market day. Every good goes to its own merchant: red silk to the red stall, yellow saffron to the yellow stall.',
    ...T(-6, 6, -3, 3, [{ id: 'pr', at: 'ne', color: 'red' }, { id: 'py', at: 'sw', color: 'yellow' }]),
    balls: [
      { kind: 'cue', x: -4, z: -1.5 },
      { kind: 'red', num: 3, x: 3.5, z: -1.6, required: true },
      { kind: 'yellow', num: 1, x: -2.8, z: 1.4, required: true },
    ],
    objectives: [{ label: 'Red silk → red stall (NE)', signal: 'sunk:pr' }, { label: 'Yellow saffron → yellow stall (SW)', signal: 'sunk:py' }],
    camera: { x: 0, z: 0, dist: 17 },
  },
  {
    ...base, id: 'c-spice', name: 'Spice Market', sector: 'C7', difficulty: 4, par: 3,
    briefing: '8-ball rules in the spice market: pot the saffron and the silk first — the black pepper goes last, anywhere.',
    rule: '8ball',
    ...T(-6, 6, -3, 3, [
      { id: 'a', at: 'nw', color: 'universal' }, { id: 'b', at: 'ne', color: 'universal' }, { id: 'c', at: 'sw', color: 'universal' },
      { id: 'd', at: 'se', color: 'universal' }, { id: 'e', at: 'n', color: 'universal' }, { id: 'f', at: 's', color: 'universal' },
    ]),
    balls: [
      { kind: 'cue', x: -4.2, z: 0 },
      { kind: 'yellow', num: 1, x: 2.4, z: -1.6, required: true },
      { kind: 'red', num: 3, x: 3.2, z: 1.7, required: true },
      { kind: 'black', num: 8, x: 0.6, z: 0.2, required: true },
    ],
    objectives: [{ label: 'Clear the table (black last)', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 17 },
  },
  {
    ...base, id: 'c-dune-sea', name: 'Dune Sea', sector: 'C8', difficulty: 4, par: 4,
    briefing: 'A long desert crossing: a dune kicker, a crosswind and soft sand traps. Plan your stops on the hard pan.',
    floors: [rect(-14, 14, -4, 4, 0, 'tile'), rect(-6, -2, -4, 0, 0.002, 'sand'), rect(5, 9, 0, 4, 0.002, 'sand')],
    walls: rails(-14, 14, -4, 4),
    winds: [{ ...zone(0, 4, -4, 4), fx: 0, fz: 5 }],
    ramps: [{ x: -9, z: 0, w: 1.2, d: 8, facing: 0, lift: 0.4 }],
    balls: [{ kind: 'cue', x: -12.5, z: 2.5 }],
    pockets: [{ id: 'fin', x: 12.5, z: -2.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Cross the dunes & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 26 },
  },
  {
    ...base, id: 'c-gate', name: 'Caravan Gate', sector: 'C9', difficulty: 4, par: 3,
    briefing: 'The inner courtyard is shut. Ring the gatekeeper\'s bell (switch), then enter through the arch with the wind at your back.',
    floors: [rect(-9, 9, -5, 5, 0, 'tile')],
    walls: [...rails(-9, 9, -5, 5), seg(1, -5, 1, -1), seg(1, 1, 1, 5)],
    winds: [{ ...zone(-9, 1, -5, -2.5), fx: 5, fz: 0 }],
    switches: [{ id: 'bell', type: 'toggle', x: -5, z: 3.5 }],
    barriers: [{ id: 'arch', kind: 'gate', box: { x: 1, z: 0, w: 0.3, d: 2 }, requires: ['bell'], latch: true, label: 'ARCH' }],
    balls: [{ kind: 'cue', x: -7, z: -3.5 }],
    pockets: [{ id: 'fin', x: 6.5, z: 3, color: 'finish', requires: ['bell'], style: 'standard' }],
    objectives: [{ label: 'Ring the bell', signal: 'bell' }, { label: 'Through the arch & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
];
