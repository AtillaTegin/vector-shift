import * as THREE from 'three';

interface Particle { mesh: THREE.Mesh; vel: THREE.Vector3; spin: THREE.Vector3; life: number; max: number; kind: 'spark' | 'shard' | 'ripple' | 'splash' | 'flash' }

/**
 * Lightweight pooled particle/FX system: impact sparks, glass & concrete shards, water ripples,
 * splashes and pocket flashes. Purely visual — never touches the simulation.
 */
export class Effects {
  readonly root = new THREE.Group();
  private parts: Particle[] = [];
  private sparkGeo = new THREE.SphereGeometry(0.035, 6, 4);
  private shardGeo = new THREE.TetrahedronGeometry(0.12);
  private ringGeo = new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2);
  private dropGeo = new THREE.SphereGeometry(0.05, 6, 4);

  private add(p: Particle) {
    if (this.parts.length > 400) { const old = this.parts.shift()!; this.root.remove(old.mesh); }
    this.parts.push(p);
    this.root.add(p.mesh);
  }

  sparks(pos: THREE.Vector3, color: THREE.ColorRepresentation, count: number, speed = 3) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color, toneMapped: false, transparent: true }));
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2, u = Math.random();
      const vel = new THREE.Vector3(Math.cos(a) * speed * (0.4 + u), 1 + Math.random() * speed, Math.sin(a) * speed * (0.4 + u));
      this.add({ mesh: m, vel, spin: new THREE.Vector3(), life: 0, max: 0.35 + Math.random() * 0.35, kind: 'spark' });
    }
  }

  shards(pos: THREE.Vector3, color: THREE.ColorRepresentation, count: number, dir: THREE.Vector3, glass: boolean) {
    const mat = glass
      ? new THREE.MeshPhysicalMaterial({ color, transparent: true, opacity: 0.7, roughness: 0.05, emissive: color, emissiveIntensity: 0.6 })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.shardGeo, mat);
      m.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.4, (Math.random() - 0.5) * 0.6));
      m.scale.setScalar(0.5 + Math.random() * (glass ? 0.8 : 1.4));
      const vel = dir.clone().multiplyScalar(1 + Math.random() * 3).add(new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 3, (Math.random() - 0.5) * 3));
      m.castShadow = true;
      this.add({ mesh: m, vel, spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10), life: 0, max: 1.6 + Math.random(), kind: 'shard' });
    }
  }

  ripple(pos: THREE.Vector3, strength = 1) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#bff6ff', transparent: true, opacity: 0.5 * strength, depthWrite: false, toneMapped: false }));
    m.position.copy(pos); m.position.y += 0.03;
    m.scale.setScalar(0.2);
    this.add({ mesh: m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 0.9, kind: 'ripple' });
  }

  splash(pos: THREE.Vector3, count = 18) {
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.dropGeo, new THREE.MeshBasicMaterial({ color: '#c8f7ff', transparent: true, toneMapped: false }));
      m.position.copy(pos);
      const a = Math.random() * Math.PI * 2;
      this.add({ mesh: m, vel: new THREE.Vector3(Math.cos(a) * 1.5, 2.5 + Math.random() * 2.5, Math.sin(a) * 1.5), spin: new THREE.Vector3(), life: 0, max: 0.8, kind: 'splash' });
    }
    this.ripple(pos, 1.4);
  }

  flash(pos: THREE.Vector3, color: THREE.ColorRepresentation, size = 1.6) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.position.copy(pos); m.position.y += 0.05;
    m.userData.size = size;
    this.add({ mesh: m, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, max: 0.5, kind: 'flash' });
  }

  update(dt: number) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life += dt;
      const k = p.life / p.max;
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (p.kind === 'ripple') { p.mesh.scale.setScalar(0.2 + k * 1.3); mat.opacity = 0.5 * (1 - k); }
      else if (p.kind === 'flash') { p.mesh.scale.setScalar(0.3 + k * p.mesh.userData.size); mat.opacity = 0.9 * (1 - k); }
      else {
        p.vel.y -= 9.81 * dt;
        p.mesh.position.addScaledVector(p.vel, dt);
        p.mesh.rotation.x += p.spin.x * dt; p.mesh.rotation.y += p.spin.y * dt; p.mesh.rotation.z += p.spin.z * dt;
        if (p.kind !== 'shard') { mat.opacity = 1 - k; }
      }
      if (k >= 1) { this.root.remove(p.mesh); (p.mesh.material as THREE.Material).dispose(); this.parts.splice(i, 1); }
    }
  }

  clear() { for (const p of this.parts) this.root.remove(p.mesh); this.parts = []; }
}
