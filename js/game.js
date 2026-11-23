/* ============================================================
   HELIOS ELEMENTS — GAME
   Run flow, waves, boons, fusion, scoring.
   ============================================================ */

import {
  ELEMENTS, FUSIONS, resolveForm, fusionFor, buildWave, buildLaneWave, buildHuntWave, buildDuelWave, xpToNext,
  ARENAS, WEAPONS, weaponFor, applyWeapon, bestElementMult, ELEMENT_MATCH,
  BOONS, RARITY, BOSSES, MODES, DEFENSES, SIEGE, LANE, HUNT, ESCORT, RITUAL, BLITZ, DUEL,
  WAVE_BONUSES, rollWaveBonus, SKILL_RUN,
  RELICS, RELIC_SLOTS, RELIC_MAX_RANK, relicById,
  PACTS, normalizePacts, pactRanks, pactReward,
  DIFFICULTIES, normalizeDifficulty, difficultyUnlocked, DESCENT,
  CONTROL_ACTIONS, defaultKeys, keyLabel,
  ACHIEVEMENTS, REWARDS,
} from './data.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Projectiles, Pickups, Corpses } from './entities.js';
import { Structures, Caravan, Ritual } from './structures.js';
import { SunlessVault } from './vaults.js';
import { arenaRadiusAt } from './engine.js';
import { persist } from './store.js';

export class Game {
  constructor({ engine, fx, audio, save }) {
    this.engine = engine;
    this.fx = fx;
    this.audio = audio;
    this.save = save;
    this.ui = null;

    this.enemies = new EnemyManager(engine.scene, fx, audio);
    this.projectiles = new Projectiles(engine.scene, fx, audio);
    this.pickups = new Pickups(engine.scene, fx, audio);
    this.corpses = new Corpses(engine.scene, fx);
    this.structures = null;

    this.keys = {};
    this.time = 0;
    this.state = 'menu';
    this.player = null;
    this.mode = MODES[save.mode] ? save.mode : 'siege';
    this.difficulty = normalizeDifficulty(save.difficulty);
    this.skillRun = !!save.skillRun;
    this.pacts = normalizePacts(save.pacts);
    this.caravan = null;
    this.ritual = null;
    this.waveBonus = null;
    this.bonusWaves = 0;
    this.lastBonusId = null;
    this.blitzTimer = 0;
    this.shards = 0;
    this.victory = false;
    this.repairTarget = null;
    this._repairTick = 0;
    this.runId = 0;

    this.wave = 0;
    this.phase = 'idle';
    this.interTimer = 0;
    this.waveClock = 0;
    this.spawnQueue = [];
    this.wavePlan = null;

    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboBest = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = xpToNext(1);
    this.pendingLevels = 0;
    this.cards = [];
    this.runTime = 0;
    this.damageDealt = 0;
    this.essenceTotal = 0;
    this.boonStacks = {};
    this.boons = [];
    this.starterKey = null;
    this._deathHandled = false;

    this.runStats = this._freshRunStats();
    this.pendingRelicDrafts = [];
    this.relicDraft = null;
    this.relicReturnState = 'playing';
    this.relicChoiceCount = 3;
    this.rerolls = 0;
    this.vault = null;
    this._storedToastAt = -9;

    this._bindInput();
  }

  init() {
    this.audio.setMood({ theme: null, element: null });
    if (!this.save.seenWelcome) this.ui.showWelcome();
    else this.ui.showTitle(this.save);
    this.engine.setAccent(0xf5c26b);
  }

  markWelcomeSeen() {
    this.save.seenWelcome = true;
    persist(this.save);
  }

  get isHardcore() { return !!DIFFICULTIES[this.difficulty]?.hardcore; }

  difficultyMeta() { return DIFFICULTIES[this.difficulty] || DIFFICULTIES.solar; }

  /* ---------------- DESCENT ---------------- */
  descentRank() { return Math.max(0, Math.min(DESCENT.max, Math.floor(this.save.descent || 0))); }

  /* Every completed mission raises the descent; each rank makes the next run a little harder. */
  descentMeta() {
    const rank = this.descentRank();
    return { rank, hp: 1 + rank * DESCENT.hp, damage: 1 + rank * DESCENT.damage, marks: 1 + rank * DESCENT.markStep };
  }

  /* Step back down one level of the climb. */
  lowerDescent() {
    const rank = this.descentRank();
    if (rank <= 0) return false;
    this.save.descent = rank - 1;
    persist(this.save);
    return true;
  }

  /* From the results screen: drop a level, then descend again. */
  stepBackDescent() {
    if (!this.lowerDescent()) return false;
    this.restart();
    return true;
  }

  setDifficulty(key) {
    const next = normalizeDifficulty(key);
    if (!difficultyUnlocked(next, this.save)) {
      const req = DIFFICULTIES[next]?.unlock?.text || 'Keep descending';
      this.ui?.toast('LOCKED · ' + req.toUpperCase(), '#ff8a52');
      return false;
    }
    this.difficulty = next;
    this.save.difficulty = next;
    persist(this.save);
    return true;
  }

  setSkillRun(value) {
    this.skillRun = !!value;
    this.save.skillRun = this.skillRun;
    persist(this.save);
    return this.skillRun;
  }

  setWeapon(element, key) {
    const list = WEAPONS[element];
    if (!list || !list.some(w => w.key === key)) return false;
    this.save.weapons = { ...(this.save.weapons || {}), [element]: key };
    persist(this.save);
    return true;
  }

  /* What the guardian strikes with (both halves of a fusion). */
  attackerElements() {
    return this.player?.form?.sigils || [];
  }

  /* What the guardian is made of — the founding sigil defends. */
  defendElement() {
    return this.player?.form?.sigils?.[0] || null;
  }

  /* ---------------- CONTROLS ---------------- */
  keyFor(action) {
    const keys = this.save.settings?.keys;
    if (keys && Object.prototype.hasOwnProperty.call(keys, action)) {
      const bound = keys[action];
      if (bound) return bound;
      if (bound === null) return null; // deliberately released when another action took the key
    }
    const def = CONTROL_ACTIONS.find(a => a.key === action);
    return def ? def.def : null;
  }

  isDown(action) {
    const code = this.keyFor(action);
    return !!(code && this.keys[code]);
  }

  setKey(action, code) {
    if (!code || !CONTROL_ACTIONS.some(a => a.key === action)) return false;
    const keys = { ...defaultKeys(), ...(this.save.settings.keys || {}) };
    for (const k of Object.keys(keys)) {
      if (k !== action && keys[k] === code) keys[k] = null;
    }
    keys[action] = code;
    this.applySettings({ ...this.save.settings, keys });
    return true;
  }

  resetKeys() {
    this.applySettings({ ...this.save.settings, keys: defaultKeys() });
  }

  _freshRunStats() {
    return {
      damageTaken: 0,
      bosses: 0,
      elites: 0,
      vaults: 0,
      relicPicks: 0,
      relicIds: [],
      crownId: null,
    };
  }

  /* ---------------- INPUT ---------------- */
  _bindInput() {
    this._onKeyDown = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const code = e.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(code)) e.preventDefault();
      this.keys[code] = true;
      if (e.repeat) return;

      if (code === this.keyFor('pause') || code === 'KeyP') {
        if (this.state === 'forge') this.closeForge();
        else if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        return;
      }
      if (this.state === 'forge') {
        if (code === this.keyFor('forge')) this.closeForge();
        return;
      }
      if (this.state === 'relic') {
        if (code === 'Digit1') this.chooseRelic(0);
        else if (code === 'Digit2') this.chooseRelic(1);
        else if (code === 'Digit3') this.chooseRelic(2);
        else if (code === 'Digit4') this.chooseRelic(3);
        return;
      }
      if (this.state === 'levelup') {
        if (code === 'Digit1') this.chooseCard(0);
        else if (code === 'Digit2') this.chooseCard(1);
        else if (code === 'Digit3') this.chooseCard(2);
        return;
      }
      if (this.state !== 'playing' || !this.player) return;
      if (code === this.keyFor('dash') || code === 'ShiftLeft' || code === 'ShiftRight') {
        this.player.tryDash();
      } else if (code === this.keyFor('surge')) {
        this.player.trySurge();
      } else if (code === this.keyFor('ult')) {
        this.player.tryUlt();
      } else if (code === this.keyFor('callwave')) {
        this.callWave();
      } else if (code === this.keyFor('forge')) {
        this.openForge();
      } else if (code === this.keyFor('levelup')) {
        this.openLevelUp();
      }
    };

    this._onKeyUp = (e) => { this.keys[e.code] = false; };
    this._onBlur = () => { this.keys = {}; };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  /* ---------------- RUN LIFECYCLE ---------------- */
  start(formKey, modeKey = 'siege') {
    this.teardownRun();
    this.mode = MODES[modeKey] ? modeKey : 'siege';
    this.save.mode = this.mode;
    this.difficulty = normalizeDifficulty(this.save.difficulty);
    this.save.difficulty = this.difficulty;
    this.skillRun = !!this.save.skillRun;
    const diff = this.difficultyMeta();
    this.objMods = diff.objective || {};
    this.pacts = normalizePacts(this.save.pacts);
    this.save.pacts = { ...this.pacts };
    // the rank this run is played at — a victory raises the save's rank, the payout must not follow it up
    this.runDescent = this.descentRank();
    this.relicChoiceCount = 3 + (this.save.rewards?.relic_choice ? 1 : 0) + (diff.relicChoices || 0);
    this.rerolls = (this.save.rewards?.boon_reroll ? 1 : 0) + (diff.rerolls || 0);
    this.starterKey = formKey;
    const modeMeta = MODES[this.mode];
    this.arenaElement = ARENAS[modeMeta.arena]?.element || null;
    this.engine.setArena(modeMeta.arena);
    this.structures = modeMeta.hasCore ? new Structures(this.engine.scene, this.fx, this.audio, this.mode, diff) : null;
    this.caravan = this.mode === 'escort' ? new Caravan(this.engine.scene, this.fx, this.audio, this.objMods) : null;
    this.ritual = this.mode === 'ritual' ? new Ritual(this.engine.scene, this.fx, this.audio, this.objMods) : null;
    const form = resolveForm([formKey]);
    this.weapon = weaponFor(formKey, this.save.weapons?.[formKey]);
    const armed = applyWeapon(form, this.weapon);
    this.player = new Player(this, armed);
    this.engine.setAccent(armed.color);
    this.audio.setMood({ theme: this.arenaElement, element: armed.sigils[0] });

    this.shards = modeMeta.hasCore
      ? (this.mode === 'lane' ? LANE.startShards : SIEGE.startShards) + (this.save.rewards?.starting_shard ? 1 : 0) + (diff.startShards || 0)
      : 0;
    this.player.stats.damageMult *= diff.playerDamage || 1;
    if (diff.noRevive) this.player.stats.revive = 0;
    this.coreThreat = 0;
    this.coreGuard = false;
    this.coreLastLight = false;

    this.victory = false;
    this.repairTarget = null;
    this._repairTick = 0;

    this.state = 'playing';
    this.wave = 1;
    this.phase = 'intermission';
    const interTimers = {
      siege: 6.5, lane: 5, hunt: HUNT.interTimer, escort: ESCORT.interTimer,
      ritual: RITUAL.interTimer, blitz: BLITZ.interTimer, duel: DUEL.interTimer, trial: 4.2,
    };
    this.interTimer = interTimers[this.mode] ?? 4.2;
    this.waveBonus = null;
    this.bonusWaves = 0;
    this.lastBonusId = null;
    this.blitzTimer = 0;
    this.waveClock = 0;
    this.spawnQueue = [];
    this.wavePlan = null;

    this.kills = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboBest = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = xpToNext(1);
    this.pendingLevels = 0;
    this.cards = [];
    this.runTime = 0;
    this.damageDealt = 0;
    this.essenceTotal = 0;
    this.boonStacks = {};
    this.boons = [];
    this._deathHandled = false;
    this._lastStandUsed = false;
    this._gateHinted = {};
    this.keys = {};
    this.runStats = this._freshRunStats();
    this.pendingRelicDrafts = [];
    this.relicDraft = null;
    this.relicReturnState = 'playing';
    this._storedToastAt = -9;
    if (this.save.rewards?.charged_start) this.player.charge = Math.max(this.player.charge, 20);

    this.audio.setIntensity(0.22);
    this.audio.wave();
    this.fx.flash('heal');
    this.engine.pulseExposure(0.25);
    this.engine.addShake(0.4);

    this.ui.enterGame(this);
    this.ui.refreshRelics(this.player);
    if (this.mode === 'siege') {
      this.ui.banner('THE SUNFORGE BURNS', 'DEFEND THE CORE', `Survive 20 waves · ${keyLabel(this.keyFor('forge'))} to forge · ${keyLabel(this.keyFor('repair'))} to repair`);
      this.ui.toast(this.shards + ' SUN SHARDS · RAISE A DEFENSE, THEN HOLD THE LINE', '#ffd98a');
    } else if (this.mode === 'lane') {
      this.ui.banner('THREE LANES OPEN', 'SUNFALL LANES', 'Towers hold the core · your fire breaks the gates');
      this.ui.toast(this.shards + ' SUN SHARDS · TOWER THE PADS, THEN WALK OUT AND SHOOT A RIFT GATE', '#8fe8ff');
    } else if (this.mode === 'hunt') {
      this.ui.banner('THE HUNT BEGINS', 'FOUR WARDENS', 'No core. No walls. Kill them all');
      this.ui.toast('WARDENS COME BACK TO BACK · STAY MOBILE', '#ffb07a');
    } else if (this.mode === 'escort') {
      this.ui.banner('WALK THE LIGHT HOME', 'SOLAR CARAVAN', 'Stay beside it · clear the road · it halts at waystones');
      this.ui.toast('THE RELIQUARY ONLY MOVES WHILE YOU ARE BESIDE IT · CLEAR THE ENEMIES OFF IT', '#8dffc0');
    } else if (this.mode === 'ritual') {
      this.ui.banner('THREE CIRCLES OPEN', 'EMBER RITUAL', 'Stand in a circle · keep the horde off it');
      this.ui.toast('SEAL ALL THREE CIRCLES · CONTESTED CIRCLES LOSE CHARGE', '#ffd166');
    } else if (this.mode === 'blitz') {
      this.ui.banner('THE SUN IS SETTING', 'ECLIPSE BLITZ', 'Clear twelve waves · every kill buys time');
      this.ui.toast('THE CLOCK STARTS WHEN THE WAVE DOES', '#ff6b6b');
    } else if (this.mode === 'duel') {
      this.ui.banner('FOUR CHAMPIONS', 'WARDEN DUEL', 'No escorts. No walls. No excuses');
      this.ui.toast('CHAMPIONS ARE CROWNED · FAR STRONGER THAN THE HORDE', '#ffe9a8');
    } else {
      this.ui.banner('DESCENT BEGINS', form.name.toUpperCase(), form.tagline);
      this.ui.toast(`${['up', 'down', 'left', 'right'].map(a => keyLabel(this.keyFor(a))).join('')} MOVE · AUTO-ATTACK ENGAGED · ${keyLabel(this.keyFor('dash'))} DASH`, '#ffd98a');
    }
    if (this.arenaElement) {
      const arenaEl = ELEMENTS[this.arenaElement];
      const resonant = this.attackerElements().includes(this.arenaElement);
      this.ui.toast(
        arenaEl.sigil + ' ' + arenaEl.name.toUpperCase() + ' ARENA · ' + (resonant ? 'RESONANT · +15% DAMAGE' : 'THE HORDE COMES COUNTERING'),
        resonant ? arenaEl.css : '#ff9a5a'
      );
    }
    if (this.skillRun) {
      this.ui.toast(SKILL_RUN.icon + ' SKILL RUN · NO BOONS · NO RELICS · MASTERY ONLY', SKILL_RUN.css);
    }
    const pactCount = pactRanks(this.pacts);
    if (pactCount > 0) {
      this.ui.toast('ECLIPSE PACT · ' + pactCount + ' RANKS · REWARD ×' + pactReward(this.pacts).toFixed(2), '#c9b5ff');
    }
    if (form.isFusion) this.ui.banner('THE SUN RISES', form.name.toUpperCase(), 'FUSION FORM');
    if (diff.key !== 'solar') {
      this.ui.toast(diff.icon + ' ' + diff.name.toUpperCase() + ' · ' + diff.tagline.toUpperCase(), diff.css);
    }
    if (diff.hardcore) {
      this.ui.toast('HARDCORE · NO SECOND WIND · THE FORGE WILL NOT MEND THE CORE', '#ff5a5a');
    }
    persist(this.save);
  }

  teardownRun() {
    this.runId++;
    this.ui?.hideRelic();
    this.pendingRelicDrafts = [];
    this.relicDraft = null;
    if (this.vault) {
      this.vault.clear();
      this.vault = null;
    }
    this.enemies.clear();
    this.projectiles.clear();
    this.pickups.clear();
    this.corpses.clear();
    if (this.structures) {
      this.structures.clear();
      this.structures = null;
    }
    if (this.caravan) {
      this.caravan.clear();
      this.caravan = null;
    }
    if (this.ritual) {
      this.ritual.clear();
      this.ritual = null;
    }
    this.repairTarget = null;
    this.fx.clear();
    this.ui?.setBoss(null);
    this.ui?.hideForge();
    if (this.player) {
      this.engine.scene.remove(this.player.group);
      for (const s of this.player.sentinels) this.engine.scene.remove(s.mesh);
      this.player = null;
    }
  }

  quitToMenu() {
    this.teardownRun();
    this.state = 'menu';
    this.phase = 'idle';
    this.audio.setIntensity(0.15);
    this.engine.setArena('sanctum');
    this.engine.setAccent(0xf5c26b);
    this.audio.setMood({ theme: null, element: null });
    this.ui.showTitle(this.save);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.pause();
    this.ui.showPause(this);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.resume();
    this.ui.hidePause();
  }

  togglePause() {
    if (this.state === 'playing') this.pause();
    else if (this.state === 'paused') this.resume();
  }

  restart() {
    const key = this.starterKey || 'ember';
    this.ui.hidePause();
    this.ui.hideGameOver();
    this.start(key, this.mode);
  }

  /* ---------------- WAVES ---------------- */
  updateWave(dt) {
    if (this.phase === 'intermission') {
      this.interTimer -= dt;
      if (this.interTimer <= 0) this.startWave();
      return;
    }
    if (this.phase !== 'active') return;

    if (this.mode === 'blitz') {
      this.blitzTimer -= dt;
      if (this.blitzTimer <= 0) {
        this.blitzTimer = 0;
        this.ui.toast('THE SUN SETS · THE BLITZ IS LOST', '#ff5a5a');
        this.finishRun({ cause: 'clock' });
        return;
      }
    }

    this.waveClock += dt;
    while (this.spawnQueue.length && this.spawnQueue[0].delay <= this.waveClock) {
      const entry = this.spawnQueue.shift();
      const lane = entry.lane != null ? this.structures?.lanes?.[entry.lane] : null;
      if (lane && !lane.gate.alive) continue; // that lane is already broken
      const angle = lane ? lane.angle + (Math.random() - 0.5) * 0.1 : this._spawnAngle();
      this.spawnEnemy(entry.type, {
        elite: entry.elite,
        bossIndex: entry.bossIndex ?? this.wavePlan?.bossIndex,
        angle,
        radius: lane ? LANE.laneRadius + 1.2 + Math.random() * 1.4 : undefined,
        laneAngle: lane ? lane.angle : null,
      });
    }

    if (!this.spawnQueue.length && this.activeEnemyCount() === 0) this.onWaveCleared();
  }

  _spawnAngle() {
    let angle = Math.random() * Math.PI * 2;
    if (!this.player) return angle;
    for (let i = 0; i < 10; i++) {
      const r = arenaRadiusAt(angle) - 3;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      if (Math.hypot(x - this.player.pos.x, z - this.player.pos.z) > 13) break;
      angle = Math.random() * Math.PI * 2;
    }
    return angle;
  }

  startWave() {
    const diff = this.difficultyMeta();
    const bonus = rollWaveBonus(this.wave, this.lastBonusId);
    this.waveBonus = bonus;
    if (bonus) this.lastBonusId = bonus.id;
    if (this.mode === 'lane') this.wavePlan = buildLaneWave(this.wave, this.pacts, this.openLanes(), diff, bonus, this.arenaElement);
    else if (this.mode === 'hunt') this.wavePlan = buildHuntWave(this.wave, this.pacts, diff, bonus);
    else if (this.mode === 'duel') this.wavePlan = buildDuelWave(this.wave, this.pacts, diff, bonus);
    else this.wavePlan = buildWave(this.wave, this.pacts, diff, bonus, this.arenaElement);
    // The descent you carried in makes the horde a little tougher than the tier alone.
    const climb = this.descentMeta();
    if (climb.rank) {
      this.wavePlan.hpMult *= climb.hp;
      this.wavePlan.dmgMult *= climb.damage;
    }
    this.spawnQueue = this.wavePlan.entries.map(e => ({ ...e }));
    this.waveClock = 0;
    this.phase = 'active';
    if (this.mode === 'blitz') {
      this.blitzMax = BLITZ.waveTime * (this.objMods?.blitzTime || 1);
      // A warden's fight is set by its health, not the horde clock, so boss waves get their own
      // sunset: the base clock scaled by the tier's warden health instead of the horde timer.
      if (this.wavePlan?.isBoss) this.blitzMax = BLITZ.waveTime * BLITZ.bossTimeMult * (diff.enemyHp || 1) * climb.hp;
      this.blitzTimer = this.blitzMax;
    }
    if (bonus?.charge) this.player?.gainCharge(bonus.charge);

    if (this.wavePlan.isBoss) {
      const boss = BOSSES[this.wavePlan.bossIndex % BOSSES.length];
      const kicker = this.mode === 'hunt' ? 'WARDEN ' + this.wave + ' OF ' + HUNT.goalWave : 'BOSS WAVE';
      this.ui.banner(kicker, (boss.name || 'RIFT WARDEN').toUpperCase(), boss.title || 'THE RIFT STIRS');
      this.audio.boss();
      this.engine.pulseExposure(0.4);
    } else {
      const titles = { siege: 'HOLD THE SUNFORGE', lane: 'DEFEND THE LANES', trial: 'HOLD THE ARENA' };
      const subs = {
        siege: this.wave % 5 === 4 ? 'A warden is coming' : 'The core must survive',
        lane: this.wave % 5 === 4 ? 'A warden marches a lane' : 'Break the gates. Hold the core',
        trial: 'Clear the horde',
      };
      this.ui.banner('WAVE ' + String(this.wave).padStart(2, '0'), titles[this.mode] || titles.trial, subs[this.mode] || subs.trial);
      this.audio.wave();
    }
    if (bonus) this.ui.toast('LEVEL BONUS · ' + bonus.name.toUpperCase() + ' — ' + bonus.desc, bonus.css);
    this.audio.setIntensity(Math.min(1, 0.2 + this.wave * 0.055));
    this.interTimer = 0;
  }

  onWaveCleared() {
    this.audio.waveClear();
    const cleared = this.wave;
    const reward = 10 + cleared * 5;
    const hasCore = !!this.structures?.core;
    let earned = 0;

    if (hasCore) {
      earned = Math.max(1, Math.round((cleared % 5 === 0 ? SIEGE.bossShards : SIEGE.waveShards) * (this.difficultyMeta().shardMult || 1)));
      this.shards += earned;
      this.audio.shard();
      const core = this.structures.core;
      if (core?.alive) {
        this.structures.repair(core, core.maxHp * (this.mode === 'lane' ? LANE.gateClearHeal : SIEGE.coreClearHeal));
        if (core.hp / core.maxHp >= SIEGE.holdPct) {
          this.shards += SIEGE.holdShards;
          this.ui.toast('SUNFORGE HELD · +' + SIEGE.holdShards + ' SHARD', '#ffd98a');
        }
      }
      if (this.mode === 'siege' && cleared >= SIEGE.goalWave) {
        this.onVictory();
        return;
      }
    }

    if (this.mode === 'hunt' && cleared >= HUNT.goalWave) {
      this.onVictory();
      return;
    }
    if (this.mode === 'blitz' && cleared >= BLITZ.goalWave) {
      this.onVictory();
      return;
    }
    if (this.mode === 'duel' && cleared >= DUEL.goalWave) {
      this.onVictory();
      return;
    }

    this.phase = 'intermission';
    this.wave = cleared + 1;
    if (cleared >= 3 && cleared % 4 === 3 && cleared % 5 !== 0) {
      if (this.vault) this.retireVault();
      this.spawnVault();
    }
    const nextTimers = {
      siege: 7, lane: 6.5, hunt: HUNT.interTimer, escort: ESCORT.interTimer,
      ritual: RITUAL.interTimer, blitz: BLITZ.interTimer, duel: DUEL.interTimer, trial: 7,
    };
    this.interTimer = nextTimers[this.mode] ?? 7;
    this.player.heal(this.player.maxHp * 0.12);
    this.player.gainCharge(cleared % 5 === 0 ? 14 : 4);
    this.gainXp(reward);
    if (this.waveBonus) {
      this.bonusWaves++;
      if (this.waveBonus.shards) {
        if (hasCore) this.shards += this.waveBonus.shards;
        else this.gainXp(this.waveBonus.shards * 30);
      }
    }
    this.audio.wave();

    if (this.mode === 'siege') {
      this.ui.banner('WAVE CLEARED', '+' + reward + ' ESSENCE · +' + earned + ' SHARDS', 'The Forge is ready — press B');
      this.ui.toast('FORGE READY · B TO BUILD OR REPAIR', '#ffd98a');
    } else if (this.mode === 'lane') {
      const gates = this.openLanes().length;
      this.ui.banner('WAVE CLEARED', '+' + reward + ' ESSENCE · +' + earned + ' SHARDS', gates + ' RIFT GATE' + (gates === 1 ? '' : 'S') + ' STILL STAND');
      this.ui.toast('FORGE READY · B TO TOWER OR REPAIR', '#8fe8ff');
    } else if (this.mode === 'hunt') {
      this.ui.banner('WARDEN FELLED', '+' + reward + ' ESSENCE', this.wave > HUNT.goalWave ? 'The arena exhales' : 'The next warden is already coming');
    } else if (this.mode === 'escort') {
      this.ui.banner('PATH CLEARED', '+' + reward + ' ESSENCE', 'Stay beside the reliquary to keep it moving');
    } else if (this.mode === 'ritual') {
      const sealed = this.ritual?.sealed || 0;
      this.ui.banner('CIRCLE HOLDS', '+' + reward + ' ESSENCE', sealed + ' / ' + RITUAL.shrineCount + ' circles sealed');
    } else if (this.mode === 'blitz') {
      this.ui.banner('WAVE CLEARED', '+' + reward + ' ESSENCE', 'The next wave starts immediately');
    } else if (this.mode === 'duel') {
      this.ui.banner('CHAMPION FELLED', '+' + reward + ' ESSENCE', this.wave >= DUEL.goalWave ? 'The ring is yours' : 'The next champion steps forward');
    } else {
      this.ui.banner('WAVE CLEARED', '+' + reward + ' ESSENCE', this.wave % 5 === 0 ? 'A warden approaches' : 'Breathe. Then continue');
    }
    if (this.wave % 5 === 0 && !['hunt', 'duel'].includes(this.mode)) this.ui.toast('BOSS WAVE INCOMING', '#ff9be0');
  }

  /* The first time the guardian walks up to a gate, say plainly how it dies. */
  updateGateHint() {
    if (this.mode !== 'lane' || !this.player || !this.structures?.lanes) return;
    this._gateHinted = this._gateHinted || {};
    for (const l of this.structures.lanes) {
      const g = l.gate;
      if (!g.alive || this._gateHinted[l.key]) continue;
      const d = Math.hypot(this.player.pos.x - g.pos.x, this.player.pos.z - g.pos.z);
      if (d < 20) {
        this._gateHinted[l.key] = true;
        this.audio.tab();
        this.ui.toast(l.short + ' RIFT GATE · ONLY YOUR SHOTS BREAK IT · ' + Math.ceil(g.hp) + ' HP', l.css);
      }
    }
  }

  openLanes() {
    if (!this.structures?.lanes?.length) return [0, 1, 2];
    return this.structures.lanes.filter(l => l.gate.alive).map(l => l.index);
  }

  onCaravanWaystone(index) {
    const c = this.caravan;
    const total = c?.waystones?.length || ESCORT.waystones.length;
    this.shards += ESCORT.waystoneShards;
    if (c) c.hp = Math.min(c.maxHp, c.hp + c.maxHp * ESCORT.waystoneHeal);
    this.player?.gainCharge(15);
    this.audio.objective();
    this.ui.banner('WAYSTONE ' + (index + 1) + ' / ' + total, 'THE ROAD IS CLEAR', '+' + ESCORT.waystoneShards + ' shards · the reliquary is mended');
    this.ui.toast('IT MOVES AGAIN · STAY BESIDE THE RELIQUARY', '#8dffc0');
  }

  onCaravanArrived() {
    if (this._deathHandled) return;
    this.ui.banner('THE RELIQUARY IS HOME', 'SOLAR CARAVAN', 'The eastern rift takes the light');
    this.onVictory();
  }

  onCaravanLost() {
    if (this._deathHandled) return;
    this._deathHandled = true;
    if (this.player) this.player.invuln = 99;
    this.ui.banner('THE RELIQUARY SHATTERS', 'SOLAR CARAVAN', 'The light goes out on the road');
    this.finishRun({ cause: 'caravan' });
  }

  onShrineSealed(shrine) {
    this.player?.gainCharge(20);
    this.gainXp(40 + this.wave * 6);
    const sealed = this.ritual?.shrines.filter(s => s.sealed).length || 0;
    this.ui.banner('CIRCLE SEALED', 'THE EMBER GROWS', sealed + ' / ' + RITUAL.shrineCount + ' circles held');
  }

  onRitualComplete() {
    if (this._deathHandled) return;
    this.ui.banner('THE RITUAL IS COMPLETE', 'EMBER RITUAL', 'Three circles, one flame');
    this.onVictory();
  }

  onGateDestroyed(gate) {
    this.shards += LANE.gateShardReward;
    const left = this.openLanes().length;
    this.player?.gainCharge(18);
    this.player?.heal(this.player.maxHp * 0.1);
    // Rift Siphon — every broken gate feeds your sigil for the rest of the run.
    if (this.player) this.player.stats.damageMult *= 1 + LANE.siphon;
    this.audio.fusion();
    if (this.mode === 'lane' && left === 0) {
      this.onVictory();
      return;
    }
    this.ui.banner(
      gate.short + ' GATE BROKEN',
      left + ' LANE' + (left === 1 ? '' : 'S') + ' REMAIN',
      'Their rift is closed — +' + LANE.gateShardReward + ' shards · +' + Math.round(LANE.siphon * 100) + '% siphon'
    );
    this.ui.toast('THE ' + gate.short + ' LANE FALLS SILENT', gate.lane.css);
    this.ui.updateHud(this);
  }

  tryLastStand(core) {
    const stand = this.difficultyMeta().lastStand;
    if (!stand || this._lastStandUsed || !core?.alive) return false;
    this._lastStandUsed = true;
    core.invulnUntil = this.time + stand.shield;
    this.structures?.repair(core, core.maxHp * stand.heal);
    this.ui.banner('LAST STAND', 'THE SUNFORGE REFUSES TO DIE', Math.round(stand.heal * 100) + '% integrity restored · ' + stand.shield + 's of shelter');
    this.fx.flash('heal');
    this.engine.pulseExposure(0.6);
    this.engine.addShake(1);
    this.audio.fusion();
    return true;
  }

  updateCoreGuard(dt) {
    this.coreThreat = 0;
    this.coreGuard = false;
    this.coreLastLight = false;
    const core = this.structures?.core;
    if (!core?.alive || !this.player?.alive) return;

    const p = this.player;
    this.coreGuard = Math.hypot(p.pos.x - core.pos.x, p.pos.z - core.pos.z) <= SIEGE.aegisRadius;
    this.coreLastLight = core.hp / core.maxHp <= SIEGE.lastLightPct;
    if (this.coreGuard && this.coreLastLight) p.gainCharge(SIEGE.lastLightCharge * dt);

    // Hardcore's one comeback: the Sunforge refuses to go out quietly.
    const stand = this.difficultyMeta().lastStand;
    if (stand && core.hp / core.maxHp <= stand.pct) this.tryLastStand(core);

    for (const e of this.enemies.list) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - core.pos.x, e.pos.z - core.pos.z);
      if (d < SIEGE.breachRadius) {
        this.coreThreat++;
        if (this.coreGuard) e.applySlow(SIEGE.aegisSlow, 0.4);
      }
    }

    // The Sunforge knits itself back together when nothing is hitting it.
    if (core.hp < core.maxHp && this.time - (core.lastHit ?? -99) > SIEGE.coreRegenDelay) {
      this.structures.repair(core, SIEGE.coreRegen * dt);
    }
  }

  callWave() {
    if (this.state !== 'playing' || this.phase !== 'intermission') return false;
    const bonus = 8 + this.wave * 4;
    const hasCore = !!this.structures?.core;
    if (hasCore) this.shards += SIEGE.earlyCallShards;
    this.gainXp(bonus);
    this.ui.toast(
      'EARLY CALL · +' + bonus + ' ESSENCE' + (hasCore ? ' · +1 SHARD' : ''),
      '#ffd98a'
    );
    this.fx.flash('heal');
    this.startWave();
    return true;
  }

  spawnEnemy(type, opts = {}) {
    const plan = this.wavePlan || { hpMult: 1, dmgMult: 1, speedMult: 1, bossIndex: 0 };
    const e = this.enemies.spawn(type, {
      hpMult: plan.hpMult,
      dmgMult: plan.dmgMult,
      speedMult: plan.speedMult,
      bossIndex: opts.bossIndex ?? plan.bossIndex,
      elite: opts.elite,
      angle: opts.angle,
      radius: opts.radius,
      laneAngle: opts.laneAngle,
    });
    if (e?.isBoss) this.ui.setBoss(e);
    return e;
  }

  randomArenaPoint() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * Math.max(3, arenaRadiusAt(a) - 4);
    return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
  }

  /* ---------------- DAMAGE ---------------- */
  damageEnemy(enemy, amount, opts = {}) {
    if (!enemy || enemy.dead || amount <= 0) return 0;
    let dmg = amount;
    const p = this.player;
    const attackers = opts.element ? [opts.element] : this.attackerElements();
    const elMult = enemy.element && attackers.length ? bestElementMult(attackers, enemy.element) : 1;
    const resonant = !opts.element && !!this.arenaElement && attackers.includes(this.arenaElement);
    dmg *= elMult * (resonant ? ELEMENT_MATCH.resonance : 1);
    const executeBonus = (p?.stats.execute || 0) + (p?.relicBonuses?.().execute || 0);
    if (opts.execute && enemy.hp / enemy.maxHp < 0.22) dmg = Math.max(dmg, enemy.hp);
    if (executeBonus > 0 && enemy.hp / enemy.maxHp < 0.35) dmg *= 1 + executeBonus;
    // Defending the core inside the Aegis hits harder — and harder still once the light is failing.
    if (this.coreGuard && Math.hypot(enemy.pos.x, enemy.pos.z) < SIEGE.breachRadius) {
      dmg *= 1 + SIEGE.aegisDamage + (this.coreLastLight ? SIEGE.lastLightDamage : 0);
    }

    enemy.hp -= dmg;
    this.damageDealt += dmg;
    enemy.flash();

    if (!opts.dot && !opts.silent) {
      const kind = opts.crit ? 'crit' : elMult > 1 ? 'strong' : elMult < 1 ? 'weak' : '';
      this.fx.number(
        new THREE.Vector3(enemy.pos.x, enemy.baseY + enemy.radius * 1.4, enemy.pos.z),
        String(Math.round(dmg)),
        kind
      );
    }
    if (opts.lifesteal && p) p.heal(dmg * opts.lifesteal, true);
    if (p) p.gainCharge(Math.min(0.5, dmg * 0.012));
    if (enemy.hp <= 0) this.killEnemy(enemy);
    return dmg;
  }

  killEnemy(enemy) {
    if (enemy.dead) return;
    enemy.dead = true;
    const mult = this.comboMult();
    this.kills++;
    this.combo++;
    this.comboTimer = 3.2;
    if (this.combo > this.comboBest) this.comboBest = this.combo;

    const pos = new THREE.Vector3(enemy.pos.x, enemy.baseY, enemy.pos.z);
    this.audio.kill();
    this.fx.burst(pos, enemy.color, {
      count: enemy.isBoss ? 60 : enemy.elite ? 24 : 12,
      speed: enemy.isBoss ? 12 : 6,
      size: enemy.isBoss ? 0.4 : 0.22,
      life: enemy.isBoss ? 1.3 : 0.6,
      up: enemy.isBoss ? 5 : 2,
    });
    this.fx.ring(new THREE.Vector3(enemy.pos.x, 0, enemy.pos.z), enemy.color, {
      r0: 0.3, r1: enemy.isBoss ? 12 : 2.4, life: enemy.isBoss ? 1 : 0.4, opacity: 0.6,
    });

    const value = Math.max(1, Math.round(enemy.xp * mult * (this.wavePlan?.xpScale || 1)));
    let orbs = 1;
    if (enemy.isBoss) orbs = 6;
    else if (enemy.elite) orbs = 2;
    const per = Math.max(1, Math.round(value / orbs));
    for (let i = 0; i < orbs; i++) this.pickups.spawnEssence(enemy.pos, per);

    this.corpses.add(enemy);

    const shardChance = enemy.isBoss ? 1 : enemy.elite ? 0.35 : enemy.key === 'brute' ? 0.2 : 0.055;
    if (Math.random() < shardChance) {
      this.pickups.spawnShard(enemy.pos);
      if (enemy.isBoss) this.pickups.spawnShard(enemy.pos);
    }
    if (enemy.elite && this.wavePlan?.bonus?.eliteShard) this.pickups.spawnShard(enemy.pos);
    if (this.mode === 'blitz' && this.phase === 'active') {
      this.blitzTimer = Math.min(this.blitzMax || BLITZ.waveTime, this.blitzTimer + (enemy.isBoss ? BLITZ.bossBonus : BLITZ.killBonus));
    }

    if (enemy.isBoss) {
      this.runStats.bosses++;
      this.player.gainCharge(26);
      this.player.heal(this.player.maxHp * 0.15);
      // Hardcore's answer to a Forge that will not mend the core: felling a warden does.
      const bossCoreHeal = this.difficultyMeta().bossCoreHeal || 0;
      if (bossCoreHeal > 0 && this.structures?.core?.alive) {
        this.structures.repair(this.structures.core, this.structures.core.maxHp * bossCoreHeal);
        this.ui.toast('WARDEN PYRE · SUNFORGE RESTORED', '#ffd98a');
      }
      this.ui.setBoss(null);
      this.ui.banner('WARDEN FELLED', enemy.name.toUpperCase(), 'THE ARENA EXHALES');
      this.queueRelicDraft('boss', 700);
      this.audio.fusion();
      this.engine.pulseExposure(0.6);
      this.engine.addShake(1.2);
      this.fx.flash('heal');
    } else {
      if (enemy.elite) {
        this.runStats.elites++;
        if (!enemy.vaultGuardian && Math.random() < 0.35) this.queueRelicDraft('elite', 350);
      }
      if (enemy.vaultGuardian) {
        this.runStats.vaults++;
        this.vault?.open();
        this.ui.toast('VAULT BREACHED · THE HOARD OPENS', '#9feaff');
        this.queueRelicDraft('vault', 500);
      }
      this.player.gainCharge(enemy.elite ? 4.5 : 1.8);
      this.engine.addShake(enemy.elite ? 0.25 : 0.06);
    }
  }

  activeEnemyCount() {
    let count = 0;
    for (const e of this.enemies.list) if (!e.dead && !e.optional) count++;
    return count;
  }

  retireVault() {
    if (!this.vault) return;
    const guardian = this.vault.guardian;
    if (guardian && !guardian.dead) guardian.dead = true;
    this.vault.clear();
    this.vault = null;
    this.ui.toast('THE VAULT SINKS BACK INTO THE DARK', '#9feaff');
  }

  spawnVault() {
    if (this.vault || this.state === 'gameover' || !this.player) return null;
    let pos = this.randomArenaPoint();
    for (let i = 0; i < 12; i++) {
      if (Math.hypot(pos.x - this.player.pos.x, pos.z - this.player.pos.z) > 10) break;
      pos = this.randomArenaPoint();
    }
    const vault = new SunlessVault(this.engine.scene, this.fx, pos);
    const angle = Math.atan2(pos.z, pos.x);
    const radius = Math.max(1, Math.hypot(pos.x, pos.z));
    const guardian = this.enemies.spawn('brute', {
      hpMult: (1 + this.wave * 0.07) * 1.9,
      dmgMult: 1 + this.wave * 0.025,
      speedMult: 0.92,
      elite: true,
      angle,
      radius,
    });
    if (guardian) {
      guardian.name = 'Vault Guardian';
      guardian.vaultGuardian = true;
      guardian.optional = true;
      guardian.xp *= 3;
      vault.guardian = guardian;
    }
    this.vault = vault;
    this.ui.toast('SUNLESS VAULT SURFACED · ITS GUARDIAN HOLDS A RELIC', '#ffd98a');
    this.audio.wave();
    this.engine.pulseExposure(0.18);
    return vault;
  }

  queueRelicDraft(source = 'elite', delay = 0) {
    const runId = this.runId;
    if (this.skillRun) {
      const mend = () => {
        if (runId !== this.runId) return;
        this.player?.heal(this.player.maxHp * 0.12);
      };
      if (delay > 0) setTimeout(mend, delay); else mend();
      return;
    }
    const enqueue = () => {
      if (runId !== this.runId || this.state === 'gameover') return;
      if (this.pendingRelicDrafts.length >= 2) {
        this.player?.heal(12);
        return;
      }
      this.pendingRelicDrafts.push(source);
      this._openNextRelicDraft();
    };
    if (delay > 0) setTimeout(enqueue, delay); else enqueue();
  }

  _openNextRelicDraft() {
    if (this.relicDraft || !this.pendingRelicDrafts.length) return;
    if (this.state !== 'playing' && this.state !== 'forge') return;
    if (!this.player) return;
    const source = this.pendingRelicDrafts.shift();
    const cards = this.rollRelicCards(source);
    if (!cards.length) {
      this.player.heal(this.player.maxHp * 0.15);
      this.ui.toast('THE HOARD IS EMPTY · THE LIGHT MENDS YOU', '#ffd98a');
      this._openNextRelicDraft();
      return;
    }
    this.relicReturnState = this.state;
    this.state = 'relic';
    this.relicDraft = { source, cards };
    this.noteRelicSeen(cards);
    this.ui.showRelicDraft(this, this.relicDraft);
  }

  rollRelicCards(source = 'elite') {
    const p = this.player;
    const allowCrown = source === 'boss' || source === 'vault';
    let pool = RELICS.filter(r => {
      if (r.slot === 'crown' && !allowCrown) return false;
      if (r.slot === 'crown' && r.element && !p.sigils.includes(r.element)) return false;
      const equipped = p.relics[r.slot];
      if (equipped && equipped.id === r.id && (equipped.rank || 1) >= (r.maxRank || RELIC_MAX_RANK)) return false;
      return true;
    });
    const picks = [];
    const take = (relic) => {
      pool = pool.filter(x => x.id !== relic.id);
      picks.push(this._decorateRelic(relic));
    };
    for (const slot of ['signet', 'talisman']) {
      if (p.relics[slot]) continue;
      const candidates = pool.filter(r => r.slot === slot);
      if (candidates.length) take(this._weightedRelic(candidates));
    }
    if (allowCrown && !p.relics.crown) {
      const candidates = pool.filter(r => r.slot === 'crown');
      if (candidates.length) take(this._weightedRelic(candidates));
    }
    while (picks.length < this.relicChoiceCount && pool.length) take(this._weightedRelic(pool));
    return picks;
  }

  _weightedRelic(pool) {
    const total = pool.reduce((sum, r) => sum + (RARITY[r.rarity]?.weight || 10), 0);
    let roll = Math.random() * total;
    for (const relic of pool) {
      roll -= RARITY[relic.rarity]?.weight || 10;
      if (roll <= 0) return relic;
    }
    return pool[pool.length - 1];
  }

  _decorateRelic(relic) {
    const equipped = this.player.relics[relic.slot];
    const upgrading = !!equipped && equipped.id === relic.id;
    const rank = upgrading ? Math.min(relic.maxRank || RELIC_MAX_RANK, (equipped.rank || 1) + 1) : 1;
    return {
      ...relic,
      kind: 'relic',
      rank,
      upgrading,
      slotName: RELIC_SLOTS[relic.slot].name,
      replaces: equipped && equipped.id !== relic.id ? relicById(equipped.id) : null,
      css: RARITY[relic.rarity]?.css || '#ffd98a',
    };
  }

  noteRelicSeen(cards) {
    let dirty = false;
    for (const card of cards) {
      const entry = this.save.codex.relics[card.id] || { seen: false, bestRank: 0 };
      if (!entry.seen) {
        entry.seen = true;
        dirty = true;
      }
      this.save.codex.relics[card.id] = entry;
    }
    if (dirty) persist(this.save);
  }

  chooseRelic(index) {
    if (this.state !== 'relic' || !this.relicDraft) return;
    const card = this.relicDraft.cards[index];
    if (!card) return;
    this.equipRelic(card);
    this.relicDraft = null;
    this.state = this.relicReturnState;
    this.ui.hideRelic();
    if (this.state === 'forge') {
      this.ui.showForge(this);
    } else {
      if (this.player) this.player.invuln = Math.max(this.player.invuln, 0.9);
      this.ui.updateHud(this);
      if (this.pendingLevels > 0 && !this.save.settings.storeLevels) this.openLevelUp();
      else this._openNextRelicDraft();
    }
  }

  equipRelic(card) {
    const p = this.player;
    if (!p) return;
    const equipped = p.relics[card.slot];
    const rank = card.upgrading ? Math.min(card.maxRank || RELIC_MAX_RANK, (equipped?.rank || 1) + 1) : 1;
    p.relics[card.slot] = { id: card.id, rank };
    p.syncRelicVitals();
    this.runStats.relicPicks++;
    if (!this.runStats.relicIds.includes(card.id)) this.runStats.relicIds.push(card.id);
    if (card.slot === 'crown') this.runStats.crownId = card.id;
    const entry = this.save.codex.relics[card.id] || { seen: true, bestRank: 0 };
    entry.seen = true;
    entry.bestRank = Math.max(entry.bestRank || 0, rank);
    this.save.codex.relics[card.id] = entry;
    this.ui.refreshRelics(p);
    this.ui.toast(card.name.toUpperCase() + ' · ' + RELIC_SLOTS[card.slot].name + ' ' + rank, card.css);
    this.fx.burst(new THREE.Vector3(p.pos.x, 1.1, p.pos.z), 0xffd98a, {
      count: 24, speed: 5, size: 0.24, life: 0.7, up: 2.5,
    });
    this.fx.ring(p.pos, 0xffd98a, { r0: 0.4, r1: 4, life: 0.6, opacity: 0.7 });
    this.audio.fusion();
    this.engine.pulseExposure(0.28);
    persist(this.save);
  }

  areaDamage(center, radius, amount, opts = {}) {
    const list = [...this.enemies.list];
    for (const enemy of list) {
      if (enemy.dead || enemy === opts.exclude) continue;
      const dx = enemy.pos.x - center.x;
      const dz = enemy.pos.z - center.z;
      const dist = Math.hypot(dx, dz);
      if (dist > radius + enemy.radius) continue;
      const falloff = opts.falloff === false ? 1 : Math.max(0.4, 1 - dist / (radius * 1.5));
      this.damageEnemy(enemy, amount * falloff, {
        crit: false, color: opts.color, lifesteal: opts.lifesteal, execute: opts.execute, element: opts.element,
      });
      if (enemy.dead) continue;
      if (opts.knockback) enemy.applyKnockback(new THREE.Vector3(dx / (dist || 1), 0, dz / (dist || 1)), opts.knockback);
      if (opts.ignite) enemy.applyBurn(opts.ignite.dps, opts.ignite.duration);
      if (opts.slow) enemy.applySlow(opts.slow.amount, opts.slow.duration);
    }
    // Lane pushes: the player's own area attacks also chew through rift gates.
    if (!opts.fromTower) this.structures?.damageGatesInRadius?.(center, radius, amount * 0.4, this);
  }

  lineDamage(origin, dir, length, width, amount, opts = {}) {
    const dx = dir.x, dz = dir.z;
    for (const enemy of [...this.enemies.list]) {
      if (enemy.dead) continue;
      const ex = enemy.pos.x - origin.x;
      const ez = enemy.pos.z - origin.z;
      const t = Math.max(0, Math.min(length, ex * dx + ez * dz));
      const px = origin.x + dx * t;
      const pz = origin.z + dz * t;
      const dist = Math.hypot(enemy.pos.x - px, enemy.pos.z - pz);
      if (dist < width + enemy.radius) {
        this.damageEnemy(enemy, amount, { crit: false, color: opts.color });
        if (opts.knockback) enemy.applyKnockback(dir, opts.knockback);
      }
    }
  }

  pull(center, radius, strength, dt) {
    for (const e of this.enemies.list) {
      if (e.dead || e.isBoss) continue;
      const dx = center.x - e.pos.x;
      const dz = center.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < radius && d > 1.2) {
        const f = strength * dt * (1 - d / radius);
        e.pos.x += (dx / d) * f;
        e.pos.z += (dz / d) * f;
        if (Math.random() < 0.1) this.fx.trail(new THREE.Vector3(e.pos.x, 0.7, e.pos.z), 0xc9a6ff, 0.12, 0.25);
      }
    }
  }

  /* ---------------- PROGRESSION ---------------- */
  collectEssence(value) {
    if (this.state !== 'playing') return;
    const gain = Math.max(1, Math.round(value * (this.player.stats.essenceGain + (this.player.relicBonuses?.().essence || 0))));
    this.essenceTotal += gain;
    this.player.gainCharge(0.12);
    this.audio.pickup();
    this.gainXp(gain);
  }

  gainXp(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpToNext(this.level);
      if (this.skillRun) this.applyMastery();
      else this.pendingLevels++;
      leveled = true;
    }
    if (!leveled || this.state !== 'playing') return;
    if (this.save.settings.storeLevels) {
      if (this.time - this._storedToastAt > 2) {
        this._storedToastAt = this.time;
        this.ui.toast('LEVEL UP STORED · PRESS L WHEN READY', '#ffd98a');
      }
      this.ui.updateHud(this);
    } else {
      this.openLevelUp();
    }
  }

  comboMult() {
    return 1 + Math.min(3, Math.floor(this.combo / 5) * 0.25);
  }

  applyMastery() {
    const p = this.player;
    if (!p) return;
    const m = SKILL_RUN.mastery;
    p.stats.damageMult *= 1 + m.damage;
    p.stats.intervalMult *= 1 - m.interval;
    p.stats.maxHp += m.maxHp;
    p.stats.hp = Math.min(p.stats.maxHp, p.stats.hp + m.maxHp);
    p.syncRelicVitals?.();
    this.ui.toast('MASTERY · LV ' + this.level + ' · +6% DMG · +4% TEMPO · +8 HP', SKILL_RUN.css);
    this.fx.ring(new THREE.Vector3(p.pos.x, 0.1, p.pos.z), 0x8fe6ff, { r0: 0.4, r1: 2.6, life: 0.5, opacity: 0.5 });
  }

  openLevelUp() {
    if (this.skillRun) return false;
    if (this.state !== 'playing' || !this.player?.alive || this.pendingLevels <= 0) return false;
    this.state = 'levelup';
    this.cards = this.rollCards();
    this.audio.levelUp();
    this.fx.flash('ult');
    this.engine.pulseExposure(0.35);
    this.engine.addShake(0.2);
    this.ui.showLevelUp(this, this.cards);
    return true;
  }

  rerollCards() {
    if (this.state !== 'levelup' || this.rerolls <= 0) return false;
    this.rerolls--;
    this.cards = this.rollCards();
    this.audio.ui();
    this.ui.showLevelUp(this, this.cards);
    return true;
  }

  rollCards() {
    const cards = [];
    const p = this.player;

    if (p.sigils.length < 2 && this.level >= 3) {
      const partners = this._fusionPartners();
      if (partners.length) {
        const key = partners[Math.floor(Math.random() * partners.length)];
        const el = ELEMENTS[key];
        const fusion = fusionFor(p.sigils[0], key);
        cards.push({
          kind: 'sigil',
          elementKey: key,
          name: 'Attune · ' + el.name,
          desc: el.tagline + ' — fuses into ' + fusion.name + '. ' + fusion.passive,
          icon: el.sigil,
          rarity: 'epic',
          css: el.css,
          fusionName: fusion.name,
        });
      }
    }

    const pool = BOONS.filter(b => (this.boonStacks[b.id] || 0) < b.max && !(this.isHardcore && b.id === 'second_wind'));
    while (cards.length < 3 && pool.length) {
      const total = pool.reduce((s, b) => s + RARITY[b.rarity].weight * (b.weight / 100), 0);
      let r = Math.random() * total;
      let idx = 0;
      for (; idx < pool.length; idx++) {
        r -= RARITY[pool[idx].rarity].weight * (pool[idx].weight / 100);
        if (r <= 0) break;
      }
      idx = Math.min(idx, pool.length - 1);
      const b = pool.splice(idx, 1)[0];
      const stack = (this.boonStacks[b.id] || 0) + 1;
      cards.push({
        kind: 'boon', id: b.id, name: b.name, desc: b.desc, icon: b.icon,
        rarity: b.rarity, css: RARITY[b.rarity].css, stack, max: b.max,
      });
    }

    while (cards.length < 3) {
      cards.push({
        kind: 'boon', id: 'warmth', name: 'Warmth', desc: 'Heal 40 health and gain 8 max health.',
        icon: '☀', rarity: 'common', css: RARITY.common.css, stack: 1, max: 99,
      });
    }
    // keep the sigil card first for clarity, shuffle the rest
    const [first, ...rest] = cards;
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return [first, ...rest];
  }

  _fusionPartners() {
    const own = this.player.sigils[0];
    const partners = [];
    for (const f of Object.values(FUSIONS)) {
      if (f.pair.includes(own)) {
        const other = f.pair[0] === own ? f.pair[1] : f.pair[0];
        if (!this.player.sigils.includes(other)) partners.push(other);
      }
    }
    return partners;
  }

  chooseCard(index) {
    if (this.state !== 'levelup') return;
    const card = this.cards[index];
    if (!card) return;

    if (card.kind === 'sigil') {
      this.applySigil(card.elementKey);
    } else {
      this.applyBoon(card);
    }
    this.player.syncRelicVitals();
    this.audio.ui();
    this.pendingLevels = Math.max(0, this.pendingLevels - 1);
    this.ui.refreshBoons(this.player);

    if (this.pendingLevels > 0) {
      this.cards = this.rollCards();
      this.ui.showLevelUp(this, this.cards);
    } else {
      this.state = 'playing';
      this.ui.hideLevelUp();
      if (this.player) this.player.invuln = Math.max(this.player.invuln, 0.9);
      this.engine.pulseExposure(0.18);
      this._openNextRelicDraft();
    }
  }

  applyBoon(card) {
    const boon = BOONS.find(b => b.id === card.id);
    if (!boon) return;
    boon.apply(this.player);
    this.player.syncRelicVitals();
    if (this.isHardcore) this.player.stats.revive = 0;
    this.boonStacks[boon.id] = (this.boonStacks[boon.id] || 0) + 1;
    this.player.boons.push({ ...card });
    this.ui.toast(boon.name.toUpperCase() + ' ACQUIRED', card.css);
    this.fx.burst(new THREE.Vector3(this.player.pos.x, 1.2, this.player.pos.z), 0xffd98a, {
      count: 16, speed: 4, size: 0.2, life: 0.6, up: 2,
    });
  }

  applySigil(elementKey) {
    const el = ELEMENTS[elementKey];
    const fusion = fusionFor(this.player.sigils[0], elementKey);
    this.player.sigils.push(elementKey);
    if (fusion) {
      const form = resolveForm([this.player.sigils[0], elementKey]);
      this.player.setForm(applyWeapon(form, this.weapon));
      this.player.sigils = [this.player.sigils[0], elementKey];
      this.audio.setMood({ theme: this.arenaElement, element: form.sigils[0] });
      this.ui.fusion(form);
      this.audio.fusion();
      this.engine.pulseExposure(0.8);
      this.engine.addShake(1.2);
      this.ui.refreshBoons(this.player);
    }
  }

  /* ---------------- FORGE ---------------- */
  openForge() {
    if (!this.structures || this.state !== 'playing') return false;
    this.state = 'forge';
    this.keys = {};
    this.ui.showForge(this);
    return true;
  }

  closeForge() {
    if (this.state !== 'forge') return;
    this.state = 'playing';
    this.ui.hideForge();
    this.ui.updateHud(this);
    if (this.pendingLevels > 0 && !this.save.settings.storeLevels) this.openLevelUp();
    else this._openNextRelicDraft();
  }

  buildDefense(key) {
    if (this.state !== 'forge' || !this.structures) return false;
    const def = DEFENSES[key];
    if (!def) return false;
    if (!this.structures.freePedestal()) {
      this.ui.toast(this.mode === 'lane' ? 'EVERY LANE PAD IS OCCUPIED' : 'ALL PEDESTALS ARE OCCUPIED', '#ff8a52');
      return false;
    }
    if (this.shards < def.cost) {
      this.ui.toast('NOT ENOUGH SUN SHARDS', '#ff8a52');
      return false;
    }
    const built = this.structures.build(key);
    if (!built) return false;
    this.shards -= def.cost;
    this.ui.toast(def.name.toUpperCase() + ' RAISED', def.css);
    this.audio.fusion();
    this.engine.pulseExposure(0.25);
    this.ui.refreshForge(this);
    this.ui.updateHud(this);
    return true;
  }

  upgradeDefense(index) {
    if (this.state !== 'forge' || !this.structures) return false;
    const ped = this.structures.pedestals[index];
    const d = ped?.defense;
    if (!d?.alive) return false;
    const def = d.type;
    const maxRank = def.maxRank || 3;
    if ((d.rank || 1) >= maxRank) {
      this.ui.toast('ALREADY AT MAX RANK', '#ffd98a');
      return false;
    }
    const cost = def.upgradeCost || 2;
    if (this.shards < cost) {
      this.ui.toast('NOT ENOUGH SUN SHARDS', '#ff8a52');
      return false;
    }
    this.shards -= cost;
    const rank = this.structures.upgrade(d, this);
    this.ui.toast(def.name.toUpperCase() + ' RANK ' + rank, def.css);
    this.audio.fusion();
    this.ui.refreshForge(this);
    this.ui.updateHud(this);
    return true;
  }

  repairCore() {
    if (this.state !== 'forge' || !this.structures?.core?.alive) return false;
    if (this.isHardcore) {
      this.ui.toast('HARDCORE · THE FORGE REFUSES TO MEND THE SUNFORGE', '#ff5a5a');
      return false;
    }
    const core = this.structures.core;
    if (core.hp >= core.maxHp) {
      this.ui.toast('THE SUNFORGE IS ALREADY WHOLE', '#ffd98a');
      return false;
    }
    if (this.shards < SIEGE.repairCost) {
      this.ui.toast('NOT ENOUGH SUN SHARDS', '#ff8a52');
      return false;
    }
    this.shards -= SIEGE.repairCost;
    this.structures.repair(core, core.maxHp * SIEGE.repairPct);
    this.fx.ring(new THREE.Vector3(0, 0.2, 0), 0xffd98a, { r0: 1, r1: 7, life: 0.8, opacity: 0.8 });
    this.fx.burst(new THREE.Vector3(0, 2.2, 0), 0xffd98a, { count: 30, speed: 6, size: 0.28, life: 0.9, up: 3 });
    this.audio.fusion();
    this.ui.toast('SUNFORGE RESTORED', '#ffd98a');
    this.ui.refreshForge(this);
    this.ui.updateHud(this);
    return true;
  }

  updateRepair(dt) {
    this.repairTarget = null;
    if (!this.structures || !this.player?.alive) return;
    const p = this.player;
    const candidates = [];
    const core = this.structures.core;
    if (core?.alive && core.hp < core.maxHp) candidates.push(core);
    for (const d of this.structures.defenses) {
      if (d.alive && d.hp < d.maxHp) candidates.push(d);
    }
    let best = null, bestD = 5.2 * 5.2;
    for (const c of candidates) {
      const dx = c.pos.x - p.pos.x, dz = c.pos.z - p.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < bestD) { bestD = d2; best = c; }
    }
    if (!best) return;
    this.repairTarget = best;
    if (!this.isDown('repair')) return;

    const healed = this.structures.repair(best, SIEGE.repairRate * (this.difficultyMeta().repairMult || 1) * dt);
    if (healed > 0) {
      if (this.time - this._repairTick > 0.28) {
        this._repairTick = this.time;
        this.audio.pickup();
      }
      this.fx.trail(new THREE.Vector3(best.pos.x + (Math.random() - 0.5) * 1.4, 1 + Math.random() * 2, best.pos.z + (Math.random() - 0.5) * 1.4), 0xffd98a, 0.16, 0.35);
      if (Math.random() < dt * 18) {
        this.fx.beam(
          new THREE.Vector3(p.pos.x, 1.1, p.pos.z),
          new THREE.Vector3(best.pos.x, best.kind === 'core' ? 2.7 : 1.6, best.pos.z),
          0xffd98a, 0.05, 0.1
        );
      }
    }
  }

  /* ---------------- META ---------------- */
  adjustPact(key, delta) {
    if (!PACTS[key] || (this.state !== 'menu' && this.state !== 'gameover')) return false;
    const pacts = normalizePacts(this.pacts);
    pacts[key] = Math.max(0, Math.min(PACTS[key].max, pacts[key] + delta));
    this.pacts = normalizePacts(pacts);
    this.save.pacts = { ...this.pacts };
    persist(this.save);
    return true;
  }

  buyReward(id) {
    const reward = REWARDS.find(r => r.id === id);
    if (!reward) return false;
    if (this.save.rewards[id]) {
      this.ui?.toast('ALREADY UNLOCKED', '#ffd98a');
      return false;
    }
    if ((this.save.marks || 0) < reward.cost) {
      this.ui?.toast('NOT ENOUGH SUNMARKS', '#ff8a52');
      return false;
    }
    this.save.marks -= reward.cost;
    this.save.rewards[id] = true;
    if (id === 'boon_reroll') this.rerolls = Math.max(this.rerolls, 1);
    if (id === 'relic_choice') this.relicChoiceCount = 4;
    if (id === 'sun_wisp' && this.player) this.player.addCompanion();
    if (id === 'hardened' && this.player) {
      this.player.stats.maxHp += 12;
      this.player.stats.hp += 12;
    }
    if (id === 'charged_start' && this.player) this.player.gainCharge(20);
    if (id === 'starting_shard' && this.player && this.structures?.core) this.shards += 1;
    persist(this.save);
    this.ui?.toast(reward.name.toUpperCase() + ' UNLOCKED', '#ffd98a');
    this.ui?._renderCodex?.('dawn');
    if (this.player) this.ui?.updateHud(this);
    return true;
  }

  awardRunProgress({ reached, victory, corePct }) {
    const starter = this.starterKey || 'ember';
    const pactsTotal = pactRanks(this.pacts);
    const pactMult = pactReward(this.pacts);
    const diff = this.difficultyMeta();
    const player = this.player;
    const resolvedCore = corePct ?? (this.structures?.core?.maxHp ? Math.max(0, this.structures.core.hp / this.structures.core.maxHp) : 1);
    const run = {
      mode: this.mode,
      victory,
      wave: reached,
      skillRun: this.skillRun,
      bonusWaves: this.bonusWaves,
      caravanPct: this.caravan ? Math.round(this.caravan.progress * 100) : 0,
      ritualSealed: this.ritual ? this.ritual.sealed : 0,
      kills: this.kills,
      time: this.runTime,
      level: this.level,
      damage: Math.round(this.damageDealt),
      damageTaken: Math.round(this.runStats.damageTaken),
      essence: Math.round(this.essenceTotal),
      shards: this.shards,
      bosses: this.runStats.bosses,
      elites: this.runStats.elites,
      vaults: this.runStats.vaults,
      relicPicks: this.runStats.relicPicks,
      relicIds: [...this.runStats.relicIds],
      relicSlots: Object.fromEntries(['signet', 'talisman', 'crown'].map(slot => [slot, player?.relics?.[slot]?.id || null])),
      crownId: this.runStats.crownId,
      pactsTotal,
      pactMult,
      corePct: resolvedCore,
      playerHpPct: player?.stats?.maxHp ? Math.max(0, player.stats.hp / player.stats.maxHp) : 0,
      form: player?.form?.name || '',
      starterKey: starter,
      difficulty: this.difficulty,
      difficultyName: diff.name,
      difficultyRank: diff.rank,
      hardcore: !!diff.hardcore,
    };

    const priorRuns = Math.max(0, (this.save.runs || 1) - 1);
    const priorSigilRuns = this.save.sigilRuns[starter] || 0;
    const bestSigilRuns = Math.max(0, ...Object.values(this.save.sigilRuns || {}));
    const catchUp = priorRuns >= 2 && bestSigilRuns > 0 && priorSigilRuns < bestSigilRuns * 0.5 ? 1.2 : 1;
    const descentRank = Number.isFinite(this.runDescent) ? this.runDescent : this.descentRank();
    const descentMult = 1 + descentRank * DESCENT.markStep;
    let marks = Math.max(1, Math.floor((1 + reached * 0.35 + (victory ? 4 : 0)) * pactMult * (diff.markMult || 1) * (this.skillRun ? SKILL_RUN.markMult : 1) * descentMult));
    marks = Math.max(1, Math.round(marks * catchUp));

    this.save.sigilRuns[starter] = priorSigilRuns + 1;
    if (victory) this.save.sigilWins[starter] = (this.save.sigilWins[starter] || 0) + 1;

    const newAchievements = [];
    let achievementMarks = 0;
    for (const achievement of ACHIEVEMENTS) {
      if (this.save.achievements[achievement.id]) continue;
      let earned = false;
      try { earned = !!achievement.check(run, this.save); } catch (e) { earned = false; }
      if (!earned) continue;
      this.save.achievements[achievement.id] = true;
      newAchievements.push(achievement);
      achievementMarks += achievement.points || 0;
    }
    this.save.marks = Math.max(0, (this.save.marks || 0) + marks + achievementMarks);
    return { marks, achievementMarks, newAchievements, catchUp, pactsTotal, pactMult, run, descentRank, descentMult };
  }

  /* ---------------- DEATH / VICTORY ---------------- */
  onPlayerDeath() {
    if (this._deathHandled) return;
    this._deathHandled = true;
    this.finishRun({ cause: 'player' });
  }

  onCoreDestroyed() {
    if (this._deathHandled || this.state === 'gameover') return;
    this._deathHandled = true;
    if (this.player) this.player.invuln = 99;
    this.finishRun({ cause: 'core' });
  }

  onVictory() {
    if (this._deathHandled) return;
    this._deathHandled = true;
    this.victory = true;
    if (this.player) this.player.invuln = 99;
    const lines = {
      siege: ['DAWN RESTORED', 'THE SUNFORGE HOLDS', 'Twenty waves survived'],
      lane: ['THE LANES ARE YOURS', 'SUNFORGE STANDS', 'Three rift gates shattered'],
      hunt: ['THE HUNT ENDS', 'FOUR WARDENS FELLED', 'The arena is quiet'],
      escort: ['THE LIGHT IS HOME', 'CARAVAN DELIVERED', 'The reliquary reached the eastern rift'],
      ritual: ['THE RITUAL BURNS', 'THREE CIRCLES SEALED', 'The ember is whole again'],
      blitz: ['THE SUN HELD', 'BLITZ SURVIVED', 'Twelve waves before sunset'],
      duel: ['THE RING IS YOURS', 'FOUR CHAMPIONS FELLED', 'No walls. No escorts. No mercy'],
      trial: ['DAWN RESTORED', 'THE ARENA HOLDS', 'You outlasted the dark'],
    };
    const [kicker, big, small] = lines[this.mode] || lines.siege;
    this.ui.banner(kicker, big, small);
    this.audio.fusion();
    this.engine.pulseExposure(1);
    this.engine.addShake(1);
    this.fx.flash('heal');
    this.finishRun({ cause: 'victory', victory: true, delay: 1100 });
  }

  finishRun({ cause = 'player', victory = false, delay = 750 } = {}) {
    this.state = 'gameover';
    this.audio.setIntensity(victory ? 0.6 : 0.1);
    const reached = this.wave;
    const prevBest = this.save.bestWave || 0;
    const newBest = reached > prevBest;
    if (newBest) this.save.bestWave = reached;
    if (this.mode === 'siege') this.save.bestSiege = Math.max(this.save.bestSiege || 0, reached);
    else if (this.mode === 'lane') this.save.bestLane = Math.max(this.save.bestLane || 0, reached);
    else if (this.mode === 'hunt') this.save.bestHunt = Math.max(this.save.bestHunt || 0, reached);
    else if (this.mode === 'trial') this.save.bestTrial = Math.max(this.save.bestTrial || 0, reached);
    this.save.modeBest = this.save.modeBest || {};
    this.save.modeBest[this.mode] = Math.max(this.save.modeBest[this.mode] || 0, reached);
    if (this.skillRun) {
      this.save.skillRuns = (this.save.skillRuns || 0) + 1;
      if (victory) this.save.skillWins = (this.save.skillWins || 0) + 1;
      this.save.bestSkill = Math.max(this.save.bestSkill || 0, reached);
    }
    const diff = this.difficultyMeta();
    this.save.difficultyBest = this.save.difficultyBest || { kindled: 0, solar: 0, umbral: 0, hardcore: 0 };
    const prevDiffBest = this.save.difficultyBest[this.difficulty] || 0;
    const newDiffBest = reached > prevDiffBest;
    this.save.difficultyBest[this.difficulty] = Math.max(prevDiffBest, reached);
    if (victory) {
      this.save.wins = (this.save.wins || 0) + 1;
      // Completing a mission carries you one step further down the descent.
      this.save.descent = Math.min(DESCENT.max, this.descentRank() + 1);
      this.save.modeWins = this.save.modeWins || { siege: 0, lane: 0, trial: 0, hunt: 0, escort: 0, ritual: 0, blitz: 0, duel: 0 };
      this.save.modeWins[this.mode] = (this.save.modeWins[this.mode] || 0) + 1;
      this.save.difficultyWins = this.save.difficultyWins || { kindled: 0, solar: 0, umbral: 0, hardcore: 0 };
      this.save.difficultyWins[this.difficulty] = (this.save.difficultyWins[this.difficulty] || 0) + 1;
    }
    this.save.bestKills = Math.max(this.save.bestKills || 0, this.kills);
    this.save.bestTime = Math.max(this.save.bestTime || 0, this.runTime);
    this.save.runs = (this.save.runs || 0) + 1;

    const core = this.structures?.core;
    const corePct = core?.maxHp ? Math.max(0, core.hp / core.maxHp) : 1;
    const progress = this.awardRunProgress({ reached, victory, corePct });
    persist(this.save);

    this.pendingRelicDrafts = [];
    this.relicDraft = null;
    if (this.vault) {
      this.vault.clear();
      this.vault = null;
    }
    this.ui.setBoss(null);
    const runId = this.runId;
    setTimeout(() => {
      if (!this.player || runId !== this.runId) return;
      this.ui.showGameOver({
        wave: reached,
        kills: this.kills,
        time: this.runTime,
        level: this.level,
        form: this.player.form.name,
        formColor: this.player.form.css,
        damage: Math.round(this.damageDealt),
        combo: this.comboBest,
        essence: Math.round(this.essenceTotal),
        newBest,
        bestWave: this.save.bestWave,
        victory,
        cause,
        mode: this.mode,
        shards: this.shards,
        skillRun: this.skillRun,
        bonusWaves: this.bonusWaves,
        caravanPct: this.caravan ? Math.round(this.caravan.progress * 100) : 0,
        ritualSealed: this.ritual ? this.ritual.sealed : 0,
        blitzTimer: this.blitzTimer,
        marksEarned: progress.marks + progress.achievementMarks,
        achievementMarks: progress.achievementMarks,
        newAchievements: progress.newAchievements,
        catchUp: progress.catchUp,
        pactsTotal: progress.pactsTotal,
        pactMult: progress.pactMult,
        relicIds: [...this.runStats.relicIds],
        relicPicks: this.runStats.relicPicks,
        vaults: this.runStats.vaults,
        bosses: this.runStats.bosses,
        damageTaken: Math.round(this.runStats.damageTaken),
        corePct,
        gatesLeft: this.openLanes().length,
        totalMarks: this.save.marks,
        difficulty: this.difficulty,
        difficultyName: diff.name,
        difficultyShort: diff.short,
        difficultyCss: diff.css,
        difficultyRank: diff.rank,
        hardcore: !!diff.hardcore,
        newDifficultyBest: newDiffBest,
        difficultyBest: this.save.difficultyBest[this.difficulty],
        descent: this.descentRank(),
        descentHp: this.descentMeta().hp,
        descentDamage: this.descentMeta().damage,
        descentPaid: progress.descentRank,
        descentMult: progress.descentMult,
      });
    }, delay);
  }

  /* ---------------- PER FRAME ---------------- */
  update(dt) {
    this.time += dt;
    if (this.state !== 'playing' || !this.player) return;

    this.runTime += dt;
    this.player.update(dt);
    this.updateCoreGuard(dt);
    this.structures?.update(dt, this);
    this.caravan?.update(dt, this);
    this.ritual?.update(dt, this);
    if (this.state !== 'playing') return;
    this.vault?.update(dt);
    if (this.vault?.done) {
      this.vault.clear();
      this.vault = null;
    }
    if (this.state !== 'playing') return;

    this.enemies.update(dt, this);
    if (this.state !== 'playing') return;

    this.projectiles.update(dt, this);
    this.pickups.update(dt, this);
    this.corpses.update(dt);
    if (this.state !== 'playing') return;

    this.updateWave(dt);
    if (this.state !== 'playing') return;

    this.updateRepair(dt);
    this.updateGateHint();
    this.updateCombo(dt);

    const pressure = Math.min(1, 0.25 + this.wave * 0.045 + this.enemies.count() * 0.008);
    this.audio.setIntensity(pressure);

    // heartbeat when the light is nearly out
    const hpPct = this.player.stats.hp / Math.max(1, this.player.stats.maxHp);
    if (hpPct > 0 && hpPct < 0.25) {
      this._heartbeat = (this._heartbeat || 0) - dt;
      if (this._heartbeat <= 0) {
        this._heartbeat = 2.2;
        this.audio.lowHealth();
      }
    } else {
      this._heartbeat = 0;
    }

    this.ui.updateHud(this);
  }

  updateCombo(dt) {
    if (this.combo <= 0) return;
    this.comboTimer -= dt;
    if (this.comboTimer <= 0) {
      this.combo = 0;
      this.comboTimer = 0;
    }
  }

  cameraOpts() {
    return {
      mode: this.state === 'welcome' ? 'welcome' : this.state === 'menu' ? 'menu' : 'game',
      target: this.player ? this.player.pos : null,
      velocity: this.player ? this.player.vel : null,
    };
  }

  applySettings(settings) {
    this.save.settings = { ...settings };
    persist(this.save);
    this.audio.setSettings({
      master: settings.master,
      music: settings.music,
      sfx: settings.sfx,
      musicOn: settings.musicOn,
      musicTheme: settings.musicTheme || 'auto',
    });
    this.engine.setQuality(settings.quality);
    this.fx.settings.numbers = settings.numbers;
    this.fx.shakeScale = settings.shake;
  }
}
