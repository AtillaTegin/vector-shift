import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { ThemeId } from '../levels/LevelTypes';
import { waterfallTexture, waterNormal } from './Textures';

/**
 * Renderer — WebGL renderer, isometric camera rig (FOV 35°), lighting, bloom post-processing
 * and the static industrial backdrop (abyss grid, pipes, haze).
 */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly composer: EffectComposer;
  readonly sun: THREE.DirectionalLight;
  readonly levelRoot = new THREE.Group();
  private backdrops: Record<ThemeId, THREE.Group> = { foundry: new THREE.Group(), hydro: new THREE.Group(), caravan: new THREE.Group() };
  private hemi!: THREE.HemisphereLight;
  private rim!: THREE.DirectionalLight;
  private animTex: { tex: THREE.Texture; dx: number; dy: number }[] = [];
  theme: ThemeId = 'foundry';

  // camera rig
  target = new THREE.Vector3();
  goalTarget = new THREE.Vector3();
  /** The level's full-table framing (start view). */
  homeTarget = new THREE.Vector3();
  homeDist = 24;
  yaw = Math.PI / 4;
  goalYaw = Math.PI / 4;
  pitch = THREE.MathUtils.degToRad(54);
  goalPitch = THREE.MathUtils.degToRad(54);
  /** 8° = almost level with the table … 89.9° = straight down (a flat 2D plan view). */
  static readonly MIN_PITCH = THREE.MathUtils.degToRad(8);
  static readonly MAX_PITCH = THREE.MathUtils.degToRad(89.9);
  /** Jump to a viewing elevation (degrees above the table plane). */
  setPitch(deg: number) { this.goalPitch = THREE.MathUtils.clamp(THREE.MathUtils.degToRad(deg), Renderer.MIN_PITCH, Renderer.MAX_PITCH); }

  /** Free orbit around the target: yaw (around Y) and pitch (over the horizon). */
  orbit(dYaw: number, dPitch: number) {
    this.goalYaw += dYaw;
    this.goalPitch = THREE.MathUtils.clamp(this.goalPitch + dPitch, Renderer.MIN_PITCH, Renderer.MAX_PITCH);
  }
  zoom(factor: number) { this.goalDist = THREE.MathUtils.clamp(this.goalDist * factor, 5, 80); }
  dist = 24;
  goalDist = 24;

  constructor(container: HTMLElement) {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    this.renderer = r;

    this.camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 400);
    this.scene.background = new THREE.Color('#07090c');
    this.scene.fog = new THREE.FogExp2('#0a0e13', 0.018);

    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.45;

    this.hemi = new THREE.HemisphereLight('#9fb6c8', '#141a20', 0.55);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff2dc', 2.1);
    sun.position.set(-12, 26, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera as THREE.OrthographicCamera;
    sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 80;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    const rim = new THREE.DirectionalLight('#5fd8ff', 0.5);
    rim.position.set(14, 10, -16);
    this.scene.add(rim);
    this.rim = rim;

    this.scene.add(this.levelRoot);
    this.buildBackdrop();
    this.buildHydroBackdrop();
    this.buildCaravanBackdrop();
    this.scene.add(this.backdrops.foundry, this.backdrops.hydro, this.backdrops.caravan);
    this.setTheme('foundry');

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.45, 0.82));
    this.composer.addPass(new OutputPass());

    window.addEventListener('resize', () => this.resize());
  }

  private buildBackdrop() {
    const grid = new THREE.GridHelper(400, 200, '#16404a', '#0f2228');
    grid.position.y = -16;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    this.backdrops.foundry.add(grid);
    // industrial pipes & girders far below
    const pipeMat = new THREE.MeshStandardMaterial({ color: '#2a3038', metalness: 0.8, roughness: 0.45 });
    const copper = new THREE.MeshStandardMaterial({ color: '#8a4b2a', metalness: 0.9, roughness: 0.35 });
    let s = 12345;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const len = 40 + rnd() * 80;
      const g = new THREE.CylinderGeometry(0.25 + rnd() * 0.5, 0.25 + rnd() * 0.5, len, 12);
      const m = new THREE.Mesh(g, rnd() < 0.25 ? copper : pipeMat);
      m.rotation.z = Math.PI / 2;
      m.rotation.y = rnd() < 0.5 ? 0 : Math.PI / 2;
      m.position.set((rnd() - 0.5) * 90, -13 - rnd() * 9, (rnd() - 0.5) * 90);
      this.backdrops.foundry.add(m);
    }
    const lampMat = new THREE.MeshBasicMaterial({ color: '#00F0FF' });
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 3), lampMat);
      m.position.set((rnd() - 0.5) * 80, -10 - rnd() * 5, (rnd() - 0.5) * 80);
      this.backdrops.foundry.add(m);
    }
  }

  /** World look: sky, fog, light colours and backdrop set. */
  setTheme(t: ThemeId) {
    this.theme = t;
    this.backdrops.foundry.visible = t === 'foundry';
    this.backdrops.hydro.visible = t === 'hydro';
    this.backdrops.caravan.visible = t === 'caravan';
    const fog = this.scene.fog as THREE.FogExp2;
    if (t === 'caravan') {
      (this.scene.background as THREE.Color).set('#1c0f12');
      fog.color.set('#3a1f1c'); fog.density = 0.016;
      this.hemi.color.set('#ffd9a8'); this.hemi.groundColor.set('#3a2014'); this.hemi.intensity = 0.7;
      this.sun.color.set('#ffd29a'); this.sun.intensity = 2.3;
      this.rim.color.set('#ff9a5c'); this.rim.intensity = 0.6;
      this.renderer.toneMappingExposure = 1.1;
    } else if (t === 'hydro') {
      (this.scene.background as THREE.Color).set('#05141c');
      fog.color.set('#0b2733'); fog.density = 0.02;
      this.hemi.color.set('#a8e6ff'); this.hemi.groundColor.set('#0d2a33'); this.hemi.intensity = 0.75;
      this.sun.color.set('#e8fbff'); this.sun.intensity = 2.0;
      this.rim.color.set('#3dffd2'); this.rim.intensity = 0.7;
      this.renderer.toneMappingExposure = 1.12;
    } else {
      (this.scene.background as THREE.Color).set('#07090c');
      fog.color.set('#0a0e13'); fog.density = 0.018;
      this.hemi.color.set('#9fb6c8'); this.hemi.groundColor.set('#141a20'); this.hemi.intensity = 0.55;
      this.sun.color.set('#fff2dc'); this.sun.intensity = 2.1;
      this.rim.color.set('#5fd8ff'); this.rim.intensity = 0.5;
      this.renderer.toneMappingExposure = 1.05;
    }
  }

  /** Hydro Station: abyss reservoir, dam walls, waterfalls, mist and warm work-lamps. */
  private buildHydroBackdrop() {
    const g = this.backdrops.hydro;
    const nrm = waterNormal(11);
    nrm.repeat.set(30, 30);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshPhysicalMaterial({ color: '#0c4a5c', roughness: 0.15, metalness: 0.2, normalMap: nrm, normalScale: new THREE.Vector2(0.6, 0.6), emissive: '#04222b' }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -18;
    g.add(sea);
    this.animTex.push({ tex: nrm, dx: 0.004, dy: 0.006 });
    const fallTex = waterfallTexture();
    fallTex.repeat.set(1, 3);
    this.animTex.push({ tex: fallTex, dx: 0, dy: 0.9 });
    const fallMat = new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, opacity: 0.85 });
    const dam = new THREE.MeshStandardMaterial({ color: '#3c4a52', roughness: 0.85, metalness: 0.1 });
    const lamp = new THREE.MeshBasicMaterial({ color: '#ffcf6b', toneMapped: false });
    // dam wall ring with spillway falls
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
      const wallM = new THREE.Mesh(new THREE.BoxGeometry(70, 34, 4), dam);
      wallM.position.set(Math.cos(a) * 60, -4, Math.sin(a) * 60);
      wallM.lookAt(0, -4, 0);
      g.add(wallM);
      for (let i = -2; i <= 2; i++) {
        const f = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 30), fallMat);
        const off = new THREE.Vector3(i * 12, -5, 2.2).applyQuaternion(wallM.quaternion);
        f.position.copy(wallM.position).add(off);
        f.quaternion.copy(wallM.quaternion);
        g.add(f);
        const l = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 0.3), lamp);
        l.position.copy(wallM.position).add(new THREE.Vector3(i * 12 + 6, 9, 2.3).applyQuaternion(wallM.quaternion));
        l.quaternion.copy(wallM.quaternion);
        g.add(l);
      }
    }
    // penstock pipes
    const pipe = new THREE.MeshStandardMaterial({ color: '#2f6f7c', metalness: 0.7, roughness: 0.35 });
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 90, 18), pipe);
      p.rotation.z = Math.PI / 2; p.rotation.y = (i % 2) * Math.PI / 2;
      p.position.set((i - 4) * 9, -13 - (i % 3) * 1.5, (i % 2 ? 1 : -1) * (14 + i * 3));
      g.add(p);
    }
    // mist motes
    const mistGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i < 900; i++) pts.push((Math.random() - 0.5) * 120, -16 + Math.random() * 20, (Math.random() - 0.5) * 120);
    mistGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mist = new THREE.Points(mistGeo, new THREE.PointsMaterial({ color: '#9fe9ff', size: 0.12, transparent: true, opacity: 0.5, depthWrite: false }));
    mist.userData.drift = true;
    g.add(mist);
  }

  /** Caravanserai: dusk desert, dunes, sandstone domes with turquoise tiles, minarets and lanterns. */
  private buildCaravanBackdrop() {
    const g = this.backdrops.caravan;
    let s = 777;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const sandM = new THREE.MeshStandardMaterial({ color: '#b9814c', roughness: 1 });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), sandM);
    ground.rotation.x = -Math.PI / 2; ground.position.y = -20; g.add(ground);
    for (let i = 0; i < 40; i++) {
      const d = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), sandM);
      const a = rnd() * Math.PI * 2, r = 35 + rnd() * 90;
      d.scale.set(10 + rnd() * 18, 2 + rnd() * 5, 6 + rnd() * 10);
      d.rotation.y = rnd() * Math.PI;
      d.position.set(Math.cos(a) * r, -20, Math.sin(a) * r); g.add(d);
    }
    const stone = new THREE.MeshStandardMaterial({ color: '#c99a66', roughness: 0.9 });
    const tileM = new THREE.MeshStandardMaterial({ color: '#1fa3a8', roughness: 0.35, metalness: 0.2, emissive: '#06383b' });
    const lamp = new THREE.MeshBasicMaterial({ color: '#ffb35c', toneMapped: false });
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + rnd() * 0.3, r = 48 + rnd() * 25;
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 10 + rnd() * 8;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, h, 8), stone);
      base.position.set(x, -20 + h / 2, z); g.add(base);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), tileM);
      dome.position.set(x, -20 + h, z); dome.scale.y = 1.3; g.add(dome);
      if (k % 2 === 0) {
        const mh = 22 + rnd() * 10;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.2, mh, 12), stone);
        m.position.set(x + 8, -20 + mh / 2, z + 3); g.add(m);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3, 12), tileM);
        cap.position.set(x + 8, -20 + mh + 1.5, z + 3); g.add(cap);
      }
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lamp);
        l.position.set(x + (rnd() - 0.5) * 12, -20 + 2 + rnd() * 6, z + (rnd() - 0.5) * 12); g.add(l);
      }
    }
    // drifting sand motes
    const geo = new THREE.BufferGeometry(); const pts: number[] = [];
    for (let i = 0; i < 700; i++) pts.push((rnd() - 0.5) * 120, -18 + rnd() * 22, (rnd() - 0.5) * 120);
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const motes = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd59a', size: 0.12, transparent: true, opacity: 0.45, depthWrite: false }));
    motes.userData.drift = true; g.add(motes);
  }

  /** Per-frame backdrop animation. */
  animate(dt: number, time: number) {
    for (const a of this.animTex) { a.tex.offset.x += a.dx * dt; a.tex.offset.y += a.dy * dt; }
    for (const o of [...this.backdrops.hydro.children, ...this.backdrops.caravan.children]) if (o.userData.drift) o.rotation.y = time * 0.01;
  }

  frame(level: { x: number; z: number; dist: number; yaw?: number }) {
    this.goalTarget.set(level.x, 0, level.z);
    this.homeTarget.copy(this.goalTarget); this.homeDist = level.dist;
    this.target.copy(this.goalTarget);
    this.goalDist = this.dist = level.dist;
    this.goalYaw = this.yaw = level.yaw ?? Math.PI / 4;
    this.goalPitch = this.pitch = THREE.MathUtils.degToRad(54);
  }

  /** Ground-plane basis for WASD panning relative to the view. */
  panBasis() {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const rgt = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    return { f, r: rgt };
  }

  updateCamera(dt: number) {
    const k = 1 - Math.exp(-dt * 6);
    this.target.lerp(this.goalTarget, k);
    this.dist += (this.goalDist - this.dist) * k;
    this.yaw += (this.goalYaw - this.yaw) * k;
    this.pitch += (this.goalPitch - this.pitch) * k;
    const off = new THREE.Vector3(
      Math.cos(this.pitch) * Math.sin(this.yaw),
      Math.sin(this.pitch),
      Math.cos(this.pitch) * Math.cos(this.yaw),
    ).multiplyScalar(this.dist);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    this.sun.position.copy(this.target).add(new THREE.Vector3(-12, 26, 10));
    this.sun.target.position.copy(this.target);
  }

  render() { this.composer.render(); }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  }

  clearLevel() {
    this.levelRoot.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.levelRoot.clear();
  }
}
