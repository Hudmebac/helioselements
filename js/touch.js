/* ============================================================
   HELIOS ELEMENTS — TOUCH CONTROLS
   Left thumb: a floating movement stick. Right thumb: the actions.
   The layer is inert unless the save asks for it (Auto on touch
   screens) and only shows while a run is actually being played.
   ============================================================ */

const STICK_RADIUS = 52;
const DEADZONE = 0.16;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.root = null;
    this.enabled = false;
    this.visible = false;
    this.stickId = null;
    this.originX = 0;
    this.originY = 0;
    this.refreshT = 0;
    this.mounted = false;
    this.mount();
    this.refresh();

    window.addEventListener('resize', () => this.refresh());
    window.addEventListener('orientationchange', () => setTimeout(() => this.refresh(), 120));
    window.addEventListener('blur', () => this.releaseAll());
  }

  get preference() {
    const v = this.game.save?.settings?.touch;
    return v === 'on' || v === 'off' ? v : 'auto';
  }

  get autoDetected() {
    try {
      return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    } catch (e) {
      return (navigator.maxTouchPoints || 0) > 0;
    }
  }

  /* ---------------- LAYER ---------------- */

  mount() {
    if (this.root) return;
    const host = document.getElementById('ui');
    if (!host) return;
    const el = document.createElement('div');
    el.id = 'touch-controls';
    el.className = 'touch';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `
      <div class="tc-zone" id="tc-zone"></div>
      <div class="tc-stick" id="tc-stick">
        <span class="tc-ring"></span>
        <span class="tc-arrows" aria-hidden="true"><i class="up">▲</i><i class="down">▼</i><i class="left">◀</i><i class="right">▶</i></span>
        <span class="tc-knob" id="tc-knob">✦</span>
      </div>
      <div class="tc-pad">
        <button class="tc-btn forge" data-touch-act="forge" aria-label="Open the Forge"><i>⚒</i><span>FORGE</span></button>
        <button class="tc-btn surge" data-touch-act="surge" aria-label="Elemental surge"><i>✦</i><b class="tc-cd"></b><span>SURGE</span></button>
        <button class="tc-btn ult" data-touch-act="ult" aria-label="Ultimate"><i>☀</i><b class="tc-cd"></b><span>ULT</span></button>
        <button class="tc-btn dash" data-touch-act="dash" aria-label="Dash"><i>⇥</i><b class="tc-cd"></b><span>DASH</span></button>
        <button class="tc-btn repair" data-touch-act="repair" hidden aria-label="Hold to repair"><i>✚</i><span>REPAIR</span></button>
      </div>
      <button class="tc-call" data-touch-act="callwave" hidden>BEGIN WAVE</button>
      <button class="tc-level" data-touch-act="levelup" hidden>LEVEL UP</button>
      <button class="tc-pause" data-touch-act="pause" aria-label="Pause">❚❚</button>
    `;
    host.appendChild(el);
    this.root = el;
    this.zone = el.querySelector('.tc-zone');
    this.stickEl = el.querySelector('.tc-stick');
    this.knob = el.querySelector('.tc-knob');
    this.callEl = el.querySelector('.tc-call');
    this.levelEl = el.querySelector('.tc-level');
    this.repairEl = el.querySelector('.tc-btn.repair');
    this.surgeIcon = el.querySelector('.tc-btn.surge i');
    this.buttons = {
      dash: el.querySelector('.tc-btn.dash'),
      surge: el.querySelector('.tc-btn.surge'),
      ult: el.querySelector('.tc-btn.ult'),
      forge: el.querySelector('.tc-btn.forge'),
    };
    this.mounted = true;
    this._bind();
  }

  _bind() {
    const el = this.root;
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    this.zone.addEventListener('pointerdown', (e) => this.startStick(e));
    window.addEventListener('pointermove', (e) => this.moveStick(e), { passive: false });
    window.addEventListener('pointerup', (e) => this.endStick(e));
    window.addEventListener('pointercancel', (e) => this.endStick(e));

    el.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('[data-touch-act]');
      if (!btn || btn.disabled || btn.hidden) return;
      e.preventDefault();
      const act = btn.dataset.touchAct;
      if (act === 'repair') {
        this.setHold(true);
        btn.classList.add('pressed');
        return;
      }
      btn.classList.add('pressed');
      this.action(act);
    });

    const release = (e) => {
      const btn = e.target.closest('[data-touch-act]');
      if (btn) btn.classList.remove('pressed');
      if (btn && btn.dataset.touchAct === 'repair') this.setHold(false);
      else if (!btn) {
        for (const b of el.querySelectorAll('.tc-btn.pressed')) b.classList.remove('pressed');
        this.setHold(false);
      }
    };
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('pointerleave', release);
  }

  /* ---------------- SETTING ---------------- */

  refresh() {
    const pref = this.preference;
    const on = pref === 'on' || (pref === 'auto' && this.autoDetected);
    this.enabled = on;
    document.body.classList.toggle('tc-on', on);
    if (this.root) {
      this.root.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (!on) {
        this.root.classList.remove('on');
        this.releaseAll();
      }
    }
  }

  /* ---------------- MOVEMENT ---------------- */

  startStick(e) {
    if (!this.visible) return;
    if (e.pointerType === 'mouse' && this.preference !== 'on') return;
    if (this.stickId !== null) return;
    e.preventDefault();
    this.stickId = e.pointerId;
    const margin = 66;
    this.originX = Math.max(margin, Math.min(window.innerWidth - margin, e.clientX));
    this.originY = Math.max(margin, Math.min(window.innerHeight - margin, e.clientY));
    this.stickEl.style.setProperty('--sx', this.originX + 'px');
    this.stickEl.style.setProperty('--sy', this.originY + 'px');
    this.stickEl.classList.add('active');
    this.apply(0, 0);
  }

  moveStick(e) {
    if (e.pointerId !== this.stickId) return;
    e.preventDefault();
    let dx = e.clientX - this.originX;
    let dy = e.clientY - this.originY;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      dx = (dx / len) * STICK_RADIUS;
      dy = (dy / len) * STICK_RADIUS;
    }
    this.knob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
    this.apply(dx / STICK_RADIUS, dy / STICK_RADIUS);
  }

  endStick(e) {
    if (this.stickId === null) return;
    if (e && e.pointerId !== undefined && e.pointerId !== this.stickId) return;
    this.stickId = null;
    if (this.stickEl) {
      this.stickEl.classList.remove('active');
      this.stickEl.style.removeProperty('--sx');
      this.stickEl.style.removeProperty('--sy');
    }
    if (this.knob) this.knob.style.transform = '';
    this.apply(0, 0);
  }

  apply(x, z) {
    if (Math.hypot(x, z) < DEADZONE) { x = 0; z = 0; }
    this.game.touchMove.x = x;
    this.game.touchMove.z = z;
  }

  /* ---------------- ACTIONS ---------------- */

  action(act) {
    const g = this.game;
    if (act === 'pause') {
      if (g.state === 'playing') g.pause();
      return;
    }
    if (g.state !== 'playing' || !g.player) return;
    if (act === 'dash') g.player.tryDash();
    else if (act === 'surge') g.player.trySurge();
    else if (act === 'ult') g.player.tryUlt();
    else if (act === 'forge') {
      if (g.phase === 'intermission' || g.phase === 'ready') g.openForge();
    } else if (act === 'callwave') g.callWave();
    else if (act === 'levelup') g.openLevelUp();
  }

  setHold(on) {
    if (on) this.game.touchHeld.add('repair');
    else this.game.touchHeld.delete('repair');
  }

  releaseAll() {
    this.endStick();
    this.setHold(false);
    if (this.game.touchMove) {
      this.game.touchMove.x = 0;
      this.game.touchMove.z = 0;
    }
    if (this.root) for (const b of this.root.querySelectorAll('.tc-btn.pressed')) b.classList.remove('pressed');
  }

  /* ---------------- FRAME ---------------- */

  update(dt) {
    const active = this.enabled && this.game.state === 'playing';
    if (active !== this.visible) {
      this.visible = active;
      if (this.root) this.root.classList.toggle('on', active);
      if (!active) this.releaseAll();
    }
    if (!active) return;
    this.refreshT -= dt;
    if (this.refreshT > 0) return;
    this.refreshT = 0.1;
    this.sync();
  }

  sync() {
    const g = this.game;
    const p = g.player;
    if (!p) return;
    const { dash, surge, ult, forge } = this.buttons;

    this._setCool(dash, Math.ceil(p.dashCdTimer || 0), (p.dashCdTimer || 0) > 0);
    this._setCool(surge, Math.ceil(p.surgeCd || 0), (p.surgeCd || 0) > 0);
    if (this.surgeIcon) this.surgeIcon.textContent = p.form?.sigil || '✦';

    const charge = Math.max(0, Math.min(100, Math.round(p.charge || 0)));
    const ultReady = charge >= 100;
    ult.classList.toggle('ready', ultReady);
    ult.classList.toggle('off', !ultReady);
    const ultCd = ult.querySelector('.tc-cd');
    if (ultCd) ultCd.textContent = ultReady ? '✓' : charge + '%';

    const canForge = (g.phase === 'intermission' || g.phase === 'ready') && g.state === 'playing';
    forge.classList.toggle('off', !canForge);

    const inter = g.state === 'playing' && (g.phase === 'intermission' || g.phase === 'ready');
    this.callEl.hidden = !inter;
    if (inter) {
      this.callEl.textContent = g.phase === 'ready'
        ? 'BEGIN WAVE ' + g.wave
        : 'CALL WAVE · ' + Math.max(0, Math.ceil(g.interTimer || 0));
    }

    const pending = (g.pendingLevels || 0) > 0 && g.state === 'playing';
    this.levelEl.hidden = !pending;
    if (pending) this.levelEl.textContent = 'LEVEL UP · ' + g.pendingLevels;

    const near = !!g.repairTarget;
    this.repairEl.hidden = !near;
    if (near) {
      const name = (g.repairTarget.name || 'STRUCTURE').toUpperCase();
      const label = this.repairEl.querySelector('span');
      if (label) label.textContent = 'HOLD · ' + name;
    } else {
      this.setHold(false);
    }
  }

  _setCool(btn, secs, on) {
    btn.classList.toggle('off', on);
    const cd = btn.querySelector('.tc-cd');
    if (cd) cd.textContent = on ? (secs > 0 ? String(secs) : '') : '';
  }
}
