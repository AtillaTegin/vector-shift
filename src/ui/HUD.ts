import type { Simulation } from '../physics/Simulation';
import type { LevelDef } from '../levels/LevelTypes';
import type { Trajectory } from '../physics/VectorRaycaster';
import { DIFFICULTY_LABELS } from '../levels/levels';
import { shotSpeed } from '../physics/PhysicsMaterials';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export interface Telemetry {
  angleDeg: number | null;
  power: number;
  bounceIn: number | null;
  bounceOut: number | null;
  traj: Trajectory | null;
  forecast: 'none' | 'basic' | 'full';
  speed: number;
  spin: { x: number; y: number };
  aiming: boolean;
  undo: number;
}

/** Minimal technical HUD: header, telemetry, objective checklist, controls, modals and toasts. */
export class HUD {
  readonly root = el('div', 'hud');
  private top = el('div', 'panel top');
  private tele = el('div', 'panel telemetry');
  private objs = el('div', 'panel objectives');
  private ctrl = el('div', 'panel controls');
  private toastEl = el('div', 'toast');
  private fps = el('div', 'fps');
  private views = el('div', 'viewbar');
  private teleBody = el('div');
  private objsBody = el('div');
  /** Called when a view-preset button is pressed (pitch in degrees). */
  onView: (deg: number) => void = () => {};
  readonly modal = el('div', 'modal hidden');
  private toastTimer = 0;
  private spinDot!: HTMLElement;
  private powerBar!: HTMLElement;
  private ctrlInfo!: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root.append(this.top, this.tele, this.objs, this.ctrl, this.toastEl, this.fps, this.views);
    this.tele.append(el('h4', '', 'VECTOR TELEMETRY'), this.teleBody);
    this.objs.append(el('h4', '', 'OBJECTIVES'), this.objsBody);
    // collapsible panels (click the title) — state remembered per panel
    const panels: [HTMLElement, string, boolean][] = [[this.tele, 'tele', true], [this.objs, 'objs', false], [this.ctrl, 'ctrl', true]];
    for (const [p, key, def] of panels) {
      let collapsed = def;
      try { const v = localStorage.getItem('vs-hud-' + key); if (v !== null) collapsed = v === '1'; } catch { /* no storage */ }
      p.classList.toggle('collapsed', collapsed);
      p.addEventListener('click', (e) => {
        if (!(e.target as HTMLElement).closest('h4')) return;
        const c = p.classList.toggle('collapsed');
        try { localStorage.setItem('vs-hud-' + key, c ? '1' : '0'); } catch { /* ignore */ }
      });
    }
    this.views.innerHTML = '<span>VIEW</span>' + [[89.9, 'TOP'], [45, '45°'], [30, '30°'], [10, '10°']].map(([d, l]) => `<button data-pitch="${d}">${l}</button>`).join('');
    this.views.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) this.onView(Number(b.dataset.pitch)); });
    this.ctrl.innerHTML = `
      <h4>CUE CONTROL <span class="tog">KEYS ▾</span></h4>
      <div class="spin"><div class="ball"><div class="dot"></div></div><div class="ci" style="flex:1"></div></div>
      <div class="power"><i></i></div>
      <div class="keys" style="margin-top:8px">
        <kbd>LMB</kbd> drag back &amp; release to shoot · <kbd>Shift</kbd> fine aim · <kbd>Wheel</kbd> nudge angle<br>
        <kbd>W A S D</kbd> cue-tip offset (spin) · <kbd>Esc</kbd> cancel<br>
        <kbd>RMB</kbd>/<kbd>Alt+LMB</kbd> drag orbit · touchpad <kbd>2 fingers</kbd> ↔ turn ↕ tilt · <kbd>pinch</kbd> zoom<br>
        <kbd>1</kbd>–<kbd>4</kbd> view 90°/45°/30°/10° · <kbd>Q</kbd>/<kbd>E</kbd> turn · <kbd>T</kbd>/<kbd>G</kbd> tilt · <kbd>V</kbd> reset · <kbd>H</kbd> hide HUD · <kbd>MMB</kbd>/<kbd>WASD</kbd> pan · <kbd>F</kbd> follow<br>
        <kbd>R</kbd> restart · <kbd>Z</kbd> undo · <kbd>M</kbd> mute · <kbd>Tab</kbd> menu
      </div>`;
    this.spinDot = this.ctrl.querySelector('.dot')!;
    this.powerBar = this.ctrl.querySelector('.power i')!;
    this.ctrlInfo = this.ctrl.querySelector('.ci')!;
    parent.append(this.root, this.modal);
  }

  setLevel(level: LevelDef, index: number) {
    this.top.dataset.idx = String(index);
    void level;
  }

  update(sim: Simulation, t: Telemetry, fps: number) {
    const L = sim.level;
    const over = sim.strokes > L.par;
    this.top.innerHTML = `<div class="sector">WORLD ${L.world} · ${L.sector} · <span class="diff d${L.difficulty}">${DIFFICULTY_LABELS[L.difficulty]}</span></div><div class="name">${L.name}</div>
      <div class="score">STROKES: <b class="${over ? 'over' : ''}">${sim.strokes}</b> / ${L.challenge ? `<span style="color:#ff8a6b">MAX: <b>${L.challenge.maxStrokes}</b></span>` : `PAR: <b>${L.par}</b>`}</div>`;

    const status: string[] = [];
    for (const b of sim.barriers) status.push(b.def.spin ? row(b.def.label ?? 'TURBINE', 'SPINNING', true) : row(b.def.label ?? b.def.id.toUpperCase(), b.triggered ? (b.def.kind === 'gate' ? 'OPEN' : 'EXTENDED') : (b.def.kind === 'gate' ? 'LOCKED' : 'RETRACTED'), b.triggered));
    for (const p of sim.pockets) if (p.def.requires?.length || p.def.color !== 'finish') {
      const armed = sim.requiresMet(p.def.requires);
      const sunk = sim.sig(`sunk:${p.def.id}`);
      status.push(row(`${p.def.color.toUpperCase()} POCKET`, sunk ? 'SUNK' : armed ? 'ARMED' : 'SHIELDED', armed));
    }
    for (const s of sim.switches) status.push(row(`${s.def.type.toUpperCase()} SW ${s.def.id.toUpperCase()}`, s.active ? 'ACTIVE' : 'IDLE', s.active));
    const angleTxt = t.bounceIn != null ? `${t.bounceIn.toFixed(1)}° → ${t.bounceOut!.toFixed(1)}°` : '—';
    const fc = forecast(t.traj, t.power, t.forecast);
    this.teleBody.innerHTML = `
      <div class="row"><span class="k">θ_IN → θ_OUT</span><span class="eq">${angleTxt}</span></div>
      <div class="row"><span class="k">HEADING</span><span>${t.angleDeg != null ? normDeg(t.angleDeg).toFixed(2) + '°' : '—'}</span></div>
      <div class="row"><span class="k">IMPULSE</span><span>${(t.power * 100).toFixed(1)}%</span></div>
      <div class="row"><span class="k">|v| CUE</span><span>${t.speed.toFixed(2)} m/s</span></div>
      <div class="row"><span class="k">UNDO CHARGES</span><span>${'◆'.repeat(t.undo)}${'◇'.repeat(Math.max(0, 3 - t.undo))}</span></div>
      ${fc}
      <h4 style="margin-top:8px">CHAIN STATUS</h4>${status.join('') || '<div class="row"><span class="k">no mechanisms</span></div>'}`;

    this.objsBody.innerHTML = L.objectives.map((o) => {
      const d = sim.sig(o.signal);
      return `<div class="o ${d ? 'done' : ''}"><span class="box">[${d ? '✓' : ' '}]</span>${o.label}</div>`;
    }).join('');

    this.spinDot.style.left = `${50 + t.spin.x * 40}%`;
    this.spinDot.style.top = `${50 - t.spin.y * 40}%`;
    this.powerBar.style.width = `${t.power * 100}%`;
    const sl = t.spin.y > 0.9 ? 'FOLLOW' : t.spin.y > 0.55 ? 'NATURAL ROLL' : t.spin.y > 0.15 ? 'HIGH' : t.spin.y < -0.55 ? 'DEEP DRAW' : t.spin.y < -0.15 ? 'DRAW' : 'CENTRE (STUN)';
    const sx = t.spin.x > 0.15 ? ' + RIGHT' : t.spin.x < -0.15 ? ' + LEFT' : '';
    this.ctrlInfo.innerHTML = `<div class="keys">SPIN: <b style="color:#fff">${sl}${sx}</b><br>${sim.state === 'rolling' ? 'SIMULATING…' : t.aiming ? 'AIMING' : 'READY'}</div>`;
    this.fps.textContent = `${fps.toFixed(0)} FPS`;
  }

  /** Fade side panels while aiming; H toggles them off entirely. */
  setAiming(a: boolean) { this.root.classList.toggle('aiming', a); }
  togglePanels() { return this.root.classList.toggle('bare'); }

  toast(msg: string, kind: '' | 'bad' | 'good' = '', ms = 1600) {
    this.toastEl.textContent = msg;
    this.toastEl.className = `toast show ${kind}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toastEl.className = 'toast'), ms);
  }

  showModal(html: string, bind: Record<string, () => void>) {
    this.modal.innerHTML = `<div class="card">${html}</div>`;
    this.modal.classList.remove('hidden');
    for (const [sel, fn] of Object.entries(bind)) this.modal.querySelectorAll<HTMLElement>(`[data-act="${sel}"]`).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fn(); }));
  }
  bindAll(attr: string, fn: (v: string) => void) {
    this.modal.querySelectorAll<HTMLElement>(`[${attr}]`).forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); fn(b.getAttribute(attr)!); }));
  }
  hideModal() { this.modal.classList.add('hidden'); }
  get modalOpen() { return !this.modal.classList.contains('hidden'); }
}

const row = (k: string, v: string, on: boolean) => `<div class="row"><span class="k">${k}</span><span class="${on ? 'st-on' : 'st-off'}">${v}</span></div>`;
const normDeg = (d: number) => ((d % 360) + 360) % 360;

/** Physics forecast for the current aim: launch speed, hazards on the path and predicted outcome. */
function forecast(t: Trajectory | null, power: number, mode: 'none' | 'basic' | 'full') {
  if (!t || mode === 'none') return '';
  if (mode === 'basic') return `<h4 style="margin-top:8px">SHOT FORECAST</h4>${row('LAUNCH', `${(shotSpeed(power) / 10).toFixed(2)} m/s`, true)}${t.ghost ? row('CONTACT', `${t.ghost.speed.toFixed(1)} u/s`, true) : ''}`;
  const rows: string[] = [];
  rows.push(row('LAUNCH', `${(shotSpeed(power) / 10).toFixed(2)} m/s`, true));
  for (const n of t.notes.slice(0, 5)) {
    const label = n.kind === 'jump' ? 'JUMP' : n.kind === 'water' ? 'WATER ENTRY' : n.kind === 'hole' || n.kind === 'holeClear' ? 'HOLE v / NEED' : n.kind === 'sink' ? 'WATER' : 'PANEL';
    rows.push(row(label, n.text, n.ok));
  }
  if (t.ghost) rows.push(row('CONTACT', `${t.ghost.speed.toFixed(1)} m/s`, true));
  const outcome = t.fall ? ({ fall: 'FALLS OFF EDGE', hole: 'DROPS IN HOLE', sink: 'SINKS' } as const)[t.fall.kind] : t.ghost ? 'HITS SPHERE' : 'RESTS';
  rows.push(row('OUTCOME', outcome, !t.fall));
  return `<h4 style="margin-top:8px">SHOT FORECAST</h4>${rows.join('')}`;
}
