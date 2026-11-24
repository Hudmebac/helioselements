/* ============================================================
   HELIOS ELEMENTS — PROJECTILES & PICKUPS
   ============================================================ */

import { glowTexture } from './engine.js';

const MAX_PROJ = 240;

export class Projectiles {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.list = [];
    this.pool = [];
    this.geo = new THREE.IcosahedronGeometry(0.28, 1);
    // Each weapon class gets its own shot silhouette.
    this.shapeGeo = {
      orb: this.geo,
      bolt: new THREE.OctahedronGeometry(0.3, 0),
      blade: new THREE.BoxGeometry(0.11, 0.34, 1.16),
      needle: new THREE.ConeGeometry(0.16, 1.0, 6),
      boulder: new THREE.DodecahedronGeometry(0.42, 0),
    };
    this.streakGeo = new THREE.ConeGeometry(0.23, 1.5, 8, 1, true);
    this.haloTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.35)', 'rgba(255,255,255,0)');
    this.hotCoreMat = new THREE.SpriteMaterial({
      map: this.haloTex, color: 0xffffff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.matCache = new Map();
    this.haloCache = new Map();
    this.streakCache = new Map();
  }

  _mat(color) {
    if (!this.matCache.has(color)) {
      this.matCache.set(color, new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    }
    return this.matCache.get(color);
  }

  _haloMat(color) {
    if (!this.haloCache.has(color)) {
      this.haloCache.set(color, new THREE.SpriteMaterial({
        map: this.haloTex, color, transparent: true, opacity: 0.92,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
    }
    return this.haloCache.get(color);
  }

  _streakMat(color) {
    if (!this.streakCache.has(color)) {
      this.streakCache.set(color, new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      }));
    }
    return this.streakCache.get(color);
  }

  fire(cfg) {
    if (this.list.length >= MAX_PROJ) return null;
    let p = this.pool.pop();
    if (!p) {
      const mesh = new THREE.Mesh(this.geo, this._mat(0xffffff));
      const halo = new THREE.Sprite(this._haloMat(0xffffff));
      halo.scale.set(2.0, 2.0, 1);
      mesh.add(halo);
      const streak = new THREE.Mesh(this.streakGeo, this._streakMat(0xffffff));
      streak.rotation.x = -Math.PI / 2;
      streak.position.z = -0.62;
      mesh.add(streak);
      const core = new THREE.Sprite(this.hotCoreMat);
      core.scale.set(0.74, 0.74, 1);
      core.position.z = 0.34;
      mesh.add(core);
      p = { mesh, halo, streak, core, hit: new Set() };
    }
    const mesh = p.mesh;
    mesh.geometry = this.shapeGeo[cfg.shape] || this.geo;
    mesh.material = this._mat(cfg.color ?? 0xffffff);
    p.halo.material = this._haloMat(cfg.glow ?? cfg.color ?? 0xffffff);
    p.halo.scale.setScalar(cfg.halo ?? 2.4);
    p.streak.material = this._streakMat(cfg.glow ?? cfg.color ?? 0xffffff);
    p.streak.scale.set(1, cfg.streakLength ?? 1, 1);
    const sz = cfg.size ?? 1;
    mesh.scale.set(sz, sz, sz * (cfg.stretch ?? 1.6));
    mesh.position.set(cfg.pos.x, cfg.pos.y ?? 0.9, cfg.pos.z);
    mesh.visible = true;
    p.dir = (cfg.dir ? cfg.dir.clone() : new THREE.Vector3(0, 0, 1)).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.dir);
    p.speed = cfg.speed ?? 16;
    p.damage = cfg.damage ?? 10;
    p.pierce = cfg.pierce ?? 0;
    p.homing = cfg.homing ?? 0;
    p.aoe = cfg.aoe ?? 0;
    p.ignite = cfg.ignite || null;
    p.slow = cfg.slow || null;
    p.lifesteal = cfg.lifesteal ?? 0;
    p.healOnHit = cfg.healOnHit ?? 0;
    p.crit = !!cfg.crit;
    p.knockback = cfg.knockback ?? 0;
    p.chain = cfg.chain ?? 0;
    p.life = cfg.life ?? 2.2;
    p.trail = cfg.trail !== false;
    p.trailColor = cfg.glow ?? cfg.color;
    p.color = cfg.color;
    p.isEnemy = !!cfg.isEnemy;
    p.element = cfg.element || null;
    p.fromTower = !!cfg.fromTower;
    p.playerShot = !!cfg.playerShot;
    p.hit.clear();
    p.trailT = 0;
    this.list.push(p);
    this.scene.add(mesh);
    return p;
  }

  update(dt, game) {
    const player = game.player;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) { this._kill(i); continue; }

      // Homing
      if (p.homing > 0) {
        const target = p.isEnemy ? null : game.enemies.nearest(p.mesh.position, 16, e => !p.hit.has(e));
        if (target) {
          const want = _v.copy(target.pos).setY(p.mesh.position.y).sub(p.mesh.position).normalize();
          p.dir.lerp(want, Math.min(1, p.homing * dt * 0.16)).normalize();
        } else if (p.isEnemy && player && player.alive) {
          const want = _v.set(player.pos.x, p.mesh.position.y, player.pos.z).sub(p.mesh.position).normalize();
          p.dir.lerp(want, Math.min(1, p.homing * dt * 0.12)).normalize();
        }
      }

      p.mesh.position.addScaledVector(p.dir, p.speed * dt);
      p.mesh.quaternion.setFromUnitVectors(_z, p.dir);
      p.mesh.rotation.z += dt * 4;

      if (p.trail) {
        p.trailT -= dt;
        if (p.trailT <= 0) {
          p.trailT = 0.018;
          this.fx.trail(p.mesh.position, p.trailColor, 0.19, 0.4);
        }
      }

      const pos = p.mesh.position;
      if (pos.lengthSq() > 46 * 46) { this._kill(i); continue; }

      if (p.isEnemy) {
        if (player && player.alive && !player.invulnerable) {
          const dx = pos.x - player.pos.x, dz = pos.z - player.pos.z;
          if (dx * dx + dz * dz < 1.25) {
            // Enemy fire can miss cleanly or only graze. A miss never resets
            // the player's invulnerability window, because it never landed.
            const roll = game.rollEnemyHit?.() || { kind: 'hit', mult: 1 };
            if (roll.mult <= 0) {
              this.fx.number(new THREE.Vector3(player.pos.x, 1.9, player.pos.z), 'MISS', 'miss');
              this.fx.trail(pos, p.glow ?? p.color, 0.18, 0.25);
              this._kill(i);
              continue;
            }
            player.takeDamage(p.damage * roll.mult, null, { kind: roll.kind, element: p.element });
            this.fx.burst(pos, p.color, { count: 9, speed: 3.4, size: 0.18, life: 0.4 });
            this.fx.ring(pos, p.glow ?? p.color, { r0: 0.2, r1: 1.2, life: 0.2, opacity: 0.5 });
            this._kill(i);
            continue;
          }
        }
        const structure = game.structures?.hitTest(pos, 0.35);
        if (structure) {
          game.structures.damage(structure, p.damage, game);
          this.fx.burst(pos, p.color, { count: 9, speed: 3.4, size: 0.18, life: 0.4 });
          this.fx.ring(pos, p.glow ?? p.color, { r0: 0.2, r1: 1.2, life: 0.2, opacity: 0.5 });
          this._kill(i);
          continue;
        }
      } else {
        // Lane mode — player fire can break the enemy Rift Gates.
        const gate = p.fromTower ? null : game.structures?.gateHitTest?.(pos, 0.45);
        if (gate) {
          game.structures.damageGate(gate, p.damage, game);
          this.fx.burst(pos, p.color, { count: 12, speed: 4.6, size: 0.2, life: 0.32, up: 1.4 });
          this.fx.ring(pos, p.glow ?? p.color, { r0: 0.2, r1: 1.3, life: 0.24, opacity: 0.6 });
          this.audio.hit();
          this._kill(i);
          continue;
        }
        const hit = this._resolveHits(p, game);
        if (hit) {
          const consumed = this._applyHit(p, hit, game);
          if (consumed) { this._kill(i); continue; }
        }
      }
    }
  }

  _resolveHits(p, game) {
    const pos = p.mesh.position;
    let best = null, bestD = Infinity;
    for (const e of game.enemies.list) {
      if (e.dead || p.hit.has(e)) continue;
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      const rr = e.radius + 0.42;
      const d = dx * dx + dz * dz;
      if (d < rr * rr && d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  _applyHit(p, enemy, game) {
    p.hit.add(enemy);
    const pos = p.mesh.position.clone();
    // A shot that touches an enemy can still miss or only graze. Critical
    // damage was rolled when the shot left the weapon; a graze overrides it.
    const roll = p.playerShot && game.rollPlayerHit
      ? game.rollPlayerHit()
      : { kind: 'hit', mult: 1 };
    if (roll.mult <= 0) {
      game.fx.number(
        new THREE.Vector3(enemy.pos.x, enemy.baseY + enemy.radius * 1.4, enemy.pos.z),
        'MISS', 'miss'
      );
      game.fx.trail(pos, p.glow ?? p.color, 0.14, 0.22);
      return true;
    }
    const hitDamage = p.damage * roll.mult;
    game.damageEnemy(enemy, hitDamage, {
      crit: p.crit && roll.kind !== 'graze', graze: roll.kind === 'graze',
      color: p.color, lifesteal: p.lifesteal, hitPos: pos, element: p.element,
    });
    if (p.healOnHit > 0 && game.player) game.player.heal(p.healOnHit, true);
    if (p.ignite && !enemy.dead) enemy.applyBurn(p.ignite.dps, p.ignite.duration);
    if (p.slow && !enemy.dead) enemy.applySlow(p.slow.amount, p.slow.duration);
    if (p.knockback && !enemy.dead) enemy.applyKnockback(p.dir, p.knockback);
    this.fx.burst(pos, p.color, { count: 10, speed: 4.2, size: 0.18, life: 0.3, up: 1.3 });
    this.fx.burst(pos, 0xffffff, { count: 3, speed: 5, size: 0.12, life: 0.18, up: 0.8 });
    this.fx.ring(pos, p.glow ?? p.color, { r0: 0.18, r1: 1.15, life: 0.22, opacity: 0.55 });
    this.audio.hit();

    if (p.aoe > 0) {
      const radius = p.aoe * (1 + (game.player?.stats.aoeBonus || 0));
      game.areaDamage(pos, radius, hitDamage * 0.55, {
        exclude: enemy, color: p.glow ?? p.color, isSplash: true, lifesteal: p.lifesteal, element: p.element,
      });
      this.fx.ring(pos, p.color, { r0: 0.4, r1: radius, life: 0.35, opacity: 0.55 });
    }

    if (p.chain > 0) {
      const next = game.enemies.nearest(pos, 9.5, e => !p.hit.has(e) && !e.dead);
      if (next) {
        p.chain--;
        p.damage *= 0.9;
        const from = pos;
        p.mesh.position.copy(from);
        p.dir.copy(next.pos).sub(from).setY(0).normalize();
        this.fx.arc(from, next.pos, p.glow ?? p.color, 0.16);
        return false;
      }
    }

    if (p.pierce > 0) { p.pierce--; return false; }
    return true;
  }

  _kill(i) {
    const p = this.list[i];
    p.mesh.visible = false;
    this.scene.remove(p.mesh);
    this.list.splice(i, 1);
    if (this.pool.length < 80) this.pool.push(p);
  }

  clear() {
    for (const p of this.list) { p.mesh.visible = false; this.scene.remove(p.mesh); this.pool.push(p); }
    this.list.length = 0;
  }
}

/* ============================================================
   PICKUPS
   ============================================================ */
const MAX_PICKUPS = 90;
export const CORPSE_TTL = 7;
export const PICKUP_TTL = 75;

export class Pickups {
  constructor(scene, fx, audio) {
    this.scene = scene;
    this.fx = fx;
    this.audio = audio;
    this.list = [];
    this.pool = [];
    this.geo = new THREE.OctahedronGeometry(0.17, 0);
    this.shardGeo = new THREE.OctahedronGeometry(0.2, 0);
    this.essenceMat = new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false });
    this.shardMat = new THREE.MeshBasicMaterial({ color: 0x7dffb2, toneMapped: false });
    this.essenceHalo = new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,240,200,.9)', 'rgba(255,190,90,.35)', 'rgba(255,140,40,0)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8, toneMapped: false,
    });
    this.shardHalo = new THREE.SpriteMaterial({
      map: glowTexture('rgba(220,255,230,.9)', 'rgba(90,255,160,.3)', 'rgba(40,255,140,0)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8, toneMapped: false,
    });
    this.kindleGeo = new THREE.TetrahedronGeometry(0.21, 0);
    this.kindleMat = new THREE.MeshBasicMaterial({ color: 0xffb066, toneMapped: false });
    this.kindleHalo = new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,245,215,.95)', 'rgba(255,150,60,.4)', 'rgba(255,80,20,0)'),
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9, toneMapped: false,
    });
  }

  _get() {
    const p = this.pool.pop();
    if (p) return p;
    const mesh = new THREE.Mesh(this.geo, this.essenceMat);
    const halo = new THREE.Sprite(this.essenceHalo);
    halo.scale.set(1.1, 1.1, 1);
    mesh.add(halo);
    return { mesh, halo };
  }

  spawnEssence(pos, value = 1) {
    // Merge nearby essence into one mote so a dense wave does not carpet the floor.
    let merge = null;
    let bestD = 1.2 * 1.2;
    for (const p of this.list) {
      if (p.kind !== 'essence') continue;
      const dx = p.mesh.position.x - pos.x;
      const dz = p.mesh.position.z - pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; merge = p; }
    }
    if (merge) {
      merge.value += value;
      merge.ttl = Math.min(PICKUP_TTL, Math.max(merge.ttl, 0) + 10);
      return merge;
    }
    if (this.list.length >= MAX_PICKUPS) {
      const fallback = this.list.find(p => p.kind === 'essence');
      if (fallback) { fallback.value += value; return fallback; }
      return null;
    }
    const p = this._get();
    p.kind = 'essence';
    p.value = value;
    p.mesh.geometry = this.geo;
    p.mesh.material = this.essenceMat;
    p.halo.material = this.essenceHalo;
    p.mesh.position.set(pos.x + (Math.random() - 0.5) * 0.5, 0.55, pos.z + (Math.random() - 0.5) * 0.5);
    p.mesh.scale.setScalar(1);
    p.mesh.visible = true;
    p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    p.vx = (Math.random() - 0.5) * 2.4;
    p.vz = (Math.random() - 0.5) * 2.4;
    p.t = 0;
    p.ttl = PICKUP_TTL;
    p.magnetized = false;
    p.baseY = 0.55;
    this.scene.add(p.mesh);
    this.list.push(p);
    return p;
  }

  spawnShard(pos) {
    if (this.list.length >= MAX_PICKUPS) return;
    const p = this._get();
    p.kind = 'shard';
    p.value = 18;
    p.mesh.geometry = this.shardGeo;
    p.mesh.material = this.shardMat;
    p.halo.material = this.shardHalo;
    p.mesh.position.set(pos.x, 0.6, pos.z);
    p.mesh.scale.setScalar(1);
    p.mesh.visible = true;
    p.mesh.rotation.set(0, 0, 0.4);
    p.vx = (Math.random() - 0.5) * 1.5;
    p.vz = (Math.random() - 0.5) * 1.5;
    p.t = 0;
    p.ttl = PICKUP_TTL;
    p.magnetized = false;
    p.baseY = 0.6;
    this.scene.add(p.mesh);
    this.list.push(p);
  }

  /* Kindling: the burning motes the dead leave behind. */
  spawnKindling(pos, value = 1) {
    if (this.list.length >= MAX_PICKUPS) return null;
    const p = this._get();
    p.kind = 'kindling';
    p.value = value;
    p.mesh.geometry = this.kindleGeo;
    p.mesh.material = this.kindleMat;
    p.halo.material = this.kindleHalo;
    p.mesh.position.set(pos.x + (Math.random() - 0.5) * 0.4, 0.72, pos.z + (Math.random() - 0.5) * 0.4);
    p.mesh.scale.setScalar(1.3);
    p.mesh.visible = true;
    p.mesh.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    p.vx = (Math.random() - 0.5) * 1.8;
    p.vz = (Math.random() - 0.5) * 1.8;
    p.t = 0;
    p.ttl = PICKUP_TTL;
    p.magnetized = false;
    p.baseY = 0.72;
    this.scene.add(p.mesh);
    this.list.push(p);
    return p;
  }

  fetchEssence(player, range = 18) {
    if (!player) return null;
    const magnet = player.stats.magnet + (player.relicBonuses?.().magnet || 0);
    const reach = Math.max(range, magnet + 12);
    let best = null, bestD = Infinity;
    for (const p of this.list) {
      if (p.kind !== 'essence' || p.magnetized) continue;
      const dx = p.mesh.position.x - player.pos.x;
      const dz = p.mesh.position.z - player.pos.z;
      const d = Math.hypot(dx, dz);
      if (d <= magnet + 1 || d > reach) continue;
      if (d < bestD) { bestD = d; best = p; }
    }
    if (!best) return null;
    best.magnetized = true;
    return best.mesh.position.clone();
  }

  update(dt, game) {
    const player = game.player;
    if (!player || !player.alive) return;
    const magnet = player.stats.magnet + (player.relicBonuses?.().magnet || 0) + (game.magnetBonus || 0);
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.ttl -= dt;
      if (p.ttl <= 0) {
        this.fx.trail(p.mesh.position, 0xffd27a, 0.16, 0.3);
        this._remove(i);
        continue;
      }
      p.mesh.visible = p.ttl > 10 || Math.floor(p.ttl * 8) % 2 === 0;
      const mesh = p.mesh;
      const dx = player.pos.x - mesh.position.x;
      const dz = player.pos.z - mesh.position.z;
      const dist = Math.hypot(dx, dz);

      if (!p.magnetized && dist < magnet) p.magnetized = true;
      if (p.t < 0.35 && !p.magnetized) {
        mesh.position.x += p.vx * dt;
        mesh.position.z += p.vz * dt;
        p.vx *= 0.92; p.vz *= 0.92;
      }

      if (p.magnetized) {
        const pull = Math.min(34, 12 + (magnet - dist) * 5);
        mesh.position.x += (dx / (dist || 1)) * pull * dt;
        mesh.position.z += (dz / (dist || 1)) * pull * dt;
        mesh.position.y += (1.0 - mesh.position.y) * Math.min(1, dt * 6);
      } else {
        // gentle gravity so loot earned at range still finds you
        const soft = Math.max(magnet, 12);
        if (dist < soft) {
          mesh.position.x += (dx / (dist || 1)) * 3.8 * dt;
          mesh.position.z += (dz / (dist || 1)) * 3.8 * dt;
        }
        mesh.position.y = p.baseY + Math.sin(p.t * 3.2) * 0.1;
        p.vx *= 0.98; p.vz *= 0.98;
      }
      mesh.rotation.y += dt * 2.2;
      mesh.rotation.x += dt * 0.9;

      if (dist < 0.95) {
        if (p.kind === 'essence') {
          game.collectEssence(p.value);
          this.fx.burst(mesh.position, 0xffd27a, { count: 4, speed: 2, size: 0.13, life: 0.3, up: 1 });
        } else if (p.kind === 'kindling') {
          game.collectKindling(p.value);
          this.fx.burst(mesh.position, 0xffb066, { count: 9, speed: 3.2, size: 0.19, life: 0.5, up: 1.8 });
          this.fx.ring(mesh.position, 0xffb066, { r0: 0.25, r1: 1.6, life: 0.4, opacity: 0.75 });
          this.audio.shard?.();
        } else {
          game.player.heal(p.value);
          this.fx.burst(mesh.position, 0x7dffb2, { count: 6, speed: 2.4, size: 0.16, life: 0.4, up: 1.4 });
          this.audio.heal();
        }
        this._remove(i);
      }
    }
  }

  _remove(i) {
    const p = this.list[i];
    p.mesh.visible = false;
    this.scene.remove(p.mesh);
    this.list.splice(i, 1);
    if (this.pool.length < 90) this.pool.push(p);
  }

  clear() {
    for (const p of this.list) { p.mesh.visible = false; this.scene.remove(p.mesh); this.pool.push(p); }
    this.list.length = 0;
  }
}

/* ============================================================
   CORPSES — defeated bodies linger briefly, then turn to ash.
   Nothing is allowed to pile up forever.
   ============================================================ */
export class Corpses {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.list = [];
    this.max = 36;
  }

  add(enemy) {
    if (!enemy || !enemy.group || enemy._corpse) return;
    // Tiny creatures vanish into ash immediately; only the heavier bodies linger.
    if (!enemy.isBoss && !enemy.elite && (enemy.key === 'crawler' || enemy.key === 'wisp')) return;
    enemy._corpse = true;
    const group = enemy.group;
    group.rotation.z = (Math.random() - 0.5) * 0.8;
    group.rotation.x = (Math.random() - 0.5) * 0.4;
    group.scale.multiplyScalar(0.94);

    const mats = [];
    group.traverse((o) => {
      const m = o.material;
      if (!m || m.userData?.shared) return;
      if (!m.userData) m.userData = {};
      if (m.userData.corpseBase === undefined) m.userData.corpseBase = m.opacity;
      m.transparent = true;
      if (!mats.includes(m)) mats.push(m);
    });

    // Heavy bodies hold their shape for a moment, then ash out quickly.
    const ttl = enemy.isBoss ? 16 : enemy.elite ? 10 : CORPSE_TTL;
    this.list.push({
      group, enemy, mats, ttl, maxTtl: ttl,
      baseY: group.position.y, baseScale: Math.max(group.scale.x, 0.6), ashT: 0,
    });
    this.fx?.burst?.(
      new THREE.Vector3(group.position.x, group.position.y + 0.6, group.position.z),
      0x9b8f7c, { count: 12, speed: 3.2, size: 0.2, life: 0.7, up: 1.4 }
    );

    while (this.list.length > this.max) {
      this._remove(this.list.shift());
    }
  }

  _remove(c) {
    if (!c) return;
    this.scene.remove(c.group);
    c.group.visible = false;
    c.enemy.dispose?.();
    for (const m of c.mats) m.dispose?.();
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const c = this.list[i];
      c.ttl -= dt;
      if (c.ttl <= 0) {
        this._remove(c);
        this.list.splice(i, 1);
        continue;
      }
      const fadeWindow = Math.max(1.1, c.maxTtl * 0.6);
      const lifeFade = c.ttl < fadeWindow ? c.ttl / fadeWindow : 1;
      const settle = 1 - c.ttl / c.maxTtl;
      c.group.position.y = c.baseY - settle * 0.5;
      c.group.scale.setScalar(c.baseScale * (0.35 + 0.65 * lifeFade));
      for (const m of c.mats) {
        const base = m.userData?.corpseBase ?? 1;
        m.opacity = base * 0.5 * lifeFade;
      }
      c.ashT -= dt;
      if (c.ashT <= 0 && c.ttl > 10 && (c.enemy?.elite || c.enemy?.isBoss) && c.enemy?.color) {
        c.ashT = 1.4;
        this.fx?.trail?.(new THREE.Vector3(c.group.position.x, 0.4, c.group.position.z), c.enemy.color, 0.1, 0.5);
      }
    }
  }

  clear() {
    for (const c of this.list) this._remove(c);
    this.list.length = 0;
  }
}

const _v = new THREE.Vector3();
const _z = new THREE.Vector3(0, 0, 1);
