/**
 * PhysicsMaterials — single source of truth for every tunable physical constant.
 *
 * Units: 1 world unit = 1 decimetre. Ball radius 0.28 u ≈ 28 mm (real pool ball 28.6 mm), so real
 * pool coefficients apply directly with g = 98.1 u/s² and speeds in u/s (10 u/s = 1 m/s).
 * Sources for the numbers: Dr. Dave Alciatore's pool-physics technical proofs (ball-ball e ≈ 0.93–0.95,
 * cushion e ≈ 0.75–0.85, cloth μs ≈ 0.2, μr ≈ 0.005–0.015, shot speeds 1–8 m/s) and Russian-pyramid
 * table specs (heavier 68 mm balls, pockets only ~4–6 mm wider than the ball).
 */
import { DEFAULT_CLOTH, G, type Cloth } from './BallModel';

/** American numbered-ball colours: 1 yellow · 2 blue · 3 red · 4 purple · 5 orange · 6 green · 7 maroon · 8 black. */
export type BallKind = 'cue' | 'red' | 'green' | 'blue' | 'heavy' | 'yellow' | 'orange' | 'purple' | 'maroon' | 'black';

export interface BallMaterial {
  mass: number;
  radius: number;
  /** ball–ball restitution (Rapier averages the two balls' values) */
  restitution: number;
  cloth: Cloth;
}

export const BALL_MATERIALS: Record<BallKind, BallMaterial> = {
  cue:   { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  red:   { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  green: { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  blue:  { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  yellow: { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  orange: { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  purple: { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  maroon: { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  black:  { mass: 1.0, radius: 0.28, restitution: 0.95, cloth: DEFAULT_CLOTH },
  heavy: { mass: 3.5, radius: 0.34, restitution: 0.7, cloth: { muSlide: 0.24, muRoll: 0.03, muSpin: 0.06 } },
};

/**
 * Ball sets. American pool: 57.15 mm / 170 g (our default, r = 0.28 u).
 * Russian pyramid: 68 mm / ~285 g -> r = 0.34 u, 1.65x mass. Sets are never mixed in a level.
 */
export type BallSet = 'american' | 'russian';
export function ballMaterial(kind: BallKind, set: BallSet = 'american'): BallMaterial {
  const m = BALL_MATERIALS[kind];
  if (set === 'russian' && kind !== 'heavy') return { ...m, radius: 0.34, mass: 1.65 };
  return m;
}

/**
 * Rail-cut pockets, sized from the real specs as multiples of the ball diameter D:
 *  american (WPA): corner mouth 4.5-4.625" = 2.0 D, side 5-5.125" = 2.24 D, straight-cut jaws
 *  snooker (WPBSA template ~86 mm for 52.5 mm balls): ~1.64 D, rounded knuckles that rattle balls out
 *  russian pyramid: corner = D + 3 mm ~ 1.045 D, middle = D + 12 mm ~ 1.18 D: only a dead-centred ball drops
 * knuckle = radius of the rounded jaw tip (in units of D), converge = how much the throat narrows (deg).
 */
export const RAIL_POCKETS = {
  american: { corner: 2.0, side: 2.24, knuckle: 0, converge: 12 },
  standard: { corner: 1.75, side: 1.95, knuckle: 0, converge: 10 },
  snooker:  { corner: 1.64, side: 1.85, knuckle: 0.2, converge: 6 },
  russian:  { corner: 1.045, side: 1.18, knuckle: 0.09, converge: 0 },
} as const;

/** Ball–cloth contact is handled by BallModel, so Rapier friction is zero everywhere. */
export const SURFACES = {
  floor:   { restitution: 0.0, friction: 0 },
  /** Rapier averages restitution: (0.95 + 0.63) / 2 ≈ 0.79 cushion rebound — real cushions 0.75–0.85. */
  cushion: { restitution: 0.63, friction: 0 },
  bumper:  { restitution: 1.0, friction: 0 },
  glass:   { restitution: 0.0, friction: 0 },
};
/** Effective cushion restitution as Rapier applies it (average of ball and cushion). */
export const CUSHION_E = (0.95 + 0.63) / 2;

export const FIXED_DT = 1 / 240;
export const GRAVITY = -G;
/** Hardest break-style shot: 5 m/s. Power maps non-linearly (see shotSpeed) for fine control. */
export const MAX_SHOT_SPEED = 50;
export const shotSpeed = (power: number) => MAX_SHOT_SPEED * Math.pow(Math.max(0, Math.min(1, power)), 1.5);
export const KILL_Y = -10;
export const REST_SPEED = 0.05;
export const PORTAL_COOLDOWN = 0.25;
export const POCKET_RADIUS = 0.42;
export const SWITCH_RADIUS = 0.55;
export const HEAVY_PLATE_RADIUS = 0.65;
export const WALL_HEIGHT = 0.45;
export const WALL_THICKNESS = 0.3;
export const FLOOR_THICKNESS = 0.5;
export const UNDO_CHARGES = 3;

/**
 * Pocket styles (capture radius = how far the ball centre may be from the pocket centre when it drops;
 * rattle = above this entry speed an off-centre ball is spat back out by the jaws).
 *  american — mouth ≈ 2× ball, very forgiving
 *  snooker  — rounded jaws: fast off-centre balls rattle out
 *  russian  — mouth barely wider than the ball: only an accurate, centred ball drops
 */
export const POCKET_STYLES = {
  american: { radius: 0.5, capture: 0.5, rattleSpeed: Infinity, rattleOffset: 1 },
  standard: { radius: 0.42, capture: 0.42, rattleSpeed: Infinity, rattleOffset: 1 },
  snooker:  { radius: 0.38, capture: 0.36, rattleSpeed: 22, rattleOffset: 0.45 },
  russian:  { radius: 0.32, capture: 0.17, rattleSpeed: 32, rattleOffset: 0.6 },
} as const;
export type PocketStyle = keyof typeof POCKET_STYLES;

/**
 * Surface → cloth coefficients. Rolling resistance changes per deck: worsted felt is fast, concrete and
 * steel grating are slower, and the ribbed rubber brake-mat grabs the ball (lets it stop on small targets).
 * Multiplies the ball's own coefficients (so tungsten stays heavier-feeling everywhere).
 */
export const SURFACE_CLOTH: Record<string, { slide: number; roll: number }> = {
  felt: { slide: 1, roll: 1 }, charcoal: { slide: 1, roll: 1.1 }, tile: { slide: 0.9, roll: 1.2 },
  steel: { slide: 0.8, roll: 1.5 }, concrete: { slide: 1.1, roll: 2.2 }, rubber: { slide: 2, roll: 14 },
  /** golf-style bunker: loose sand grabs the ball hard */
  sand: { slide: 3, roll: 30 },
};

// ── World 2: hydro mechanics (scaled to decimetre units) ──
/** Water drag coefficient (1/s): v *= exp(-k·dt). */
export const WATER_DRAG = 2.2;
/** A sphere slower than this inside still water sinks. */
export const WATER_SINK_SPEED = 3.0;
/** Time a sphere may hang over an opening before it drops: √(2·0.6r / g). */
export const HOLE_FALL_TIME = Math.sqrt((2 * 0.6 * 0.28) / G);
/** Extra normal velocity added by energised bumper plates / round bumpers (u/s). */
export const BUMPER_KICK = 8;
export const ROUND_BUMPER_KICK = 10;
export const BREAKABLE = {
  glass:    { hits: 1, threshold: 10, passThrough: 0.55 },
  concrete: { hits: 2, threshold: 14, passThrough: 0.45 },
} as const;
/** River push scale: level files author currents in "old" m/s² — multiplied up for the new speeds. */
export const CURRENT_SCALE = 3.2;
/** Wind zones are authored in u/s² directly. */
export const WIND_SCALE = 1;
