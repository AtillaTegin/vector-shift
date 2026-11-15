import type { SwitchDef } from '../levels/LevelTypes';

/**
 * Pressure switches:
 *  - toggle: any ball rolling across it latches it ON permanently.
 *  - hold:   ON only while a ball is resting on it.
 *  - heavy:  only a heavy tungsten sphere activates it; the mag-plate clamps the sphere in place.
 */
export class SwitchPlate {
  active = false;
  constructor(readonly def: SwitchDef) {}
  get y() { return this.def.y ?? 0; }
}
