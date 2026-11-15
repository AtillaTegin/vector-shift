import type { BallKind } from '../physics/PhysicsMaterials';

/** Oriented box on the XZ plane. `rot` = yaw in radians (three.js rotation.y convention). */
export interface BoxDef {
  x: number; z: number; w: number; d: number;
  /** floors: top surface height. walls/barriers: base height. */
  y?: number;
  h?: number;
  rot?: number;
}
export type FloorStyle = 'felt' | 'charcoal' | 'steel' | 'concrete' | 'tile' | 'rubber' | 'sand';
/** Kicker ramp: a ball crossing it along `facing` (deg) is launched with vy = v_along · lift. */
export interface RampDef { x: number; z: number; w: number; d: number; rot?: number; y?: number; facing: number; lift: number }
/** steel = normal cushion · glass/concrete = breakable · bumper = energised rebound plate */
export type WallKind = 'steel' | 'glass' | 'concrete' | 'bumper';
export interface WallDef extends BoxDef { kind?: WallKind; /** breakable walls raise signal 'broken:<id>' */ id?: string }
export interface CircleDef { x: number; z: number; r: number; y?: number }
/** Flowing water: uniform acceleration (m/s²) along (fx, fz) plus water drag. */
/** `when`: pump valve — while that signal is on, the flow runs the other way. */
export interface CurrentDef extends BoxDef { fx: number; fz: number; when?: string }
/** Wind column; `gust` = sandstorm: blows only during the open phase of its cycle. */
export interface WindDef extends CurrentDef { gust?: { open: number; closed: number; offset?: number } }
/** shallow water: drag but no sinking. */
export interface WaterDef extends BoxDef { shallow?: boolean }
/** Drain hole; `cycle` = sliding lid: covered (safe) while closed. */
export interface HoleDef extends CircleDef { cycle?: { open: number; closed: number; offset?: number } }
/** Whirlpool: tangential `swirl` and inward `pull` (u/s², strongest at the rim → centre); the drain at the centre swallows slow balls. */
export interface VortexDef { x: number; z: number; r: number; y?: number; swirl: number; pull: number }
export type ThemeId = 'foundry' | 'hydro' | 'caravan';
export interface FloorDef extends BoxDef { style?: FloorStyle }
export interface ChuteDef { id: string; points: [number, number, number][]; bank?: number; width?: number }
export interface TetherDef { ball: number; x: number; z: number; len: number; snapSpeed?: number }
/** Inclined plane (ramp between islands): top rises from y0 at the local −x end to y1 at the +x end; `w` = horizontal run. */
export interface SlopeDef { x: number; z: number; w: number; d: number; rot?: number; y0: number; y1: number; style?: FloorStyle }
export interface BallDef { kind: BallKind; x: number; z: number; y?: number; required?: boolean; /** pool number (rotation rule, ball graphics) */ num?: number }
export type PocketColor = 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'maroon' | 'black' | 'universal' | 'finish';
export interface PocketDef { id: string; x: number; z: number; y?: number; color: PocketColor; requires?: string[]; /** jaw style: american (wide) · standard · snooker (rattles) · russian (tight) */ style?: import('../physics/PhysicsMaterials').PocketStyle;
  /** rail-cut pocket: capture radius around (x,z); acceptance comes from the physical jaws, no scripted rattle */
  rail?: { capture: number; mouth: number; facing: number; kind: 'corner' | 'side' };
  /** portal pocket: an accepted ball re-emerges at `teleport` (pocketed again elsewhere) */
  teleport?: { x: number; z: number; y?: number } }
/**
 * toggle · hold · heavy (tungsten only)
 * code  — combination-lock key: keys of one `group` must be hit in `order`; a wrong key resets the group
 * scale — weighbridge: active while the resting mass on the plate ≥ `mass` (normal ball = 1, tungsten = 3.5)
 */
export type SwitchType = 'toggle' | 'hold' | 'heavy' | 'code' | 'scale';
export interface SwitchDef { id: string; type: SwitchType; x: number; z: number; y?: number; group?: string; order?: number; mass?: number }
export interface BarrierDef {
  id: string;
  kind: 'gate' | 'bridge';
  /** gear-driven swing gate: instead of sinking, the wall rotates 90° about its centre when triggered */
  swing?: boolean;
  /** turbine bar: rotates continuously at this rate (rad/s) */
  spin?: number;
  box: BoxDef;
  /** Signals that must all be true for the gate to OPEN / the bridge to EXTEND. */
  requires: string[];
  /** Once triggered, stays triggered even if the signal drops (hold switches). */
  latch?: boolean;
  /** Timed gate (windmill style): open for `open` s, closed for `closed` s, phase `offset` s. Ignores `requires` when empty. */
  cycle?: { open: number; closed: number; offset?: number };
  label?: string;
}
/** `facing` = degrees; front normal n = (cos, sin) on (x, z). Balls enter moving against n. */
export interface PortalDef { id: string; link: string; x: number; z: number; y?: number; facing: number; width?: number }
export interface HoopDef { group: string; order: number; x: number; z: number; y?: number; facing: number; width?: number }
export interface ObjectiveDef { label: string; signal: string }

export interface LevelDef {
  id: string;
  name: string;
  sector: string;
  world: number;
  /** 1 very easy · 2 easy · 3 easy-medium · 4 medium · 5 medium-hard · 6 hard · 7 expert */
  difficulty: number;
  theme?: ThemeId;
  par: number;
  briefing: string;
  floors: FloorDef[];
  walls: WallDef[];
  /** Still water: heavy drag; a sphere slowing below the sink speed inside it is lost. */
  water?: WaterDef[];
  vortices?: VortexDef[];
  /** Rivers / channels: water drag + push. */
  currents?: CurrentDef[];
  /** Wind tunnels / fans: constant push (u/s²) on every sphere inside, airborne too — no water drag. */
  winds?: WindDef[];
  /** Caravan chains: [ballIndexA, ballIndexB, length] — a slack rope that pulls taut (inelastic). Breaks when either ball is lost. */
  chains?: [number, number, number][];
  /** Inclined planes: gravity component g·sinθ along the fall line, friction scaled by the normal force (cosθ). */
  slopes?: SlopeDef[];
  /** Water-slide chutes: banked troughs along a 3D centreline (points = ball-contact height). Speed window decides exit / roll-back / fly-off. */
  chutes?: ChuteDef[];
  /** Tethers: a ball tied to a fixed post by a rope of length `len`; rope tension T = m·v²/L snaps it above `snapSpeed` (u/s). */
  tethers?: TetherDef[];
  /** Kicker ramps that jump the ball. */
  ramps?: RampDef[];
  /** Conveyor belts: the deck drags the ball toward belt velocity (vx, vz) in u/s. */
  conveyors?: (BoxDef & { vx: number; vz: number })[];
  /** Openings in the deck: a sphere drops if it hangs over one longer than the fall time. */
  holes?: HoleDef[];
  /** Rounded jaw knuckles / round posts: solid cushion, no kick. */
  posts?: CircleDef[];
  /** Ball set used by every sphere in the level (never mixed). */
  ballSet?: import('../physics/PhysicsMaterials').BallSet;
  /** 'rotation' = numbered balls must be potted lowest-first (9-ball style); out of order = foul (+1, ball respotted). */
  rule?: 'rotation' | '8ball';
  /** Round pinball-style kick bumpers. */
  bumpers?: CircleDef[];
  balls: BallDef[];
  pockets: PocketDef[];
  switches: SwitchDef[];
  barriers: BarrierDef[];
  portals: PortalDef[];
  hoops: HoopDef[];
  objectives: ObjectiveDef[];
  camera: { x: number; z: number; dist: number; yaw?: number };
  /** Mandatory challenge (every 5th sector): finish within maxStrokes or the attempt fails; later sectors stay locked until it is beaten. */
  challenge?: { maxStrokes: number };
}
