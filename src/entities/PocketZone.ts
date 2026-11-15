import type { PocketDef } from '../levels/LevelTypes';
import type { BallKind } from '../physics/PhysicsMaterials';

/** Color-coded pocket. Locked pockets are shielded until all `requires` signals are true. */
export class PocketZone {
  denyCooldown = 0;
  constructor(readonly def: PocketDef) {}
  get y() { return this.def.y ?? 0; }

  accepts(kind: BallKind): boolean {
    const c = this.def.color;
    if (c === 'finish') return kind === 'cue';
    if (kind === 'cue' || kind === 'heavy') return false;
    return c === 'universal' || c === kind;
  }
}
