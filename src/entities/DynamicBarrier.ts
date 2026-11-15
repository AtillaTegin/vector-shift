import type RAPIER from '@dimforge/rapier3d-compat';
import type { BarrierDef } from '../levels/LevelTypes';

/**
 * Retractable steel gate (solid when closed, sinks into the floor when open) or
 * extending glass bridge (rises from the abyss when its signals are satisfied).
 */
export class DynamicBarrier {
  /** Vertical offset from the authored position (0 = deployed). */
  offset: number;
  triggered = false;
  /** current yaw (swing gates) */
  angle: number;
  constructor(readonly def: BarrierDef, readonly body: RAPIER.RigidBody) {
    this.offset = def.kind === 'gate' ? 0 : this.hiddenOffset;
    this.angle = def.box.rot ?? 0;
  }
  get h() { return this.def.box.h ?? (this.def.kind === 'gate' ? 0.55 : 0.5); }
  get hiddenOffset() { return this.def.kind === 'gate' ? -(this.h + 0.05) : -4; }
  /** Target offset for the current trigger state. */
  get targetAngle() { return (this.def.box.rot ?? 0) + (this.def.swing && this.triggered ? Math.PI / 2 : 0); }
  get target() {
    if (this.def.swing || this.def.spin) return 0;
    if (this.def.kind === 'gate') return this.triggered ? this.hiddenOffset : 0;
    return this.triggered ? 0 : this.hiddenOffset;
  }
  /** Does it currently block balls (gate) / support balls (bridge)? */
  get solid() {
    return this.def.kind === 'gate' ? this.offset > -this.h * 0.45 : this.offset > -0.08;
  }
}
