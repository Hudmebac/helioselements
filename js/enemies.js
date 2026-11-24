/* ============================================================
   HELIOS ELEMENTS — ENEMIES
   Periodic Horde, behaviours, bosses and the horde manager.
   ============================================================ */

import {
  ENEMIES, BOSSES, ELEMENTS, ESCORT, ELEMENT_MECHANICS, BOSS_MECHANICS,
} from './data.js';
import { arenaClamp, arenaRadiusAt, glowTexture, shadowTexture, sigilTexture } from './engine.js';

const shadowMat = new THREE.MeshBasicMaterial({
  map: shadowTexture(), transparent: true, opacity: 0.42, depthWrite: false, color: 0x000000,
});
shadowMat.userData.shared = true;
const shadowGeo = new THREE.CircleGeometry(1, 20);

// A shared dark armour material gives every silhouette a readable shadowed
// side without adding one material per creature.
const armorMat = new THREE.MeshStandardMaterial({
  color: 0x29232f, roughness: 0.8, metalness: 0.22, flatShading: true,
});
armorMat.userData.shared = true;

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

// Small repeated parts (legs, fins, crown spikes) are batch-drawn as one
// InstancedMesh per creature instead of one draw call per part.
function addInstances(group, key, make, material, placements) {
  const mesh = new THREE.InstancedMesh(geo(key, make), material, placements.length);
  const dummy = new THREE.Object3D();
  placements.forEach((p, i) => {
    dummy.position.set(p.x, p.y, p.z);
    if (p.rot) dummy.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
    else dummy.rotation.set(0, 0, 0);
    if (p.scale) dummy.scale.set(p.scale[0], p.scale[1], p.scale[2]);
    else dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return mesh;
}

const MECHANIC_NAMES = {
  eruption: 'CINDER ERUPTION',
  mend: 'TIDAL MEND',
  sprint: 'SQUALL SPRINT',
  slam: 'STONE SLAM',
  judgment: 'SOLAR JUDGMENT',
  vanish: 'NIGHTFALL',
  pull: 'VOID PULL',
};

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
      // In the cockpit an enemy that reaches the glass engulfs the whole view.
      // Its body is hidden at contact range; the gunsight, health bar and
      // damage numbers still track it. A vanished enemy stays hidden.
      if (!e.dead && !e.invisible) {
        if (game.viewMode === 'first' && game.player) {
          const dx = e.pos.x - game.player.pos.x, dz = e.pos.z - game.player.pos.z;
          const near = (e.radius + 0.55) ** 2;
          e.group.visible = dx * dx + dz * dz > near;
        } else {
          e.group.visible = true;
        }
      }
    }
    this.list = alive;
    if (this.boss && (this.boss.dead || !this.list.includes(this.boss))) this.boss = null;
  }

  nearest(pos, range, filter = null) {
    let best = null, bestD = range * range;
    for (const e of this.list) {
      if (e.dead || e.invisible) continue;
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
    if (opts.breaker) {
      this.maxHp = Math.round(this.maxHp * 2.1);
      this.hp = this.maxHp;
      this.speed *= 0.82;
      this.damage *= 1.25;
      this.radius *= 1.12;
      this.xp *= 2;
    }
    const bossMeta = this.isBoss ? BOSSES[this.bossIndex % BOSSES.length] : null;
    const baseElement = bossMeta ? (bossMeta.element || null) : (type.element || null);
    this.element = this.isBoss ? baseElement : (opts.element || baseElement || null);
    this.elementMeta = this.element ? ELEMENTS[this.element] : null;
    this.isElementVariant = !this.isBoss && !!this.element && this.element !== baseElement;
    this.color = this.isElementVariant
      ? (this.elementMeta?.color || type.color)
      : bossMeta ? bossMeta.color : type.color;
    this.glow = this.isElementVariant
      ? (this.elementMeta?.glow || type.glow)
      : bossMeta ? bossMeta.glow : type.glow;
    const baseName = bossMeta ? bossMeta.name : type.name;
    this.name = this.isBoss
      ? baseName
      : this.isElementVariant
        ? (this.elementMeta?.name || this.element) + ' ' + (this.elite ? 'Elite ' : '') + baseName
        : (this.elite ? 'Elite ' + baseName : baseName);
    this.flying = !!type.flying;
    this.miniBoss = !!type.miniBoss;
    this.harrier = !!opts.harrier;
    this.breaker = !!opts.breaker;
    this.laneAngle = opts.laneAngle ?? null;
    this.dead = false;
    this._corpse = false;

    if (opts.pos) {
      this.pos = new THREE.Vector3(opts.pos.x, 0, opts.pos.z);
    } else {
      const a = opts.angle ?? Math.random() * Math.PI * 2;
      const r = opts.radius ?? (arenaRadiusAt(a) - 3);
      this.pos = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    }

    this.burn = { dps: 0, until: 0 };
    this.slow = { amount: 0, until: 0 };
    this.knock = new THREE.Vector3();
    this.attackCd = 0.4 + Math.random() * 0.5;
    this.caravanWind = 0;
    this.caravanWindTarget = null;
    this.provokedUntil = 0;
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

    // Element mechanics: one readable set piece for every boss and crowned
    // enemy. Melee and ranged pressure continue around it, but the mechanic is
    // the moment the player has to answer.
    this.mechanicKind = null;
    this.mechanicT = this.isBoss ? 3.4 + Math.random() * 1.8 : this.miniBoss ? 5.2 + Math.random() * 2 : 999;
    this.mechanicWind = 0;
    this.mechanicPos = new THREE.Vector3();
    this.mechanicDir = new THREE.Vector3();
    this.sprintT = 0;
    this.sprintDir = new THREE.Vector3();
    this.invisibleT = 0;
    this.invisible = false;
    this.mechanicCount = 0;
    this.mechanicWarned = false;

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

    // Keep the element colour in the body, but pull the mid-tone down so the
    // key light and emissive rim shape the silhouette instead of bleaching it.
    const bodyColor = new THREE.Color(this.color).multiplyScalar(this.isBoss ? 0.34 : this.miniBoss ? 0.28 : 0.22);
    this.baseEmissive = this.isBoss ? 0.12 : this.miniBoss ? 0.1 : 0.07;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: bodyColor, emissive: this.glow, emissiveIntensity: this.baseEmissive,
      roughness: 0.74, metalness: 0.18, flatShading: true,
    });
    this.bodyMat = bodyMat;
    bodyMat.emissiveIntensity = this.baseEmissive;

    const accentMat = new THREE.MeshBasicMaterial({ color: this.glow, toneMapped: false });
    this.accentMat = accentMat;

    if (t.shape === 'crawler') {
      const body = new THREE.Mesh(geo('crawler', () => new THREE.IcosahedronGeometry(0.62, 1)), bodyMat);
      body.scale.set(1.1, 0.85, 1.15);
      group.add(body);
      this.body = body;
      // A ridge of embers along the back: the crawler reads as cinder, not a blob.
      addInstances(group, 'crawlerSpike', () => new THREE.ConeGeometry(0.11, 0.34, 4), accentMat,
        [0, 1, 2].map(i => ({ x: 0, y: 0.4 - i * 0.03, z: 0.34 - i * 0.3, rot: [-0.45, 0, 0] })));
      const legPlacements = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        legPlacements.push({
          x: Math.cos(a) * 0.6, y: -0.28, z: Math.sin(a) * 0.6,
          rot: [Math.sin(a) * 1.1, 0, Math.cos(a) * 1.1],
        });
      }
      addInstances(group, 'leg', () => new THREE.ConeGeometry(0.085, 0.5, 4), accentMat, legPlacements);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfff0d0, toneMapped: false });
      addInstances(group, 'eye', () => new THREE.SphereGeometry(0.09, 8, 8), eyeMat,
        [{ x: -0.22, y: 0.14, z: 0.5 }, { x: 0.22, y: 0.14, z: 0.5 }]);
      // Refined silhouette: a low carapace, paired mandibles and a raised tail
      // turn the crawler from a floating polyhedron into a readable creature.
      const shell = new THREE.Mesh(geo('crawlerShell', () => new THREE.SphereGeometry(0.62, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.56)), armorMat);
      shell.scale.set(1.12, 0.72, 1.18);
      shell.position.set(0, 0.31, 0.02);
      group.add(shell);
      for (const s of [-1, 1]) {
        const jaw = new THREE.Mesh(geo('crawlerJaw', () => new THREE.ConeGeometry(0.08, 0.34, 4)), accentMat);
        jaw.position.set(s * 0.22, -0.08, 0.64);
        jaw.rotation.x = Math.PI / 2;
        jaw.rotation.z = s * 0.24;
        group.add(jaw);
      }
      const tail = new THREE.Mesh(geo('crawlerTail', () => new THREE.ConeGeometry(0.1, 0.58, 4)), accentMat);
      tail.position.set(0, 0.08, -0.75);
      tail.rotation.x = -1.12;
      group.add(tail);
    } else if (t.shape === 'wisp') {
      const body = new THREE.Mesh(geo('wisp', () => new THREE.OctahedronGeometry(0.55, 0)), bodyMat);
      body.scale.set(0.9, 1.7, 0.9);
      group.add(body);
      this.body = body;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,255,255,.9)', 'rgba(220,200,255,.3)', 'rgba(160,120,255,0)'),
        color: this.glow, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      halo.scale.set(2.1, 2.1, 1);
      group.add(halo);
      this.halo = halo;
      // A bright inner core and a tilted shard ring make the wisp read as a
      // bound spirit rather than a single stretched diamond.
      const core = new THREE.Mesh(geo('wispCore', () => new THREE.OctahedronGeometry(0.22, 0)), accentMat);
      core.position.y = 0.03;
      group.add(core);
      this.wispCore = core;
      const shardRing = new THREE.Mesh(geo('wispRing', () => new THREE.TorusGeometry(0.58, 0.035, 6, 28)), accentMat);
      shardRing.rotation.x = Math.PI / 2.6;
      group.add(shardRing);
      this.wispRing = shardRing;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const shard = new THREE.Mesh(geo('wispTrail', () => new THREE.ConeGeometry(0.055, 0.4, 4)), accentMat);
        shard.position.set(Math.cos(a) * 0.48, -0.5 - i * 0.12, Math.sin(a) * 0.48);
        shard.rotation.x = Math.PI;
        shard.rotation.z = Math.cos(a) * 0.25;
        group.add(shard);
      }
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
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const plate = new THREE.Mesh(geo('plate', () => new THREE.BoxGeometry(0.5, 0.62, 0.16)), armorMat);
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
      // Add a head, pauldrons and forearms so the brute has a humanoid mass
      // and a readable top line against the arena floor.
      const head = new THREE.Mesh(geo('bruteHead', () => new THREE.DodecahedronGeometry(0.42, 0)), bodyMat);
      head.position.set(0, 0.9, 0.08);
      head.scale.set(0.9, 0.8, 0.9);
      group.add(head);
      for (const s of [-1, 1]) {
        const pauldron = new THREE.Mesh(geo('brutePauldron', () => new THREE.DodecahedronGeometry(0.4, 0)), armorMat);
        pauldron.position.set(s * 0.78, 0.62, 0);
        pauldron.scale.set(1, 0.7, 0.85);
        group.add(pauldron);
        const arm = new THREE.Mesh(geo('bruteArm', () => new THREE.CylinderGeometry(0.18, 0.24, 0.9, 6)), armorMat);
        arm.position.set(s * 0.88, -0.18, 0.12);
        arm.rotation.z = s * 0.18;
        group.add(arm);
        const fist = new THREE.Mesh(geo('bruteFist', () => new THREE.DodecahedronGeometry(0.25, 0)), accentMat);
        fist.position.set(s * 0.95, -0.62, 0.18);
        group.add(fist);
      }
      const jaw = new THREE.Mesh(geo('bruteJaw', () => new THREE.BoxGeometry(0.4, 0.16, 0.2)), accentMat);
      jaw.position.set(0, 0.69, 0.5);
      group.add(jaw);
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
      // A muzzle and side pods frame the lens; tendrils anchor it to the floor.
      const muzzle = new THREE.Mesh(geo('spitterMuzzle', () => new THREE.ConeGeometry(0.18, 0.48, 6)), accentMat);
      muzzle.rotation.x = Math.PI / 2;
      muzzle.position.set(0, 0.1, 0.82);
      group.add(muzzle);
      for (const s of [-1, 1]) {
        const pod = new THREE.Mesh(geo('spitterPod', () => new THREE.SphereGeometry(0.2, 10, 8)), armorMat);
        pod.position.set(s * 0.52, -0.06, 0.25);
        pod.scale.set(0.8, 0.9, 1.1);
        group.add(pod);
      }
      for (let i = 0; i < 3; i++) {
        const a = -0.55 + i * 0.55;
        const tendril = new THREE.Mesh(geo('spitterTendril', () => new THREE.ConeGeometry(0.05, 0.5, 4)), accentMat);
        tendril.position.set(Math.sin(a) * 0.34, -0.55, Math.cos(a) * 0.26);
        tendril.rotation.x = Math.PI + Math.cos(a) * 0.18;
        group.add(tendril);
      }
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
      let haloScale = 4.8;

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
        haloScale = 5.0;
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
        haloScale = 4.6;
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
        haloScale = 4.9;
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
        haloScale = 4.7;
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
        haloScale = 4.8;
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
      // Secondary boss silhouettes: each warden gets one extra readable mass
      // beyond its core body, so the arena shape matches the banner name.
      if (bossKind === 0) {
        for (const side of [-1, 1]) {
          const blade = new THREE.Mesh(geo('riftBlade', () => new THREE.ConeGeometry(0.16, 2.4, 3)), accentMat);
          blade.position.set(side * 1.0, 1.85, 0.08);
          blade.rotation.z = side * -0.3;
          group.add(blade);
        }
        const baseCrown = new THREE.Mesh(geo('riftCrown', () => new THREE.TorusGeometry(0.9, 0.05, 6, 30)), accentMat);
        baseCrown.rotation.x = Math.PI / 2;
        baseCrown.position.y = 2.68;
        group.add(baseCrown);
      } else if (bossKind === 1) {
        for (const side of [-1, 1]) {
          const boulder = new THREE.Mesh(geo('colossusPauldron', () => new THREE.DodecahedronGeometry(0.42, 0)), bodyMat);
          boulder.position.set(side * 1.28, 2.02, -0.08);
          boulder.scale.set(1.2, 0.78, 0.95);
          group.add(boulder);
          const shoulderSpike = new THREE.Mesh(geo('colossusShoulderSpike', () => new THREE.ConeGeometry(0.18, 1.0, 5)), accentMat);
          shoulderSpike.position.set(side * 1.24, 2.46, -0.04);
          shoulderSpike.rotation.z = side * -0.62;
          group.add(shoulderSpike);
        }
      } else if (bossKind === 2) {
        const cage = new THREE.Mesh(geo('heraldCage', () => new THREE.TorusGeometry(1.18, 0.05, 6, 36)), accentMat);
        cage.rotation.x = Math.PI / 2;
        cage.position.y = 2.35;
        group.add(cage);
        const lowerCage = new THREE.Mesh(geo('heraldLowerCage', () => new THREE.TorusGeometry(0.92, 0.04, 6, 32)), accentMat);
        lowerCage.rotation.x = Math.PI / 2;
        lowerCage.position.y = 0.96;
        group.add(lowerCage);
      } else if (bossKind === 3) {
        const sunDisc = new THREE.Mesh(geo('unboundDisc', () => new THREE.TorusGeometry(1.48, 0.06, 6, 44)), accentMat);
        sunDisc.position.set(0, 1.86, -0.42);
        group.add(sunDisc);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const ember = new THREE.Mesh(geo('unboundEmber', () => new THREE.OctahedronGeometry(0.1, 0)), accentMat);
          ember.position.set(Math.cos(a) * 1.5, 1.86 + Math.sin(a) * 1.5, -0.42);
          group.add(ember);
        }
      } else if (bossKind === 4) {
        const crownBase = new THREE.Mesh(geo('tyrantCrownBase', () => new THREE.BoxGeometry(1.3, 0.22, 1.0)), accentMat);
        crownBase.position.y = 2.82;
        group.add(crownBase);
        for (const x of [-0.45, 0, 0.45]) {
          const crownSpike = new THREE.Mesh(geo('tyrantCrownSpike', () => new THREE.BoxGeometry(0.15, 0.62, 0.15)), accentMat);
          crownSpike.position.set(x, 3.12, 0);
          crownSpike.rotation.z = x * 0.4;
          group.add(crownSpike);
        }
        for (const side of [-1, 1]) {
          const shoulder = new THREE.Mesh(geo('tyrantShoulder', () => new THREE.DodecahedronGeometry(0.34, 0)), bodyMat);
          shoulder.position.set(side * 0.92, 2.1, 0);
          shoulder.scale.set(1, 0.75, 0.9);
          group.add(shoulder);
        }
      } else if (bossKind === 5) {
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const glass = new THREE.Mesh(geo('seraphGlass', () => new THREE.ConeGeometry(0.1, 0.9, 4)), accentMat);
            glass.position.set(side * (1.14 + i * 0.06), 1.42 + i * 0.3, -0.2 - i * 0.06);
            glass.rotation.z = side * 0.6;
            glass.rotation.x = 0.2;
            group.add(glass);
          }
        }
        const tailFeather = new THREE.Mesh(geo('seraphTail', () => new THREE.ConeGeometry(0.16, 1.1, 4)), accentMat);
        tailFeather.position.set(0, 0.92, -0.55);
        tailFeather.rotation.x = -0.35;
        group.add(tailFeather);
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
          new THREE.MeshBasicMaterial({ color: i ? this.color : this.glow, transparent: true, opacity: 0.38, toneMapped: false })
        );
        ring.scale.setScalar(ringRadius + i * 0.3);
        ring.position.y = coreY - 0.1 + i * 0.5;
        ring.rotation.x = Math.PI / (2 + i);
        group.add(ring);
        if (i === 0) this.bossRingA = ring; else this.bossRingB = ring;
      }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture('rgba(255,255,255,.85)', 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)'),
        color: this.glow, transparent: true, opacity: seraph ? 0.16 : 0.24,
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
        color: this.color, transparent: true, opacity: 0.06, wireframe: true,
        depthWrite: false, toneMapped: false,
      });
      this.miniAura = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 1), auraMat);
      this.miniAura.scale.setScalar(0.82);
      this.miniAura.position.y = 0.1;
      group.add(this.miniAura);
      // A second, coloured mantle separates a crowned enemy from the horde
      // even when its body shape is borrowed from a brute, wisp or spitter.
      const mantle = new THREE.Mesh(geo('miniMantle', () => new THREE.TorusGeometry(0.82, 0.055, 6, 32)), accentMat);
      mantle.rotation.x = Math.PI / 2;
      mantle.position.y = this.baseY * 0.45;
      group.add(mantle);
      this.miniMantle = mantle;
      const miniCore = new THREE.Mesh(geo('miniCore', () => new THREE.OctahedronGeometry(0.2, 0)), accentMat);
      miniCore.position.set(0, this.baseY * 0.72, this.radius * 0.9);
      group.add(miniCore);
      this.miniCore = miniCore;
      const crownBase = this.flying ? 1.02 : this.type.ranged ? 0.72 : 1.14;
      const crownMat = new THREE.MeshBasicMaterial({ color: 0xffe6a8, toneMapped: false });
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const spike = new THREE.Mesh(geo('miniSpike', () => new THREE.ConeGeometry(0.11, 0.55, 4)), crownMat);
        const tall = i % 2 === 0 ? 1.15 : 0.78;
        spike.scale.set(1, tall, 1);
        spike.position.set(Math.cos(a) * 0.47, crownBase, Math.sin(a) * 0.47);
        spike.rotation.z = Math.cos(a) * -0.3;
        group.add(spike);
      }
      const crown = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 6, 26), crownMat);
      crown.rotation.x = Math.PI / 2;
      crown.position.y = crownBase + 0.2;
      group.add(crown);
      const gem = new THREE.Mesh(geo('miniGem', () => new THREE.OctahedronGeometry(0.14, 0)), accentMat);
      gem.position.y = crownBase + 0.3;
      group.add(gem);
      this.miniGem = gem;
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
    const badgeSize = this.isBoss ? 1.55 : this.miniBoss ? 1.12 : 0.92;
    this.badge.scale.set(badgeSize, badgeSize * 0.5, 1);
    this.badge.position.y = this.isBoss ? 3.68 : this.flying ? 1.35 : 1.55;
    group.add(this.badge);

    // The element is not a tiny footnote: a broad coloured ring and a soft
    // matching halo sit under every creature, so the player can read what a
    // wave is made of before the first shot lands.
    const elementColor = this.elementMeta?.color || this.type.color;
    this.elementRingMat = new THREE.MeshBasicMaterial({
      color: elementColor, transparent: true, opacity: this.miniBoss || this.isBoss ? 0.32 : 0.18,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const er = this.radius * (this.isBoss ? 2.35 : this.miniBoss ? 1.95 : 1.5);
    this.elementRing = new THREE.Mesh(new THREE.RingGeometry(er * 0.82, er, 44), this.elementRingMat);
    this.elementRing.rotation.x = -Math.PI / 2;
    this.elementRing.position.y = -this.baseY + 0.045;
    group.add(this.elementRing);

    this.elementHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,.9)', 'rgba(255,255,255,.24)', 'rgba(255,255,255,0)'),
      color: elementColor, transparent: true, opacity: this.miniBoss || this.isBoss ? 0.18 : 0.07,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    this.elementHalo.scale.setScalar(this.radius * (this.isBoss ? 2.5 : this.miniBoss ? 2.4 : 2.25));
    this.elementHalo.position.y = this.baseY * 0.45;
    group.add(this.elementHalo);

    // Wardens, crowned enemies and elites get the extra hostile ring. Regular
    // horde members keep one elemental ring so a big wave does not become a
    // stack of overlapping circles.
    if (this.isBoss || this.miniBoss || this.elite) {
      const threatR = this.radius * (this.isBoss ? 2.0 : 1.5);
      const threatMat = new THREE.MeshBasicMaterial({
        color: 0xff4230, transparent: true, opacity: this.isBoss ? 0.3 : 0.14,
        side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      });
      const threat = new THREE.Mesh(new THREE.RingGeometry(threatR * 0.8, threatR, 44), threatMat);
      threat.rotation.x = -Math.PI / 2;
      threat.position.y = -this.baseY + 0.05;
      group.add(threat);
    }

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
    if (this.caravanWind > 0) this.bodyMat.emissiveIntensity = this.baseEmissive * 3.2;

    const playerDx = player.pos.x - this.pos.x;
    const playerDz = player.pos.z - this.pos.z;
    const playerDist = Math.hypot(playerDx, playerDz) || 1;
    const target = this._targetFor(game);

    // A raider committed to the reliquary winds up before it strikes. The
    // warning is short, but it makes direct caravan damage readable and gives
    // the player a moment to peel the attacker.
    if (this.caravanWind > 0) {
      this.caravanWind -= dt;
      if (this.caravanWind <= 0) {
        const struck = this.caravanWindTarget;
        this.caravanWindTarget = null;
        if (struck?.alive && game.caravan?.alive) {
          const reach = this.radius + (struck.radius || 1) + 0.35;
          if (Math.hypot(struck.pos.x - this.pos.x, struck.pos.z - this.pos.z) <= reach) {
            game.caravan.damage(this.damage * ESCORT.attackDamageMult * (this.breaker ? ESCORT.breakerDamageMult : 1), game);
            game.fx.burst(new THREE.Vector3(struck.pos.x, 1.2, struck.pos.z), 0xff7a52, { count: 12, speed: 4, size: 0.2, life: 0.4, up: 1.4 });
          }
        }
      }
    }

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

    const mechanicActed = (this.isBoss || this.miniBoss)
      && this._mechanicsUpdate(dt, game, nx, nz, dist, speed);
    if (!mechanicActed) {
      if (this.isBoss) {
        this._bossUpdate(dt, game, nx, nz, dist, speed);
      } else if (this.type.ranged) {
        this._rangedUpdate(dt, game, nx, nz, dist, speed);
      } else {
        this._meleeUpdate(dt, game, nx, nz, dist, speed, slowFactor);
      }
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
    if (!this.invisible && playerDist < contactRange && this.attackCd <= 0 && this.chargeWind <= 0) {
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

    // structures under attack. Caravan raiders telegraph first; structures
    // still take the immediate blow.
    if (!this.invisible && target.kind !== 'player' && target.alive && this.attackCd <= 0 && this.chargeWind <= 0 && this.caravanWind <= 0) {
      const reach = this.radius + (target.radius || 1) + 0.2;
      if (dist < reach) {
        if (target.kind === 'caravan') {
          this.attackCd = 1.05;
          this.caravanWind = 0.42;
          this.caravanWindTarget = game.caravan;
          game.fx.beam(
            new THREE.Vector3(this.pos.x, this.baseY, this.pos.z),
            new THREE.Vector3(game.caravan.pos.x, 1.45, game.caravan.pos.z),
            0xff7a52, 0.2, 0.3
          );
          game.fx.ring(this.pos, 0xff7a52, { r0: 0.4, r1: 2.4, life: 0.35, opacity: 0.55 });
          game.audio?.objectiveDanger?.(0);
        } else {
          game.structures?.damage(target, this.damage, game);
          this.attackCd = this.isBoss ? 1.1 : 0.9;
          game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), this.glow, { count: 7, speed: 3, size: 0.18, life: 0.35 });
        }
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
      const haloBase = this.seraph ? 0.14 : 0.22;
      this.halo.material.opacity = haloBase + Math.sin(game.time * 3 + this.phase) * (this.seraph ? 0.025 : 0.055);
    }
    if (this.haloRing) this.haloRing.rotation.z += dt * 1.4;
    if (this.wispCore) this.wispCore.scale.setScalar(1 + Math.sin(game.time * 5 + this.phase) * 0.16);
    if (this.wispRing) { this.wispRing.rotation.z += dt * 1.8; this.wispRing.rotation.y += dt * 0.7; }
    if (this.miniCore) this.miniCore.scale.setScalar(1 + Math.sin(game.time * 4 + this.phase) * 0.12);
    if (this.miniGem) this.miniGem.rotation.y += dt * 0.9;
    if (this.miniMantle) this.miniMantle.rotation.y += dt * 0.45;
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
      this.miniAura.material.opacity = 0.035 + Math.sin(game.time * 2.2 + this.phase) * 0.018;
    }
    if (this.elementRing) {
      this.elementRing.rotation.z += dt * 0.55;
      const base = this.miniBoss || this.isBoss ? 0.32 : 0.18;
      this.elementRingMat.opacity = base + Math.sin(game.time * 2.4 + this.phase) * 0.05;
    }
    if (this.elementHalo) {
      const base = this.miniBoss || this.isBoss ? 0.16 : 0.06;
      this.elementHalo.material.opacity = base + Math.sin(game.time * 3.1 + this.phase) * 0.04;
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
      // hunting the guardian. A raider the guardian attacks is peeled onto the
      // guardian for a short window, so the player can actively defend it.
      if (this.type.ranged || this.isBoss || this.harrier) return playerTarget;
      if (game.time < (this.provokedUntil || 0)) return playerTarget;
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

  /* Element set pieces for wardens and crowned enemies. Each one has a
     telegraph, a distinct answer, and a cooldown long enough that the normal
     volleys still matter. */
  _mechanicsUpdate(dt, game, nx, nz, dist, speed) {
    const player = game.player;
    if (!player?.alive) return false;

    if (this.invisibleT > 0) {
      this.invisibleT -= dt;
      this.pos.x += nx * speed * 0.35 * dt;
      this.pos.z += nz * speed * 0.35 * dt;
      if (this.invisibleT <= 0) this._reappear(game);
      return true;
    }

    if (this.sprintT > 0) {
      this.sprintT -= dt;
      const sprintSpeed = this.isBoss ? 27 : 21;
      this.pos.addScaledVector(this.sprintDir, sprintSpeed * dt);
      game.fx.trail(new THREE.Vector3(this.pos.x, this.baseY, this.pos.z), this.glow, 0.28, 0.5);
      if (this.sprintT <= 0) {
        this.group.scale.setScalar(this.scale);
        game.fx.ring(this.pos, this.glow, { r0: 0.6, r1: 6, life: 0.5, opacity: 0.65 });
        game.engine.addShake(0.35);
        this._fireAtPlayer(game, 5, 0.18, 0.62);
        this._finishMechanic();
      }
      return true;
    }

    if (this.mechanicWind > 0) {
      this.mechanicWind -= dt;
      this.bodyMat.emissiveIntensity = this.baseEmissive + 1.4;
      if (this.mechanicWind <= 0) this._resolveMechanic(game);
      return true;
    }

    // Let the old charge/volley cycle breathe; mechanics take the next opening.
    if (this.chargeWind > 0 || this.chargeTime > 0) return false;

    this.mechanicT -= dt;
    if (this.mechanicT > 0) {
      if (!this.mechanicWarned && this.mechanicT <= 2) {
        this.mechanicWarned = true;
        const kind = this._mechanicKind();
        const name = MECHANIC_NAMES[kind] || kind.toUpperCase();
        game.ui?.toast('⚠ ' + name + ' INCOMING · ' + Math.max(1, Math.ceil(this.mechanicT)) + 's', this.elementMeta?.css || this.type.css || '#ffd166');
        game.fx.ring(this.pos, this.glow, { r0: 1.2, r1: 8, life: 1.1, opacity: 0.45 });
      }
      return false;
    }
    this._beginMechanic(game, nx, nz);
    return true;
  }

  _mechanicKind() {
    return this.isBoss
      ? (BOSS_MECHANICS[this.bossIndex % BOSS_MECHANICS.length] || ELEMENT_MECHANICS[this.element] || 'slam')
      : (ELEMENT_MECHANICS[this.element] || 'slam');
  }

  _beginMechanic(game, nx, nz) {
    const kind = this._mechanicKind();
    this.mechanicKind = kind;
    this.mechanicCount++;
    this.mechanicDir.set(nx, 0, nz);
    const name = MECHANIC_NAMES[kind] || kind.toUpperCase();
    game.ui?.toast(this.name.toUpperCase() + ' · ' + name, this.elementMeta?.css || this.type.css);

    if (kind === 'vanish') {
      this.invisible = true;
      this.invisibleT = 2;
      this.group.visible = false;
      game.fx.burst(new THREE.Vector3(this.pos.x, 1.2, this.pos.z), this.glow, { count: 36, speed: 8, size: 0.28, life: 0.7, up: 3 });
      game.fx.ring(this.pos, this.glow, { r0: 0.6, r1: 7, life: 0.8, opacity: 0.7 });
      return;
    }

    if (kind === 'judgment') {
      this.mechanicWind = 0.9;
      this.mechanicPos.copy(game.player.pos);
      game.fx.ring(this.mechanicPos, this.glow, { r0: 0.5, r1: 4.5, life: 0.95, opacity: 0.75 });
      game.fx.beam(new THREE.Vector3(this.pos.x, this.baseY, this.pos.z),
        new THREE.Vector3(this.mechanicPos.x, 0.8, this.mechanicPos.z), this.glow, 0.32, 0.9);
      return;
    }

    const wind = kind === 'slam' ? 0.8 : kind === 'sprint' ? 0.55 : kind === 'mend' ? 1 : 0.85;
    this.mechanicWind = wind;
    const radius = kind === 'eruption' ? 6 : kind === 'slam' ? 4.8 : kind === 'pull' ? 8 : 3.6;
    game.fx.ring(this.pos, this.glow, { r0: 0.6, r1: radius, life: wind + 0.1, opacity: 0.65 });
    if (kind === 'sprint') this.sprintDir.copy(this.mechanicDir).normalize();
  }

  _resolveMechanic(game) {
    const player = game.player;
    if (!player?.alive) { this._finishMechanic(); return; }
    const kind = this.mechanicKind;
    const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

    if (kind === 'eruption') {
      if (dist <= 6.2) player.takeDamage(this.damage * 1.25, this, { element: this.element });
      game.fx.ring(this.pos, this.glow, { r0: 0.8, r1: 7, life: 0.6, opacity: 0.75 });
      game.fx.burst(new THREE.Vector3(this.pos.x, 1.2, this.pos.z), this.glow, { count: 44, speed: 8, size: 0.3, life: 0.7, up: 3 });
      game.engine.addShake(0.55);
    } else if (kind === 'judgment') {
      const marked = Math.hypot(player.pos.x - this.mechanicPos.x, player.pos.z - this.mechanicPos.z);
      if (marked <= 4.4) player.takeDamage(this.damage * 1.35, this, { element: this.element });
      game.fx.ring(this.mechanicPos, this.glow, { r0: 0.8, r1: 5, life: 0.55, opacity: 0.8 });
      game.fx.burst(new THREE.Vector3(this.mechanicPos.x, 1, this.mechanicPos.z), this.glow, { count: 42, speed: 9, size: 0.3, life: 0.65, up: 4 });
      game.engine.addShake(0.5);
    } else if (kind === 'slam') {
      if (dist <= 5) {
        player.takeDamage(this.damage * 1.15, this, { element: this.element });
        const pdx = player.pos.x - this.pos.x, pdz = player.pos.z - this.pos.z;
        const pd = Math.hypot(pdx, pdz) || 1;
        player.vel.x += (pdx / pd) * 9;
        player.vel.z += (pdz / pd) * 9;
      }
      game.fx.ring(this.pos, this.glow, { r0: 0.7, r1: 5.5, life: 0.55, opacity: 0.8 });
      game.engine.addShake(0.7);
    } else if (kind === 'mend') {
      const before = this.hp;
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.12);
      this.flash();
      game.fx.ring(this.pos, this.glow, { r0: 0.6, r1: 7, life: 0.7, opacity: 0.8 });
      game.fx.burst(new THREE.Vector3(this.pos.x, 1.2, this.pos.z), this.glow, { count: 34, speed: 5, size: 0.28, life: 0.8, up: 4 });
      if (this.hp > before) game.ui?.toast(this.name + ' MENDS · ' + Math.round(this.hp) + ' / ' + Math.round(this.maxHp), this.elementMeta?.css || this.type.css);
    } else if (kind === 'pull') {
      if (dist <= 9) {
        const dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        player.vel.x += (dx / d) * 18;
        player.vel.z += (dz / d) * 18;
        player.takeDamage(this.damage * 0.35, this, { element: this.element });
      }
      game.fx.ring(this.pos, this.glow, { r0: 0.8, r1: 9, life: 0.7, opacity: 0.7 });
      game.engine.addShake(0.4);
    } else if (kind === 'sprint') {
      this.sprintT = this.isBoss ? 0.5 : 0.38;
      this.group.scale.setScalar(this.scale * 1.08);
      game.fx.ring(this.pos, this.glow, { r0: 0.5, r1: 4.5, life: 0.45, opacity: 0.75 });
      return;
    }

    this._finishMechanic();
  }

  _reappear(game) {
    const player = game.player;
    this.invisible = false;
    this.group.visible = true;
    if (player?.alive) {
      const dx = this.pos.x - player.pos.x, dz = this.pos.z - player.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.pos.set(player.pos.x + (dx / d) * 2.4, 0, player.pos.z + (dz / d) * 2.4);
      arenaClamp(this.pos, 1);
      const dist = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
      if (dist <= 3.6) player.takeDamage(this.damage * 1.55, this, { element: this.element });
      game.fx.burst(new THREE.Vector3(this.pos.x, 1.2, this.pos.z), this.glow, { count: 42, speed: 8, size: 0.3, life: 0.7, up: 3 });
      game.fx.ring(this.pos, this.glow, { r0: 0.5, r1: 6, life: 0.6, opacity: 0.75 });
      game.fx.beam(new THREE.Vector3(this.pos.x, this.baseY, this.pos.z),
        new THREE.Vector3(player.pos.x, 1.2, player.pos.z), this.glow, 0.24, 0.45);
      game.engine.addShake(0.6);
    }
    this._finishMechanic();
  }

  _finishMechanic() {
    this.mechanicKind = null;
    this.mechanicWarned = false;
    this.bodyMat.emissiveIntensity = this.baseEmissive;
    this.mechanicT = (this.isBoss ? 8.5 : 10.5) + Math.random() * 3;
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
      // Leave room for the element set piece: a warden should feel like a
      // sequence of decisions, not a conveyor belt of identical fans.
      this.volleyT = (this.enraged ? 4.8 : 7.2);
      const n = this.enraged ? 16 : 12;
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
      this.chargeT = (this.enraged ? 8.5 : 11.5);
      this.chargeWind = 0.75;
      game.fx.ring(this.pos, this.color, { r0: 0.5, r1: 5, life: 0.6, opacity: 0.6 });
    }

    // summon
    this.summonT -= dt;
    if (this.summonT <= 0) {
      this.summonT = this.enraged ? 12 : 16;
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
    if (this.elementRing) this.elementRing.geometry.dispose();
    if (this.elementRingMat) this.elementRingMat.dispose();
    if (this.elementHalo) this.elementHalo.material.dispose();
    if (this.badgeMat) this.badgeMat.dispose();
  }
}
