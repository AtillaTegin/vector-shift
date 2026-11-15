import type RAPIER_NS from '@dimforge/rapier3d-compat';
import type { LevelDef, BoxDef } from '../levels/LevelTypes';
import {
  BALL_MATERIALS, SURFACES, SURFACE_CLOTH, ballMaterial, FIXED_DT, GRAVITY, shotSpeed, POCKET_STYLES, CURRENT_SCALE, WIND_SCALE, KILL_Y, REST_SPEED, PORTAL_COOLDOWN,
  POCKET_RADIUS, SWITCH_RADIUS, HEAVY_PLATE_RADIUS, WALL_HEIGHT, FLOOR_THICKNESS,
  WATER_DRAG, WATER_SINK_SPEED, HOLE_FALL_TIME, BUMPER_KICK, ROUND_BUMPER_KICK, BREAKABLE,
} from './PhysicsMaterials';
import { quatFromYaw, boxAxes, pointInBox, slopeHeight, slopeAngle, slopeQuat, slopeSlabCentre, type V3 } from './Geometry';
import { runChute, chuteAt, type ChuteRun } from './Chute';
import type { ChuteDef } from '../levels/LevelTypes';
import { stepBall, cueImpact, ENGLISH_GRIP, type BallState, type Cloth } from './BallModel';
import type { WallKind, CircleDef } from '../levels/LevelTypes';

/** Collision box tracked for the raycaster and special-wall logic. */
export interface StaticWall extends BoxDef {
  y: number; h: number;
  kind: WallKind;
  id?: string;
  hp: number;
  broken: boolean;
  collider: RAPIER_NS.Collider;
}

/** Closest point on an oriented box (XZ) to p, and outward normal from it. */
export function boxContact(b: BoxDef, px: number, pz: number) {
  const { ax, az } = boxAxes(b.rot ?? 0);
  const dx = px - b.x, dz = pz - b.z;
  const lx = Math.max(-b.w / 2, Math.min(b.w / 2, dx * ax.x + dz * ax.z));
  const lz = Math.max(-b.d / 2, Math.min(b.d / 2, dx * az.x + dz * az.z));
  const cx = b.x + ax.x * lx + az.x * lz, cz = b.z + ax.z * lx + az.z * lz;
  const nx = px - cx, nz = pz - cz, l = Math.hypot(nx, nz) || 1;
  return { dist: Math.hypot(nx, nz), nx: nx / l, nz: nz / l };
}
import { Ball } from '../entities/Ball';
import { PocketZone } from '../entities/PocketZone';
import { SwitchPlate } from '../entities/SwitchPlate';
import { PortalGate } from '../entities/PortalGate';
import { LaserHoop } from '../entities/LaserHoop';
import { DynamicBarrier } from '../entities/DynamicBarrier';

type Rapier = typeof RAPIER_NS;

export type SimState = 'aiming' | 'rolling' | 'won' | 'failed';

export type SimEvent =
  | { type: 'clack'; speed: number; pos: V3 }
  | { type: 'cushion'; speed: number; pos: V3 }
  | { type: 'pocket'; ball: number; pocket: string; pos: V3 }
  | { type: 'reject'; ball: number; pos: V3 }
  | { type: 'deny'; pocket: string; pos: V3 }
  | { type: 'scratch'; reason: 'pocket' | 'fall' | 'sink'; pos: V3 }
  | { type: 'bumper'; speed: number; pos: V3 }
  | { type: 'rattle'; pos: V3 }
  | { type: 'jump'; ball: number; pos: V3 }
  | { type: 'codeReset'; group: string; pos: V3 }
  | { type: 'foul'; ball: number; num: number; need: number; pos: V3 }
  | { type: 'break'; wall: number; kind: WallKind; pos: V3 }
  | { type: 'crack'; wall: number; hp: number; pos: V3 }
  | { type: 'sink'; ball: number; pos: V3 }
  | { type: 'hole'; ball: number; pos: V3 }
  | { type: 'portal'; ball: number; from: string; to: string; pos: V3 }
  | { type: 'snap'; tether: number; pos: V3 }
  | { type: 'chute'; ball: number; outcome: 'exit' | 'back' | 'fly'; pos: V3 }
  | { type: 'switch'; id: string; on: boolean; pos: V3 }
  | { type: 'hoop'; group: string; order: number; complete: boolean; pos: V3 }
  | { type: 'barrier'; id: string; kind: 'gate' | 'bridge'; triggered: boolean }
  | { type: 'lost'; ball: number; required: boolean }
  | { type: 'won' }
  | { type: 'failed'; reason: string }
  | { type: 'rest' };

export interface Shot { angle: number; power: number; spin: { x: number; y: number } }

interface BallSnap { status: Ball['status']; p: V3; q: { x: number; y: number; z: number; w: number }; lv: V3; av: V3; lastStable: V3; clamped: boolean }
export interface SimSnapshot {
  balls: BallSnap[];
  switches: boolean[];
  barriers: { offset: number; triggered: boolean; angle?: number }[];
  hoops: boolean[];
  walls: { hp: number; broken: boolean }[];
  signals: [string, boolean][];
  strokes: number;
  time: number;
  state: SimState;
  snapped?: number[];
}

/**
 * Simulation — deterministic, render-agnostic game physics.
 * Runs Rapier3D at a fixed 1/120 s step with CCD on every sphere, plus the puzzle-logic layer
 * (pockets, switches, portals, hoops, barriers, objectives). Usable headless (see tools/solve.ts).
 */
export class Simulation {
  readonly world: RAPIER_NS.World;
  balls: Ball[] = [];
  pockets: PocketZone[] = [];
  switches: SwitchPlate[] = [];
  portals: PortalGate[] = [];
  hoops: LaserHoop[] = [];
  barriers: DynamicBarrier[] = [];
  /** Static collision boxes (walls + hoop posts) used by the trajectory raycaster. */
  staticWalls: StaticWall[] = [];
  roundBumpers: CircleDef[] = [];
  posts: CircleDef[] = [];
  signals = new Map<string, boolean>();
  events: SimEvent[] = [];
  state: SimState = 'aiming';
  strokes = 0;
  time = 0;
  shotTime = 0;
  private restFrames = 0;
  private groundRay: RAPIER_NS.Ray;

  constructor(private readonly R: Rapier, readonly level: LevelDef) {
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = FIXED_DT;
    this.groundRay = new R.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
    this.build();
  }

  // ───────────────────────────── construction ─────────────────────────────
  private addBox(b: BoxDef, yBase: number, h: number, surf: { restitution: number; friction: number }, body?: RAPIER_NS.RigidBody, minRestitution = false) {
    const R = this.R;
    const desc = R.ColliderDesc.cuboid(b.w / 2, h / 2, b.d / 2)
      .setRestitution(surf.restitution)
      .setFriction(surf.friction)
      .setRestitutionCombineRule(minRestitution ? R.CoefficientCombineRule.Min : R.CoefficientCombineRule.Average);
    if (body) {
      desc.setTranslation(0, h / 2, 0);
      return this.world.createCollider(desc, body);
    }
    desc.setTranslation(b.x, yBase + h / 2, b.z).setRotation(quatFromYaw(b.rot ?? 0));
    return this.world.createCollider(desc);
  }

  private build() {
    const R = this.R, L = this.level;
    for (const f of L.floors) this.addBox(f, (f.y ?? 0) - FLOOR_THICKNESS, FLOOR_THICKNESS, SURFACES.floor, undefined, true);
    for (const sl of L.slopes ?? []) {
      const c = slopeSlabCentre(sl, FLOOR_THICKNESS);
      this.world.createCollider(R.ColliderDesc.cuboid(c.len / 2, FLOOR_THICKNESS / 2, sl.d / 2)
        .setTranslation(c.x, c.y, c.z).setRotation(slopeQuat(sl))
        .setRestitution(SURFACES.floor.restitution).setFriction(SURFACES.floor.friction)
        .setRestitutionCombineRule(R.CoefficientCombineRule.Min));
    }
    for (const w of L.walls) {
      const h = w.h ?? WALL_HEIGHT;
      const kind = w.kind ?? 'steel';
      const collider = this.addBox(w, w.y ?? 0, h, kind === 'bumper' ? SURFACES.bumper : SURFACES.cushion);
      const hp = kind === 'glass' || kind === 'concrete' ? BREAKABLE[kind].hits : 0;
      this.staticWalls.push({ ...w, y: w.y ?? 0, h, kind, hp, broken: false, collider });
    }
    // rounded jaw knuckles / posts: plain cushion rubber, no kick
    for (const c of L.posts ?? []) {
      this.world.createCollider(
        R.ColliderDesc.cylinder(0.25, c.r).setTranslation(c.x, (c.y ?? 0) + 0.25, c.z)
          .setRestitution(SURFACES.cushion.restitution).setFriction(0),
      );
      this.posts.push(c);
    }
    for (const c of L.bumpers ?? []) {
      this.world.createCollider(
        R.ColliderDesc.cylinder(0.3, c.r).setTranslation(c.x, (c.y ?? 0) + 0.3, c.z)
          .setRestitution(SURFACES.bumper.restitution).setFriction(SURFACES.bumper.friction)
          .setRestitutionCombineRule(R.CoefficientCombineRule.Max),
      );
      this.roundBumpers.push(c);
    }
    L.balls.forEach((bd, i) => {
      const m = ballMaterial(bd.kind, L.ballSet);
      const y = (bd.y ?? 0) + m.radius + 0.001;
      const body = this.world.createRigidBody(
        R.RigidBodyDesc.dynamic().setTranslation(bd.x, y, bd.z)
          .setLinearDamping(0).setAngularDamping(0)
          .setCcdEnabled(true).setCanSleep(false),
      );
      const col = this.world.createCollider(
        R.ColliderDesc.ball(m.radius).setMass(m.mass).setRestitution(m.restitution).setFriction(0)
          .setFrictionCombineRule(R.CoefficientCombineRule.Min),
        body,
      );
      this.balls.push(new Ball(i, bd.kind, body, col, bd.required ?? (bd.kind !== 'cue' && bd.kind !== 'heavy'), m, bd.num ?? 0, { x: bd.x, z: bd.z }));
    });
    this.pockets = L.pockets.map((p) => new PocketZone(p));
    this.switches = L.switches.map((s) => new SwitchPlate(s));
    this.portals = L.portals.map((p) => new PortalGate(p));
    for (const p of this.portals) p.link = this.portals.find((q) => q.def.id === p.def.link)!;
    this.hoops = L.hoops.map((h) => new LaserHoop(h));
    for (const hp of this.hoops) {
      for (const post of hp.postPositions()) {
        const pb = { x: post.x, z: post.z, w: 0.12, d: 0.12, rot: 0 };
        const collider = this.addBox(pb, hp.y, 0.9, SURFACES.cushion);
        this.staticWalls.push({ ...pb, y: hp.y, h: 0.9, kind: 'steel', hp: 0, broken: false, collider });
      }
    }
    for (const bd of L.barriers) {
      const b = bd.box;
      const body = this.world.createRigidBody(
        R.RigidBodyDesc.kinematicPositionBased().setTranslation(b.x, b.y ?? 0, b.z).setRotation(quatFromYaw(b.rot ?? 0)),
      );
      const barrier = new DynamicBarrier(bd, body);
      if (bd.kind === 'gate') this.addBox(b, 0, barrier.h, SURFACES.cushion, body);
      else {
        // bridge collider: top surface at authored y (box hangs below)
        const c = R.ColliderDesc.cuboid(b.w / 2, 0.25, b.d / 2).setTranslation(0, -0.25, 0)
          .setRestitution(SURFACES.glass.restitution).setFriction(SURFACES.glass.friction)
          .setRestitutionCombineRule(R.CoefficientCombineRule.Min);
        this.world.createCollider(c, body);
      }
      body.setTranslation({ x: b.x, y: (b.y ?? 0) + barrier.offset, z: b.z }, true);
      this.barriers.push(barrier);
    }
    this.recomputeSignals(true);
    for (const b of this.barriers) b.body.setTranslation({ x: b.def.box.x, y: (b.def.box.y ?? 0) + b.offset, z: b.def.box.z }, true);
  }

  /** Balls currently riding a chute. */
  readonly riding = new Map<Ball, { def: ChuteDef; run: ChuteRun; t: number }>();
  /** Tethers that have snapped (index into level.tethers). */
  readonly snapped = new Set<number>();

  /** Chute mouth capture test (shared rule with the predictor). */
  chuteCapture(x: number, y: number, z: number, vx: number, vz: number) {
    const sp = Math.hypot(vx, vz);
    if (sp < 0.5) return null;
    for (const c of this.level.chutes ?? []) {
      const [mx, my, mz] = c.points[0], [nx, , nz] = c.points[1];
      const dl = Math.hypot(nx - mx, nz - mz) || 1, dx = (nx - mx) / dl, dz = (nz - mz) / dl;
      if (Math.abs(y - my) > 0.3 || Math.hypot(x - mx, z - mz) > (c.width ?? 1.2) / 2) continue;
      if ((vx * dx + vz * dz) / sp < 0.5) continue;
      return c;
    }
    return null;
  }

  private updateChutes(b: Ball): void {
    const ride = this.riding.get(b);
    if (!ride) {
      const p = b.pos(), v = b.body.linvel();
      const c = this.chuteCapture(p.x, p.y - b.radius, p.z, v.x, v.z);
      if (!c) return;
      const run = runChute(c, Math.hypot(v.x, v.z));
      this.riding.set(b, { def: c, run, t: 0 });
      this.events.push({ type: 'chute', ball: b.index, outcome: run.outcome, pos: p });
      return this.updateChutes(b);
    }
    ride.t += FIXED_DT;
    if (ride.t < ride.run.duration) {
      const q = chuteAt(ride.run, ride.t);
      b.body.setTranslation({ x: q.x, y: q.y + b.radius, z: q.z }, true);
      b.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      return;
    }
    const r = ride.run;
    b.body.setTranslation({ x: r.pos.x, y: r.pos.y + b.radius + 0.002, z: r.pos.z }, true);
    b.body.setLinvel({ x: r.vel.x, y: r.vy, z: r.vel.z }, true);
    b.body.setAngvel({ x: r.vel.z / b.radius, y: 0, z: -r.vel.x / b.radius }, true);
    b.prev = b.pos();
    this.riding.delete(b);
  }

  /** Tethered balls: an inextensible rope to a fixed post. When taut, the outward radial velocity is removed
   *  (the impulse is the rope's tension) and the ball is held on the circle; T = m·v_t²/L — above the snap speed the rope breaks. */
  private applyTethers() {
    (this.level.tethers ?? []).forEach((t, i) => {
      if (this.snapped.has(i)) return;
      const b = this.balls[t.ball];
      if (!b?.active) return;
      const p = b.pos(), dx = p.x - t.x, dz = p.z - t.z, d = Math.hypot(dx, dz);
      if (d <= t.len || d < 1e-6) return;
      const nx = dx / d, nz = dz / d, v = b.body.linvel();
      const vr = v.x * nx + v.z * nz, vtx = v.x - vr * nx, vtz = v.z - vr * nz;
      const vt = Math.hypot(vtx, vtz);
      // jerk (radial impulse) + centripetal demand both load the rope; compare with the snap speed
      const load = Math.sqrt(vt * vt + Math.max(0, vr) * Math.max(0, vr) * 2);
      if (t.snapSpeed !== undefined && load > t.snapSpeed) { this.snapped.add(i); this.events.push({ type: 'snap', tether: i, pos: p }); this.signals.set('snap:' + i, true); return; }
      if (vr > 0) b.body.setLinvel({ x: vtx, y: v.y, z: vtz }, true);
      b.body.setTranslation({ x: t.x + nx * t.len, y: p.y, z: t.z + nz * t.len }, true);
    });
  }

  get cue() { return this.balls.find((b) => b.kind === 'cue')!; }
  sig(id: string) { return this.signals.get(id) === true; }
  requiresMet(req?: string[]) { return !req || req.every((r) => this.sig(r)); }

  // ───────────────────────────── shooting ─────────────────────────────
  canShoot() { return this.state === 'aiming' && this.cue.active; }

  shoot(shot: Shot) {
    if (!this.canShoot()) return false;
    const cue = this.cue;
    // Cue-tip impact: spin from tip offset (centre = stun, high = follow, low = draw, side = english).
    const st = cueImpact(shotSpeed(shot.power), shot.angle, cue.radius, shot.spin.y, shot.spin.x);
    cue.body.setLinvel({ x: st.vx, y: 0, z: st.vz }, true);
    cue.body.setAngvel({ x: st.wx, y: st.wy, z: st.wz }, true);
    this.strokes++;
    this.state = 'rolling';
    this.shotTime = 0;
    this.restFrames = 0;
    return true;
  }

  // ───────────────────────────── stepping ─────────────────────────────
  step() {
    if (this.state === 'won' || this.state === 'failed') { this.stepBarriers(); this.world.step(); return; }
    for (const b of this.balls) if (b.active) {
      const p = b.pos(); b.prev = p;
      const v = b.vel(); b.prevVel = { x: v.x, z: v.z };
    }
    this.stepBarriers();
    this.world.step();
    this.time += FIXED_DT;
    this.shotTime += FIXED_DT;

    for (const b of this.balls) {
      if (!b.active) continue;
      b.portalCooldown = Math.max(0, b.portalCooldown - FIXED_DT);
      b.rejectCooldown = Math.max(0, b.rejectCooldown - FIXED_DT);
      this.applyCloth(b);
      this.detectImpacts(b);
      this.applyZones(b);
      this.applyAir(b);
      this.updateChutes(b);
      if (!b.active) continue;
      this.checkPortals(b);
      this.checkHoops(b);
      this.checkPockets(b);
      if (!b.active) continue;
      this.checkFall(b);
    }
    this.applyChains();
    this.applyTethers();
    this.updateSwitches();
    this.recomputeSignals(false);
    this.checkOutcome();
    if (this.state === 'rolling') this.checkRest();
  }

  private grounded(b: Ball) {
    const p = b.pos();
    this.groundRay.origin = { x: p.x, y: p.y, z: p.z };
    const hit = this.world.castRay(this.groundRay, b.radius + 0.06, true, undefined, undefined, undefined, b.body);
    return hit !== null;
  }

  /** Ball–cloth friction: sliding → rolling → rest, plus spin decay (see BallModel). */
  private applyCloth(b: Ball) {
    if (!this.grounded(b)) return;
    const v = b.body.linvel(), w = b.body.angvel(), p = b.body.translation();
    const st: BallState = { vx: v.x, vz: v.z, wx: w.x, wy: w.y, wz: w.z };
    stepBall(st, b.radius, FIXED_DT, this.clothAt(b, p.x, p.z, p.y - b.radius));
    b.body.setLinvel({ x: st.vx, y: v.y, z: st.vz }, true);
    b.body.setAngvel({ x: st.wx, y: st.wy, z: st.wz }, true);
  }

  /** Cloth coefficients under a ball: topmost matching floor (or deployed bridge = glass ≈ steel). */
  clothAt(b: Ball, x: number, z: number, y: number): Cloth {
    let style = 'felt', cosN = 1;
    for (const f of this.level.floors) if (Math.abs((f.y ?? 0) - y) < 0.15 && pointInBox(x, z, f)) style = f.style ?? 'felt';
    const sl = this.slopeUnder(x, z, y);
    if (sl) { style = sl.style ?? 'felt'; cosN = Math.cos(slopeAngle(sl)); }
    const k = SURFACE_CLOTH[style] ?? SURFACE_CLOTH.felt, c = b.mat.cloth;
    // friction force = μ·N, and on an incline N = m·g·cosθ
    return { muSlide: c.muSlide * k.slide * cosN, muRoll: c.muRoll * k.roll * cosN, muSpin: c.muSpin };
  }

  /** Inclined plane under a point (surface within 0.3 of height y). */
  slopeUnder(x: number, z: number, y: number) {
    for (const sl of this.level.slopes ?? []) { const h = slopeHeight(sl, x, z); if (h !== null && Math.abs(h - y) < 0.3) return sl; }
    return null;
  }

  /** Infer collisions from velocity discontinuities (audio + side-spin "english" off cushions). */
  private detectImpacts(b: Ball) {
    const v = b.vel();
    const dv = Math.hypot(v.x - b.prevVel.x, v.z - b.prevVel.z);
    if (dv < 0.35) return;
    const p = b.pos();
    const other = this.balls.find((o) => o !== b && o.active && Math.hypot(o.pos().x - p.x, o.pos().z - p.z) < b.radius + o.radius + 0.08 && Math.abs(o.pos().y - p.y) < 0.5);
    if (other) {
      if (other.index > b.index) this.events.push({ type: 'clack', speed: dv, pos: p });
      return;
    }
    if (this.specialImpact(b, p, v)) return;
    this.events.push({ type: 'cushion', speed: dv, pos: p });
    // English: the rail grips the side-spinning ball and converts part of ωy into tangential speed.
    const w = b.body.angvel();
    if (Math.abs(w.y) > 0.5) {
      const ix = v.x - b.prevVel.x, iz = v.z - b.prevVel.z, il = Math.hypot(ix, iz);
      const nx = ix / il, nz = iz / il;
      const k = ENGLISH_GRIP * b.radius * w.y;
      b.body.setLinvel({ x: v.x - nz * k, y: v.y, z: v.z + nx * k }, true);
      b.body.setAngvel({ x: w.x, y: w.y * 0.5, z: w.z }, true);
    }
  }

  /**
   * Breakable panels and energised bumpers. `vin` is the incoming normal speed (from the pre-step
   * velocity) — the same quantity the trajectory predictor uses, so the HUD numbers match the result.
   */
  private specialImpact(b: Ball, p: V3, v: V3): boolean {
    for (const c of this.roundBumpers) {
      const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz);
      if (d > c.r + b.radius + 0.1) continue;
      const nx = dx / d, nz = dz / d;
      b.body.setLinvel({ x: v.x + nx * ROUND_BUMPER_KICK, y: v.y, z: v.z + nz * ROUND_BUMPER_KICK }, true);
      this.events.push({ type: 'bumper', speed: Math.hypot(v.x, v.z) + ROUND_BUMPER_KICK, pos: p });
      return true;
    }
    for (const w of this.staticWalls) {
      if (w.kind === 'steel' || w.broken) continue;
      if (p.y < w.y - 0.1 || p.y - b.radius > w.y + w.h) continue;
      const c = boxContact(w, p.x, p.z);
      if (c.dist > b.radius + 0.1) continue;
      if (w.kind === 'bumper') {
        b.body.setLinvel({ x: v.x + c.nx * BUMPER_KICK, y: v.y, z: v.z + c.nz * BUMPER_KICK }, true);
        this.events.push({ type: 'bumper', speed: Math.hypot(v.x, v.z) + BUMPER_KICK, pos: p });
        return true;
      }
      const spec = BREAKABLE[w.kind];
      const vin = -(b.prevVel.x * c.nx + b.prevVel.z * c.nz);
      if (vin < spec.threshold) { this.events.push({ type: 'cushion', speed: vin, pos: p }); return true; }
      w.hp--;
      if (w.hp <= 0) {
        w.broken = true;
        w.collider.setEnabled(false);
        // the panel shatters: the sphere carries on through with part of its momentum
        const k = spec.passThrough;
        b.body.setLinvel({ x: b.prevVel.x * k, y: 0, z: b.prevVel.z * k }, true);
        if (w.id) this.signals.set(`broken:${w.id}`, true);
        this.events.push({ type: 'break', wall: this.staticWalls.indexOf(w), kind: w.kind, pos: p });
      } else this.events.push({ type: 'crack', wall: this.staticWalls.indexOf(w), hp: w.hp, pos: p });
      return true;
    }
    return false;
  }

  /** Wind push (also in the air) and kicker ramps. */
  /** Caravan ropes: when a pair is farther apart than the rope, remove the separating velocity (mass-weighted) and pull them back. */
  private applyChains() {
    for (const [ia, ib, len] of this.level.chains ?? []) {
      const a = this.balls[ia], b = this.balls[ib];
      if (!a?.active || !b?.active) continue;
      const pa = a.pos(), pb = b.pos();
      const dx = pb.x - pa.x, dz = pb.z - pa.z, d = Math.hypot(dx, dz);
      if (d <= len || d < 1e-6) continue;
      const nx = dx / d, nz = dz / d;
      const ma = a.mat.mass, mb = b.mat.mass, wa = mb / (ma + mb), wb = ma / (ma + mb);
      const va = a.body.linvel(), vb = b.body.linvel();
      const rel = (vb.x - va.x) * nx + (vb.z - va.z) * nz;
      if (rel > 0) {
        a.body.setLinvel({ x: va.x + nx * rel * wa, y: va.y, z: va.z + nz * rel * wa }, true);
        b.body.setLinvel({ x: vb.x - nx * rel * wb, y: vb.y, z: vb.z - nz * rel * wb }, true);
      }
      const e = d - len;
      a.body.setTranslation({ x: pa.x + nx * e * wa, y: pa.y, z: pa.z + nz * e * wa }, true);
      b.body.setTranslation({ x: pb.x - nx * e * wb, y: pb.y, z: pb.z - nz * e * wb }, true);
    }
  }

  private applyAir(b: Ball) {
    if (!b.active) return;
    const p = b.pos();
    const fy = p.y - b.radius;
    for (const w of this.level.winds ?? []) {
      if (w.gust && !this.cycleOpen(w.gust, this.time)) continue;
      if (fy < (w.y ?? 0) - 0.3 || fy > (w.y ?? 0) + 3 || !pointInBox(p.x, p.z, w)) continue;
      const v = b.body.linvel();
      b.body.setLinvel({ x: v.x + w.fx * WIND_SCALE * FIXED_DT, y: v.y, z: v.z + w.fz * WIND_SCALE * FIXED_DT }, true);
    }
    if (Math.abs(b.body.linvel().y) < 0.5) for (const c of this.level.conveyors ?? []) {
      if (Math.abs(fy - (c.y ?? 0)) > 0.12 || !pointInBox(p.x, p.z, c)) continue;
      // belt friction drags the ball toward the belt velocity (k = 4 /s)
      const v = b.body.linvel(), k = 1 - Math.exp(-4 * FIXED_DT);
      const nvx = v.x + (c.vx - v.x) * k, nvz = v.z + (c.vz - v.z) * k;
      b.body.setLinvel({ x: nvx, y: v.y, z: nvz }, true);
      b.body.setAngvel({ x: nvz / b.radius, y: b.body.angvel().y, z: -nvx / b.radius }, true);
    }
    if (b.rampCooldown > 0) { b.rampCooldown -= FIXED_DT; return; }
    for (const r of this.level.ramps ?? []) {
      if (Math.abs(fy - (r.y ?? 0)) > 0.12 || !pointInBox(p.x, p.z, r)) continue;
      const v = b.body.linvel();
      const a = (r.facing * Math.PI) / 180;
      const along = v.x * Math.cos(a) + v.z * Math.sin(a);
      if (along < 2) continue;
      b.body.setLinvel({ x: v.x, y: along * r.lift, z: v.z }, true);
      b.rampCooldown = 0.4;
      this.events.push({ type: 'jump', ball: b.index, pos: p });
      return;
    }
  }

  /** Water drag / sinking, river push, and open holes. */
  private applyZones(b: Ball) {
    const p = b.pos();
    const floorY = p.y - b.radius;
    const L = this.level;
    let v = b.body.linvel();
    let wet = false;
    let drag = WATER_DRAG;
    for (const c of L.currents ?? []) {
      if (Math.abs((c.y ?? 0) - floorY) > 0.15 || !pointInBox(p.x, p.z, c)) continue;
      wet = true;
      const dir = c.when && this.sig(c.when) ? -1 : 1;
      v = { x: v.x + dir * c.fx * CURRENT_SCALE * FIXED_DT, y: v.y, z: v.z + dir * c.fz * CURRENT_SCALE * FIXED_DT };
    }
    let deep = false;
    if (!wet) for (const w of L.water ?? []) if (Math.abs((w.y ?? 0) - floorY) < 0.15 && pointInBox(p.x, p.z, w)) { wet = true; if (w.shallow) drag = Math.min(drag, 0.9); else { deep = true; drag = WATER_DRAG; } }
    // whirlpools: swirl + suction, drain at the centre
    for (const vx of L.vortices ?? []) {
      const dx = p.x - vx.x, dz = p.z - vx.z, d = Math.hypot(dx, dz);
      if (d > vx.r || Math.abs((vx.y ?? 0) - floorY) > 0.15) continue;
      wet = true;
      const f = 1 - d / vx.r * 0.6;
      const tx = -dz / (d || 1), tz = dx / (d || 1);
      v = { x: v.x + (tx * vx.swirl - dx / (d || 1) * vx.pull) * f * FIXED_DT, y: v.y, z: v.z + (tz * vx.swirl - dz / (d || 1) * vx.pull) * f * FIXED_DT };
      drag = Math.min(drag, 0.6);
      if (d < 0.32 && Math.hypot(v.x, v.z) < 6) { this.removeBall(b, 'sink', p); return; }
    }
    if (wet) {
      const k = Math.exp(-drag * FIXED_DT);
      b.body.setLinvel({ x: v.x * k, y: v.y, z: v.z * k }, true);
      const w = b.body.angvel();
      b.body.setAngvel({ x: w.x * k, y: w.y, z: w.z * k }, true);
      if (deep && Math.hypot(v.x, v.z) * k < WATER_SINK_SPEED) { this.removeBall(b, 'sink', p); return; }
    }
    let over = false;
    for (const h of L.holes ?? []) if (Math.abs((h.y ?? 0) - floorY) < 0.15 && Math.hypot(p.x - h.x, p.z - h.z) < h.r && (!h.cycle || !this.cycleOpen(h.cycle, this.time))) { over = true; break; }
    b.holeTime = over ? b.holeTime + FIXED_DT : 0;
    if (b.holeTime > HOLE_FALL_TIME) this.removeBall(b, 'hole', p);
  }

  /** Sphere swallowed by water or a hole: cue → +1 & respawn, others → lost. */
  private removeBall(b: Ball, why: 'sink' | 'hole', p: V3) {
    b.sinkAt = { x: p.x, y: p.y - b.radius, z: p.z };
    b.holeTime = 0;
    b.park();
    this.events.push({ type: why, ball: b.index, pos: p });
    if (b.kind === 'cue') {
      b.status = 'respawning';
      this.strokes++;
      this.events.push({ type: 'scratch', reason: why === 'sink' ? 'sink' : 'fall', pos: p });
    } else {
      b.status = 'lost';
      this.events.push({ type: 'lost', ball: b.index, required: b.required });
    }
  }

  private checkPortals(b: Ball) {
    if (b.portalCooldown > 0) return;
    const p = b.pos();
    for (const g of this.portals) {
      if (Math.abs(p.y - (g.y + b.radius)) > 0.6) continue;
      const d0 = g.side(b.prev.x, b.prev.z), d1 = g.side(p.x, p.z);
      if (!(d0 > 0 && d1 <= 0)) continue;
      const t = d0 / (d0 - d1);
      const lx = b.prev.x + (p.x - b.prev.x) * t, lz = b.prev.z + (p.z - b.prev.z) * t;
      if (Math.abs(g.lateral(lx, lz)) > g.width / 2 - b.radius * 0.5) continue;
      const out = g.link;
      const v = b.vel();
      const speed = Math.hypot(v.x, v.z);
      const np = { x: out.def.x + out.n.x * (b.radius + 0.06), y: out.y + b.radius + 0.01, z: out.def.z + out.n.z * (b.radius + 0.06) };
      b.body.setTranslation(np, true);
      b.body.setLinvel({ x: out.n.x * speed, y: 0, z: out.n.z * speed }, true);
      const w = speed / b.radius;
      b.body.setAngvel({ x: out.n.z * w, y: 0, z: -out.n.x * w }, true);
      b.prev = np;
      b.prevVel = { x: out.n.x * speed, z: out.n.z * speed };
      b.portalCooldown = PORTAL_COOLDOWN;
      this.events.push({ type: 'portal', ball: b.index, from: g.def.id, to: out.def.id, pos: np });
      return;
    }
  }

  private checkHoops(b: Ball) {
    const p = b.pos();
    for (const h of this.hoops) {
      if (Math.abs(p.y - (h.y + b.radius)) > 0.5) continue;
      const d0 = h.side(b.prev.x, b.prev.z), d1 = h.side(p.x, p.z);
      if (d0 === 0 || Math.sign(d0) === Math.sign(d1)) continue;
      if (Math.abs(h.lateral(p.x, p.z)) > h.width / 2 - 0.06) continue;
      const group = this.hoops.filter((o) => o.def.group === h.def.group);
      const progress = group.filter((o) => o.passed).length;
      if (!h.passed && h.def.order === progress + 1) {
        h.passed = true;
        const complete = progress + 1 === group.length;
        this.events.push({ type: 'hoop', group: h.def.group, order: h.def.order, complete, pos: p });
      }
    }
  }

  private checkPockets(b: Ball) {
    const p = b.pos();
    for (const pk of this.pockets) {
      const dist = Math.hypot(p.x - pk.def.x, p.z - pk.def.z);
      const style = POCKET_STYLES[pk.def.style ?? 'standard'];
      const capture = pk.def.rail ? pk.def.rail.capture : style.capture;
      if (dist > capture || Math.abs(p.y - (pk.y + b.radius)) > 0.35) continue;
      const pos = { x: pk.def.x, y: pk.y, z: pk.def.z };
      if (!this.requiresMet(pk.def.requires)) {
        if (pk.denyCooldown <= this.time) { this.events.push({ type: 'deny', pocket: pk.def.id, pos }); pk.denyCooldown = this.time + 0.8; }
        continue;
      }
      // Jaw rattle: a fast ball that is off-centre is spat back out (snooker / Russian pockets).
      const sp = b.speed();
      if (!pk.def.rail && sp > style.rattleSpeed && dist > style.capture * style.rattleOffset && b.rejectCooldown <= 0) {
        const v = b.vel(), nx = (p.x - pk.def.x) / (dist || 1), nz = (p.z - pk.def.z) / (dist || 1);
        const vn = v.x * nx + v.z * nz;
        b.body.setLinvel({ x: (v.x - 2 * vn * nx) * 0.55, y: 0, z: (v.z - 2 * vn * nz) * 0.55 }, true);
        b.rejectCooldown = 0.3;
        this.events.push({ type: 'rattle', pos: { x: pk.def.x, y: pk.y, z: pk.def.z } });
        continue;
      }
      if (b.rejectCooldown > 0) continue;
      if (pk.accepts(b.kind)) {
        // Rotation rule: only the lowest-numbered ball on the table may be potted.
        if (this.level.rule === 'rotation' && b.num > 0) {
          const lowest = Math.min(...this.balls.filter((o) => o.num > 0 && o.active).map((o) => o.num));
          if (b.num !== lowest) {
            this.strokes++;
            b.sinkAt = pos; b.park();
            b.place({ x: b.spot.x, y: pk.y + b.radius + 0.01, z: b.spot.z });
            this.events.push({ type: 'foul', ball: b.index, num: b.num, need: lowest, pos });
            return;
          }
        }
        if (pk.def.teleport) {
          // portal pocket: the ball drops here and re-emerges at the linked spot
          const t = pk.def.teleport;
          this.signals.set(`sunk:${pk.def.id}`, true);
          b.place({ x: t.x, y: (t.y ?? 0) + b.radius + 0.01, z: t.z });
          b.portalCooldown = 0.4;
          this.events.push({ type: 'portal', ball: b.index, from: pk.def.id, to: 'spot', pos: { x: t.x, y: t.y ?? 0, z: t.z } });
          return;
        }
        if (this.level.rule === '8ball' && b.kind === 'black' && this.balls.some((o) => o !== b && o.num > 0 && o.active)) {
          b.status = 'lost'; b.park();
          this.state = 'failed';
          this.events.push({ type: 'failed', reason: '8-ball potted before the other balls' });
          return;
        }
        b.status = 'sunk'; b.sinkAt = pos; b.park();
        this.signals.set(`sunk:${pk.def.id}`, true);
        this.events.push({ type: 'pocket', ball: b.index, pocket: pk.def.id, pos });
        return;
      }
      if (b.kind === 'cue') {
        b.status = 'respawning'; b.sinkAt = pos; b.park();
        this.strokes++;
        this.events.push({ type: 'scratch', reason: 'pocket', pos });
        return;
      }
      if (b.rejectCooldown <= 0) {
        // Wrong color: the holo-ring repels the sphere upward and outward.
        const ox = dist > 1e-3 ? (p.x - pk.def.x) / dist : 1, oz = dist > 1e-3 ? (p.z - pk.def.z) / dist : 0;
        if (pk.def.rail) {
          // rail pocket: the wrong-colour field spits the ball straight back onto the table
          const a = (pk.def.rail.facing * Math.PI) / 180;
          b.body.setLinvel({ x: Math.cos(a) * 7, y: 0, z: Math.sin(a) * 7 }, true);
        } else b.body.setLinvel({ x: ox * 6, y: 9, z: oz * 6 }, true);
        b.rejectCooldown = 0.7;
        this.events.push({ type: 'reject', ball: b.index, pos });
      }
    }
  }

  private checkFall(b: Ball) {
    if (!b.active) return;
    const p = b.pos();
    if (p.y > KILL_Y) return;
    if (b.kind === 'cue') {
      b.status = 'respawning'; b.park();
      this.strokes++;
      this.events.push({ type: 'scratch', reason: 'fall', pos: p });
    } else {
      b.status = 'lost'; b.park();
      this.events.push({ type: 'lost', ball: b.index, required: b.required });
    }
  }

  private updateSwitches() {
    for (const s of this.switches) {
      const was = s.active;
      if (s.def.type === 'code') {
        if (!s.active && this.balls.some((b) => b.active && this.onPlate(b, s, SWITCH_RADIUS))) {
          const grp = this.switches.filter((o) => o.def.type === 'code' && o.def.group === s.def.group);
          const next = grp.filter((o) => o.active).length + 1;
          if ((s.def.order ?? 1) === next) s.active = true;
          else { for (const o of grp) o.active = false; this.events.push({ type: 'codeReset', group: s.def.group ?? '', pos: { x: s.def.x, y: s.y, z: s.def.z } }); }
        }
      } else if (s.def.type === 'scale') {
        const m = this.balls.filter((b) => b.active && b.speed() < 0.8 && this.onPlate(b, s, 0.9)).reduce((a, b) => a + b.mat.mass, 0);
        s.active = m >= (s.def.mass ?? 2) - 1e-6;
      } else if (s.def.type === 'toggle') {
        if (!s.active) s.active = this.balls.some((b) => b.active && this.onPlate(b, s, SWITCH_RADIUS));
      } else if (s.def.type === 'hold') {
        s.active = this.balls.some((b) => b.active && this.onPlate(b, s, SWITCH_RADIUS) && b.speed() < 0.6);
      } else {
        for (const b of this.balls) {
          if (b.kind !== 'heavy' || !b.active) continue;
          if (this.onPlate(b, s, HEAVY_PLATE_RADIUS) && (b.clamped || b.speed() < 8)) {
            // Mag-lock: clamp the tungsten sphere to the plate centre.
            b.clamped = true;
            const p = b.pos();
            b.body.setTranslation({ x: p.x + (s.def.x - p.x) * 0.08, y: p.y, z: p.z + (s.def.z - p.z) * 0.08 }, true);
            b.body.setLinvel({ x: 0, y: Math.min(0, b.body.linvel().y), z: 0 }, true);
            b.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
          }
        }
        s.active = this.balls.some((b) => b.kind === 'heavy' && b.active && b.clamped && this.onPlate(b, s, HEAVY_PLATE_RADIUS));
      }
      if (s.active !== was) this.events.push({ type: 'switch', id: s.def.id, on: s.active, pos: { x: s.def.x, y: s.y, z: s.def.z } });
    }
  }

  private onPlate(b: Ball, s: SwitchPlate, r: number) {
    const p = b.pos();
    return Math.hypot(p.x - s.def.x, p.z - s.def.z) < r && Math.abs(p.y - (s.y + b.radius)) < 0.2;
  }

  private recomputeSignals(initial: boolean) {
    for (const s of this.switches) this.signals.set(s.def.id, s.active);
    const codeGroups = new Set(this.switches.filter((s) => s.def.type === 'code').map((s) => s.def.group));
    for (const g of codeGroups) this.signals.set(`code:${g}`, this.switches.filter((s) => s.def.type === 'code' && s.def.group === g).every((s) => s.active));
    const numbered = this.balls.filter((b) => b.num > 0);
    if (numbered.length) this.signals.set('cleared', numbered.every((b) => b.status === 'sunk'));
    const groups = new Set(this.hoops.map((h) => h.def.group));
    for (const g of groups) this.signals.set(`hoops:${g}`, this.hoops.filter((h) => h.def.group === g).every((h) => h.passed));
    for (const b of this.barriers) {
      const met = this.requiresMet(b.def.requires) && (!b.def.cycle || this.cycleOpen(b.def.cycle, this.time));
      const next = b.def.latch ? b.triggered || met : met;
      if (next !== b.triggered) {
        b.triggered = next;
        if (initial) b.offset = b.target;
        else if (!b.def.cycle) this.events.push({ type: 'barrier', id: b.def.id, kind: b.def.kind, triggered: next });
      }
      this.signals.set(b.def.id, b.triggered);
    }
  }

  /** Is a timed gate open at simulation time t? */
  cycleOpen(c: { open: number; closed: number; offset?: number }, t: number) {
    const period = c.open + c.closed;
    const ph = (((t + (c.offset ?? 0)) % period) + period) % period;
    return ph < c.open;
  }

  private stepBarriers() {
    for (const b of this.barriers) {
      if (b.def.spin) {
        b.angle += b.def.spin * FIXED_DT;
        b.body.setNextKinematicRotation(quatFromYaw(b.angle));
        continue;
      }
      if (b.def.swing) {
        const ta = b.targetAngle;
        if (b.angle === ta) continue;
        const sp = 2.4 * FIXED_DT; // rad/s — the gear train turns the wall
        b.angle = Math.abs(ta - b.angle) <= sp ? ta : b.angle + Math.sign(ta - b.angle) * sp;
        b.body.setNextKinematicRotation(quatFromYaw(b.angle));
        continue;
      }
      const tgt = b.target;
      if (b.offset === tgt) continue;
      const sp = (b.def.kind === 'gate' ? 2.2 : 6) * FIXED_DT;
      b.offset = Math.abs(tgt - b.offset) <= sp ? tgt : b.offset + Math.sign(tgt - b.offset) * sp;
      const bx = b.def.box;
      b.body.setNextKinematicTranslation({ x: bx.x, y: (bx.y ?? 0) + b.offset, z: bx.z });
    }
  }

  private checkOutcome() {
    if (this.state !== 'rolling' && this.state !== 'aiming') return;
    const lost = this.balls.find((b) => b.status === 'lost' && b.required);
    if (lost) { this.state = 'failed'; this.events.push({ type: 'failed', reason: `${lost.kind.toUpperCase()} sphere lost to the abyss` }); return; }
    if (this.level.objectives.every((o) => this.sig(o.signal))) { this.state = 'won'; this.events.push({ type: 'won' }); }
  }

  private checkRest() {
    // a ball pinned against a wall by a river / belt has speed but no displacement — treat it as resting
    const moving = this.riding.size > 0 || this.balls.some((b) => b.active && ((Math.hypot(b.pos().x - b.prev.x, b.pos().z - b.prev.z) / FIXED_DT > REST_SPEED && (b.speed() > REST_SPEED || Math.abs(b.body.linvel().y) > 0.2))
      // a ball on an incline steeper than rolling friction never rests there (tanθ > μr)
      || (() => { const p = b.pos(); const sl = this.slopeUnder(p.x, p.z, p.y - b.radius); return !!sl && Math.abs(Math.tan(slopeAngle(sl))) > b.mat.cloth.muRoll * 1.5; })()));
    const barriersMoving = this.barriers.some((b) => !b.def.cycle && !b.def.spin && (b.offset !== b.target || (b.def.swing && b.angle !== b.targetAngle)));
    this.restFrames = moving || barriersMoving ? 0 : this.restFrames + 1;
    if (this.restFrames > 12 || this.shotTime > 25) this.settle();
  }

  private settle() {
    for (const b of this.balls) if (b.active) { b.body.setLinvel({ x: 0, y: 0, z: 0 }, true); b.body.setAngvel({ x: 0, y: 0, z: 0 }, true); b.sideSpin = 0; }
    const cue = this.cue;
    if (cue.status === 'respawning') {
      cue.status = 'active';
      cue.place(this.freeSpot(cue.lastStable, cue.radius));
    } else if (cue.active) {
      cue.lastStable = cue.pos();
    }
    this.state = 'aiming';
    this.events.push({ type: 'rest' });
    const ch = this.level.challenge;
    if (ch && this.strokes >= ch.maxStrokes) { this.state = 'failed'; this.events.push({ type: 'failed', reason: `CHALLENGE FAILED — finish within ${ch.maxStrokes} stroke${ch.maxStrokes > 1 ? 's' : ''}. Start again.` }); }
  }

  /** Nudge a respawn point so it does not overlap another sphere. */
  private freeSpot(p: V3, r: number): V3 {
    const q = { ...p };
    for (let i = 0; i < 12; i++) {
      const hit = this.balls.find((b) => b.active && b.kind !== 'cue' && Math.hypot(b.pos().x - q.x, b.pos().z - q.z) < r + b.radius + 0.02);
      if (!hit) break;
      const hp = hit.pos();
      const dx = q.x - hp.x || 0.01, dz = q.z - hp.z;
      const l = Math.hypot(dx, dz);
      q.x = hp.x + (dx / l) * (r + hit.radius + 0.05); q.z = hp.z + (dz / l) * (r + hit.radius + 0.05);
    }
    return q;
  }

  /** Advance until everything rests (headless; used by the solver and tests). */
  runToRest(maxSeconds = 30) {
    const steps = Math.ceil(maxSeconds / FIXED_DT);
    for (let i = 0; i < steps && this.state === 'rolling'; i++) this.step();
  }

  // ───────────────────────────── undo / snapshot ─────────────────────────────
  snapshot(): SimSnapshot {
    return {
      balls: this.balls.map((b) => {
        const r = b.body.rotation();
        return { status: b.status, p: b.pos(), q: { x: r.x, y: r.y, z: r.z, w: r.w }, lv: b.vel(), av: { ...b.body.angvel() }, lastStable: { ...b.lastStable }, clamped: b.clamped };
      }),
      switches: this.switches.map((s) => s.active),
      barriers: this.barriers.map((b) => ({ offset: b.offset, triggered: b.triggered, angle: b.angle })),
      hoops: this.hoops.map((h) => h.passed),
      walls: this.staticWalls.map((w) => ({ hp: w.hp, broken: w.broken })),
      signals: [...this.signals.entries()],
      strokes: this.strokes,
      time: this.time,
      state: this.state,
      snapped: [...this.snapped],
    };
  }

  restore(s: SimSnapshot) {
    this.riding.clear();
    this.snapped.clear();
    for (const i of s.snapped ?? []) this.snapped.add(i);
    s.balls.forEach((bs, i) => {
      const b = this.balls[i];
      b.status = bs.status; b.clamped = bs.clamped; b.lastStable = { ...bs.lastStable }; b.sideSpin = 0; b.sinkAt = null;
      if (bs.status === 'active') {
        b.place(bs.p); b.body.setRotation(bs.q, true);
        b.body.setLinvel(bs.lv, true); b.body.setAngvel(bs.av, true);
      } else b.park();
    });
    s.switches.forEach((a, i) => (this.switches[i].active = a));
    s.barriers.forEach((bs, i) => {
      const b = this.barriers[i]; b.offset = bs.offset; b.triggered = bs.triggered;
      if (bs.angle !== undefined) { b.angle = bs.angle; b.body.setRotation(quatFromYaw(b.angle), true); }
      const bx = b.def.box;
      b.body.setTranslation({ x: bx.x, y: (bx.y ?? 0) + b.offset, z: bx.z }, true);
    });
    s.hoops.forEach((p, i) => (this.hoops[i].passed = p));
    s.walls.forEach((ws, i) => { const w = this.staticWalls[i]; w.hp = ws.hp; w.broken = ws.broken; w.collider.setEnabled(!ws.broken); });
    for (const b of this.balls) b.holeTime = 0;
    this.signals = new Map(s.signals);
    this.strokes = s.strokes; this.time = s.time; this.state = s.state;
    this.events = [];
  }

  dispose() { this.world.free(); }
}
