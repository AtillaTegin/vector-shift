/**
 * Procedural WebAudio synthesizer — every SFX is generated at runtime (zero audio assets).
 */
export class Synth {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private hum: OscillatorNode | null = null;
  muted = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.ambient();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(type: OscillatorType, f0: number, f1: number, peak: number, dur: number, delay = 0, attack = 0.004) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    this.env(g, t, peak, attack, dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }

  private noise(filter: BiquadFilterType, freq: number, q: number, peak: number, dur: number, delay = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = filter; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain();
    this.env(g, t, peak, 0.002, dur);
    s.connect(f).connect(g).connect(this.master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  /** Phenolic ball-on-ball clack, pitched & levelled by impact velocity. */
  clack(speed: number) {
    const v = Math.min(1, speed / 9);
    const f = 1900 + v * 1500 + Math.random() * 200;
    this.tone('sine', f, f * 0.92, 0.15 + v * 0.55, 0.06);
    this.tone('triangle', f * 2.4, f * 2.1, 0.05 + v * 0.15, 0.03);
    this.noise('highpass', 3500, 0.7, 0.08 + v * 0.3, 0.025);
  }
  cushion(speed: number) {
    const v = Math.min(1, speed / 9);
    this.tone('sine', 140 + v * 60, 70, 0.15 + v * 0.45, 0.14);
    this.noise('lowpass', 600, 1, 0.05 + v * 0.2, 0.08);
  }
  pocket() {
    this.tone('sine', 220, 60, 0.6, 0.3);
    [0, 0.07, 0.13, 0.18].forEach((d, i) => this.tone('triangle', 900 - i * 120, 700 - i * 100, 0.12, 0.05, 0.08 + d));
    this.tone('sine', 660, 990, 0.18, 0.4, 0.25);
  }
  reject() { this.tone('sawtooth', 160, 90, 0.25, 0.25); this.tone('square', 110, 70, 0.12, 0.3, 0.05); }
  deny() { this.tone('square', 180, 160, 0.08, 0.12); }
  scratch() { this.tone('sawtooth', 300, 60, 0.3, 0.6); this.noise('bandpass', 400, 2, 0.15, 0.4); }
  portal() {
    this.tone('sine', 180, 1400, 0.35, 0.35, 0, 0.02);
    this.tone('sine', 1400, 220, 0.25, 0.35, 0.3, 0.02);
    this.noise('bandpass', 2000, 4, 0.2, 0.5);
  }
  switchOn(on: boolean) {
    this.noise('highpass', 2500, 1, 0.25, 0.02);
    this.tone('square', on ? 520 : 390, on ? 780 : 260, 0.12, 0.12, 0.03);
  }
  hoop(order: number, complete: boolean) {
    const f = 880 * Math.pow(1.26, order - 1);
    this.tone('sine', f, f, 0.25, 0.5);
    this.tone('sine', f * 1.5, f * 1.5, 0.1, 0.6, 0.02);
    if (complete) [0, 0.1, 0.2].forEach((d, i) => this.tone('sine', f * [1.25, 1.5, 2][i], f * [1.25, 1.5, 2][i], 0.2, 0.5, 0.15 + d));
  }
  gate(opening: boolean) {
    for (let i = 0; i < 5; i++) this.noise('bandpass', 900 + i * 80, 6, 0.12, 0.04, i * 0.06);
    this.tone('sawtooth', opening ? 70 : 110, opening ? 45 : 70, 0.25, 0.5);
    this.tone('square', opening ? 440 : 330, opening ? 660 : 220, 0.08, 0.15, 0.32);
  }
  bumper(speed: number) {
    const v = Math.min(1, speed / 12);
    this.tone('square', 220, 880, 0.18 + v * 0.2, 0.12);
    this.tone('sine', 1320, 660, 0.15, 0.2, 0.02);
  }
  crack() { this.noise('bandpass', 700, 2, 0.5, 0.12); this.tone('sine', 90, 50, 0.4, 0.2); }
  shatter(glass: boolean) {
    if (glass) { for (let i = 0; i < 14; i++) this.tone('triangle', 2500 + Math.random() * 3500, 2000 + Math.random() * 2000, 0.08, 0.15 + Math.random() * 0.3, i * 0.012); this.noise('highpass', 3000, 0.8, 0.5, 0.35); }
    else { this.noise('lowpass', 900, 1, 0.8, 0.5); this.tone('sine', 70, 35, 0.6, 0.5); for (let i = 0; i < 6; i++) this.noise('bandpass', 500 + i * 120, 4, 0.2, 0.06, 0.1 + i * 0.07); }
  }
  splash() { this.noise('lowpass', 1200, 0.8, 0.5, 0.4); this.tone('sine', 600, 120, 0.25, 0.3); for (let i = 0; i < 4; i++) this.tone('sine', 900 + Math.random() * 900, 400, 0.08, 0.1, 0.15 + i * 0.08); }
  drop() { this.tone('sine', 400, 40, 0.35, 0.9); this.noise('bandpass', 300, 3, 0.15, 0.6); }
  shot(power: number) { this.noise('bandpass', 1800, 1.2, 0.2 + power * 0.5, 0.04); this.tone('sine', 900, 500, 0.15 + power * 0.2, 0.05); }
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.5, i * 0.09)); }
  fail() { [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.12, 0.35, i * 0.14)); }
  ui() { this.tone('sine', 1200, 1500, 0.06, 0.04); }

  /** Low industrial drone. */
  private ambient() {
    if (!this.ctx || this.hum) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 48;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    const g = ctx.createGain(); g.gain.value = 0.035;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lg = ctx.createGain(); lg.gain.value = 60;
    lfo.connect(lg).connect(f.frequency);
    o.connect(f).connect(g).connect(this.master);
    o.start(); lfo.start();
    this.hum = o;
  }
}
