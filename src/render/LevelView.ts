import * as THREE from 'three';
import type { Simulation, SimEvent, StaticWall } from '../physics/Simulation';
import type { BoxDef, FloorDef } from '../levels/LevelTypes';
import { FLOOR_THICKNESS, POCKET_RADIUS, SWITCH_RADIUS, HEAVY_PLATE_RADIUS } from '../physics/PhysicsMaterials';
import { woodTexture } from './Textures';
import { POCKET_STYLES } from '../physics/PhysicsMaterials';
import { feltTextures, brushedSteel, tungstenTextures, hazardStripes, portalSwirl, glowSprite, concreteTextures, tileTextures, waterNormal, flowArrows, crackTexture } from './Textures';
import { Effects } from './Effects';
import { pointInBox, slopeSlabCentre, slopeQuat } from '../physics/Geometry';
import { chuteWindow } from '../physics/Chute';

export const PALETTE = {
  felt: '#1E4D3B', charcoal: '#232931', steel: '#3A404A', copper: '#B06A3B',
  cyan: '#00F0FF', amber: '#FFB800', crimson: '#FF2E4C',
  red: '#E8283C', green: '#22C55E', blue: '#2F7BFF', universal: '#D8E2EC', finish: '#7CFFB2',
  yellow: '#f5c400', orange: '#ff7a12', purple: '#8f55ff', maroon: '#c0304a', black: '#9aa3ad',
};

/** Shared, lazily-built materials (procedural textures are expensive to regenerate). */
let MATS: ReturnType<typeof buildMats> | null = null;
function buildMats() {
  const felt = feltTextures(PALETTE.felt, 3), char = feltTextures(PALETTE.charcoal, 9), steel = brushedSteel(PALETTE.steel);
  const tung = tungstenTextures();
  return {
    felt: new THREE.MeshStandardMaterial({ ...felt, roughness: 0.95, metalness: 0 }),
    charcoal: new THREE.MeshStandardMaterial({ ...char, roughness: 0.92, metalness: 0 }),
    steelFloor: new THREE.MeshStandardMaterial({ ...steel, roughness: 0.55, metalness: 0.75 }),
    steel: new THREE.MeshStandardMaterial({ ...steel, roughness: 0.5, metalness: 0.8 }),
    copper: new THREE.MeshStandardMaterial({ color: PALETTE.copper, roughness: 0.35, metalness: 0.9 }),
    cushion: new THREE.MeshStandardMaterial({ color: '#2d333c', roughness: 0.7, metalness: 0.4 }),
    pillar: new THREE.MeshStandardMaterial({ color: '#1b2026', roughness: 0.6, metalness: 0.7 }),
    tungsten: new THREE.MeshPhysicalMaterial({ ...tung, metalness: 0.95, clearcoat: 0.3 }),
    hazard: new THREE.MeshStandardMaterial({ map: hazardStripes(), emissive: PALETTE.crimson, emissiveIntensity: 0.6, roughness: 0.5, metalness: 0.3, emissiveMap: hazardStripes() }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#9fefff', roughness: 0.05, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.45, thickness: 0.3, emissive: '#0a5866', emissiveIntensity: 0.4 }),
    hole: new THREE.MeshBasicMaterial({ color: '#000000' }),
    swirl: portalSwirl(),
    concrete: new THREE.MeshStandardMaterial({ ...concreteTextures(), roughness: 0.9, metalness: 0.05 }),
    tile: new THREE.MeshStandardMaterial({ ...tileTextures(), roughness: 0.35, metalness: 0.1 }),
    concreteWall: new THREE.MeshStandardMaterial({ ...concreteTextures('#8a8f94', 4), roughness: 0.95 }),
    bumper: new THREE.MeshStandardMaterial({ color: '#4a1046', emissive: '#ff3df2', emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.5 }),
    crack: crackTexture(),
    sand: new THREE.MeshStandardMaterial({ ...feltTextures('#d9b878', 41), roughness: 1, metalness: 0 }),
    ramp: new THREE.MeshStandardMaterial({ map: hazardStripes('#FFB800'), color: '#ffffff', roughness: 0.5, metalness: 0.3 }),
    rubberMat: new THREE.MeshStandardMaterial({ map: hazardStripes('#2b2f33'), color: '#55606a', roughness: 1 }),
    railWood: new THREE.MeshPhysicalMaterial({ map: woodTexture(), color: '#ffffff', roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
    railCap: new THREE.MeshPhysicalMaterial({ map: woodTexture('#4a1f0e'), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 }),
    railMetal: new THREE.MeshStandardMaterial({ ...brushedSteel('#2c3a42', 15), roughness: 0.45, metalness: 0.85 }),
    clothGreen: new THREE.MeshStandardMaterial({ color: '#1f5a43', roughness: 0.95 }),
    clothTeal: new THREE.MeshStandardMaterial({ color: '#17616a', roughness: 0.95 }),
    feltTeal: new THREE.MeshStandardMaterial({ ...feltTextures('#1a6c75', 77), roughness: 0.95, metalness: 0 }),
    railCedar: new THREE.MeshPhysicalMaterial({ map: woodTexture('#6b3a1c'), roughness: 0.4, clearcoat: 0.6 }),
    clothCharcoal: new THREE.MeshStandardMaterial({ color: '#2a3038', roughness: 0.95 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0f2a30', roughness: 0.7 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: '#f3efe6', roughness: 0.15, iridescence: 1, clearcoat: 1 }),
    sightHydro: new THREE.MeshBasicMaterial({ color: '#7ff3ff', toneMapped: false }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e5e9ef', metalness: 1, roughness: 0.12 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c49a4a', metalness: 1, roughness: 0.25 }),
    leather: new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.6 }),
    glow: glowSprite(),
  };
}

const BALL_COLORS: Record<string, string> = {
  cue: '#f2f4f7', red: PALETTE.red, green: PALETTE.green, blue: PALETTE.blue,
  yellow: '#f5c400', orange: '#ff7a12', purple: '#6a2bd6', maroon: '#8a1c2b', black: '#141414',
};

/** American pool-ball texture: solid (1–8) or stripe (9–15) with white number roundels on both sides. */
function poolBallTexture(color: string, num: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!;
  const stripe = num > 8;
  g.fillStyle = stripe ? '#f3efe4' : color; g.fillRect(0, 0, 512, 256);
  if (stripe) { g.fillStyle = color; g.fillRect(0, 70, 512, 116); }
  for (const cx of [128, 384]) {
    g.fillStyle = '#f7f4ec'; g.beginPath(); g.ellipse(cx, 128, 46, 40, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.font = 'bold 54px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(num), cx, 131);
    if (num === 6 || num === 9) g.fillRect(cx - 14, 162, 28, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

interface BallVis { mesh: THREE.Mesh; sinkT: number; visible: boolean }

/** Builds meshes for a level and keeps them in sync with the Simulation each frame. */
export class LevelView {
  readonly root = new THREE.Group();
  private balls: BallVis[] = [];
  private barriers: THREE.Object3D[] = [];
  private switchMeshes: { plate: THREE.Mesh; ring: THREE.Mesh; baseY: number }[] = [];
  private pocketShields: (THREE.Mesh | null)[] = [];
  private pocketRings: THREE.Mesh[] = [];
  private finishBeams: (THREE.Mesh | null)[] = [];
  private portalDiscs: THREE.Mesh[] = [];
  private hoopMats: THREE.MeshStandardMaterial[] = [];
  private M: ReturnType<typeof buildMats>;
  readonly fx = new Effects();
  private diamondGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.012, 4).rotateY(Math.PI / 4).scale(1, 1, 1.8);
  private wallMeshes: (THREE.Mesh | null)[] = [];
  private bumperMeshes: { mesh: THREE.Mesh; ring: THREE.Mesh; c: { x: number; z: number; r: number } }[] = [];
  private flowTex: THREE.Texture[] = [];
  private windTex: { t: THREE.Texture; gust?: { open: number; closed: number; offset?: number }; mats: THREE.MeshBasicMaterial[]; rotor?: THREE.Object3D }[] = [];
  private fans: THREE.Object3D[] = [];
  private ropes: { a: number; b: number; line: THREE.Line }[] = [];
  private tetherLines: { i: number; ball: number; x: number; z: number; line: THREE.Line }[] = [];
  private pumps: { mesh: THREE.Mesh; when: string; base: number }[] = [];
  private vortexMeshes: { mesh: THREE.Mesh; rate: number }[] = [];
  private lids: { lid: THREE.Mesh; h: { x: number; r: number; cycle: { open: number; closed: number; offset?: number } } }[] = [];
  private beltTex: { t: THREE.Texture; speed: number }[] = [];
  private flowDirs: { x: number; z: number }[] = [];
  private waterNormals: THREE.Texture[] = [];
  private bumperPulse = new Map<THREE.Material, number>();
  private rippleTimer = new Map<number, number>();

  constructor(private readonly sim: Simulation) {
    this.M = MATS ??= buildMats();
    const L = sim.level;
    for (const f of L.floors) this.addFloor(f);
    for (const s of L.slopes ?? []) this.addSlope(s);
    for (const c of L.chutes ?? []) this.addChute(c);
    for (const [i, t] of (L.tethers ?? []).entries()) this.addTether(i, t);
    this.root.add(this.fx.root);
    sim.staticWalls.forEach((w) => this.addWall(w, w.h));
    for (const w of sim.level.water ?? []) this.addWater(w, null);
    for (const c of sim.level.currents ?? []) this.addWater(c, c);
    for (const h of sim.level.holes ?? []) this.addHole(h);
    for (const v of sim.level.vortices ?? []) this.addVortex(v);
    for (const w of sim.level.winds ?? []) this.addWind(w);
    for (const [a, b] of sim.level.chains ?? []) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(16 * 3), 3));
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e0a64a' }));
      line.frustumCulled = false;
      this.root.add(line); this.ropes.push({ a, b, line });
    }
    for (const r of sim.level.ramps ?? []) this.addRamp(r);
    for (const c of sim.level.conveyors ?? []) this.addConveyor(c);
    for (const b of sim.level.bumpers ?? []) this.addBumper(b);
    L.pockets.forEach((p) => this.addPocket(p));
    for (const k of L.posts ?? []) {
      // rounded jaw knuckle: cloth-covered rubber nose
      const m = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(k.r, k.r, 0.42, 20), this.M.leather));
      m.position.set(k.x, (k.y ?? 0) + 0.21, k.z);
      this.root.add(m);
    }
    L.switches.forEach((s) => this.addSwitch(s));
    sim.portals.forEach((p) => this.addPortal(p));
    sim.hoops.forEach((h) => this.addHoop(h));
    sim.barriers.forEach((b) => this.addBarrier(b));
    sim.balls.forEach((b) => this.addBall(b));
  }

  private shadowed<T extends THREE.Object3D>(o: T, cast = true, recv = true) { o.castShadow = cast; o.receiveShadow = recv; return o; }

  /** Floating text tag (big, high-contrast: must read on a phone). */
  private tag(text: string, x: number, y: number, z: number, color = '#FFB800', scale = 1.6) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128;
    const g = c.getContext('2d')!;
    g.font = 'bold 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 12; g.strokeStyle = '#101418'; g.strokeText(text, 256, 68); g.fillStyle = color; g.fillText(text, 256, 68);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    sp.scale.set(scale * 4, scale, 1); sp.position.set(x, y, z);
    this.root.add(sp);
    return sp;
  }

  /** Water-slide chute: translucent banked tube along the centreline + the entry-speed window at the mouth. */
  private addChute(c: import('../levels/LevelTypes').ChuteDef) {
    const pts = c.points.map((p) => new THREE.Vector3(p[0], p[1] + 0.3, p[2]));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const rad = (c.width ?? 1.2) / 2;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(32, pts.length * 12), rad, 16, false),
      new THREE.MeshPhysicalMaterial({ color: '#38c9ff', transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0, side: THREE.DoubleSide, depthWrite: false, emissive: '#0a4d66', emissiveIntensity: 0.4 }));
    this.root.add(tube);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(rad + 0.05, 0.07, 10, 32), this.M.copper);
    const d = new THREE.Vector3().subVectors(pts[1], pts[0]).normalize();
    rim.position.copy(pts[0]); rim.lookAt(pts[0].clone().add(d));
    this.root.add(rim);
    const w = chuteWindow(c);
    this.tag(Number.isFinite(w.vmax) ? `SPEED ${w.vmin.toFixed(0)}–${w.vmax.toFixed(0)}` : `SPEED ≥ ${w.vmin.toFixed(0)}`, pts[0].x, pts[0].y + 1.3, pts[0].z, '#7ff3ff', 1.1);
  }

  /** Tether: a post with a rope to its ball; the rope's snap speed is printed on the post. */
  private addTether(i: number, t: import('../levels/LevelTypes').TetherDef) {
    const y = this.sim.balls[t.ball]?.pos().y ?? 0.3;
    const post = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.1, 16), this.M.brass));
    post.position.set(t.x, y - 0.28 + 0.55, t.z);
    this.root.add(post);
    const ring = new THREE.Mesh(new THREE.RingGeometry(t.len - 0.03, t.len + 0.03, 96), new THREE.MeshBasicMaterial({ color: '#e0a64a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(t.x, y - 0.27, t.z);
    this.root.add(ring);
    if (t.snapSpeed !== undefined) this.tag(`SNAPS > ${t.snapSpeed.toFixed(0)}`, t.x, y + 1.3, t.z, '#e0a64a', 0.9);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e0a64a' }));
    line.frustumCulled = false;
    this.root.add(line);
    this.tetherLines.push({ i, ball: t.ball, x: t.x, z: t.z, line });
  }

  /** Inclined plane: tilted slab + chevrons pointing downhill so the fall line reads at a glance (phone-friendly). */
  private addSlope(s: import('../levels/LevelTypes').SlopeDef) {
    const M = this.M;
    const top = s.style === 'tile' ? M.tile : s.style === 'steel' ? M.steelFloor : s.style === 'concrete' ? M.concrete : s.style === 'sand' ? M.sand : s.style === 'rubber' ? M.rubberMat : this.sim.level.theme === 'caravan' ? M.feltTeal : M.felt;
    const c = slopeSlabCentre(s, FLOOR_THICKNESS), q = slopeQuat(s);
    const geo = new THREE.BoxGeometry(c.len, FLOOR_THICKNESS, s.d);
    const m = this.shadowed(new THREE.Mesh(geo, [M.steel, M.steel, top, M.steel, M.steel, M.steel]), false, true);
    m.position.set(c.x, c.y, c.z); m.quaternion.set(q.x, q.y, q.z, q.w);
    this.root.add(m);
    // downhill chevrons painted on the surface
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
    const g = cv.getContext('2d')!;
    g.strokeStyle = 'rgba(255,214,90,0.85)'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(84, 24); g.lineTo(44, 64); g.lineTo(84, 104); g.stroke();
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(Math.max(1, Math.round(c.len / 1.6)), 1);
    const decal = new THREE.Mesh(new THREE.PlaneGeometry(c.len, Math.min(1.2, s.d * 0.5)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
    decal.rotation.x = -Math.PI / 2; decal.position.y = FLOOR_THICKNESS / 2 + 0.01;
    if (s.y1 < s.y0) decal.rotation.z = Math.PI; // chevrons always point downhill
    m.add(decal);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(Math.min(c.len, s.d) * 0.3, 18, Math.min(c.len, s.d) * 0.3), M.pillar);
    pillar.position.set(s.x, Math.min(s.y0, s.y1) - FLOOR_THICKNESS - 9, s.z);
    this.root.add(pillar);
  }

  private addFloor(f: FloorDef) {
    const M = this.M;
    const top = f.style === 'charcoal' ? M.charcoal : f.style === 'steel' ? M.steelFloor : f.style === 'concrete' ? M.concrete : f.style === 'tile' ? M.tile : f.style === 'rubber' ? M.rubberMat : f.style === 'sand' ? M.sand : this.sim.level.theme === 'caravan' ? M.feltTeal : M.felt;
    const y = f.y ?? 0;
    const geo = new THREE.BoxGeometry(f.w, FLOOR_THICKNESS, f.d);
    // scale UVs so felt texel density is constant
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * f.w * 0.25, uv.getY(i) * f.d * 0.25);
    const m = this.shadowed(new THREE.Mesh(geo, [M.steel, M.steel, top, M.steel, M.steel, M.steel]), false, true);
    m.position.set(f.x, y - FLOOR_THICKNESS / 2, f.z);
    m.rotation.y = f.rot ?? 0;
    this.root.add(m);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(f.w + 0.08, 0.1, f.d + 0.08), M.copper);
    trim.position.set(f.x, y - FLOOR_THICKNESS - 0.02, f.z);
    trim.rotation.y = f.rot ?? 0;
    this.root.add(trim);
    // support pillar into the abyss
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(Math.min(f.w, f.d) * 0.35, 18, Math.min(f.w, f.d) * 0.35), M.pillar);
    pillar.position.set(f.x, y - FLOOR_THICKNESS - 9, f.z);
    pillar.rotation.y = f.rot ?? 0;
    this.root.add(pillar);
  }

  private addWall(w: StaticWall, h: number) {
    const M = this.M;
    let mat: THREE.Material = w.w < 0.2 && w.d < 0.2 ? M.copper : M.steel;
    if (w.kind === 'glass') mat = new THREE.MeshPhysicalMaterial({ color: '#b9f3ff', roughness: 0.02, transmission: 0.5, transparent: true, opacity: 0.5, emissive: '#3ad7ff', emissiveIntensity: 0.35, thickness: 0.2 });
    else if (w.kind === 'concrete') mat = M.concreteWall.clone();
    else if (w.kind === 'bumper') mat = M.bumper.clone();
    const tall = w.kind === 'glass' ? h + 0.35 : h;
    const m = this.shadowed(new THREE.Mesh(new THREE.BoxGeometry(w.w, tall, w.d), mat), w.kind !== 'glass', true);
    m.position.set(w.x, w.y + tall / 2, w.z);
    m.rotation.y = w.rot ?? 0;
    this.root.add(m);
    this.wallMeshes.push(w.kind === 'steel' ? null : m);
    if (w.kind === 'glass' || w.kind === 'concrete') {
      // crack overlay, revealed as the panel takes damage
      const crack = new THREE.Mesh(new THREE.BoxGeometry(w.w + 0.01, tall + 0.01, w.d + 0.01), new THREE.MeshBasicMaterial({ map: M.crack, transparent: true, opacity: 0, depthWrite: false, color: w.kind === 'glass' ? '#ffffff' : '#1a1a1a' }));
      m.add(crack);
      m.userData.crack = crack;
      const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: w.kind === 'glass' ? '#7ff3ff' : '#c9b48a' }));
      m.add(edge);
    }
    if (w.kind === 'steel' && (w.w > 0.5 || w.d > 0.5)) this.dressRail(w, h, m);
  }

  /**
   * Turn a plain rail box into a billiard rail: polished wood (foundry) or gunmetal (hydro) body,
   * a cloth-covered K-profile rubber nose on both faces at ball-contact height, a bevelled cap
   * and mother-of-pearl diamond sights every ~1.6 units.
   */
  private dressRail(w: StaticWall, h: number, body: THREE.Mesh) {
    const M = this.M, hydro = this.sim.level.theme === 'hydro';
    const caravan = this.sim.level.theme === 'caravan';
    body.material = hydro ? M.railMetal : caravan ? M.railCedar : M.railWood;
    const rot = w.rot ?? 0;
    const along = w.w >= w.d;
    const len = along ? w.w : w.d, thick = along ? w.d : w.w;
    // cushion noses (slightly proud of the rail on both faces, at ~0.63·2r like a real K-66 profile)
    const noseG = new THREE.BoxGeometry(along ? len - 0.02 : thick + 0.08, 0.16, along ? thick + 0.08 : len - 0.02);
    const nose = new THREE.Mesh(noseG, hydro ? M.rubber : this.clothFor());
    nose.position.set(w.x, w.y + 0.25, w.z); nose.rotation.y = rot; nose.receiveShadow = true;
    // cap
    const capG = new THREE.BoxGeometry(along ? len + 0.02 : thick + 0.1, 0.07, along ? thick + 0.1 : len + 0.02);
    const cap = new THREE.Mesh(capG, hydro ? M.steel : caravan ? M.brass : M.railCap);
    cap.position.set(w.x, w.y + h + 0.02, w.z); cap.rotation.y = rot; cap.castShadow = true;
    this.root.add(nose, cap);
    // diamond sights
    const n = Math.floor(len / 1.6);
    const ax = Math.cos(rot), az = -Math.sin(rot);
    const dirX = along ? ax : Math.sin(rot), dirZ = along ? az : Math.cos(rot);
    for (let i = 1; i < n; i++) {
      const o = -len / 2 + (i * len) / n;
      const d = new THREE.Mesh(this.diamondGeo, hydro ? M.sightHydro : M.pearl);
      d.position.set(w.x + dirX * o, w.y + h + 0.057, w.z + dirZ * o);
      d.rotation.y = rot;
      this.root.add(d);
    }
  }

  private clothFor() {
    const f = this.sim.level.floors[0]?.style;
    return f === 'charcoal' ? this.M.clothCharcoal : this.sim.level.theme === 'caravan' ? this.M.clothTeal : this.M.clothGreen;
  }

  private addWater(z: BoxDef & { shallow?: boolean }, flow: { fx: number; fz: number; when?: string } | null) {
    const y = z.y ?? 0;
    const nrm = waterNormal(flow ? 3 : 8);
    nrm.repeat.set(z.w / 2.5, z.d / 2.5);
    this.waterNormals.push(nrm);
    // dark basin below the surface reads as depth
    const basin = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.d), new THREE.MeshBasicMaterial({ color: flow ? '#03303c' : '#021f2b' }));
    basin.rotation.x = -Math.PI / 2; basin.position.set(z.x, y + 0.004, z.z); basin.rotation.z = z.rot ?? 0;
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.d), new THREE.MeshPhysicalMaterial({
      color: flow ? '#137f9c' : z.shallow ? '#3fb6d6' : '#0f5f7d', roughness: 0.06, metalness: 0.15, transparent: true, opacity: z.shallow ? 0.45 : 0.8,
      normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), emissive: flow ? '#0b5e70' : '#083e55', emissiveIntensity: 0.6, clearcoat: 1,
    }));
    surf.rotation.x = -Math.PI / 2; surf.position.set(z.x, y + 0.02, z.z); surf.rotation.z = z.rot ?? 0;
    surf.receiveShadow = true;
    // foam rim
    const rim = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(z.w, z.d)), new THREE.LineBasicMaterial({ color: '#c8fbff', transparent: true, opacity: 0.6 }));
    rim.rotation.x = -Math.PI / 2; rim.position.set(z.x, y + 0.025, z.z);
    this.root.add(basin, surf, rim);
    if (flow) {
      const t = flowArrows();
      const len = Math.hypot(flow.fx, flow.fz) || 1;
      const alongX = Math.abs(flow.fx) >= Math.abs(flow.fz);
      t.repeat.set(alongX ? z.w / 2.2 : z.d / 2.2, alongX ? z.d / 2.2 : z.w / 2.2);
      const arrows = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? z.w : z.d, alongX ? z.d : z.w), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.5 }));
      arrows.rotation.x = -Math.PI / 2;
      // plane local +X points along the flow
      arrows.rotation.z = Math.atan2(-flow.fz, flow.fx) * 1;
      arrows.position.set(z.x, y + 0.03, z.z);
      this.root.add(arrows);
      this.flowTex.push(t); this.flowDirs.push({ x: len, z: 0 });
      if (flow.when) this.pumps.push({ mesh: arrows, when: flow.when, base: arrows.rotation.z });
      // waterfall where the channel runs off the deck
      const dx = flow.fx / len, dz = flow.fz / len;
      const ex = z.x + dx * (z.w / 2), ez = z.z + dz * (z.d / 2);
      if (!this.sim.level.floors.some((f) => pointInBox(ex + dx * 0.3, ez + dz * 0.3, f))) {
        const fallTex = waterNormal(2); void fallTex;
        const width = alongX ? z.d : z.w;
        const fall = new THREE.Mesh(new THREE.PlaneGeometry(width, 14), new THREE.MeshBasicMaterial({ color: '#8fe8ff', transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        fall.position.set(ex, y - 7, ez);
        fall.rotation.y = alongX ? Math.PI / 2 : 0;
        this.root.add(fall);
        const mist = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.5, 1.6), new THREE.MeshBasicMaterial({ map: this.M.glow, color: '#dffbff', transparent: true, opacity: 0.6, depthWrite: false }));
        mist.rotation.x = -Math.PI / 2; mist.position.set(ex, y + 0.05, ez);
        this.root.add(mist);
      }
    }
  }

  /** Wind tunnel: industrial fan on the upwind edge + drifting streaks over the zone. */
  private addWind(w: { x: number; z: number; w: number; d: number; y?: number; fx: number; fz: number; gust?: { open: number; closed: number; offset?: number } }) {
    const y = w.y ?? 0;
    const len = Math.hypot(w.fx, w.fz) || 1, dx = w.fx / len, dz = w.fz / len;
    const alongX = Math.abs(dx) >= Math.abs(dz);
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const g = c.getContext('2d')!;
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(220,245,255,${0.15 + Math.random() * 0.35})`; g.fillRect(Math.random() * 256, Math.random() * 64, 20 + Math.random() * 60, 1.5); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const lx = alongX ? w.w : w.d, lz = alongX ? w.d : w.w;
    t.repeat.set(lx / 4, lz / 2);
    const entry: (typeof this.windTex)[number] = { t, gust: w.gust, mats: [] };
    this.windTex.push(entry);
    for (const hgt of [0.15, 0.55]) {
      const mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false, color: w.gust ? '#ffcf8a' : '#ffffff' });
      entry.mats.push(mat);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(lx, lz), mat);
      pl.rotation.x = -Math.PI / 2; pl.rotation.z = Math.atan2(-dz, dx);
      pl.position.set(w.x, y + hgt, w.z);
      this.root.add(pl);
    }
    // fan housing on the upwind side
    const fx = w.x - dx * ((alongX ? w.w : w.d) / 2 + 0.4), fz = w.z - dz * ((alongX ? w.w : w.d) / 2 + 0.4);
    const housing = this.shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 10, 32), this.M.steel));
    housing.position.set(fx, y + 1.0, fz); housing.rotation.y = Math.atan2(dx, dz);
    const rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.8, 0.03), this.M.copper); b.position.y = 0.4; const arm = new THREE.Group(); arm.add(b); arm.rotation.z = (i * Math.PI) / 2; rotor.add(arm); }
    rotor.position.copy(housing.position); rotor.rotation.y = housing.rotation.y;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.0, 0.2), this.M.steel); stand.position.set(fx, y + 0.5, fz);
    this.root.add(housing, rotor, stand);
    if (w.gust) entry.rotor = rotor; else this.fans.push(rotor);
  }

  /** Conveyor belt: dark rubber with scrolling yellow chevrons in the belt direction. */
  private addConveyor(c: { x: number; z: number; w: number; d: number; y?: number; vx: number; vz: number }) {
    const y = c.y ?? 0;
    const sp = Math.hypot(c.vx, c.vz) || 1;
    const alongX = Math.abs(c.vx) >= Math.abs(c.vz);
    const t = flowArrows(); t.repeat.set(alongX ? c.w / 1.2 : c.d / 1.2, alongX ? c.d / 1.2 : c.w / 1.2);
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? c.w : c.d, alongX ? c.d : c.w), new THREE.MeshStandardMaterial({ color: '#1b1d20', roughness: 0.9 }));
    belt.rotation.x = -Math.PI / 2; belt.rotation.z = Math.atan2(-c.vz, c.vx); belt.position.set(c.x, y + 0.008, c.z);
    const arrows = new THREE.Mesh(belt.geometry, new THREE.MeshBasicMaterial({ map: t, color: '#FFB800', transparent: true, depthWrite: false, toneMapped: false, opacity: 0.8 }));
    arrows.rotation.copy(belt.rotation); arrows.position.set(c.x, y + 0.012, c.z);
    this.root.add(belt, arrows);
    this.beltTex.push({ t, speed: sp / 1.2 });
  }

  /** Kicker ramp: hazard-striped wedge rising toward its facing direction. */
  private addRamp(r: { x: number; z: number; w: number; d: number; y?: number; facing: number; lift: number }) {
    const y = r.y ?? 0;
    const a = (r.facing * Math.PI) / 180;
    const len = Math.abs(Math.cos(a)) > 0.5 ? r.w : r.d, wid = Math.abs(Math.cos(a)) > 0.5 ? r.d : r.w;
    const h = Math.min(0.35, 0.2 + r.lift * 0.15);
    const shape = new THREE.Shape(); shape.moveTo(-len / 2, 0); shape.lineTo(len / 2, 0); shape.lineTo(len / 2, h); shape.lineTo(-len / 2, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: wid, bevelEnabled: false });
    geo.translate(0, 0, -wid / 2);
    const m = this.shadowed(new THREE.Mesh(geo, this.M.ramp));
    m.position.set(r.x, y + 0.005, r.z); m.rotation.y = -a;
    this.root.add(m);
  }

  /** Whirlpool: spinning spiral over a dark funnel with a drain at the centre. */
  private addVortex(v: { x: number; z: number; r: number; y?: number; swirl: number }) {
    const y = v.y ?? 0;
    const funnel = new THREE.Mesh(new THREE.CircleGeometry(v.r, 48), new THREE.MeshBasicMaterial({ color: '#02202b' }));
    funnel.rotation.x = -Math.PI / 2; funnel.position.set(v.x, y + 0.004, v.z);
    const spiral = new THREE.Mesh(new THREE.CircleGeometry(v.r, 48), new THREE.MeshBasicMaterial({ map: this.M.swirl, color: '#7ff3ff', transparent: true, opacity: 0.75, depthWrite: false, toneMapped: false }));
    spiral.rotation.x = -Math.PI / 2; spiral.position.set(v.x, y + 0.02, v.z);
    const drain = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshBasicMaterial({ color: '#000' }));
    drain.rotation.x = -Math.PI / 2; drain.position.set(v.x, y + 0.03, v.z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(v.r, 0.03, 8, 48), new THREE.MeshBasicMaterial({ color: '#c8fbff', transparent: true, opacity: 0.6 }));
    rim.rotation.x = -Math.PI / 2; rim.position.set(v.x, y + 0.03, v.z);
    this.root.add(funnel, spiral, drain, rim);
    this.vortexMeshes.push({ mesh: spiral, rate: Math.sign(v.swirl) * 1.8 });
  }

  private addHole(h: { x: number; z: number; r: number; y?: number; cycle?: { open: number; closed: number; offset?: number } }) {
    const y = h.y ?? 0;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(h.r, 40), new THREE.MeshBasicMaterial({ color: '#000000' }));
    hole.rotation.x = -Math.PI / 2; hole.position.set(h.x, y + 0.006, h.z);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(h.r, h.r, 2.5, 32, 1, true), new THREE.MeshStandardMaterial({ color: '#0b0f12', side: THREE.BackSide, roughness: 1 }));
    shaft.position.set(h.x, y - 1.25, h.z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(h.r + 0.02, 0.04, 8, 40), new THREE.MeshStandardMaterial({ color: '#ffb800', emissive: '#ff7a1a', emissiveIntensity: 0.45, metalness: 0.6, roughness: 0.4 }));
    rim.rotation.x = -Math.PI / 2; rim.position.set(h.x, y + 0.03, h.z);
    // hazard ticks
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: i % 2 ? '#111' : '#ffb800' }));
      t.position.set(h.x + Math.cos(a) * (h.r + 0.14), y + 0.012, h.z + Math.sin(a) * (h.r + 0.14));
      t.rotation.y = -a;
      this.root.add(t);
    }
    this.root.add(hole, shaft, rim);
    if (h.cycle) {
      // sliding steel lid with hazard edge
      const lid = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(h.r + 0.03, h.r + 0.03, 0.03, 32), this.M.steel), false, true);
      lid.position.set(h.x, y + 0.015, h.z);
      this.root.add(lid);
      this.lids.push({ lid, h: h as { x: number; r: number; cycle: { open: number; closed: number; offset?: number } } });
    }
  }

  private addBumper(c: { x: number; z: number; r: number; y?: number }) {
    const y = c.y ?? 0;
    const mat = this.M.bumper.clone();
    const mesh = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(c.r, c.r * 1.08, 0.6, 32), mat));
    mesh.position.set(c.x, y + 0.3, c.z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(c.r * 0.7, c.r * 0.7, 0.04, 32), new THREE.MeshStandardMaterial({ color: '#2a0a28', emissive: '#ff9cf8', emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 }));
    cap.position.set(c.x, y + 0.62, c.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(c.r + 0.05, 0.035, 8, 40), new THREE.MeshBasicMaterial({ color: '#00F0FF', toneMapped: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(c.x, y + 0.08, c.z);
    this.root.add(mesh, cap, ring);
    this.bumperMeshes.push({ mesh, ring, c });
  }

  /** Visual reaction to simulation events (flashes, shards, splashes). */
  onEvent(e: SimEvent) {
    const v = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
    switch (e.type) {
      case 'bumper': {
        this.fx.sparks(v(e.pos), '#ff3df2', 14, 3.5); this.fx.flash(v(e.pos), '#ff9cf8', 2);
        for (const m of [...this.wallMeshes, ...this.bumperMeshes.map((b) => b.mesh)]) if (m && m.position.distanceTo(v(e.pos)) < 3.5 && (m.material as THREE.MeshStandardMaterial).emissive) this.bumperPulse.set(m.material as THREE.Material, 1);
        break;
      }
      case 'crack': {
        const m = this.wallMeshes[e.wall];
        if (m) ((m.userData.crack as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.75;
        this.fx.shards(v(e.pos), '#8a8f94', 8, new THREE.Vector3(), false);
        break;
      }
      case 'break': {
        const m = this.wallMeshes[e.wall];
        const glass = e.kind === 'glass';
        if (m) { m.visible = false; this.fx.shards(m.position.clone(), glass ? '#b9f3ff' : '#8a8f94', glass ? 46 : 30, new THREE.Vector3(), glass); }
        this.fx.flash(v(e.pos), glass ? '#b9f3ff' : '#ffb800', 2.5);
        break;
      }
      case 'sink': this.fx.splash(v(e.pos), 26); break;
      case 'hole': this.fx.sparks(v(e.pos), '#ffb800', 10, 1.5); break;
      case 'clack': if (e.speed > 2) this.fx.sparks(v(e.pos), '#ffffff', Math.min(10, Math.floor(e.speed)), 1.5); break;
      case 'pocket': this.fx.flash(v(e.pos), '#7CFFB2', 2.2); this.fx.sparks(v(e.pos), '#7CFFB2', 20, 2.5); break;
      case 'portal': this.fx.flash(v(e.pos), '#00F0FF', 2.4); break;
    }
  }

  /** Ripples behind spheres moving through water. */
  private wetRipples(dt: number) {
    const L = this.sim.level;
    const zones = [...(L.water ?? []), ...(L.currents ?? [])];
    if (!zones.length) return;
    for (const b of this.sim.balls) {
      if (!b.active) continue;
      const p = b.pos();
      if (!zones.some((z) => pointInBox(p.x, p.z, z))) continue;
      const t = (this.rippleTimer.get(b.index) ?? 0) - dt;
      if (t <= 0) { this.fx.ripple(new THREE.Vector3(p.x, p.y - b.radius, p.z), Math.min(1, 0.3 + b.speed() / 6)); this.rippleTimer.set(b.index, b.speed() > 0.5 ? 0.12 : 0.6); }
      else this.rippleTimer.set(b.index, t);
    }
  }

  /** Restore wall visuals after an undo / snapshot restore. */
  syncWalls() {
    this.sim.staticWalls.forEach((w, i) => {
      const m = this.wallMeshes[i];
      if (!m) return;
      m.visible = !w.broken;
      const crack = m.userData.crack as THREE.Mesh | undefined;
      if (crack) {
        const max = w.kind === 'concrete' ? 2 : 1;
        (crack.material as THREE.MeshBasicMaterial).opacity = w.hp < max ? 0.75 : 0;
      }
    });
  }

  private addPocket(p: { id: string; x: number; z: number; y?: number; color: string; requires?: string[]; style?: keyof typeof POCKET_STYLES; rail?: { mouth: number } }) {
    const y = p.y ?? 0;
    const style = p.style ?? 'standard';
    const R = p.rail ? p.rail.mouth * 0.5 : POCKET_STYLES[style].radius;
    const col = new THREE.Color((PALETTE as Record<string, string>)[p.color] ?? '#fff');
    const hole = new THREE.Mesh(new THREE.CircleGeometry(R, 40), this.M.hole);
    // jaw dressing per style: chrome drop-pocket (american), leather rounded jaw (snooker), brass tight ring + net (russian)
    const jawMat = style === 'american' ? this.M.chrome : style === 'snooker' ? this.M.leather : style === 'russian' ? this.M.brass : this.M.steel;
    const jaw = new THREE.Mesh(new THREE.TorusGeometry(R + 0.07, style === 'snooker' ? 0.07 : 0.045, 12, 48), jawMat);
    jaw.rotation.x = -Math.PI / 2; jaw.position.set(p.x, y + 0.02, p.z); jaw.castShadow = true;
    this.root.add(jaw);
    if (style === 'russian') {
      const net = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.7, 0.9, 16, 4, true), new THREE.MeshBasicMaterial({ color: '#c49a4a', wireframe: true, transparent: true, opacity: 0.5 }));
      net.position.set(p.x, y - 0.45, p.z);
      this.root.add(net);
    }
    hole.rotation.x = -Math.PI / 2; hole.position.set(p.x, y + 0.004, p.z);
    const ringMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.2, roughness: 0.3 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.015, 0.025, 10, 48), ringMat);
    ring.rotation.x = -Math.PI / 2; ring.position.set(p.x, y + 0.03, p.z);
    this.root.add(hole, ring);
    this.pocketRings.push(ring);
    if (p.requires?.length) {
      const sh = new THREE.Mesh(
        new THREE.CylinderGeometry(R + 0.12, R + 0.12, 0.5, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: PALETTE.crimson, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      sh.position.set(p.x, y + 0.25, p.z);
      this.root.add(sh);
      this.pocketShields.push(sh);
    } else this.pocketShields.push(null);
    if (p.color === 'finish') {
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.45, 14, 24, 1, true),
        new THREE.MeshBasicMaterial({ color: PALETTE.finish, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      beam.position.set(p.x, y + 7, p.z);
      this.root.add(beam);
      this.finishBeams.push(beam);
      const ped = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.06, 32), this.M.copper), false, true);
      ped.position.set(p.x, y + 0.0, p.z);
      this.root.add(ped);
      hole.position.y = y + 0.035; ring.position.y = y + 0.05;
    } else this.finishBeams.push(null);
  }

  private addSwitch(s: { x: number; z: number; y?: number; type: string; order?: number; mass?: number }) {
    const y = s.y ?? 0;
    const heavy = s.type === 'heavy';
    const r = heavy ? HEAVY_PLATE_RADIUS : s.type === 'scale' ? 0.9 : SWITCH_RADIUS;
    if (s.type === 'code' || s.type === 'scale') {
      // floating label: key order number, or required mass
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d')!;
      g.fillStyle = s.type === 'code' ? '#FFB800' : '#7ff3ff'; g.font = 'bold 84px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 10; g.strokeStyle = '#101418';
      const label = s.type === 'code' ? String(s.order ?? 1) : `${s.mass ?? 2}×`;
      g.strokeText(label, 64, 68); g.fillText(label, 64, 68);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
      sp.scale.setScalar(1.0); sp.position.set(s.x, (s.y ?? 0) + 1.0, s.z); sp.material.toneMapped = false;
      this.root.add(sp);
    }
    const col = new THREE.Color(heavy ? '#ff7a1a' : PALETTE.amber);
    const base = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r + 0.06, r + 0.1, 0.04, 40), this.M.steel), false, true);
    base.position.set(s.x, y + 0.02, s.z);
    const plateMat = heavy ? this.M.hazard.clone() : new THREE.MeshStandardMaterial({ color: '#4a3a10', emissive: col, emissiveIntensity: 0.25, roughness: 0.4, metalness: 0.6 });
    const plate = this.shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r - 0.06, r - 0.06, 0.05, 40), plateMat), false, true);
    plate.position.set(s.x, y + 0.05, s.z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 48), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.5 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(s.x, y + 0.06, s.z);
    if (s.type === 'hold') {
      // hold-switch: segmented outer ring
      for (let i = 0; i < 8; i++) {
        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.05), (ring.material as THREE.Material));
        const a = (i / 8) * Math.PI * 2;
        tick.position.set(s.x + Math.cos(a) * (r + 0.14), y + 0.04, s.z + Math.sin(a) * (r + 0.14));
        tick.rotation.y = -a;
        this.root.add(tick);
      }
    }
    this.root.add(base, plate, ring);
    this.switchMeshes.push({ plate, ring, baseY: y + 0.05 });
  }

  private addPortal(p: Simulation['portals'][number]) {
    const y = p.y;
    const grp = new THREE.Group();
    grp.position.set(p.def.x, y, p.def.z);
    grp.rotation.y = Math.atan2(p.n.x, p.n.z); // local +Z = facing normal, local X = tangent
    const w = p.width;
    const frameMat = new THREE.MeshStandardMaterial({ color: PALETTE.cyan, emissive: PALETTE.cyan, emissiveIntensity: 2.4, roughness: 0.3 });
    const postG = new THREE.BoxGeometry(0.14, 1.3, 0.14);
    for (const sx of [-1, 1]) {
      const post = this.shadowed(new THREE.Mesh(postG, this.M.steel));
      post.position.set((sx * w) / 2, 0.65, 0);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.16), frameMat);
      strip.position.set((sx * w) / 2, 0.65, 0);
      grp.add(post, strip);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.12, 0.14), this.M.steel);
    top.position.y = 1.3;
    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, 0.16), frameMat);
    topStrip.position.y = 1.27;
    const disc = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.12, 1.2),
      new THREE.MeshBasicMaterial({ map: this.M.swirl, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    disc.position.y = 0.62;
    const floorGlow = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.9), new THREE.MeshBasicMaterial({ map: this.M.glow, color: PALETTE.cyan, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    floorGlow.rotation.x = -Math.PI / 2; floorGlow.position.set(0, 0.01, 0.35);
    grp.add(top, topStrip, disc, floorGlow);
    const light = new THREE.PointLight(PALETTE.cyan, 4, 4, 2);
    light.position.set(0, 0.8, 0.4);
    grp.add(light);
    this.root.add(grp);
    this.portalDiscs.push(disc);
  }

  private addHoop(h: Simulation['hoops'][number]) {
    const grp = new THREE.Group();
    grp.position.set(h.def.x, h.y, h.def.z);
    grp.rotation.y = Math.atan2(h.n.x, h.n.z);
    const mat = new THREE.MeshStandardMaterial({ color: '#c9a36b', emissive: PALETTE.amber, emissiveIntensity: 0.6, metalness: 0.9, roughness: 0.25 });
    this.hoopMats.push(mat);
    const arch = this.shadowed(new THREE.Mesh(new THREE.TorusGeometry(h.width / 2, 0.05, 10, 32, Math.PI), mat));
    arch.position.y = 0.55;
    const legG = new THREE.CylinderGeometry(0.05, 0.06, 0.55, 10);
    for (const sx of [-1, 1]) { const leg = this.shadowed(new THREE.Mesh(legG, mat)); leg.position.set((sx * h.width) / 2, 0.275, 0); grp.add(leg); }
    const lbl = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), new THREE.MeshBasicMaterial({ color: PALETTE.amber }));
    lbl.position.set(0, 1.05 + 0.05 * h.def.order, 0);
    grp.add(arch, lbl);
    // order pips
    for (let i = 0; i < h.def.order; i++) {
      const pip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: '#fff' }));
      pip.position.set((i - (h.def.order - 1) / 2) * 0.16, 1.25, 0);
      grp.add(pip);
    }
    this.root.add(grp);
  }

  private addBarrier(b: Simulation['barriers'][number]) {
    const bx = b.def.box;
    let obj: THREE.Object3D;
    if (b.def.kind === 'gate') {
      const g = new THREE.Group();
      const body = this.shadowed(new THREE.Mesh(new THREE.BoxGeometry(bx.w, b.h, bx.d), this.M.hazard));
      body.position.y = b.h / 2;
      const laser = new THREE.Mesh(new THREE.BoxGeometry(bx.w, 0.03, bx.d + 0.02), new THREE.MeshBasicMaterial({ color: PALETTE.crimson }));
      laser.position.y = b.h + 0.02;
      g.add(body, laser);
      obj = g;
    } else {
      const g = new THREE.Group();
      const slab = this.shadowed(new THREE.Mesh(new THREE.BoxGeometry(bx.w, 0.12, bx.d), this.M.glass), false, true);
      slab.position.y = -0.06;
      const edgeMat = new THREE.MeshBasicMaterial({ color: PALETTE.cyan });
      const long = bx.w > bx.d;
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(long ? bx.w : 0.04, 0.04, long ? 0.04 : bx.d), edgeMat);
        e.position.set(long ? 0 : (s * bx.w) / 2, 0.0, long ? (s * bx.d) / 2 : 0);
        g.add(e);
      }
      g.add(slab);
      obj = g;
    }
    obj.position.set(bx.x, (bx.y ?? 0) + b.offset, bx.z);
    obj.rotation.y = bx.rot ?? 0;
    if (b.def.swing) {
      // gear hub at the pivot
      const gear = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 24), this.M.copper);
      gear.add(disc);
      for (let i = 0; i < 12; i++) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.12), this.M.copper); const a = (i / 12) * Math.PI * 2; tooth.position.set(Math.cos(a) * 0.46, 0, Math.sin(a) * 0.46); tooth.rotation.y = -a; gear.add(tooth); }
      gear.position.y = (b.h ?? 0.55) + 0.1;
      obj.add(gear);
      obj.userData.gear = gear;
    }
    this.root.add(obj);
    this.barriers.push(obj);
  }

  private addBall(b: Simulation['balls'][number]) {
    const geo = new THREE.SphereGeometry(b.radius, 40, 28);
    let mat: THREE.Material;
    if (b.kind === 'heavy') mat = this.M.tungsten;
    else if (b.kind === 'cue') mat = new THREE.MeshPhysicalMaterial({ color: BALL_COLORS.cue, roughness: 0.18, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 });
    else if (b.num > 0) mat = new THREE.MeshPhysicalMaterial({ map: poolBallTexture(BALL_COLORS[b.kind], b.num), roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
    else mat = new THREE.MeshPhysicalMaterial({ color: BALL_COLORS[b.kind], roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, emissive: BALL_COLORS[b.kind], emissiveIntensity: 0.12 });
    const mesh = this.shadowed(new THREE.Mesh(geo, mat), true, false);
    if (b.kind !== 'heavy' && b.num === 0) {
      // orientation marker band so rolling is readable
      const band = new THREE.Mesh(new THREE.TorusGeometry(b.radius * 1.0, 0.012, 6, 40), new THREE.MeshBasicMaterial({ color: b.kind === 'cue' ? '#00F0FF' : '#ffffff' }));
      mesh.add(band);
    }
    this.root.add(mesh);
    this.balls.push({ mesh, sinkT: -1, visible: true });
  }

  /** Sync visuals with simulation state. */
  update(dt: number, time: number) {
    const sim = this.sim;
    this.fx.update(dt);
    for (const t of this.waterNormals) { t.offset.x += dt * 0.03; t.offset.y += dt * 0.05; }
    for (const t of this.flowTex) t.offset.x -= dt * 0.9;
    for (const w of this.windTex) {
      const on = !w.gust || this.sim.cycleOpen(w.gust, this.sim.time);
      if (on) w.t.offset.x -= dt * 1.6;
      for (const m of w.mats) m.opacity += ((on ? 0.6 : 0.06) - m.opacity) * Math.min(1, dt * 8);
      if (on) w.rotor?.rotateZ(dt * 9);
    }
    for (const t of this.tetherLines) {
      const b = this.sim.balls[t.ball];
      t.line.visible = b.active && !this.sim.snapped.has(t.i);
      if (!t.line.visible) continue;
      const p = b.pos(), arr = t.line.geometry.attributes.position as THREE.BufferAttribute;
      arr.setXYZ(0, t.x, p.y + 0.25, t.z); arr.setXYZ(1, p.x, p.y, p.z); arr.needsUpdate = true;
    }
    for (const r of this.ropes) {
      const a = this.sim.balls[r.a], b = this.sim.balls[r.b];
      r.line.visible = a.active && b.active;
      if (!r.line.visible) continue;
      const pa = a.pos(), pb = b.pos(), arr = r.line.geometry.attributes.position as THREE.BufferAttribute;
      const n = arr.count, d = Math.hypot(pb.x - pa.x, pb.z - pa.z), len = this.sim.level.chains!.find((c) => c[0] === r.a && c[1] === r.b)![2];
      const sag = Math.max(0, len - d) * 0.25;
      for (let i = 0; i < n; i++) { const t = i / (n - 1); arr.setXYZ(i, pa.x + (pb.x - pa.x) * t, Math.min(pa.y, pb.y) - 0.12 + Math.sin(Math.PI * t) * (0.05 - sag * 0.2), pa.z + (pb.z - pa.z) * t); }
      arr.needsUpdate = true;
    }
    for (const f of this.fans) f.rotateZ(dt * 9);
    for (const p of this.pumps) p.mesh.rotation.z = p.base + (this.sim.sig(p.when) ? Math.PI : 0);
    for (const v of this.vortexMeshes) v.mesh.rotation.z += dt * v.rate;
    for (const l of this.lids) {
      const open = this.sim.cycleOpen(l.h.cycle, this.sim.time);
      const tx = l.h.x + (open ? l.h.r * 2.1 : 0);
      l.lid.position.x += (tx - l.lid.position.x) * Math.min(1, dt * 10);
    }
    for (const b of this.beltTex) b.t.offset.x -= dt * b.speed;
    for (const [m, k] of this.bumperPulse) { const sm = m as THREE.MeshStandardMaterial; sm.emissiveIntensity = 0.55 + k * 4; const nk = k - dt * 3; if (nk <= 0) { this.bumperPulse.delete(m); sm.emissiveIntensity = 0.55; } else this.bumperPulse.set(m, nk); }
    for (const b of this.bumperMeshes) (b.ring.material as THREE.MeshBasicMaterial).color.setHSL(0.5 + Math.sin(time * 2 + b.c.x) * 0.05, 1, 0.55);
    this.wetRipples(dt);
    sim.balls.forEach((b, i) => {
      const v = this.balls[i];
      if (b.active) {
        const p = b.body.translation(), q = b.body.rotation();
        v.mesh.visible = true; v.sinkT = -1;
        v.mesh.position.set(p.x, p.y, p.z);
        v.mesh.quaternion.set(q.x, q.y, q.z, q.w);
        v.mesh.scale.setScalar(1);
      } else if (b.sinkAt && (b.status === 'sunk' || b.status === 'respawning')) {
        if (v.sinkT < 0) v.sinkT = 0;
        v.sinkT += dt;
        const k = Math.min(1, v.sinkT / 0.45);
        v.mesh.position.set(b.sinkAt.x, b.sinkAt.y + b.radius * (1 - k * 2.2), b.sinkAt.z);
        v.mesh.scale.setScalar(1 - k * 0.6);
        v.mesh.visible = k < 1;
      } else v.mesh.visible = false;
    });
    sim.barriers.forEach((b, i) => {
      const o = this.barriers[i];
      o.position.y = (b.def.box.y ?? 0) + b.offset;
      if (b.def.spin) o.rotation.y = b.angle;
      if (b.def.swing) { o.rotation.y = b.angle; const gear = o.userData.gear as THREE.Object3D | undefined; if (gear) gear.rotation.y = -b.angle * 3; }
      o.visible = b.def.kind === 'gate' ? b.offset > b.hiddenOffset + 0.01 : b.offset > b.hiddenOffset + 0.05;
    });
    sim.switches.forEach((s, i) => {
      const m = this.switchMeshes[i];
      m.plate.position.y += ((s.active ? m.baseY - 0.035 : m.baseY) - m.plate.position.y) * Math.min(1, dt * 12);
      const mat = m.ring.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = s.active ? 4 : 1.2 + Math.sin(time * 3) * 0.4;
      mat.emissive.set(s.active ? '#7CFF6B' : s.def.type === 'heavy' ? '#ff7a1a' : PALETTE.amber);
    });
    sim.pockets.forEach((p, i) => {
      const unlocked = sim.requiresMet(p.def.requires);
      const sh = this.pocketShields[i];
      if (sh) { sh.visible = !unlocked; sh.rotation.y = time; (sh.material as THREE.MeshBasicMaterial).opacity = 0.25 + Math.sin(time * 4) * 0.08; }
      const beam = this.finishBeams[i];
      if (beam) {
        const mat = beam.material as THREE.MeshBasicMaterial;
        mat.opacity += ((unlocked ? 0.28 + Math.sin(time * 2) * 0.05 : 0) - mat.opacity) * Math.min(1, dt * 3);
        beam.visible = mat.opacity > 0.01;
      }
      (this.pocketRings[i].material as THREE.MeshStandardMaterial).emissiveIntensity = unlocked ? 2.4 + Math.sin(time * 5) * 0.6 : 0.6;
    });
    for (const d of this.portalDiscs) { const m = d.material as THREE.MeshBasicMaterial; m.map!.rotation = time * 2; m.map!.center.set(0.5, 0.5); }
    sim.hoops.forEach((h, i) => {
      const m = this.hoopMats[i];
      m.emissive.set(h.passed ? '#7CFF6B' : PALETTE.amber);
      m.emissiveIntensity = h.passed ? 2.5 : 0.6 + Math.sin(time * 3 + i) * 0.3;
    });
  }
}
