import type { BoxDef, FloorDef, LevelDef } from './LevelTypes';

import { seg, rect } from './helpers';

// ───────────── Level 1 — hexagon ─────────────
const HR = 6, HA = HR * Math.sqrt(3) / 2;
const hexFloors: FloorDef[] = [0, 1, 2].map((k) => ({ x: 0, z: 0, w: HR, d: 2 * HA, rot: (k * Math.PI) / 3, style: 'felt' as const }));
const hexWalls: BoxDef[] = [];
for (let k = 0; k < 6; k++) {
  const a1 = (k * Math.PI) / 3, a2 = ((k + 1) * Math.PI) / 3;
  hexWalls.push(seg(HR * Math.cos(a1), HR * Math.sin(a1), HR * Math.cos(a2), HR * Math.sin(a2)));
}

export const WORLD1: LevelDef[] = [
  {
    id: 'calibration-vector',
    name: 'Calibration Vector',
    sector: "1-1",
    world: 1,
    difficulty: 1,
    theme: "foundry",
    par: 2,
    briefing: 'The divider blocks the direct line. Bank off a cushion — angle in equals angle out — to cross the amber switch, then sink the cue in the finish pocket.',
    floors: hexFloors,
    walls: [
      ...hexWalls,
      seg(-4.0, 0.4, 0.8, 0.4),        // divider
      seg(1.2, -2.0, 4.95, -2.0),      // finish enclosure (south side)
    ],
    balls: [{ kind: 'cue', x: 0, z: 3.6 }],
    pockets: [{ id: 'fin', x: 3.0, z: -3.6, color: 'finish', requires: ['s1'], style: 'american' }],
    switches: [{ id: 's1', type: 'toggle', x: -2.6, z: -2.6 }],
    barriers: [{ id: 'gateA', kind: 'gate', box: seg(1.2, -2.0, 1.2, -5.3), requires: ['s1'], label: 'GATE A' }],
    portals: [],
    hoops: [],
    objectives: [
      { label: 'Bank onto the amber switch', signal: 's1' },
      { label: 'Sink the cue in the FINISH pocket', signal: 'sunk:fin' },
    ],
    camera: { x: 0, z: 0, dist: 22 },
  },

  // ───────────── Level 2 — T-shaped edge ─────────────
  {
    id: 'unforgiving-edge',
    name: 'The Unforgiving Edge',
    sector: "1-2",
    world: 1,
    difficulty: 2,
    theme: "foundry",
    par: 3,
    briefing: 'No rails on the spine. Roll the cue gently onto the hold-switch at the far ledge and let it rest — the glass bridge to the second island will lock out.',
    floors: [
      rect(-3, 3, 2, 6),
      rect(-0.45, 0.45, -3, 2, 0, 'steel'),
      rect(-1.1, 1.1, -4.4, -3, 0, 'steel'),
      rect(7, 11, 1, 7, 0, 'charcoal'),
    ],
    walls: [
      seg(-3, 6, 3, 6), seg(-3, 2, -3, 6),
      seg(3, 2, 3, 3.3), seg(3, 4.7, 3, 6),
      seg(-3, 2, -0.45, 2), seg(0.45, 2, 3, 2),
      seg(7, 1, 11, 1), seg(7, 7, 11, 7), seg(11, 1, 11, 7),
      seg(7, 1, 7, 3.3), seg(7, 4.7, 7, 7),
    ],
    balls: [{ kind: 'cue', x: 0, z: 5 }],
    pockets: [{ id: 'fin', x: 9.6, z: 4, color: 'finish', requires: ['bridge'], style: 'snooker' }],
    switches: [{ id: 'h1', type: 'hold', x: 0, z: -3.7 }],
    barriers: [{ id: 'bridge', kind: 'bridge', box: { x: 5, z: 4, w: 4.2, d: 1.4, y: 0 }, requires: ['h1'], latch: true, label: 'GLASS BRIDGE' }],
    portals: [],
    hoops: [],
    objectives: [
      { label: 'Rest a sphere on the HOLD switch', signal: 'bridge' },
      { label: 'Cross the bridge & sink the FINISH', signal: 'sunk:fin' },
    ],
    camera: { x: 3.5, z: 1, dist: 26 },
  },

  // ───────────── Level 3 — portals & hoops ─────────────
  {
    id: 'quantum-tunneling',
    name: 'Quantum Tunneling',
    sector: "1-3",
    world: 1,
    difficulty: 3,
    theme: "foundry",
    par: 2,
    briefing: 'Island A has no way across — except the cyan portal. Momentum is preserved; you exit Island B on a 45° vector. Thread both hoops in order, then pot the green sphere.',
    floors: [rect(-9, -3, -3, 3), rect(2, 10, -4, 4, 0, 'charcoal')],
    walls: [
      seg(-9, -3, -3, -3), seg(-9, 3, -3, 3), seg(-9, -3, -9, 3),
      seg(-3, -3, -3, -0.95), seg(-3, 0.95, -3, 3),
      seg(2, -4, 10, -4), seg(2, 4, 10, 4), seg(2, -4, 2, 4), seg(10, -4, 10, 4),
    ],
    balls: [{ kind: 'cue', x: -7.5, z: 0 }, { kind: 'green', x: 5.0, z: -2.5, required: true }],
    pockets: [{ id: 'gp', x: 2.65, z: -3.35, color: 'green', requires: ['hoops:h'], style: 'snooker' }],
    switches: [],
    barriers: [],
    portals: [
      { id: 'pA', link: 'pB', x: -3.3, z: 0, facing: 180, width: 1.8 },
      { id: 'pB', link: 'pA', x: 3.2, z: 2.8, facing: -45, width: 1.8 },
    ],
    hoops: [
      { group: 'h', order: 1, x: 5, z: 1, facing: -45, width: 1.2 },
      { group: 'h', order: 2, x: 7, z: -1, facing: -45, width: 1.2 },
    ],
    objectives: [
      { label: 'Thread HOOP 1 → HOOP 2', signal: 'hoops:h' },
      { label: 'Sink GREEN in the green pocket', signal: 'sunk:gp' },
    ],
    camera: { x: 0.5, z: 0, dist: 27 },
  },

  // ───────────── Level 4 — heavy sphere ─────────────
  {
    id: 'heavy-metal-logic',
    name: 'Heavy Metal Logic',
    sector: "1-4",
    world: 1,
    difficulty: 3,
    theme: "foundry",
    par: 3,
    briefing: 'Tungsten is 3.5× heavier — only it can depress the mag-plate. Drive it down the corridor at high power; the plate clamps it and arms the red pocket.',
    floors: [rect(-7, 7, -4.5, 4.5)],
    walls: [
      seg(-7, -4.5, 7, -4.5), seg(-7, 4.5, 7, 4.5), seg(-7, -4.5, -7, 4.5), seg(7, -4.5, 7, 4.5),
      seg(-2.5, -0.9, 4.5, -0.9), seg(-2.5, 0.9, 4.5, 0.9), seg(4.5, -0.9, 4.5, 0.9),
    ],
    balls: [
      { kind: 'cue', x: -5, z: 0 },
      { kind: 'heavy', x: 0.5, z: 0 },
      { kind: 'red', x: -4, z: -2.6, required: true },
    ],
    pockets: [{ id: 'rp', x: -6.3, z: -3.8, color: 'red', requires: ['hp'], style: 'standard' }],
    switches: [{ id: 'hp', type: 'heavy', x: 2.7, z: 0 }],
    barriers: [],
    portals: [],
    hoops: [],
    objectives: [
      { label: 'Clamp TUNGSTEN on the mag-plate', signal: 'hp' },
      { label: 'Sink RED in the red pocket', signal: 'sunk:rp' },
    ],
    camera: { x: 0, z: 0, dist: 24 },
  },

  // ───────────── Level 5 — grand chain ─────────────
  {
    id: 'grand-chain',
    name: 'Grand Chain Reaction',
    sector: "1-5",
    world: 1,
    difficulty: 5,
    theme: "foundry",
    par: 5,
    briefing: 'Four islands, one chain. Portal → tungsten → mag-plate → bridge → red pocket → shield drops → portal up to the podium. Finish it.',
    floors: [
      rect(-14, -8, -3, 3),                    // A start
      rect(-4, 4, -4, 4, 0, 'charcoal'),       // B heavy
      rect(-4, 4, 8, 14, 0, 'concrete'),       // C red (slow concrete deck)
      rect(-15, -8, 6, 12, 1.5, 'steel'),      // D podium (elevated)
    ],
    walls: [
      // A
      seg(-14, -3, -8, -3), seg(-14, 3, -8, 3), seg(-14, -3, -14, 3), seg(-8, -3, -8, -0.95), seg(-8, 0.95, -8, 3),
      // B
      seg(-4, -4, 4, -4), seg(-4, -4, -4, 4), seg(4, -4, 4, 4), seg(-4, 4, -1.1, 4), seg(1.1, 4, 4, 4),
      // C
      seg(-4, 14, 4, 14), seg(4, 8, 4, 14), seg(-4, 8, -4, 14), seg(-4, 8, -1.1, 8), seg(1.1, 8, 4, 8),
      // D
      seg(-15, 6, -8, 6, 1.5), seg(-15, 12, -8, 12, 1.5), seg(-15, 6, -15, 12, 1.5), seg(-8, 6, -8, 12, 1.5),
    ],
    balls: [
      { kind: 'cue', x: -12.5, z: -1.2 },
      { kind: 'heavy', x: 0.6, z: -1.2 },
      { kind: 'red', x: 2, z: 11, required: true },
    ],
    pockets: [
      { id: 'rp', x: 3.35, z: 13.35, color: 'red', style: 'snooker' },
      { id: 'fin', x: -9.2, z: 9, y: 1.5, color: 'finish', requires: ['hp', 'sunk:rp'], style: 'american' },
    ],
    switches: [{ id: 'hp', type: 'heavy', x: 2.6, z: -1.2 }],
    barriers: [
      { id: 'bridge', kind: 'bridge', box: { x: 0, z: 6, w: 2.2, d: 4.2, y: 0 }, requires: ['hp'], label: 'GLASS BRIDGE' },
      { id: 'shield', kind: 'gate', box: { x: -2.85, z: 11, w: 0.3, d: 2.2 }, requires: ['sunk:rp'], label: 'PORTAL SHIELD' },
    ],
    portals: [
      { id: 'p1', link: 'p2', x: -8.3, z: 0, facing: 180, width: 1.8 },
      { id: 'p2', link: 'p1', x: -3.35, z: -1.2, facing: 0, width: 1.8 },
      { id: 'p3', link: 'p4', x: -3.35, z: 11, facing: 0, width: 1.8 },
      { id: 'p4', link: 'p3', x: -14.7, z: 9, y: 1.5, facing: 0, width: 1.8 },
    ],
    hoops: [],
    objectives: [
      { label: 'Clamp TUNGSTEN on the mag-plate', signal: 'hp' },
      { label: 'Sink RED in the red pocket', signal: 'sunk:rp' },
      { label: 'Reach the FINISH podium', signal: 'sunk:fin' },
    ],
    camera: { x: -5, z: 5, dist: 40 },
  },
];
