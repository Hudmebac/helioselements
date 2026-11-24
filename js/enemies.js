/* ============================================================
   HELIOS ELEMENTS — ENEMIES
   Periodic Horde, behaviours, bosses and the horde manager.
   ============================================================ */

import { ENEMIES, BOSSES, ELEMENTS, ESCORT } from './data.js';
import { arenaClamp, arenaRadiusAt, glowTexture, shadowTexture, sigilTexture } from './engine.js';

const shadowMat = new THREE.MeshBasicMaterial({
  map: shadowTexture(), transparent: true, opacity: 0.42, depthWrite: false, color: 0x000000,
});
shadowMat.userData.shared = true;
const shadowGeo = new THREE.CircleGeometry(1, 20);

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

export class EnemyManager {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.list = [];
    this.boss = null;
  }

  spawn(typeKey, opts = {}) {
    const type = ENEMIES[typeKey];
    if (!type) return null;
    const e = new Enemy(type, opts);
    this.scene.add(e.group);
    this.list.push(e);
    this.fx.ring(e.pos, e.elite ? 0xffb066 : e.color, { r0: 0.4, r1: e.radius * 2.6, life: 0.6, opacity: 0.55 });
    this.fx.burst(new THREE.Vector3(e.pos.x, 0.8, e.pos.z), e.color, { count: e.isBoss ? 30 : 10, speed: 4, size: 0.22, life: 0.5, up: 2 });
    if (e.isBoss) this.boss = e;
    return e;
  }

  update(dt, game) {
    const alive = [];
    for (const e of this.list) {
      if (e.dead) {
        if (!e._corpse) {
          this.scene.remove(e.group);
          e.dispose();
        }
        continue;
      }
      e.update(dt, game);
      if (!e.dead) alive.push(e);
    }
    this.list = alive;
    if (this.boss && (this.boss.dead || !this.list.includes(this.boss))) this.boss = null;
  }

  nearest(pos, range, filter = null) {
    let best = null, bestD = range * range;
    for (const e of this.list) {
      if (e.dead) continue;
      if (filter && !filter(e)) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  all() { return this.list; }
  count() { return this.list.length; }

  clear() {
    for (const e of this.list) { this.scene.remove(e.group); e.dispose(); }
    this.list = [];
    this.boss = null;
  }
}

export class Enemy {
  constructor(type, opts = {}) {
    this.type = type;
    this.key = type.key;
    this.isBoss = !!type.boss;
    this.elite = !!opts.elite && !this.isBoss;
    this.bossIndex = opts.bossIndex ?? 0;

    const hpMult = opts.hpMult ?? 1;
    const dmgMult = opts.dmgMult ?? 1;
    const spdMult = opts.speedMult ?? 1;

    let hp = type.hp * hpMult;
    if (this.elite) hp *= 2.4;
    if (this.isBoss) hp *= 1 + this.bossIndex * 0.45;
    this.maxHp = Math.round(hp);
    this.hp = this.maxHp;
    this.speed = type.speed * spdMult * (this.elite ? 1.08 : 1) * (this.isBoss ? 1 : 1);
    this.damage = type.damage * dmgMult * (this.elite ? 1.35 : 1);
    this.radius = type.radius * (this.elite ? 1.2 : 1);
    this.xp = type.xp * (this.elite ? 2.5 : 1);
    this.color = this.isBoss ? (BOSSES[this.bossIndex % BOSSES.length].color) : type.color;
    this.glow = this.isBoss ? (BOSSES[this.bossIndex % BOSSES.length].glow) : type.glow;
    this.name = this.isBoss ? BOSSES[this.bossIndex % BOSSES.length].name : (this.elite ? 'Elite ' + type.name : type.name);
    this.element = this.isBoss
      ? (BOSSES[this.bossIndex % BOSSES.length].element || null)
      : (type.element || null);
    this.flying = !!type.flying;
    this.miniBoss = !!type.miniBoss;
    this.laneAngle = opts.laneAngle ?? null;
    this.dead = false;
    this._corpse = false;

    const a = opts.angle ?? Math.random() * Math.PI * 2;
    const r = opts.radius ?? (arenaRadiusAt(a) - 3);
    this.pos = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);

    this.burn = { dps: 0, until: 0 };
    this.slow = { amount: 0, until: 0 };
    this.knock = new THREE.Vector3();
    this.attackCd = 0.4 + Math.random() * 0.5;
    this.vx = 0;
    this.vz = 0;
    this.flashT = 0;
    this.spawnT = 0.45;
    this.phase = Math.random() * 6.28;
    this.bob = 0;
    this.arab = Math.random() * 6.28;

    // boss timers
    this.volleyT = 3.2;
    this.volleyCd = 2.2 + Math.random() * 2.4;
    this.chargeT = 6.5;
    this.summonT = 11;
    this.chargeWind = 0;
    this.chargeTime = 0;
    this.chargeDir = new THREE.Vector3();
    this.enraged = false;
    this.ringSpd = 0.6;

    this._buildMesh();
    this.group.position.set(this.pos.x, this.baseY, this.pos.z);
    this.group.scale.setScalar(0.01);
  }

  _buildMesh() {
    const t = this.type;
    const group = new THREE.Group();
    const scale = this.isBoss ? 1.35 : this.miniBoss ? 1.18 : 1;
    this.baseY = this.flying ? 1.55 : 0.7;
    this.scale = scale;

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.setScalar(this.radius * (this.isBoss ? 2.1 : 1.55));
    shadow.position.y = -this.baseY + 0.055;
    group.add(shadow);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.color, emissive: this.glow, emissiveIntensity: 0.5,
      roughness: 0.5, metalness: 0.35, flatShading: true,
    });
    this.bodyMat = bodyMat;
    this.baseEmissive = this.isBoss ? 0.7 : this.miniBoss ? 0.62 : 0.5;
    bodyMat.emissiveIntensity = this.baseEmissive;

    const accentMat = new THREE.MeshBasicMaterial({ color: this.glow, toneMapped: false });
    this.accentMat = accentMat;

    if (t.shape === 'crawler') {
      const body = new THREE.Mesh(geo('crawler', () => new THREE.IcosahedronGeometry(0.62, 1)), bodyMat);
      body.scale.set(1.1, 0.85, 1.15);
      group.add(body);
      this.body = body;
      // A ridge of embers along the back: the crawler reads as cinder, not a blob.
      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(geo('crawlerSpike', () => new THREE.ConeGeometry(0.11, 0.34, 4)), accentMat);
        spike.position.set(0, 0.4 - i * 0.03, 0.34 - i * 0.3);
        spike.rotation.x = -0.45;
        group.add(spike);
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const leg = new THREE.Mesh(geo('leg', () => new THREE.ConeGeometry(0.085, 0.5, 4)), accentMat);
        leg.position.set(Math.cos(a) * 0.6, -0.28, Math.sin(a) * 0.6);
        leg.rotation.z = Math.cos(a) * 1.1;
        leg.rotation.x = Math.sin(a) * 1.1;
        group.add(leg);
      }
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0, toneMapped: false });
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.09, 8, 8)), eyeMat);
        eye.position.set(s * 0.22, 0.14, 0.5);
        group.add(eye);
      }
    } else if (t.shape === 'wisp') {
      const body = new THREE.Mesh(geo('wisp', () => new THREE.OctahedronGeometry(0.55, 0)), bodyMat);
      body.scale.set(0.9, 1.7, 0.9);
      group.add(body);
      this.body = body;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,255,255,.9)', 'rgba(220,200,255,.3)', 'rgba(160,120,255,0)'),
        color: this.glow, transparent: true, opacity: 0.55,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      halo.scale.set(2.6, 2.6, 1);
      group.add(halo);
      this.halo = halo;
    } else if (t.shape === 'brute') {
      const body = new THREE.Mesh(geo('brute', () => new THREE.DodecahedronGeometry(1.05, 1)), bodyMat);
      body.scale.set(1, 0.92, 0.95);
      group.add(body);
      this.body = body;
      // Shoulder horns and a lit chest: a brute should look like it was carved.
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(geo('bruteHorn', () => new THREE.ConeGeometry(0.16, 0.72, 4)), accentMat);
        horn.position.set(s * 0.74, 0.5, 0.06);
        horn.rotation.z = s * -0.55;
        group.add(horn);
      }
      const chest = new THREE.Mesh(geo('bruteChest', () => new THREE.SphereGeometry(0.17, 10, 8)), accentMat);
      chest.position.set(0, 0.12, 0.93);
      group.add(chest);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.5 });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const plate = new THREE.Mesh(geo('plate', () => new THREE.BoxGeometry(0.5, 0.62, 0.16)), plateMat);
        plate.position.set(Math.cos(a) * 0.78, 0.2, Math.sin(a) * 0.78);
        plate.rotation.y = -a;
        group.add(plate);
      }
      const crackMat = new THREE.MeshBasicMaterial({ color: this.glow, toneMapped: false });
      for (let i = 0; i < 3; i++) {
        const crack = new THREE.Mesh(geo('crack', () => new THREE.BoxGeometry(0.06, 0.3, 0.9)), crackMat);
        crack.position.set(-0.3 + i * 0.3, 0.15, 0.02);
        crack.rotation.x = 0.3 * (i - 1);
        group.add(crack);
      }
    } else if (t.shape === 'spitter') {
      const body = new THREE.Mesh(geo('spitter', () => new THREE.SphereGeometry(0.6, 18, 14)), bodyMat);
      group.add(body);
      this.body = body;
      // Three lens fins, fanned like a sun dial.
      for (let i = 0; i < 3; i++) {
        const a = -0.9 + i * 0.9;
        const fin = new THREE.Mesh(geo('spitterFin', () => new THREE.ConeGeometry(0.12, 0.44, 4)), accentMat);
        fin.position.set(Math.sin(a) * 0.68, 0.26, Math.cos(a) * 0.46);
        fin.rotation.x = -0.4;
        fin.rotation.z = a * 0.3;
        group.add(fin);
      }
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.05, 6, 24),
        new THREE.MeshBasicMaterial({ color: this.glow, transparent: true, opacity: 0.75, toneMapped: false })
      );
      ring.rotation.x = Math.PI / 2.4;
      group.add(ring);
      this.haloRing = ring;
      const eye = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.17, 10, 10)), new THREE.MeshBasicMaterial({ color: 0xfff6d8, toneMapped: false }));
      eye.position.set(0, 0.1, 0.52);
      group.add(eye);
      const pupil = new THREE.Mesh(geo('pupil', () => new THREE.SphereGeometry(0.08, 8, 8)), new THREE.MeshBasicMaterial({ color: 0x2a1200 }));
      pupil.position.set(0, 0.1, 0.63);
      group.add(pupil);
    } else {
      // boss — every warden has its own silhouette so the name on the banner
      // matches the shape in the arena.
      const bossKind = ((this.bossIndex % BOSSES.length) + BOSSES.length) % BOSSES.length;
      const seraph = bossKind === 5;
      this.seraph = seraph;
      if (seraph) {
        // Stormglass reads as pale glass, not a white flare: keep the body
        // darker than its wings and let the rim separate the silhouette.
        bodyMat.color.setHex(0x2f7388);
        bodyMat.emissive.setHex(0x4aaec7);
        bodyMat.emissiveIntensity = 0.24;
        this.baseEmissive = 0.24;
        bodyMat.roughness = 0.66;
        bodyMat.metalness = 0.22;
        accentMat.color.setHex(0x70d2ea);
      }
      let body;
      let coreY = 1.6;
      let ringRadius = 1.35;
      let haloScale = 8;

      if (bossKind === 1) { // Ashen Colossus — broad stone shoulders and furnace horns
        body = new THREE.Mesh(geo('bossColossus', () => new THREE.DodecahedronGeometry(1.05, 1)), bodyMat);
        body.scale.set(1.5, 1.05, 1.2);
        body.position.y = 1.15;
        for (const side of [-1, 1]) {
          const horn = new THREE.Mesh(geo('bossColossusHorn', () => new THREE.ConeGeometry(0.3, 1.45, 5)), accentMat);
          horn.position.set(side * 1.18, 1.95, 0.02);
          horn.rotation.z = side * -0.72;
          group.add(horn);
        }
        coreY = 1.35;
        ringRadius = 1.85;
        haloScale = 9.5;
      } else if (bossKind === 2) { // Void Herald — a floating octahedron inside a cage of shards
        body = new THREE.Mesh(geo('bossHerald', () => new THREE.OctahedronGeometry(1.0, 1)), bodyMat);
        body.scale.set(1.12, 1.42, 1.12);
        body.position.y = 1.65;
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2;
          const shard = new THREE.Mesh(geo('bossHeraldShard', () => new THREE.ConeGeometry(0.17, 1.7, 3)), accentMat);
          shard.position.set(Math.cos(a) * 0.9, 2.05, Math.sin(a) * 0.9);
          shard.rotation.z = Math.cos(a) * -0.28;
          shard.rotation.x = Math.sin(a) * 0.28;
          group.add(shard);
        }
        coreY = 1.65;
        ringRadius = 1.55;
        haloScale = 8.5;
      } else if (bossKind === 3) { // Helios Unbound — a sun-spire with a crown of rays
        body = new THREE.Mesh(geo('bossUnbound', () => new THREE.ConeGeometry(0.72, 3.9, 6)), bodyMat);
        body.position.y = 1.78;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const ray = new THREE.Mesh(geo('bossUnboundRay', () => new THREE.ConeGeometry(0.1, 1.0, 4)), accentMat);
          ray.position.set(Math.cos(a) * 0.92, 3.02 + (i % 2) * 0.12, Math.sin(a) * 0.92);
          ray.rotation.z = Math.cos(a) * -0.92;
          ray.rotation.x = Math.sin(a) * 0.92;
          group.add(ray);
        }
        coreY = 1.95;
        ringRadius = 1.6;
        haloScale = 9;
      } else if (bossKind === 4) { // Cinder Tyrant — a blocky iron king with a square crown
        body = new THREE.Mesh(geo('bossTyrant', () => new THREE.BoxGeometry(1.35, 2.8, 1.25)), bodyMat);
        body.position.y = 1.3;
        for (const side of [-1, 1]) {
          for (const front of [-1, 1]) {
            const horn = new THREE.Mesh(geo('bossTyrantHorn', () => new THREE.BoxGeometry(0.24, 0.95, 0.24)), accentMat);
            horn.position.set(side * 0.58, 2.58, front * 0.38);
            horn.rotation.z = side * -0.18;
            group.add(horn);
          }
        }
        coreY = 1.55;
        ringRadius = 1.45;
        haloScale = 8.5;
      } else if (bossKind === 5) { // Stormglass Seraph — a tall diamond with glass wings
        body = new THREE.Mesh(geo('bossSeraph', () => new THREE.OctahedronGeometry(0.9, 0)), bodyMat);
        body.scale.set(0.9, 1.8, 0.9);
        body.position.y = 1.6;
        for (const side of [-1, 1]) {
          const wing = new THREE.Mesh(geo('bossSeraphWing', () => new THREE.ConeGeometry(0.55, 1.95, 4)), accentMat);
          wing.scale.set(0.38, 1, 1.25);
          wing.position.set(side * 1.05, 1.82, -0.05);
          wing.rotation.z = side * 0.68;
          wing.rotation.x = 0.18;
          group.add(wing);
        }
        coreY = 1.7;
        ringRadius = 1.55;
        haloScale = 8.2;
      } else { // Rift Warden — the original rift-carved obelisk
        body = new THREE.Mesh(geo('boss', () => new THREE.CylinderGeometry(0.55, 1.0, 3.2, 6)), bodyMat);
        body.position.y = 1.2;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const spike = new THREE.Mesh(geo('bossSpike', () => new THREE.ConeGeometry(0.13, 1.1, 4)), accentMat);
          spike.position.set(Math.cos(a) * 0.72, 2.7, Math.sin(a) * 0.72);
          spike.rotation.z = Math.cos(a) * -0.35;
          spike.rotation.x = Math.sin(a) * 0.35;
          group.add(spike);
        }
      }
      group.add(body);
      this.body = body;

      const core = new THREE.Mesh(geo('bossCore', () => new THREE.SphereGeometry(0.34, 16, 12)), new THREE.MeshBasicMaterial({
        color: seraph ? 0x63d8f7 : 0xffffff,
        toneMapped: seraph,
      }));
      core.position.set(0, coreY, seraph ? 0.66 : 0);
      if (seraph) core.scale.setScalar(0.85);
      group.add(core);
      this.bossCore = core;
      for (let i = 0; i < 2; i++) {
        const ring = new THREE.Mesh(
          geo('bossRing' + i, () => new THREE.TorusGeometry(1, 0.045, 6, 40)),
          new THREE.MeshBasicMaterial({ color: i ? this.color : this.glow, transparent: true, opacity: 0.6, toneMapped: false })
        );
        ring.scale.setScalar(ringRadius + i * 0.3);
        ring.position.y = coreY - 0.1 + i * 0.5;
        ring.rotation.x = Math.PI / (2 + i);
        group.add(ring);
        if (i === 0) this.bossRingA = ring; else this.bossRingB = ring;
      }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,255,255,.85)', 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)'),
        color: this.glow, transparent: true, opacity: seraph ? 0.32 : 0.6,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      halo.scale.set(haloScale, haloScale, 1);
      halo.position.y = coreY - 0.1;
      group.add(halo);
      this.halo = halo;
    }

    // A thin additive rim separates every silhouette from the arena. It is
    // deliberately strongest on wardens and crowned enemies.
    const rimMat = new THREE.MeshBasicMaterial({
      color: this.glow, side: THREE.BackSide, transparent: true,
      opacity: this.isBoss ? 0.2 : this.miniBoss ? 0.15 : 0.08,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const rim = new THREE.Mesh(this.body.geometry, rimMat);
    rim.position.copy(this.body.position);
    rim.scale.copy(this.body.scale).multiplyScalar(this.isBoss ? 1.075 : 1.05);
    rim.renderOrder = 2;
    group.add(rim);
    this.rimMat = rimMat;

    // Orbiting shards and a lit heart: every creature carries its element with it.
    const orbGeo = geo('enemyShard', () => new THREE.TetrahedronGeometry(0.1, 0));
    this.orbiters = [];
    const orbCount = this.isBoss ? 5 : this.miniBoss ? 4 : 2;
    for (let i = 0; i < orbCount; i++) {
      const orb = new THREE.Mesh(orbGeo, accentMat);
      orb.userData = {
        a: (i / orbCount) * Math.PI * 2,
        r: (this.miniBoss ? 1.12 : 0.9) + (i % 2) * 0.18,
        h: 0.06 + (i % 3) * 0.2,
        s: 0.65 + i * 0.17,
      };
      group.add(orb);
      this.orbiters.push(orb);
    }

    if (this.miniBoss) {
      // Crowned: a mini-boss should never be mistaken for the horde around it.
      const auraMat = new THREE.MeshBasicMaterial({
        color: this.glow, transparent: true, opacity: 0.14, wireframe: true,
        depthWrite: false, toneMapped: false,
      });
      this.miniAura = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), auraMat);
      this.miniAura.position.y = 0.1;
      group.add(this.miniAura);
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8, toneMapped: false });
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const spike = new THREE.Mesh(geo('miniSpike', () => new THREE.ConeGeometry(0.11, 0.55, 4)), crownMat);
        spike.position.set(Math.cos(a) * 0.45, this.baseY * 0.9 + 0.35, Math.sin(a) * 0.45);
        spike.rotation.z = Math.cos(a) * -0.3;
        group.add(spike);
      }
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 26), crownMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.y = this.baseY * 0.9 + 0.55;
      group.add(crown);
    }

    if (this.elite) {
      const rMat = new THREE.MeshBasicMaterial({ color: 0xffc06a, transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      this.eliteRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.25, 32), rMat);
      this.eliteRing.rotation.x = -Math.PI / 2;
      this.eliteRing.position.y = -this.baseY + 0.05;
      group.add(this.eliteRing);
    }

    // Element badge: the sigil of whatever this thing is made of.
    const elMeta = this.element ? ELEMENTS[this.element] : null;
    this.badgeMat = new THREE.SpriteMaterial({
      map: sigilTexture(elMeta?.sigil || '✦', elMeta?.css || this.type.css || '#ff7a52'),
      transparent: true, opacity: 0.72, depthWrite: false, toneMapped: false,
    });
    this.badge = new THREE.Sprite(this.badgeMat);
    this.badge.scale.set(0.72, 0.36, 1);
    this.badge.position.y = this.isBoss ? 3.55 : this.flying ? 1.15 : 1.35;
    group.add(this.badge);

    // Hostile ground ring: red says "this wants you dead", whatever its element.
    const threatR = this.radius * (this.isBoss ? 2.0 : 1.5);
    const threatMat = new THREE.MeshBasicMaterial({
      color: 0xff4230, transparent: true, opacity: this.isBoss ? 0.4 : 0.26,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const threat = new THREE.Mesh(new THREE.RingGeometry(threatR * 0.8, threatR, 44), threatMat);
    threat.rotation.x = -Math.PI / 2;
    threat.position.y = -this.baseY + 0.05;
    group.add(threat);

    group.scale.setScalar(scale);
    this.group = group;
  }

  applyBurn(dps, duration) {
    this.burn.dps = Math.max(this.burn.dps, dps);
    this.burn.until = Math.max(this.burn.until, duration);
    this.burn.tick = 0;
  }

  applySlow(amount, duration) {
    this.slow.amount = Math.max(this.slow.amount, amount);
    this.slow.until = Math.max(this.slow.until, duration);
  }

  applyKnockback(dir, power) {
    const resist = this.isBoss ? 0.15 : this.key === 'brute' ? 0.35 : 1;
    this.knock.addScaledVector(dir, power * resist);
  }

  flash() {
    this.flashT = 0.09;
    this.bodyMat.emissiveIntensity = 3.4;
  }

  update(dt, game) {
    const player = game.player;
    const fx = game.fx;
    const prevX = this.pos.x;
    const prevZ = this.pos.z;

    // spawn pop
    if (this.spawnT > 0) {
      this.spawnT -= dt;
      const t = 1 - Math.max(0, this.spawnT) / 0.45;
      const e = 1 - Math.pow(1 - t, 3);
      this.group.scale.setScalar(this.scale * (0.25 + e * 0.75));
    }

    // burn
    if (this.burn.until > 0) {
      this.burn.until -= dt;
      this.burn.tick = (this.burn.tick || 0) - dt;
      if (this.burn.tick <= 0) {
        this.burn.tick = 0.5;
        game.damageEnemy(this, this.burn.dps * 0.5, { color: 0xff7a3a, dot: true, silent: true });
        if (this.dead) return;
        fx.trail(new THREE.Vector3(this.pos.x, this.baseY + Math.random(), this.pos.z), 0xff8a4a, 0.18, 0.4);
      }
    }

    if (this.slow.until > 0) this.slow.until -= dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.bodyMat.emissiveIntensity = this.isBoss && this.enraged ? this.baseEmissive * 2 : this.baseEmissive;
    }

    const playerDx = player.pos.x - this.pos.x;
    const playerDz = player.pos.z - this.pos.z;
    const playerDist = Math.hypot(playerDx, playerDz) || 1;
    const target = this._targetFor(game);

    const dx = target.pos.x - this.pos.x;
    const dz = target.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz) || 1;
    let nx = dx / dist, nz = dz / dist;
    // Lane minions keep to their lane instead of cutting across the arena.
    if (this.laneAngle != null && target.kind === 'core') {
      const px = -Math.sin(this.laneAngle), pz = Math.cos(this.laneAngle);
      const lateral = this.pos.x * px + this.pos.z * pz;
      const pull = Math.max(-0.85, Math.min(0.85, -lateral * 0.2));
      nx += px * pull;
      nz += pz * pull;
      const m = Math.hypot(nx, nz) || 1;
      nx /= m; nz /= m;
    }
    const slowFactor = this.slow.until > 0 ? (1 - this.slow.amount) : 1;
    let speed = this.speed * slowFactor;

    if (this.isBoss) {
      this._bossUpdate(dt, game, nx, nz, dist, speed);
    } else if (this.type.ranged) {
      this._rangedUpdate(dt, game, nx, nz, dist, speed);
    } else {
      this._meleeUpdate(dt, game, nx, nz, dist, speed, slowFactor);
    }

    // knockback
    if (this.knock.lengthSq() > 0.001) {
      this.pos.x += this.knock.x * dt;
      this.pos.z += this.knock.z * dt;
      this.knock.multiplyScalar(Math.pow(0.02, dt));
      if (this.knock.lengthSq() < 0.01) this.knock.set(0, 0, 0);
    }

    // separation
    if (!this.isBoss) {
      for (const o of game.enemies.list) {
        if (o === this || o.dead) continue;
        const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z;
        const d2 = ox * ox + oz * oz;
        const minD = this.radius + o.radius;
        if (d2 > 0.0001 && d2 < minD * minD) {
          const d = Math.sqrt(d2);
          const push = (minD - d) * 0.9;
          this.pos.x += (ox / d) * push * dt * 5;
          this.pos.z += (oz / d) * push * dt * 5;
        }
      }
    }

    // keep structure attackers outside the thing they are hitting
    if (target.kind !== 'player') {
      const ax = this.pos.x - target.pos.x;
      const az = this.pos.z - target.pos.z;
      const ad = Math.hypot(ax, az);
      const min = (target.radius || 1) + this.radius * 0.75;
      if (ad > 0.001 && ad < min) {
        this.pos.x = target.pos.x + (ax / ad) * min;
        this.pos.z = target.pos.z + (az / ad) * min;
      }
    }

    // clamp
    arenaClamp(this.pos, 0.8);

    // Elite and crowned enemies answer with a bolt of their own, even when
    // their body is built for melee.
    this.volleyCd -= dt;
    if (!this.isBoss && !this.type.ranged && (this.elite || this.miniBoss)
      && this.volleyCd <= 0 && player.alive && playerDist < 16) {
      this.volleyCd = (this.miniBoss ? 3.2 : 4.4) + Math.random() * 1.2;
      this._fireAtPlayer(game, this.miniBoss ? 3 : 1, this.miniBoss ? 0.18 : 0, this.miniBoss ? 0.6 : 0.5);
    }

    // contact — the player can body-block a creature headed for the core
    this.attackCd -= dt;
    const contactRange = this.radius + 0.95;
    if (playerDist < contactRange && this.attackCd <= 0 && this.chargeWind <= 0) {
      const roll = game.rollEnemyHit?.() || { kind: 'hit', mult: 1 };
      if (roll.mult <= 0) {
        fx.number(new THREE.Vector3(player.pos.x, 1.9, player.pos.z), 'MISS', 'miss');
        fx.trail(new THREE.Vector3((this.pos.x + player.pos.x) / 2, 0.8, (this.pos.z + player.pos.z) / 2), this.glow, 0.14, 0.22);
      } else {
        player.takeDamage(this.damage * roll.mult, this, { kind: roll.kind });
      }
      this.attackCd = this.isBoss ? 1.1 : 0.9;
      if (roll.mult > 0) {
        const kb = this.isBoss ? 3.4 : 1.2;
        const pnx = playerDx / playerDist, pnz = playerDz / playerDist;
        player.vel.x -= pnx * kb;
        player.vel.z -= pnz * kb;
      }
    }

    // structures under attack
    if (target.kind !== 'player' && target.alive && this.attackCd <= 0 && this.chargeWind <= 0) {
      const reach = this.radius + (target.radius || 1) + 0.2;
      if (dist < reach) {
        if (target.kind === 'caravan') game.caravan?.damage(this.damage * ESCORT.attackDamageMult, game);
        else game.structures?.damage(target, this.damage, game);
        this.attackCd = this.isBoss ? 1.1 : 0.9;
        game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), this.glow, { count: 7, speed: 3, size: 0.18, life: 0.35 });
      }
    }

    // velocity (used by the player's predictive aim)
    this.vx = Math.max(-14, Math.min(14, (this.pos.x - prevX) / Math.max(dt, 0.0001)));
    this.vz = Math.max(-14, Math.min(14, (this.pos.z - prevZ) / Math.max(dt, 0.0001)));

    // visuals
    const bobAmp = this.flying ? 0.22 : 0.06;
    this.bob = Math.sin(game.time * (this.flying ? 2.2 : 3) + this.phase) * bobAmp;
    const face = Math.atan2(nx, nz);
    this.group.rotation.y = face;
    this.group.position.set(this.pos.x, this.baseY + this.bob, this.pos.z);
    if (this.body) {
      this.body.rotation.y += dt * 0.4;
      if (this.key === 'wisp') this.body.rotation.z = Math.sin(game.time * 2 + this.phase) * 0.2;
    }
    if (this.halo) {
      const haloBase = this.seraph ? 0.24 : 0.45;
      this.halo.material.opacity = haloBase + Math.sin(game.time * 3 + this.phase) * (this.seraph ? 0.04 : 0.12);
    }
    if (this.haloRing) this.haloRing.rotation.z += dt * 1.4;
    if (this.bossRingA) { this.bossRingA.rotation.z += dt * 0.8; this.bossRingB.rotation.z -= dt * 0.6; }
    if (this.bossCore) this.bossCore.scale.setScalar((this.seraph ? 0.85 : 1) * (1 + Math.sin(game.time * 4) * 0.12));
    if (this.eliteRing) this.eliteRing.rotation.z += dt * 1.2;
    if (this.orbiters) {
      for (const o of this.orbiters) {
        const a = game.time * o.userData.s + o.userData.a;
        o.position.set(Math.cos(a) * o.userData.r, o.userData.h + Math.sin(a * 2 + this.phase) * 0.1, Math.sin(a) * o.userData.r);
        o.rotation.x += dt * 3;
        o.rotation.y += dt * 2;
      }
    }
    if (this.miniAura) {
      this.miniAura.rotation.y -= dt * 0.55;
      this.miniAura.rotation.x += dt * 0.28;
      this.miniAura.material.opacity = 0.1 + Math.sin(game.time * 2.2 + this.phase) * 0.05;
    }
    if (this.isBoss && this.enraged && Math.random() < dt * 12) {
      fx.trail(new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 2, this.baseY + Math.random() * 2.6, this.pos.z + (Math.random() - 0.5) * 2), this.glow, 0.25, 0.4);
    }
  }

  _targetFor(game) {
    const playerTarget = { kind: 'player', pos: game.player.pos, radius: 0.85, alive: true };
    const caravan = game.caravan;
    if (caravan?.alive) {
      // Melee raiders commit to the reliquary; ranged enemies and wardens keep
      // hunting the guardian. The player cannot body-block raiders off it.
      if (this.type.ranged || this.isBoss) return playerTarget;
      return { kind: 'caravan', pos: caravan.pos, radius: caravan.radius, alive: true };
    }
    if (!game.structures) return playerTarget;

    const structure = game.structures.nearestAlive(this.pos);
    if (!structure) return playerTarget;

    // Every enemy can march on the Sunforge or a raised defense. A player who
    // steps into its reach becomes the immediate threat and body-blocks it.
    const dx = game.player.pos.x - this.pos.x;
    const dz = game.player.pos.z - this.pos.z;
    const playerDist = Math.hypot(dx, dz);
    // Ranged creatures claim the player from further out; they would rather
    // shoot a guardian than plink a tower all night.
    const bodyBlock = this.isBoss ? 6.5 : this.type.ranged ? 15 : this.radius + 2.2;
    return playerDist <= bodyBlock ? playerTarget : structure;
  }

  _meleeUpdate(dt, game, nx, nz, dist, speed, slowFactor) {
    let moveX = nx * speed;
    let moveZ = nz * speed;
    if (this.key === 'wisp') {
      const strafe = Math.sin(game.time * 2.2 + this.phase) * speed * 0.45;
      moveX += -nz * strafe;
      moveZ += nx * strafe;
    }
    this.pos.x += moveX * dt;
    this.pos.z += moveZ * dt;
  }

  _rangedUpdate(dt, game, nx, nz, dist, speed) {
    let moveX = 0, moveZ = 0;
    if (dist < 8.5) { moveX = -nx * speed; moveZ = -nz * speed; }
    else if (dist > 13.5) { moveX = nx * speed; moveZ = nz * speed; }
    else {
      const strafe = speed * 0.55;
      moveX = -nz * strafe * Math.sin(game.time * 0.7 + this.phase);
      moveZ = nx * strafe * Math.sin(game.time * 0.7 + this.phase);
    }
    this.pos.x += moveX * dt;
    this.pos.z += moveZ * dt;

    this.shootCd = (this.shootCd ?? 1.8) - dt;
    if (this.shootCd <= 0 && dist < 17) {
      this.shootCd = (this.miniBoss ? 1.9 : 1.8) + Math.random() * 0.7;
      this._fireAtPlayer(game, this.miniBoss ? 3 : 1, this.miniBoss ? 0.16 : 0, 0.85);
    }
  }

  _fireAtPlayer(game, count = 1, spread = 0, damageScale = 0.7) {
    const player = game.player;
    if (!player?.alive) return false;
    const dx = player.pos.x - this.pos.x;
    const dz = player.pos.z - this.pos.z;
    if (Math.hypot(dx, dz) > 17) return false;
    const base = Math.atan2(dx, dz);
    for (let i = 0; i < count; i++) {
      const a = base + (i - (count - 1) / 2) * spread;
      game.projectiles.fire({
        pos: new THREE.Vector3(this.pos.x, this.baseY, this.pos.z),
        dir: new THREE.Vector3(Math.sin(a), 0, Math.cos(a)),
        speed: 10.5, damage: this.damage * damageScale,
        color: this.glow, size: count > 1 ? 0.92 : 1.05,
        isEnemy: true, life: 3.2, trail: true, glow: this.color, element: this.element,
      });
    }
    game.audio.shoot('stone');
    game.fx.burst(new THREE.Vector3(this.pos.x, this.baseY, this.pos.z), this.glow, {
      count: count > 1 ? 7 : 4, speed: 2.4, size: 0.16, life: 0.3,
    });
    return true;
  }

  _bossUpdate(dt, game, nx, nz, dist, speed) {
    const player = game.player;
    if (!this.enraged && this.hp / this.maxHp < 0.4) {
      this.enraged = true;
      this.baseEmissive = 0.9;
      this.bodyMat.emissiveIntensity = 0.9;
      this.ringSpd = 1.4;
      game.ui?.toast(this.name + ' IS ENRAGED', '#ff9be0');
      game.audio.boss();
      game.fx.ring(this.pos, this.glow, { r0: 1, r1: 14, life: 0.9, opacity: 0.6 });
    }

    // charge cycle
    if (this.chargeWind > 0) {
      this.chargeWind -= dt;
      this.group.scale.setScalar(this.scale * (1 + Math.sin(game.time * 30) * 0.04));
      if (this.chargeWind <= 0) {
        this.chargeTime = 0.5;
        this.chargeDir.set(nx, 0, nz);
        game.fx.ring(this.pos, this.color, { r0: 0.6, r1: 4, life: 0.3, opacity: 0.8 });
      }
      return;
    }
    if (this.chargeTime > 0) {
      this.chargeTime -= dt;
      this.pos.addScaledVector(this.chargeDir, 21 * dt);
      game.fx.trail(new THREE.Vector3(this.pos.x, 0.9, this.pos.z), this.color, 0.35, 0.4);
      if (this.chargeTime <= 0) {
        this.group.scale.setScalar(this.scale);
        if (game.structures?.core?.alive) {
          const d = Math.hypot(this.pos.x, this.pos.z);
          if (d < 5.2) {
            game.structures.damage(game.structures.core, this.damage * 1.5, game);
            game.fx.ring(this.pos, this.color, { r0: 0.5, r1: 6, life: 0.6, opacity: 0.7 });
            game.engine.addShake(0.7);
          }
        }
      }
      return;
    }

    // move
    if (dist > 3.2) {
      this.pos.x += nx * speed * dt;
      this.pos.z += nz * speed * dt;
    }

    const cadence = this.enraged ? 0.65 : 1;

    // radial volley
    this.volleyT -= dt;
    if (this.volleyT <= 0) {
      this.volleyT = (this.enraged ? 3.6 : 5.4);
      const n = this.enraged ? 18 : 14;
      const base = Math.random() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2;
        game.projectiles.fire({
          pos: new THREE.Vector3(this.pos.x, 1.5, this.pos.z),
          dir: new THREE.Vector3(Math.cos(a), 0, Math.sin(a)),
          speed: 9.5, damage: this.damage * 0.55, color: this.glow,
          size: 1.15, isEnemy: true, life: 4, trail: true, glow: this.color, element: this.element,
        });
      }
      game.audio.surge('umbra');
      game.fx.ring(this.pos, this.glow, { r0: 1, r1: 8, life: 0.5, opacity: 0.7 });
      game.engine.addShake(0.25);
    }

    // charge
    this.chargeT -= dt;
    if (this.chargeT <= 0) {
      this.chargeT = (this.enraged ? 6.5 : 9);
      this.chargeWind = 0.75;
      game.fx.ring(this.pos, this.color, { r0: 0.5, r1: 5, life: 0.6, opacity: 0.6 });
    }

    // summon
    this.summonT -= dt;
    if (this.summonT <= 0) {
      this.summonT = this.enraged ? 9 : 13;
      for (let i = 0; i < 2; i++) {
        const a = Math.random() * Math.PI * 2;
        game.spawnEnemy('wisp', { angle: a, radius: Math.min(arenaRadiusAt(a) - 3, 7 + Math.random() * 8) });
      }
      game.ui?.toast('THE RIFT CALLS FOR AID', this.glow);
    }
    this.ringSpd = this.enraged ? 1.4 : 0.7;
  }

  dispose() {
    if (this.bodyMat) this.bodyMat.dispose();
    if (this.accentMat) this.accentMat.dispose();
    if (this.rimMat) this.rimMat.dispose();
    if (this.miniAura) this.miniAura.material.dispose();
  }
}
