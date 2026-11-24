import { SETTINGS_DEFAULT, normalizePacts, normalizeDifficulty, defaultKeys, DESCENT } from './data.js';

const KEY = 'helios.elements.save.v1';
// Open the game with ?sandbox=1 to run against the loaded save without ever
// writing it back. Balance passes and playtests can mutate builds, marks and
// records freely while the real save stays untouched.
export const SANDBOX = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('sandbox');

export function defaultSave() {
  return {
    bestWave: 0,
    bestSiege: 0,
    bestTrial: 0,
    bestLane: 0,
    bestHunt: 0,
    wins: 0,
    bestKills: 0,
    bestTime: 0,
    runs: 0,
    mode: 'siege',
    modeWins: { siege: 0, lane: 0, trial: 0, hunt: 0, escort: 0, ritual: 0, blitz: 0, duel: 0 },
    modeBest: { siege: 0, lane: 0, trial: 0, hunt: 0, escort: 0, ritual: 0, blitz: 0, duel: 0 },
    skillRun: false,
    skillRuns: 0,
    skillWins: 0,
    bestSkill: 0,
    bestAscension: 0,
    difficulty: 'solar',
    descent: 0,
    descentBest: 0,
    descentRecovery: 1,
    difficultyBest: { kindled: 0, solar: 0, umbral: 0, hardcore: 0 },
    difficultyWins: { kindled: 0, solar: 0, umbral: 0, hardcore: 0 },
    marks: 0,
    swapBank: 0,
    achievements: {},
    rewards: {},
    codex: { relics: {}, boons: {} },
    pacts: normalizePacts({}),
    sigilRuns: {},
    sigilWins: {},
    weapons: {},
    seenWelcome: false,
    settings: { ...SETTINGS_DEFAULT, keys: defaultKeys(), musicTheme: 'auto' },
  };
}

export function normalizeSave(input) {
  const base = defaultSave();
  const parsed = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const descent = Math.max(0, Math.min(DESCENT.max, Math.floor(Number(parsed.descent) || 0)));
  const storedBest = Math.max(
    descent,
    Math.min(DESCENT.max, Math.floor(Number(parsed.descentBest) || 0))
  );
  // Older Step Back behavior could erase a rank without recording the rank left
  // behind. Recover one step once, then mark the save so the grant cannot repeat.
  const migrated = Number(parsed.descentRecovery) >= 1;
  const recoveredBest = migrated
    ? storedBest
    : Math.min(DESCENT.max, Math.max(storedBest, descent > 0 ? descent + 1 : descent));
  return {
      ...base,
      ...parsed,
      marks: Math.max(0, Math.floor(Number(parsed.marks) || 0)),
      swapBank: Math.max(0, Math.floor(Number(parsed.swapBank) || 0)),
      achievements: { ...base.achievements, ...(parsed.achievements || {}) },
      rewards: { ...base.rewards, ...(parsed.rewards || {}) },
      codex: {
        relics: { ...base.codex.relics, ...(parsed.codex?.relics || {}) },
        boons: { ...base.codex.boons, ...(parsed.codex?.boons || {}) },
      },
      pacts: normalizePacts(parsed.pacts || {}),
      sigilRuns: { ...base.sigilRuns, ...(parsed.sigilRuns || {}) },
      sigilWins: { ...base.sigilWins, ...(parsed.sigilWins || {}) },
      weapons: { ...base.weapons, ...(parsed.weapons || {}) },
      modeWins: { ...base.modeWins, ...(parsed.modeWins || {}) },
      modeBest: { ...base.modeBest, ...(parsed.modeBest || {}) },
      skillRun: !!parsed.skillRun,
      skillRuns: Math.max(0, Math.floor(Number(parsed.skillRuns) || 0)),
      skillWins: Math.max(0, Math.floor(Number(parsed.skillWins) || 0)),
      bestSkill: Math.max(0, Math.floor(Number(parsed.bestSkill) || 0)),
      difficulty: normalizeDifficulty(parsed.difficulty),
      descent,
      descentBest: recoveredBest,
      descentRecovery: 1,
      difficultyBest: { ...base.difficultyBest, ...(parsed.difficultyBest || {}) },
      difficultyWins: { ...base.difficultyWins, ...(parsed.difficultyWins || {}) },
      seenWelcome: !!parsed.seenWelcome,
      settings: {
        ...base.settings,
        ...(parsed.settings || {}),
        keys: { ...base.settings.keys, ...(parsed.settings?.keys || {}) },
      },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    return normalizeSave(JSON.parse(raw));
  } catch (e) {
    return defaultSave();
  }
}

/* Text the player can copy or download, and the reverse trip. */
export function saveText(save) {
  return JSON.stringify(save);
}

export function importSave(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not a save');
  const known = ['marks', 'runs', 'bestWave', 'achievements', 'rewards', 'settings', 'descent'];
  if (!known.some((k) => k in parsed)) throw new Error('not a save');
  const next = normalizeSave(parsed);
  persist(next);
  return next;
}

export function persist(save) {
  if (SANDBOX) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch (e) {
    /* storage may be disabled; the game still runs for this session */
  }
}
