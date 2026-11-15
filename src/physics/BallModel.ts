/**
 * BallModel — billiard-ball motion on cloth (sliding / rolling / spinning), the standard model used by
 * pool & Russian-pyramid simulators (Alciatore "Pool physics"; Han 2005; Mathavan et al. 2010):
 *
 *  • Contact-point slip  u = v + ω × (−r·ŷ) = (vx + r·ωz , vz − r·ωx)
 *  • SLIDING (|u| > 0): kinetic cloth friction μs·g opposes u.
 *        dv/dt = −μs·g·û           dω/dt = (5·μs·g / 2r)·(ûz, 0, −ûx)
 *    so the slip decays at (7/2)·μs·g and the ball reaches natural roll after |u| / (3.5·μs·g).
 *    A centre-ball (stun) hit therefore ends up rolling at 5/7 of its launch speed.
 *  • ROLLING (u = 0): rolling resistance μr·g decelerates v; ω stays locked to v (ωx = vz/r, ωz = −vx/r).
 *  • SPINNING: vertical spin ωy decays at (5·μsp·g / 2r).
 *
 * World units are decimetres (ball r = 0.28 ≈ 28 mm, a real pool ball), so gravity is 98.1 u/s².
 * Both the Simulation and the trajectory predictor integrate this exact model.
 */
export const G = 98.1;

export interface Cloth {
  /** sliding friction ball–cloth (real: 0.15–0.25) */
  muSlide: number;
  /** rolling resistance (real: 0.005–0.015; slower cloth = higher) */
  muRoll: number;
  /** spin (vertical axis) friction (real: ~0.044 · r) */
  muSpin: number;
}

export const DEFAULT_CLOTH: Cloth = { muSlide: 0.2, muRoll: 0.011, muSpin: 0.044 };

export interface BallState { vx: number; vz: number; wx: number; wy: number; wz: number }

/** Advance a grounded ball's velocity/spin by dt. Mutates and returns `s`. */
export function stepBall(s: BallState, r: number, dt: number, cloth: Cloth): BallState {
  const aSlide = cloth.muSlide * G;
  let t = dt;
  const ux = s.vx + r * s.wz, uz = s.vz - r * s.wx;
  const u = Math.hypot(ux, uz);
  if (u > 1e-4) {
    // sliding — clamp to the moment slip reaches zero
    const tSlide = u / (3.5 * aSlide);
    const ts = Math.min(t, tSlide);
    const nx = ux / u, nz = uz / u;
    s.vx -= aSlide * nx * ts; s.vz -= aSlide * nz * ts;
    const k = (5 * aSlide) / (2 * r) * ts;
    s.wx += k * nz; s.wz -= k * nx;
    t -= ts;
    if (ts === tSlide) { s.wx = s.vz / r; s.wz = -s.vx / r; }
  }
  if (t > 0) {
    // rolling with resistance
    const v = Math.hypot(s.vx, s.vz);
    if (v > 0) {
      const nv = Math.max(0, v - cloth.muRoll * G * t);
      const f = nv / v;
      s.vx *= f; s.vz *= f;
    }
    s.wx = s.vz / r; s.wz = -s.vx / r;
  }
  // vertical spin decay
  const dwy = ((5 * cloth.muSpin * G) / (2 * r)) * dt;
  s.wy = Math.abs(s.wy) <= dwy ? 0 : s.wy - Math.sign(s.wy) * dwy;
  return s;
}

/** Is the ball still sliding (slip above threshold)? */
export function isSliding(s: BallState, r: number) {
  return Math.hypot(s.vx + r * s.wz, s.vz - r * s.wx) > 0.02;
}

/**
 * Cue-tip impact (Alciatore TP B.1): tip offset b (fraction of r, positive = above centre) gives
 * spin ω = 5·v·b / (2r). b = 0.4 → natural roll; b = 0 → stun; b < 0 → draw. Max |b| ≈ 0.5 (miscue limit).
 * Side offset gives vertical-axis english the same way.
 */
export function cueImpact(v: number, angle: number, r: number, spinY: number, spinX: number): BallState {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  const b = spinY * 0.5, c = spinX * 0.5;
  const w = (5 * v * b) / (2 * r);
  return { vx: dx * v, vz: dz * v, wx: dz * w, wz: -dx * w, wy: (5 * v * c) / (2 * r) };
}

/**
 * Cushion english: on a rail contact, running/check side-spin converts into tangential speed
 * (rubber grips the spinning ball). Returns the tangential velocity change along t.
 */
export const ENGLISH_GRIP = 0.18;
