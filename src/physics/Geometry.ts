/** Small 2D (XZ-plane) vector helpers shared by the simulation and the trajectory raycaster. */
export interface V2 { x: number; z: number }
export interface V3 { x: number; y: number; z: number }

export const len2 = (x: number, z: number) => Math.hypot(x, z);
export const deg = (d: number) => (d * Math.PI) / 180;

/** World axes of a box rotated by `rot` around +Y (three.js / Rapier convention). */
export function boxAxes(rot: number) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { ax: { x: c, z: -s }, az: { x: s, z: c } };
}

/** Facing angle (deg) -> unit normal on the XZ plane. */
export function facingNormal(facingDeg: number): V2 {
  const r = deg(facingDeg);
  return { x: Math.cos(r), z: Math.sin(r) };
}

/** Yaw (three.js rotation.y) that maps local +X onto direction (dx, dz). */
export const yawFromDir = (dx: number, dz: number) => Math.atan2(-dz, dx);

export function quatFromYaw(rot: number) {
  return { x: 0, y: Math.sin(rot / 2), z: 0, w: Math.cos(rot / 2) };
}

/** Is point (px,pz) inside oriented box (with optional margin)? */
export function pointInBox(px: number, pz: number, b: { x: number; z: number; w: number; d: number; rot?: number }, margin = 0) {
  const { ax, az } = boxAxes(b.rot ?? 0);
  const dx = px - b.x, dz = pz - b.z;
  const lx = dx * ax.x + dz * ax.z;
  const lz = dx * az.x + dz * az.z;
  return Math.abs(lx) <= b.w / 2 + margin && Math.abs(lz) <= b.d / 2 + margin;
}

// ───────────── inclined planes ─────────────
/** Inclined plane: a box whose top rises from y0 (local −x end) to y1 (local +x end); `w` = horizontal run. */
export interface SlopeLike { x: number; z: number; w: number; d: number; rot?: number; y0: number; y1: number }
export const slopeAngle = (s: SlopeLike) => Math.atan2(s.y1 - s.y0, s.w);
/** Uphill horizontal unit direction. */
export const slopeUp = (s: SlopeLike) => { const r = s.rot ?? 0; return { x: Math.cos(r), z: -Math.sin(r) }; };
/** Surface height at (x,z), or null when outside the plane's footprint. */
export function slopeHeight(s: SlopeLike, x: number, z: number, margin = 0): number | null {
  if (!pointInBox(x, z, s, margin)) return null;
  const u = slopeUp(s);
  const along = (x - s.x) * u.x + (z - s.z) * u.z;
  const t = Math.max(-0.5, Math.min(0.5, along / s.w));
  return (s.y0 + s.y1) / 2 + t * (s.y1 - s.y0);
}
/** Orientation quaternion: yaw about +Y, then pitch the local +X end up by the slope angle (roll about local Z). */
export function slopeQuat(s: SlopeLike) {
  const a = (s.rot ?? 0) / 2, b = slopeAngle(s) / 2;
  const qy = { x: 0, y: Math.sin(a), z: 0, w: Math.cos(a) }, qz = { x: 0, y: 0, z: Math.sin(b), w: Math.cos(b) };
  return {
    w: qy.w * qz.w - qy.x * qz.x - qy.y * qz.y - qy.z * qz.z,
    x: qy.w * qz.x + qy.x * qz.w + qy.y * qz.z - qy.z * qz.y,
    y: qy.w * qz.y - qy.x * qz.z + qy.y * qz.w + qy.z * qz.x,
    z: qy.w * qz.z + qy.x * qz.y - qy.y * qz.x + qy.z * qz.w,
  };
}
/** Centre of a slab of thickness T whose TOP face is the slope surface. */
export function slopeSlabCentre(s: SlopeLike, T: number) {
  const th = slopeAngle(s), r = s.rot ?? 0;
  const n = { x: -Math.sin(th) * Math.cos(r), y: Math.cos(th), z: Math.sin(th) * Math.sin(r) };
  return { x: s.x - n.x * T / 2, y: (s.y0 + s.y1) / 2 - n.y * T / 2, z: s.z - n.z * T / 2, len: Math.hypot(s.w, s.y1 - s.y0) };
}
