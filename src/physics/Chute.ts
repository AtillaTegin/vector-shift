import type { ChuteDef } from '../levels/LevelTypes';
import { G } from './BallModel';

/**
 * Water-slide chute (banked half-pipe). The ball's ride is solved from physics, identically for the
 * simulation and the shot predictor:
 *  - energy: a rolling sphere carries ½mv² + ½Iω² = (7/10)mv², so v² = v₀² − (10/7)·g·Δh
 *  - friction along the trough: v² −= 2·(10/7)·μ·g·ds   (μ = water-film friction, small)
 *  - curves: the banked wall supplies the centripetal force; the ball stays in while
 *    v²/R ≤ g·(tanβ + μgrip)/(1 − μgrip·tanβ)   (banked-curve limit). Faster → it flies over the lip.
 *  - if v² drops to 0 on a climb, the ball slides back and leaves through the mouth.
 */
export interface ChuteSample { x: number; y: number; z: number; t: number; v: number }
export interface ChuteRun {
  outcome: 'exit' | 'back' | 'fly';
  samples: ChuteSample[];
  /** position + horizontal velocity when the ball leaves the chute (exit end, mouth, or the lip it flew over) */
  pos: { x: number; y: number; z: number };
  vel: { x: number; z: number };
  vy: number;
  duration: number;
}

const MU_WATER = 0.012;
const GRIP = 0.25;

/** Minimum and maximum entry speeds for a clean run (shown on the chute and in the predictor). */
export function chuteWindow(c: ChuteDef) {
  let lo = 0.5, hi = 200;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (runChute(c, m).outcome === 'back') lo = m; else hi = m; }
  const vmin = hi;
  let a = vmin, b = 200;
  if (runChute(c, b).outcome !== 'fly') return { vmin, vmax: Infinity };
  for (let k = 0; k < 40; k++) { const m = (a + b) / 2; if (runChute(c, m).outcome === 'fly') b = m; else a = m; }
  return { vmin, vmax: a };
}

export function runChute(c: ChuteDef, v0: number): ChuteRun {
  const P = c.points;
  const tanB = Math.tan(((c.bank ?? 35) * Math.PI) / 180);
  const latMax = G * (tanB + GRIP) / Math.max(0.05, 1 - GRIP * tanB);
  const k = 10 / 7;
  let v2 = v0 * v0, t = 0;
  const samples: ChuteSample[] = [{ x: P[0][0], y: P[0][1], z: P[0][2], t: 0, v: v0 }];
  for (let i = 1; i < P.length; i++) {
    const [ax, ay, az] = P[i - 1], [bx, by, bz] = P[i];
    const ds = Math.hypot(bx - ax, by - ay, bz - az);
    const v2n = v2 - k * G * (by - ay) - 2 * k * MU_WATER * G * ds;
    if (v2n <= 0) {
      // ran out of speed on the climb: slide back down and out of the mouth with the energy that is left
      // friction acts on the way up AND back down the same stretch of trough
      const back = Math.sqrt(Math.max(0.09, v0 * v0 - 4 * k * MU_WATER * G * pathLen(P, i - 1)));
      const d = dir2(P[1], P[0]);
      const climb = [...samples].reverse().map((q, j) => ({ ...q, t: t + (t - q.t) }));
      return { outcome: 'back', samples: [...samples, ...climb.slice(1)], pos: { x: P[0][0] + d.x * 0.1, y: P[0][1], z: P[0][2] + d.z * 0.1 }, vel: { x: d.x * back, z: d.z * back }, vy: 0, duration: 2 * t };
    }
    const vm = (Math.sqrt(v2) + Math.sqrt(v2n)) / 2;
    t += ds / Math.max(0.2, vm);
    v2 = v2n;
    samples.push({ x: bx, y: by, z: bz, t, v: Math.sqrt(v2) });
    // curvature at this vertex (horizontal radius through the neighbouring points)
    if (i < P.length - 1) {
      const R = radius3(P[i - 1], P[i], P[i + 1]);
      if (R < 1e3 && v2 / R > latMax) {
        const d = dir2(P[i - 1], P[i]), v = Math.sqrt(v2);
        return { outcome: 'fly', samples, pos: { x: bx, y: by + 0.3, z: bz }, vel: { x: d.x * v, z: d.z * v }, vy: 2, duration: t };
      }
    }
  }
  const n = P.length - 1, d = dir2(P[n - 1], P[n]), v = Math.sqrt(v2);
  return { outcome: 'exit', samples, pos: { x: P[n][0] + d.x * 0.05, y: P[n][1], z: P[n][2] + d.z * 0.05 }, vel: { x: d.x * v, z: d.z * v }, vy: 0, duration: t };
}

/** Position along the ride at time `t` (for animating the ball inside the chute). */
export function chuteAt(run: ChuteRun, t: number) {
  const s = run.samples;
  for (let i = 1; i < s.length; i++) if (t <= s[i].t) { const f = (t - s[i - 1].t) / Math.max(1e-6, s[i].t - s[i - 1].t); return { x: s[i - 1].x + (s[i].x - s[i - 1].x) * f, y: s[i - 1].y + (s[i].y - s[i - 1].y) * f, z: s[i - 1].z + (s[i].z - s[i - 1].z) * f }; }
  const l = s[s.length - 1];
  return { x: l.x, y: l.y, z: l.z };
}

const dir2 = (a: number[], b: number[]) => { const dx = b[0] - a[0], dz = b[2] - a[2], l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; };
const pathLen = (P: number[][], upto: number) => { let s = 0; for (let i = 1; i <= upto && i < P.length; i++) s += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); return s; };
function radius3(a: number[], b: number[], c: number[]) {
  const A = Math.hypot(b[0] - a[0], b[2] - a[2]), B = Math.hypot(c[0] - b[0], c[2] - b[2]), C = Math.hypot(c[0] - a[0], c[2] - a[2]);
  const cross = Math.abs((b[0] - a[0]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[0] - a[0]));
  return cross < 1e-6 ? 1e9 : (A * B * C) / (2 * cross);
}
