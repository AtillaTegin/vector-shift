import * as THREE from 'three';

/**
 * Procedural PBR texture generator (canvas based): felt, brushed steel, engraved tungsten,
 * hazard stripes and portal swirl — with derived normal maps. No external image assets.
 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function canvas(size: number) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, g: c.getContext('2d')! };
}

/** Sobel-ish normal map from a grayscale height canvas. */
function normalFromHeight(src: HTMLCanvasElement, strength: number) {
  const n = src.width;
  const sd = src.getContext('2d')!.getImageData(0, 0, n, n).data;
  const { c, g } = canvas(n);
  const out = g.createImageData(n, n);
  const h = (x: number, y: number) => sd[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * strength;
    const dy = (h(x, y + 1) - h(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * n + x) * 4;
    out.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
    out.data[i + 1] = ((-dy / l) * 0.5 + 0.5) * 255;
    out.data[i + 2] = (1 / l) * 255;
    out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  return c;
}

function tex(c: HTMLCanvasElement, repeat: number, srgb: boolean) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export interface PBRSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }

export function feltTextures(base: string, seed = 1): PBRSet {
  const n = 256, r = rng(seed);
  const { c: hc, g: hg } = canvas(n);
  const img = hg.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    const v = 110 + r() * 90;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  hg.putImageData(img, 0, 0);
  hg.globalAlpha = 0.5; hg.filter = 'blur(1px)'; hg.drawImage(hc, 0, 0); hg.filter = 'none'; hg.globalAlpha = 1;
  const { c: cc, g: cg } = canvas(n);
  cg.fillStyle = base; cg.fillRect(0, 0, n, n);
  cg.globalCompositeOperation = 'overlay'; cg.globalAlpha = 0.25; cg.drawImage(hc, 0, 0);
  cg.globalCompositeOperation = 'source-over'; cg.globalAlpha = 1;
  const { c: rc, g: rgx } = canvas(n);
  rgx.fillStyle = '#e6e6e6'; rgx.fillRect(0, 0, n, n);
  rgx.globalAlpha = 0.2; rgx.drawImage(hc, 0, 0);
  return { map: tex(cc, 3, true), normalMap: tex(normalFromHeight(hc, 1.6), 3, false), roughnessMap: tex(rc, 3, false) };
}

export function brushedSteel(base = '#3A404A', seed = 7): PBRSet {
  const n = 256, r = rng(seed);
  const { c: hc, g: hg } = canvas(n);
  hg.fillStyle = '#808080'; hg.fillRect(0, 0, n, n);
  for (let i = 0; i < 1400; i++) {
    const y = r() * n, v = Math.floor(90 + r() * 80);
    hg.strokeStyle = `rgba(${v},${v},${v},${0.15 + r() * 0.3})`;
    hg.lineWidth = r() * 1.2 + 0.2;
    hg.beginPath(); const x = r() * n; hg.moveTo(x - 80 - r() * 120, y); hg.lineTo(x + 80 + r() * 120, y + (r() - 0.5) * 1.5); hg.stroke();
  }
  // panel seams + rivets
  hg.strokeStyle = 'rgba(30,30,30,0.9)'; hg.lineWidth = 2;
  hg.strokeRect(1, 1, n - 2, n - 2);
  hg.fillStyle = 'rgba(200,200,200,0.9)';
  for (const [x, y] of [[10, 10], [n - 10, 10], [10, n - 10], [n - 10, n - 10]]) { hg.beginPath(); hg.arc(x, y, 3, 0, Math.PI * 2); hg.fill(); }
  const { c: cc, g: cg } = canvas(n);
  cg.fillStyle = base; cg.fillRect(0, 0, n, n);
  cg.globalCompositeOperation = 'overlay'; cg.globalAlpha = 0.55; cg.drawImage(hc, 0, 0);
  const { c: rc, g: rgx } = canvas(n);
  rgx.fillStyle = '#6a6a6a'; rgx.fillRect(0, 0, n, n); rgx.globalAlpha = 0.5; rgx.drawImage(hc, 0, 0);
  return { map: tex(cc, 1, true), normalMap: tex(normalFromHeight(hc, 2.5), 1, false), roughnessMap: tex(rc, 1, false) };
}

/** Engraved geometric pattern for the heavy tungsten sphere. */
export function tungstenTextures(): PBRSet {
  const n = 256;
  const { c: hc, g } = canvas(n);
  g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, n, n);
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 3;
  for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo((i * n) / 8, 0); g.lineTo((i * n) / 8, n); g.stroke(); }
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, (i * n) / 4); g.lineTo(n, (i * n) / 4); g.stroke(); }
  g.lineWidth = 2;
  for (let i = 0; i < 8; i++) { g.beginPath(); g.moveTo((i * n) / 8, 0); g.lineTo(((i + 1) * n) / 8, n / 4); g.stroke(); }
  const { c: cc, g: cg } = canvas(n);
  cg.fillStyle = '#2b2e33'; cg.fillRect(0, 0, n, n); cg.globalCompositeOperation = 'multiply'; cg.drawImage(hc, 0, 0);
  const { c: rc, g: rgx } = canvas(n);
  rgx.fillStyle = '#5a5a5a'; rgx.fillRect(0, 0, n, n); rgx.globalCompositeOperation = 'lighter'; rgx.globalAlpha = 0.3; rgx.drawImage(hc, 0, 0);
  const m = tex(cc, 1, true), nm = tex(normalFromHeight(hc, 4), 1, false), rm = tex(rc, 1, false);
  for (const t of [m, nm, rm]) t.repeat.set(1, 1);
  return { map: m, normalMap: nm, roughnessMap: rm };
}

export function hazardStripes(color = '#FF2E4C'): THREE.Texture {
  const n = 128;
  const { c, g } = canvas(n);
  g.fillStyle = '#1a0a0e'; g.fillRect(0, 0, n, n);
  g.fillStyle = color;
  for (let i = -n; i < n * 2; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 16, 0); g.lineTo(i + 16 - n, n); g.lineTo(i - n, n); g.fill(); }
  const t = tex(c, 1, true);
  return t;
}

export function portalSwirl(): THREE.Texture {
  const n = 256;
  const { c, g } = canvas(n);
  const grd = g.createRadialGradient(n / 2, n / 2, 4, n / 2, n / 2, n / 2);
  grd.addColorStop(0, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.35, 'rgba(0,240,255,0.7)');
  grd.addColorStop(1, 'rgba(0,40,60,0)');
  g.fillStyle = grd; g.fillRect(0, 0, n, n);
  g.strokeStyle = 'rgba(200,255,255,0.5)'; g.lineWidth = 3;
  for (let a = 0; a < 6; a++) {
    g.beginPath();
    for (let t = 0; t < 1; t += 0.02) {
      const ang = a * (Math.PI / 3) + t * 4, rr = t * n * 0.48;
      const x = n / 2 + Math.cos(ang) * rr, y = n / 2 + Math.sin(ang) * rr;
      t === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft radial glow sprite. */
export function glowSprite(): THREE.Texture {
  const n = 128;
  const { c, g } = canvas(n);
  const grd = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.3, 'rgba(255,255,255,0.35)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, n, n);
  return new THREE.CanvasTexture(c);
}

/** Poured concrete: speckle, pores and hairline cracks. */
export function concreteTextures(base = '#5d646c', seed = 21): PBRSet {
  const n = 256, r = rng(seed);
  const { c: hc, g } = canvas(n);
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 9000; i++) { const v = 90 + r() * 90; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r() * n, r() * n, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(40,40,40,0.8)'; g.beginPath(); g.arc(r() * n, r() * n, r() * 2 + 0.5, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = 'rgba(50,50,50,0.6)'; g.lineWidth = 1;
  for (let i = 0; i < 5; i++) { g.beginPath(); let x = r() * n, y = r() * n; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 30; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(30,30,30,0.9)'; g.lineWidth = 2; g.strokeRect(0, 0, n, n);
  const { c: cc, g: cg } = canvas(n);
  cg.fillStyle = base; cg.fillRect(0, 0, n, n); cg.globalCompositeOperation = 'overlay'; cg.globalAlpha = 0.6; cg.drawImage(hc, 0, 0);
  const { c: rc, g: rg } = canvas(n);
  rg.fillStyle = '#d0d0d0'; rg.fillRect(0, 0, n, n); rg.globalAlpha = 0.3; rg.drawImage(hc, 0, 0);
  return { map: tex(cc, 1, true), normalMap: tex(normalFromHeight(hc, 2), 1, false), roughnessMap: tex(rc, 1, false) };
}

/** Glazed industrial tiles with grout lines. */
export function tileTextures(base = '#2a5866', seed = 33): PBRSet {
  const n = 256, r = rng(seed), cells = 4, s = n / cells;
  const { c: hc, g } = canvas(n);
  g.fillStyle = '#202020'; g.fillRect(0, 0, n, n);
  const { c: cc, g: cg } = canvas(n);
  cg.fillStyle = '#16262c'; cg.fillRect(0, 0, n, n);
  const col = { h: base };
  for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
    const v = 180 + r() * 40;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    cg.fillStyle = col.h; cg.globalAlpha = 0.82 + r() * 0.18; cg.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
    cg.globalAlpha = 0.12; cg.fillStyle = '#ffffff'; cg.fillRect(x * s + 5, y * s + 5, s - 10, 4); cg.globalAlpha = 1;
  }
  const { c: rc, g: rg } = canvas(n);
  rg.fillStyle = '#3a3a3a'; rg.fillRect(0, 0, n, n); rg.globalCompositeOperation = 'difference'; rg.globalAlpha = 0.6; rg.drawImage(hc, 0, 0);
  return { map: tex(cc, 1, true), normalMap: tex(normalFromHeight(hc, 3), 1, false), roughnessMap: tex(rc, 1, false) };
}

/** Tileable rippled-water normal map. */
export function waterNormal(seed = 5): THREE.Texture {
  const n = 256, r = rng(seed);
  const { c, g } = canvas(n);
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 140; i++) {
    const x = r() * n, y = r() * n, rad = 8 + r() * 40;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const v = r() < 0.5 ? 255 : 0;
    grd.addColorStop(0, `rgba(${v},${v},${v},0.25)`); grd.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = grd;
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) { g.save(); g.translate(ox, oy); g.fillRect(x - rad, y - rad, rad * 2, rad * 2); g.restore(); }
  }
  return tex(normalFromHeight(c, 3), 1, false);
}

/** Chevron flow arrows (alpha) for rivers; scrolled along the flow at runtime. */
export function flowArrows(): THREE.Texture {
  const n = 128;
  const { c, g } = canvas(n);
  g.clearRect(0, 0, n, n);
  g.strokeStyle = 'rgba(190,250,255,0.55)'; g.lineWidth = 7; g.lineCap = 'round';
  for (const y of [32, 96]) { g.beginPath(); g.moveTo(40, y - 18); g.lineTo(78, y); g.lineTo(40, y + 18); g.stroke(); }
  const t = tex(c, 1, true);
  return t;
}

/** Crack overlay (alpha) for damaged concrete / glass. */
export function crackTexture(seed = 77): THREE.Texture {
  const n = 256, r = rng(seed);
  const { c, g } = canvas(n);
  g.clearRect(0, 0, n, n);
  g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    g.beginPath(); let x = n / 2, y = n / 2; g.moveTo(x, y);
    const a = (i / 9) * Math.PI * 2 + r() * 0.4;
    for (let k = 0; k < 7; k++) { x += Math.cos(a + (r() - 0.5) * 0.9) * 22; y += Math.sin(a + (r() - 0.5) * 0.9) * 22; g.lineTo(x, y); }
    g.stroke();
  }
  return tex(c, 1, true);
}

/** Vertical falling-water streaks for waterfalls. */
export function waterfallTexture(): THREE.Texture {
  const n = 128, r = rng(91);
  const { c, g } = canvas(n);
  const grd = g.createLinearGradient(0, 0, n, 0);
  grd.addColorStop(0, 'rgba(120,220,255,0)'); grd.addColorStop(0.15, 'rgba(120,220,255,0.55)');
  grd.addColorStop(0.85, 'rgba(120,220,255,0.55)'); grd.addColorStop(1, 'rgba(120,220,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(235,252,255,${0.2 + r() * 0.5})`; g.fillRect(r() * n, r() * n, 1 + r() * 2, 10 + r() * 40); }
  const t = tex(c, 1, true);
  t.wrapS = THREE.ClampToEdgeWrapping;
  return t;
}

/** Polished mahogany / rosewood rail wood. */
export function woodTexture(base = '#6b2a14'): THREE.Texture {
  const n = 512, r = rng(base.length * 97);
  const { c, g } = canvas(n);
  g.fillStyle = base; g.fillRect(0, 0, n, n);
  for (let i = 0; i < 160; i++) {
    const y = r() * n, a = 0.05 + r() * 0.18;
    g.strokeStyle = r() < 0.5 ? `rgba(30,8,2,${a})` : `rgba(190,95,50,${a * 0.6})`;
    g.lineWidth = 0.5 + r() * 2.5;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= n; x += 32) g.lineTo(x, y + Math.sin(x * 0.01 + i) * 4 + (r() - 0.5) * 2);
    g.stroke();
  }
  const t = tex(c, 1, true);
  return t;
}
