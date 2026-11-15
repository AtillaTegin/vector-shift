import type { LevelDef } from './LevelTypes';
import { seg, rect, zone, rails, poolTable, island, incline, merge } from './helpers';

/**
 * WORLD 2 — HYDRO STATION · part 3: HARD multi-deck sectors
 * Spillway water-slides (speed window), buoys on ropes in the current (snap them free), canal-lock inclines,
 * terraces stepping down — combined with rivers, shallows, whirlpools and lidded drains.
 */
const base = { world: 2, theme: 'hydro' as const, switches: [], barriers: [], portals: [], hoops: [] };
const U = 'universal' as const;

export const WORLD2C: LevelDef[] = [
  {
    ...base, id: 'h-spillway', name: 'Spillway', sector: 'H10', difficulty: 6, par: 3,
    briefing: 'From the dam crest a spillway slide drops to the reservoir deck. Enter it inside its speed window: too slow you slide back, too fast you clear the lip into the abyss.',
    ...merge(
      island(-12, -3, -3, 3, 2, 'concrete', '', [['e', -0.8, 0.8]]),
      island(-2, 10, 6, 14, 0, 'tile'),
    ),
    chutes: [{ id: 's', points: [[-3, 2, 0], [-1, 1.9, 0], [1.5, 1.4, 0.8], [3, 0.9, 3], [3.2, 0.4, 5.5], [2.5, 0, 8]], bank: 28 }],
    water: [{ ...zone(4, 10, 6, 10), shallow: true }],
    balls: [{ kind: 'cue', x: -10.5, z: -1.5, y: 2 }],
    pockets: [{ id: 'fin', x: 8.5, z: 12.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Ride the spillway & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -1, z: 5, dist: 30 },
  },
  {
    ...base, id: 'h-buoy', name: 'Buoy Line', sector: 'H11', difficulty: 6, par: 2,
    briefing: 'The red buoy is roped to a mooring post in the river. Strike it hard enough to snap the rope — then the current carries it down to the outflow pocket.',
    floors: [rect(-9, 9, -4, 4, 0, 'tile')], walls: rails(-9, 9, -4, 4),
    currents: [{ ...zone(-9, 9, -1.2, 1.2), fx: 2.5, fz: 0 }],
    tethers: [{ ball: 1, x: -2, z: 0, len: 1.4, snapSpeed: 14 }],
    balls: [{ kind: 'cue', x: -6, z: 2.8 }, { kind: 'red', num: 3, x: -0.7, z: 0, required: true }],
    pockets: [{ id: 'out', x: 8, z: 0, color: U, style: 'standard' }],
    objectives: [{ label: 'Snap the buoy rope', signal: 'snap:0' }, { label: 'Buoy into the outflow', signal: 'cleared' }],
    camera: { x: 0, z: 0, dist: 21 },
  },
  {
    ...base, id: 'h-canal-lock', name: 'Canal Lock', sector: 'H12', difficulty: 6, par: 3,
    briefing: 'The upper canal is 1.2 above you. Open the lock gate with the switch past the whirlpool, then climb the lock incline — against gravity, with enough pace to arrive.',
    ...merge(
      island(-10, 2, -4, 4, 0, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(2, 0, 0, 7, 0, 1.2, 2.4, 'concrete')] },
      island(7, 14, -4, 4, 1.2, 'tile', '', [['w', -1.2, 1.2]]),
    ),
    vortices: [{ x: -4, z: -1.5, r: 1.8, swirl: 8, pull: 4 }],
    switches: [{ id: 'lock', type: 'toggle', x: -1, z: -3 }],
    barriers: [{ id: 'lg', kind: 'gate', box: { ...seg(7.3, -1.2, 7.3, 1.2), y: 1.2 }, requires: ['lock'], latch: true, label: 'LOCK GATE' }],
    balls: [{ kind: 'cue', x: -8.5, z: 2.5 }],
    pockets: [{ id: 'fin', x: 12.5, z: 2.5, y: 1.2, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Open the lock gate', signal: 'lock' }, { label: 'Climb the lock & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 2, z: 0, dist: 27 },
  },
  {
    ...base, id: 'h-twin-slides', name: 'Twin Slides', sector: 'H13', difficulty: 6, par: 2,
    briefing: 'Two slides leave the tower. The left has a tight bend (low top speed), the right a long climb (high minimum). Only one delivers you to the finish deck — read both windows.',
    ...merge(
      island(-4, 4, -4, 0, 2.5, 'concrete', '', [['s', -3, -1.4], ['s', 1.4, 3]]),
      island(-12, -4, 7, 13, 0, 'tile'),
      island(4, 12, 7, 13, 0, 'tile'),
    ),
    chutes: [
      { id: 'L', points: [[-2.2, 2.5, 0], [-2.2, 2.4, 1.5], [-3.5, 2.0, 3], [-6, 1.3, 3.4], [-8, 0.5, 5], [-8, 0, 8]], bank: 22 },
      { id: 'R', points: [[2.2, 2.5, 0], [2.2, 2.6, 1.5], [3, 3.0, 3], [5, 2.4, 4], [7.5, 1.0, 5.5], [8, 0, 8.5]], bank: 35 },
    ],
    holes: [{ x: -8, z: 11.5, r: 0.8 }],
    balls: [{ kind: 'cue', x: 0, z: -2.5, y: 2.5 }],
    pockets: [{ id: 'fin', x: 10.5, z: 11.5, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Pick the right slide & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 5, dist: 32 },
  },
  {
    ...base, id: 'h-pier-swing', name: 'Pier Swing', sector: 'H14', difficulty: 7, par: 4,
    briefing: 'You are roped to the pier post. Swing round it to strike the sluice switch, then snap the rope with a hard shot toward the open sluice and the finish beyond.',
    ...merge(island(-8, 8, -5, 5, 0, 'tile')),
    walls: [...rails(-8, 8, -5, 5), seg(3, -5, 3, -1.2), seg(3, 1.2, 3, 5)],
    water: [{ ...zone(-8, -4, -5, 5) }],
    tethers: [{ ball: 0, x: -1.5, z: 0, len: 2.4, snapSpeed: 16 }],
    switches: [{ id: 'sl', type: 'toggle', x: -1.5, z: -3.2 }],
    barriers: [{ id: 'sg', kind: 'gate', box: seg(3, -1.2, 3, 1.2), requires: ['sl'], latch: true, label: 'SLUICE' }],
    balls: [{ kind: 'cue', x: -1.5, z: 2.4 }],
    pockets: [{ id: 'fin', x: 6.5, z: 3, color: 'finish', requires: ['sl'], style: 'standard' }],
    objectives: [{ label: 'Hit the sluice switch', signal: 'sl' }, { label: 'Snap free', signal: 'snap:0' }, { label: 'Through the sluice & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 0, dist: 22 },
  },
  {
    ...base, id: 'h-terraces', name: 'Terraces', sector: 'H15', difficulty: 7, par: 5,
    briefing: 'Flooded terraces step down the valley. Each incline speeds you up and each shallow pool drags you back. Stop on every terrace — or tumble off the edge.',
    ...merge(
      island(-12, -5, -4, 4, 2.4, 'tile', '', [['e', 0.5, 3]]),
      { slopes: [incline(-5, 1.75, 2.4, -2, 1.75, 1.6, 2.5, 'concrete'), incline(4, -1.75, 1.6, 7, -1.75, 0.8, 2.5, 'concrete'), incline(13, 1.75, 0.8, 16, 1.75, 0, 2.5, 'concrete')] },
      island(-2, 4, -4, 4, 1.6, 'tile', '', [['w', 0.5, 3], ['e', -3, -0.5]]),
      island(7, 13, -4, 4, 0.8, 'tile', '', [['w', -3, -0.5], ['e', 0.5, 3]]),
      island(16, 22, -4, 4, 0, 'tile', '', [['w', 0.5, 3]]),
    ),
    water: [{ ...zone(-2, 4, -4, 0), y: 1.6, shallow: true }, { ...zone(7, 13, 0, 4), y: 0.8, shallow: true }],
    holes: [{ x: 19, z: -1, r: 0.8, cycle: { open: 1.5, closed: 1.5 } }],
    balls: [{ kind: 'cue', x: -10.5, z: 1.5, y: 2.4 }],
    pockets: [{ id: 'fin', x: 20.5, z: -2.6, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Down the terraces & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: 5, z: 0, dist: 36 },
  },
  {
    ...base, id: 'h-flume', name: 'Log Flume', sector: 'H16', difficulty: 7, par: 2,
    briefing: 'The log flume climbs a hump (needs pace) then whips through a hairpin (punishes pace). The window is narrow — then the river carries you past the whirlpool.',
    ...merge(
      island(-12, -4, -3, 3, 1, 'concrete', '', [['e', -0.8, 0.8]]),
      island(-6, 10, 8, 14, 0, 'tile'),
    ),
    chutes: [{ id: 'f', points: [[-4, 1, 0], [-2, 1.2, 0], [0, 1.9, 0], [2, 1.4, 0.4], [3.6, 1.0, 1.8], [3.8, 0.7, 3.6], [2.4, 0.4, 5], [0, 0.1, 6.5], [-2, 0, 9]], bank: 38 }],
    currents: [{ ...zone(-6, 10, 10, 12), fx: 3, fz: 0 }],
    vortices: [{ x: 4, z: 12.2, r: 1.4, swirl: 7, pull: 3.5 }],
    balls: [{ kind: 'cue', x: -10.5, z: 1.5, y: 1 }],
    pockets: [{ id: 'fin', x: 8.8, z: 11.2, color: 'finish', style: 'standard' }],
    objectives: [{ label: 'Ride the flume & sink the FINISH', signal: 'sunk:fin' }],
    camera: { x: -1, z: 5, dist: 31 },
  },
  {
    ...base, id: 'h-dam-run', name: 'Dam Run', sector: 'H17', difficulty: 7, par: 3,
    briefing: 'The whole station: climb the dam incline, reverse the outflow with the pump switch, ride the spillway down and let the reversed river carry you to the finish.',
    ...merge(
      island(-14, -6, -3, 3, 0, 'tile', '', [['e', -1.2, 1.2]]),
      { slopes: [incline(-6, 0, 0, -1, 0, 1.8, 2.4, 'concrete')] },
      island(-1, 6, -3, 3, 1.8, 'concrete', '', [['w', -1.2, 1.2], ['e', -0.8, 0.8]]),
      island(-2, 14, 8, 14, 0, 'tile'),
    ),
    chutes: [{ id: 'sp', points: [[6, 1.8, 0], [8, 1.7, 0], [10, 1.2, 1.5], [10.5, 0.7, 4], [9.5, 0, 9]], bank: 30 }],
    currents: [{ ...zone(-2, 14, 10, 12.5), fx: 3, fz: 0, when: 'pump' }],
    switches: [{ id: 'pump', type: 'toggle', x: 2.5, z: -2, y: 1.8 }],
    balls: [{ kind: 'cue', x: -12.5, z: 1.5 }],
    pockets: [{ id: 'fin', x: -0.6, z: 11.2, color: 'finish', requires: ['pump'], style: 'standard' }],
    objectives: [{ label: 'Reverse the outflow (pump)', signal: 'pump' }, { label: 'Spillway → river → FINISH', signal: 'sunk:fin' }],
    camera: { x: 0, z: 5, dist: 37 },
  },
];
