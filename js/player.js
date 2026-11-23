/* ============================================================
   HELIOS ELEMENTS — PLAYER
   The guardian: movement, auto-attack, dash, surge, ultimate.
   ============================================================ */

import { arenaClamp, glowTexture, shadowTexture, sigilTexture } from './engine.js';
import {
  relicById, SIEGE, elementMult, WEAPON_RANK, weaponRarityFor, weaponFor, applyWeapon,
  WARDS, WARD_MAX_RANK,
} from './data.js';

export class Player {
  constructor(game, form) {
    this.game = game;
    this.form = form;
    this.sigils = [...form.sigils];
    this.pos = new THREE.Vector3(0, 0, game.mode === 'siege' || game.mode === 'lane' ? 5.4 : 0);
    this.vel = new THREE.Vector3();
    this.dir = new THREE.Vector3(0, 0, 1);
    this.aim = new THREE.Vector3(0, 0, 1);
    this.alive = true;
    this.invuln = 0;
    this.t = 0;
    this.fireTimer = 0.2;
    this.dashTime = 0;
    this.dashCdTimer = 0;
    this.surgeCd = 0;
    this.surgeMax = 1;
    this.charge = 0;
    this.ultReadyAnnounced = false;
    this.lastHurt = 99;
    this.queue = [];
    this.channel = null;
    this.sentinels = [];
    this.boons = [];
    this.relics = { signet: null, talisman: null, crown: null };
    this._relicMaxHpApplied = 0;
    this._relicMaxShieldApplied = 0;
    this.companion = null;
    this.dustT = 0;
    this.weaponRank = 1;
    this.weaponRarity = 'common';
    this.weaponBoost = 1;
    // The rest of the loadout: a second arm and the single ward slot.
    this.sideWeaponKey = null;
    this.sideWeaponRank = 1;
    this.sideWeaponRarity = 'common';
    this.sideWeaponBoost = 1;
    this.sideForm = null;
    this.sideTimer = 0.6;
    this.ward = null;
    this.wardT = 0.8;
    this._wardShield = 0;
    this._wardThorns = 0;

    this.stats = {
      maxHp: 120, hp: 120, maxShield: 0, shield: 0,
      damageMult: 1, intervalMult: 1, extraProjectiles: 0, extraPierce: 0,
      crit: 0, critMult: 1.8, moveMult: 1, magnet: 4.8,
      lifesteal: 0, thorns: 0, cdr: 1, regen: 0, essenceGain: 1,
      execute: 0, aoeBonus: 0, auraSlow: 0, dashCd: 2.2, dashBurst: 0,
      ultGain: 1, ultPower: 1, revive: 0, damageTaken: 1, range: 1,
    };
    if (form.bonus?.maxHpPct) this.stats.maxHp = Math.round(120 * (1 + form.bonus.maxHpPct));
    if (this.game.save?.rewards?.hardened) this.stats.maxHp += 12;
    this.stats.hp = this.stats.maxHp;
    if (form.regen) this.stats.regen += form.regen;

    this._buildMesh();
    if (this.game.save?.rewards?.sun_wisp) this.addCompanion();
  }

  /* ------------- accessors ------------- */
  get hp() { return this.stats.hp; }
  set hp(v) { this.stats.hp = v; }
  get maxHp() { return this.stats.maxHp; }
  get shield() { return this.stats.shield; }
  set shield(v) { this.stats.shield = v; }
  get maxShield() { return this.stats.maxShield; }
  get invulnerable() { return this.invuln > 0 || this.dashTime > 0; }

  /* ------------- mesh ------------- */
  _buildMesh() {
    const form = this.form;
    const group = new THREE.Group();
    group.position.copy(this.pos);

    this.bodyMat = new THREE.MeshStandardMaterial({
      color: form.color, emissive: form.glow, emissiveIntensity: 1.0,
      metalness: 0.55, roughness: 0.22, toneMapped: false,
    });
    this.body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.58, 2), this.bodyMat);
    this.body.castShadow = true;
    group.add(this.body);

    this.shellMat = new THREE.MeshBasicMaterial({
      color: form.glow, transparent: true, opacity: 0.16, wireframe: true,
      toneMapped: false,
    });
    this.shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), this.shellMat);
    group.add(this.shell);

    this.auraMat = new THREE.MeshBasicMaterial({
      color: form.glow, transparent: true, opacity: 0.055, wireframe: true,
      toneMapped: false,
    });
    this.aura = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 0), this.auraMat);
    group.add(this.aura);

    this.coreMat = new THREE.MeshBasicMaterial({ color: form.glow, toneMapped: false });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 14), this.coreMat);
    group.add(this.core);

    this.ringMats = [];
    for (let i = 0; i < 2; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i ? form.glow : form.color, transparent: true, opacity: i ? 0.24 : 0.4,
        toneMapped: false,
      });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.82 + i * 0.26, 0.018, 6, 48), mat);
      ring.rotation.x = Math.PI / 2 + (i ? 0.4 : 0.9);
      ring.rotation.z = i ? -0.4 : 0.3;
      group.add(ring);
      if (i === 0) this.ring1 = ring; else this.ring2 = ring;
      this.ringMats.push(mat);
    }

    // Element identity, legible at a glance: the sigil glyph and its name float
    // over the guardian, and re-draw when a fusion changes the form.
    this.sigilMat = new THREE.SpriteMaterial({
      map: sigilTexture(form.sigil || '✦', form.css || '#ffd98a', (form.name || 'GUARDIAN').toUpperCase()),
      transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false,
    });
    this.sigil = new THREE.Sprite(this.sigilMat);
    this.sigil.scale.set(1.75, 0.77, 1);
    this.sigil.position.set(0, 1.95, 0);
    group.add(this.sigil);

    // Weapon focus: the crystal every shot leaves from, aimed with the body.
    this.focusMat = new THREE.MeshBasicMaterial({ color: form.glow, toneMapped: false, transparent: true, opacity: 0.92 });
    this.focus = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.focusMat);
    this.focus.position.set(0, 0.12, 0.92);
    this.focus.scale.set(0.8, 0.8, 1.9);
    group.add(this.focus);
    this.focusHalo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,.95)', 'rgba(255,220,150,.4)', 'rgba(255,150,40,0)'),
      color: form.glow, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.4, toneMapped: false,
    }));
    this.focusHalo.scale.set(1.5, 1.5, 1);
    this.focus.add(this.focusHalo);
    this.recoil = 0;

    this.shardGroup = new THREE.Group();
    this.shards = [];
    const shardMat = new THREE.MeshBasicMaterial({ color: form.glow, transparent: true, opacity: 0.7, toneMapped: false });
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), shardMat);
      this.shardGroup.add(s);
      this.shards.push(s);
    }
    group.add(this.shardGroup);
    this.shardMat = shardMat;

    this.groundRingMat = new THREE.MeshBasicMaterial({
      color: form.glow, transparent: true, opacity: 0.22,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    this.groundRing = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.5, 40), this.groundRingMat);
    this.groundRing.rotation.x = -Math.PI / 2;
    this.groundRing.position.y = -0.88;
    group.add(this.groundRing);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity: 0.42, depthWrite: false, color: 0x000000 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.895;
    group.add(shadow);

    this.shieldMat = new THREE.MeshBasicMaterial({
      color: 0x7fdfff, transparent: true, opacity: 0, wireframe: true, toneMapped: false,
    });
    this.shieldMesh = new THREE.Mesh(new THREE.SphereGeometry(1.18, 18, 12), this.shieldMat);
    group.add(this.shieldMesh);

    this.light = new THREE.PointLight(form.glow, 1.6, 13, 2);
    this.light.position.y = 0.2;
    group.add(this.light);

    this.group = group;
    this.game.engine.scene.add(group);
    this.updateColors();
  }

  updateColors() {
    const form = this.form;
    this.bodyMat.color.set(form.color);
    this.bodyMat.emissive.set(form.glow);
    this.shellMat.color.set(form.glow);
    this.auraMat.color.set(form.glow);
    this.coreMat.color.set(form.glow);
    this.ringMats[0].color.set(form.color);
    this.ringMats[1].color.set(form.glow);
    this.shardMat.color.set(form.glow);
    this.sigilMat.map = sigilTexture(form.sigil || '✦', form.css || '#ffd98a', (form.name || 'GUARDIAN').toUpperCase());
    this.sigilMat.needsUpdate = true;
    this.focusMat.color.set(form.glow);
    this.focusHalo.material.color.set(form.glow);
    this.groundRingMat.color.set(form.glow);
    this.light.color.set(form.glow);
    for (const s of this.sentinels) {
      s.mesh.material.color.set(form.glow);
      s.halo.material.color.set(form.glow);
    }
  }

  setForm(form, quiet = false) {
    this.form = form;
    this.sigils = [...form.sigils];
    if (form.bonus?.maxHpPct) this.stats.maxHp = Math.max(this.stats.maxHp, Math.round(120 * (1 + form.bonus.maxHpPct)));
    if (form.regen) this.stats.regen = Math.max(this.stats.regen, form.regen);
    this._rebuildSideForm();
    this.updateColors();
    this.game.engine.setAccent(form.color);
    if (quiet) return;
    this.heal(this.stats.maxHp * 0.2);
    this.game.fx.ring(this.pos, form.color, { r0: 1, r1: 9, life: 0.9, opacity: 0.8 });
    this.game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), form.color, { count: 40, speed: 9, size: 0.3, life: 1.1, up: 3 });
    this.game.engine.pulseExposure(0.5);
  }

  /* ------------- the loadout: second arm & ward ------------- */
  _rebuildSideForm() {
    if (!this.sideWeaponKey) { this.sideForm = null; return; }
    const base = this.game.baseForm || this.form;
    const w = weaponFor(this.sigils[0], this.sideWeaponKey);
    this.sideForm = w && w.key !== this.form.weapon?.key ? applyWeapon(base, w) : null;
    if (!this.sideForm) this.sideWeaponKey = null;
  }

  setSidearm(key) {
    const w = weaponFor(this.sigils[0], key);
    if (!w || w.key === this.form.weapon?.key) return false;
    this.sideWeaponKey = w.key;
    this.sideWeaponRank = 1;
    this.sideWeaponRarity = weaponRarityFor(1);
    this.sideWeaponBoost = 1;
    this.sideTimer = 0.5;
    this._rebuildSideForm();
    return !!this.sideForm;
  }

  rankWeapon(piece) {
    if (piece === 'side') {
      if (!this.sideForm || this.sideWeaponRank >= WEAPON_RANK.max) return false;
      this.sideWeaponRank += 1;
      this.sideWeaponRarity = weaponRarityFor(this.sideWeaponRank);
      return true;
    }
    if (this.weaponRank >= WEAPON_RANK.max) return false;
    this.weaponRank += 1;
    this.weaponRarity = weaponRarityFor(this.weaponRank);
    return true;
  }

  setWard(key, rank = 1) {
    const def = WARDS[key];
    if (!def) return false;
    this.ward = { key, rank: Math.max(1, Math.min(WARD_MAX_RANK, rank)) };
    this.wardT = 0.6;
    this.applyWardStats();
    return true;
  }

  rankWard() {
    if (!this.ward || this.ward.rank >= WARD_MAX_RANK) return false;
    this.ward.rank += 1;
    this.applyWardStats();
    return true;
  }

  /* Wards that harden you are paid once, on equip and on every rank. */
  applyWardStats() {
    const def = this.ward ? WARDS[this.ward.key] : null;
    const rank = this.ward?.rank || 0;
    const shield = Math.round((def?.shield || 0) * rank);
    const dShield = shield - this._wardShield;
    if (dShield) {
      this.stats.maxShield = Math.max(0, this.stats.maxShield + dShield);
      if (dShield > 0) this.stats.shield = Math.min(this.stats.maxShield, this.stats.shield + dShield);
      else this.stats.shield = Math.min(this.stats.shield, this.stats.maxShield);
      this._wardShield = shield;
    }
    const thorns = (def?.thorns || 0) * rank;
    if (thorns !== this._wardThorns) {
      this.stats.thorns += thorns - this._wardThorns;
      this._wardThorns = thorns;
    }
  }

  updateWard(dt) {
    const w = this.ward;
    if (!w) return;
    const def = WARDS[w.key];
    if (!def) return;
    if (def.regen) this.heal(def.regen * w.rank * dt, true);
    this.wardT -= dt;
    if (this.wardT > 0) return;
    this.wardT = def.interval || 1.5;
    if (def.heal) this.heal(def.heal * w.rank, true);
    if (!def.damage && !def.slow) return;
    const radius = def.radius || 4;
    this.game.areaDamage(this.pos, radius, (def.damage || 0) * w.rank * this.stats.damageMult, {
      color: def.color,
      knockback: def.knockback || 0,
      slow: def.slow ? { amount: def.slow, duration: 1.6 } : null,
      ignite: def.ignite ? { dps: def.ignite.dps * w.rank, duration: def.ignite.duration } : null,
    });
    this.game.fx.ring(this.pos, def.glow || def.color, { r0: radius * 0.35, r1: radius, life: 0.45, opacity: 0.5 });
  }

  /* ------------- relics & companion ------------- */
  relicBonuses() {
    const out = {};
    for (const slot of ['signet', 'talisman', 'crown']) {
      const eq = this.relics[slot];
      if (!eq) continue;
      const relic = relicById(eq.id);
      if (!relic) continue;
      const rank = Math.max(1, eq.rank || 1);
      for (const [key, value] of Object.entries(relic.mods || {})) {
        out[key] = (out[key] || 0) + value * rank;
      }
    }
    return out;
  }

  relicCrown() {
    const eq = this.relics.crown;
    if (!eq) return null;
    const relic = relicById(eq.id);
    if (!relic) return null;
    return { relic, rank: Math.max(1, eq.rank || 1) };
  }

  syncRelicVitals() {
    const rb = this.relicBonuses();
    const baseHp = this.stats.maxHp - this._relicMaxHpApplied;
    const wantedHp = Math.round(baseHp * (rb.maxHp || 0));
    const deltaHp = wantedHp - this._relicMaxHpApplied;
    if (deltaHp !== 0) {
      this.stats.maxHp += deltaHp;
      if (deltaHp > 0) this.stats.hp += deltaHp;
      this.stats.hp = Math.min(this.stats.hp, this.stats.maxHp);
      this._relicMaxHpApplied = wantedHp;
    }
    const baseShield = this.stats.maxShield - this._relicMaxShieldApplied;
    const wantedShield = Math.round(baseShield * (rb.maxShield || 0));
    const deltaShield = wantedShield - this._relicMaxShieldApplied;
    if (deltaShield !== 0) {
      this.stats.maxShield += deltaShield;
      this.stats.shield = Math.min(this.stats.shield, this.stats.maxShield);
      this._relicMaxShieldApplied = wantedShield;
    }
  }

  addCompanion() {
    if (this.companion) return;
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff0b8, toneMapped: false })
    );
    group.add(core);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,240,.95)', 'rgba(255,220,130,.35)', 'rgba(255,170,60,0)'),
      color: 0xffe7a3, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.scale.set(1.6, 1.6, 1);
    group.add(halo);
    group.position.set(1.3, 1.3, 0);
    this.group.add(group);
    this.companion = { group, core, halo, cd: 1.2, phase: 0 };
  }

  updateCompanion(dt) {
    const c = this.companion;
    if (!c) return;
    c.phase += dt;
    c.group.position.set(Math.cos(c.phase * 1.55) * 1.45, 1.28 + Math.sin(c.phase * 2.3) * 0.18, Math.sin(c.phase * 1.55) * 1.45);
    c.group.rotation.y += dt * 2.1;
    c.halo.scale.setScalar(1.45 + Math.sin(c.phase * 4.2) * 0.12);
    c.cd -= dt;
    if (c.cd > 0) return;
    const target = this.game.pickups?.fetchEssence?.(this.pos, 18);
    if (target) {
      const from = new THREE.Vector3(this.pos.x, 1.55, this.pos.z);
      this.game.fx.beam(from, target, 0xffe7a3, 0.2, 0.28);
      this.game.fx.burst(from, 0xffe7a3, { count: 4, speed: 2.4, size: 0.12, life: 0.3, up: 0.8 });
      c.cd = 2;
    } else {
      c.cd = 0.45;
    }
  }

  /* ------------- combat ------------- */
  tryDash() {
    if (!this.alive || this.dashCdTimer > 0) return false;
    const rb = this.relicBonuses();
    const dashBurst = this.stats.dashBurst + (rb.dashBurst || 0);
    const len = Math.hypot(this.vel.x, this.vel.z);
    if (len > 0.2) this.dashDir = new THREE.Vector3(this.vel.x / len, 0, this.vel.z / len);
    else this.dashDir = this.aim.clone();
    this.dashTime = 0.2;
    this.dashCdTimer = this.stats.dashCd / (1 + (rb.cdr || 0));
    this.invuln = Math.max(this.invuln, 0.32);
    this.game.engine.punchFov(5);
    this.game.audio.dash();
    this.game.fx.ring(this.pos, this.form.glow, { r0: 0.4, r1: 2.6, life: 0.4, opacity: 0.6 });
    this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.8, this.pos.z), this.form.glow, { count: 12, speed: 4, size: 0.2, life: 0.4 });
    if (dashBurst > 0) {
      this.schedule(0.06, () => {
        this.game.areaDamage(this.pos, 3.6, dashBurst * this.stats.damageMult * (1 + (rb.damage || 0)), {
          color: this.form.color, knockback: 3,
        });
        this.game.fx.ring(this.pos, this.form.color, { r0: 0.4, r1: 3.6, life: 0.35, opacity: 0.7 });
      });
    }
    return true;
  }

  trySurge() {
    if (!this.alive || this.surgeCd > 0) return false;
    const rb = this.relicBonuses();
    const surge = this.form.surge;
    this.surgeMax = Math.max(0.5, surge.cd * this.stats.cdr / (1 + (rb.cdr || 0)));
    this.surgeCd = this.surgeMax;
    this.game.audio.surge(this.form.key);
    this.game.fx.flash('ult');
    this.game.engine.pulseExposure(0.18);
    this.game.engine.addShake(0.5);

    const dmg = (surge.damage || 30) * this.stats.damageMult * this.stats.ultPower * (1 + (rb.damage || 0));
    switch (surge.type) {
      case 'nova': {
        this.game.areaDamage(this.pos, surge.radius || 5, dmg, {
          color: this.form.color, ignite: surge.ignite ? this.form.ignite : null,
          slow: surge.slow || null, knockback: 2,
        });
        this.game.fx.ring(this.pos, this.form.color, { r0: 0.6, r1: surge.radius || 5, life: 0.55, opacity: 0.85 });
        this.game.fx.ring(this.pos, this.form.glow, { r0: 0.4, r1: (surge.radius || 5) * 0.7, life: 0.4, opacity: 0.9 });
        this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.7, this.pos.z), this.form.color, { count: 30, speed: 10, size: 0.28, life: 0.7, up: 2 });
        break;
      }
      case 'heal': {
        this.heal(surge.heal || 20);
        this.game.areaDamage(this.pos, surge.radius || 5, dmg, { color: this.form.color, knockback: 5 });
        this.game.fx.ring(this.pos, 0x9dffd0, { r0: 0.6, r1: surge.radius || 5, life: 0.8, opacity: 0.7 });
        this.game.fx.flash('heal');
        this.game.audio.heal();
        break;
      }
      case 'lance': {
        const dir = this.aim.clone();
        const end = this.pos.clone().addScaledVector(dir, 26);
        this.game.lineDamage(this.pos, dir, 26, 2.2, dmg, { color: this.form.color });
        this.game.fx.beam(new THREE.Vector3(this.pos.x, 0.9, this.pos.z), new THREE.Vector3(end.x, 0.9, end.z), this.form.glow, 0.8, 0.38);
        this.game.fx.beam(new THREE.Vector3(this.pos.x, 0.9, this.pos.z), new THREE.Vector3(end.x, 0.9, end.z), 0xffffff, 0.25, 0.3);
        this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.9, this.pos.z), this.form.glow, { count: 16, speed: 6, size: 0.2, life: 0.5 });
        break;
      }
      case 'guard': {
        this.addShield(surge.shield || 30);
        if (surge.heal) this.heal(surge.heal);
        this.game.areaDamage(this.pos, surge.radius || 6, dmg, { color: this.form.color, knockback: 9 });
        this.game.fx.ring(this.pos, this.form.glow, { r0: 0.5, r1: surge.radius || 6, life: 0.7, opacity: 0.8 });
        this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.8, this.pos.z), this.form.color, { count: 26, speed: 8, size: 0.3, life: 0.8 });
        break;
      }
      case 'vortex': {
        this.game.pull(this.pos, surge.radius || 6.5, 12, 0.5);
        this.game.areaDamage(this.pos, surge.radius || 6.5, dmg, { color: this.form.color, color2: this.form.glow });
        this.game.fx.ring(this.pos, this.form.color, { r0: surge.radius || 6.5, r1: 0.5, life: 0.6, opacity: 0.85 });
        this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.8, this.pos.z), this.form.glow, { count: 30, speed: 7, size: 0.22, life: 0.7 });
        break;
      }
      default:
        this.game.areaDamage(this.pos, 5, dmg, { color: this.form.color });
    }
    return true;
  }

  tryUlt() {
    if (!this.alive || this.charge < 100) return false;
    this.charge = 0;
    this.ultReadyAnnounced = false;
    const ult = this.form.ult;
    const power = this.stats.ultPower;
    this.game.audio.ult();
    this.game.fx.flash('ult');
    this.game.engine.pulseExposure(0.75);
    this.game.engine.addShake(1.4);
    this.game.engine.punchFov(8);
    this.game.ui?.banner('ULTIMATE', ult.name, this.form.name);
    this.game.fx.ring(this.pos, this.form.color, { r0: 1, r1: 18, life: 1.1, opacity: 0.7 });
    this.game.fx.ring(this.pos, 0xffffff, { r0: 0.6, r1: 10, life: 0.8, opacity: 0.5 });

    switch (ult.type) {
      case 'meteors': {
        const count = this.form.key === 'magma' ? 12 : 9;
        for (let i = 0; i < count; i++) {
          this.schedule(i * 0.13, () => {
            const target = this.game.enemies.nearest(this.pos, 40) || null;
            const p = target
              ? new THREE.Vector3(target.pos.x + (Math.random() - 0.5) * 2, 0, target.pos.z + (Math.random() - 0.5) * 2)
              : this.game.randomArenaPoint();
            this.game.fx.ring(p, this.form.color, { r0: 0.4, r1: 3.4, life: 0.32, opacity: 0.6 });
            const from = p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 10, 30, (Math.random() - 0.5) * 10));
            this.game.fx.beam(from, new THREE.Vector3(p.x, 0.5, p.z), this.form.glow, 0.35, 0.3);
            this.schedule(0.3, () => {
              this.game.areaDamage(p, 3.5, 62 * power, {
                color: this.form.color, ignite: this.form.ignite, knockback: 4,
              });
              this.game.fx.burst(new THREE.Vector3(p.x, 0.6, p.z), this.form.color, { count: 30, speed: 12, size: 0.35, life: 0.8, up: 4 });
              this.game.fx.ring(p, this.form.glow, { r0: 0.5, r1: 4.2, life: 0.5, opacity: 0.8 });
              this.game.audio.kill();
              this.game.engine.addShake(0.2);
            });
          });
        }
        break;
      }
      case 'deluge': {
        this.heal(this.stats.maxHp * 0.35);
        for (let i = 0; i < 5; i++) {
          this.schedule(0.12 + i * 0.3, () => {
            this.game.areaDamage(this.pos, 8 + i * 1.5, 34 * power, {
              color: this.form.color, knockback: 3, heal: 0,
            });
            this.game.fx.ring(this.pos, this.form.glow, { r0: 1, r1: 9 + i * 1.5, life: 0.6, opacity: 0.6 });
            this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.6, this.pos.z), this.form.glow, { count: 16, speed: 9, size: 0.24, life: 0.6 });
          });
        }
        break;
      }
      case 'tempest': {
        this.channel = { type: 'tempest', t: 3.8, tick: 0, radius: 9.5, dmg: 13 * power };
        break;
      }
      case 'quake': {
        const radii = [11, 18, 25];
        radii.forEach((r, i) => {
          this.schedule(0.15 + i * 0.34, () => {
            this.game.areaDamage(this.pos, r, (40 + i * 22) * power, { color: this.form.color, knockback: 8 });
            this.game.fx.ring(this.pos, this.form.color, { r0: 0.8, r1: r, life: 0.75, opacity: 0.85 });
            this.game.fx.burst(new THREE.Vector3(this.pos.x, 0.5, this.pos.z), this.form.glow, { count: 22, speed: 12, size: 0.3, life: 0.7 });
            this.game.engine.addShake(0.5);
          });
        });
        break;
      }
      case 'beam': {
        for (let i = 0; i < 7; i++) {
          this.schedule(0.12 + i * 0.17, () => {
            const a = i * (Math.PI * 2 / 7) + this.t * 0.4;
            const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
            const end = this.pos.clone().addScaledVector(dir, 30);
            this.game.lineDamage(this.pos, dir, 30, 3.2, 70 * power, { color: this.form.color });
            this.game.fx.beam(new THREE.Vector3(this.pos.x, 1, this.pos.z), new THREE.Vector3(end.x, 1, end.z), this.form.glow, 1.1, 0.4);
            this.game.fx.beam(new THREE.Vector3(this.pos.x, 1, this.pos.z), new THREE.Vector3(end.x, 1, end.z), 0xffffff, 0.3, 0.3);
            this.game.engine.addShake(0.15);
          });
        }
        break;
      }
      case 'oblivion': {
        this.channel = { type: 'oblivion', t: 2.6, tick: 0, radius: 9.5, dmg: 16 * power };
        break;
      }
      default:
        this.game.areaDamage(this.pos, 10, 80 * power, { color: this.form.color });
    }
    return true;
  }

  gainCharge(amount) {
    if (!this.alive) return;
    const before = this.charge;
    this.charge = Math.min(100, this.charge + amount * this.stats.ultGain);
    if (before < 100 && this.charge >= 100 && !this.ultReadyAnnounced) {
      this.ultReadyAnnounced = true;
      this.game.ui?.toast('ULTIMATE READY — PRESS R', this.form.css);
      this.game.audio.levelUp();
    }
  }

  heal(amount, silent = false) {
    if (!this.alive || amount <= 0) return;
    const before = this.stats.hp;
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    const gained = this.stats.hp - before;
    if (gained > 0.5 && !silent) {
      this.game.fx.number(new THREE.Vector3(this.pos.x, 1.9, this.pos.z), '+' + Math.round(gained), 'heal');
    }
  }

  addShield(amount) {
    const cap = this.stats.maxShield + 80;
    this.stats.shield = Math.min(cap, this.stats.shield + amount);
    this.game.fx.number(new THREE.Vector3(this.pos.x, 2.2, this.pos.z), '+' + Math.round(amount), 'shield');
  }

  addSentinel() {
    if (this.sentinels.length >= 3) return;
    const geo = new THREE.SphereGeometry(0.16, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: this.form.glow, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture('rgba(255,255,255,.9)', 'rgba(255,220,150,.35)', 'rgba(255,170,80,0)'),
      color: this.form.glow, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    }));
    halo.scale.set(0.9, 0.9, 1);
    mesh.add(halo);
    this.game.engine.scene.add(mesh);
    this.sentinels.push({ mesh, halo, angle: Math.random() * 6.28, cd: Math.random() * 0.5 });
  }

  takeDamage(amount, source = null) {
    if (!this.alive || this.invulnerable) return;
    const rb = this.relicBonuses();
    amount *= this.stats.damageTaken * Math.max(0.15, 1 - (rb.damageReduction || 0));
    // Elemental affinity: the founding sigil decides what hurts you more.
    if (source?.element) amount *= elementMult(source.element, this.game.defendElement());
    // Sunforge Aegis — guarding the core hardens you.
    if (this.game.coreGuard) amount *= 1 - SIEGE.aegisDr;
    this.game.runStats.damageTaken += amount;
    this.invuln = 0.55;
    this.lastHurt = 0;

    if (this.stats.shield > 0) {
      const absorbed = Math.min(this.stats.shield, amount);
      this.stats.shield -= absorbed;
      amount -= absorbed;
      this.game.fx.number(new THREE.Vector3(this.pos.x, 1.9, this.pos.z), '-' + Math.round(absorbed), 'shield');
      this.game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), 0x7fdfff, { count: 8, speed: 4, size: 0.16, life: 0.35 });
      if (this.stats.shield <= 0) {
        this.game.audio.shieldBreak();
        this.game.fx.flash('hit');
      }
    }

    if (amount > 0.4) {
      this.stats.hp -= amount;
      this.game.fx.number(new THREE.Vector3(this.pos.x, 1.9, this.pos.z), '-' + Math.round(amount), '');
      this.game.audio.hurt();
      this.game.engine.addShake(0.75);
      this.game.fx.flash('hit');
      const thorns = this.stats.thorns + (rb.thorns || 0);
      if (source && thorns > 0) {
        this.game.damageEnemy(source, amount * thorns, { color: 0xffbb66, silent: true });
      }
    }

    if (this.stats.hp <= 0) {
      if (this.stats.revive > 0 && !this.game.isHardcore) {
        this.stats.revive--;
        this.stats.hp = this.stats.maxHp * 0.5;
        this.stats.shield = this.stats.maxShield;
        this.invuln = 2.6;
        this.game.fx.flash('heal');
        this.game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), 0xffe6a8, { count: 50, speed: 10, size: 0.32, life: 1.2, up: 4 });
        this.game.fx.ring(this.pos, 0xfff0c0, { r0: 0.6, r1: 12, life: 1, opacity: 0.9 });
        this.game.audio.fusion();
        this.game.ui?.toast('SECOND WIND — YOU RISE AGAIN', '#ffd98a');
        this.game.engine.pulseExposure(0.8);
        this.game.engine.addShake(1.2);
        return;
      }
      this.die();
    }
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.stats.hp = 0;
    this.game.audio.death();
    this.game.fx.burst(new THREE.Vector3(this.pos.x, 1, this.pos.z), this.form.color, { count: 70, speed: 13, size: 0.4, life: 1.5, up: 5 });
    this.game.fx.ring(this.pos, this.form.color, { r0: 0.6, r1: 14, life: 1.4, opacity: 0.8 });
    this.game.fx.flash('hit');
    this.game.engine.addShake(1.8);
    this.group.visible = false;
    this.game.onPlayerDeath();
  }

  schedule(delay, fn) {
    this.queue.push({ t: delay, fn });
  }

  update(dt) {
    if (!this.alive) return;
    const rb = this.relicBonuses();
    this.t += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.lastHurt += dt;
    this.dashCdTimer = Math.max(0, this.dashCdTimer - dt);
    this.surgeCd = Math.max(0, this.surgeCd - dt);

    // scheduled ultimate actions
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.t -= dt;
      if (q.t <= 0) { this.queue.splice(i, 1); q.fn(); }
    }

    // movement
    const keys = this.game.keys;
    let ix = 0, iz = 0;
    if (this.game.isDown('up') || keys['ArrowUp']) iz -= 1;
    if (this.game.isDown('down') || keys['ArrowDown']) iz += 1;
    if (this.game.isDown('left') || keys['ArrowLeft']) ix -= 1;
    if (this.game.isDown('right') || keys['ArrowRight']) ix += 1;
    const mag = Math.hypot(ix, iz);
    if (mag > 0) { ix /= mag; iz /= mag; }
    const speed = this.form.stats.moveSpeed * this.stats.moveMult * (1 + (this.relicBonuses().move || 0));

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.pos.addScaledVector(this.dashDir, 27 * dt);
      this.game.fx.trail(new THREE.Vector3(this.pos.x, 0.9, this.pos.z), this.form.glow, 0.3, 0.4);
      this.game.fx.trail(new THREE.Vector3(this.pos.x, 0.4, this.pos.z), this.form.color, 0.2, 0.3);
    } else {
      const targetVx = ix * speed;
      const targetVz = iz * speed;
      const accel = 1 - Math.exp(-dt * (mag > 0 ? 16 : 11));
      this.vel.x += (targetVx - this.vel.x) * accel;
      this.vel.z += (targetVz - this.vel.z) * accel;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      if (mag > 0) this.dir.set(ix, 0, iz);
    }

    // low ground dust while running
    if (mag > 0 && this.dashTime <= 0) {
      this.dustT -= dt;
      if (this.dustT <= 0) {
        this.dustT = 0.1;
        this.game.fx.trail(
          new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 0.5, 0.12, this.pos.z + (Math.random() - 0.5) * 0.5),
          this.form.color, 0.1, 0.28
        );
      }
    }

    if (arenaClamp(this.pos, 1.2)) this.vel.multiplyScalar(0.4);
    this.game.structures?.pushOut?.(this.pos, 0.62);

    // aim — lead moving targets by their velocity
    const target = this.game.enemies.nearest(this.pos, 17) || this.game.structures?.gateTarget?.(this.pos, 17) || null;
    if (target) {
      const dx = target.pos.x - this.pos.x;
      const dz = target.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      const lead = Math.min(0.5, dist / Math.max(6, this.form.stats.projSpeed || 15));
      this.aim.set(dx + (target.vx || 0) * lead, 0, dz + (target.vz || 0) * lead).normalize();
    } else if (mag > 0) {
      this.aim.copy(this.dir);
    }

    // attack — the weapon in the firing hand
    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
      const tgt = target || this.game.enemies.nearest(this.pos, 17);
      if (tgt) {
        this.attack(tgt);
        this.fireTimer = Math.max(0.075, this.form.stats.interval * this.stats.intervalMult / (1 + (rb.interval || 0)));
      } else {
        this.fireTimer = 0;
      }
    }

    // the second arm: its own tempo, half a step behind the first
    if (this.sideForm) {
      this.sideTimer -= dt;
      if (this.sideTimer <= 0) {
        // The second arm picks its own target — one the firing hand is not
        // already shooting when there is a choice — and aims at it itself, so
        // the two weapons cover different sides of the crowd.
        const tgt = this.game.enemies.nearest(this.pos, 15, e => e !== target)
          || this.game.enemies.nearest(this.pos, 15)
          || this.game.structures?.gateTarget?.(this.pos, 15) || null;
        if (tgt) {
          // A second-arm rank buys rate and reach as well as damage (fireVolley
          // pays the damage), so growing it competes with growing the firing hand.
          const sideRank = Math.max(1, this.sideWeaponRank || 1);
          const tempo = Math.max(0.5, 1 - WEAPON_RANK.sidearmRankTempo * (sideRank - 1));
          const reach = 1 + WEAPON_RANK.sidearmRankReach * (sideRank - 1);
          const ax = tgt.pos.x - this.pos.x, az = tgt.pos.z - this.pos.z;
          const dist = Math.hypot(ax, az);
          const lead = Math.min(0.5, dist / Math.max(6, this.sideForm.stats.projSpeed || 15));
          const aim = new THREE.Vector3(ax + (tgt.vx || 0) * lead, 0, az + (tgt.vz || 0) * lead).normalize();
          this.fireVolley(this.sideForm, {
            rank: this.sideWeaponRank, rarity: this.sideWeaponRarity, boost: this.sideWeaponBoost,
            damageScale: WEAPON_RANK.sidearmDamage, rangeMult: WEAPON_RANK.sidearmRange * reach,
            angleOffset: 0.13, small: true, aim,
            close: dist <= WEAPON_RANK.closeRange,
          });
          this.sideTimer = Math.max(0.1, this.sideForm.stats.interval * this.stats.intervalMult
            * WEAPON_RANK.sidearmInterval * tempo / (1 + (rb.interval || 0)));
        } else {
          this.sideTimer = 0.12;
        }
      }
    }

    // sentinels
    for (let i = 0; i < this.sentinels.length; i++) {
      const s = this.sentinels[i];
      s.angle += dt * 1.5;
      const a = s.angle + (i / Math.max(1, this.sentinels.length)) * Math.PI * 2;
      s.mesh.position.set(this.pos.x + Math.cos(a) * 1.7, 1.15 + Math.sin(this.t * 2 + i) * 0.12, this.pos.z + Math.sin(a) * 1.7);
      s.cd -= dt;
      if (s.cd <= 0) {
        const e = this.game.enemies.nearest(s.mesh.position, 8);
        if (e) {
          const dir = e.pos.clone().add(new THREE.Vector3(0, 0.7, 0)).sub(s.mesh.position).normalize();
          this.game.projectiles.fire({
            pos: s.mesh.position, dir, speed: 19, damage: this.form.stats.damage * this.stats.damageMult * 0.42 * (1 + (rb.damage || 0)),
            color: this.form.glow, size: 0.65, life: 1.2, pierce: 0, crit: false, trail: true,
          });
          s.cd = 0.72;
        } else {
          s.cd = 0.25;
        }
      }
    }

    // channeled ultimates
    if (this.channel) {
      const c = this.channel;
      c.t -= dt;
      c.tick -= dt;
      if (c.tick <= 0) {
        c.tick = c.type === 'tempest' ? 0.17 : 0.2;
        if (c.type === 'tempest') {
          this.game.areaDamage(this.pos, c.radius, c.dmg, { color: this.form.color, knockback: 1.5 });
          this.game.fx.burst(new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 8, 0.5, this.pos.z + (Math.random() - 0.5) * 8), this.form.glow, { count: 5, speed: 5, size: 0.2, life: 0.4 });
          if (Math.random() < 0.25) this.game.fx.arc(this.pos, new THREE.Vector3(this.pos.x + (Math.random() - 0.5) * 9, 0.5, this.pos.z + (Math.random() - 0.5) * 9), this.form.glow, 0.12);
        } else {
          this.game.pull(this.pos, c.radius + 1, 10, 0.2);
          this.game.areaDamage(this.pos, c.radius, c.dmg, { color: this.form.color });
          this.game.fx.ring(this.pos, this.form.color, { r0: c.radius, r1: 0.8, life: 0.3, opacity: 0.4 });
        }
      }
      if (c.t <= 0) {
        if (c.type === 'oblivion') {
          this.game.areaDamage(this.pos, 11, 90 * this.stats.ultPower, { color: this.form.color, execute: true });
          this.game.fx.ring(this.pos, 0xffffff, { r0: 0.5, r1: 12, life: 0.8, opacity: 0.8 });
          this.game.fx.flash('ult');
          this.game.engine.addShake(1);
        }
        this.channel = null;
      }
    }

    // relics, ward & companion
    const regen = this.stats.regen + (rb.regen || 0);
    if (regen > 0) this.heal(regen * dt, true);
    this.updateWard(dt);
    this.updateCompanion(dt);
    if (this.stats.shield < this.stats.maxShield && this.lastHurt > 5) {
      this.stats.shield = Math.min(this.stats.maxShield, this.stats.shield + 9 * dt);
    }

    this._updateVisual(dt);
  }

  attack(target) {
    const d = target ? Math.hypot(target.pos.x - this.pos.x, target.pos.z - this.pos.z) : 99;
    this.fireVolley(this.form, {
      rank: this.weaponRank, rarity: this.weaponRarity, boost: this.weaponBoost,
      damageScale: 1, rangeMult: 1, angleOffset: 0, small: false,
      close: d <= WEAPON_RANK.closeRange,
    });
  }

  /* One volley from one arm. The second arm calls this with its own stats. */
  fireVolley(f, cfg = {}) {
    const s = this.stats;
    const rb = this.relicBonuses();
    const crown = this.relicCrown();
    const ce = crown?.effect || {};
    const cr = crown?.rank || 1;
    const rankMult = 1 + WEAPON_RANK.perRank * ((cfg.rank || 1) - 1);
    const rarityMult = WEAPON_RANK.rarityMult[cfg.rarity] || 1;
    const closeMult = cfg.close ? WEAPON_RANK.closeBonus : 1;
    const base = f.stats.damage * s.damageMult * (1 + (rb.damage || 0)) * (1 + (this.game.giftBoost || 0))
      * rankMult * rarityMult * (cfg.boost || 1) * (cfg.damageScale || 1) * closeMult;
    const count = Math.max(1, (f.stats.projectiles || 1) + s.extraProjectiles + (rb.projectiles || 0) + (ce.projectiles || 0) * cr);
    const critChance = (f.stats.crit || 0) + s.crit + (rb.crit || 0) + (ce.crit || 0) * cr;
    const pierce = (f.stats.pierce || 0) + s.extraPierce + (rb.pierce || 0) + (ce.pierce || 0) * cr;
    const aoe = (f.stats.aoe || 0) + (rb.aoe || 0) + (ce.aoe || 0) * cr;
    const homing = (f.stats.homing || 0) + (rb.homing || 0) + (ce.homing || 0) * cr;
    const chain = (f.stats.chain || 0) + (rb.chain || 0) + (ce.chain || 0) * cr;
    const knock = (f.stats.knockback || 0) + (ce.knockback || 0) * cr;
    const lifesteal = (f.lifesteal || 0) + s.lifesteal + (rb.lifesteal || 0) + (ce.lifesteal || 0) * cr;
    const critMult = s.critMult + (rb.critMult || 0);
    const ignite = f.ignite || (ce.ignite ? { dps: ce.ignite.dps * cr, duration: ce.ignite.duration } : null);
    const healOnHit = (f.healOnHit || 0) + (ce.healOnHit || 0) * cr;

    // Each weapon class fires its own silhouette instead of the same dot.
    const wkey = f.weapon?.key || '';
    const shape = /maul|fist|landslide/.test(wkey) ? 'boulder'
      : /fan|squall|well|riptide/.test(wkey) ? 'needle'
      : /lance|edge|whip/.test(wkey) ? 'blade' : 'bolt';
    const shotSize = (f.key === 'stone' ? 1.35 : 1) * (shape === 'boulder' ? 1.25 : 1) * (cfg.small ? 0.78 : 1);
    const aimX = cfg.aim ? cfg.aim.x : this.aim.x;
    const aimZ = cfg.aim ? cfg.aim.z : this.aim.z;
    const baseAngle = Math.atan2(aimX, aimZ) + (cfg.angleOffset || 0);
    const spread = count > 1 ? 0.085 : 0;
    for (let i = 0; i < count; i++) {
      const a = baseAngle + (i - (count - 1) / 2) * spread;
      const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const crit = Math.random() < critChance;
      const damage = base * (crit ? critMult : 1);
      const start = new THREE.Vector3(this.pos.x + dir.x * 0.75, 0.92, this.pos.z + dir.z * 0.75);
      this.game.projectiles.fire({
        pos: start, dir, speed: f.stats.projSpeed, damage,
        color: f.color, glow: f.glow, size: shotSize, shape,
        halo: shape === 'boulder' ? 2.9 : 2.4,
        stretch: f.stats.aoe ? 1 : 1.8,
        pierce, homing, aoe, chain, knockback: knock,
        ignite, slow: f.slow || null,
        lifesteal, healOnHit, crit, life: WEAPON_RANK.baseRange * (s.range || 1) * (cfg.rangeMult || 1),
      });
      this.game.fx.trail(start, f.glow, 0.22, 0.2);
    }
    const muzzle = new THREE.Vector3(this.pos.x + aimX * 0.8, 1.02, this.pos.z + aimZ * 0.8);
    this.recoil = Math.max(this.recoil, cfg.small ? 0.45 : 1);
    if (!cfg.small) this.game.audio.shoot(f.key);
    this.game.fx.burst(muzzle, f.glow, { count: cfg.small ? 6 : 10, speed: 4.6, size: cfg.small ? 0.18 : 0.24, life: 0.3, up: 1 });
    this.game.fx.burst(muzzle, 0xffffff, { count: 3, speed: 5.2, size: 0.13, life: 0.2, up: 0.5 });
    this.game.fx.ring(muzzle, f.glow, { r0: 0.15, r1: cfg.small ? 0.8 : 1.15, life: 0.22, opacity: 0.5 });
    this.game.engine.addShake(cfg.small ? 0.02 : 0.04);
  }

  _updateVisual(dt) {
    const g = this.group;
    g.position.set(this.pos.x, 0.9 + Math.sin(this.t * 3.1) * 0.07, this.pos.z);
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.focus.position.z = 0.92 - this.recoil * 0.3;
    this.focus.scale.set(0.8 + this.recoil * 0.55, 0.8 + this.recoil * 0.55, 1.9 + this.recoil * 1.1);
    this.focusHalo.material.opacity = 0.32 + this.recoil * 0.5;
    const targetRot = Math.atan2(this.aim.x, this.aim.z);
    let diff = targetRot - g.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    g.rotation.y += diff * Math.min(1, dt * 10);

    this.body.rotation.y += dt * 0.7;
    this.body.rotation.x += dt * 0.25;
    this.shell.rotation.y -= dt * 0.5;
    this.aura.rotation.y += dt * 0.3;
    this.auraMat.opacity = (this.game.giftT || 0) > 0 ? 0.13 + Math.sin(this.t * 7) * 0.05 : 0.055;
    this.ring1.rotation.z += dt * 1.4;
    this.ring2.rotation.z -= dt * 1.1;
    this.core.scale.setScalar(1 + Math.sin(this.t * 5) * 0.12);

    for (let i = 0; i < this.shards.length; i++) {
      const a = this.t * 1.6 + (i / this.shards.length) * Math.PI * 2;
      const s = this.shards[i];
      s.position.set(Math.cos(a) * 1.05, Math.sin(a * 2 + i) * 0.35, Math.sin(a) * 1.05);
      s.rotation.y += dt * 2;
    }

    const flash = this.invuln > 0 && this.invuln < 0.6 && Math.floor(this.t * 20) % 2 === 0;
    this.bodyMat.emissiveIntensity = flash ? 3.2 : 1.0;
    this.groundRing.rotation.z += dt * 0.6;
    this.groundRingMat.opacity = 0.16 + Math.sin(this.t * 2.4) * 0.06 + (this.dashCdTimer > 0 ? 0 : 0.04);
    this.shieldMat.opacity = this.stats.shield > 0 ? 0.1 + Math.min(0.22, this.stats.shield / 120) : 0;
    this.shieldMesh.rotation.y += dt * 0.4;
    this.light.intensity = 1.5 + Math.sin(this.t * 3) * 0.2;
  }
}
