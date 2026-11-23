/* ============================================================
   HELIOS ELEMENTS — SUNFORGE STRUCTURES
   The core you defend, the defenses you raise, the damage they take.
   ============================================================ */

import { DEFENSES, SIEGE, LANE, ESCORT, RITUAL, ELEMENT_MATCH } from './data.js';
import { glowTexture, shadowTexture } from './engine.js';

const PED_ANGLES = [Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.5];
const PED_RADIUS = 7.6;

export class Structures {
  constructor(scene, fx, audio, mode = 'siege', difficulty = null) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.mode = mode;
    this.difficulty = difficulty || {};
    this.time = 0;
    this.defenses = [];
    this.pedestals = [];
    this.gates = [];
    this.lanes = [];
    this.laneStrips = null;
    this.core = null;
    this._coreFlash = 0;
    this._lastCoreSound = -9;
    this._zapCd = 2.2;
    this._buildCore();
    if (mode === 'lane') this._buildLaneField();
    else this._buildPedestals();
  }

  /* ---------------- CORE ---------------- */
  _buildCore() {
    const group = new THREE.Group();
    group.position.set(0, 0, 0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x191722, roughness: 0.5, metalness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0x8a6a3a, roughness: 0.28, metalness: 0.85,
      emissive: 0x5a3208, emissiveIntensity: 0.6,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xffd08a, emissive: 0xffa63a, emissiveIntensity: 1.8,
      roughness: 0.12, metalness: 0.35, toneMapped: false,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.35, 2.75, 0.55, 10), stoneMat);
    base.position.y = 0.27;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const step = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.2, 0.35, 10), goldMat);
    step.position.y = 0.7;
    group.add(step);

    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.05, 0), crystalMat);
    crystal.scale.set(1, 2.25, 1);
    crystal.position.y = 2.55;
    crystal.castShadow = true;
    group.add(crystal);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,248,225,1)', 'rgba(255,190,100,.42)', 'rgba(255,120,40,0)'),
      color: 0xffc06a, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.scale.set(9, 9, 1);
    halo.position.y = 2.6;
    group.add(halo);

    const ringMatA = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.55, toneMapped: false });
    const ringMatB = new THREE.MeshBasicMaterial({ color: 0xffe9bc, transparent: true, opacity: 0.32, toneMapped: false });
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.035, 6, 56), ringMatA);
    ringA.position.y = 2.45;
    ringA.rotation.x = Math.PI / 2.6;
    group.add(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.022, 6, 64), ringMatB);
    ringB.position.y = 2.1;
    ringB.rotation.x = Math.PI / 1.7;
    group.add(ringB);

    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xffc879, transparent: true, opacity: 0.14,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.75, 22, 12, 1, true), beamMat);
    beam.position.y = 12;
    group.add(beam);

    const groundMat = new THREE.MeshBasicMaterial({
      color: 0xffc06a, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const ground = new THREE.Mesh(new THREE.RingGeometry(2.8, 4.2, 72), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.045;
    group.add(ground);

    // Sunforge Aegis — the ring that marks where guarding the core pays off.
    const aegisMat = new THREE.MeshBasicMaterial({
      color: 0xffd28a, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const aegis = new THREE.Mesh(new THREE.RingGeometry(SIEGE.aegisRadius - 0.16, SIEGE.aegisRadius, 96), aegisMat);
    aegis.rotation.x = -Math.PI / 2;
    aegis.position.y = 0.05;
    group.add(aegis);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 8),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.45, depthWrite: false, color: 0x000000 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    const light = new THREE.PointLight(0xffb85c, 2.2, 30, 2);
    light.position.y = 2.8;
    group.add(light);

    this.scene.add(group);

    this.core = {
      kind: 'core', name: 'Sunforge', pos: new THREE.Vector3(0, 0, 0), radius: 2.25,
      hp: SIEGE.coreHp, maxHp: SIEGE.coreHp, alive: true,
      group, crystal, crystalMat, goldMat, stoneMat, halo, ringA, ringB, beam, beamMat, ground, groundMat, aegis, aegisMat, light,
      warnStep: 0, lastHit: -99,
    };
  }

  /* ---------------- PEDESTALS ---------------- */
  _buildPedestals(specs = null) {
    const list = specs || PED_ANGLES.map((a, i) => ({
      pos: new THREE.Vector3(Math.cos(a) * PED_RADIUS, 0, Math.sin(a) * PED_RADIUS),
      label: 'Pedestal ' + (i + 1),
    }));
    for (let i = 0; i < list.length; i++) {
      const pos = list[i].pos;
      const group = new THREE.Group();
      group.position.copy(pos);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf5c26b, transparent: true, opacity: 0.3,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.92, 32), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.035;
      group.add(ring);

      const runeMat = new THREE.MeshBasicMaterial({ color: 0xf5c26b, transparent: true, opacity: 0.8, toneMapped: false });
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 0), runeMat);
      rune.position.y = 0.75;
      group.add(rune);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,245,220,.9)', 'rgba(255,190,100,.25)', 'rgba(255,120,40,0)'),
        color: 0xf5c26b, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      glow.scale.set(2.2, 2.2, 1);
      glow.position.y = 0.75;
      group.add(glow);

      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 3),
        new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.3, depthWrite: false, color: 0x000000 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.018;
      group.add(shadow);

      this.scene.add(group);
      this.pedestals.push({ index: i, label: list[i].label, pos, group, ring, ringMat, rune, glow, defense: null });
    }
  }

  /* ---------------- LANE FIELD ---------------- */
  _buildLaneField() {
    this.laneStrips = new THREE.Group();
    this.scene.add(this.laneStrips);

    const padSpecs = [];
    LANE.lanes.forEach((lane) => {
      const dirX = Math.cos(lane.angle), dirZ = Math.sin(lane.angle);
      const color = new THREE.Color(lane.css);

      // The lane road, drawn from just outside the core to the gate.
      const inner = 4.6, outer = LANE.laneRadius - 1.4;
      const length = outer - inner;
      const roadMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.16, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const road = new THREE.Mesh(new THREE.PlaneGeometry(4.2, length), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.rotation.z = -lane.angle - Math.PI / 2;
      road.position.set(dirX * (inner + length / 2), 0.03, dirZ * (inner + length / 2));
      this.laneStrips.add(road);

      const spineMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.34, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const spine = new THREE.Mesh(new THREE.PlaneGeometry(0.42, length), spineMat);
      spine.rotation.x = -Math.PI / 2;
      spine.rotation.z = -lane.angle - Math.PI / 2;
      spine.position.set(dirX * (inner + length / 2), 0.035, dirZ * (inner + length / 2));
      this.laneStrips.add(spine);

      for (let r = inner + 3; r < outer; r += 5.2) {
        const chevron = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.34), spineMat);
        chevron.rotation.x = -Math.PI / 2;
        chevron.rotation.z = -lane.angle - Math.PI / 2;
        chevron.position.set(dirX * r, 0.04, dirZ * r);
        this.laneStrips.add(chevron);
      }

      for (let p = 0; p < LANE.padRadii.length; p++) {
        const radius = LANE.padRadii[p];
        padSpecs.push({
          pos: new THREE.Vector3(dirX * radius, 0, dirZ * radius),
          label: lane.short + ' \u00b7 PAD ' + (p + 1),
        });
      }
    });

    this._buildPedestals(padSpecs);

    LANE.lanes.forEach((lane, index) => {
      const pos = new THREE.Vector3(Math.cos(lane.angle) * LANE.laneRadius, 0, Math.sin(lane.angle) * LANE.laneRadius);
      const gate = this._buildGate(lane, pos, index);
      this.lanes.push({
        index, key: lane.key, name: lane.name, short: lane.short, angle: lane.angle, css: lane.css,
        pos: pos.clone(), gate,
        pads: this.pedestals.slice(index * LANE.padRadii.length, (index + 1) * LANE.padRadii.length),
      });
    });
  }

  _buildGate(lane, pos, index) {
    const group = new THREE.Group();
    group.position.copy(pos);
    group.rotation.y = Math.atan2(-pos.x, -pos.z);

    const color = new THREE.Color(lane.css);
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1a1824, roughness: 0.55, metalness: 0.55 });
    const bodyMat = new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 1.1,
      roughness: 0.26, metalness: 0.5, toneMapped: false,
    });
    const veilMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });

    for (const side of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.62, 3.4, 0.62), stoneMat);
      pillar.position.set(side * 1.25, 1.7, 0);
      pillar.castShadow = true;
      group.add(pillar);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), bodyMat);
      cap.position.set(side * 1.25, 3.65, 0);
      group.add(cap);
    }

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.42, 0.72), bodyMat);
    lintel.position.y = 3.2;
    group.add(lintel);

    const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.9), veilMat);
    veil.position.y = 1.7;
    group.add(veil);

    const ringMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.38, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.85, 48), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.04;
    group.add(ring);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,.9)', 'rgba(200,240,255,.3)', 'rgba(80,180,255,0)'),
      color, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.scale.set(7, 7, 1);
    glow.position.y = 2.1;
    group.add(glow);

    const light = new THREE.PointLight(color, 1.2, 16, 2);
    light.position.y = 2.4;
    group.add(light);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 7),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.35, depthWrite: false, color: 0x000000 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    this.scene.add(group);

    const gateHp = Math.round(LANE.gateHp * (this.difficulty.gateHpMult || 1));
    const gate = {
      kind: 'gate', key: lane.key, name: lane.name + ' Rift Gate', short: lane.short,
      pos: pos.clone(), radius: LANE.gateRadius, hp: gateHp, maxHp: gateHp,
      alive: true, lane, index, group, bodyMat, veilMat, veil, ring, ringMat, glow, light,
      flashT: 0, warnStep: 0,
    };
    this.gates.push(gate);
    return gate;
  }

  /* ---------------- GATES ---------------- */
  gateTarget(pos, range = 22) {
    let best = null, bestD = range * range;
    for (const g of this.gates) {
      if (!g.alive) continue;
      const dx = g.pos.x - pos.x, dz = g.pos.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = g; }
    }
    return best;
  }

  gateHitTest(pos, pad = 0.4) {
    for (const g of this.gates) {
      if (!g.alive) continue;
      const dx = g.pos.x - pos.x, dz = g.pos.z - pos.z;
      const r = g.radius + pad;
      if (dx * dx + dz * dz < r * r) return g;
    }
    return null;
  }

  damageGatesInRadius(center, radius, amount, game) {
    if (!this.gates.length || amount <= 0) return;
    for (const g of this.gates) {
      if (!g.alive) continue;
      const d = Math.hypot(g.pos.x - center.x, g.pos.z - center.z);
      if (d <= radius + g.radius) this.damageGate(g, amount, game);
    }
  }

  damageGate(gate, amount, game) {
    if (!gate?.alive || amount <= 0) return 0;
    const dmg = Math.max(1, amount);
    gate.hp = Math.max(0, gate.hp - dmg);
    gate.flashT = 0.14;
    if (Math.random() < 0.3) {
      this.fx.number(
        new THREE.Vector3(gate.pos.x + (Math.random() - 0.5) * 2.2, 3.4, gate.pos.z + (Math.random() - 0.5) * 2.2),
        '-' + Math.round(dmg), ''
      );
    }
    const ratio = gate.hp / gate.maxHp;
    if (ratio < 0.5 && gate.warnStep < 1) {
      gate.warnStep = 1;
      game.ui?.toast(gate.short + ' GATE IS CRACKING', gate.lane.css);
    }
    if (gate.hp <= 0) this._destroyGate(gate, game);
    return dmg;
  }

  _destroyGate(gate, game) {
    gate.alive = false;
    gate.hp = 0;
    const hex = new THREE.Color(gate.lane.css).getHex();
    this.fx.burst(new THREE.Vector3(gate.pos.x, 2, gate.pos.z), hex, { count: 60, speed: 12, size: 0.4, life: 1.4, up: 5 });
    this.fx.ring(gate.pos, hex, { r0: 1, r1: 12, life: 1.2, opacity: 0.85 });
    this.audio?.death?.();
    game.engine.addShake(0.9);
    game.engine.pulseExposure(0.4);
    this.scene.remove(gate.group);
    gate.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) o.material.dispose?.();
    });
    game.onGateDestroyed(gate);
  }

  /* ---------------- BUILD ---------------- */
  freePedestal() {
    return this.pedestals.find(p => !p.defense) || null;
  }

  build(key) {
    const def = DEFENSES[key];
    const ped = this.freePedestal();
    if (!def || !ped) return null;

    const group = new THREE.Group();
    group.position.copy(ped.pos);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1b1822, roughness: 0.55, metalness: 0.55 });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color, emissive: def.glow, emissiveIntensity: 1.1,
      roughness: 0.28, metalness: 0.5, toneMapped: false,
    });
    const accentMat = new THREE.MeshBasicMaterial({ color: def.glow, toneMapped: false });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.08, 0.3, 8), baseMat);
    base.position.y = 0.15;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 3.4),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.4, depthWrite: false, color: 0x000000 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    group.add(shadow);

    let head = null;
    let aura = null;
    let ring = null;

    if (def.key === 'lance') {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, 1.1, 6), baseMat);
      mast.position.y = 0.8;
      group.add(mast);
      head = new THREE.Group();
      head.position.y = 1.55;
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), bodyMat);
      crystal.scale.set(0.8, 1.7, 0.8);
      head.add(crystal);
      const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.025, 6, 32), accentMat);
      haloRing.rotation.x = Math.PI / 2;
      head.add(haloRing);
      group.add(head);
    } else if (def.key === 'ward') {
      const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 1.9, 5), bodyMat);
      spine.position.y = 1.2;
      spine.castShadow = true;
      group.add(spine);
      const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), accentMat);
      cap.position.y = 2.3;
      cap.rotation.y = 0.4;
      group.add(cap);
      aura = new THREE.Mesh(
        new THREE.RingGeometry(def.slowRadius - 0.22, def.slowRadius, 64),
        new THREE.MeshBasicMaterial({
          color: def.color, transparent: true, opacity: 0.07, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
        })
      );
      aura.rotation.x = -Math.PI / 2;
      aura.position.y = 0.03;
      group.add(aura);
    } else if (def.key === 'pyre') {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.44, 0.5, 8), bodyMat);
      bowl.position.y = 1.05;
      bowl.castShadow = true;
      group.add(bowl);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.15, 6), accentMat);
      flame.position.y = 1.75;
      group.add(flame);
      head = flame;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.03, 6, 32), accentMat);
      halo.position.y = 1.1;
      halo.rotation.x = Math.PI / 2;
      group.add(halo);
    } else if (def.key === 'galecore') {
      const gyro = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 28), bodyMat);
      gyro.position.y = 1.5;
      gyro.rotation.x = Math.PI / 2.4;
      group.add(gyro);
      const gyro2 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 6, 24), accentMat);
      gyro2.position.y = 1.5;
      gyro2.rotation.y = Math.PI / 2;
      group.add(gyro2);
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), accentMat);
      core.position.y = 1.5;
      group.add(core);
      head = gyro2;
      ring = gyro;
    } else if (def.key === 'gloom') {
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 1), bodyMat);
      orb.position.y = 1.5;
      orb.castShadow = true;
      group.add(orb);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const tendril = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.8, 4), accentMat);
        tendril.position.set(Math.cos(a) * 0.55, 1.5 - Math.sin(a) * 0.35, Math.sin(a) * 0.55);
        tendril.rotation.z = a + Math.PI;
        group.add(tendril);
      }
      head = orb;
      ring = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 6, 36), accentMat);
      ring.position.y = 1.5;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    } else {
      const heart = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), bodyMat);
      heart.position.y = 1.3;
      heart.castShadow = true;
      group.add(heart);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.72, 4), accentMat);
        spike.position.set(Math.cos(a) * 0.7, 1.3 + Math.sin(a) * 0.7, Math.sin(a) * 0.3);
        spike.rotation.z = a;
        group.add(spike);
      }
      ring = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.03, 6, 40), accentMat);
      ring.position.y = 1.3;
      ring.rotation.x = Math.PI / 2.5;
      group.add(ring);
    }

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,250,235,.9)', 'rgba(255,200,120,.3)', 'rgba(255,120,40,0)'),
      color: def.glow, transparent: true, opacity: 0.55,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.scale.set(3.4, 3.4, 1);
    glow.position.y = def.key === 'lance' ? 1.6 : 1.35;
    group.add(glow);

    const light = new THREE.PointLight(def.color, 0.85, 12, 2);
    light.position.y = 1.6;
    group.add(light);

    this.scene.add(group);
    ped.defense = null;
    ped.rune.visible = false;
    ped.ringMat.opacity = 0.55;
    ped.ringMat.color.set(def.color);

    const target = {
      kind: 'defense', key: def.key, name: def.name, pos: ped.pos.clone(),
      radius: def.radius, hp: def.hp, maxHp: def.hp, alive: true,
      type: def, group, bodyMat, accentMat, head, aura, ring, glow, light,
      ped, cd: 0.7, flashT: 0, rank: 1, damage: def.damage, range: def.range,
    };
    ped.defense = target;
    this.defenses.push(target);

    this.fx.ring(ped.pos, def.color, { r0: 0.4, r1: 3.4, life: 0.6, opacity: 0.7 });
    this.fx.burst(new THREE.Vector3(ped.pos.x, 1.2, ped.pos.z), def.color, { count: 20, speed: 5, size: 0.24, life: 0.7, up: 2 });
    this.audio?.ui?.();
    return target;
  }

  upgrade(structure, game) {
    if (!structure?.alive) return 0;
    const def = structure.type;
    const maxRank = def.maxRank || 3;
    if ((structure.rank || 1) >= maxRank) return 0;
    structure.rank = (structure.rank || 1) + 1;
    structure.maxHp = Math.round(structure.maxHp * 1.4);
    structure.hp = structure.maxHp;
    structure.damage = Math.round((structure.damage || def.damage) * 1.35);
    structure.range = (structure.range || def.range) + 0.6;
    structure.group.scale.setScalar(1 + (structure.rank - 1) * 0.09);
    if (structure.glow) structure.glow.scale.set(3.4 + structure.rank * 0.5, 3.4 + structure.rank * 0.5, 1);
    this.fx.ring(structure.pos, def.glow, { r0: 0.5, r1: 3.8, life: 0.6, opacity: 0.8 });
    this.fx.burst(new THREE.Vector3(structure.pos.x, 1.3, structure.pos.z), def.glow, { count: 22, speed: 6, size: 0.26, life: 0.8, up: 2.4 });
    game.engine.addShake(0.18);
    return structure.rank;
  }

  /* ---------------- TARGETING ---------------- */
  nearestAlive(pos) {
    let best = null, bestD = Infinity;
    const list = this.core?.alive ? [this.core, ...this.defenses] : [...this.defenses];
    for (const s of list) {
      if (!s.alive) continue;
      const dx = s.pos.x - pos.x, dz = s.pos.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  pushOut(pos, pad = 0.55) {
    const list = this.core?.alive ? [this.core, ...this.defenses] : [...this.defenses];
    for (const g of this.gates) if (g.alive) list.push(g);
    for (const s of list) {
      if (!s.alive) continue;
      const dx = pos.x - s.pos.x;
      const dz = pos.z - s.pos.z;
      const d = Math.hypot(dx, dz);
      const min = (s.radius || 1) + pad;
      if (d < min) {
        const nx = d > 0.001 ? dx / d : 1;
        const nz = d > 0.001 ? dz / d : 0;
        pos.x = s.pos.x + nx * min;
        pos.z = s.pos.z + nz * min;
      }
    }
  }

  hitTest(pos, pad = 0) {
    const list = this.core?.alive ? [this.core, ...this.defenses] : [...this.defenses];
    for (const s of list) {
      if (!s.alive) continue;
      const dx = s.pos.x - pos.x, dz = s.pos.z - pos.z;
      if (dx * dx + dz * dz < (s.radius + pad) * (s.radius + pad)) return s;
    }
    return null;
  }

  /* ---------------- DAMAGE ---------------- */
  damage(structure, amount, game, opts = {}) {
    if (!structure || !structure.alive || amount <= 0) return 0;
    if (structure.kind === 'core' && structure.invulnUntil && game.time < structure.invulnUntil) return 0;
    const dmg = Math.max(1, amount);
    if (structure.kind === 'core' && structure.hp - dmg <= 0 && game.tryLastStand?.(structure)) return 0;
    structure.hp = Math.max(0, structure.hp - dmg);
    structure.flashT = 0.13;

    if (structure.kind === 'core') {
      structure.lastHit = game.time;
      this._coreFlash = 0.3;
      if (game.time - this._lastCoreSound > 0.35) {
        this._lastCoreSound = game.time;
        this.audio?.hit?.();
      }
      game.engine.addShake(Math.min(0.4, 0.07 + dmg * 0.004));
      if (Math.random() < 0.35) {
        this.fx.number(
          new THREE.Vector3(structure.pos.x + (Math.random() - 0.5) * 2.4, 3.4, structure.pos.z + (Math.random() - 0.5) * 2.4),
          '-' + Math.round(dmg), ''
        );
      }
      const ratio = structure.hp / structure.maxHp;
      if (ratio < 0.66 && structure.warnStep < 1) {
        structure.warnStep = 1;
        game.ui?.toast('THE SUNFORGE IS CRACKING', '#ff8a52');
      }
      if (ratio < 0.33 && structure.warnStep < 2) {
        structure.warnStep = 2;
        game.ui?.toast('SUNFORGE CRITICAL — REPAIR IT', '#ff5a3a');
        game.fx.flash('hit');
        game.engine.addShake(0.6);
      }
    } else {
      if (Math.random() < 0.55) {
        this.fx.number(new THREE.Vector3(structure.pos.x, 2.1, structure.pos.z), '-' + Math.round(dmg), '');
      }
      game.engine.addShake(0.04);
    }

    if (structure.hp <= 0) this._destroy(structure, game);
    return dmg;
  }

  repair(target, amount) {
    if (!target || !target.alive || amount <= 0) return 0;
    const before = target.hp;
    target.hp = Math.min(target.maxHp, target.hp + amount);
    return target.hp - before;
  }

  _destroy(structure, game) {
    structure.alive = false;
    structure.hp = 0;
    structure.flashT = 0;

    if (structure.glow) structure.glow.visible = false;
    if (structure.aura) structure.aura.visible = false;

    if (structure.kind === 'core') {
      structure.group.visible = false;
      this.fx.burst(new THREE.Vector3(0, 2.4, 0), 0xffb45a, { count: 90, speed: 15, size: 0.45, life: 1.8, up: 6 });
      this.fx.ring(new THREE.Vector3(0, 0.1, 0), 0xffd28a, { r0: 1, r1: 20, life: 1.5, opacity: 0.9 });
      this.fx.ring(new THREE.Vector3(0, 0.1, 0), 0xff5a3a, { r0: 0.5, r1: 30, life: 2.1, opacity: 0.5 });
      this.audio?.death?.();
      game.engine.addShake(2);
      game.engine.pulseExposure(0.9);
      game.fx.flash('hit');
      game.onCoreDestroyed();
      return;
    }

    const ped = structure.ped;
    if (ped) {
      ped.defense = null;
      ped.rune.visible = true;
      ped.ringMat.opacity = 0.3;
      ped.ringMat.color.set(0xf5c26b);
    }
    this.defenses = this.defenses.filter(d => d !== structure);
    this.fx.burst(new THREE.Vector3(structure.pos.x, 1.2, structure.pos.z), structure.type.color, { count: 34, speed: 9, size: 0.32, life: 1, up: 3 });
    this.fx.ring(structure.pos, structure.type.color, { r0: 0.5, r1: 5, life: 0.8, opacity: 0.8 });
    this.audio?.hurt?.();
    game.engine.addShake(0.35);
    game.ui?.toast(structure.name.toUpperCase() + ' DESTROYED', '#ff8a52');
    this.scene.remove(structure.group);
    structure.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material && o.material !== structure.bodyMat) o.material.dispose?.();
    });
    structure.bodyMat.dispose?.();
    structure.accentMat.dispose?.();
  }

  /* ---------------- UPDATE ---------------- */
  update(dt, game) {
    this.time += dt;
    const t = this.time;

    // core animation
    const core = this.core;
    if (core && core.alive) {
      core.crystal.rotation.y += dt * 0.6;
      core.ringA.rotation.z += dt * 0.55;
      core.ringB.rotation.z -= dt * 0.35;
      core.crystal.scale.set(1 + Math.sin(t * 2.1) * 0.03, 2.25 + Math.sin(t * 2.1) * 0.06, 1 + Math.sin(t * 2.1) * 0.03);
      core.halo.material.opacity = 0.55 + Math.sin(t * 2.3) * 0.1;
      core.beamMat.opacity = 0.11 + Math.sin(t * 1.2) * 0.035;
      core.groundMat.opacity = 0.34 + Math.sin(t * 1.8) * 0.09;
      core.light.intensity = 2 + Math.sin(t * 2.4) * 0.25 + this._coreFlash * 4;
      const ratio = core.hp / core.maxHp;
      if (ratio < 0.4) {
        core.crystalMat.emissive.setHex(0xff4a20);
        core.crystalMat.color.setHex(0xff8a5a);
      } else {
        core.crystalMat.emissive.setHex(0xffa63a);
        core.crystalMat.color.setHex(0xffd08a);
      }
      if (this._coreFlash > 0) {
        this._coreFlash -= dt;
        core.crystalMat.emissiveIntensity = 1.8 + this._coreFlash * 6;
      } else {
        core.crystalMat.emissiveIntensity = 1.8;
      }
    }

    // rift gates breathe, crack and dim as they take fire
    for (const g of this.gates) {
      if (!g.alive) continue;
      g.veil.rotation.z = Math.sin(t * 0.6 + g.index) * 0.08;
      g.veilMat.opacity = 0.16 + Math.sin(t * 2.1 + g.index) * 0.07;
      g.ring.rotation.z += dt * 0.4;
      g.light.intensity = 1.1 + Math.sin(t * 2.4 + g.index) * 0.2;
      if (g.flashT > 0) {
        g.flashT -= dt;
        g.bodyMat.emissiveIntensity = 3.2;
      } else {
        const hurt = g.hp / g.maxHp < 0.5;
        g.bodyMat.emissiveIntensity = hurt ? 1.7 + Math.sin(t * 7) * 0.4 : 1.1;
      }
    }

    // the Aegis ring brightens while you hold the core
    if (core?.aegis) {
      core.aegisMat.opacity = (game.coreGuard ? 0.22 : 0.09) + Math.sin(t * 2.1) * 0.03;
      core.aegis.rotation.z += dt * 0.22;
    }

    // The Sunforge answers a breach with its own light.
    if (core?.alive) {
      this._zapCd -= dt;
      if (this._zapCd <= 0) {
        const threat = game.enemies.nearest(core.pos, SIEGE.coreZapRadius);
        if (threat) {
          this._zapCd = SIEGE.coreZapInterval;
          game.damageEnemy(threat, SIEGE.coreZapDamage + (game.wave || 1) * 1.6, { color: 0xffd28a, silent: true, element: 'neutral' });
          this.fx.beam(new THREE.Vector3(0, 3.4, 0), new THREE.Vector3(threat.pos.x, 1.1, threat.pos.z), 0xfff0c0, 0.3, 0.22);
          this.fx.ring(threat.pos, 0xffd28a, { r0: 0.3, r1: 2.1, life: 0.3, opacity: 0.7 });
          this.audio?.hit?.();
        } else {
          this._zapCd = 0.5;
        }
      }
    }

    // empty pedestals breathe
    for (const ped of this.pedestals) {
      if (ped.defense) continue;
      ped.rune.rotation.y += dt * 1.1;
      ped.rune.position.y = 0.75 + Math.sin(t * 1.7 + ped.index) * 0.12;
      ped.glow.material.opacity = 0.35 + Math.sin(t * 1.5 + ped.index) * 0.12;
      ped.ringMat.opacity = 0.22 + Math.sin(t * 1.2 + ped.index) * 0.08;
    }

    for (const d of this.defenses) {
      if (!d.alive) continue;
      const def = d.type;
      d.cd -= dt;

      if (d.flashT > 0) {
        d.flashT -= dt;
        d.bodyMat.emissiveIntensity = 2.4;
      } else {
        d.bodyMat.emissiveIntensity = 1.1;
      }

      const res = game.arenaElement && def.element === game.arenaElement ? ELEMENT_MATCH.resonance : 1;

      if (d.head) d.head.rotation.y += dt * 1.2;
      if (d.ring) d.ring.rotation.z += dt * 0.8;
      if (d.aura) d.aura.material.opacity = 0.06 + Math.sin(t * 1.6) * 0.025;

      const target = game.enemies.nearest(d.pos, (d.range || def.range) + 1);
      if (target) {
        const lead = Math.min(0.45, Math.hypot(target.pos.x - d.pos.x, target.pos.z - d.pos.z) / Math.max(8, def.projSpeed || 20));
        const ax = target.pos.x + (target.vx || 0) * lead;
        const az = target.pos.z + (target.vz || 0) * lead;
        if (d.head) {
          let want = Math.atan2(ax - d.pos.x, az - d.pos.z) - Math.PI / 2;
          d.head.rotation.y = want;
        }

        if (def.key === 'lance' && d.cd <= 0) {
          d.cd = def.interval;
          const dir = new THREE.Vector3(ax - d.pos.x, 0, az - d.pos.z).normalize();
          const from = new THREE.Vector3(d.pos.x + dir.x * 0.5, 1.65, d.pos.z + dir.z * 0.5);
          game.projectiles.fire({
            pos: from, dir, speed: def.projSpeed, damage: (d.damage || def.damage) * res,
            color: def.color, glow: def.glow, size: 0.8, life: 1.5,
            trail: true, pierce: 0, fromTower: true, element: def.element,
          });
          this.fx.beam(from, new THREE.Vector3(ax, 1.1, az), def.glow, 0.06, 0.08);
          game.audio.shoot('lumen');
        } else if (def.key === 'ward' && d.cd <= 0) {
          d.cd = def.interval;
          game.damageEnemy(target, (d.damage || def.damage) * res, { color: def.color, silent: true, element: def.element });
          this.fx.arc(new THREE.Vector3(d.pos.x, 2.25, d.pos.z), new THREE.Vector3(target.pos.x, 1, target.pos.z), def.glow, 0.2);
          this.fx.ring(target.pos, def.color, { r0: 0.2, r1: 1.6, life: 0.3, opacity: 0.6 });
          game.audio.hit();
        } else if (def.key === 'maul' && d.cd <= 0) {
          d.cd = def.interval;
          game.areaDamage(d.pos, d.range || def.range, (d.damage || def.damage) * res, { color: def.color, fromTower: true, element: def.element });
          this.fx.ring(d.pos, def.color, { r0: 0.5, r1: d.range || def.range, life: 0.55, opacity: 0.65 });
          game.engine.addShake(0.12);
        } else if (def.key === 'pyre' && d.cd <= 0) {
          d.cd = def.interval;
          const reach = d.range || def.range;
          const caught = game.enemies.list
            .filter(e => !e.dead && Math.hypot(e.pos.x - d.pos.x, e.pos.z - d.pos.z) < reach)
            .slice(0, 3);
          for (const e of caught) {
            game.damageEnemy(e, (d.damage || def.damage) * res, { color: def.color, element: def.element });
            if (!e.dead) e.applyBurn(4, 2.2);
          }
          this.fx.ring(d.pos, def.color, { r0: 0.4, r1: reach, life: 0.45, opacity: 0.5 });
          game.audio.hit();
        } else if (def.key === 'galecore' && d.cd <= 0) {
          d.cd = def.interval;
          let src = target;
          for (let k = 0; k < 3 && src; k++) {
            game.damageEnemy(src, (d.damage || def.damage) * res, { color: def.color, element: def.element, silent: k > 0 });
            this.fx.arc(new THREE.Vector3(d.pos.x, 1.5, d.pos.z), new THREE.Vector3(src.pos.x, 1, src.pos.z), def.glow, 0.12);
            const prev = src;
            src = game.enemies.nearest(prev.pos, 7, e => !e.dead && e !== prev);
          }
          game.audio.shoot('gale');
        } else if (def.key === 'gloom' && d.cd <= 0) {
          d.cd = def.interval;
          const dealt = game.damageEnemy(target, (d.damage || def.damage) * res, { color: def.color, element: def.element });
          if (game.player) game.player.heal(dealt * 0.25, true);
          this.fx.beam(new THREE.Vector3(d.pos.x, 1.5, d.pos.z), new THREE.Vector3(target.pos.x, 1, target.pos.z), def.glow, 0.35, 0.5);
          game.audio.hit();
        }
      }

      if (def.key === 'ward') {
        for (const e of game.enemies.list) {
          if (e.dead) continue;
          const dx = e.pos.x - d.pos.x, dz = e.pos.z - d.pos.z;
          if (dx * dx + dz * dz < def.slowRadius * def.slowRadius) e.applySlow(def.slow, 0.35);
        }
      }

      if (d.hp / d.maxHp < 0.34 && Math.random() < dt * 6) {
        this.fx.trail(new THREE.Vector3(d.pos.x + (Math.random() - 0.5) * 0.8, 1 + Math.random(), d.pos.z + (Math.random() - 0.5) * 0.8), 0xff6a3a, 0.2, 0.6);
      }
    }
  }

  /* ---------------- TEARDOWN ---------------- */
  clear() {
    if (this.core?.group) {
      this.scene.remove(this.core.group);
      this._disposeGroup(this.core.group);
    }
    for (const ped of this.pedestals) {
      this.scene.remove(ped.group);
      this._disposeGroup(ped.group);
    }
    for (const d of this.defenses) {
      this.scene.remove(d.group);
      this._disposeGroup(d.group);
    }
    for (const g of this.gates) {
      this.scene.remove(g.group);
      this._disposeGroup(g.group);
    }
    if (this.laneStrips) {
      this.scene.remove(this.laneStrips);
      this._disposeGroup(this.laneStrips);
    }
    this.defenses.length = 0;
    this.pedestals.length = 0;
    this.gates.length = 0;
    this.lanes.length = 0;
    this.laneStrips = null;
    this.core = null;
  }

  _disposeGroup(group) {
    group.traverse((o) => {
      if (o.geometry) o.geometry.dispose?.();
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m.dispose?.();
      }
    });
  }
}

/* ============================================================
   SOLAR CARAVAN — the escort objective.
   It only advances while you stand beside it and nothing contests it.
   ============================================================ */
export class Caravan {
  constructor(scene, fx, audio, mods = {}) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    // Difficulty bends the objective, not just the horde.
    this.speed = ESCORT.speed * (mods.escortSpeed || 1);
    this.holdTime = ESCORT.waystoneClearTime * (mods.waystoneHold || 1);
    this.decayRate = ESCORT.decay * (mods.escortDecay || 1);
    // The pilgrim road is a polyline, so the reliquary walks the length of it instead of
    // running straight at the rift — the escort is a journey, not a sprint.
    this.path = [];
    let walked = 0;
    for (let i = 0; i < (ESCORT.route || [[0, 0]]).length; i++) {
      const [x, z] = ESCORT.route[i];
      if (i > 0) walked += Math.hypot(x - this.path[i - 1].x, z - this.path[i - 1].z);
      this.path.push({ x, z, d: walked });
    }
    this.totalDist = Math.max(1, walked);
    this.dist = 0;
    const head = this.path[0], tail = this.path[this.path.length - 1];
    this.angle = Math.atan2(tail.z - head.z, tail.x - head.x);
    this.pos = this.posAt(0);
    this.hp = ESCORT.hp;
    this.maxHp = ESCORT.hp;
    this.alive = true;
    this.arrived = false;
    this.progress = 0;
    this.escorted = false;
    this.contested = false;
    this._hitCd = 0;
    this._flash = 0;
    this._t = 0;

    const group = new THREE.Group();
    group.position.copy(this.pos);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1b2a22, roughness: 0.5, metalness: 0.55 });
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x9dffc4, emissive: 0x4ee08a, emissiveIntensity: 1.3,
      roughness: 0.2, metalness: 0.4, toneMapped: false,
    });
    const trimMat = new THREE.MeshBasicMaterial({ color: 0xbaffd9, toneMapped: false });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.32, 8), baseMat);
    base.position.y = 0.16;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.72, 0), bodyMat);
    core.scale.set(1, 1.7, 1);
    core.position.y = 1.75;
    core.castShadow = true;
    group.add(core);

    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.95 + i * 0.22, 0.024, 6, 40), trimMat);
      ring.position.y = 1.75;
      ring.rotation.x = Math.PI / 2.4 + i * 0.5;
      ring.rotation.z = i * 0.8;
      group.add(ring);
    }

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(240,255,245,.95)', 'rgba(110,255,175,.3)', 'rgba(30,160,100,0)'),
      color: 0x8dffc0, transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    glow.scale.set(7, 7, 1);
    glow.position.y = 1.8;
    group.add(glow);

    const groundMat = new THREE.MeshBasicMaterial({
      color: 0x7dffb4, transparent: true, opacity: 0.3, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const ground = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.5, 48), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.04;
    group.add(ground);

    const light = new THREE.PointLight(0x6dffa8, 1.6, 16, 2);
    light.position.y = 2;
    group.add(light);

    scene.add(group);
    this.group = group;
    this.core = core;
    this.bodyMat = bodyMat;
    this.glow = glow;
    this.ground = ground;
    this.groundMat = groundMat;
    this.light = light;

    // Destination marker at the eastern rift.
    const goalPos = this.posAt(this.totalDist);
    const markerMat = new THREE.MeshBasicMaterial({
      color: 0x8dffc0, transparent: true, opacity: 0.28, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const marker = new THREE.Mesh(new THREE.RingGeometry(3.2, 4.4, 64), markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.copy(goalPos).setY(0.045);
    scene.add(marker);
    this.marker = marker;
    this.markerMat = markerMat;
    this.goalPos = goalPos;

    // Waystones along the road: the reliquary stops here until the ground is clear.
    this.waystones = (ESCORT.waystones || []).map((f, i) => {
      const d = f * this.totalDist;
      const pos = this.posAt(d);
      const group = new THREE.Group();
      group.position.copy(pos);

      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1b2a22, roughness: 0.55, metalness: 0.5 });
      const side = new THREE.Vector3(Math.cos(this.angle + Math.PI / 2), 0, Math.sin(this.angle + Math.PI / 2)).multiplyScalar(3.1);
      const obelisk = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.5, 4), stoneMat);
      obelisk.position.set(side.x, 1.25, side.z);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.castShadow = true;
      group.add(obelisk);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x8dffc0, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.2, 48), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      group.add(ring);

      scene.add(group);
      return { f, d, pos, group, ring, ringMat, reached: false, index: i };
    });
    this.nextWaystone = this.waystones[0] || null;
    this.atWaystone = null;
    this.wayFoes = 0;
    this._clearT = 0;
    this.charge = 0;
    this.pulses = 0;
  }

  /* Where the reliquary sits after walking d metres down the pilgrim road. */
  posAt(d) {
    const path = this.path;
    const at = Math.max(0, Math.min(this.totalDist, d));
    for (let i = 1; i < path.length; i++) {
      if (at <= path[i].d) {
        const a = path[i - 1], b = path[i];
        const f = (at - a.d) / Math.max(0.0001, b.d - a.d);
        return new THREE.Vector3(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f);
      }
    }
    const end = path[path.length - 1];
    return new THREE.Vector3(end.x, 0, end.z);
  }

  /* The checkpoint the wayfinder should point at: the next unlit waystone,
     and the eastern rift once every stone is behind the reliquary. */
  get target() {
    const ws = this.waystones.find((w) => !w.reached);
    if (ws) return { pos: ws.pos, label: 'WAYSTONE ' + (ws.index + 1) + '/' + this.waystones.length };
    return { pos: this.goalPos, label: 'THE RIFT' };
  }

  update(dt, game) {
    if (!this.alive) return;
    this._t += dt;
    const t = this._t;

    const p = game.player;
    const dist = p ? Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) : 99;
    this.escorted = dist <= ESCORT.escortRadius;

    let foes = 0;
    for (const e of game.enemies.list) {
      if (e.dead) continue;
      if (Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) <= ESCORT.contestedRadius + (e.radius || 0) * 0.4) foes++;
    }
    this.contested = foes > 0;
    this.foes = foes;

    // Waystones — the reliquary halts until the ground around the stone is clear.
    this.atWaystone = null;
    const ws = this.waystones.find(w => !w.reached) || null;
    this.nextWaystone = ws;
    if (ws && this.dist >= ws.d - 0.35) {
      this.dist = ws.d;
      this.pos.copy(this.posAt(this.dist));
      this.group.position.copy(this.pos);
      this.atWaystone = ws;
      let near = 0;
      for (const e of game.enemies.list) {
        if (e.dead) continue;
        if (Math.hypot(e.pos.x - ws.pos.x, e.pos.z - ws.pos.z) <= ESCORT.waystoneHoldRadius) near++;
      }
      this.wayFoes = near;
      if (this.escorted && near === 0) this._clearT += dt;
      else this._clearT = 0;
      if (this._clearT >= this.holdTime) {
        ws.reached = true;
        ws.ringMat.color.setHex(0xffe6a8);
        this._clearT = 0;
        this.atWaystone = null;
        this.fx.ring(ws.pos, 0x8dffc0, { r0: 1, r1: 9, life: 1.1, opacity: 0.85 });
        game.onCaravanWaystone(ws.index);
      }
    }

    if (this.escorted && !this.contested && !this.atWaystone) {
      this.dist = Math.min(this.totalDist, this.dist + this.speed * dt);
      this.pos.copy(this.posAt(this.dist));
      this.group.position.copy(this.pos);
      if (Math.random() < dt * 14) {
        this.fx.trail(new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 1.4, 0.6, this.pos.z + (Math.random() - 0.5) * 1.4), 0x8dffc0, 0.14, 0.4);
      }
    }

    this.progress = Math.max(0, Math.min(1, this.dist / this.totalDist));

    this.core.rotation.y += dt * 0.8;
    this.core.position.y = 1.75 + Math.sin(t * 2) * 0.1;
    this.glow.material.opacity = 0.5 + Math.sin(t * 2.2) * 0.12;
    this.groundMat.opacity = (this.contested ? 0.16 : 0.28) + Math.sin(t * 1.7) * 0.06;
    this.ground.scale.setScalar(this.contested ? 0.9 : 1);
    this.markerMat.opacity = 0.18 + Math.sin(t * 1.8) * 0.08;
    this.marker.rotation.z += dt * 0.3;

    for (const w of this.waystones) {
      const active = !w.reached && w === this.nextWaystone;
      w.ringMat.opacity = w.reached ? 0.4 : active ? 0.2 + Math.sin(t * 2.6) * 0.1 : 0.12;
      w.ring.rotation.z += dt * 0.35;
    }

    // Dawn pulse — the reliquary answers the horde while you walk beside it.
    if (this.escorted) this.charge = Math.min(1, this.charge + dt / ESCORT.pulseChargeTime);
    if (this.charge >= 1 && this.contested) {
      this.charge = 0;
      this.pulses++;
      this.fx.ring(this.pos, 0x8dffc0, { r0: 0.8, r1: ESCORT.pulseRadius, life: 0.85, opacity: 0.9 });
      this.fx.burst(new THREE.Vector3(this.pos.x, 1.4, this.pos.z), 0x8dffc0, { count: 44, speed: 12, size: 0.3, life: 0.8, up: 2 });
      this.audio?.surge?.();
      for (const e of game.enemies.list) {
        if (e.dead) continue;
        if (Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) <= ESCORT.pulseRadius) {
          game.damageEnemy(e, ESCORT.pulseDamage + (game.wave || 1) * ESCORT.pulseWaveDamage, { color: 0x8dffc0, element: 'lumen' });
        }
      }
      game.ui.toast('DAWN PULSE · THE RELIQUARY CLEARS THE ROAD', '#8dffc0');
    }
    this.light.intensity = (this.contested ? 1.1 : 1.7) + Math.sin(t * 2.4) * 0.25;

    if (this._flash > 0) {
      this._flash -= dt;
      this.bodyMat.emissiveIntensity = 2.6;
    } else {
      this.bodyMat.emissiveIntensity = 1.3;
    }

    if (this.dist >= this.totalDist - 0.05) {
      this.arrived = true;
      this.alive = false;
      this.fx.ring(this.pos, 0x8dffc0, { r0: 1, r1: 14, life: 1.3, opacity: 0.9 });
      this.fx.burst(new THREE.Vector3(this.pos.x, 2, this.pos.z), 0x8dffc0, { count: 60, speed: 11, size: 0.36, life: 1.4, up: 5 });
      game.onCaravanArrived();
      return;
    }

    // Abandoning the reliquary lets the dark gnaw at it.
    if (!this.escorted && !this.contested) {
      this.hp = Math.max(0, this.hp - this.decayRate * dt);
      if (this.hp <= 0) {
        this.alive = false;
        this.fx.burst(new THREE.Vector3(this.pos.x, 1.8, this.pos.z), 0x8dffc0, { count: 70, speed: 13, size: 0.4, life: 1.6, up: 5 });
        this.fx.ring(this.pos, 0xff8a52, { r0: 0.5, r1: 12, life: 1.2, opacity: 0.8 });
        this.audio?.death?.();
        game.onCaravanLost();
        return;
      }
    }

    // The horde tears at the reliquary whenever it is close enough.
    this._hitCd -= dt;
    if (foes > 0 && this._hitCd <= 0) {
      this._hitCd = ESCORT.damageInterval;
      const dmg = (ESCORT.damagePerEnemy + game.wave * ESCORT.waveDamage) * Math.min(6, foes);
      this.hp = Math.max(0, this.hp - dmg);
      this._flash = 0.14;
      this.fx.number(new THREE.Vector3(this.pos.x, 2.8, this.pos.z), '-' + Math.round(dmg), '');
      this.fx.ring(this.pos, 0xff7a52, { r0: 0.4, r1: 2.4, life: 0.35, opacity: 0.6 });
      game.engine.addShake(0.1);
      if (this.hp <= 0) {
        this.alive = false;
        this.fx.burst(new THREE.Vector3(this.pos.x, 1.8, this.pos.z), 0x8dffc0, { count: 70, speed: 13, size: 0.4, life: 1.6, up: 5 });
        this.fx.ring(this.pos, 0xff8a52, { r0: 0.5, r1: 12, life: 1.2, opacity: 0.8 });
        this.audio?.death?.();
        game.onCaravanLost();
      }
    }
  }

  clear() {
    if (this.group) {
      this.scene.remove(this.group);
      this.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) o.material.dispose?.();
      });
    }
    if (this.marker) {
      this.scene.remove(this.marker);
      this.marker.geometry?.dispose?.();
      this.markerMat?.dispose?.();
    }
    for (const w of this.waystones || []) {
      this.scene.remove(w.group);
      w.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) o.material.dispose?.();
      });
    }
    this.waystones = [];
    this.group = null;
    this.marker = null;
  }
}

/* ============================================================
   EMBER RITUAL — three circles that must be held and charged.
   ============================================================ */
export class Ritual {
  constructor(scene, fx, audio, mods = {}) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.chargeTime = RITUAL.chargeTime * (mods.ritualCharge || 1);
    this.shrines = [];
    this.sealed = 0;
    this.contestedCount = 0;
    this.done = false;
    this._t = 0;

    for (let i = 0; i < RITUAL.shrineCount; i++) {
      const angle = -Math.PI / 2 + (i / RITUAL.shrineCount) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(angle) * RITUAL.shrineRadius, 0, Math.sin(angle) * RITUAL.shrineRadius);
      const group = new THREE.Group();
      group.position.copy(pos);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffc14d, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(RITUAL.standRadius - 0.24, RITUAL.standRadius, 64), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      group.add(ring);

      const discMat = new THREE.MeshBasicMaterial({
        color: 0xff9a3a, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(RITUAL.standRadius - 0.3, 48), discMat);
      disc.rotation.x = -Math.PI / 2;
      disc.position.y = 0.035;
      group.add(disc);

      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1c1922, roughness: 0.55, metalness: 0.5 });
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 0.28), stoneMat);
        pillar.position.set(Math.cos(a) * (RITUAL.standRadius + 0.35), 0.75, Math.sin(a) * (RITUAL.standRadius + 0.35));
        pillar.castShadow = true;
        group.add(pillar);
      }

      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xffd166, transparent: true, opacity: 0.5, toneMapped: false,
      });
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.36, 1.1, 8), flameMat);
      flame.position.y = 1.1;
      group.add(flame);

      const beamMat = new THREE.MeshBasicMaterial({
        color: 0xffc14d, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      });
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.52, 1, 10, 1, true), beamMat);
      beam.position.y = 1.4;
      group.add(beam);

      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,240,200,.9)', 'rgba(255,170,60,.3)', 'rgba(255,90,20,0)'),
        color: 0xffc14d, transparent: true, opacity: 0.4,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      glow.scale.set(5, 5, 1);
      glow.position.y = 1.5;
      group.add(glow);

      const light = new THREE.PointLight(0xffa63a, 0.8, 14, 2);
      light.position.y = 1.5;
      group.add(light);

      scene.add(group);
      this.shrines.push({
        index: i, pos, group, ring, ringMat, disc, discMat, flame, flameMat, beam, beamMat, glow, light,
        charge: 0, sealed: false, contested: false,
      });
    }
  }

  update(dt, game) {
    if (this.done) return;
    this._t += dt;
    const t = this._t;
    let contested = 0;

    for (const s of this.shrines) {
      const pNear = !!game.player && Math.hypot(game.player.pos.x - s.pos.x, game.player.pos.z - s.pos.z) <= RITUAL.standRadius;
      let foes = 0;
      if (!s.sealed) {
        for (const e of game.enemies.list) {
          if (e.dead) continue;
          if (Math.hypot(e.pos.x - s.pos.x, e.pos.z - s.pos.z) <= RITUAL.standRadius + (e.radius || 0) * 0.3) foes++;
        }
      }
      s.contested = foes > 0;
      if (s.contested) contested++;

      if (!s.sealed) {
        if (foes > 0) {
          s.charge = Math.max(0, s.charge - dt * RITUAL.contestDecay * (pNear ? 0.6 : 1));
        } else if (pNear) {
          s.charge = Math.min(1, s.charge + dt / this.chargeTime);
          if (Math.random() < dt * 10) {
            this.fx.trail(new THREE.Vector3(s.pos.x + (Math.random() - 0.5) * 2.4, 0.5 + Math.random() * 1.6, s.pos.z + (Math.random() - 0.5) * 2.4), 0xffc14d, 0.13, 0.4);
          }
        } else {
          s.charge = Math.max(0, s.charge - dt * RITUAL.decay);
        }
        if (s.charge >= 1) {
          s.sealed = true;
          this.fx.ring(s.pos, 0xffd166, { r0: 0.6, r1: 7, life: 0.9, opacity: 0.9 });
          this.fx.burst(new THREE.Vector3(s.pos.x, 1.4, s.pos.z), 0xffd166, { count: 34, speed: 8, size: 0.3, life: 1, up: 3.4 });
          this.audio?.fusion?.();
          game.onShrineSealed(s);
        }
      }

      const charge = s.sealed ? 1 : s.charge;
      s.ringMat.opacity = 0.14 + charge * 0.5 + Math.sin(t * 2 + s.index) * 0.04;
      s.ringMat.color.setHex(s.contested ? 0xff6a4a : s.sealed ? 0xfff0c0 : 0xffc14d);
      s.discMat.opacity = 0.05 + charge * 0.16;
      s.flame.scale.setScalar(0.7 + charge * 0.9);
      s.flame.position.y = 1.05 + Math.sin(t * 3 + s.index) * 0.08;
      s.flameMat.opacity = 0.32 + charge * 0.6;
      s.beam.scale.y = 0.5 + charge * 5.5;
      s.beam.position.y = 0.8 + s.beam.scale.y * 0.5;
      s.beamMat.opacity = 0.1 + charge * 0.22;
      s.glow.material.opacity = 0.3 + charge * 0.35;
      s.light.intensity = 0.6 + charge * 1.5;
    }

    this.sealed = this.shrines.filter(s => s.sealed).length;
    this.contestedCount = contested;
    if (this.sealed >= RITUAL.shrineCount && !this.done) {
      this.done = true;
      game.onRitualComplete();
    }
  }

  clear() {
    for (const s of this.shrines) {
      this.scene.remove(s.group);
      s.group.traverse((o) => {
        if (o.geometry) o.geometry.dispose?.();
        if (o.material) o.material.dispose?.();
      });
    }
    this.shrines.length = 0;
  }
}
