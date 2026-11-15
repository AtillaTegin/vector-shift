import type { HoopDef } from '../levels/LevelTypes';
import { facingNormal, type V2 } from '../physics/Geometry';

/** Croquet-style precision hoop. Hoops in a group must be passed in `order`. */
export class LaserHoop {
  readonly n: V2;
  readonly t: V2;
  passed = false;
  constructor(readonly def: HoopDef) {
    this.n = facingNormal(def.facing);
    this.t = { x: -this.n.z, z: this.n.x };
  }
  get y() { return this.def.y ?? 0; }
  get width() { return this.def.width ?? 1.2; }
  side(x: number, z: number) { return (x - this.def.x) * this.n.x + (z - this.def.z) * this.n.z; }
  lateral(x: number, z: number) { return (x - this.def.x) * this.t.x + (z - this.def.z) * this.t.z; }
  postPositions() {
    const h = this.width / 2;
    return [
      { x: this.def.x + this.t.x * h, z: this.def.z + this.t.z * h },
      { x: this.def.x - this.t.x * h, z: this.def.z - this.t.z * h },
    ];
  }
}
