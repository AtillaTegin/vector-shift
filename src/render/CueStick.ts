import * as THREE from 'three';

/** Wood grain / inlay textures for the cue (procedural canvas). */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

const maple = () => canvasTex(256, 64, (g) => {
  g.fillStyle = '#ead6a8'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 90; i++) { g.strokeStyle = `rgba(150,105,55,${0.05 + Math.random() * 0.12})`; g.lineWidth = Math.random() * 1.5; const y = Math.random() * 64; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + Math.random() * 6 - 3, 170, y + Math.random() * 6 - 3, 256, y); g.stroke(); }
});

/** Ebony forearm with four maple "points" and pearl diamonds — the classic cue butt inlay. */
const forearm = () => canvasTex(512, 128, (g) => {
  g.fillStyle = '#1b0f0a'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(90,45,20,${Math.random() * 0.4})`; g.beginPath(); const y = Math.random() * 128; g.moveTo(0, y); g.lineTo(512, y + Math.random() * 4); g.stroke(); }
  for (let k = 0; k < 4; k++) {
    const y = k * 32 + 16;
    g.fillStyle = '#d9c08a'; g.beginPath(); g.moveTo(512, y - 14); g.lineTo(150, y); g.lineTo(512, y + 14); g.fill();
    g.fillStyle = '#7a1f16'; g.beginPath(); g.moveTo(512, y - 9); g.lineTo(200, y); g.lineTo(512, y + 9); g.fill();
    g.fillStyle = '#efe9dc'; g.beginPath(); g.moveTo(330, y - 4); g.lineTo(316, y); g.lineTo(330, y + 4); g.lineTo(344, y); g.fill();
  }
});

const linen = () => canvasTex(128, 128, (g) => {
  g.fillStyle = '#101214'; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 3) { g.fillStyle = `rgba(80,90,100,${0.25 + Math.random() * 0.2})`; g.fillRect(0, y, 128, 1); }
  for (let x = 0; x < 128; x += 4) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 1, 128); }
});

interface Seg { len: number; r0: number; r1: number; mat: THREE.Material }

/**
 * A full 58" two-piece cue built from lathe sections along +X (tip at x = 0, butt toward −X).
 * Proportions follow a real cue, scaled to the world (ball r = 0.28): 13 mm tip, 14.5 mm shaft taper,
 * steel joint, inlaid forearm, Irish-linen wrap, butt sleeve and rubber bumper.
 */
export function buildCueStick(): THREE.Group {
  const g = new THREE.Group();
  const shaftTex = maple(); shaftTex.repeat.set(1, 3);
  const mats = {
    tip: new THREE.MeshStandardMaterial({ color: '#2f6fb3', roughness: 0.9 }),
    ferrule: new THREE.MeshPhysicalMaterial({ color: '#f4f1ea', roughness: 0.25, clearcoat: 0.6 }),
    shaft: new THREE.MeshPhysicalMaterial({ map: shaftTex, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    steel: new THREE.MeshStandardMaterial({ color: '#c9ced6', metalness: 1, roughness: 0.18 }),
    ring: new THREE.MeshStandardMaterial({ color: '#efe9dc', roughness: 0.3 }),
    forearm: new THREE.MeshPhysicalMaterial({ map: forearm(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }),
    wrap: new THREE.MeshStandardMaterial({ map: linen(), roughness: 0.95 }),
    sleeve: new THREE.MeshPhysicalMaterial({ color: '#2a1209', roughness: 0.3, clearcoat: 1, metalness: 0.1 }),
    bumper: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.8 }),
  };
  const segs: Seg[] = [
    { len: 0.04, r0: 0.03, r1: 0.032, mat: mats.tip },
    { len: 0.22, r0: 0.033, r1: 0.034, mat: mats.ferrule },
    { len: 4.2, r0: 0.034, r1: 0.05, mat: mats.shaft },
    { len: 0.05, r0: 0.054, r1: 0.054, mat: mats.ring },
    { len: 0.22, r0: 0.056, r1: 0.056, mat: mats.steel },
    { len: 0.05, r0: 0.056, r1: 0.056, mat: mats.ring },
    { len: 2.3, r0: 0.056, r1: 0.066, mat: mats.forearm },
    { len: 0.04, r0: 0.067, r1: 0.067, mat: mats.steel },
    { len: 1.25, r0: 0.067, r1: 0.069, mat: mats.wrap },
    { len: 0.04, r0: 0.07, r1: 0.07, mat: mats.steel },
    { len: 0.85, r0: 0.07, r1: 0.073, mat: mats.sleeve },
    { len: 0.06, r0: 0.072, r1: 0.06, mat: mats.bumper },
  ];
  let x = 0;
  for (const s of segs) {
    const geo = new THREE.CylinderGeometry(s.r0, s.r1, s.len, 24, 1);
    geo.rotateZ(Math.PI / 2); // axis along X; cylinder top (r0) now at +X
    const m = new THREE.Mesh(geo, s.mat);
    m.position.x = x - s.len / 2;
    m.castShadow = true;
    g.add(m);
    x -= s.len;
  }
  // chalk dome on the tip
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.tip);
  dome.rotation.z = -Math.PI / 2;
  g.add(dome);
  return g;
}
