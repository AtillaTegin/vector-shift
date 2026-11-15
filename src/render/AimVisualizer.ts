import * as THREE from 'three';
import type { Trajectory } from '../physics/VectorRaycaster';
import { PALETTE } from './LevelView';
import { buildCueStick } from './CueStick';

const MAX_DOTS = 700;

/**
 * Aim-assist tiers. Basic is free (8-ball-pool style: line to the first contact + a short arrow);
 * 2×, 4× and Full are shop upgrades (see core/Store.ts).
 */
export interface AimTier { id: 'basic' | 'x2' | 'x4' | 'full'; contacts: number; /** fixed guide length (power-independent, rail reflections count toward it) */ guide: number; arrow: number; hazards: boolean; forecast: 'none' | 'basic' | 'full' }
export const AIM_TIERS: Record<AimTier['id'], AimTier> = {
  // basic = 8-ball style: line to the FIRST contact (any distance); a ring where it meets a rail (no reflection);
  // at a ball: ghost ball + a medium object-ball arrow (~3 ball diameters) + a short faint cue-deflection line.
  basic: { id: 'basic', contacts: 1, guide: Infinity, arrow: 2.8, hazards: false, forecast: 'none' },
  x2:    { id: 'x2', contacts: 2, guide: Infinity, arrow: 2.8, hazards: false, forecast: 'basic' },
  x4:    { id: 'x4', contacts: 4, guide: Infinity, arrow: 2.8, hazards: true, forecast: 'basic' },
  full:  { id: 'full', contacts: Infinity, guide: Infinity, arrow: 2.8, hazards: true, forecast: 'full' },
};

/**
 * Draws the predictive trajectory as glowing dot trails (primary path, post-bounce reflections,
 * portal exit path), the ghost-sphere at impact, object-ball / tangent lines, a fall warning,
 * and the cue stick pulled back proportionally to power.
 */
export class AimVisualizer {
  readonly group = new THREE.Group();
  private dots: THREE.InstancedMesh;
  private ghost: THREE.Mesh;
  private fallMark: THREE.Mesh;
  private stick: THREE.Group;
  private strikeT = -1;
  private strikeFrom = 0;
  private bounceRings: THREE.Mesh[] = [];
  private tmp = new THREE.Object3D();
  private col = new THREE.Color();

  constructor() {
    const dotGeo = new THREE.CircleGeometry(0.06, 10).rotateX(-Math.PI / 2);
    this.dots = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false }), MAX_DOTS);
    this.dots.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dots.frustumCulled = false;
    this.ghost = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', wireframe: true, transparent: true, opacity: 0.45 }));
    this.fallMark = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: PALETTE.crimson, toneMapped: false, side: THREE.DoubleSide }));
    for (let i = 0; i < 5; i++) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: PALETTE.amber, toneMapped: false, side: THREE.DoubleSide }));
      this.bounceRings.push(r); this.group.add(r);
    }
    // cue stick (lathe-built, realistic proportions)
    this.stick = buildCueStick();
    this.group.add(this.dots, this.ghost, this.fallMark, this.stick);
    this.hide();
  }

  hide() { if (this.strikeT < 0) this.group.visible = false; }

  /** Play the stroke: the cue drives through the ball, then fades. */
  strike() {
    this.strikeT = 0;
    this.strikeFrom = this.stick.children[0].position.x;
    this.dots.count = 0; this.ghost.visible = false; this.fallMark.visible = false;
    this.bounceRings.forEach((r) => (r.visible = false));
  }

  update(dt: number) {
    if (this.strikeT < 0) return;
    this.strikeT += dt;
    const k = Math.min(1, this.strikeT / 0.07);
    const shift = (this.strikeFrom - this.stick.children[0].userData.base) * (1 - k) - k * 0.18;
    this.stick.children.forEach((c) => (c.position.x = c.userData.base + shift));
    if (this.strikeT > 0.45) { this.strikeT = -1; this.group.visible = false; }
  }

  show(traj: Trajectory, cuePos: THREE.Vector3, angle: number, power: number, time: number, spin = { x: 0, y: 0 }, tier: AimTier = AIM_TIERS.full) {
    this.group.visible = true;
    let n = 0;
    const push = (x: number, y: number, z: number, color: THREE.ColorRepresentation, scale: number, alpha = 1) => {
      if (n >= MAX_DOTS) return;
      this.tmp.position.set(x, y - 0.26, z);
      this.tmp.scale.setScalar(scale);
      this.tmp.updateMatrix();
      this.dots.setMatrixAt(n, this.tmp.matrix);
      this.dots.setColorAt(n, this.col.set(color).multiplyScalar(alpha));
      n++;
    };
    const spacing = 0.2;
    const phase = (time * 1.6) % spacing;
    let segIndex = 0;
    // Aim-assist tier: draw only up to N contacts (rail bounce, portal or object ball), like an 8-ball pool guide.
    let contacts = 0, cut = false, used = 0, railCut = false;
    const isBounce = (p: { x: number; z: number }) => traj.bounces.some((bb) => Math.abs(bb.pos.x - p.x) < 0.02 && Math.abs(bb.pos.z - p.z) < 0.02);
    for (const [pi, path] of traj.paths.entries()) {
      if (cut) break;
      if (pi > 0 && ++contacts >= tier.contacts) { cut = true; break; }
      for (let i = 0; i < path.points.length - 1; i++) {
        const a = path.points[i], b = path.points[i + 1];
        if (i > 0 && isBounce(a) && ++contacts >= tier.contacts) { cut = true; railCut = true; break; }
        const full = Math.hypot(b.x - a.x, b.z - a.z);
        const len = Math.min(full, tier.guide - used);
        used += full;
        const vk = Math.min(1, ((a.v + b.v) / 2) / 25);
        const color = path.kind === 'portal' ? new THREE.Color(PALETTE.cyan) : new THREE.Color(PALETTE.amber).lerp(new THREE.Color('#f2fdff'), vk);
        for (let s = phase; s < len; s += spacing) {
          const t = s / full;
          const fade = 0.55 + 0.45 * vk;
          push(a.x + (b.x - a.x) * t, a.y + 0.005, a.z + (b.z - a.z) * t, color, 1, fade);
        }
        segIndex++;
        if (used >= tier.guide) { cut = true; railCut = true; break; }
      }
    }
    const g = railCut ? null : traj.ghost;
    if (g) {
      this.ghost.visible = true;
      this.ghost.position.set(g.pos.x, g.pos.y, g.pos.z);
      // object-ball direction arrow and cue tangent, length set by the tier (basic = a short stub)
      const lo = 0.6 * tier.arrow, lt = 0.25 * tier.arrow;
      for (let s = 0.3; s < lo; s += 0.14) push(g.pos.x + g.objectDir.x * (s + 0.28), g.pos.y, g.pos.z + g.objectDir.z * (s + 0.28), '#ffffff', 1.15, 1 - (s / lo) * 0.7);
      if (g.tangentDir.x || g.tangentDir.z) for (let s = 0.3; s < lt; s += 0.18) push(g.pos.x + g.tangentDir.x * s, g.pos.y, g.pos.z + g.tangentDir.z * s, '#7f8c99', 0.7, 0.6 - (s / lt) * 0.45);
    } else this.ghost.visible = false;
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
    if (this.dots.instanceColor) this.dots.instanceColor.needsUpdate = true;

    // a rail ring only where the drawn guide actually reaches the rail (no hint beyond the guide's end)
    const reach: number[] = [];
    { let d = 0; const pts = traj.paths[0]?.points ?? [];
      for (let i = 1; i < pts.length; i++) { d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z); if (isBounce(pts[i])) reach.push(d); } }
    this.bounceRings.forEach((r, i) => {
      const b = i < tier.contacts && (reach[i] ?? Infinity) <= tier.guide ? traj.bounces[i] : undefined;
      r.visible = !!b;
      if (b) r.position.set(b.pos.x, b.pos.y - 0.27, b.pos.z);
    });
    if (traj.fall && tier.hazards) {
      this.fallMark.visible = true;
      this.fallMark.position.set(traj.fall.x, traj.fall.y + 0.02, traj.fall.z);
      this.fallMark.scale.setScalar(1 + Math.sin(time * 10) * 0.15);
    } else this.fallMark.visible = false;

    // cue stick: behind the ball, pulled back by power
    this.stick.position.copy(cuePos);
    // tip offset on the ball face = the spin you dial in (max half a radius, the miscue limit)
    this.stick.position.y += spin.y * 0.14;
    this.stick.position.x += -Math.sin(angle) * spin.x * 0.14;
    this.stick.position.z += Math.cos(angle) * spin.x * 0.14;
    this.stick.rotation.set(0, -angle, 0);
    const pull = 0.34 + power * 1.4;
    this.stick.children.forEach((c) => (c.userData.base ??= c.position.x));
    this.stick.children.forEach((c) => (c.position.x = c.userData.base - pull));
    this.stick.rotation.z = 0;
    // slight tilt so the stick reads in isometric view
    this.stick.rotateZ(-0.12);
  }
}
