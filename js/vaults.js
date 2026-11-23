/* ============================================================
   HELIOS ELEMENTS — SUNLESS VAULTS
   An optional guardian lair that yields a relic choice.
   ============================================================ */

import { glowTexture } from './engine.js';

export class SunlessVault {
  constructor(scene, fx, pos) {
    this.scene = scene;
    this.fx = fx;
    this.pos = pos.clone();
    this.time = 0;
    this.opened = false;
    this.done = false;
    this.guardian = null;

    const group = new THREE.Group();
    group.position.copy(pos);
    this.group = group;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1b1722, roughness: 0.52, metalness: 0.62 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a3a, roughness: 0.28, metalness: 0.85,
      emissive: 0x5a3208, emissiveIntensity: 0.7,
    });
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffd08a, emissive: 0xffa63a, emissiveIntensity: 1.9,
      roughness: 0.12, metalness: 0.35, toneMapped: false,
    });
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0xf5c26b, transparent: true, opacity: 0.52,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.65, 0.38, 8), stoneMat);
    base.position.y = 0.19;
    base.receiveShadow = true;
    group.add(base);

    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.25, 0.22, 8), goldMat);
    step.position.y = 0.46;
    group.add(step);

    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.7, 0.18), stoneMat);
      pillar.position.set(Math.cos(a) * 1.12, 1.28, Math.sin(a) * 1.12);
      pillar.rotation.y = -a;
      group.add(pillar);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), goldMat);
      cap.position.set(Math.cos(a) * 1.12, 2.18, Math.sin(a) * 1.12);
      group.add(cap);
    }

    this.crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.62, 0), this.crystalMat);
    this.crystal.scale.set(0.82, 1.55, 0.82);
    this.crystal.position.y = 1.35;
    group.add(this.crystal);

    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 1.75, 48), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    group.add(this.ring);

    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,248,225,1)', 'rgba(255,190,100,.38)', 'rgba(255,120,40,0)'),
      color: 0xffc06a, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.halo.scale.set(5.4, 5.4, 1);
    this.halo.position.y = 1.35;
    group.add(this.halo);

    this.light = new THREE.PointLight(0xffbd66, 1.5, 14, 2);
    this.light.position.y = 1.8;
    group.add(this.light);

    scene.add(group);
  }

  open() {
    if (this.opened) return;
    this.opened = true;
    this.time = 0;
    this.crystalMat.color.set(0xa8f3ff);
    this.crystalMat.emissive.set(0x5fe3ff);
    this.ringMat.color.set(0x9feaff);
    this.halo.material.color.set(0x9feaff);
    this.light.color.set(0x8feaff);
    this.light.intensity = 3.2;
    this.fx.ring(this.pos, 0x9feaff, { r0: 0.5, r1: 8.5, life: 1.1, opacity: 0.8 });
    this.fx.burst(new THREE.Vector3(this.pos.x, 1.4, this.pos.z), 0xffe7a3, {
      count: 46, speed: 8, size: 0.3, life: 1, up: 4,
    });
  }

  update(dt) {
    if (!this.group) return;
    this.time += dt;
    this.crystal.rotation.y += dt * 0.85;
    this.crystal.position.y = 1.35 + Math.sin(this.time * 2.2) * 0.12;
    this.ring.rotation.z += dt * 0.5;
    this.halo.material.opacity = 0.42 + Math.sin(this.time * 2.6) * 0.1;
    if (this.opened) {
      const fade = Math.max(0, 1 - this.time * 0.72);
      this.crystal.scale.set(0.82 * fade, 1.55 * fade, 0.82 * fade);
      this.halo.scale.setScalar(5.4 * Math.max(0.25, fade));
      if (this.time > 1.35) this.done = true;
    }
  }

  clear() {
    if (!this.group) return;
    this.scene.remove(this.group);
    this.group.traverse(o => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.dispose?.();
    });
    this.group = null;
  }
}
