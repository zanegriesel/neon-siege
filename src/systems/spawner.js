// spawner.js — round/wave logic: per-round totals, escalation, gradual batched
// spawning on a timer, and random-direction spawn placement around the player.
import { WAVE, ARENA } from '../config.js';
import { Enemy } from '../entities/enemy.js';
import { clamp, TAU } from '../utils.js';

// Total enemies for a round (monotonically increasing, capped).
export function enemyCountForRound(round) {
  return Math.min(WAVE.baseEnemies + round * WAVE.perRound, WAVE.maxEnemies);
}

// Fraction of the wave that should be ranged (ramps up with rounds).
function rangedShare(round) {
  return clamp(
    WAVE.rangedShareBase + round * WAVE.rangedSharePerRound,
    0,
    WAVE.rangedShareMax,
  );
}

// Batch cadence shrinks and batch size grows at higher rounds, but a whole
// wave is never released at once.
function spawnIntervalForRound(round) {
  return Math.max(
    WAVE.spawnIntervalMin,
    WAVE.spawnInterval - round * WAVE.spawnIntervalDecay,
  );
}
function batchSizeForRound(round) {
  return WAVE.batchSize + Math.floor(round / WAVE.batchGrowthEvery);
}

export class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.round = 0;
    this.betweenTimer = 0;   // calm period before a wave
    this.spawnTimer = 0;     // time until next batch
    this.remaining = 0;      // enemies still to spawn this round
    this.rangedRemaining = 0;
    this.meleeRemaining = 0;
    this.active = false;     // a wave is currently spawning / in progress
  }

  // Begin the first round.
  start() {
    this.reset();
    this.beginRound(1);
  }

  beginRound(round) {
    this.round = round;
    const total = enemyCountForRound(round);
    this.rangedRemaining = Math.round(total * rangedShare(round));
    this.meleeRemaining = total - this.rangedRemaining;
    this.remaining = total;
    this.spawnTimer = 0.4; // small delay so the wave banner shows first
    this.active = true;
  }

  // Picks a random spawn point around the player at spawnRadius, clamped in-bounds.
  spawnPoint(player) {
    const a = Math.random() * TAU;
    const pad = ARENA.padding + 20;
    const x = clamp(player.x + Math.cos(a) * WAVE.spawnRadius, pad, ARENA.width - pad);
    const y = clamp(player.y + Math.sin(a) * WAVE.spawnRadius, pad, ARENA.height - pad);
    return { x, y };
  }

  // Decide the next enemy type, keeping the composition balanced.
  nextType() {
    if (this.meleeRemaining <= 0) return 'ranged';
    if (this.rangedRemaining <= 0) return 'melee';
    // weighted random by remaining counts
    const total = this.meleeRemaining + this.rangedRemaining;
    return Math.random() < this.rangedRemaining / total ? 'ranged' : 'melee';
  }

  // Called each tick while PLAYING. Returns an array of newly spawned enemies.
  // onRoundStart(round) fires when a new wave begins (for banner + audio).
  update(dt, player, enemiesAlive, onRoundStart) {
    const spawned = [];

    // Between-rounds calm: advance to the next round when it elapses.
    if (!this.active) {
      this.betweenTimer -= dt;
      if (this.betweenTimer <= 0) {
        this.beginRound(this.round + 1);
        onRoundStart && onRoundStart(this.round);
      }
      return spawned;
    }

    // Gradual spawning: release a batch when the spawn timer elapses.
    if (this.remaining > 0) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnTimer = spawnIntervalForRound(this.round);
        const batch = Math.min(batchSizeForRound(this.round), this.remaining);
        for (let i = 0; i < batch; i++) {
          const type = this.nextType();
          if (type === 'ranged') this.rangedRemaining--; else this.meleeRemaining--;
          this.remaining--;
          const { x, y } = this.spawnPoint(player);
          spawned.push(new Enemy(type, x, y));
        }
      }
    }

    // Round clears only when the budget is exhausted AND no enemies remain.
    if (this.remaining <= 0 && enemiesAlive === 0) {
      this.active = false;
      this.betweenTimer = WAVE.betweenRounds;
    }

    return spawned;
  }
}
