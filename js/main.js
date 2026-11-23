/* ============================================================
   HELIOS ELEMENTS — BOOTSTRAP
   ============================================================ */

import { Engine } from './engine.js';
import { FX } from './fx.js';
import { AudioSystem } from './audio.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { loadSave } from './store.js';

const boot = document.getElementById('boot');

function fatal(err) {
  const el = document.getElementById('fatal');
  if (!el) return;
  el.hidden = false;
  el.textContent = 'HELIOS ELEMENTS hit an error:\n\n' + (err && err.stack ? err.stack : String(err));
  console.error(err);
}

window.addEventListener('error', (e) => fatal(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => fatal(e.reason));

try {
  const save = loadSave();
  const audio = new AudioSystem();
  const engine = new Engine(document.getElementById('game-canvas'));

  const fx = new FX(engine);
  const game = new Game({ engine, fx, audio, save });
  const ui = new UI({ game, audio, engine, save });

  game.ui = ui;
  game.applySettings(save.settings);
  game.init();

  const unlockAudio = () => audio.unlock();
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  window.addEventListener('blur', () => {
    if (game.state === 'playing') game.pause();
  });

  let last = performance.now();
  let dead = false;
  const frame = (now) => {
    if (dead) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    try {
      game.update(dt);
      fx.update(dt);
      engine.update(dt, game.cameraOpts());
      ui.updateWorldBars(game);
      engine.render();
    } catch (err) {
      dead = true;
      fatal(err);
    }
  };
  requestAnimationFrame(frame);

  requestAnimationFrame(() => {
    if (!boot) return;
    boot.classList.add('done');
    setTimeout(() => boot.remove(), 1100);
  });

  // handy for debugging from the console
  window.__helios = { game, ui, engine, fx, audio };
} catch (err) {
  fatal(err);
}
