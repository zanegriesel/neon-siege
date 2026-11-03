// config.js — all tunable constants for Neon Siege.
// Logical resolution: the game simulates at this fixed size and is scaled to fit the window.

export const ARENA = {
  width: 960,
  height: 540,
  padding: 24, // inner wall inset for clamping entities
};

export const COLORS = {
  void: '#0a0612',
  grid: '#1b1030',
  cyan: '#36f9f6',
  magenta: '#ff3caa',
  amber: '#ffca3a',
  danger: '#ff4d4d',
  mint: '#8affc1',
  white: '#f4f2ff',
};

export const PLAYER = {
  radius: 14,
  speed: 230,          // px/sec
  maxHp: 100,
  magSize: 10,
  reloadTime: 1.1,     // seconds
  fireCooldown: 0.14,  // seconds between shots while held
  invulnFlash: 0.12,   // hit flash duration
};

export const BULLET = {
  playerSpeed: 620,
  playerRadius: 4,
  playerLifetime: 1.4,
  enemySpeed: 300,
  enemyRadius: 5,
  enemyLifetime: 3.0,
};

export const COMBAT = {
  baseDamage: 5,
  critChance: 0.15,
  critMultiplier: 3,
};

export const MELEE = {
  radius: 16,
  hp: 40,
  speed: 70,           // slow
  touchRange: 26,      // distance at which it can strike
  attackDamage: 10,
  attackCooldown: 0.9, // seconds between strikes
};

export const RANGED = {
  radius: 13,
  hp: 15,
  speed: 55,               // moves faster than it drifts; mostly holds position
  preferredDistance: 260,  // tries to keep this gap
  driftRange: 90,          // only repositions within a short range of its anchor
  shootCooldown: 1.6,
  projectileDamage: 8,
};

// Round / wave scaling and gradual spawning.
export const WAVE = {
  baseEnemies: 3,
  perRound: 2,              // total enemies = baseEnemies + round * perRound
  maxEnemies: 40,           // cap on a single round's total
  betweenRounds: 2.2,       // seconds of calm before the next wave
  spawnInterval: 1.0,       // seconds between spawn batches (round 1)
  spawnIntervalMin: 0.35,   // fastest batch cadence at high rounds
  spawnIntervalDecay: 0.05, // interval reduction per round
  batchSize: 1,             // enemies per batch (round 1)
  batchGrowthEvery: 3,      // +1 batch size every N rounds
  spawnRadius: 560,         // distance from player enemies spawn at (off-screen where possible)
  // ranged share ramps up with rounds: fraction of wave that is ranged
  rangedShareBase: 0.2,
  rangedShareMax: 0.55,
  rangedSharePerRound: 0.03,
};

export const AUDIO = {
  masterVolume: 0.5,
  musicVolume: 0.22,
  sfxVolume: 0.5,
};

export const STORAGE_KEYS = {
  leaderboard: 'neon-siege:leaderboard',
  mute: 'neon-siege:muted',
  tutorialSeen: 'neon-siege:tutorialSeen', // sessionStorage (per-session)
  name: 'neon-siege:playerName',
};

export const LEADERBOARD_SIZE = 10;
export const MAX_NAME_LENGTH = 10;
export const DEFAULT_NAME = 'PLAYER';
