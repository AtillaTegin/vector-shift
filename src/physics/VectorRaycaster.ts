import type { Simulation, StaticWall } from './Simulation';
import type { Ball } from '../entities/Ball';
import { boxAxes, pointInBox, slopeHeight, slopeAngle, slopeUp, type V3 } from './Geometry';
import {
  WATER_DRAG, WATER_SINK_SPEED, HOLE_FALL_TIME, BUMPER_KICK, ROUND_BUMPER_KICK, BREAKABLE, CUSHION_E,
  FIXED_DT, CURRENT_SCALE, POCKET_STYLES, shotSpeed, WIND_SCALE,
} from './PhysicsMaterials';
import { runChute } from './Chute';
import { stepBall, cueImpact, ENGLISH_GRIP, G, type BallState } from './BallModel';
/** Wind on a rolling ball: part of the push goes into spin (same 5/7 split as the river push). */
const PUSH_EFF_W = 1;

export interface TrajPoint extends V3 { v: number }
export interface TrajPath { points: TrajPoint[]; kind: 'main' | 'portal' }
export interface Bounce { pos: V3; angleIn: number; angleOut: number; vin: number; kind: 'cushion' | 'bumper' | 'crack' }
export interface GhostHit {
  pos: V3;
  target: number;
  /** Direction the object ball will travel (line of centres). */
  objectDir: { x: number; z: number };
  /** Tangent line: where the cue ball deflects (stun shot, 90° rule). */
  tangentDir: { x: number; z: number };
  speed: number;
}
export type HazardKind = 'fall' | 'hole' | 'sink';
export interface HazardNote { pos: V3; kind: HazardKind | 'break' | 'water' | 'holeClear' | 'jump'; text: string; ok: boolean }
export interface Trajectory {
  paths: TrajPath[];
  bounces: Bounce[];
  ghost: GhostHit | null;
  portalJumps: { from: string; to: string }[];
  /** Where the sphere is predicted to be lost (edge / hole / sink). */
  fall: (V3 & { kind: HazardKind }) | null;
  /** Predicted resting point. */
  stop: V3 | null;
  notes: HazardNote[];
  /** Pocket the sphere is predicted to drop into. */
  pocket?: { id: string; accepted: boolean };
}

interface Hit { t: number; type: 'wall' | 'ball' | 'portal' | 'fall' | 'bumper'; nx?: number; nz?: number; ball?: Ball; portal?: number; wall?: StaticWall }

const STEP = 0.05;

/**
 * VectorRaycaster — physically-integrated shot predictor.
 *
 * Marches the sphere along the floor in small steps, applying the same models the Simulation uses:
 * rolling resistance + linear damping, water drag (and sink speed), river push, hole hang-time,
 * θ_in = θ_out reflection with cushion restitution, bumper kicks, breakable-panel thresholds and
 * portals. Stops at the first object-ball contact (ghost ball) or when the sphere comes to rest.
 */
export class VectorRaycaster {
  constructor(private readonly sim: Simulation) {}

  predict(ball: Ball, angle: number, power: number, spin = { x: 0, y: 0 }, maxBounces = 14): Trajectory {
    const res: Trajectory = { paths: [], bounces: [], ghost: null, portalJumps: [], fall: null, stop: null, notes: [] };
    const r = ball.radius, L = this.sim.level;
    const start = ball.pos();
    let px = start.x, pz = start.z, py = start.y - r;
    const st: BallState = cueImpact(shotSpeed(power), angle, r, spin.y, spin.x);
    let path: TrajPath = { points: [{ x: px, y: py + r, z: pz, v: Math.hypot(st.vx, st.vz) }], kind: 'main' };
    res.paths.push(path);
    let bounces = 0, lastPortal = -1, sinceDot = 0, holeTime = 0, travelled = 0, time = 0, rampCd = 0;
    this.tNow = this.sim.time;
    let wasWet = false, wasHole = -1;
    const broken = new Set<StaticWall>();
    const snapped = new Set<number>(this.sim.snapped);
    const hp = new Map<StaticWall, number>();
    const pushPt = () => { path.points.push({ x: px, y: py + r, z: pz, v: Math.hypot(st.vx, st.vz) }); sinceDot = 0; };

    for (let iter = 0; iter < 20000 && travelled < 400 && time < 30; iter++) {
      const speed = Math.hypot(st.vx, st.vz);
      if (speed < 0.05) {
        // on an incline steeper than rolling friction the ball turns round and rolls back down
        const sl0 = this.sim.slopeUnder(px, pz, py);
        if (sl0 && Math.abs(Math.tan(slopeAngle(sl0))) > ball.mat.cloth.muRoll * 1.5 && time < 25) { const u = slopeUp(sl0), k = sl0.y1 > sl0.y0 ? -0.06 : 0.06; st.vx = u.x * k; st.vz = u.z * k; continue; }
        res.stop = { x: px, y: py + r, z: pz }; pushPt(); break;
      }
      const dx = st.vx / speed, dz = st.vz / speed;
      const stepLen = Math.min(STEP, speed * FIXED_DT * 4);
      this.tAt = this.tNow + time;
      const hit = this.nearest(ball, px, py, pz, dx, dz, stepLen, lastPortal, broken);
      const t = hit ? hit.t : stepLen;
      px += dx * t; pz += dz * t; travelled += t; sinceDot += t;
      const dt = t / speed;
      time += dt;
      stepBall(st, r, dt, this.sim.clothAt(ball, px, pz, py));
      // inclined plane: follow the surface height; a rolling sphere accelerates at (5/7)·g·sinθ along the fall line
      const sl = this.sim.slopeUnder(px, pz, py);
      if (sl) {
        py = slopeHeight(sl, px, pz)!;
        const th = slopeAngle(sl), u = slopeUp(sl), a = (5 / 7) * G * Math.sin(th) * Math.cos(th);
        st.vx -= u.x * a * dt; st.vz -= u.z * a * dt;
        st.wx = st.vz / r; st.wz = -st.vx / r;
      }
      // tether: same taut-rope rule as the simulation (radial velocity removed, held on the circle, snaps on overload)
      for (const [ti, tt] of (L.tethers ?? []).entries()) {
        if (tt.ball !== ball.index || snapped.has(ti)) continue;
        const ex = px - tt.x, ez = pz - tt.z, ed = Math.hypot(ex, ez);
        if (ed <= tt.len) continue;
        const nx = ex / ed, nz = ez / ed, vr = st.vx * nx + st.vz * nz, vtx = st.vx - vr * nx, vtz = st.vz - vr * nz;
        const load = Math.sqrt(vtx * vtx + vtz * vtz + Math.max(0, vr) ** 2 * 2);
        if (tt.snapSpeed !== undefined && load > tt.snapSpeed) { snapped.add(ti); res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'break', text: 'ROPE SNAPS', ok: true }); continue; }
        if (vr > 0) { st.vx = vtx; st.vz = vtz; }
        px = tt.x + nx * tt.len; pz = tt.z + nz * tt.len;
        if (sinceDot > 0.12) pushPt();
      }
      // water-slide chute: solved analytically (energy + banked-curve limit), same as the simulation
      const ch = this.sim.chuteCapture(px, py, pz, st.vx, st.vz);
      if (ch) {
        const run = runChute(ch, Math.hypot(st.vx, st.vz));
        pushPt();
        for (const q of run.samples) path.points.push({ x: q.x, y: q.y + r, z: q.z, v: q.v });
        res.notes.push({ pos: { x: ch.points[0][0], y: ch.points[0][1], z: ch.points[0][2] }, kind: 'jump', text: run.outcome === 'exit' ? 'SLIDE OK' : run.outcome === 'back' ? 'TOO SLOW — ROLLS BACK' : 'TOO FAST — FLIES OFF', ok: run.outcome === 'exit' });
        px = run.pos.x; pz = run.pos.z; py = run.pos.y; st.vx = run.vel.x; st.vz = run.vel.z; st.wx = st.vz / r; st.wz = -st.vx / r; st.wy = 0;
        time += run.duration;
        pushPt();
        if (run.outcome === 'fly' || !this.supported(px, pz, py)) { res.fall = { x: px, y: py, z: pz, kind: 'fall' }; break; }
        continue;
      }
      for (const w of L.winds ?? []) if (pointInBox(px, pz, w) && (!w.gust || this.sim.cycleOpen(w.gust, this.tNow + time))) { st.vx += w.fx * WIND_SCALE * dt * PUSH_EFF_W; st.vz += w.fz * WIND_SCALE * dt * PUSH_EFF_W; }
      for (const c of L.conveyors ?? []) if (Math.abs((c.y ?? 0) - py) < 0.12 && pointInBox(px, pz, c)) { const k = 1 - Math.exp(-4 * dt); st.vx += (c.vx - st.vx) * k; st.vz += (c.vz - st.vz) * k; st.wx = st.vz / r; st.wz = -st.vx / r; }

      // kicker ramps: ballistic flight (with wind), then land or fall
      rampCd -= dt;
      const ramp = rampCd > 0 ? null : (L.ramps ?? []).find((rp) => Math.abs((rp.y ?? 0) - py) < 0.12 && pointInBox(px, pz, rp));
      if (ramp) {
        const a = (ramp.facing * Math.PI) / 180;
        const along = st.vx * Math.cos(a) + st.vz * Math.sin(a);
        if (along >= 2) {
          pushPt();
          let vy = along * ramp.lift, h = 0, ft = 0;
          const fdt = 1 / 120;
          while (ft < 5) {
            for (const w of L.winds ?? []) if (pointInBox(px, pz, w) && (!w.gust || this.sim.cycleOpen(w.gust, this.tNow + time + ft))) { st.vx += w.fx * WIND_SCALE * fdt; st.vz += w.fz * WIND_SCALE * fdt; }
            px += st.vx * fdt; pz += st.vz * fdt; vy -= G * fdt; h += vy * fdt; ft += fdt;
            if (h <= 0) break;
            path.points.push({ x: px, y: py + r + h, z: pz, v: Math.hypot(st.vx, st.vz) });
          }
          time += ft;
          st.wx = st.vz / r; st.wz = -st.vx / r;
          res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'jump', text: `JUMP ${(vy * vy / (2 * G) + 0).toFixed(1)}u airtime ${ft.toFixed(2)}s`, ok: true });
          rampCd = 0.4;
          if (!this.supported(px, pz, py)) { pushPt(); res.fall = { x: px, y: py, z: pz, kind: 'fall' }; break; }
          pushPt();
          continue;
        }
      }

      // water & rivers
      let wet = false, pool = false;
      let drag = WATER_DRAG;
      for (const c of L.currents ?? []) if (Math.abs((c.y ?? 0) - py) < 0.15 && pointInBox(px, pz, c)) { wet = true; const dir = c.when && this.sim.sig(c.when) ? -1 : 1; st.vx += dir * c.fx * CURRENT_SCALE * dt; st.vz += dir * c.fz * CURRENT_SCALE * dt; }
      if (!wet) for (const w of L.water ?? []) if (Math.abs((w.y ?? 0) - py) < 0.15 && pointInBox(px, pz, w)) { wet = true; if (w.shallow) drag = Math.min(drag, 0.9); else { pool = true; drag = WATER_DRAG; } }
      let drained = false;
      for (const vx of L.vortices ?? []) {
        const ddx = px - vx.x, ddz = pz - vx.z, d = Math.hypot(ddx, ddz);
        if (d > vx.r || Math.abs((vx.y ?? 0) - py) > 0.15) continue;
        wet = true; drag = Math.min(drag, 0.6);
        const f = 1 - d / vx.r * 0.6, tx = -ddz / (d || 1), tz = ddx / (d || 1);
        st.vx += (tx * vx.swirl - ddx / (d || 1) * vx.pull) * f * dt; st.vz += (tz * vx.swirl - ddz / (d || 1) * vx.pull) * f * dt;
        if (d < 0.32 && Math.hypot(st.vx, st.vz) < 6) drained = true;
      }
      if (drained) { pushPt(); res.fall = { x: px, y: py, z: pz, kind: 'sink' }; res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'sink', text: 'DRAINED', ok: false }); break; }
      if (wet) {
        const kw = Math.exp(-drag * dt);
        st.vx *= kw; st.vz *= kw; st.wx *= kw; st.wz *= kw;
        if (!wasWet) res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'water', text: `IN ${Math.hypot(st.vx, st.vz).toFixed(1)} u/s`, ok: true });
        if (pool && Math.hypot(st.vx, st.vz) < WATER_SINK_SPEED) {
          pushPt(); res.fall = { x: px, y: py, z: pz, kind: 'sink' };
          res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'sink', text: 'SINKS', ok: false });
          break;
        }
      }
      wasWet = wet;

      // open holes: hang-time model
      let overIdx = -1;
      (L.holes ?? []).forEach((h, i) => { if (Math.abs((h.y ?? 0) - py) < 0.15 && Math.hypot(px - h.x, pz - h.z) < h.r && (!h.cycle || !this.sim.cycleOpen(h.cycle, this.tNow + time))) overIdx = i; });
      holeTime = overIdx >= 0 ? holeTime + dt : 0;
      if (overIdx >= 0 && wasHole !== overIdx) {
        const h = L.holes![overIdx];
        const ox = px - h.x, oz = pz - h.z, b = ox * dx + oz * dz, c = ox * ox + oz * oz - h.r * h.r;
        const chord = -b + Math.sqrt(Math.max(0, b * b - c));
        const need = chord / HOLE_FALL_TIME;
        const s = Math.hypot(st.vx, st.vz);
        res.notes.push({ pos: { x: h.x, y: py, z: h.z }, kind: s >= need ? 'holeClear' : 'hole', text: `${s.toFixed(1)} / ${need.toFixed(1)} u/s`, ok: s >= need });
      }
      wasHole = overIdx;
      if (holeTime > HOLE_FALL_TIME) { pushPt(); res.fall = { x: px, y: py, z: pz, kind: 'hole' }; break; }

      // pockets on the path
      const pk = this.pocketAt(ball, px, pz, py);
      if (pk) { pushPt(); res.pocket = pk; break; }

      if (!hit) { if (sinceDot > 0.3) pushPt(); continue; }
      pushPt();
      if (hit.type === 'fall') { res.fall = { x: px, y: py, z: pz, kind: 'fall' }; break; }
      if (hit.type === 'ball') {
        const o = hit.ball!.pos();
        const ox = o.x - px, oz = o.z - pz, ol = Math.hypot(ox, oz) || 1;
        const obj = { x: ox / ol, z: oz / ol };
        const dot = dx * obj.x + dz * obj.z;
        let tx = dx - dot * obj.x, tz = dz - dot * obj.z;
        const tl = Math.hypot(tx, tz);
        if (tl > 1e-4) { tx /= tl; tz /= tl; } else { tx = 0; tz = 0; }
        res.ghost = { pos: { x: px, y: py + r, z: pz }, target: hit.ball!.index, objectDir: obj, tangentDir: { x: tx, z: tz }, speed: Math.hypot(st.vx, st.vz) };
        break;
      }
      if (hit.type === 'portal') {
        const g = this.sim.portals[hit.portal!];
        const out = g.link;
        const s = Math.hypot(st.vx, st.vz);
        res.portalJumps.push({ from: g.def.id, to: out.def.id });
        px = out.def.x + out.n.x * (r + 0.06); pz = out.def.z + out.n.z * (r + 0.06); py = out.y;
        st.vx = out.n.x * s; st.vz = out.n.z * s; st.wx = st.vz / r; st.wz = -st.vx / r;
        lastPortal = this.sim.portals.indexOf(out);
        path = { points: [{ x: px, y: py + r, z: pz, v: s }], kind: 'portal' };
        res.paths.push(path);
        continue;
      }
      const nx = hit.nx!, nz = hit.nz!;
      const vn = st.vx * nx + st.vz * nz; // negative = into the surface
      const vin = -vn;
      const aIn = Math.acos(Math.min(1, Math.abs(vn) / Math.max(1e-6, Math.hypot(st.vx, st.vz)))) * (180 / Math.PI);
      const w = hit.wall;
      if (w && (w.kind === 'glass' || w.kind === 'concrete')) {
        const spec = BREAKABLE[w.kind];
        const left = hp.get(w) ?? w.hp;
        if (vin >= spec.threshold) {
          if (left <= 1) {
            broken.add(w);
            st.vx *= spec.passThrough; st.vz *= spec.passThrough; st.wx *= spec.passThrough; st.wz *= spec.passThrough;
            res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'break', text: `BREAKS (${vin.toFixed(0)} ≥ ${spec.threshold})`, ok: true });
            continue;
          }
          hp.set(w, left - 1);
          res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'break', text: `CRACK ${left - 1} LEFT`, ok: true });
        } else {
          res.notes.push({ pos: { x: px, y: py, z: pz }, kind: 'break', text: `HOLDS (${vin.toFixed(0)} < ${spec.threshold})`, ok: false });
        }
      }
      // Rebound exactly as Rapier resolves it: normal component reversed with restitution e (+ bumper kick),
      // tangential and spin untouched — the cloth model then handles the post-rail slide.
      const bumper = hit.type === 'bumper' || w?.kind === 'bumper';
      const e = hit.type === 'bumper' ? 1.0 : bumper ? 0.975 : CUSHION_E;
      const kick = bumper ? (hit.type === 'bumper' ? ROUND_BUMPER_KICK : BUMPER_KICK) : 0;
      st.vx += ((1 + e) * vin + kick) * nx; st.vz += ((1 + e) * vin + kick) * nz;
      if (Math.abs(st.wy) > 0.5) { const k = ENGLISH_GRIP * r * st.wy; st.vx -= nz * k; st.vz += nx * k; st.wy *= 0.5; }
      px += nx * 1e-3; pz += nz * 1e-3;
      const aOut = Math.atan2(Math.abs(st.vx * nz - st.vz * nx), Math.abs(st.vx * nx + st.vz * nz)) * (180 / Math.PI);
      res.bounces.push({ pos: { x: px, y: py + r, z: pz }, angleIn: aIn, angleOut: aOut, vin, kind: bumper ? 'bumper' : w && w.kind !== 'steel' ? 'crack' : 'cushion' });
      lastPortal = -1;
      if (++bounces > maxBounces) break;
    }
    return res;
  }

  /** Would a ball centre at (x,z) drop into an (unlocked, accepting) pocket? */
  private pocketAt(ball: Ball, x: number, z: number, y: number) {
    for (const pk of this.sim.pockets) {
      if (Math.abs(pk.y - y) > 0.15) continue;
      const st = POCKET_STYLES[pk.def.style ?? 'standard'];
      if (Math.hypot(x - pk.def.x, z - pk.def.z) < (pk.def.rail ? pk.def.rail.capture : st.capture) && this.sim.requiresMet(pk.def.requires)) return { id: pk.def.id, accepted: pk.accepts(ball.kind) };
    }
    return null;
  }

  private tNow = 0;
  private tAt = 0;

  private nearest(ball: Ball, px: number, py: number, pz: number, dx: number, dz: number, maxT: number, skipPortal: number, broken: Set<StaticWall>): Hit | null {
    const r = ball.radius;
    let best: Hit | null = null;
    const consider = (h: Hit) => { if (h.t >= 0 && h.t <= maxT && (!best || h.t < best.t)) best = h; };

    for (const w of this.sim.staticWalls) {
      if (w.broken || broken.has(w)) continue;
      if (py + r < w.y - 0.05 || py > w.y + w.h + 0.05) continue;
      const h = rayBox(px, pz, dx, dz, w, r);
      if (h) consider({ t: h.t, type: 'wall', nx: h.nx, nz: h.nz, wall: w });
    }
    for (const b of this.sim.barriers) {
      if (b.def.kind !== 'gate') continue;
      // timed gates: judge them at the moment the ball would arrive
      const solid = b.def.cycle ? !(this.sim.requiresMet(b.def.requires) && this.sim.cycleOpen(b.def.cycle, this.tAt)) : b.solid;
      if (!solid) continue;
      const rot = b.def.spin ? b.angle + b.def.spin * (this.tAt - this.tNow) : b.angle;
      const h = rayBox(px, pz, dx, dz, b.def.swing || b.def.spin ? { ...b.def.box, rot } : b.def.box, r);
      if (h) consider({ t: h.t, type: 'wall', nx: h.nx, nz: h.nz });
    }
    for (const c of this.sim.posts) {
      const t = rayCircle(px, pz, dx, dz, c.x, c.z, c.r + r);
      if (t !== null) { const hx = px + dx * t - c.x, hz = pz + dz * t - c.z, l = Math.hypot(hx, hz) || 1; consider({ t, type: 'wall', nx: hx / l, nz: hz / l }); }
    }
    for (const c of this.sim.roundBumpers) {
      const t = rayCircle(px, pz, dx, dz, c.x, c.z, c.r + r);
      if (t !== null) { const hx = px + dx * t - c.x, hz = pz + dz * t - c.z, l = Math.hypot(hx, hz) || 1; consider({ t, type: 'bumper', nx: hx / l, nz: hz / l }); }
    }
    for (const o of this.sim.balls) {
      if (o === ball || !o.active) continue;
      const op = o.pos();
      if (Math.abs(op.y - o.radius - py) > 0.4) continue;
      const t = rayCircle(px, pz, dx, dz, op.x, op.z, r + o.radius);
      if (t !== null) consider({ t, type: 'ball', ball: o });
    }
    this.sim.portals.forEach((g, i) => {
      if (i === skipPortal || Math.abs(g.y - py) > 0.4) return;
      const denom = dx * g.n.x + dz * g.n.z;
      const d0 = g.side(px, pz);
      if (denom >= -1e-4 || d0 <= 0) return;
      const t = d0 / -denom;
      if (Math.abs(g.lateral(px + dx * t, pz + dz * t)) <= g.width / 2 - r * 0.5) consider({ t, type: 'portal', portal: i });
    });
    const limit = best ? (best as Hit).t : maxT;
    if (!this.supported(px + dx * limit, pz + dz * limit, py)) consider({ t: limit * 0.999, type: 'fall' });
    return best;
  }

  /** Is there floor (static or a deployed bridge) under this point at this height? */
  supported(x: number, z: number, y: number) {
    for (const f of this.sim.level.floors) if (Math.abs((f.y ?? 0) - y) < 0.15 && pointInBox(x, z, f)) return true;
    for (const s of this.sim.level.slopes ?? []) { const h = slopeHeight(s, x, z); if (h !== null && Math.abs(h - y) < 0.35) return true; }
    for (const b of this.sim.barriers) if (b.def.kind === 'bridge' && b.solid && Math.abs((b.def.box.y ?? 0) - y) < 0.15 && pointInBox(x, z, b.def.box)) return true;
    return false;
  }
}

function rayCircle(px: number, pz: number, dx: number, dz: number, cx: number, cz: number, R: number): number | null {
  const fx = px - cx, fz = pz - cz;
  const b = fx * dx + fz * dz, c = fx * fx + fz * fz - R * R;
  const disc = b * b - c;
  if (c > 0 && b < 0 && disc >= 0) return -b - Math.sqrt(disc);
  return null;
}

/** Ray (origin p, dir d) vs oriented box inflated by r on the XZ plane. Returns entry t and world normal. */
export function rayBox(px: number, pz: number, dx: number, dz: number, b: { x: number; z: number; w: number; d: number; rot?: number }, r: number) {
  const { ax, az } = boxAxes(b.rot ?? 0);
  const ox = px - b.x, oz = pz - b.z;
  const lo = [ox * ax.x + oz * ax.z, ox * az.x + oz * az.z];
  const ld = [dx * ax.x + dz * ax.z, dx * az.x + dz * az.z];
  const half = [b.w / 2 + r, b.d / 2 + r];
  let tmin = -Infinity, tmax = Infinity, axis = -1, sign = 0;
  for (let i = 0; i < 2; i++) {
    if (Math.abs(ld[i]) < 1e-9) {
      if (Math.abs(lo[i]) > half[i]) return null;
      continue;
    }
    let t1 = (-half[i] - lo[i]) / ld[i], t2 = (half[i] - lo[i]) / ld[i];
    let s = -1;
    if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = i; sign = s; }
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return null;
  }
  if (tmin < 0 || axis < 0) return null;
  const a = axis === 0 ? ax : az;
  return { t: tmin, nx: a.x * sign, nz: a.z * sign };
}
