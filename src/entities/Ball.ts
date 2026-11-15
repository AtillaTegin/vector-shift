import type RAPIER from '@dimforge/rapier3d-compat';
import { BALL_MATERIALS, type BallKind, type BallMaterial } from '../physics/PhysicsMaterials';
import type { V3 } from '../physics/Geometry';

export type BallStatus = 'active' | 'sunk' | 'lost' | 'respawning';

/** A physical sphere: cue ball, colored target sphere or heavy tungsten sphere. */
export class Ball {
  readonly mat: BallMaterial;
  status: BallStatus = 'active';
  prev: V3;
  prevVel = { x: 0, z: 0 };
  lastStable: V3;
  sideSpin = 0;
  portalCooldown = 0;
  rejectCooldown = 0;
  clamped = false;
  /** Seconds continuously spent over an open hole. */
  holeTime = 0;
  rampCooldown = 0;
  /** Visual-only: sink animation anchor. */
  sinkAt: V3 | null = null;

  constructor(
    readonly index: number,
    readonly kind: BallKind,
    readonly body: RAPIER.RigidBody,
    readonly collider: RAPIER.Collider,
    readonly required: boolean,
    mat?: BallMaterial,
    readonly num = 0,
    readonly spot = { x: 0, z: 0 },
  ) {
    this.mat = mat ?? BALL_MATERIALS[kind];
    const t = body.translation();
    this.prev = { x: t.x, y: t.y, z: t.z };
    this.lastStable = { ...this.prev };
  }

  get radius() { return this.mat.radius; }
  get active() { return this.status === 'active'; }
  pos(): V3 { const t = this.body.translation(); return { x: t.x, y: t.y, z: t.z }; }
  vel(): V3 { const v = this.body.linvel(); return { x: v.x, y: v.y, z: v.z }; }
  speed() { const v = this.body.linvel(); return Math.hypot(v.x, v.z); }

  /** Park the body far away with gravity off (removed from play but keeps its handle). */
  park() {
    this.body.setGravityScale(0, true);
    this.body.setTranslation({ x: 0, y: -500 - this.index * 3, z: 0 }, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  place(p: V3) {
    this.body.setGravityScale(1, true);
    this.body.setTranslation(p, true);
    this.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    this.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    this.prev = { ...p };
    this.prevVel = { x: 0, z: 0 };
  }
}
