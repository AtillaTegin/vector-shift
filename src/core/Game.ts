import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Simulation, type SimEvent, type SimSnapshot } from '../physics/Simulation';
import { VectorRaycaster, type Trajectory } from '../physics/VectorRaycaster';
import { FIXED_DT, UNDO_CHARGES } from '../physics/PhysicsMaterials';
import { LEVELS, WORLDS, DIFFICULTY_LABELS, isLocked } from '../levels/levels';
import { Renderer } from '../render/Renderer';
import { LevelView } from '../render/LevelView';
import { AimVisualizer } from '../render/AimVisualizer';
import { HUD } from '../ui/HUD';
import { Synth } from '../audio/Synth';
import { SaveSystem } from './SaveSystem';
import { Store, CATALOGUE } from './Store';
import { AIM_TIERS } from '../render/AimVisualizer';

type GameMode = 'menu' | 'playing' | 'result';

/**
 * Game — top-level state machine (menu → playing → result), fixed-timestep loop,
 * mouse/keyboard input, undo stack and event → audio/HUD routing.
 */
export class Game {
  private renderer: Renderer;
  private hud: HUD;
  private synth = new Synth();
  private save = new SaveSystem();
  private store = new Store(this.save);
  private aimViz = new AimVisualizer();
  private sim: Simulation | null = null;
  private view: LevelView | null = null;
  private ray: VectorRaycaster | null = null;
  private levelIndex = 0;
  private mode: GameMode = 'menu';
  private menuWorld = 1;

  // input / aiming
  private keys = new Set<string>();
  private mouse = new THREE.Vector2();
  private aiming = false;
  private aimPoint = new THREE.Vector3();
  private lastGround = new THREE.Vector3();
  private angleOffset = 0;
  private aimAngle = 0;
  private aimPower = 0;
  private spin = { x: 0, y: 0 };
  private panning = false;
  private orbiting = false;
  private touchpad = false;
  private orbitMoved = 0;
  private touches = new Map<number, { x: number; y: number }>();
  private panLast = new THREE.Vector2();
  private follow = true;
  private traj: Trajectory | null = null;

  // undo
  private undoStack: SimSnapshot[] = [];
  private undoCharges = UNDO_CHARGES;

  // loop
  private acc = 0;
  private last = performance.now();
  private time = 0;
  private fps = 60;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(private readonly container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.renderer.scene.add(this.aimViz.group);
    this.hud = new HUD(container);
    this.hud.onView = (d) => this.renderer.setPitch(d);
    this.bindInput();
  }

  static async create(container: HTMLElement) {
    await RAPIER.init();
    const g = new Game(container);
    g.loadLevel(Math.min(g.save.data.lastLevel, LEVELS.length - 1), false);
    g.showMenu();
    requestAnimationFrame((t) => g.loop(t));
    return g;
  }

  // ───────────────────────────── levels ─────────────────────────────
  loadLevel(i: number, announce = true, force = false) {
    // locked sector: send the player to the challenge that blocks it
    if (!force && isLocked(i, this.save.data.best)) { const w = LEVELS[i].world; i = LEVELS.findIndex((l) => l.world === w && l.challenge && this.save.data.best[l.id] === undefined); }
    this.sim?.dispose();
    this.renderer.clearLevel();
    this.levelIndex = i;
    const def = LEVELS[i];
    this.sim = new Simulation(RAPIER, def);
    this.view = new LevelView(this.sim);
    this.ray = new VectorRaycaster(this.sim);
    this.renderer.levelRoot.add(this.view.root);
    this.renderer.setTheme(def.theme ?? 'foundry');
    this.renderer.frame(def.camera);
    this.follow = true;
    this.undoStack = [];
    this.undoCharges = UNDO_CHARGES;
    this.cancelAim();
    this.spin = { x: 0, y: 0 };
    this.mode = 'playing';
    this.save.setLastLevel(i);
    this.hud.hideModal();
    if (announce) this.hud.toast(def.challenge ? `⚔ CHALLENGE — ${def.name} · finish in ≤ ${def.challenge.maxStrokes} stroke${def.challenge.maxStrokes > 1 ? 's' : ''}` : `${def.sector} — ${def.name}`, '', def.challenge ? 4000 : 2200);
  }

  restart() { this.loadLevel(this.levelIndex); }

  private undo() {
    if (!this.sim || this.sim.state === 'won') return;
    if (this.sim.level.challenge) { this.hud.toast('NO UNDO IN A CHALLENGE', 'bad'); return; }
    const snap = this.undoStack.pop();
    if (!snap) { this.hud.toast('NOTHING TO UNDO', 'bad'); return; }
    if (this.undoCharges <= 0) { this.undoStack.push(snap); this.hud.toast('NO UNDO CHARGES LEFT', 'bad'); return; }
    this.undoCharges--;
    this.sim.restore(snap);
    this.view?.syncWalls();
    this.mode = 'playing';
    this.hud.hideModal();
    this.hud.toast(`TIMELINE REWOUND · ${this.undoCharges} LEFT`);
    this.synth.portal();
  }

  // ───────────────────────────── menus ─────────────────────────────
  showMenu(world?: number) {
    this.mode = 'menu';
    this.menuWorld = world ?? LEVELS[this.levelIndex].world;
    const best = this.save.data.best;
    const tabs = WORLDS.map((w) => `<button class="btn ${w.id === this.menuWorld ? 'active' : ''}" data-world="${w.id}"><span>W${w.id} · ${w.name}</span></button>`).join('');
    const wdef = WORLDS.find((w) => w.id === this.menuWorld)!;
    const items = LEVELS.map((l, i) => {
      if (l.world !== this.menuWorld) return '';
      const b = best[l.id];
      const locked = isLocked(i, best);
      const meta = locked ? 'LOCKED' : l.challenge ? `CHALLENGE ≤ ${l.challenge.maxStrokes}${b !== undefined ? ' · ✔' : ''}` : b === undefined ? `PAR ${l.par}` : `BEST ${b} / PAR ${l.par}`;
      return `<button class="btn${locked ? ' locked' : ''}${l.challenge ? ' challenge' : ''}" ${locked ? 'disabled' : ''} data-level="${i}"><span>${locked ? '🔒 ' : l.challenge ? '⚔ ' : ''}${l.sector} · ${l.name} <span class="diff d${l.difficulty}" style="font-size:9px">${DIFFICULTY_LABELS[l.difficulty]}</span></span><span class="meta ${b !== undefined && b <= l.par ? 'gold' : ''}">${meta}</span></button>`;
    }).join('');
    this.hud.showModal(`
      <h1>VECTOR<span>:</span> SHIFT</h1>
      <div class="sub">ISOMETRIC KINETIC PUZZLE SYSTEM</div>
      <p>Angle in equals angle out. Bank, portal and chain-react your way across suspended industrial islands. Finish each sector under PAR.</p>
      <div class="world-tabs">${tabs}</div>
      <p style="margin:8px 0 0">${wdef.blurb}</p>
      <div class="levels">${items}</div>
      <div class="row-btns"><button class="btn" data-act="shop">SHOP · SIGHT: ${this.store.tier.toUpperCase()}</button><button class="btn primary" data-act="resume">${this.sim && this.sim.strokes > 0 ? 'RESUME' : 'START'} · ${LEVELS[this.levelIndex].name.toUpperCase()}</button></div>`, {
      shop: () => { this.synth.ui(); this.showShop(); },
      resume: () => { this.synth.unlock(); this.synth.ui(); this.mode = 'playing'; this.hud.hideModal(); this.hud.toast(LEVELS[this.levelIndex].briefing.split('.')[0], '', 3500); },
    });
    this.hud.bindAll('data-world', (v) => { this.synth.ui(); this.showMenu(Number(v)); });
    this.hud.bindAll('data-level', (v) => { this.synth.unlock(); this.synth.ui(); this.loadLevel(Number(v)); this.hud.toast(LEVELS[Number(v)].briefing.split('.')[0], '', 3500); });
  }

  /** Shop: aim-assist upgrades. Purchases go through the Store's payment provider (test mode for now). */
  showShop() {
    this.mode = 'menu';
    const tier = this.store.tier;
    const items = CATALOGUE.map((c) => {
      const owned = this.store.owns(c.sku);
      const eq = tier === c.tier;
      return `<div class="btn" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default">
        <div style="display:flex;justify-content:space-between"><b style="color:#fff">${c.name}</b><span class="meta gold">${owned ? 'OWNED' : c.price}</span></div>
        <span class="meta">${c.blurb}</span>
        <div style="display:flex;gap:6px">${owned ? `<button class="btn" data-equip="${c.tier}" style="flex:1;justify-content:center">${eq ? 'EQUIPPED ✓' : 'EQUIP'}</button>` : `<button class="btn primary" data-buy="${c.sku}" style="flex:1">BUY ${c.price}</button>`}</div>
      </div>`;
    }).join('');
    this.hud.showModal(`
      <div class="sub">VECTOR SIGHT · AIM ASSIST</div>
      <h2>Shop</h2>
      <p>The free sight shows your line to the first contact and a short object-ball arrow — like 8-ball pool. Upgrades extend the guide.</p>
      <div class="levels">
        <div class="btn" style="cursor:default"><span><b style="color:#fff">Basic Sight</b> · first contact + short arrow</span><span class="meta">${tier === 'basic' ? 'EQUIPPED ✓' : '<button class="btn" data-equip="basic">EQUIP</button>'}</span></div>
        ${items}
      </div>
      ${this.store.testMode ? '<p style="color:#FFB800">TEST MODE — purchases unlock instantly, no payment is taken. Steam payments plug in before release.</p>' : ''}
      <div class="row-btns"><button class="btn primary" data-act="back">BACK</button></div>`, { back: () => this.showMenu() });
    this.hud.bindAll('data-buy', async (sku) => { if (await this.store.purchase(sku as never)) { this.synth.win(); this.hud.toast('UNLOCKED', 'good'); } this.showShop(); });
    this.hud.bindAll('data-equip', (t) => { this.store.equip(t as never); this.synth.ui(); this.showShop(); });
  }

  private showResult(won: boolean, reason = '') {
    const sim = this.sim!;
    const L = sim.level;
    this.mode = 'result';
    if (won) {
      const isBest = this.save.recordResult(L.id, sim.strokes);
      const d = sim.strokes - L.par;
      const stars = d <= 0 ? 3 : d <= 2 ? 2 : 1;
      const rating = d < 0 ? 'UNDER PAR' : d === 0 ? 'ON PAR' : `+${d} OVER PAR`;
      const hasNext = this.levelIndex < LEVELS.length - 1;
      this.hud.showModal(`
        <div class="sub">${L.sector} · COMPLETE</div>
        <h2>${L.name}</h2>
        <div class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <p>STROKES <b style="color:#fff">${sim.strokes}</b> · PAR ${L.par} · ${rating}${isBest ? ' · <span style="color:#FFB800">NEW BEST</span>' : ''}</p>
        <div class="row-btns">
          <button class="btn" data-act="retry">RETRY (R)</button>
          <button class="btn" data-act="menu">SECTORS</button>
          ${hasNext ? '<button class="btn primary" data-act="next">NEXT SECTOR ▸</button>' : ''}
        </div>
        ${hasNext ? '' : '<p style="margin-top:14px;color:#7CFF6B">All sectors calibrated. The facility is yours.</p>'}`, {
        retry: () => this.restart(),
        menu: () => this.showMenu(),
        next: () => this.loadLevel(this.levelIndex + 1),
      });
    } else {
      this.hud.showModal(`
        <div class="sub" style="color:#FF2E4C">CHAIN BROKEN</div>
        <h2>Puzzle Failed</h2>
        <p>${reason}. Rewind the last shot or restart the sector.</p>
        <div class="row-btns">
          <button class="btn" data-act="undo">UNDO (Z) · ${this.undoCharges} LEFT</button>
          <button class="btn primary" data-act="retry">RESTART (R)</button>
        </div>`, { undo: () => this.undo(), retry: () => this.restart() });
    }
  }

  // ───────────────────────────── input ─────────────────────────────
  private groundPoint(y: number): THREE.Vector3 | null {
    this.plane.constant = -y;
    this.raycaster.setFromCamera(this.mouse, this.renderer.camera);
    const p = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.plane, p) ? p : null;
  }

  private cancelAim() { this.aiming = false; this.angleOffset = 0; this.aimPower = 0; this.aimViz.hide(); }

  private bindInput() {
    const cv = this.renderer.renderer.domElement;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => {
      this.mouse.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      if (this.orbiting) {
        const dx = e.clientX - this.panLast.x, dy = e.clientY - this.panLast.y;
        this.panLast.set(e.clientX, e.clientY);
        this.orbitMoved += Math.abs(dx) + Math.abs(dy);
        this.renderer.orbit(-dx * 0.006, dy * 0.005);
        return;
      }
      if (this.panning) {
        const dx = e.clientX - this.panLast.x, dy = e.clientY - this.panLast.y;
        this.panLast.set(e.clientX, e.clientY);
        const { f, r } = this.renderer.panBasis();
        const k = this.renderer.dist * 0.0016;
        this.renderer.goalTarget.addScaledVector(r, -dx * k).addScaledVector(f, dy * k);
        this.follow = false;
      }
      if (this.aiming && this.sim) {
        const g = this.groundPoint(this.sim.cue.pos().y);
        if (g) {
          const fine = e.shiftKey ? 0.2 : 1;
          this.aimPoint.addScaledVector(g.clone().sub(this.lastGround), fine);
          this.lastGround.copy(g);
        }
      }
    });
    cv.addEventListener('mousedown', (e) => {
      this.synth.unlock();
      if (this.hud.modalOpen) return;
      if (e.button === 1) { this.panning = true; this.panLast.set(e.clientX, e.clientY); e.preventDefault(); return; }
      if (e.button === 2 || (e.button === 0 && e.altKey)) {
        if (this.aiming) { this.cancelAim(); this.hud.toast('SHOT CANCELLED'); return; }
        this.orbiting = true; this.orbitMoved = 0; this.panLast.set(e.clientX, e.clientY); return;
      }
      if (e.button !== 0 || !this.sim?.canShoot() || this.mode !== 'playing') return;
      const g = this.groundPoint(this.sim.cue.pos().y);
      if (!g) return;
      this.aiming = true;
      this.angleOffset = 0;
      this.aimPoint.copy(g);
      this.lastGround.copy(g);
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 1) this.panning = false;
      if (e.button === 2 || e.button === 0) { if (this.orbiting) { this.orbiting = false; return; } }
      if (e.button === 0 && this.aiming) this.fire();
    });
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.aiming) {
        const step = (e.shiftKey ? 0.05 : 0.25) * (Math.PI / 180);
        this.angleOffset += Math.sign(e.deltaY || e.deltaX) * step;
      } else if (e.ctrlKey) {
        // touchpad pinch arrives as ctrl+wheel → zoom only
        this.zoomAt(Math.exp(e.deltaY * 0.01));
      } else {
        // Touchpads send small / fractional / horizontal deltas; a mouse wheel sends big integer notches.
        if (e.deltaMode === 0 && (e.deltaX !== 0 || !Number.isInteger(e.deltaY) || Math.abs(e.deltaY) < 40)) this.touchpad = true;
        if (this.touchpad && Math.abs(e.deltaY) < 90) {
          // two-finger swipe: left/right turns around the table, up/down tilts from a level view up to straight overhead
          this.renderer.orbit(-e.deltaX * 0.004, e.deltaY * 0.0035);
        } else if (e.shiftKey) {
          this.renderer.orbit(0, -e.deltaY * 0.002);
        } else {
          this.zoomAt(1 + Math.sign(e.deltaY) * 0.1);
        }
      }
    }, { passive: false });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') e.preventDefault();
      this.synth.unlock();
      this.keys.add(e.code);
      if (e.repeat) return;
      switch (e.code) {
        case 'Escape':
          if (this.aiming) this.cancelAim();
          else if (this.mode === 'menu') { this.mode = 'playing'; this.hud.hideModal(); }
          else if (this.mode === 'playing') this.showMenu();
          break;
        case 'Tab': if (this.mode === 'menu') { this.mode = 'playing'; this.hud.hideModal(); } else if (this.mode === 'playing') this.showMenu(); break;
        case 'KeyR': if (this.mode !== 'menu') this.restart(); break;
        case 'KeyZ': if (this.mode !== 'menu') this.undo(); break;
        case 'KeyF': this.follow = !this.follow; this.hud.toast(`CAMERA FOLLOW ${this.follow ? 'ON' : 'OFF'}`); break;
        case 'KeyM': this.hud.toast(this.synth.toggleMute() ? 'AUDIO MUTED' : 'AUDIO ON'); break;
        case 'KeyQ': if (!this.aiming) this.renderer.orbit(Math.PI / 4, 0); break;
        case 'KeyE': if (!this.aiming) this.renderer.orbit(-Math.PI / 4, 0); break;
        case 'KeyT': this.renderer.orbit(0, 0.17); break;
        case 'KeyG': this.renderer.orbit(0, -0.17); break;
        case 'KeyV': if (this.sim) { this.renderer.frame(this.sim.level.camera); this.follow = true; } break;
        // view presets: 1 = straight down (2D plan), 2 = 45°, 3 = 30°, 4 = 10° (almost level)
        case 'KeyH': this.hud.toast(this.hud.togglePanels() ? 'HUD HIDDEN · H TO SHOW' : 'HUD ON'); break;
        case 'Digit1': this.renderer.setPitch(89.9); this.hud.toast('VIEW · TOP 90°'); break;
        case 'Digit2': this.renderer.setPitch(45); this.hud.toast('VIEW · 45°'); break;
        case 'Digit3': this.renderer.setPitch(30); this.hud.toast('VIEW · 30°'); break;
        case 'Digit4': this.renderer.setPitch(10); this.hud.toast('VIEW · 10°'); break;
        case 'KeyC': if (this.sim) { const c = this.sim.cue.pos(); this.renderer.goalTarget.set(c.x, c.y, c.z); } break;
        case 'KeyX': if (this.aiming) this.spin = { x: 0, y: 0 }; break;
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    const tmid = () => { const p = [...this.touches.values()]; return { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2, d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) }; };
    let last2: { x: number; y: number; d: number } | null = null;
    const fake = (type: string, t: Touch) => window.dispatchEvent(new MouseEvent(type, { clientX: t.clientX, clientY: t.clientY, button: 0, bubbles: true }));
    cv.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (this.touches.size === 1) { const t = e.changedTouches[0]; fake('mousemove', t); cv.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY, button: 0, bubbles: true })); }
      else { if (this.aiming) this.cancelAim(); last2 = tmid(); }
    }, { passive: false });
    cv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of Array.from(e.changedTouches)) this.touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      if (this.touches.size === 1) fake('mousemove', e.changedTouches[0]);
      else if (this.touches.size >= 2 && last2) {
        const m = tmid();
        this.renderer.orbit(-(m.x - last2.x) * 0.006, (m.y - last2.y) * 0.005);
        if (m.d > 0 && last2.d > 0) this.renderer.zoom(last2.d / m.d);
        last2 = m;
      }
    }, { passive: false });
    const tend = (e: TouchEvent) => {
      e.preventDefault();
      if (this.touches.size === 1 && this.aiming) fake('mouseup', e.changedTouches[0]);
      for (const t of Array.from(e.changedTouches)) this.touches.delete(t.identifier);
      if (this.touches.size < 2) last2 = null;
    };
    cv.addEventListener('touchend', tend, { passive: false });
    cv.addEventListener('touchcancel', tend, { passive: false });
    window.addEventListener('blur', () => { this.keys.clear(); this.panning = false; });
  }

  private fire() {
    const sim = this.sim!;
    if (this.aimPower < 0.02) { this.cancelAim(); return; }
    this.undoStack.push(sim.snapshot());
    if (this.undoStack.length > 20) this.undoStack.shift();
    sim.shoot({ angle: this.aimAngle, power: this.aimPower, spin: { ...this.spin } });
    this.aimViz.strike();
    this.synth.shot(this.aimPower);
    this.follow = true;
    this.cancelAim();
  }

  // ───────────────────────────── loop ─────────────────────────────
  private loop(now: number) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.fps += (1 / Math.max(dt, 1e-4) - this.fps) * 0.05;
    const sim = this.sim;
    if (sim) {
      if (this.mode !== 'menu') {
        this.acc += dt;
        let n = 0;
        while (this.acc >= FIXED_DT && n < 24) { sim.step(); this.acc -= FIXED_DT; n++; }
        if (n === 24) this.acc = 0;
        this.handleEvents(sim.events);
        sim.events = [];
      }
      this.updateKeys(dt);
      this.updateAim();
      this.hud.setAiming(this.aiming);
      this.updateCameraFollow();
      this.view!.update(dt, this.time);
      const b = this.traj?.bounces[0];
      this.hud.update(sim, {
        angleDeg: this.aiming ? (this.aimAngle * 180) / Math.PI : null,
        power: this.aimPower,
        bounceIn: this.aiming && b ? b.angleIn : null,
        bounceOut: this.aiming && b ? b.angleOut : null,
        traj: this.aiming ? this.traj : null,
        forecast: AIM_TIERS[this.store.tier].forecast,
        speed: sim.cue.active ? sim.cue.speed() : 0,
        spin: this.spin,
        aiming: this.aiming,
        undo: this.undoCharges,
      }, this.fps);
    }
    this.renderer.animate(dt, this.time);
    this.aimViz.update(dt);
    this.renderer.updateCamera(dt);
    this.renderer.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private updateKeys(dt: number) {
    const k = this.keys;
    const ax = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    const ay = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    if (!ax && !ay) return;
    if (this.aiming) {
      // English / spin control
      this.spin.x = THREE.MathUtils.clamp(this.spin.x + ax * dt * 1.5, -1, 1);
      this.spin.y = THREE.MathUtils.clamp(this.spin.y + ay * dt * 1.5, -1, 1);
      const l = Math.hypot(this.spin.x, this.spin.y);
      if (l > 1) { this.spin.x /= l; this.spin.y /= l; }
    } else if (this.mode === 'playing') {
      const { f, r } = this.renderer.panBasis();
      const sp = this.renderer.dist * 0.9 * dt;
      this.renderer.goalTarget.addScaledVector(r, ax * sp).addScaledVector(f, ay * sp);
      this.follow = false;
    }
  }

  private updateAim() {
    const sim = this.sim!;
    if (!this.aiming || !sim.canShoot()) { if (this.aiming) this.cancelAim(); this.traj = null; return; }
    const c = sim.cue.pos();
    const dx = c.x - this.aimPoint.x, dz = c.z - this.aimPoint.z;
    const len = Math.hypot(dx, dz);
    this.aimAngle = Math.atan2(dz, dx) + this.angleOffset;
    this.aimPower = THREE.MathUtils.clamp((len - 0.25) / 4.5, 0, 1);
    this.traj = this.ray!.predict(sim.cue, this.aimAngle, this.aimPower, this.spin);
    const tier = AIM_TIERS[this.store.tier];
    // finite-length sights show a fixed, power-independent guide: the straight line + rail reflections up to tier.guide
    const guide = Number.isFinite(tier.guide) ? this.ray!.predict(sim.cue, this.aimAngle, 1, { x: 0, y: 0 }) : this.traj;
    this.aimViz.show(guide, new THREE.Vector3(c.x, c.y, c.z), this.aimAngle, this.aimPower, this.time, this.spin, tier);
  }

  /**
   * Zoom toward whatever is under the cursor. Near the cue ball (or zooming out) the camera keeps
   * following the cue ball; zooming in on another part of the table switches to free look there.
   */
  private zoomAt(factor: number) {
    const R = this.renderer, sim = this.sim;
    const before = R.goalDist;
    R.zoom(factor);
    const k = 1 - R.goalDist / before; // >0 when zooming in
    if (!sim) return;
    if (R.goalDist >= R.homeDist * 0.97) { this.follow = true; return; }
    const c = sim.cue.pos();
    const g = this.groundPoint(c.y);
    if (!g || k <= 0) return;
    const cue = new THREE.Vector3(c.x, c.y, c.z);
    if (g.distanceTo(cue) < 2.5) { this.follow = true; return; }
    this.follow = false;
    R.goalTarget.lerp(g, k);
  }

  /**
   * Camera centre = the cue ball. At the level's start zoom the whole table stays framed; the further
   * you zoom in, the more the centre slides onto the cue ball, so it never drops out of view.
   */
  private updateCameraFollow() {
    const sim = this.sim!, R = this.renderer;
    if (!this.follow || !sim.cue.active) return;
    const p = sim.cue.pos();
    const t = THREE.MathUtils.clamp((R.homeDist - R.goalDist) / (R.homeDist * 0.3), 0, 1);
    const goal = R.homeTarget.clone().lerp(new THREE.Vector3(p.x, 0, p.z), t);
    goal.y = THREE.MathUtils.lerp(0, p.y, t);
    R.goalTarget.lerp(goal, 0.12);
  }

  private handleEvents(events: SimEvent[]) {
    const s = this.synth, h = this.hud, sim = this.sim!;
    for (const e of events) {
      this.view?.onEvent(e);
      switch (e.type) {
        case 'clack': s.clack(e.speed); break;
        case 'cushion': if (e.speed > 0.5) s.cushion(e.speed); break;
        case 'chute': h.toast(e.outcome === 'exit' ? 'WATER SLIDE' : e.outcome === 'back' ? 'TOO SLOW — ROLLING BACK' : 'TOO FAST — OVER THE LIP!'); break;
        case 'snap': h.toast('ROPE SNAPPED'); break;
        case 'portal': s.portal(); h.toast('QUANTUM TRANSIT'); this.renderer.goalTarget.set(e.pos.x, e.pos.y, e.pos.z); break;
        case 'switch': s.switchOn(e.on); if (e.on) h.toast(`SWITCH ${e.id.toUpperCase()} ENGAGED`, 'good'); break;
        case 'barrier': {
          const b = sim.barriers.find((x) => x.def.id === e.id)!;
          s.gate(e.triggered);
          h.toast(`${b.def.label ?? e.id.toUpperCase()} ${e.triggered ? (e.kind === 'gate' ? 'OPEN' : 'EXTENDED') : (e.kind === 'gate' ? 'SEALED' : 'RETRACTED')}`, e.triggered ? 'good' : 'bad');
          break;
        }
        case 'hoop': s.hoop(e.order, e.complete); h.toast(e.complete ? 'HOOP SEQUENCE COMPLETE' : `HOOP ${e.order} CLEARED`, 'good'); break;
        case 'pocket': s.pocket(); h.toast(e.pocket === 'fin' ? 'FINISH REACHED' : 'SPHERE POCKETED', 'good'); break;
        case 'reject': s.reject(); h.toast('WRONG CHAMBER — REJECTED', 'bad'); break;
        case 'deny': s.deny(); break;
        case 'bumper': s.bumper(e.speed); break;
        case 'foul': s.deny(); h.toast(`FOUL · ${e.num}-BALL BEFORE ${e.need} · +1, RESPOTTED`, 'bad', 2600); break;
        case 'jump': s.shot(0.6); s.cushion(4); break;
        case 'codeReset': s.reject(); h.toast('WRONG KEY ORDER · CODE RESET', 'bad'); break;
        case 'rattle': s.clack(10); s.cushion(6); h.toast('RATTLED IN THE JAWS', 'bad'); break;
        case 'crack': s.crack(); h.toast(`PANEL CRACKED · ${e.hp} HIT LEFT`); break;
        case 'break': s.shatter(e.kind === 'glass'); h.toast(e.kind === 'glass' ? 'GLASS SHATTERED' : 'CONCRETE BREACHED', 'good'); break;
        case 'sink': s.splash(); break;
        case 'hole': s.drop(); break;
        case 'scratch': s.scratch(); h.toast(e.reason === 'fall' ? 'CUE LOST · +1' : e.reason === 'sink' ? 'CUE SANK · +1' : 'SCRATCH · +1', 'bad', 2000); break;
        case 'lost': if (!e.required) h.toast('SPHERE LOST', 'bad'); break;
        case 'won': s.win(); setTimeout(() => this.showResult(true), 1100); break;
        case 'failed': s.fail(); setTimeout(() => this.showResult(false, e.reason), 700); break;
      }
    }
  }

  /** Debug / automation hooks (used for automated verification in the browser). */
  debug() {
    return {
      sim: () => this.sim,
      load: (i: number) => this.loadLevel(i, true, true),
      shoot: (deg: number, power: number) => this.sim?.shoot({ angle: (deg * Math.PI) / 180, power, spin: { x: 0, y: 0.5 } }),
    };
  }
}
