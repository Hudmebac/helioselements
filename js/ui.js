/* ============================================================
   HELIOS ELEMENTS — INTERFACE
   Menus, HUD, codex, settings, boon drafting, results.
   ============================================================ */

import {
  ELEMENTS, FUSIONS, ENEMIES, BOSSES, BOONS, KEYBINDS, RARITY, VERSION,
  MODES, ARENAS, DEFENSES, SIEGE, LANE, HUNT, ESCORT, RITUAL, BLITZ, DUEL, RELICS, RELIC_SLOTS, PACTS, pactRanks, pactReward, WARDS,
  WAVE_BONUSES, SKILL_RUN, WEAPONS, strongAgainst, weakTo,
  DIFFICULTIES, DIFFICULTY_ORDER, normalizeDifficulty, difficultyUnlocked,
  ACHIEVEMENTS, REWARDS, CONTROL_ACTIONS, keyLabel, DESCENT,
  MENU_DEPTHS, MENU_DEPTH_ORDER, menuDepth, KINDLING,
} from './data.js';
import { LORE, GUIDE } from './codex.js';
import { saveText, importSave } from './store.js';

const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m + ':' + String(sec).padStart(2, '0');
};

const statBar = (label, value) => `
  <div class="statbar"><span>${label}</span><div class="track"><i style="width:${value * 10}%"></i></div></div>`;

export class UI {
  constructor({ game, audio, engine, save }) {
    this.game = game;
    this.audio = audio;
    this.engine = engine;
    this.save = save;
    this.root = document.getElementById('ui');
    this.selectedElement = 'ember';
    this.mode = MODES[save.mode] ? save.mode : 'siege';
    this.difficulty = normalizeDifficulty(save.difficulty);
    this.screenName = 'title';
    this.settingsReturn = 'title';
    this.boss = null;
    this._boonSig = '';
    this._relicSig = '';
    this._activeRelicDraft = null;
    this._lastHud = {};
    this._build();
    this._bind();
  }

  /* ============================================================
     MARKUP
     ============================================================ */
  _build() {
    this.root.insertAdjacentHTML('beforeend', `
      <div class="hud" id="hud">
        <div class="hud-vitals" id="hud-vitals">
          <div class="sigil-chip" id="hud-sigil">✦</div>
          <div class="vitals-main">
            <div class="vitals-row">
              <span class="form-name" id="hud-form">Ember</span>
              <span class="form-role" id="hud-role">VANGUARD</span>
              <span class="lvl-badge" id="hud-level">LV 1</span>
            </div>
            <div class="bar hp" id="hud-hp-bar"><i id="hud-hp-fill"></i><span class="hp-text" id="hud-hp-text">120 / 120</span></div>
            <div class="bar shield"><i id="hud-shield-fill"></i></div>
          </div>
        </div>

        <div class="hud-center">
          <div class="wave-pill">
            <span class="lbl">WAVE</span><b id="hud-wave">1</b>
            <span class="sep"></span><span class="phase" id="hud-phase">PREPARE</span>
            <span class="best-tag" id="hud-best"></span>
            <span class="diff-badge" id="hud-diff"></span>
            <span class="diff-badge descent" id="hud-descent"></span>
            <span class="pact-tag" id="hud-pact"></span>
            <span class="bonus-tag" id="hud-bonus"></span>
            <span class="skill-tag" id="hud-skill"></span>
          </div>
          <div class="boss-wrap" id="boss-wrap">
            <div class="boss-name" id="boss-name">RIFT WARDEN</div>
            <div class="bar boss"><i id="boss-fill" style="width:100%"></i></div>
          </div>
          <div class="core-wrap" id="core-wrap">
            <div class="core-line">
              <span>SUNFORGE</span><b id="core-hp-num">900 / 900</b>
              <span class="core-pct" id="core-pct">100%</span>
              <span class="core-threat" id="core-threat"></span>
              <span class="core-lastlight" id="core-lastlight">LAST LIGHT</span>
              <div class="def-pips" id="def-pips"></div>
            </div>
            <div class="bar core" id="core-bar"><i id="core-fill"></i></div>
            <div class="core-guard" id="core-guard"><i>◉</i><span>AEGIS · +30% DMG · −25% TAKEN</span></div>
          </div>
          <div class="lane-strip" id="lane-strip"></div>
          <div class="objective-wrap" id="objective-wrap">
            <div class="objective-line">
              <span id="objective-label">OBJECTIVE</span>
              <b id="objective-value">0%</b>
              <span class="objective-note" id="objective-note"></span>
            </div>
            <div class="bar objective" id="objective-bar"><i id="objective-fill"></i></div>
          </div>
          <div class="combo" id="hud-combo">×1 <span id="hud-combo-count">0 chain</span></div>
        </div>

        <div class="hud-actions">
          <div class="shard-chip" id="shard-chip" title="Sun shards — spend these in the Forge"><i>◈</i><b id="shard-count">3</b></div>
          <div class="kindle-chip" id="kindle-chip" title="Kindling — eight motes summon a Dawn Gift"><i>✺</i><span id="kindle-count">0/8</span><span class="k-bar"><b id="kindle-fill"></b></span></div>
          <div class="weapon-chip" id="weapon-chip" title=""><i>⚔</i><span id="weapon-name">WEAPON</span><b id="weapon-rank">R1</b><em id="weapon-rarity">COMMON</em><span class="weapon-slots" id="weapon-slots"></span></div>
          <button class="icon-btn forge-btn" data-act="forge" id="forge-btn" title="Open the Forge (B)"><span class="forge-glyph">⚒</span><span class="forge-label">Forge</span><span class="forge-key">B</span></button>
          <button class="icon-btn" data-act="sound" id="sound-btn" title="Toggle sound">♪</button>
          <button class="icon-btn" data-act="pause" title="Pause (Esc)">❚❚</button>
        </div>

        <div class="hud-boons" id="hud-boons"></div>
        <div class="hud-relics" id="hud-relics"></div>
        <button class="levelup-btn" data-act="open-levelup" id="levelup-btn" title="Open stored level-ups (L)">
          <span>LEVEL UP!</span><b id="levelup-count">1</b>
        </button>

        <div class="hud-foot">
          <div class="foot-left">
            <div class="xp-wrap">
              <span class="lvl" id="hud-xp-level">LV 1</span>
              <div class="bar xp"><i id="hud-xp-fill"></i></div>
              <span class="xp-num" id="hud-xp-num">0 / 12</span>
            </div>
          </div>
          <div class="abilities">
            <button class="ability" data-act="surge" id="abil-surge">
              <span class="key">Q</span><span class="ico" id="surge-icon">✦</span>
              <span class="cd" id="surge-cd"></span><b>Surge</b>
            </button>
            <button class="ability" data-act="dash" id="abil-dash">
              <span class="key">SPC</span><span class="ico">⇥</span>
              <span class="cd" id="dash-cd"></span><b>Dash</b>
            </button>
            <button class="ability ult" data-act="ult" id="abil-ult">
              <span class="key">R</span><span class="ico">☀</span>
              <span class="cd" id="ult-cd"></span><b>Ultimate</b>
            </button>
          </div>
          <div class="foot-right">
            <div class="intermission" id="intermission">
              <span class="count" id="inter-count">7</span>
              <span class="txt"><b id="inter-label">NEXT WAVE</b><em id="inter-sub">call early for essence</em></span>
              <button class="call-btn" data-act="callwave" id="inter-btn">Call Wave ⏎</button>
            </div>
          </div>
        </div>

        <div class="repair-prompt" id="repair-prompt">
          <span class="key">E</span>
          <span>HOLD TO REPAIR <b id="repair-name">SUNFORGE</b></span>
          <span class="repair-meter"><i id="repair-fill"></i></span>
        </div>
        <div class="core-alarm" id="core-alarm" aria-hidden="true">
          <span class="core-alarm-edge"></span>
          <span class="core-alarm-tag"><b>⚠</b> SUNFORGE BREACHED</span>
        </div>
      </div>

      <div class="banner-layer" id="banner-layer"></div>
      <div class="toast-stack" id="toast-stack"></div>

      <div class="fusion-layer" id="fusion-layer">
        <div class="fusion-card">
          <div class="fusion-halo"></div>
          <div class="k">ELEMENTS FUSED</div>
          <div class="n" id="fusion-name">MAGMA</div>
          <div class="d" id="fusion-desc"></div>
        </div>
      </div>

      <!-- TITLE -->
      <section class="screen title active" id="screen-title">
        <div class="title-bg">
          <div class="title-sun"></div>
          <div class="title-embers" id="title-embers"></div>
        </div>
        <div class="title-wrap">
          <div class="eyebrow">An elemental survival roguelite</div>
          <h1 class="logo"><span class="a">HELIOS</span><span class="b">ELEMENTS</span></h1>
          <p class="tagline">Forge the sun. Hold the dark.</p>
          <div class="title-badge">The Harmony Update · adaptive element scores, rebindable keys & the Helios prologue</div>
          <nav class="menu">
            <button class="menu-btn primary" data-act="play">Begin the Descent <span class="arr">→</span></button>
            <button class="menu-btn" data-act="codex">Dawn Codex <span class="arr">✦</span></button>
            <button class="menu-btn" data-act="settings">Settings <span class="arr">✦</span></button>
            <button class="menu-btn" data-act="credits">Credits <span class="arr">✦</span></button>
          </nav>
          <div class="title-foot">
            <span>Best wave <b data-best-wave>0</b></span><span class="dot"></span>
            <span><b data-runs>0</b> descents</span><span class="dot"></span>
            <span><b data-marks>0</b> sunmarks</span><span class="dot"></span>
            <span>v${VERSION}</span>
          </div>
        </div>
      </section>

      <!-- SELECT -->
      <section class="screen select" id="screen-select">
        <div class="screen-head">
          <button class="back-btn" data-act="back-title">←</button>
          <div class="head-main">
            <div class="eyebrow" id="select-kicker">The objective</div>
            <h2 id="select-title">Defend the Sunforge</h2>
            <span class="select-arena" id="select-arena">Arena · Sunforge Sanctum · Circular 34m</span>
          </div>
          <div class="aside">
            Best wave <b data-best-wave>0</b><br><span id="select-goal">Survive 20 waves</span>
          </div>
        </div>
        <div class="mode-row" id="mode-row">
          <button class="mode-card selected" data-mode="siege" style="--mc:#f5c26b">
            <span class="mode-ico">☀</span>
            <span class="mode-txt"><em>THE OBJECTIVE</em><b>Sunforge Siege</b><span>Protect the core and raise defenses for 20 waves.</span></span>
            <span class="mode-tag">BEST <b data-best-siege>0</b></span>
          </button>
          <button class="mode-card" data-mode="lane" style="--mc:#67ecff">
            <span class="mode-ico">⌖</span>
            <span class="mode-txt"><em>THE PUSH</em><b>Sunfall Lanes</b><span>Three lanes, tower pads, and three Rift Gates to break.</span></span>
            <span class="mode-tag">BEST <b data-best-lane>0</b></span>
          </button>
          <button class="mode-card" data-mode="trial" style="--mc:#b184ff">
            <span class="mode-ico">◈</span>
            <span class="mode-txt"><em>THE CLASSIC</em><b>Endless Trial</b><span>No core, no defenses. Survive the endless horde.</span></span>
            <span class="mode-tag">BEST <b data-best-trial>0</b></span>
          </button>
          <button class="mode-card" data-mode="hunt" style="--mc:#ff9a5a">
            <span class="mode-ico">☄</span>
            <span class="mode-txt"><em>THE GAUNTLET</em><b>Warden Hunt</b><span>Four wardens back to back. No core, no walls.</span></span>
            <span class="mode-tag">BEST <b data-best-hunt>0</b></span>
          </button>
          <button class="mode-card" data-mode="escort" style="--mc:#73e698">
            <span class="mode-ico">⛨</span>
            <span class="mode-txt"><em>THE ESCORT</em><b>Solar Caravan</b><span>Walk a reliquary home while the horde tears at it.</span></span>
            <span class="mode-tag">BEST <b data-best-escort>0</b></span>
          </button>
          <button class="mode-card" data-mode="ritual" style="--mc:#ffd166">
            <span class="mode-ico">◉</span>
            <span class="mode-txt"><em>THE RITUAL</em><b>Ember Ritual</b><span>Hold three circles and seal them before the flame dies.</span></span>
            <span class="mode-tag">BEST <b data-best-ritual>0</b></span>
          </button>
          <button class="mode-card" data-mode="blitz" style="--mc:#ff6b6b">
            <span class="mode-ico">⌛</span>
            <span class="mode-txt"><em>THE CLOCK</em><b>Eclipse Blitz</b><span>Twelve waves on a burning clock. Kills buy time.</span></span>
            <span class="mode-tag">BEST <b data-best-blitz>0</b></span>
          </button>
          <button class="mode-card" data-mode="duel" style="--mc:#ffe9a8">
            <span class="mode-ico">⚔</span>
            <span class="mode-txt"><em>THE CHAMPION</em><b>Warden Duel</b><span>Four crowned wardens, alone, back to back.</span></span>
            <span class="mode-tag">BEST <b data-best-duel>0</b></span>
          </button>
        </div>
        <div class="brief-panel" id="brief-panel">
          <div class="brief-head">
            <div class="eyebrow">Mission brief</div>
            <h3 id="brief-title">Sunforge Siege</h3>
            <p id="brief-desc"></p>
            <ol class="brief-steps" id="brief-steps"></ol>
          </div>
          <div class="brief-conds">
            <div class="brief-cond win"><span>WIN</span><b id="brief-win"></b></div>
            <div class="brief-cond fail"><span>FAIL</span><b id="brief-fail"></b></div>
            <div class="brief-cond arena"><span>ARENA</span><b id="brief-arena"></b></div>
          </div>
        </div>
        <div class="runstyle-row" id="runstyle-row">
          <button class="runstyle-card selected" data-run="standard" style="--rc:#f5c26b">
            <span class="runstyle-ico">☀</span>
            <span class="runstyle-copy"><em>RUN STYLE</em><b>Standard Run</b><span>Boon drafts, relic offers and Second Wind as normal.</span></span>
          </button>
          <button class="runstyle-card" data-run="skill" style="--rc:#8fe6ff">
            <span class="runstyle-ico">⟡</span>
            <span class="runstyle-copy"><em>SKILL RUN · ×1.6 MARKS</em><b>No drafts. No relics.</b><span>Every level grants flat Mastery instead. Your sigil alone must carry the run.</span></span>
            <span class="runstyle-best" id="runstyle-skill-best">BEST 0</span>
          </button>
        </div>
        <div class="diff-panel" id="diff-panel">
          <div class="diff-head">
            <div class="diff-head-main">
              <div class="eyebrow">Choose your descent</div>
              <h3>Difficulty</h3>
              <p>Higher tiers thicken the horde and thin your shards. The dawn pays more — Hardcore pays double.</p>
            </div>
            <div class="diff-record">
              <span>YOUR TIER</span><b id="diff-current">SOLAR</b><small id="diff-record">best wave 0</small>
            </div>
          </div>
          <div class="diff-grid" id="diff-grid"></div>
          <div class="descent-strip" id="descent-strip" hidden>
            <span>DESCENT <b id="descent-rank">0</b></span>
            <em id="descent-mods"></em>
            <button class="btn" data-act="stepback-menu">Step Back</button>
          </div>
        </div>
        <div class="pact-panel" id="pact-panel">
          <div class="pact-head">
            <div class="pact-head-main">
              <div class="eyebrow">Risk & reward</div>
              <h3>Eclipse Pacts</h3>
              <p>Raise the horde. The dawn pays more — until the cap.</p>
            </div>
            <div class="pact-reward">
              <span>REWARD</span><b id="pact-reward">×1.00</b><small>Cap ×2.40</small>
            </div>
          </div>
          <div class="pact-grid" id="pact-grid"></div>
        </div>
        <div class="elem-grid" id="elem-grid"></div>
        <div class="weapon-panel">
          <div class="weapon-head">
            <div class="eyebrow">Armament</div>
            <h3 id="weapon-title">Ember weapons</h3>
            <p>Every sigil carries three weapons. The shape of the shot changes; the element decides the matchup.</p>
          </div>
          <div class="weapon-row" id="weapon-row"></div>
        </div>
        <div class="select-foot">
          <div class="select-hint" id="select-hint"></div>
          <div class="spacer"></div>
          <button class="btn primary big" data-act="start">Enter the Arena</button>
        </div>
      </section>

      <!-- CODEX -->
      <section class="screen codex" id="screen-codex">
        <div class="codex-shell">
          <div class="screen-head">
            <button class="back-btn" data-act="back-title">←</button>
            <div class="head-main">
              <div class="eyebrow">The solar archive</div>
              <h2>Codex</h2>
            </div>
            <div class="aside">Everything the sun remembers</div>
          </div>
          <div class="tabs" id="codex-tabs">
            <button class="tab" data-tab="lore">Lore</button>
            <button class="tab" data-tab="guide">How to Play</button>
            <button class="tab active" data-tab="elements">Sigils</button>
            <button class="tab" data-tab="fusions">Fusions</button>
            <button class="tab" data-tab="relics">Relics</button>
            <button class="tab" data-tab="bestiary">Bestiary</button>
            <button class="tab" data-tab="boons">Boons</button>
            <button class="tab" data-tab="dawn">Dawn</button>
            <button class="tab" data-tab="missions">Missions</button>
            <button class="tab" data-tab="controls">Controls</button>
          </div>
          <div id="codex-body"></div>
        </div>
      </section>

      <!-- SETTINGS -->
      <section class="screen settings" id="screen-settings">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>Settings</h2>
              <p>Audio, vision and comfort</p>
            </div>
            <div class="spacer"></div>
            <button class="back-btn" data-act="close-settings">←</button>
          </div>
          <div class="panel-body" id="settings-body"></div>
          <div class="panel-actions">
            <span class="subnote">Settings are saved automatically.</span>
            <div class="spacer"></div>
            <button class="btn primary" data-act="close-settings">Done</button>
          </div>
        </div>
      </section>

      <!-- WELCOME — set data-video="assets/welcome.mp4" to play a real intro film behind the prologue -->
      <section class="screen welcome" id="screen-welcome" data-video="">
        <video class="welcome-video" id="welcome-video" muted loop playsinline hidden></video>
        <div class="welcome-bars" aria-hidden="true"><i></i><i></i></div>
        <div class="welcome-wrap">
          <div class="welcome-eyebrow">A PROLOGUE · THE EIGHTFOLD DESCENT</div>
          <h1 class="welcome-logo"><span class="a">HELIOS</span><span class="b">ELEMENTS</span></h1>
          <p class="welcome-tag">The sun is failing. You are what is left of its light.</p>
          <div class="welcome-copy">
            <p>Eight arenas. Six elements. One guardian, and a sigil that answers only to you.</p>
            <p>Everything here is generated live — the stone, the storm, the score. It was made to answer a small stubborn question: can a browser game still feel like a myth?</p>
          </div>
          <div class="welcome-actions">
            <button class="btn primary big" data-act="welcome-enter">Enter the Arena</button>
            <button class="btn" data-act="credits">Credits</button>
            <button class="btn ghost" data-act="welcome-skip">Skip</button>
          </div>
          <div class="welcome-hint">Press any key to begin · replay this prologue from Settings</div>
        </div>
      </section>

      <!-- CREDITS -->
      <section class="screen credits" id="screen-credits">
        <div class="panel credits-panel">
          <div class="panel-head">
            <div>
              <h2>Credits</h2>
              <p>For Helios, and for the light we keep</p>
            </div>
            <div class="spacer"></div>
            <button class="back-btn" data-act="credits-back">←</button>
          </div>
          <div class="panel-body credits-body">
            <div class="credit-block">
              <h3>HELIOS</h3>
              <p>The sun this game is named for — the oldest thing we agreed to worship before we had better words for it. Every sigil, arena and warden here is a small argument that light is worth defending, even when the night is winning.</p>
            </div>
            <div class="credit-block">
              <h3>Why this exists</h3>
              <p>Helios Elements was made to answer a simple question: can a browser game feel like a ritual? No downloads, no account, no storefront. A guardian, a sigil, a ring of stone, and something coming out of the dark. The answer is meant to be played rather than read — so the code stays small, the audio is generated live, and the arena is built fresh every time you descend.</p>
            </div>
            <div class="credit-block">
              <h3>Built with</h3>
              <p>Vanilla JavaScript and three.js for the arenas. The Web Audio API for every sound you hear — no sample files, no streamed tracks, no network calls. Type set in Cinzel and Inter.</p>
            </div>
            <div class="credit-block">
              <h3>The eightfold thanks</h3>
              <p>To everyone who ever held a line they knew they would lose, and kept holding it anyway. That is the whole game.</p>
            </div>
            <div class="credit-foot">HELIOS ELEMENTS · v${VERSION} · procedural, offline, yours</div>
          </div>
        </div>
      </section>

      <!-- LEVEL UP -->
      <section class="screen levelup" id="screen-levelup">
        <div class="levelup-wrap">
          <div class="levelup-head">
            <div class="eyebrow" id="levelup-kicker">Level 2</div>
            <h2>Choose a Boon</h2>
            <p id="levelup-sub">The sun offers three paths. Take one.</p>
          </div>
          <div class="boon-grid" id="boon-grid"></div>
          <div class="levelup-foot">
            <span>Press 1 · 2 · 3 to choose</span>
            <button class="btn small reroll-btn" data-act="reroll" id="levelup-reroll">Reroll</button>
          </div>
        </div>
      </section>

      <!-- RELIC DRAFT -->
      <section class="screen relic" id="screen-relic">
        <div class="relic-wrap">
          <div class="levelup-head">
            <div class="eyebrow" id="relic-kicker">The hoard</div>
            <h2>Choose a Relic</h2>
            <p id="relic-sub">The sun remembers what you carry.</p>
          </div>
          <div class="relic-slots" id="relic-slots"></div>
          <div class="relic-grid" id="relic-grid"></div>
          <div class="levelup-foot">
            <span id="relic-foot">Press 1 · 2 · 3 to choose</span>
          </div>
        </div>
      </section>

      <!-- FORGE -->
      <section class="screen forge" id="screen-forge">
        <div class="panel forge-panel">
          <div class="panel-head">
            <div>
              <div class="eyebrow">Field workshop</div>
              <h2>The Solar Forge</h2>
              <p>Raise a defense, upgrade its rank, or mend the core. Open it any time with B.</p>
            </div>
            <div class="spacer"></div>
            <div class="shard-chip big"><i>◈</i><b id="forge-shards">3</b><span>SUN SHARDS</span></div>
            <button class="back-btn" data-act="close-forge">←</button>
          </div>
          <div class="panel-body">
            <div class="forge-core" id="forge-core"></div>
            <div class="section-label">Raise a defense</div>
            <div class="forge-grid" id="forge-grid"></div>
            <div class="section-label">Existing defenses</div>
            <div class="forge-status" id="forge-status"></div>
          </div>
          <div class="panel-actions">
            <button class="btn primary" data-forge="repair-core" id="forge-repair">Repair Sunforge</button>
            <button class="btn" data-act="close-forge">Return to the arena</button>
            <div class="spacer"></div>
            <span class="subnote">Hold <b>E</b> near the core or a defense to repair it for free.</span>
          </div>
        </div>
      </section>

      <!-- PAUSE -->
      <section class="screen pause" id="screen-pause">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2>The Arena Waits</h2>
              <p id="pause-sub">Wave 1 · 00:00</p>
            </div>
            <div class="spacer"></div>
            <span class="pill" id="pause-form">EMBER</span>
          </div>
          <div class="panel-body" id="pause-body"></div>
          <div class="panel-actions">
            <button class="btn primary" data-act="resume">Resume</button>
            <button class="btn" data-act="settings">Settings</button>
            <div class="spacer"></div>
            <button class="btn" data-act="restart">Restart Run</button>
            <button class="btn danger" data-act="quit">Abandon Run</button>
          </div>
        </div>
      </section>

      <!-- GAME OVER -->
      <section class="screen gameover" id="screen-gameover">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h2 id="go-title">The Sun Sets</h2>
              <p id="go-sub">Your sigil returns to the dark</p>
            </div>
            <div class="spacer"></div>
            <span class="pill victory-pill" id="go-badge" hidden>VICTORY</span>
            <span class="pill diff-pill" id="go-diff" hidden>SOLAR</span>
            <span class="pill" id="go-form">EMBER</span>
          </div>
          <div class="panel-body" id="go-body"></div>
          <div class="panel-actions">
            <button class="btn primary" data-act="retry">Descend Again</button>
            <button class="btn" data-act="stepback" id="go-stepback" hidden>Step Back</button>
            <button class="btn" data-act="change">Change Sigil</button>
            <div class="spacer"></div>
            <button class="btn" data-act="quit">Main Menu</button>
          </div>
        </div>
      </section>
    `);

    this.hud = document.getElementById('hud');
    this.el = {
      sigil: document.getElementById('hud-sigil'),
      form: document.getElementById('hud-form'),
      role: document.getElementById('hud-role'),
      level: document.getElementById('hud-level'),
      hpBar: document.getElementById('hud-hp-bar'),
      hpFill: document.getElementById('hud-hp-fill'),
      hpText: document.getElementById('hud-hp-text'),
      shieldFill: document.getElementById('hud-shield-fill'),
      wave: document.getElementById('hud-wave'),
      phase: document.getElementById('hud-phase'),
      best: document.getElementById('hud-best'),
      bossWrap: document.getElementById('boss-wrap'),
      bossName: document.getElementById('boss-name'),
      bossFill: document.getElementById('boss-fill'),
      coreWrap: document.getElementById('core-wrap'),
      coreBar: document.getElementById('core-bar'),
      coreFill: document.getElementById('core-fill'),
      coreNum: document.getElementById('core-hp-num'),
      corePct: document.getElementById('core-pct'),
      coreThreat: document.getElementById('core-threat'),
      coreLastLight: document.getElementById('core-lastlight'),
      coreGuard: document.getElementById('core-guard'),
      coreAlarm: document.getElementById('core-alarm'),
      laneStrip: document.getElementById('lane-strip'),
      defPips: document.getElementById('def-pips'),
      shardChip: document.getElementById('shard-chip'),
      shardCount: document.getElementById('shard-count'),
      kindleChip: document.getElementById('kindle-chip'),
      kindleCount: document.getElementById('kindle-count'),
      kindleFill: document.getElementById('kindle-fill'),
      forgeBtn: document.getElementById('forge-btn'),
      repairPrompt: document.getElementById('repair-prompt'),
      repairName: document.getElementById('repair-name'),
      repairFill: document.getElementById('repair-fill'),
      combo: document.getElementById('hud-combo'),
      comboCount: document.getElementById('hud-combo-count'),
      boons: document.getElementById('hud-boons'),
      xpLevel: document.getElementById('hud-xp-level'),
      xpFill: document.getElementById('hud-xp-fill'),
      xpNum: document.getElementById('hud-xp-num'),
      intermission: document.getElementById('intermission'),
      interCount: document.getElementById('inter-count'),
      interLabel: document.getElementById('inter-label'),
      interSub: document.getElementById('inter-sub'),
      interBtn: document.getElementById('inter-btn'),
      surgeCd: document.getElementById('surge-cd'),
      dashCd: document.getElementById('dash-cd'),
      ultCd: document.getElementById('ult-cd'),
      surgeIcon: document.getElementById('surge-icon'),
      abilities: {
        surge: document.getElementById('abil-surge'),
        dash: document.getElementById('abil-dash'),
        ult: document.getElementById('abil-ult'),
      },
      sound: document.getElementById('sound-btn'),
      pactTag: document.getElementById('hud-pact'),
      diffTag: document.getElementById('hud-diff'),
      descentTag: document.getElementById('hud-descent'),
      bonusTag: document.getElementById('hud-bonus'),
      skillTag: document.getElementById('hud-skill'),
      objectiveWrap: document.getElementById('objective-wrap'),
      objectiveLabel: document.getElementById('objective-label'),
      objectiveValue: document.getElementById('objective-value'),
      objectiveNote: document.getElementById('objective-note'),
      objectiveBar: document.getElementById('objective-bar'),
      objectiveFill: document.getElementById('objective-fill'),
      weaponChip: document.getElementById('weapon-chip'),
      weaponName: document.getElementById('weapon-name'),
      weaponRank: document.getElementById('weapon-rank'),
      weaponRarity: document.getElementById('weapon-rarity'),
      weaponSlots: document.getElementById('weapon-slots'),
      relics: document.getElementById('hud-relics'),
      levelUpBtn: document.getElementById('levelup-btn'),
      levelUpCount: document.getElementById('levelup-count'),
      refreshBoons: null,
    };

    this._renderElemGrid();
    this._renderDifficulties();
    this._renderPacts();
    this._renderSettings();
    this._renderCodex('elements');
    this._applyDepth();
    this._spawnEmbers();
    this._syncBest();
    this._buildWorldBars();
  }

  /* ============================================================
     WORLD HEALTH BARS
     ============================================================ */
  _buildWorldBars() {
    this.barLayer = document.createElement('div');
    this.barLayer.className = 'world-bars';
    this.barLayer.id = 'world-bars';
    this.root.appendChild(this.barLayer);
    this._barVec = new THREE.Vector3();
    this._barPool = [];
    for (let i = 0; i < 30; i++) {
      const el = document.createElement('div');
      el.className = 'wbar';
      el.style.display = 'none';
      el.innerHTML = '<span class="wbar-name"></span><span class="wbar-track"><i class="wbar-fill"></i></span>';
      this.barLayer.appendChild(el);
      this._barPool.push({
        el,
        name: el.querySelector('.wbar-name'),
        fill: el.querySelector('.wbar-fill'),
      });
    }
    this._barsShown = false;
  }

  updateWorldBars(game) {
    const pool = this._barPool;
    if (!pool) return;
    const active = game.state === 'playing' && game.player?.alive && this.hud.classList.contains('on');
    if (!active) {
      if (this._barsShown) {
        for (const b of pool) b.el.style.display = 'none';
        this._barsShown = false;
      }
      return;
    }
    this._barsShown = true;

    let cursor = 0;
    const vw = window.innerWidth, vh = window.innerHeight;
    const place = (kind, x, y, z, hp, max, color, name = '', extra = '') => {
      if (cursor >= pool.length) return;
      const b = pool[cursor++];
      this._barVec.set(x, y, z);
      const p = this.engine.project(this._barVec);
      if (!p.visible || p.x < -36 || p.x > vw + 36 || p.y < -36 || p.y > vh + 36) {
        b.el.style.display = 'none';
        return;
      }
      b.el.style.display = 'block';
      b.el.style.left = p.x + 'px';
      b.el.style.top = p.y + 'px';
      const cls = 'wbar ' + kind + (hp / Math.max(1, max) < 0.3 ? ' low' : '') + extra;
      if (b.el.className !== cls) b.el.className = cls;
      b.el.style.setProperty('--wb', color);
      b.fill.style.width = Math.max(0, Math.min(100, (hp / Math.max(1, max)) * 100)) + '%';
      if (b.name.textContent !== name) b.name.textContent = name;
      b.name.style.display = name ? 'block' : 'none';
    };

    const p = game.player;
    place('player', p.pos.x, 2.2, p.pos.z, p.stats.hp, p.stats.maxHp, p.form.css);

    if (game.structures) {
      for (const d of game.structures.defenses) {
        if (!d.alive || d.hp >= d.maxHp) continue;
        place('structure', d.pos.x, 2.75, d.pos.z, d.hp, d.maxHp, d.type.css, d.name);
      }
    }

    const enemies = [];
    for (const e of game.enemies.list) {
      if (e.dead || e.isBoss) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 34 * 34) continue;
      enemies.push({ e, d2 });
    }
    enemies.sort((a, b) => a.d2 - b.d2);
    for (const { e } of enemies) {
      if (cursor >= pool.length) break;
      place(
        e.elite ? 'elite' : 'enemy',
        e.pos.x, e.baseY + e.radius * 2.05 + 0.45, e.pos.z,
        e.hp, e.maxHp,
        e.elite ? '#ffcf7a' : '#ff5a4a',
        e.elite ? e.name : '',
        e.flashT > 0 ? ' hit' : ''
      );
    }

    for (let i = cursor; i < pool.length; i++) pool[i].el.style.display = 'none';
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  _bind() {
    // key rebinding capture
    this.root.addEventListener('click', (e) => {
      const bindBtn = e.target.closest('[data-bind]');
      if (!bindBtn) return;
      this.audio.unlock();
      this._capturing = bindBtn.dataset.bind;
      this.audio.keybind();
      this._renderSettings();
      this._captureKeys();
    });

    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act], [data-elem], [data-weapon], [data-card], [data-tab], [data-quality], [data-toggle], [data-mode], [data-run], [data-build], [data-forge], [data-upgrade], [data-pact], [data-relic], [data-reward], [data-diff], [data-music], [data-menus]');
      if (!el) return;
      this.audio.unlock();

      if (el.dataset.act) {
        this._action(el.dataset.act, el);
        if (el.tagName === 'BUTTON') el.blur();
        return;
      }
      if (el.dataset.diff) {
        this.audio.ui();
        if (this.game.setDifficulty(el.dataset.diff)) {
          this.difficulty = el.dataset.diff;
          this.save.difficulty = el.dataset.diff;
        } else {
          this.audio.error();
        }
        this._renderDifficulties();
        return;
      }
      if (el.dataset.menus) {
        this.audio.ui();
        this._setSetting('menus', el.dataset.menus);
        this._applyDepth();
        this._renderSettings();
        return;
      }
      if (el.dataset.pact) {
        this.audio.ui();
        this.game.adjustPact(el.dataset.pact, Number(el.dataset.dir) || 0);
        this._renderPacts();
        this._syncBest();
        return;
      }
      if (el.dataset.relic !== undefined) {
        this.audio.ui();
        this.game.chooseRelic(parseInt(el.dataset.relic, 10));
        return;
      }
      if (el.dataset.reward) {
        this.audio.ui();
        this.game.buyReward(el.dataset.reward);
        return;
      }
      if (el.dataset.mode) {
        this.audio.ui();
        this.selectMode(el.dataset.mode);
        return;
      }
      if (el.dataset.run) {
        this.audio.ui();
        this.game.setSkillRun(el.dataset.run === 'skill');
        this._renderRunStyle();
        this._syncBest();
        return;
      }
      if (el.dataset.build) {
        this.game.buildDefense(el.dataset.build);
        if (el.tagName === 'BUTTON') el.blur();
        return;
      }
      if (el.dataset.upgrade !== undefined) {
        this.game.upgradeDefense(parseInt(el.dataset.upgrade, 10));
        if (el.tagName === 'BUTTON') el.blur();
        return;
      }
      if (el.dataset.forge) {
        if (el.dataset.forge === 'repair-core') this.game.repairCore();
        if (el.tagName === 'BUTTON') el.blur();
        return;
      }
      if (el.dataset.elem) {
        this.audio.ui();
        this.selectElement(el.dataset.elem);
        return;
      }
      if (el.dataset.weapon) {
        this.audio.ui();
        this.game.setWeapon(el.dataset.welem, el.dataset.weapon);
        this._renderWeapons();
        return;
      }
      if (el.dataset.card !== undefined) {
        this.audio.ui();
        this.game.chooseCard(parseInt(el.dataset.card, 10));
        return;
      }
      if (el.dataset.tab) {
        this.audio.tab();
        this._renderCodex(el.dataset.tab);
        return;
      }
      if (el.dataset.music) {
        this._setSetting('musicTheme', el.dataset.music);
        this.game.audio.setMood({
          theme: this.game.arenaElement || null,
          element: this.game.player?.form?.sigils?.[0] || null,
        });
        this._renderSettings();
        return;
      }
      if (el.dataset.quality) {
        this.audio.ui();
        this._setSetting('quality', el.dataset.quality);
        this._renderSettings();
        return;
      }
      if (el.dataset.toggle) {
        this.audio.ui();
        const key = el.dataset.toggle;
        const s = this.game.save.settings;
        const value = key === 'musicOn' ? !s.musicOn : !s[key];
        this._setSetting(key, key === 'shake' ? (s.shake > 0 ? 0 : 1) : value);
        this._renderSettings();
        return;
      }
    });

    // live sliders
    this.root.addEventListener('input', (e) => {
      const input = e.target;
      if (input.matches('input[type=range][data-setting]')) {
        const key = input.dataset.setting;
        const value = parseFloat(input.value) / 100;
        input.style.setProperty('--fill', input.value + '%');
        const out = input.parentElement.querySelector('.range-val');
        if (out) out.textContent = Math.round(value * 100) + '%';
        this._setSetting(key, value, true);
      }
    });

    this.root.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'save-file-input') {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (file) this._readSaveFile(file);
      }
    });

    this.root.addEventListener('mouseover', (e) => {
      const card = e.target.closest('.elem-card, .boon-card, .menu-btn, .relic-card, .pact-step, .dawn-reward');
      if (!card) return;
      const now = performance.now();
      if (this._lastHover && now - this._lastHover < 90) return;
      this._lastHover = now;
      this.audio.hover();
    });

    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('.boon-card, .elem-card, .menu-btn, .btn, .icon-btn, .ability, .call-btn, .tab, .back-btn, .relic-card, .pact-step, .dawn-reward, .levelup-btn');
      if (b) b.blur();
    });
  }

  _action(act) {
    switch (act) {
      case 'play':
        this.audio.unlock();
        this.audio.confirm();
        this.showSelect();
        break;
      case 'back-title':
        this.audio.back();
        this.game.quitToMenu();
        break;
      case 'start':
        this.audio.confirm();
        this.game.start(this.selectedElement, this.mode);
        break;
      case 'open-levelup':
        this.audio.ui();
        this.game.openLevelUp();
        break;
      case 'reroll':
        this.audio.ui();
        this.game.rerollCards();
        break;
      case 'forge':
        this.audio.forgeOpen();
        this.game.openForge();
        break;
      case 'close-forge':
        this.audio.close();
        this.game.closeForge();
        break;
      case 'codex':
        this.audio.open();
        this.openCodex();
        break;
      case 'settings':
        this.audio.open();
        this.openSettings();
        break;
      case 'close-settings':
        this.audio.close();
        this.closeSettings();
        break;
      case 'save-copy':
        this._copySave();
        break;
      case 'save-download':
        this._downloadSave();
        break;
      case 'save-import-toggle': {
        const box = document.getElementById('save-import');
        if (box) {
          box.hidden = !box.hidden;
          if (!box.hidden) document.getElementById('save-import-text')?.focus();
        }
        break;
      }
      case 'save-file':
        document.getElementById('save-file-input')?.click();
        break;
      case 'save-import-run':
        this._importText(document.getElementById('save-import-text')?.value || '');
        break;
      case 'sound':
        this._toggleSound();
        break;
      case 'pause':
        this.audio.ui();
        this.game.pause();
        break;
      case 'resume':
        this.audio.ui();
        this.game.resume();
        break;
      case 'callwave':
        this.audio.ui();
        this.game.callWave();
        break;
      case 'restart':
        this.audio.ui();
        this.game.restart();
        break;
      case 'quit':
        this.audio.ui();
        this.hidePause();
        this.hideGameOver();
        this.game.quitToMenu();
        break;
      case 'retry':
        this.audio.ui();
        this.game.restart();
        break;
      case 'stepback':
        this.audio.ui();
        this.game.stepBackDescent();
        break;
      case 'stepback-menu':
        this.audio.ui();
        if (this.game.lowerDescent()) this._renderDifficulties();
        break;
      case 'change':
        this.audio.ui();
        this.hideGameOver();
        this.game.quitToMenu();
        this.showSelect();
        break;
      case 'welcome-enter':
        this.welcomeEnter();
        break;
      case 'welcome-skip':
        this.audio.back();
        this.welcomeEnter();
        break;
      case 'credits':
        this.showCredits();
        break;
      case 'credits-back':
        this.creditsBack();
        break;
      case 'replay-intro':
        this.audio.open();
        this.showWelcome(true);
        break;
      case 'reset-keys':
        this.game.resetKeys();
        this.audio.confirm();
        this._renderSettings();
        break;
      case 'surge':
        if (this.game.player) this.game.player.trySurge();
        break;
      case 'dash':
        if (this.game.player) this.game.player.tryDash();
        break;
      case 'ult':
        if (this.game.player) this.game.player.tryUlt();
        break;
    }
  }

  _toggleSound() {
    const s = this.game.save.settings;
    this._mutedBackup = this._mutedBackup ?? s.master;
    if (s.master > 0) {
      this._mutedBackup = s.master;
      this._setSetting('master', 0);
    } else {
      this._setSetting('master', this._mutedBackup || 0.7);
    }
    this._renderSettings();
  }

  _setSetting(key, value, quiet = false) {
    const s = { ...this.game.save.settings };
    s[key] = value;
    this.game.applySettings(s);
    if (!quiet) this.audio.ui();
    if (key === 'master') this._refreshSoundIcon();
  }

  _refreshSoundIcon() {
    const muted = this.game.save.settings.master <= 0.001;
    this.el.sound.textContent = muted ? '✕' : '♪';
    this.el.sound.classList.toggle('off', muted);
  }

  /* ---------------- CONTROLS ---------------- */
  _controlsHtml() {
    const k = (a) => this.game.keyFor(a);
    const wasd = k('up') === 'KeyW' && k('down') === 'KeyS' && k('left') === 'KeyA' && k('right') === 'KeyD';
    const rows = wasd
      ? [{ name: 'Move', label: 'WASD' }]
      : ['up', 'down', 'left', 'right'].map(a => ({
          name: CONTROL_ACTIONS.find(c => c.key === a).name,
          label: keyLabel(k(a)),
        }));
    const rest = CONTROL_ACTIONS.filter(a => !['up', 'down', 'left', 'right'].includes(a.key));
    return rows.concat(rest.map(a => ({ name: a.name, label: keyLabel(k(a.key)) })))
      .map(r => `<div class="control-row"><span>${r.name}</span><span class="kbd">${r.label}</span></div>`)
      .join('');
  }

  _captureKeys() {
    if (this._keyCapture) {
      window.removeEventListener('keydown', this._keyCapture, true);
      this._keyCapture = null;
    }
    this._keyCapture = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const action = this._capturing;
      this._capturing = null;
      window.removeEventListener('keydown', this._keyCapture, true);
      this._keyCapture = null;
      if (!action) return;
      if (e.code === 'Escape') {
        this.audio.back();
        this._renderSettings();
        return;
      }
      this.game.setKey(action, e.code);
      this.audio.keybind();
      this._renderSettings();
    };
    window.addEventListener('keydown', this._keyCapture, true);
  }

  /* ---------------- WELCOME & CREDITS ---------------- */
  showWelcome(replay = false) {
    this.game.state = 'welcome';
    this.hud.classList.remove('on');
    this._showScreen('welcome');
    this._tryWelcomeVideo();
    if (!replay) this.audio.open();
    this._bindWelcomeKeys();
  }

  _bindWelcomeKeys() {
    this._unbindWelcomeKeys();
    this._welcomeKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'Tab') return;
      e.preventDefault();
      this.welcomeEnter();
    };
    // give the opening click a beat before any key counts as "enter"
    setTimeout(() => {
      if (this._welcomeKey) window.addEventListener('keydown', this._welcomeKey);
    }, 450);
  }

  _unbindWelcomeKeys() {
    if (!this._welcomeKey) return;
    window.removeEventListener('keydown', this._welcomeKey);
    this._welcomeKey = null;
  }

  welcomeEnter() {
    this._unbindWelcomeKeys();
    const vid = document.getElementById('welcome-video');
    if (vid) { try { vid.pause(); } catch { /* ignore */ } }
    this.audio.confirm();
    this.game.markWelcomeSeen();
    this.game.state = 'menu';
    this.showTitle(this.game.save);
  }

  _tryWelcomeVideo() {
    const vid = document.getElementById('welcome-video');
    const host = document.getElementById('screen-welcome');
    if (!vid || !host || this._videoChecked) return;
    this._videoChecked = true;
    const src = (host.dataset.video || '').trim();
    if (!src) return; // no film shipped — the live arena camera carries the prologue
    vid.src = src;
    vid.hidden = false;
    vid.play().catch(() => { vid.hidden = true; });
    vid.addEventListener('error', () => { vid.hidden = true; }, { once: true });
  }

  showCredits() {
    this.audio.open();
    if (this.screenName !== 'credits') this._creditsReturn = this.screenName;
    this._showScreen('credits');
  }

  creditsBack() {
    this.audio.back();
    const back = this._creditsReturn || 'title';
    if (back === 'welcome') {
      this._showScreen('welcome');
      this._bindWelcomeKeys();
    } else if (back === 'settings') {
      this._renderSettings();
      this._showScreen('settings');
    } else {
      this.showTitle(this.game.save);
    }
  }

  _renderDifficulties() {
    const grid = document.getElementById('diff-grid');
    if (!grid) return;
    const chosen = normalizeDifficulty(this.game.save?.difficulty || this.save.difficulty || this.difficulty);
    this.difficulty = chosen;
    const best = this.save.difficultyBest || {};
    const wins = this.save.difficultyWins || {};
    grid.innerHTML = DIFFICULTY_ORDER.map(key => {
      const d = DIFFICULTIES[key];
      const unlocked = difficultyUnlocked(key, this.save);
      const active = key === chosen;
      const bestWave = best[key] || 0;
      const winCount = wins[key] || 0;
      const draft = (d.rerolls ? ` · REROLL +${d.rerolls}` : '') + (d.relicChoices ? ` · RELIC +${d.relicChoices}` : '');
      const o = d.objective;
      const objMods = o && (o.blitzTime !== 1 || o.ritualCharge !== 1 || o.escortSpeed !== 1)
        ? ` · CLOCK ×${o.blitzTime.toFixed(2)} · CIRCLES ×${o.ritualCharge.toFixed(2)} · CARAVAN ×${o.escortSpeed.toFixed(2)}`
        : '';
      const mods = `HP ×${d.enemyHp.toFixed(2)} · DMG ×${d.enemyDamage.toFixed(2)} · SHARDS ×${d.shardMult.toFixed(2)} · MARKS ×${d.markMult.toFixed(2)}${objMods}${draft}`;
      return `<button class="diff-card ${active ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-diff="${key}" style="--dc:${d.css}" aria-disabled="${!unlocked}">
        <span class="diff-icon">${unlocked ? d.icon : '🔒'}</span>
        <span class="diff-copy">
          <em>${d.short}${winCount ? ' · ' + winCount + ' WIN' + (winCount === 1 ? '' : 'S') : ''}</em>
          <b>${d.name}</b>
          <span>${d.desc}</span>
          <i class="diff-mods">${mods}</i>
        </span>
        <span class="diff-best">${unlocked ? 'BEST <b>' + bestWave + '</b>' : 'LOCKED'}</span>
        ${unlocked ? '' : `<span class="diff-lock">${d.unlock?.text || 'Locked'}</span>`}
      </button>`;
    }).join('');
    const strip = document.getElementById('descent-strip');
    if (strip) {
      const rank = this.game.descentRank ? this.game.descentRank() : (this.save.descent || 0);
      const meta = this.game.descentMeta ? this.game.descentMeta() : { hp: 1, damage: 1 };
      strip.hidden = rank <= 0;
      const rankEl = document.getElementById('descent-rank');
      if (rankEl) rankEl.textContent = rank;
      const modsEl = document.getElementById('descent-mods');
      if (modsEl) {
        modsEl.textContent = rank
          ? 'next descent +' + Math.round((meta.hp - 1) * 100) + '% enemy health · +' + Math.round((meta.damage - 1) * 100) + '% damage · +' + Math.round((meta.marks - 1) * 100) + '% sunmarks'
          : '';
      }
    }
    const current = document.getElementById('diff-current');
    const record = document.getElementById('diff-record');
    const d = DIFFICULTIES[chosen];
    if (current) {
      current.textContent = d.name.toUpperCase();
      current.style.color = d.css;
    }
    if (record) record.textContent = 'best wave ' + (best[chosen] || 0) + (wins[chosen] ? ' · ' + wins[chosen] + ' wins' : '');
  }

  _renderPacts() {
    const grid = document.getElementById('pact-grid');
    if (!grid) return;
    const pacts = this.game.pacts || this.save.pacts || {};
    const rank = pactRanks(pacts);
    const mult = pactReward(pacts);
    const rewardEl = document.getElementById('pact-reward');
    if (rewardEl) rewardEl.textContent = '×' + mult.toFixed(2);
    grid.innerHTML = Object.values(PACTS).map(pact => {
      const value = Math.max(0, Math.min(pact.max, pacts[pact.key] || 0));
      const pips = Array.from({ length: pact.max }, (_, i) => `<i class="${i < value ? 'on' : ''}"></i>`).join('');
      return `<div class="pact-row ${value ? 'active' : ''}" style="--pc:${value ? '#c9b5ff' : '#8f92a8'}">
        <span class="pact-icon">${pact.icon}</span>
        <div class="pact-copy"><b>${pact.name}</b><span>${pact.desc}</span></div>
        <div class="pact-controls">
          <button class="pact-step" data-pact="${pact.key}" data-dir="-1" ${value <= 0 ? 'disabled' : ''} aria-label="Remove ${pact.name}">−</button>
          <span class="pact-pips">${pips}</span>
          <button class="pact-step" data-pact="${pact.key}" data-dir="1" ${value >= pact.max ? 'disabled' : ''} aria-label="Add ${pact.name}">+</button>
        </div>
      </div>`;
    }).join('');
    const cap = document.querySelector('#pact-panel .pact-reward small');
    if (cap) cap.textContent = rank ? rank + ' ranks · cap ×2.40' : 'Cap ×2.40';
  }

  /* ============================================================
     SCREENS
     ============================================================ */
  _showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    if (name) {
      const el = document.getElementById('screen-' + name);
      if (el) el.classList.add('active');
    }
    this.screenName = name || null;
  }

  _syncBest() {
    document.querySelectorAll('[data-best-wave]').forEach(el => { el.textContent = this.save.bestWave || 0; });
    document.querySelectorAll('[data-best-siege]').forEach(el => { el.textContent = this.save.bestSiege || 0; });
    document.querySelectorAll('[data-best-lane]').forEach(el => { el.textContent = this.save.bestLane || 0; });
    document.querySelectorAll('[data-best-trial]').forEach(el => { el.textContent = this.save.bestTrial || 0; });
    document.querySelectorAll('[data-best-hunt]').forEach(el => { el.textContent = this.save.bestHunt || 0; });
    const modeBest = this.save.modeBest || {};
    for (const mode of ['escort', 'ritual', 'blitz', 'duel']) {
      document.querySelectorAll('[data-best-' + mode + ']').forEach(el => { el.textContent = modeBest[mode] || 0; });
    }
    document.querySelectorAll('[data-best-skill]').forEach(el => { el.textContent = this.save.bestSkill || 0; });
    const skillBest = document.getElementById('runstyle-skill-best');
    if (skillBest) skillBest.textContent = 'BEST ' + (this.save.bestSkill || 0);
    document.querySelectorAll('[data-runs]').forEach(el => { el.textContent = this.save.runs || 0; });
    document.querySelectorAll('[data-marks]').forEach(el => { el.textContent = this.save.marks || 0; });
  }

  showTitle(save) {
    this.save = save;
    this.boss = null;
    this.mode = MODES[this.save.mode] ? this.save.mode : this.mode;
    this.hud.classList.remove('on');
    this.hideForge();
    this.hideGameOver();
    this._showScreen('title');
    this._syncBest();
    this._refreshSoundIcon();
    this.engine.setAccent(0xf5c26b);
  }

  showSelect() {
    this.hud.classList.remove('on');
    this._showScreen('select');
    this.difficulty = normalizeDifficulty(this.game.save?.difficulty || this.save.difficulty);
    this.selectMode(this.mode, true);
    this.selectElement(this.selectedElement || 'ember');
    this._renderDifficulties();
    this._renderPacts();
    this._renderRunStyle();
    this._decorateArenas();
    this._applyDepth();
    this._syncBest();
  }

  /* Menu depth: the same game with more or fewer questions before the fight. */
  _applyDepth() {
    const depth = menuDepth(this.game.save);
    this.depth = depth;
    const show = (el, on) => { if (el) el.classList.toggle('is-hidden', !on); };
    show(document.getElementById('runstyle-row'), depth.skillRun);
    show(document.getElementById('diff-panel'), depth.difficulty);
    show(document.getElementById('pact-panel'), depth.pacts);
    show(document.querySelector('.weapon-panel'), depth.weapons);
    const allowed = new Set(depth.modes);
    document.querySelectorAll('#mode-row .mode-card').forEach(card => {
      card.classList.toggle('is-hidden', !allowed.has(card.dataset.mode));
    });
    document.querySelectorAll('#codex-tabs .tab').forEach(tab => {
      tab.classList.toggle('is-hidden', !depth.codex.includes(tab.dataset.tab));
    });
    // never leave a hidden mission or tab as the active one
    if (MODES[this.mode] && !allowed.has(this.mode)) this.selectMode(depth.modes[0], true);
    if (!depth.codex.includes(this._currentTab)) this._renderCodex(depth.codex[0]);
  }

  _decorateArenas() {
    document.querySelectorAll('.mode-card').forEach(card => {
      const meta = MODES[card.dataset.mode];
      const arena = meta ? ARENAS[meta.arena] : null;
      const txt = card.querySelector('.mode-txt');
      if (!arena || !txt || txt.querySelector('.mode-arena')) return;
      const chip = document.createElement('span');
      chip.className = 'mode-arena';
      chip.textContent = arena.name + ' · ' + arena.shapeName + ' ' + arena.radius + 'm';
      txt.appendChild(chip);
    });
  }

  _renderRunStyle() {
    const skill = !!this.game.save?.skillRun;
    document.querySelectorAll('.runstyle-card').forEach(c => {
      c.classList.toggle('selected', (c.dataset.run === 'skill') === skill);
    });
    const best = document.getElementById('runstyle-skill-best');
    if (best) best.textContent = 'BEST ' + (this.save.bestSkill || 0);
  }

  selectMode(mode, quiet = false) {
    const key = MODES[mode] ? mode : 'siege';
    this.mode = key;
    this.save.mode = key;
    if (this.game.save) this.game.save.mode = key;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.toggle('selected', c.dataset.mode === key));
    const meta = MODES[key];
    const title = document.getElementById('select-title');
    const kicker = document.getElementById('select-kicker');
    const goal = document.getElementById('select-goal');
    const start = document.querySelector('#screen-select [data-act="start"]');
    const titles = {
      siege: 'Defend the Sunforge', lane: 'Push the Lanes', trial: 'Begin the Descent', hunt: 'Hunt the Wardens',
      escort: 'Walk the Light Home', ritual: 'Hold the Ember Circles', blitz: 'Beat the Setting Sun', duel: 'Face the Champions',
    };
    const starts = {
      siege: 'Raise the Sunforge', lane: 'Open the Lanes', trial: 'Enter the Arena', hunt: 'Begin the Hunt',
      escort: 'Escort the Reliquary', ritual: 'Begin the Ritual', blitz: 'Start the Clock', duel: 'Enter the Ring',
    };
    if (title) title.textContent = titles[key] || titles.trial;
    if (kicker) kicker.textContent = meta.kicker;
    if (goal) goal.textContent = meta.goal;
    const arena = ARENAS[meta.arena];
    const arenaEl = document.getElementById('select-arena');
    if (arenaEl && arena) {
      arenaEl.textContent = 'Arena · ' + arena.name + ' · ' + arena.shapeName + ' ' + arena.radius + 'm · '
        + (ELEMENTS[arena.element]?.name || 'Neutral') + ' attuned';
    }
    if (start) start.textContent = starts[key] || starts.trial;
    this._renderBrief(key);
    this._renderDifficulties();
    if (!quiet) this.selectElement(this.selectedElement || 'ember');
    this._syncBest();
  }

  /* Every mission gets a plain brief: what you do, how you win, how you lose. */
  _renderBrief(key) {
    const m = MODES[key] || MODES.trial;
    const panel = document.getElementById('brief-panel');
    if (!panel) return;
    panel.style.setProperty('--bc', m.css);
    document.getElementById('brief-title').textContent = m.name;
    document.getElementById('brief-desc').textContent = m.desc;
    document.getElementById('brief-steps').innerHTML = (m.steps || []).map(s => `<li>${s}</li>`).join('');
    document.getElementById('brief-win').textContent = m.win || m.goal || '—';
    document.getElementById('brief-fail').textContent = m.fail || '—';
    const arena = ARENAS[m.arena];
    document.getElementById('brief-arena').textContent = arena
      ? `${arena.name} · ${arena.shapeName} ${arena.radius}m`
      : '—';
  }

  openCodex() {
    this._showScreen('codex');
    this._renderCodex(this._currentTab || 'elements');
  }

  openSettings() {
    this.settingsReturn = this.screenName;
    this._renderSettings();
    this._showScreen('settings');
  }

  closeSettings() {
    this.audio.ui();
    if (this.settingsReturn === 'pause' && this.game.state === 'paused') {
      this._showScreen('pause');
    } else if (this.settingsReturn === 'gameover' && this.game.state === 'gameover') {
      this._showScreen('gameover');
    } else if (this.settingsReturn === 'title') {
      this.showTitle(this.game.save);
    } else {
      this.showTitle(this.game.save);
    }
  }

  enterGame(game) {
    this._showScreen(null);
    this.hideForge();
    this.hud.classList.add('on');
    this.mode = game.mode || this.mode;
    const hasCore = !!game.structures?.core;
    this.hud.classList.toggle('siege', hasCore);
    this.hud.classList.toggle('lane', game.mode === 'lane');
    this.hud.classList.toggle('hunt', game.mode === 'hunt');
    this.hud.classList.toggle('hardcore', !!DIFFICULTIES[game.difficulty]?.hardcore);
    this.hud.classList.remove('core-low');
    this.el.coreAlarm?.classList.remove('on', 'critical');
    this.el.coreThreat?.classList.remove('hot');
    this.el.coreGuard?.classList.remove('on');
    this.el.coreLastLight?.classList.remove('on');
    this.el.objectiveWrap?.classList.remove('on');
    this._laneSig = '';
    this._pipSig = '';
    this._boonSig = '';
    this._relicSig = '';
    this.refreshBoons(game.player);
    this.refreshRelics(game.player);
    this._refreshSoundIcon();
    this.boss = null;
    this.el.bossWrap.classList.remove('on');
    this.el.repairPrompt.classList.remove('on');
    this.updateHud(game);
  }

  /* ---------------- FORGE ---------------- */
  showForge(game) {
    this._showScreen('forge');
    this.hud.classList.remove('on');
    this.refreshForge(game);
  }

  hideForge() {
    document.getElementById('screen-forge')?.classList.remove('active');
    if (this.game.state === 'playing') this.hud.classList.add('on');
  }

  refreshForge(game) {
    const s = game.structures;
    if (!s?.core) return;
    const core = s.core;
    const free = s.pedestals.filter(p => !p.defense).length;
    const shardsEl = document.getElementById('forge-shards');
    if (shardsEl) shardsEl.textContent = game.shards;

    const corePct = Math.max(0, core.hp / core.maxHp) * 100;
    const goal = game.mode === 'lane' ? `shatter ${LANE.goalGates} rift gates` : `survive ${SIEGE.goalWave} waves`;
    const coreEl = document.getElementById('forge-core');
    if (coreEl) {
      coreEl.innerHTML = `
        <div class="forge-core-top"><span>SUNFORGE INTEGRITY</span><b>${Math.ceil(core.hp)} / ${core.maxHp}</b></div>
        <div class="bar core big"><i style="width:${corePct}%"></i></div>
        <div class="forge-core-meta"><span>Goal · ${goal}</span><span>${free} empty ${game.mode === 'lane' ? 'lane pad' : 'pedestal'}${free === 1 ? '' : 's'}</span></div>`;
    }

    const grid = document.getElementById('forge-grid');
    if (grid) {
      grid.innerHTML = Object.values(DEFENSES).map(def => {
        const disabled = game.shards < def.cost || free === 0;
        const de = ELEMENTS[def.element];
        return `<button class="build-card ${disabled ? 'disabled' : ''}" data-build="${def.key}" style="--dc:${def.css}" ${disabled ? 'disabled' : ''}>
          <span class="build-role">${def.role}</span>
          <span class="build-ico">${def.sigil}</span>
          <h3>${def.name}</h3>
          <span class="build-el" style="--ec:${de?.css || '#a9b6d6'}">${de?.sigil || '◈'} ${(de?.name || 'Neutral').toUpperCase()} · ▲ ${strongAgainst(def.element).map(k => ELEMENTS[k].name).join(' / ')}</span>
          <p>${def.desc}</p>
          <div class="build-foot"><span>HP ${def.hp} · DMG ${def.damage}</span><b>◈ ${def.cost}</b></div>
        </button>`;
      }).join('');
    }

    const status = document.getElementById('forge-status');
    if (status) {
      status.innerHTML = s.pedestals.map((ped, i) => {
        const label = ped.label || ('PEDESTAL ' + (i + 1));
        if (!ped.defense) return `<div class="ped-row empty"><span>${label}</span><b>Empty — ready to build</b></div>`;
        const d = ped.defense;
        const pct = Math.max(0, d.hp / d.maxHp) * 100;
        const rank = d.rank || 1;
        const maxRank = d.type.maxRank || 3;
        const cost = d.type.upgradeCost || 2;
        const canUp = rank < maxRank;
        const affordable = canUp && game.shards >= cost;
        return `<div class="ped-row"><span>${label}</span><b>${d.name}<span class="rank-tag">R${rank}</span></b><em>${Math.ceil(d.hp)} / ${d.maxHp}</em>
          <button class="ped-up ${affordable ? '' : 'off'}" data-upgrade="${i}" ${canUp ? '' : 'disabled'}>${canUp ? 'UPGRADE ◈ ' + cost : 'MAX RANK'}</button>
          <i style="width:${pct}%"></i></div>`;
      }).join('');
    }

    const repair = document.getElementById('forge-repair');
    if (repair) {
      const full = core.hp >= core.maxHp;
      repair.disabled = full || game.shards < SIEGE.repairCost;
      repair.textContent = full ? 'Sunforge Whole' : `Repair Sunforge · ◈ ${SIEGE.repairCost}`;
    }
  }

  /* ============================================================
     ELEMENT SELECT
     ============================================================ */
  _renderElemGrid() {
    const grid = document.getElementById('elem-grid');
    grid.innerHTML = Object.values(ELEMENTS).map(el => `
      <button class="elem-card" data-elem="${el.key}" style="--ec:${el.css}">
        <div class="elem-top">
          <span class="sigil-orb">${el.sigil}</span>
          <div class="elem-name-wrap">
            <h3>${el.name}</h3>
            <span class="elem-role">${el.role}</span>
            <div class="elem-tagline">${el.tagline}</div>
          </div>
        </div>
        <p class="elem-blurb">${el.blurb}</p>
        <div class="statbars">
          ${statBar('Power', el.bars.power)}
          ${statBar('Tempo', el.bars.tempo)}
          ${statBar('Control', el.bars.control)}
        </div>
        <div class="elem-passive"><span class="mark">✧</span><span><b>${el.passive.split('—')[0].trim()}</b> — ${el.passive.split('—')[1]?.trim() || ''}</span></div>
      </button>
    `).join('');
    this.selectElement(this.selectedElement);
  }

  _renderWeapons() {
    const row = document.getElementById('weapon-row');
    const el = ELEMENTS[this.selectedElement] || ELEMENTS.ember;
    const list = WEAPONS[el.key] || [];
    const picked = this.game.save?.weapons?.[el.key] || list[0]?.key;
    const title = document.getElementById('weapon-title');
    if (title) title.textContent = el.name + ' weapons';
    if (!row) return;
    row.innerHTML = list.map(w => `
      <button class="weapon-card ${w.key === picked ? 'selected' : ''}" data-weapon="${w.key}" data-welem="${el.key}" style="--wc:${w.css}">
        <span class="weapon-ico">${w.icon}</span>
        <span class="weapon-copy"><em>${w.tagline}</em><b>${w.name}</b><span>${w.desc}</span></span>
      </button>`).join('');
  }

  selectElement(key) {
    this.selectedElement = key;
    document.querySelectorAll('.elem-card').forEach(c => c.classList.toggle('selected', c.dataset.elem === key));
    const el = ELEMENTS[key];
    if (!el) return;
    this._renderWeapons();
    const hint = document.getElementById('select-hint');
    if (hint) {
      const modeHints = {
        siege: 'Protect the Sunforge, raise defenses with shards, and hold for twenty waves. Stand inside the Aegis to hit harder and slow the breach.',
        lane: 'Three lanes feed the core. Tower the lane pads to hold it, then walk out to a Rift Gate and shoot it — towers cannot damage gates, only your fire, surges and ultimates can.',
        trial: 'No core. No defenses. Survive the endless horde and push your best wave.',
        hunt: 'No core and no walls. Four wardens arrive back to back — kill every one before the arena closes.',
        escort: 'The reliquary only moves while you stand beside it and nothing is contesting it. Enemies close to it tear it apart; it halts at five waystones until the ground is clear. Clear the road, then walk it home.',
        ritual: 'Three ember circles ring the arena. Stand inside one to charge it; enemies inside stop the charge and drain it. Seal all three at once before the flame gutters out.',
        blitz: 'Every wave is on a clock. Kills and warden kills add time. Clear twelve waves before the sun sets — there are no breathers.',
        duel: 'Four crowned champions come alone, each far stronger than the last. No escorts, no walls — just the ring and your sigil.',
      };
      const modeHint = modeHints[this.mode] || modeHints.trial;
      hint.innerHTML = `<span class="hint-mode">${modeHint}</span><br><b>${el.name} · ${el.role}</b> — ${el.passive}<br>
        Ultimate: <b>${el.ult.name}</b> · Surge: <b>${el.surge.name}</b>. Fuse with a second sigil at level 3+ to forge a hybrid form.<br>
        <span class="hint-match"><b class="up">▲ Strong vs ${strongAgainst(el.key).map(k => ELEMENTS[k].name).join(' · ')}</b><b class="down">▼ Weak vs ${weakTo(el.key).map(k => ELEMENTS[k].name).join(' · ')}</b></span>`;
    }
  }

  /* ============================================================
     CODEX
     ============================================================ */
  _renderCodex(tab) {
    this._currentTab = tab;
    document.querySelectorAll('#codex-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const body = document.getElementById('codex-body');
    if (!body) return;

    if (tab === 'lore') {
      body.innerHTML = `<div class="codex-lead">${LORE.intro}</div>
        <div class="codex-prose">
          ${LORE.chapters.map(c => `
            <article class="lore-chapter" id="lore-${c.id}">
              <div class="section-label">${c.kicker}</div>
              <h3>${c.title}</h3>
              ${c.paragraphs.map(p => `<p>${p}</p>`).join('')}
            </article>`).join('')}
        </div>`;
    } else if (tab === 'guide') {
      body.innerHTML = `<div class="codex-lead">${GUIDE.intro}</div>
        <div class="codex-prose">
          ${GUIDE.sections.map(s => `
            <article class="guide-section" id="guide-${s.id}">
              <div class="section-label">${s.kicker}</div>
              <h3>${s.title}</h3>
              ${(s.body || []).map(p => `<p>${p}</p>`).join('')}
              ${s.controls ? `<div class="controls-list codex-controls">${this._controlsHtml()}</div>` : ''}
              ${s.note ? `<p class="subnote">${s.note}</p>` : ''}
              ${s.tips ? `<ol class="guide-tips">${s.tips.map(t => `<li>${t}</li>`).join('')}</ol>` : ''}
            </article>`).join('')}
        </div>`;
    } else if (tab === 'elements') {
      body.innerHTML = `<div class="codex-grid">` + Object.values(ELEMENTS).map(el => `
        <article class="codex-card" style="--ec:${el.css}">
          <div class="cc-top">
            <span class="cc-sigil">${el.sigil}</span>
            <div><div class="cc-name">${el.name}</div><div class="cc-role">${el.role}</div></div>
          </div>
          <p>${el.blurb}</p>
          <p style="margin-top:8px;color:${el.css};font-size:10px">${el.passive}</p>
          <div class="cc-match"><span>▲ ${strongAgainst(el.key).map(k => ELEMENTS[k].name).join(' · ')}</span><span>▼ ${weakTo(el.key).map(k => ELEMENTS[k].name).join(' · ')}</span></div>
          <div class="cc-meta"><span>Surge · ${el.surge.name}</span><b>${el.ult.name}</b></div>
        </article>
      `).join('') + `</div>`;
    } else if (tab === 'fusions') {
      body.innerHTML = `
        <div class="section-label">The five forged forms</div>
        <div class="fusion-table">
          ${Object.values(FUSIONS).map(f => {
            const a = ELEMENTS[f.pair[0]], b = ELEMENTS[f.pair[1]];
            return `<div class="fusion-row" style="--ec:${f.css}">
              <div class="f-el" style="--ec:${a.css}"><span class="s">${a.sigil}</span>${a.name}</div>
              <span class="f-plus">+</span>
              <div class="f-el" style="--ec:${b.css}"><span class="s">${b.sigil}</span>${b.name}</div>
              <span class="f-plus">→</span>
              <div class="f-res"><span class="s">${f.sigil}</span>${f.name}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="section-label">What each form becomes</div>
        <div class="codex-grid">
          ${Object.values(FUSIONS).map(f => `
            <article class="codex-card" style="--ec:${f.css}">
              <div class="cc-top">
                <span class="cc-sigil">${f.sigil}</span>
                <div><div class="cc-name">${f.name}</div><div class="cc-role">${f.role}</div></div>
              </div>
              <p>${f.blurb}</p>
              <p style="margin-top:8px;color:${f.css};font-size:10px">${f.passive}</p>
              <div class="cc-meta"><span>${f.tagline}</span><b>${f.ult.name}</b></div>
            </article>
          `).join('')}
        </div>`;
    } else if (tab === 'relics') {
      const seen = Object.values(this.save.codex?.relics || {}).filter(v => v?.seen).length;
      body.innerHTML = `
        <div class="codex-lead"><b>${seen} / ${RELICS.length}</b> relics discovered. Elites offer signets and talismans; wardens and Sunless Vaults can offer crowns.</div>
        ${['signet', 'talisman', 'crown'].map(slot => {
          const items = RELICS.filter(r => r.slot === slot);
          return `<div class="section-label">${RELIC_SLOTS[slot].name}s</div>
            <div class="codex-grid relic-codex-grid">
              ${items.map(r => {
                const entry = this.save.codex?.relics?.[r.id];
                const seenThis = !!entry?.seen;
                const css = seenThis ? RARITY[r.rarity].css : '#565a6b';
                return `<article class="codex-card relic-codex-card ${seenThis ? '' : 'locked'}" style="--ec:${css}">
                  <div class="cc-top">
                    <span class="cc-sigil">${seenThis ? r.icon : '?'}</span>
                    <div><div class="cc-name">${seenThis ? r.name : 'Undiscovered'}</div><div class="cc-role">${RELIC_SLOTS[slot].name}${r.element ? ' · ' + ELEMENTS[r.element].name : ''}</div></div>
                  </div>
                  <p>${seenThis ? r.desc : 'Not offered yet. Slay elites, wardens or a vault guardian to find it.'}</p>
                  <div class="cc-meta"><span>${seenThis ? RARITY[r.rarity].name : 'UNSEEN'}</span><b>${seenThis ? 'BEST RANK ' + (entry.bestRank || 1) : 'LOCKED'}</b></div>
                </article>`;
              }).join('')}
            </div>`;
        }).join('')}
      `;
    } else if (tab === 'dawn') {
      const earned = ACHIEVEMENTS.filter(a => this.save.achievements?.[a.id]).length;
      const marks = this.save.marks || 0;
      body.innerHTML = `
        <div class="dawn-banner">
          <div><div class="eyebrow">The account remembers</div><h3>Dawn Codex</h3><p>Every sigil and every run pays into one dawn. Spend sunmarks on permanent rewards.</p></div>
          <div class="dawn-bank"><span>SUNMARKS</span><b>${marks}</b><small>${earned} / ${ACHIEVEMENTS.length} achievements</small></div>
        </div>
        <div class="section-label">Rewards</div>
        <div class="dawn-reward-grid">
          ${REWARDS.map(r => {
            const owned = !!this.save.rewards?.[r.id];
            const affordable = marks >= r.cost;
            return `<button class="dawn-reward ${owned ? 'owned' : ''}" data-reward="${r.id}" ${owned || !affordable ? 'disabled' : ''}>
              <span class="dawn-icon">${r.icon}</span>
              <span class="dawn-reward-copy"><b>${r.name}</b><small>${r.desc}</small></span>
              <em>${owned ? 'UNLOCKED' : '◈ ' + r.cost}</em>
            </button>`;
          }).join('')}
        </div>
        <div class="section-label">Achievements</div>
        <div class="dawn-ach-grid">
          ${ACHIEVEMENTS.map(a => {
            const done = !!this.save.achievements?.[a.id];
            return `<article class="dawn-ach ${done ? 'earned' : ''}">
              <span class="dawn-check">${done ? '✓' : '○'}</span>
              <span class="dawn-ach-copy"><b>${a.name}</b><small>${a.desc}</small></span>
              <em>+${a.points}</em>
            </article>`;
          }).join('')}
        </div>
      `;
    } else if (tab === 'bestiary') {
      body.innerHTML = `
        <div class="section-label">The horde</div>
        <div class="bestiary">
          ${Object.values(ENEMIES).filter(e => !e.boss).map(e => `
            <article class="beast-card" style="--ec:${e.css}">
              <div class="beast-orb">${e.key === 'crawler' ? '▲' : e.key === 'wisp' ? '◇' : e.key === 'brute' ? '⬢' : '◉'}</div>
              <div>
                <h4>${e.name}</h4>
                <p>${e.desc}</p>
                <div class="beast-stats"><span>HP <b>${e.hp}</b></span><span>DMG <b>${e.damage}</b></span><span>ESSENCE <b>${e.xp}</b></span></div>
              </div>
            </article>
          `).join('')}
        </div>
        <div class="section-label">Wardens — every fifth wave</div>
        <div class="codex-grid">
          ${BOSSES.map((b, i) => `
            <article class="codex-card" style="--ec:${b.css}">
              <div class="cc-top">
                <span class="cc-sigil">${['◉', '⨂', '✵', '☀'][i] || '◉'}</span>
                <div><div class="cc-name">${b.name}</div><div class="cc-role">Warden · ${b.title}</div></div>
              </div>
              <p>Volleys of riftfire, a telegraphed charge, and reinforcements from the dark. Kill it before the arena fills.</p>
              <div class="cc-meta"><span>Appears · wave ${(i + 1) * 5}</span><b>${i === 3 ? 'Final' : 'Boss'}</b></div>
            </article>
          `).join('')}
        </div>`;
    } else if (tab === 'boons') {
      body.innerHTML = `
        <div class="section-label">Draftable boons</div>
        <div class="codex-grid">
          ${BOONS.map(b => `
            <article class="codex-card" style="--ec:${RARITY[b.rarity].css}">
              <div class="cc-top">
                <span class="cc-sigil">${b.icon}</span>
                <div><div class="cc-name">${b.name}</div><div class="cc-role">${RARITY[b.rarity].name} · max ${b.max}</div></div>
              </div>
              <p>${b.desc}</p>
            </article>
          `).join('')}
        </div>`;
    } else if (tab === 'missions') {
      const dm = this.game.descentMeta();
      body.innerHTML = `
        <div class="section-label">The Descent</div>
        <div class="codex-grid">
          <article class="codex-card" style="--ec:#ffb066">
            <div class="cc-top"><span class="cc-sigil">▼</span><div><div class="cc-name">Descent ${dm.rank}</div><div class="cc-role">Risk &amp; reward</div></div></div>
            <p>Every mission you complete carries you one rank deeper, up to ${DESCENT.max}. The horde gains <b>+${Math.round(DESCENT.hp * 100)}% health</b> and <b>+${Math.round(DESCENT.damage * 100)}% damage</b> per rank — and every sunmark you earn is multiplied by <b>+${Math.round(DESCENT.markStep * 100)}%</b> per rank. The results screen shows the multiplier you were paid, and you can step back down from there or from this screen.</p>
            <div class="cc-meta"><span>THIS RANK · HP +${Math.round((dm.hp - 1) * 100)}% · DMG +${Math.round((dm.damage - 1) * 100)}%</span><b>MARKS ×${dm.marks.toFixed(2)}</b></div>
          </article>
        </div>
        <div class="section-label">Difficulties</div>
        <div class="codex-grid">
          ${DIFFICULTY_ORDER.map(key => {
            const d = DIFFICULTIES[key];
            const unlocked = difficultyUnlocked(key, this.save);
            return `<article class="codex-card" style="--ec:${d.css}">
              <div class="cc-top"><span class="cc-sigil">${d.icon}</span><div><div class="cc-name">${d.name}</div><div class="cc-role">${d.short}${unlocked ? '' : ' · LOCKED'}</div></div></div>
              <p>${d.desc}</p>
              <p style="margin-top:8px;color:${d.css};font-size:10px">${d.tagline}</p>
              <div class="cc-meta"><span>HP ×${d.enemyHp.toFixed(2)} · DMG ×${d.enemyDamage.toFixed(2)} · SHARDS ×${d.shardMult.toFixed(2)}</span><b>MARKS ×${d.markMult.toFixed(2)}</b></div>
              <div class="cc-meta"><span>OBJECTIVE · CLOCK ×${(d.objective?.blitzTime ?? 1).toFixed(2)} · CIRCLES ×${(d.objective?.ritualCharge ?? 1).toFixed(2)} · CARAVAN ×${(d.objective?.escortSpeed ?? 1).toFixed(2)}</span></div>
            </article>`;
          }).join('')}
        </div>
        <div class="section-label">Hardcore rules</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          <b>Hardcore</b> is one life with no mending: the Second Wind boon is never offered and any revive is stripped, and the Forge refuses to repair the Sunforge.
          Field repairs with <b>E</b> run at 70% speed, every felled warden restores <b>10% core integrity</b>, and the Sunforge makes one <b>Last Stand</b>:
          at 25% integrity (or on a killing blow) it restores <b>18%</b> and is sheltered for <b>5 seconds</b>. In exchange every run pays <b>double sunmarks</b>,
          starts with two extra shards, grants two boon rerolls and a fourth relic choice, and records are tracked separately for each tier.
          Win any run to unlock Hardcore; win a run or reach wave 10 to unlock Umbral.
        </p>
        <div class="section-label">Mission styles</div>
        <div class="mission-grid">
          ${Object.values(MODES).map(m => `
            <article class="mission-card" style="--mc:${m.css}">
              <div class="mission-top"><span class="mission-ico">${m.sigil}</span><div><div class="cc-name">${m.name}</div><div class="cc-role">${m.kicker}</div></div></div>
              <p>${m.desc}</p>
              <div class="cc-meta"><span>${m.tagline}</span><b>${m.goal}</b></div>
            </article>`).join('')}
        </div>
        <div class="section-label">Level bonuses</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          From wave 2 onward, a wave can arrive <b>blessed</b>. The bonus is rolled before the wave is built, so its price and its gift are both real.
          Boss waves never carry one. The active bonus is shown in the wave pill and announced as the wave begins.
        </p>
        <div class="codex-grid">
          ${WAVE_BONUSES.map(b => `
            <article class="codex-card" style="--ec:${b.css}">
              <div class="cc-top"><span class="cc-sigil">${b.icon}</span><div><div class="cc-name">${b.name}</div><div class="cc-role">Level bonus</div></div></div>
              <p>${b.desc}</p>
            </article>`).join('')}
        </div>
        <div class="section-label">Skill runs</div>
        <div class="codex-grid">
          <article class="codex-card" style="--ec:${SKILL_RUN.css}">
            <div class="cc-top"><span class="cc-sigil">${SKILL_RUN.icon}</span><div><div class="cc-name">${SKILL_RUN.name}</div><div class="cc-role">Run style</div></div></div>
            <p>${SKILL_RUN.desc}</p>
            <div class="cc-meta"><span>No boons · no relics</span><b>MARKS ×${SKILL_RUN.markMult.toFixed(2)}</b></div>
          </article>
        </div>
        <div class="section-label">The new missions</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          <b>Solar Caravan</b> — the reliquary only advances while you are within ${ESCORT.escortRadius} units and no enemy is within ${ESCORT.contestedRadius} of it.
          It has ${ESCORT.hp} integrity, takes escalating damage from every enemy crowding it, and bleeds ${ESCORT.decay} integrity per second while you are away. Clear the road, then walk it the last stretch.<br><br>
          <b>Ember Ritual</b> — stand inside a circle for ${RITUAL.chargeTime}s to seal it (longer on harder tiers). Enemies inside contest it and drain the charge; an unattended circle bleeds ${Math.round(RITUAL.decay * 100)}% per second.
          Sealed circles stay sealed. Seal all ${RITUAL.shrineCount} and the ritual is complete.<br><br>
          <b>Eclipse Blitz</b> — horde waves start with ${BLITZ.waveTime}s on the clock (shorter on harder tiers). Warden waves get their own sunset, scaled to the warden's health. Kills add ${BLITZ.killBonus}s and a felled warden adds ${BLITZ.bossBonus}s.
          Clear ${BLITZ.goalWave} waves before the timer empties. Boss waves still arrive every fifth wave.<br><br>
          <b>Warden Duel</b> — four champions, no escorts, no structures. Each one has ${DUEL.bossHpMult.toFixed(1)}× a normal warden's health and grows tougher each round.
          Everything you learned about spacing, dashes and surge timing has to carry the run alone.
        </p>
        <div class="section-label">The Sunforge Siege</div>
        <div class="siege-brief">
          <div class="siege-goal"><span>OBJECTIVE</span><b>Survive ${SIEGE.goalWave} waves</b><p>Wave 20 is the last warden. If the Sunforge falls, the run ends immediately.</p></div>
          <div class="siege-goal"><span>ECONOMY</span><b>Sun shards</b><p>Clear waves, fell wardens, and call waves early to earn shards. Spend them in the Forge — open it any time with B.</p></div>
          <div class="siege-goal"><span>REPAIR</span><b>Hold E</b><p>Stand near the Sunforge or a damaged defense and hold E to mend it. Free, but it takes time and leaves you exposed.</p></div>
        </div>
        <div class="section-label">The Sunforge Aegis</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          Guarding the core is a strategy, not a punishment. Stand inside the Aegis ring and you deal <b>+30% damage</b> to anything breaching the Sunforge,
          take <b>25% less damage</b>, and the breach is <b>slowed 32%</b>. Clear a wave with the core above <b>${Math.round(SIEGE.holdPct * 100)}%</b> and the Forge pays an extra shard.
          The core also knits itself back together if nothing has struck it for ${SIEGE.coreRegenDelay} seconds, and it lashes out at anything within ${SIEGE.coreZapRadius} units every ${SIEGE.coreZapInterval}s.
          Below <b>${Math.round(SIEGE.lastLightPct * 100)}%</b> integrity it enters <b>Last Light</b>: holding the Aegis then grants <b>+${Math.round(SIEGE.lastLightDamage * 100)}% damage</b> and rapid ultimate charge.
        </p>
        <div class="section-label">The lanes</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          <b>Sunfall Lanes</b> runs three radial lanes out of the Sunforge. Each lane has two tower pads and ends at a <b>Rift Gate</b> (${LANE.gateHp} HP base, tougher on harder tiers)
          that pours minions down the lane every wave. Your own fire, surges and ultimates damage gates, so the push is you. A broken gate stops its lane's reinforcements for good and grants <b>Rift Siphon</b>: +${Math.round(LANE.siphon * 100)}% damage for the rest of the run.
          Break all three and the mission is won. Enemies still reach the core if a lane is undefended, so tower the pads and fall back to the Aegis when the breach alarm sounds.
        </p>
        <div class="section-label">Tower ranks</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          Every defense can be upgraded twice in the Forge — each rank adds <b>40% health</b>, <b>35% damage</b> and a little range for a handful of shards.
          A rank 3 lance or Gravemaw holds a lane on its own; upgrade the outer pad first and keep it repaired with <b>E</b>.
        </p>
        <div class="section-label">The core and its defenses</div>
        <div class="codex-grid">
          <article class="codex-card" style="--ec:#f5c26b">
            <div class="cc-top"><span class="cc-sigil">☀</span><div><div class="cc-name">Sunforge</div><div class="cc-role">The objective</div></div></div>
            <p>Nine hundred years of light, held in one cracked crystal. Enemies that reach it tear it apart. Hold <b>E</b> nearby to repair; the Forge can mend it faster for shards.</p>
            <div class="cc-meta"><span>Integrity · ${SIEGE.coreHp}</span><b>Protect at all costs</b></div>
          </article>
          ${Object.values(DEFENSES).map(d => `
            <article class="codex-card" style="--ec:${d.css}">
              <div class="cc-top"><span class="cc-sigil">${d.sigil}</span><div><div class="cc-name">${d.name}</div><div class="cc-role">${d.role} · ◈ ${d.cost}</div></div></div>
              <p>${d.desc}</p>
              <div class="cc-meta"><span>HP ${d.hp} · DMG ${d.damage}</span><b>Forge build · ${d.maxRank || 3} ranks</b></div>
            </article>`).join('')}
        </div>
        <div class="section-label">How the horde thinks</div>
        <p class="subnote" style="font-size:10.5px;line-height:1.8">
          Every creature in the Siege marches on the <b>nearest structure</b> — stand in its path to body-block it before it reaches the core.
          The boss turns its charge and volleys on your buildings, but it will lash out at you if you block it. A destroyed defense frees its pedestal for a rebuild.
        </p>`;
    } else {
      body.innerHTML = `
        <div class="codex-grid" style="grid-template-columns:1.15fr .85fr">
          <div>
            <div class="section-label">Controls</div>
            <div class="controls-list" style="grid-template-columns:1fr">
              ${this._controlsHtml()}
            </div>
          </div>
          <div>
            <div class="section-label">Survive</div>
            <p class="subnote" style="font-size:10.5px;line-height:1.8">
              <b>Skill runs</b> close boon drafts and relic offers for the whole run. Each level grants flat Mastery (+6% damage, +4% tempo, +8 health)
              and the dawn pays 60% more sunmarks. Choose the style on the mission select screen.<br><br>
              <b>Chain kills</b> to raise your essence multiplier — up to ×4. The chain decays in three seconds.<br><br>
              <b>The first wave starts itself</b>: the arena opens empty and wave 1 walks in after three seconds — press Enter (or Begin now) to start it early.<br><br>
              <b>Call the next wave early</b> during the breather for bonus essence. Risky. Rewarding.<br><br>
              <b>Fuse at level 3+</b>: take an Attune card to combine your sigil with a second element. Your attack, passive and ultimate all become the hybrid.<br><br>
              <b>Ultimate charge</b> builds from kills and damage. At 100%, press ${keyLabel(this.game.keyFor('ult'))} to reshape the arena.
            </p>
          </div>
        </div>`;
    }
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  /* ---------------- SAVE PORTABILITY ---------------- */
  _saveJson() {
    return saveText(this.game.save);
  }

  async _copySave() {
    const text = this._saveJson();
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) {
      ok = false;
    }
    if (!ok) {
      // older browsers and non-secure origins refuse the async clipboard
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
    }
    if (ok) { this.audio.ui(); this.toast('SAVE COPIED · ' + Math.round(text.length / 1024) + ' KB', '#8fe6a0'); }
    else { this.audio.error(); this.toast('COPY BLOCKED · USE DOWNLOAD', '#ff8a52'); }
  }

  _downloadSave() {
    const blob = new Blob([this._saveJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const stamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'helios-elements-save-' + stamp + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    this.audio.ui();
    this.toast('SAVE DOWNLOADED', '#8fe6a0');
  }

  async _readSaveFile(file) {
    let text = '';
    try { text = await file.text(); } catch (e) { text = ''; }
    this._importText(text);
  }

  _importText(text) {
    const msg = document.getElementById('save-import-msg');
    try {
      const next = importSave(text);
      if (msg) msg.textContent = 'Imported ' + (next.runs || 0) + ' runs · ' + (next.marks || 0) + ' sunmarks. Reloading…';
      this.audio.ui();
      this.toast('SAVE IMPORTED · RELOADING', '#8fe6a0');
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      if (msg) msg.textContent = 'That did not parse as a Helios save. Nothing was changed.';
      this.audio.error();
      this.toast('IMPORT FAILED · NOT A HELIOS SAVE', '#ff8a52');
    }
  }

  _renderSettings() {
    const body = document.getElementById('settings-body');
    if (!body) return;
    const s = this.game.save.settings;
    const depth = menuDepth(this.game.save);
    const pct = (v) => Math.round(v * 100);
    body.innerHTML = `
      <div class="settings-subhead">Audio</div>
      <div class="settings-row">
        <div class="label"><b>Master volume</b><span>All game audio</span></div>
        <input type="range" min="0" max="100" value="${pct(s.master)}" data-setting="master" style="--fill:${pct(s.master)}%">
        <span class="range-val">${pct(s.master)}%</span>
      </div>
      <div class="settings-row">
        <div class="label"><b>Music</b><span>Generative solar ambience</span></div>
        <input type="range" min="0" max="100" value="${pct(s.music)}" data-setting="music" style="--fill:${pct(s.music)}%">
        <span class="range-val">${pct(s.music)}%</span>
      </div>
      <div class="settings-row">
        <div class="label"><b>Effects</b><span>Casts, impacts, UI</span></div>
        <input type="range" min="0" max="100" value="${pct(s.sfx)}" data-setting="sfx" style="--fill:${pct(s.sfx)}%">
        <span class="range-val">${pct(s.sfx)}%</span>
      </div>
      <div class="settings-row">
        <div class="label"><b>Music enabled</b><span>Turn the ambient score on or off</span></div>
        <button class="toggle ${s.musicOn ? 'on' : ''}" data-toggle="musicOn" aria-label="Toggle music"></button>
      </div>
      <div class="settings-row">
        <div class="label"><b>Music theme</b><span>${s.musicTheme === 'auto' || !s.musicTheme ? 'Follows the arena you enter, coloured by your sigil' : 'A fixed score for every arena'}</span></div>
        <div class="seg theme-seg">
          ${['auto', 'menu', ...Object.keys(ELEMENTS)].map(k => `<button class="${(s.musicTheme || 'auto') === k ? 'on' : ''}" data-music="${k}">${k === 'auto' ? 'Auto' : k === 'menu' ? 'Sanctum' : (ELEMENTS[k]?.name || k)}</button>`).join('')}
        </div>
      </div>
      <div class="settings-subhead">Interface</div>
      <div class="settings-row depth-row">
        <div class="label"><b>Menus</b><span>${depth.desc}</span></div>
        <div class="seg depth-seg">
          ${MENU_DEPTH_ORDER.map(k => `<button class="${k === depth.key ? 'on' : ''}" data-menus="${k}">${MENU_DEPTHS[k].name}</button>`).join('')}
        </div>
      </div>
      <div class="settings-row">
        <div class="label"><b>Damage numbers</b><span>Floating combat readouts</span></div>
        <button class="toggle ${s.numbers ? 'on' : ''}" data-toggle="numbers" aria-label="Toggle damage numbers"></button>
      </div>
      <div class="settings-row">
        <div class="label"><b>Store level-ups</b><span>Keep fighting; open boon drafts when you are ready</span></div>
        <button class="toggle ${s.storeLevels ? 'on' : ''}" data-toggle="storeLevels" aria-label="Toggle stored level-ups"></button>
      </div>
      <div class="settings-row">
        <div class="label"><b>Screen shake</b><span>Camera impact feedback</span></div>
        <button class="toggle ${s.shake > 0 ? 'on' : ''}" data-toggle="shake" aria-label="Toggle screen shake"></button>
      </div>
      <div class="settings-row">
        <div class="label"><b>Render quality</b><span>Lower for smoother play on older machines</span></div>
        <div class="seg">
          ${['low', 'medium', 'high'].map(q => `<button class="${s.quality === q ? 'on' : ''}" data-quality="${q}">${q}</button>`).join('')}
        </div>
      </div>

      <div class="settings-subhead">Controls</div>
      <p class="settings-note">Click a key, then press the key you want. Esc cancels. A key already in use is released from its old action.</p>
      <div class="keybind-grid">
        ${CONTROL_ACTIONS.map(a => `<div class="keybind-row"><span>${a.name}</span><button class="keybind-btn ${this._capturing === a.key ? 'listening' : ''}" data-bind="${a.key}">${this._capturing === a.key ? 'PRESS…' : keyLabel(this.game.keyFor(a.key))}</button></div>`).join('')}
      </div>
      <div class="settings-row">
        <div class="label"><b>Reset controls</b><span>Return every key to its default</span></div>
        <button class="btn small" data-act="reset-keys">Reset keys</button>
      </div>

      <div class="settings-subhead">Save</div>
      <p class="settings-note">Progress lives in this browser only. Export a copy before clearing site data, or import one to restore it or move to another machine.</p>
      <div class="settings-row">
        <div class="label"><b>Export progress</b><span>Copy the save text, or download a save file</span></div>
        <div class="seg"><button data-act="save-copy">Copy</button><button data-act="save-download">Download</button></div>
      </div>
      <div class="settings-row">
        <div class="label"><b>Import progress</b><span>Paste a save string, or load a save file</span></div>
        <div class="seg"><button data-act="save-import-toggle">Paste</button><button data-act="save-file">Choose file</button></div>
      </div>
      <div class="save-import" id="save-import" hidden>
        <textarea id="save-import-text" spellcheck="false" placeholder="Paste a Helios Elements save here…"></textarea>
        <div class="save-import-foot">
          <span class="settings-note" id="save-import-msg">Importing replaces the progress in this browser.</span>
          <button class="btn small" data-act="save-import-run">Import save</button>
        </div>
      </div>
      <input type="file" id="save-file-input" accept="application/json,.json,.txt" hidden>

      <div class="settings-subhead">Story</div>
      <div class="settings-row">
        <div class="label"><b>Prologue & credits</b><span>Replay the opening, or read why this game exists</span></div>
        <div class="seg">
          <button data-act="replay-intro">Intro</button>
          <button data-act="credits">Credits</button>
        </div>
      </div>
    `;
  }

  /* ============================================================
     HUD
     ============================================================ */
  updateHud(game) {
    const p = game.player;
    if (!p) return;
    if (!this._forgeKeyEl) this._forgeKeyEl = document.querySelector('.forge-key');
    if (this._forgeKeyEl) {
      const fk = keyLabel(game.keyFor('forge'));
      if (this._forgeKeyEl.textContent !== fk) this._forgeKeyEl.textContent = fk;
    }
    const form = p.form;

    const hasCore = !!game.structures?.core;
    const lane = game.mode === 'lane' && !!game.structures;
    const diff = DIFFICULTIES[game.difficulty] || DIFFICULTIES.solar;
    this.hud.classList.toggle('siege', hasCore);
    this.hud.classList.toggle('lane', lane);
    this.hud.classList.toggle('hunt', game.mode === 'hunt');
    this.hud.classList.toggle('hardcore', !!diff.hardcore);
    if (hasCore) {
      const core = game.structures.core;
      if (core) {
        const corePct = Math.max(0, core.hp / core.maxHp) * 100;
        this.el.coreFill.style.width = corePct + '%';
        this.el.coreNum.textContent = Math.max(0, Math.ceil(core.hp)) + ' / ' + Math.round(core.maxHp);
        if (this.el.corePct) this.el.corePct.textContent = Math.round(corePct) + '%';
        this.el.coreBar.classList.toggle('low', corePct < 30);
        this.hud.classList.toggle('core-low', corePct < 30);
        const threat = game.coreThreat || 0;
        if (this.el.coreThreat) {
          this.el.coreThreat.textContent = threat > 0 ? 'BREACH ×' + threat : '';
          this.el.coreThreat.classList.toggle('hot', threat > 0);
        }
        if (this.el.coreGuard) this.el.coreGuard.classList.toggle('on', !!game.coreGuard);
        if (this.el.coreLastLight) this.el.coreLastLight.classList.toggle('on', !!game.coreLastLight);
        if (this.el.coreAlarm) {
          this.el.coreAlarm.classList.toggle('on', threat > 0 && (corePct < 65 || threat >= 4));
          this.el.coreAlarm.classList.toggle('critical', corePct < 30);
        }
        if (lane && this.el.laneStrip) {
          const lanes = game.structures.lanes || [];
          const counts = lanes.map(l => {
            const cx = Math.cos(l.angle), sz = Math.sin(l.angle);
            let n = 0;
            for (const e of game.enemies.list) {
              if (e.dead) continue;
              const lateral = Math.abs(e.pos.x * -sz + e.pos.z * cx);
              const along = e.pos.x * cx + e.pos.z * sz;
              if (lateral < 6 && along > 2) n++;
            }
            return n;
          });
          const sig = lanes.map((l, i) => (l.gate.alive ? Math.ceil(l.gate.hp / l.gate.maxHp * 20) : 'x') + ':' + counts[i]).join('|');
          if (sig !== this._laneSig) {
            this._laneSig = sig;
            this.el.laneStrip.innerHTML = '<div class="lane-strip-head">RIFT GATES · ONLY YOUR FIRE BREAKS THEM</div>' + lanes.map((l, i) => {
              const g = l.gate;
              const pct = g.alive ? Math.max(0, g.hp / g.maxHp) * 100 : 0;
              const state = g.alive
                ? (counts[i] ? `<b class="lane-hot">⚔${counts[i]}</b> ` : '') + Math.ceil(pct) + '%'
                : 'BROKEN';
              return `<div class="lane-chip ${g.alive ? '' : 'broken'}" style="--lc:${l.css}">
                <span class="lane-name">${l.short}</span>
                <i class="lane-bar"><b style="width:${pct}%"></b></i>
                <span class="lane-state">${state}</span>
              </div>`;
            }).join('');
          }
        }
        const pipSig = game.structures.pedestals.map(ped => ped.defense ? (ped.defense.rank || 1) + ':' + Math.max(1, Math.ceil(ped.defense.hp / ped.defense.maxHp * 4)) : '0').join('');
        if (pipSig !== this._pipSig) {
          this._pipSig = pipSig;
          this.el.defPips.innerHTML = game.structures.pedestals.map(ped => {
            if (!ped.defense) return `<span class="empty" title="Empty pedestal"></span>`;
            const ratio = ped.defense.hp / ped.defense.maxHp;
            const cls = ratio < 0.4 ? 'hurt' : 'on';
            return `<span class="${cls}" title="${ped.defense.name} · rank ${ped.defense.rank || 1} — ${Math.ceil(ped.defense.hp)} / ${ped.defense.maxHp}"></span>`;
          }).join('');
        }
      }
      this.el.shardCount.textContent = game.shards;
      const canForge = (game.phase === 'intermission' || game.phase === 'ready') && game.state === 'playing';
      this.el.forgeBtn.disabled = !canForge;
      this.el.forgeBtn.classList.toggle('ready', canForge);
    }

    if (this.el.weaponChip) {
      const p = game.player;
      const wp = p?.form?.weapon;
      const on = game.state === 'playing' && !!wp;
      this.el.weaponChip.classList.toggle('on', on);
      if (on) {
        this.el.weaponName.textContent = wp.name.toUpperCase();
        this.el.weaponRank.textContent = 'R' + (p.weaponRank || 1);
        const rarity = p.weaponRarity || 'common';
        this.el.weaponRarity.textContent = rarity.toUpperCase();
        this.el.weaponRarity.style.color = RARITY[rarity]?.css || '#a9b6d6';
        const parts = [wp.name + ' — rank ' + (p.weaponRank || 1) + ' · ' + rarity];
        let slots = '';
        const side = p.sideForm?.weapon;
        if (side) {
          slots += `<span class="wslot" title="${side.name} — second arm, rank ${p.sideWeaponRank}"><i>${side.icon}</i><span>${side.name.split(' ')[0].toUpperCase()}</span><b>R${p.sideWeaponRank}</b></span>`;
          parts.push('second arm: ' + side.name + ' · rank ' + p.sideWeaponRank);
        }
        const ward = p.ward ? WARDS[p.ward.key] : null;
        if (ward) {
          slots += `<span class="wslot ward" style="--wc:${ward.css}" title="${ward.name} — defence, rank ${p.ward.rank}"><i>${ward.icon}</i><span>${ward.name.split(' ')[0].toUpperCase()}</span><b>R${p.ward.rank}</b></span>`;
          parts.push('defence: ' + ward.name + ' · rank ' + p.ward.rank);
        }
        if (this.el.weaponSlots) this.el.weaponSlots.innerHTML = slots;
        this.el.weaponChip.title = parts.join(' · ');
      }
    }

    if (this.el.kindleChip) {
      this.el.kindleChip.classList.toggle('on', game.state === 'playing');
      this.el.kindleCount.textContent = `${game.kindling || 0}/${KINDLING.need}`;
      this.el.kindleFill.style.width = Math.round(Math.min(1, (game.kindling || 0) / KINDLING.need) * 100) + '%';
      this.el.kindleChip.classList.toggle('surge', (game.giftT || 0) > 0);
    }

    if (game.repairTarget) {
      this.el.repairPrompt.classList.add('on');
      this.el.repairName.textContent = game.repairTarget.name.toUpperCase();
      this.el.repairFill.style.width = Math.max(0, game.repairTarget.hp / game.repairTarget.maxHp * 100) + '%';
    } else {
      this.el.repairPrompt.classList.remove('on');
    }

    this.el.sigil.textContent = form.sigil;
    this.el.form.textContent = form.name;
    this.el.role.textContent = form.role;
    document.getElementById('hud-vitals').style.setProperty('--ec', form.css);
    this.el.level.textContent = 'LV ' + game.level;

    const hpPct = Math.max(0, p.stats.hp / p.stats.maxHp) * 100;
    this.el.hpFill.style.width = hpPct + '%';
    this.el.hpText.textContent = Math.max(0, Math.ceil(p.stats.hp)) + ' / ' + Math.round(p.stats.maxHp);
    this.el.hpBar.classList.toggle('low', hpPct < 30);
    const shPct = p.stats.maxShield > 0 ? Math.max(0, p.stats.shield / p.stats.maxShield) * 100 : 0;
    this.el.shieldFill.style.width = Math.min(100, shPct) + '%';

    if (game.mode === 'siege') this.el.wave.textContent = game.wave + ' / ' + SIEGE.goalWave;
    else if (game.mode === 'hunt') this.el.wave.textContent = game.wave + ' / ' + HUNT.goalWave;
    else if (game.mode === 'blitz') this.el.wave.textContent = Math.min(game.wave, BLITZ.goalWave) + ' / ' + BLITZ.goalWave;
    else if (game.mode === 'duel') this.el.wave.textContent = Math.min(game.wave, DUEL.goalWave) + ' / ' + DUEL.goalWave;
    else this.el.wave.textContent = game.wave;
    if (this.el.best) {
      const showBest = game.mode === 'trial';
      const best = Math.max(game.save?.bestTrial || 0, this.save?.bestTrial || 0);
      this.el.best.textContent = showBest ? 'BEST ' + best : '';
      this.el.best.classList.toggle('on', showBest);
    }
    let phase = 'PREPARE';
    if (game.phase === 'active') {
      const left = game.spawnQueue.length + (game.activeEnemyCount ? game.activeEnemyCount() : game.enemies.count());
      phase = game.wavePlan?.isBoss ? 'WARDEN' : left + ' HOSTILES';
      if (lane && game.structures) {
        const gates = game.structures.lanes.filter(l => l.gate.alive).length;
        phase = gates + ' GATES · ' + left + ' HOSTILES';
      }
    } else if (game.phase === 'ready') {
      phase = 'STARTS IN ' + Math.max(0, Math.ceil(game.readyTimer ?? 0)) + ' · ENTER TO BEGIN NOW';
    } else if (game.phase === 'intermission') {
      const secs = Math.max(0, game.interTimer || 0);
      phase = secs > 0.15 ? 'NEXT WAVE ' + Math.ceil(secs) : 'BREATHE';
    }
    this.el.phase.textContent = phase;
    this.el.phase.classList.toggle('hot', game.phase === 'active' || (game.phase === 'intermission' && (game.interTimer || 0) <= 3));
    if (this.el.diffTag) {
      const showDiff = diff.key !== 'solar';
      this.el.diffTag.textContent = showDiff ? diff.icon + ' ' + diff.name.toUpperCase() : '';
      this.el.diffTag.className = 'diff-badge' + (showDiff ? ' on' : '') + (diff.hardcore ? ' hardcore' : '');
      this.el.diffTag.style.color = diff.css;
    }
    if (this.el.descentTag) {
      const rank = game.save?.descent || 0;
      this.el.descentTag.textContent = rank ? 'DESCENT ' + rank : '';
      this.el.descentTag.className = 'diff-badge descent' + (rank ? ' on' : '');
    }
    const pacts = game.pacts || {};
    const pactCount = pactRanks(pacts);
    if (this.el.pactTag) {
      this.el.pactTag.textContent = pactCount ? 'PACT ×' + pactReward(pacts).toFixed(2) : '';
      this.el.pactTag.classList.toggle('on', pactCount > 0);
    }
    if (this.el.bonusTag) {
      const b = game.phase === 'active' ? game.waveBonus : null;
      this.el.bonusTag.textContent = b ? b.icon + ' ' + b.name.toUpperCase() : '';
      this.el.bonusTag.classList.toggle('on', !!b);
      this.el.bonusTag.style.color = b?.css || '';
      this.el.bonusTag.style.borderColor = b ? b.css + '55' : '';
    }
    if (this.el.skillTag) {
      this.el.skillTag.textContent = game.skillRun ? SKILL_RUN.icon + ' SKILL RUN' : '';
      this.el.skillTag.classList.toggle('on', !!game.skillRun);
    }

    const objectiveMode = ['escort', 'ritual', 'blitz', 'duel'].includes(game.mode);
    if (this.el.objectiveWrap) {
      this.el.objectiveWrap.classList.toggle('on', objectiveMode);
      if (objectiveMode) {
        let label = 'OBJECTIVE', value = '', note = '', pct = 0, color = '#ffd98a';
        if (game.mode === 'escort') {
          const c = game.caravan;
          label = 'SOLAR CARAVAN';
          pct = c ? c.progress * 100 : 0;
          value = Math.round(pct) + '%';
          note = !c ? '' : c.atWaystone ? 'HOLD · CLEAR THE WAYSTONE' : c.contested ? 'CONTESTED · CLEAR THE ROAD' : c.escorted ? 'MOVING' : 'GET CLOSE TO MOVE IT';
          if (c?.waystones?.length) note += ' · WAYSTONE ' + c.waystones.filter(w => w.reached).length + '/' + c.waystones.length;
          if (c) note += ' · INTEGRITY ' + Math.round((c.hp / c.maxHp) * 100) + '%';
          color = c?.contested ? '#ff7a52' : '#8dffc0';
        } else if (game.mode === 'ritual') {
          const r = game.ritual;
          const sealed = r?.sealed || 0;
          label = 'EMBER RITUAL';
          value = sealed + ' / ' + RITUAL.shrineCount;
          pct = r ? (r.shrines.reduce((s, x) => s + x.charge, 0) / RITUAL.shrineCount) * 100 : 0;
          const per = (r?.shrines || []).map((s, i) => 'C' + (i + 1) + ' ' + (s.sealed ? '✓' : Math.round(s.charge * 100) + '%')).join(' · ');
          note = (r?.contestedCount ? 'CONTESTED · ' : '') + (per || 'HOLD A CIRCLE');
          color = r?.contestedCount ? '#ff7a52' : '#ffd166';
        } else if (game.mode === 'blitz') {
          const blitzMax = game.blitzMax || BLITZ.waveTime;
          const left = game.phase === 'active' ? Math.max(0, game.blitzTimer || 0) : blitzMax;
          label = 'SUNSET';
          value = left.toFixed(1) + 's';
          pct = (left / blitzMax) * 100;
          note = 'KILLS BUY TIME';
          color = left < 10 ? '#ff5a5a' : '#ff8a6a';
        } else if (game.mode === 'duel') {
          label = 'CHAMPIONS';
          value = Math.min(game.wave, DUEL.goalWave) + ' / ' + DUEL.goalWave;
          pct = (Math.min(game.wave, DUEL.goalWave) / DUEL.goalWave) * 100;
          note = 'NO ESCORTS';
          color = '#ffe9a8';
        }
        this.el.objectiveLabel.textContent = label;
        this.el.objectiveValue.textContent = value;
        this.el.objectiveNote.textContent = note;
        this.el.objectiveFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
        this.el.objectiveFill.style.background = color;
        this.el.objectiveBar.style.borderColor = color + '55';
      }
    }

    const comboOn = game.combo >= 3;
    this.el.combo.classList.toggle('on', comboOn);
    if (comboOn) {
      this.el.combo.firstChild.nodeValue = '×' + game.comboMult().toFixed(2).replace(/0$/, '') + ' ';
      this.el.comboCount.textContent = game.combo + ' chain';
    }

    this.el.xpLevel.textContent = 'LV ' + game.level;
    this.el.xpFill.style.width = Math.min(100, (game.xp / game.xpNeed) * 100) + '%';
    this.el.xpNum.textContent = Math.floor(game.xp) + ' / ' + game.xpNeed;

    this.el.surgeIcon.textContent = form.sigil;
    const sFrac = p.surgeCd > 0 ? p.surgeCd / Math.max(0.01, p.surgeMax) : 0;
    this._setCd(this.el.surgeCd, sFrac, p.surgeCd);
    this._setCd(this.el.dashCd, p.dashCdTimer > 0 ? p.dashCdTimer / p.stats.dashCd : 0, p.dashCdTimer);
    const ultFrac = p.charge >= 100 ? 0 : 1 - p.charge / 100;
    this.el.ultCd.style.transform = 'scaleY(' + ultFrac + ')';
    this.el.ultCd.textContent = p.charge >= 100 ? '' : Math.floor(p.charge) + '%';
    this.el.abilities.ult.classList.toggle('ready', p.charge >= 100);
    this.el.abilities.surge.classList.toggle('off', p.surgeCd > 0);

    const ready = game.phase === 'ready' && game.state === 'playing';
    const interOn = (ready || game.phase === 'intermission') && game.state === 'playing';
    this.el.intermission.classList.toggle('on', interOn);
    this.el.intermission.classList.toggle('ready', ready);
    if (interOn) {
      if (ready) {
        const tier = DIFFICULTIES[game.difficulty] || DIFFICULTIES.solar;
        this.el.interCount.textContent = game.wave;
        this.el.interLabel.textContent = 'WAVE ' + game.wave + ' · READY';
        this.el.interSub.textContent = tier.name.toUpperCase() + ' · begins in ' + Math.max(0, Math.ceil(game.readyTimer ?? 0));
        this.el.interBtn.textContent = 'Begin now ⏎';
      } else {
        this.el.interCount.textContent = Math.max(0, Math.ceil(game.interTimer));
        this.el.interLabel.textContent = 'WAVE ' + game.wave;
        this.el.interSub.textContent = 'call early for essence';
        this.el.interBtn.textContent = 'Call Wave ⏎';
      }
    }

    const pending = game.pendingLevels > 0 && game.state === 'playing';
    if (this.el.levelUpBtn) {
      this.el.levelUpBtn.classList.toggle('on', pending);
      if (pending) this.el.levelUpCount.textContent = game.pendingLevels;
    }

    if (this.boss && !this.boss.dead) {
      this.el.bossWrap.classList.add('on');
      this.el.bossName.textContent = this.boss.name;
      this.el.bossFill.style.width = Math.max(0, this.boss.hp / this.boss.maxHp) * 100 + '%';
    } else {
      this.el.bossWrap.classList.remove('on');
    }
  }

  _setCd(el, frac, remaining) {
    el.style.transform = 'scaleY(' + Math.max(0, Math.min(1, frac)) + ')';
    el.textContent = remaining > 0.05 ? Math.ceil(remaining) : '';
  }

  refreshBoons(player) {
    if (!player) return;
    const stack = new Map();
    for (const b of player.boons) {
      const cur = stack.get(b.id) || { ...b, count: 0 };
      cur.count++;
      stack.set(b.id, cur);
    }
    const sig = player.sigils.join(',') + '|' + [...stack.values()].map(b => b.id + b.count).join(',');
    if (sig === this._boonSig) return;
    this._boonSig = sig;

    let html = '';
    const form = player.form;
    if (form.isFusion) {
      html += `<div class="boon-chip" style="--rc:${form.css};color:${form.css}">${form.sigil}<div class="tip"><b>${form.name}</b> — ${form.passive}</div></div>`;
    }
    for (const b of stack.values()) {
      html += `<div class="boon-chip" style="--rc:${b.css || '#f5c26b'};color:${b.css || '#f5c26b'}">${b.icon}${b.count > 1 ? `<em>${b.count}</em>` : ''}<div class="tip"><b>${b.name}</b><br>${b.desc}</div></div>`;
    }
    this.el.boons.innerHTML = html;
  }

  refreshRelics(player) {
    if (!player || !this.el.relics || !player.relics) return;
    const sig = ['signet', 'talisman', 'crown'].map(slot => {
      const eq = player.relics[slot];
      return eq ? eq.id + ':' + eq.rank : '0';
    }).join('|');
    if (sig === this._relicSig) return;
    this._relicSig = sig;
    let html = '';
    for (const slot of ['signet', 'talisman', 'crown']) {
      const eq = player.relics[slot];
      if (!eq) continue;
      const relic = RELICS.find(r => r.id === eq.id);
      if (!relic) continue;
      const css = RARITY[relic.rarity]?.css || '#ffd98a';
      html += `<div class="relic-chip" style="--rc:${css}">
        <span class="relic-chip-slot">${RELIC_SLOTS[slot].name}</span>
        <i>${relic.icon}</i><em>${relic.name}${eq.rank > 1 ? ' · ' + eq.rank : ''}</em>
        <div class="tip"><b>${relic.name}</b> — ${RELIC_SLOTS[slot].name} rank ${eq.rank}<br>${relic.desc}</div>
      </div>`;
    }
    this.el.relics.innerHTML = html;
    this.el.relics.classList.toggle('has', !!html);
  }

  setBoss(enemy) {
    this.boss = enemy;
    if (!enemy) {
      this.el.bossWrap.classList.remove('on');
    } else {
      this.el.bossWrap.classList.add('on');
      const bossEl = enemy.element && ELEMENTS[enemy.element] ? ELEMENTS[enemy.element] : null;
      this.el.bossName.textContent = bossEl ? enemy.name + ' · ' + bossEl.name.toUpperCase() : enemy.name;
      this.el.bossFill.style.width = '100%';
    }
  }

  /* ============================================================
     LEVEL UP
     ============================================================ */
  showLevelUp(game, cards) {
    const kicker = document.getElementById('levelup-kicker');
    const sub = document.getElementById('levelup-sub');
    kicker.textContent = 'LEVEL ' + game.level;
    sub.textContent = game.pendingLevels > 1
      ? game.pendingLevels + ' boons remain — choose one'
      : 'The sun offers three paths. Take one.';
    const grid = document.getElementById('boon-grid');
    grid.innerHTML = cards.map((c, i) => {
      const css = c.css || '#a9b6d6';
      const rarity = c.kind === 'sigil' ? 'FUSION PATH'
        : c.kind === 'loadout' ? (c.tag || 'LOADOUT')
        : RARITY[c.rarity]?.name || 'Boon';
      const stock = c.kind === 'sigil'
        ? `<span>FUSION · ${c.fusionName || ''}</span><b>NEW FORM</b>`
        : c.kind === 'loadout'
          ? `<span>${c.left || ''}</span><b>${c.right || ''}</b>`
          : `<span>STACK ${c.stack} / ${c.max}</span><b>${c.max > 1 ? 'STACKABLE' : 'UNIQUE'}</b>`;
      return `<button class="boon-card" data-card="${i}" style="--rc:${css}">
        <span class="boon-rarity">${rarity}</span>
        <span class="boon-icon">${c.icon}</span>
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
        <div class="boon-stock">${stock}</div>
        <span class="pick-hint">${i + 1}</span>
      </button>`;
    }).join('');
    const reroll = document.getElementById('levelup-reroll');
    if (reroll) {
      reroll.hidden = game.rerolls <= 0;
      reroll.textContent = 'Reroll · ' + game.rerolls;
    }
    document.getElementById('screen-levelup').classList.add('active');
    this.hud.classList.remove('on');
  }

  hideLevelUp() {
    document.getElementById('screen-levelup').classList.remove('active');
    if (this.game.state === 'playing') this.hud.classList.add('on');
  }

  showRelicDraft(game, draft) {
    this._activeRelicDraft = draft;
    const sourceNames = {
      elite: 'An elite hoard',
      boss: 'A warden\u2019s hoard',
      vault: 'A Sunless Vault',
      cache: 'A solar cache',
    };
    document.getElementById('relic-kicker').textContent = sourceNames[draft.source] || 'The hoard';
    document.getElementById('relic-sub').textContent = 'Choose one relic. Duplicates empower what you already wear.';
    const slotHost = document.getElementById('relic-slots');
    slotHost.innerHTML = ['signet', 'talisman', 'crown'].map(slot => {
      const eq = game.player.relics[slot];
      const relic = eq ? RELICS.find(r => r.id === eq.id) : null;
      return `<div class="relic-slot ${relic ? 'filled' : ''}">
        <span>${RELIC_SLOTS[slot].name}</span>
        <b>${relic ? relic.icon + ' ' + relic.name : 'Empty'}</b>
        <em>${eq ? 'RANK ' + eq.rank : '—'}</em>
      </div>`;
    }).join('');
    const foot = document.getElementById('relic-foot');
    if (foot) foot.textContent = 'Press ' + draft.cards.map((_, i) => i + 1).join(' · ') + ' to choose';
    const grid = document.getElementById('relic-grid');
    grid.innerHTML = draft.cards.map((c, i) => {
      const state = c.upgrading
        ? `<span>EMPOWERS WORN ${c.slotName.toUpperCase()}</span><b>RANK ${c.rank} / ${c.maxRank}</b>`
        : c.replaces
          ? `<span>REPLACES ${c.replaces.name.toUpperCase()}</span><b>RANK ${c.rank} / ${c.maxRank}</b>`
          : `<span>TAKES THE ${c.slotName.toUpperCase()} SLOT</span><b>RANK ${c.rank} / ${c.maxRank}</b>`;
      return `<button class="relic-card ${c.slot}" data-relic="${i}" style="--rc:${c.css}">
        <span class="relic-rarity">${(RARITY[c.rarity]?.name || c.rarity).toUpperCase()} · ${c.slotName.toUpperCase()}</span>
        <span class="relic-icon">${c.icon}</span>
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
        <div class="relic-state">${state}</div>
        <span class="pick-hint">${i + 1}</span>
      </button>`;
    }).join('');
    this._showScreen('relic');
    this.hud.classList.remove('on');
  }

  hideRelic() {
    document.getElementById('screen-relic')?.classList.remove('active');
    this._activeRelicDraft = null;
    if (this.game.state === 'playing') this.hud.classList.add('on');
  }

  /* ============================================================
     PAUSE / RESULTS
     ============================================================ */
  _objectiveMarkup() {
    const g = this.game;
    const core = g.structures?.core;
    if (!core) {
      if (g.mode === 'escort') {
        const c = g.caravan;
        return `<div class="section-label">Objective</div>
          <div class="run-notes"><span>Reliquary ${Math.round((c?.progress || 0) * 100)}%</span><span>${Math.ceil(c?.hp || 0)} / ${c?.maxHp || ESCORT.hp} integrity</span><span>${(c?.waystones || []).filter(w => w.reached).length} / ${(c?.waystones || []).length || ESCORT.waystones.length} waystones</span><span>${c?.atWaystone ? 'holding the waystone' : c?.contested ? 'contested' : c?.escorted ? 'moving' : 'waiting'}</span></div>`;
      }
      if (g.mode === 'ritual') {
        const r = g.ritual;
        const sealed = r?.sealed || 0;
        return `<div class="section-label">Objective</div>
          <div class="run-notes"><span>${sealed} / ${RITUAL.shrineCount} circles sealed</span><span>${r?.contestedCount || 0} contested</span><span>${Math.round((r ? r.shrines.reduce((s, x) => s + x.charge, 0) / RITUAL.shrineCount : 0) * 100)}% charged</span></div>`;
      }
      if (g.mode === 'blitz') {
        return `<div class="section-label">Objective</div>
          <div class="run-notes"><span>${Math.max(0, g.blitzTimer || 0).toFixed(1)}s left</span><span>Wave ${Math.min(g.wave, BLITZ.goalWave)} / ${BLITZ.goalWave}</span><span>${g.bonusWaves || 0} bonus waves</span></div>`;
      }
      if (g.mode === 'duel') {
        return `<div class="section-label">Objective</div>
          <div class="run-notes"><span>Champion ${Math.min(g.wave, DUEL.goalWave)} / ${DUEL.goalWave}</span><span>${g.runStats.bosses} felled</span><span>no escorts</span></div>`;
      }
      return '';
    }
    const corePct = Math.round(Math.max(0, core.hp / core.maxHp) * 100);
    const towers = g.structures.defenses.length;
    const lanes = g.structures.lanes.length
      ? `${g.structures.lanes.filter(l => l.gate.alive).length} / ${LANE.goalGates} gates standing`
      : `${towers} defenses raised`;
    return `<div class="section-label">Objective</div>
      <div class="run-notes"><span>Sunforge ${corePct}%</span><span>${lanes}</span><span>${g.coreThreat || 0} breaching</span></div>`;
  }

  showPause(game) {
    const p = game.player;
    if (!p) return;
    document.getElementById('pause-sub').textContent = `Wave ${game.wave} · ${fmtTime(game.runTime)} · ${game.kills} kills`;
    document.getElementById('pause-form').textContent = p.form.name.toUpperCase();
    const build = this._buildPills(p);
    const pacts = this.game.pacts || {};
    const pactsTotal = pactRanks(pacts);
    const diff = DIFFICULTIES[this.game.difficulty] || DIFFICULTIES.solar;
    document.getElementById('pause-body').innerHTML = `
      <div class="run-stats">
        <div class="stat-tile"><span>Wave</span><b class="gold">${game.wave}</b></div>
        <div class="stat-tile"><span>Kills</span><b>${game.kills}</b></div>
        <div class="stat-tile"><span>Level</span><b>${game.level}</b></div>
        <div class="stat-tile"><span>Time</span><b>${fmtTime(game.runTime)}</b></div>
      </div>
      ${this._objectiveMarkup()}
      <div class="section-label">Run modifiers</div>
      <div class="run-notes">
        <span style="color:${diff.css};border-color:${diff.css}55">${diff.icon} ${diff.name}${diff.hardcore ? ' · NO REVIVE' : ''}</span>
        <span>${pactsTotal ? pactsTotal + ' pact ranks' : 'No pacts'}</span>
        <span>Reward ×${pactReward(pacts).toFixed(2)} · Marks ×${diff.markMult.toFixed(2)}${this.game.skillRun ? ' ×' + SKILL_RUN.markMult.toFixed(2) : ''}</span>
        ${this.game.skillRun ? `<span style="color:${SKILL_RUN.css};border-color:${SKILL_RUN.css}55">⟡ SKILL RUN · NO DRAFTS · NO RELICS</span>` : ''}
        ${this.game.waveBonus ? `<span style="color:${this.game.waveBonus.css};border-color:${this.game.waveBonus.css}55">${this.game.waveBonus.icon} ${this.game.waveBonus.name}</span>` : ''}
      </div>
      <div class="section-label">Current build</div>
      <div class="build-list">${build}</div>
      <div class="section-label">Controls</div>
      <div class="controls-list">
        ${this._controlsHtml()}
      </div>
    `;
    this._showScreen('pause');
    this.hud.classList.remove('on');
  }

  hidePause() {
    document.getElementById('screen-pause').classList.remove('active');
    if (this.game.state === 'playing') this.hud.classList.add('on');
  }

  showGameOver(summary) {
    this.hud.classList.remove('on');
    this.hideForge();
    const victory = !!summary.victory;
    const coreLost = summary.cause === 'core';
    const diff = DIFFICULTIES[summary.difficulty] || DIFFICULTIES.solar;
    const screenEl = document.getElementById('screen-gameover');
    screenEl.classList.toggle('victory', victory);
    screenEl.classList.toggle('hardcore', !!summary.hardcore);
    const victoryTitles = {
      siege: 'Dawn Restored', lane: 'Lanes Broken', hunt: 'The Hunt Ends', trial: 'Dawn Restored',
      escort: 'Caravan Home', ritual: 'The Ritual Burns', blitz: 'Before Sunset', duel: 'Champion of the Ring',
    };
    document.getElementById('go-title').textContent = victory
      ? (summary.skillRun ? 'Bare Hands Dawn' : summary.hardcore ? 'Hardcore Dawn' : (victoryTitles[summary.mode] || victoryTitles.trial))
      : coreLost ? 'The Sunforge Falls' : summary.cause === 'caravan' ? 'The Reliquary Shatters' : summary.cause === 'clock' ? 'The Sun Sets' : 'The Sun Sets';
    const victorySubs = {
      siege: 'Twenty waves held. The core still burns.',
      lane: 'All three rift gates are dust. The Sunforge stands.',
      hunt: 'Four wardens felled. The arena is quiet.',
      escort: 'The reliquary reached the eastern rift. The light is home.',
      ritual: 'Three circles sealed. The ember is whole again.',
      blitz: 'Twelve waves before sunset. The clock never caught you.',
      duel: 'Three champions felled, alone in the ring.',
      trial: 'The arena finally went quiet. Dawn is yours.',
    };
    document.getElementById('go-sub').textContent = victory
      ? (victorySubs[summary.mode] || victorySubs.trial)
      : coreLost ? 'The core is lost. The arena goes dark.'
      : summary.cause === 'caravan' ? 'The horde tore the reliquary apart on the road.'
      : summary.cause === 'clock' ? 'The last sliver of sun went out before the final wave.'
      : summary.newBest ? 'A new personal best — the sun will remember' : 'Your sigil returns to the dark';
    const badge = document.getElementById('go-badge');
    if (badge) badge.hidden = !victory;
    const diffPill = document.getElementById('go-diff');
    if (diffPill) {
      diffPill.hidden = diff.key === 'solar';
      diffPill.textContent = diff.icon + ' ' + diff.name.toUpperCase();
      diffPill.style.color = diff.css;
      diffPill.style.borderColor = diff.css + '66';
    }
    const formEl = document.getElementById('go-form');
    formEl.textContent = summary.form.toUpperCase();
    formEl.style.color = summary.formColor || '#f5c26b';
    const stepBtn = document.getElementById('go-stepback');
    if (stepBtn) {
      const rank = summary.descent || 0;
      stepBtn.hidden = rank <= 0;
      stepBtn.textContent = 'Step Back to Descent ' + Math.max(0, rank - 1);
    }

    const p = this.game.player;
    const build = p ? this._buildPills(p) : '';
    const newAchievements = summary.newAchievements || [];
    const pactMult = summary.pactMult ?? 1;
    const pactsTotal = summary.pactsTotal ?? 0;
    const coreMode = summary.mode === 'siege' || summary.mode === 'lane';
    const coreText = coreMode && summary.corePct != null
      ? ` · ${Math.round((summary.corePct ?? 1) * 100)}% core` : '';
    const gateText = summary.mode === 'lane' ? ` · ${LANE.goalGates - (summary.gatesLeft ?? 0)}/${LANE.goalGates} gates` : '';
    const modeText = summary.mode === 'escort' ? ` · reliquary ${summary.caravanPct || 0}%`
      : summary.mode === 'ritual' ? ` · ${summary.ritualSealed || 0}/${RITUAL.shrineCount} circles` : '';
    const skillText = summary.skillRun ? ` · SKILL RUN (×${SKILL_RUN.markMult.toFixed(2)})` : '';
    const bonusText = summary.bonusWaves ? ` · ${summary.bonusWaves} bonus waves` : '';
    document.getElementById('go-body').innerHTML = `
      <div class="run-stats">
        <div class="stat-tile ${summary.newBest ? 'new-best' : ''}"><span>Wave reached</span><b class="gold">${summary.wave}</b><small>${summary.newBest ? 'NEW BEST' : 'best ' + summary.bestWave}</small></div>
        <div class="stat-tile"><span>Kills</span><b>${summary.kills}</b><small>${summary.essence} essence${coreMode ? ' · ' + (summary.shards || 0) + ' shards' : ''}</small></div>
        <div class="stat-tile"><span>Time survived</span><b>${fmtTime(summary.time)}</b><small>best chain ×${summary.combo}</small></div>
        <div class="stat-tile"><span>Damage dealt</span><b>${summary.damage.toLocaleString()}</b><small>${(summary.damageTaken || 0).toLocaleString()} taken · level ${summary.level}</small></div>
      </div>
      <div class="dawn-earned">
        <div><span>SUNMARKS EARNED</span><b>+${summary.marksEarned || 0}</b><small>descent ×${(summary.descentMult || 1).toFixed(2)}</small></div>
        <div><span>DAWN BANK</span><b>${summary.totalMarks || 0}</b></div>
        <div class="dawn-note"><span>RUN NOTES</span><small><b style="color:${diff.css}">${diff.hardcore ? 'HARDCORE' : diff.name}</b> · ${pactsTotal ? pactsTotal + ' pact ranks · ×' + pactMult.toFixed(2) : 'No pacts'} · ${summary.vaults || 0} vaults · ${summary.relicPicks || 0} relics${coreText}${gateText}${modeText}${skillText}${bonusText}</small></div>
      </div>
      ${summary.newDifficultyBest ? `<div class="dawn-catchup" style="color:${diff.css};border-color:${diff.css}44;background:${diff.css}12">NEW ${diff.name.toUpperCase()} RECORD · WAVE ${summary.difficultyBest}</div>` : ''}
      ${summary.catchUp > 1 ? `<div class="dawn-catchup">DAWN'S FAVOR · +20% SUNMARKS FOR A LESS-TRAVELLED SIGIL</div>` : ''}
      ${summary.descent ? `<div class="dawn-catchup" style="color:#ffb066;border-color:#ffb06644;background:#ffb06612">DESCENT ${summary.descent} · NEXT RUN +${Math.round((summary.descentHp - 1) * 100)}% ENEMY HEALTH · +${Math.round((summary.descentDamage - 1) * 100)}% DAMAGE · +${Math.round(summary.descent * DESCENT.markStep * 100)}% SUNMARKS</div>` : ''}
      ${newAchievements.length ? `<div class="section-label">New achievements</div><div class="dawn-new">${newAchievements.map(a => `<span><b>${a.name}</b><em>+${a.points}</em></span>`).join('')}</div>` : ''}
      <div class="section-label">${summary.victory ? 'The build that held' : 'The build that fell'}</div>
      <div class="build-list">${build}</div>
    `;
    this._showScreen('gameover');
    this._syncBest();
  }

  hideGameOver() {
    const el = document.getElementById('screen-gameover');
    el.classList.remove('active');
    el.classList.remove('victory');
  }

  _buildPills(player) {
    const stack = new Map();
    for (const b of player.boons) {
      const cur = stack.get(b.id) || { ...b, count: 0 };
      cur.count++;
      stack.set(b.id, cur);
    }
    const parts = [];
    parts.push(`<span class="build-pill" style="border-color:${player.form.css}55"><i style="color:${player.form.css}">${player.form.sigil}</i>${player.form.name}<em>${player.form.isFusion ? 'FUSED' : 'SIGIL'}</em></span>`);
    if (player.relics) {
      for (const slot of ['signet', 'talisman', 'crown']) {
        const eq = player.relics[slot];
        if (!eq) continue;
        const relic = RELICS.find(r => r.id === eq.id);
        if (!relic) continue;
        parts.push(`<span class="build-pill relic" style="border-color:${RARITY[relic.rarity]?.css || '#ffd98a'}55"><i>${relic.icon}</i>${relic.name}<em>${slot.toUpperCase()} ${eq.rank}</em></span>`);
      }
    }
    for (const b of stack.values()) {
      parts.push(`<span class="build-pill"><i>${b.icon}</i>${b.name}<em>×${b.count}</em></span>`);
    }
    if (stack.size === 0) parts.push(`<span class="subnote">No boons taken yet.</span>`);
    return parts.join('');
  }

  /* ============================================================
     FLOURISHES
     ============================================================ */
  banner(kicker, big, small) {
    const layer = document.getElementById('banner-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'banner';
    el.innerHTML = `<div class="kicker">${kicker || ''}</div><div class="big">${big || ''}</div><div class="small">${small || ''}</div>`;
    layer.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2700);
  }

  toast(text, color = '#ffd98a') {
    const stack = document.getElementById('toast-stack');
    if (!stack) return;
    while (stack.children.length >= 3) stack.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.color = color;
    el.style.borderColor = color + '55';
    el.textContent = text;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  fusion(form) {
    const layer = document.getElementById('fusion-layer');
    if (!layer) return;
    document.getElementById('fusion-name').textContent = form.name.toUpperCase();
    document.getElementById('fusion-name').style.color = form.css;
    document.getElementById('fusion-desc').textContent = form.passive + ' · ' + form.ult.name;
    layer.querySelector('.fusion-halo').style.background = `radial-gradient(circle, ${form.css}55, transparent 58%)`;
    layer.classList.remove('on');
    void layer.offsetWidth;
    layer.classList.add('on');
    setTimeout(() => layer.classList.remove('on'), 3500);
    this.toast(form.name.toUpperCase() + ' FORGED — ' + form.passive, form.css);
  }

  _spawnEmbers() {
    const host = document.getElementById('title-embers');
    if (!host) return;
    for (let i = 0; i < 26; i++) {
      const e = document.createElement('span');
      e.className = 'title-ember';
      e.style.left = Math.random() * 100 + '%';
      e.style.animationDuration = 7 + Math.random() * 12 + 's';
      e.style.animationDelay = -Math.random() * 18 + 's';
      e.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
      e.style.width = e.style.height = (1 + Math.random() * 2.4) + 'px';
      host.appendChild(e);
    }
  }
}
