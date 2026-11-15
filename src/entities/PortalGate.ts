import type { PortalDef } from '../levels/LevelTypes';
import { facingNormal, type V2 } from '../physics/Geometry';

/** Quantum portal: preserves |v| and re-emits the sphere along the linked portal's facing normal. */
export class PortalGate {
  readonly n: V2;
  readonly t: V2;
  link!: PortalGate;
  constructor(readonly def: PortalDef) {
    this.n = facingNormal(def.facing);
    this.t = { x: -this.n.z, z: this.n.x };
  }
  get y() { return this.def.y ?? 0; }
  get width() { return this.def.width ?? 1.7; }
  /** Signed distance in front of the portal plane. */
  side(x: number, z: number) { return (x - this.def.x) * this.n.x + (z - this.def.z) * this.n.z; }
  lateral(x: number, z: number) { return (x - this.def.x) * this.t.x + (z - this.def.z) * this.t.z; }
}
