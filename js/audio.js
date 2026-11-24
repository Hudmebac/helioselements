/* ============================================================
   HELIOS ELEMENTS — AUDIO
   Fully procedural. No samples, no network.
   ============================================================ */

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MOODS = {
  menu:  { roots: [45, 41, 48, 43], scale: [0, 3, 5, 7, 10, 12, 15, 19], pad: 'sine', arp: 'triangle', step: 0.42, padVol: 0.022, arpVol: 0.018, pulse: true, filter: 700 },
  lumen: { roots: [48, 52, 55, 50], scale: [0, 2, 4, 7, 9, 12, 14, 16], pad: 'sine', arp: 'sine', step: 0.36, padVol: 0.024, arpVol: 0.02, pulse: false, filter: 1100 },
  ember: { roots: [41, 46, 43, 48], scale: [0, 1, 5, 7, 8, 12, 13, 17], pad: 'triangle', arp: 'sawtooth', step: 0.34, padVol: 0.026, arpVol: 0.016, pulse: true, filter: 520 },
  tide:  { roots: [45, 43, 48, 41], scale: [0, 2, 3, 7, 8, 12, 15, 19], pad: 'sine', arp: 'triangle', step: 0.5, padVol: 0.024, arpVol: 0.016, pulse: false, filter: 800 },
  gale:  { roots: [50, 45, 47, 52], scale: [0, 3, 5, 7, 10, 12, 15, 17], pad: 'triangle', arp: 'square', step: 0.3, padVol: 0.02, arpVol: 0.014, pulse: false, filter: 1400 },
  stone: { roots: [38, 41, 36, 43], scale: [0, 2, 5, 7, 9, 12, 14, 17], pad: 'square', arp: 'triangle', step: 0.46, padVol: 0.026, arpVol: 0.014, pulse: true, filter: 420 },
  umbra: { roots: [44, 39, 46, 42], scale: [0, 1, 3, 6, 8, 12, 13, 15], pad: 'sawtooth', arp: 'sine', step: 0.54, padVol: 0.022, arpVol: 0.015, pulse: true, filter: 600 },
};


export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.settings = { master: 0.7, music: 0.45, sfx: 0.8, musicOn: true };
    this.lastShot = 0;
    this.lastHit = 0;
    this.musicTimer = null;
    this.musicStep = 0;
    this.nextTime = 0;
    this.intensity = 0.25;
  }

  unlock() {
    if (this.ready) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);

      // shared reverb-ish tail
      this.verb = this.ctx.createConvolver();
      this.verb.buffer = this._impulse(2.4, 2.2);
      this.verbGain = this.ctx.createGain();
      this.verbGain.gain.value = 0.22;
      this.verb.connect(this.verbGain);
      this.verbGain.connect(this.master);

      this._applyVolumes();
      this.ready = true;
      this._resolveMood();
      if (this.settings.musicOn) this.startMusic();
    } catch (e) {
      console.warn('Audio unavailable', e);
    }
  }

  _impulse(dur, decay) {
    const rate = this.ctx.sampleRate;
    const len = Math.floor(rate * dur);
    const buf = this.ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  setSettings(s) {
    this.settings = { ...this.settings, ...s };
    this._applyVolumes();
    this._resolveMood();
    if (this.ready) {
      if (this.settings.musicOn) this.startMusic();
      else this.stopMusic();
    }
  }

  _applyVolumes() {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.master, now, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.settings.sfx, now, 0.05);
    this.musicBus.gain.setTargetAtTime(this.settings.musicOn ? this.settings.music * 0.4 : 0, now, 0.15);
  }

  setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); }

  /* ---------------- primitives ---------------- */
  tone({ freq = 440, dur = 0.2, type = 'sine', vol = 0.2, glide = null, delay = 0, bus = null, verb = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(bus || this.sfxBus);
    if (verb > 0) {
      const send = this.ctx.createGain();
      send.gain.value = verb;
      g.connect(send);
      send.connect(this.verb);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.15, type = 'bandpass', freq = 1200, q = 0.8, delay = 0, bus = null, verb = 0 }) {
    if (!this.ready) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(bus || this.sfxBus);
    if (verb > 0) {
      const send = this.ctx.createGain();
      send.gain.value = verb;
      g.connect(send);
      send.connect(this.verb);
    }
    src.start(t0);
  }

  /* ---------------- SFX ---------------- */
  ui() {
    this.tone({ freq: 620, dur: 0.06, type: 'sine', vol: 0.10, glide: 820 });
    this.tone({ freq: 1240, dur: 0.05, type: 'triangle', vol: 0.04, delay: 0.02 });
  }

  hover() {
    this.tone({ freq: 880, dur: 0.035, type: 'sine', vol: 0.035, glide: 1040 });
  }

  shoot(element = 'ember') {
    const now = performance.now();
    if (now - this.lastShot < 55) return;
    this.lastShot = now;
    const map = {
      ember: [520, 240, 'sawtooth', 0.05],
      tide: [700, 420, 'sine', 0.05],
      gale: [980, 620, 'triangle', 0.035],
      stone: [180, 90, 'square', 0.05],
      lumen: [1400, 900, 'sine', 0.035],
      umbra: [420, 300, 'triangle', 0.045],
      magma: [240, 110, 'sawtooth', 0.055],
      storm: [1100, 700, 'square', 0.03],
      frost: [900, 1250, 'sine', 0.035],
      void: [520, 180, 'triangle', 0.045],
      verdant: [640, 820, 'sine', 0.04],
    };
    const [f, g, type, vol] = map[element] || map.ember;
    this.tone({ freq: f, dur: 0.085, type, vol, glide: g });
  }

  hit() {
    const now = performance.now();
    if (now - this.lastHit < 42) return;
    this.lastHit = now;
    this.noise({ dur: 0.045, vol: 0.055, type: 'highpass', freq: 2600 });
  }

  kill() {
    this.tone({ freq: 240, dur: 0.16, type: 'triangle', vol: 0.10, glide: 90 });
    this.noise({ dur: 0.12, vol: 0.07, type: 'lowpass', freq: 1400, verb: 0.2 });
  }

  pickup() {
    this.tone({ freq: 1180, dur: 0.07, type: 'sine', vol: 0.045, glide: 1580 });
  }

  heal() {
    this.tone({ freq: 620, dur: 0.3, type: 'sine', vol: 0.10, glide: 940, verb: 0.4 });
  }

  dash() {
    this.noise({ dur: 0.22, vol: 0.10, type: 'bandpass', freq: 900, q: 1.6 });
    this.tone({ freq: 360, dur: 0.18, type: 'sine', vol: 0.05, glide: 760 });
  }

  hurt() {
    this.noise({ dur: 0.16, vol: 0.14, type: 'lowpass', freq: 700 });
    this.tone({ freq: 160, dur: 0.18, type: 'square', vol: 0.08, glide: 70 });
  }

  surge(element = 'ember') {
    this.tone({ freq: 180, dur: 0.42, type: 'sawtooth', vol: 0.10, glide: 620, verb: 0.35 });
    this.noise({ dur: 0.35, vol: 0.09, type: 'bandpass', freq: 1400, q: 0.7, verb: 0.3 });
  }

  ult() {
    this.tone({ freq: 110, dur: 1.1, type: 'sawtooth', vol: 0.14, glide: 55, verb: 0.5 });
    this.tone({ freq: 330, dur: 0.9, type: 'sine', vol: 0.10, glide: 660, delay: 0.08, verb: 0.5 });
    this.tone({ freq: 660, dur: 0.7, type: 'sine', vol: 0.08, glide: 1320, delay: 0.18, verb: 0.6 });
    this.noise({ dur: 0.8, vol: 0.12, type: 'lowpass', freq: 2000, delay: 0.05 });
  }

  levelUp() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.55, type: 'sine', vol: 0.085, delay: i * 0.075, verb: 0.5 });
    });
  }

  wave() {
    this.tone({ freq: 196, dur: 0.6, type: 'triangle', vol: 0.10, glide: 392, verb: 0.4 });
    this.tone({ freq: 392, dur: 0.5, type: 'sine', vol: 0.06, delay: 0.12, verb: 0.4 });
  }

  /* Six wardens, six arrival motifs. The shared low pressure stays, but the
     interval, timbre and tail tell you which door just opened. */
  boss(index = 0) {
    const cues = [
      [ // Rift Warden — a violet wound tearing open
        { freq: 72, dur: 1.6, type: 'sawtooth', vol: 0.16, glide: 52, verb: 0.6 },
        { freq: 145, dur: 1.2, type: 'square', vol: 0.05, glide: 110, delay: 0.1, verb: 0.5 },
        { freq: 430, dur: 0.9, type: 'sine', vol: 0.045, glide: 70, delay: 0.2, verb: 0.7 },
        { dur: 1.4, vol: 0.08, type: 'lowpass', freq: 300, verb: 0.5 },
      ],
      [ // Ashen Colossus — stone shoulders and a furnace exhale
        { freq: 58, dur: 1.9, type: 'sawtooth', vol: 0.17, glide: 38, verb: 0.55 },
        { freq: 116, dur: 1.5, type: 'triangle', vol: 0.08, glide: 58, delay: 0.16, verb: 0.5 },
        { freq: 232, dur: 0.9, type: 'square', vol: 0.035, glide: 174, delay: 0.3, verb: 0.4 },
        { dur: 1.7, vol: 0.10, type: 'lowpass', freq: 220, verb: 0.55 },
      ],
      [ // Void Herald — a hollow bell across the quiet
        { freq: 96, dur: 1.8, type: 'sine', vol: 0.11, glide: 48, verb: 0.85 },
        { freq: 384, dur: 1.7, type: 'sine', vol: 0.06, glide: 96, delay: 0.08, verb: 0.9 },
        { freq: 576, dur: 1.2, type: 'triangle', vol: 0.035, glide: 144, delay: 0.24, verb: 0.8 },
        { dur: 1.3, vol: 0.06, type: 'bandpass', freq: 520, q: 1.4, verb: 0.7 },
      ],
      [ // Helios Unbound — the sun remembers, and it is loud
        { freq: 132, dur: 1.7, type: 'triangle', vol: 0.13, glide: 264, verb: 0.8 },
        { freq: 264, dur: 1.5, type: 'sine', vol: 0.09, glide: 528, delay: 0.09, verb: 0.85 },
        { freq: 528, dur: 1.3, type: 'sine', vol: 0.07, glide: 1056, delay: 0.2, verb: 0.9 },
        { dur: 1.1, vol: 0.07, type: 'highpass', freq: 2600, delay: 0.12, verb: 0.6 },
      ],
      [ // Cinder Tyrant — a crown dragged across hot iron
        { freq: 64, dur: 1.6, type: 'sawtooth', vol: 0.16, glide: 44, verb: 0.55 },
        { freq: 128, dur: 1.2, type: 'square', vol: 0.06, glide: 96, delay: 0.12, verb: 0.45 },
        { freq: 512, dur: 0.7, type: 'sawtooth', vol: 0.04, glide: 384, delay: 0.28, verb: 0.45 },
        { dur: 1.4, vol: 0.09, type: 'bandpass', freq: 680, q: 1.1, verb: 0.5 },
      ],
      [ // Stormglass Seraph — glass wings snapping open
        { freq: 220, dur: 1.2, type: 'triangle', vol: 0.11, glide: 660, verb: 0.65 },
        { freq: 440, dur: 1.0, type: 'sine', vol: 0.07, glide: 1320, delay: 0.1, verb: 0.75 },
        { freq: 880, dur: 0.8, type: 'sine', vol: 0.045, glide: 1760, delay: 0.2, verb: 0.8 },
        { dur: 1.2, vol: 0.08, type: 'highpass', freq: 1900, verb: 0.6 },
      ],
    ];
    const cue = cues[((index % cues.length) + cues.length) % cues.length] || cues[0];
    const noise = cue[cue.length - 1];
    for (let i = 0; i < cue.length - 1; i++) this.tone(cue[i]);
    this.noise(noise);
  }

  crowned() {
    this.tone({ freq: 196, dur: 0.5, type: 'triangle', vol: 0.065, glide: 392, verb: 0.35 });
    this.tone({ freq: 587.33, dur: 0.42, type: 'sine', vol: 0.045, glide: 880, delay: 0.06, verb: 0.5 });
    this.noise({ dur: 0.45, vol: 0.045, type: 'bandpass', freq: 1500, q: 1.2, verb: 0.35 });
  }

  waystone() {
    [392, 523.25, 659.25].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.55, type: 'triangle', vol: 0.06, delay: i * 0.08, verb: 0.55 });
    });
    this.tone({ freq: 98, dur: 0.7, type: 'sine', vol: 0.07, glide: 147, verb: 0.4 });
  }

  ritualSeal() {
    [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => {
      this.tone({ freq: f, dur: 1.0, type: 'sine', vol: 0.055, delay: i * 0.07, verb: 0.8 });
    });
    this.tone({ freq: 130.81, dur: 0.9, type: 'triangle', vol: 0.08, glide: 196, verb: 0.55 });
  }

  gateBreak() {
    this.noise({ dur: 0.65, vol: 0.13, type: 'highpass', freq: 1500, verb: 0.45 });
    this.tone({ freq: 148, dur: 0.7, type: 'sawtooth', vol: 0.11, glide: 74, verb: 0.5 });
    this.tone({ freq: 296, dur: 0.45, type: 'square', vol: 0.05, glide: 148, delay: 0.06, verb: 0.4 });
  }

  objectiveDanger(step = 1) {
    const base = step >= 2 ? 146.83 : 196;
    this.tone({ freq: base, dur: 0.34, type: 'square', vol: 0.065, glide: base * 0.72, verb: 0.25 });
    this.tone({ freq: base, dur: 0.34, type: 'square', vol: 0.05, glide: base * 0.72, delay: 0.4, verb: 0.25 });
    this.tone({ freq: base * 2, dur: 0.2, type: 'sine', vol: 0.025, delay: 0.02 });
  }

  draftPick() {
    this.tone({ freq: 740, dur: 0.14, type: 'triangle', vol: 0.075, glide: 988, verb: 0.3 });
    this.tone({ freq: 1480, dur: 0.18, type: 'sine', vol: 0.04, delay: 0.05, verb: 0.45 });
    this.tone({ freq: 196, dur: 0.22, type: 'sine', vol: 0.05, glide: 294, delay: 0.02, verb: 0.3 });
  }

  relicOpen() {
    this.tone({ freq: 196, dur: 0.75, type: 'triangle', vol: 0.08, glide: 392, verb: 0.55 });
    this.tone({ freq: 784, dur: 0.8, type: 'sine', vol: 0.04, glide: 1174.66, delay: 0.08, verb: 0.75 });
    this.tone({ freq: 1568, dur: 0.55, type: 'sine', vol: 0.022, delay: 0.18, verb: 0.8 });
    this.noise({ dur: 0.5, vol: 0.035, type: 'bandpass', freq: 2200, q: 1.8, verb: 0.5 });
  }

  relicPick() {
    [523.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.45, type: 'sine', vol: 0.06, delay: i * 0.06, verb: 0.65 });
    });
    this.tone({ freq: 261.63, dur: 0.55, type: 'triangle', vol: 0.055, glide: 392, verb: 0.4 });
  }

  fusion() {
    [261.63, 329.63, 392, 523.25, 784].forEach((f, i) => {
      this.tone({ freq: f, dur: 1.5, type: 'sine', vol: 0.08, delay: i * 0.1, verb: 0.8 });
    });
    this.tone({ freq: 90, dur: 1.4, type: 'triangle', vol: 0.12, glide: 200, verb: 0.5 });
    this.noise({ dur: 1.2, vol: 0.10, type: 'bandpass', freq: 800, q: 0.5, verb: 0.6 });
  }

  death() {
    this.tone({ freq: 180, dur: 1.8, type: 'sawtooth', vol: 0.14, glide: 40, verb: 0.7 });
    this.noise({ dur: 1.6, vol: 0.10, type: 'lowpass', freq: 900, verb: 0.6 });
  }

  shieldBreak() {
    this.noise({ dur: 0.4, vol: 0.12, type: 'highpass', freq: 1800 });
    this.tone({ freq: 880, dur: 0.35, type: 'triangle', vol: 0.07, glide: 180, verb: 0.4 });
  }

  /* ---------------- NAVIGATION ---------------- */
  nav() {
    this.tone({ freq: 760, dur: 0.045, type: 'sine', vol: 0.045, glide: 940 });
  }

  back() {
    this.tone({ freq: 540, dur: 0.1, type: 'sine', vol: 0.07, glide: 320 });
  }

  open() {
    this.tone({ freq: 420, dur: 0.14, type: 'triangle', vol: 0.06, glide: 740, verb: 0.2 });
  }

  close() {
    this.tone({ freq: 720, dur: 0.13, type: 'triangle', vol: 0.06, glide: 380, verb: 0.15 });
  }

  confirm() {
    [523.25, 783.99, 1046.5].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.34, type: 'sine', vol: 0.07, delay: i * 0.06, verb: 0.45 });
    });
  }

  error() {
    this.tone({ freq: 220, dur: 0.16, type: 'square', vol: 0.055, glide: 160 });
    this.tone({ freq: 175, dur: 0.2, type: 'sawtooth', vol: 0.035, glide: 120, delay: 0.05 });
  }

  tab() {
    this.tone({ freq: 900, dur: 0.05, type: 'triangle', vol: 0.045, glide: 1180 });
  }

  keybind() {
    this.tone({ freq: 660, dur: 0.08, type: 'square', vol: 0.05, glide: 990 });
  }

  pause() {
    this.tone({ freq: 480, dur: 0.2, type: 'sine', vol: 0.06, glide: 300, verb: 0.2 });
  }

  resume() {
    this.tone({ freq: 320, dur: 0.2, type: 'sine', vol: 0.06, glide: 520, verb: 0.2 });
  }

  /* ---------------- IN-GAME EXTRAS ---------------- */
  forgeOpen() {
    this.tone({ freq: 300, dur: 0.32, type: 'triangle', vol: 0.08, glide: 540, verb: 0.3 });
    this.noise({ dur: 0.3, vol: 0.05, type: 'bandpass', freq: 900, verb: 0.3 });
  }

  forgeBuild() {
    this.tone({ freq: 180, dur: 0.26, type: 'square', vol: 0.07, glide: 330 });
    this.noise({ dur: 0.22, vol: 0.06, type: 'lowpass', freq: 1200 });
  }

  shard() {
    this.tone({ freq: 1320, dur: 0.09, type: 'triangle', vol: 0.05, glide: 1760 });
    this.tone({ freq: 1980, dur: 0.06, type: 'sine', vol: 0.03, delay: 0.03 });
  }

  lowHealth() {
    this.tone({ freq: 92, dur: 0.24, type: 'sine', vol: 0.09, glide: 64 });
    this.tone({ freq: 92, dur: 0.24, type: 'sine', vol: 0.06, glide: 64, delay: 0.32 });
  }

  waveClear() {
    [392, 523.25, 659.25].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.55, type: 'sine', vol: 0.06, delay: i * 0.09, verb: 0.45 });
    });
  }

  objective() {
    [659.25, 880, 1174.66].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.6, type: 'sine', vol: 0.07, delay: i * 0.1, verb: 0.6 });
    });
  }

  tick() {
    this.tone({ freq: 1500, dur: 0.03, type: 'square', vol: 0.028 });
  }

  /* ---------------- MUSIC ---------------- */
  setMood({ theme = null, element = null } = {}) {
    this.rawTheme = theme;
    this.rawElement = element;
    this._resolveMood();
  }

  _resolveMood() {
    const chosen = this.settings.musicTheme && this.settings.musicTheme !== 'auto' ? this.settings.musicTheme : null;
    const key = chosen && MOODS[chosen] ? chosen
      : (this.rawTheme && MOODS[this.rawTheme] ? this.rawTheme : 'menu');
    const mood = MOODS[key] || MOODS.menu;
    const lead = this.rawElement && MOODS[this.rawElement] && this.rawElement !== key ? MOODS[this.rawElement] : null;
    const changed = key !== this.moodName;
    this._mood = mood;
    this._lead = lead;
    this.moodName = key;
    if (changed && this.ready) {
      this.musicStep = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
    }
  }

  startMusic() {
    if (!this.ready || this.musicTimer) return;
    this.nextTime = this.ctx.currentTime + 0.2;
    this.musicStep = 0;
    this.musicTimer = setInterval(() => this._scheduleMusic(), 200);
  }

  stopMusic() {
    if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; }
  }

  _scheduleMusic() {
    if (!this.ready) return;
    const stepDur = (this._mood || MOODS.menu).step;
    let guard = 0;
    while (this.nextTime < this.ctx.currentTime + 0.8 && guard++ < 24) {
      this._musicStep(this.musicStep, this.nextTime);
      this.musicStep++;
      this.nextTime += stepDur;
    }
  }

  _musicStep(step, time) {
    const bus = this.musicBus;
    const m = this._mood || MOODS.menu;
    const bar = Math.floor(step / 16) % 4;
    const root = m.roots[bar % m.roots.length];

    // pad every bar
    if (step % 16 === 0) {
      const notes = [root, root + 7, root + 12, root + 15];
      notes.forEach((n, i) => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = m.filter + this.intensity * 900;
        osc.type = i === 0 ? m.pad : 'sine';
        osc.frequency.value = NOTE(n - 12);
        osc.detune.value = (Math.random() - 0.5) * 8;
        const t = time;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(m.padVol + this.intensity * 0.012, t + 1.4);
        g.gain.linearRampToValueAtTime(0.0001, t + 6.2);
        osc.connect(filt); filt.connect(g); g.connect(bus);
        osc.start(t); osc.stop(t + 6.4);
      });
    }

    // sparse arpeggio in the mood's scale
    const scale = m.scale;
    const gate = (step * 7919) % 10;
    if (gate < 3 + this.intensity * 3 && step % 2 === 0) {
      const n = root + 12 + scale[(step * 3) % scale.length];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 1200 + Math.random() * 800;
      filt.Q.value = 2.2;
      osc.type = m.arp;
      osc.frequency.value = NOTE(n);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(m.arpVol, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);
      osc.connect(filt); filt.connect(g); g.connect(bus);
      osc.start(time); osc.stop(time + 1.2);
    }

    // the guardian's own element colours the score with a rare lead line
    const lead = this._lead;
    if (lead && step % 16 === 6) {
      const ln = root + 24 + lead.scale[(step * 5) % lead.scale.length];
      this.tone({ freq: NOTE(ln), dur: 1.8, type: 'sine', vol: 0.012, bus, verb: 0.55 });
    }

    // low pulse as combat intensity rises
    if (m.pulse && this.intensity > 0.45 && step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(NOTE(root - 24), time);
      osc.frequency.exponentialRampToValueAtTime(NOTE(root - 30), time + 0.3);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(0.05 * this.intensity, time + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);
      osc.connect(g); g.connect(bus);
      osc.start(time); osc.stop(time + 0.45);
    }
  }
}
