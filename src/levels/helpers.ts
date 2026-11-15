import type { BoxDef, FloorDef, WallDef, WallKind } from './LevelTypes';
import { WALL_THICKNESS } from '../physics/PhysicsMaterials';

/** Wall segment between two points (centred on the line). */
export function seg(x1: number, z1: number, x2: number, z2: number, y = 0, t = WALL_THICKNESS, kind?: WallKind): WallDef {
  const dx = x2 - x1, dz = z2 - z1;
  return { x: (x1 + x2) / 2, z: (z1 + z2) / 2, w: Math.hypot(dx, dz) + t, d: t, rot: Math.atan2(-dz, dx), y, kind };
}
/** Special wall segment (glass / concrete / bumper). */
export const wall = (kind: WallKind, x1: number, z1: number, x2: number, z2: number, y = 0) => seg(x1, z1, x2, z2, y, kind === 'bumper' ? 0.36 : WALL_THICKNESS, kind);
/** Axis-aligned floor rectangle from extents. */
export function rect(x0: number, x1: number, z0: number, z1: number, y = 0, style: FloorDef['style'] = 'felt'): FloorDef {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y, style };
}
/** Axis-aligned zone box from extents. */
export function zone(x0: number, x1: number, z0: number, z1: number, y = 0): BoxDef {
  return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: x1 - x0, d: z1 - z0, y };
}
/**
 * Rails around a rectangle. `open` lists sides left without rails ('n' = −z, 's' = +z, 'w' = −x, 'e' = +x);
 * `gaps` cuts openings: [side, from, to] along that side.
 */
export function rails(x0: number, x1: number, z0: number, z1: number, open = '', gaps: [string, number, number][] = [], y = 0): WallDef[] {
  const out: WallDef[] = [];
  const side = (s: string, a: [number, number], b: [number, number]) => {
    if (open.includes(s)) return;
    const along = s === 'n' || s === 's';
    const cuts = gaps.filter((g) => g[0] === s).sort((p, q) => p[1] - q[1]);
    let from = along ? a[0] : a[1];
    const to = along ? b[0] : b[1];
    const fixed = along ? a[1] : a[0];
    const push = (f: number, t: number) => { if (t - f > 0.05) out.push(along ? seg(f, fixed, t, fixed, y) : seg(fixed, f, fixed, t, y)); };
    for (const [, g0, g1] of cuts) { push(from, g0); from = g1; }
    push(from, to);
  };
  side('n', [x0, z0], [x1, z0]); side('s', [x0, z1], [x1, z1]);
  side('w', [x0, z0], [x0, z1]); side('e', [x1, z0], [x1, z1]);
  return out;
}

// ───────────── pool tables with rail-cut pockets ─────────────
import type { PocketDef, PocketColor, CircleDef } from './LevelTypes';
import { RAIL_POCKETS, type BallSet } from '../physics/PhysicsMaterials';

export type PocketSpot = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';
export interface TablePocket {
  id: string; at: PocketSpot; color: PocketColor;
  style?: keyof typeof RAIL_POCKETS;
  requires?: string[];
  /** side pockets: position along the rail (default = middle) */
  pos?: number;
}

/**
 * A billiard table: felt bed, rails, and pockets cut INTO the rails at real proportions
 * (mouth = multiple of ball diameter, see RAIL_POCKETS). The jaws are physical cushion segments that
 * converge into the throat; snooker/russian get rounded knuckles (posts) at the jaw tips, so an
 * off-line ball genuinely rattles off them instead of a scripted rejection.
 */
export function poolTable(x0: number, x1: number, z0: number, z1: number, pockets: TablePocket[], opts: { set?: BallSet; style?: FloorDef['style']; y?: number; gaps?: [string, number, number][] } = {}) {
  const y = opts.y ?? 0;
  const D = (opts.set === 'russian' ? 0.34 : 0.28) * 2;
  const T = WALL_THICKNESS / 2;
  const gaps: [string, number, number][] = [...(opts.gaps ?? [])];
  const walls: WallDef[] = [], posts: CircleDef[] = [], out: PocketDef[] = [];
  const corner: Record<string, [number, number, number, number]> = { nw: [x0, z0, 1, 1], ne: [x1, z0, -1, 1], sw: [x0, z1, 1, -1], se: [x1, z1, -1, -1] };
  for (const p of pockets) {
    const spec = RAIL_POCKETS[p.style ?? 'american'];
    const conv = (spec.converge * Math.PI) / 180;
    const kn = spec.knuckle * D;
    if (p.at in corner) {
      const [cx, cz, sx, sz] = corner[p.at];
      const M = spec.corner * D, s = M / Math.SQRT2;
      // mouth is measured between the cushion NOSES (inner rail faces), like the WPA spec
      const icx = cx + sx * T, icz = cz + sz * T;
      const P1 = { x: icx + sx * s, z: icz }, P2 = { x: icx, z: icz + sz * s };
      gaps.push([sz > 0 ? 'n' : 's', sx > 0 ? x0 - 1 : P1.x - T, sx > 0 ? P1.x + T : x1 + 1]);
      gaps.push([sx > 0 ? 'w' : 'e', sz > 0 ? z0 - 1 : P2.z - T, sz > 0 ? P2.z + T : z1 + 1]);
      const nx = sx / Math.SQRT2, nz = sz / Math.SQRT2; // into the table
      const L = s * 0.7;
      // jaw facings run from each nose back toward the pocket, converging slightly
      const mx = (P1.x + P2.x) / 2, mz = (P1.z + P2.z) / 2;
      for (const P of [P1, P2]) {
        const tl = Math.hypot(mx - P.x, mz - P.z), tx = (mx - P.x) / tl, tz = (mz - P.z) / tl; // lateral toward mouth centre
        const dx = -nx * Math.cos(conv) + tx * Math.sin(conv), dz = -nz * Math.cos(conv) + tz * Math.sin(conv);
        // set the jaw face (not its centre line) on the mouth edge: shift outward by half thickness / knuckle radius
        const ox = P.x - tx * 0.08, oz = P.z - tz * 0.08;
        walls.push(seg(ox, oz, ox + dx * L, oz + dz * L, y, 0.16));
        if (kn > 0) posts.push({ x: P.x - tx * kn, z: P.z - tz * kn, r: kn, y });
      }
      out.push({ id: p.id, x: icx, z: icz, y, color: p.color, requires: p.requires, style: p.style ?? 'american',
        rail: { capture: M * 0.4, mouth: M, facing: (Math.atan2(nz, nx) * 180) / Math.PI, kind: 'corner' } });
    } else {
      const M = spec.side * D;
      const along = p.at === 'n' || p.at === 's';
      const c = p.pos ?? (along ? (x0 + x1) / 2 : (z0 + z1) / 2);
      const inward = p.at === 'n' || p.at === 'w' ? 1 : -1;
      const edge = (p.at === 'n' ? z0 : p.at === 's' ? z1 : p.at === 'w' ? x0 : x1) + inward * T;
      gaps.push([p.at, c - M / 2 - T, c + M / 2 + T]);
      const L = 0.45;
      for (const side of [-1, 1]) {
        const a = c + side * (M / 2 + 0.08);
        const b = c + side * (M / 2 + 0.08 - L * Math.tan(conv));
        if (along) walls.push(seg(a, edge, b, edge - inward * L, y, 0.16));
        else walls.push(seg(edge, a, edge - inward * L, b, y, 0.16));
        const k = c + side * (M / 2 + kn);
        if (kn > 0) posts.push(along ? { x: k, z: edge, r: kn, y } : { x: edge, z: k, r: kn, y });
      }
      const hx = along ? c : edge - inward * M * 0.22, hz = along ? edge - inward * M * 0.22 : c;
      out.push({ id: p.id, x: hx, z: hz, y, color: p.color, requires: p.requires, style: p.style ?? 'american',
        rail: { capture: M * 0.4, mouth: M, facing: along ? (inward > 0 ? 90 : -90) : (inward > 0 ? 0 : 180), kind: 'side' } });
    }
  }
  walls.push(...rails(x0, x1, z0, z1, '', gaps, y));
  const floors: FloorDef[] = [rect(x0, x1, z0, z1, y, opts.style ?? 'felt')];
  for (const p of out) if (p.rail?.kind === 'side') floors.push({ x: p.x, z: p.z, w: p.rail.mouth, d: p.rail.mouth, y, style: opts.style ?? 'felt' });
  return { floors, walls, posts, pockets: out };
}

// ───────────── multi-level islands ─────────────
import type { SlopeDef, FloorStyle } from './LevelTypes';
/** Island: floor + rails at height y. `open` sides have no rail; `gaps` cut openings ([side, from, to]). */
export function island(x0: number, x1: number, z0: number, z1: number, y = 0, style: FloorStyle = 'felt', open = '', gaps: [string, number, number][] = []) {
  return { floors: [rect(x0, x1, z0, z1, y, style)], walls: rails(x0, x1, z0, z1, open, gaps, y) };
}
/** Inclined plane from point A (height ya) to point B (height yb), `width` across. Up- or downhill. */
export function incline(xa: number, za: number, ya: number, xb: number, zb: number, yb: number, width: number, style: FloorStyle = 'tile'): SlopeDef {
  return { x: (xa + xb) / 2, z: (za + zb) / 2, w: Math.hypot(xb - xa, zb - za), d: width, rot: Math.atan2(-(zb - za), xb - xa), y0: ya, y1: yb, style };
}
/** Merge level pieces (floors/walls/slopes/posts/pockets...). */
export function merge(...parts: Record<string, unknown[] | undefined>[]) {
  const out: Record<string, unknown[]> = { floors: [], walls: [], slopes: [], posts: [], pockets: [] };
  for (const p of parts) for (const [k, v] of Object.entries(p)) if (Array.isArray(v)) (out[k] ??= []).push(...v);
  return out as { floors: import('./LevelTypes').FloorDef[]; walls: WallDef[]; slopes: SlopeDef[]; posts: CircleDef[]; pockets: PocketDef[] };
}
