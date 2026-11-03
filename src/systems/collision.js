// collision.js — circle-based hit resolution between bullets, enemies, and the player.
import { circlesOverlap } from '../utils.js';
import { rollPlayerDamage } from './combat.js';

// Resolves all collisions for one tick.
// events: callbacks fired as things happen so audio/effects stay decoupled.
//   onEnemyHit(enemy, damage, isCrit)
//   onEnemyKilled(enemy)
//   onPlayerHit(damage)
export function resolveCollisions(state, events) {
  const { player, enemies, bullets } = state;

  for (let bi = bullets.length - 1; bi >= 0; bi--) {
    const b = bullets[bi];
    if (b.dead) continue;

    if (b.from === 'player') {
      // player bullet vs enemies
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (e.dead) continue;
        if (circlesOverlap(b.x, b.y, b.radius, e.x, e.y, e.radius)) {
          const { damage, isCrit } = rollPlayerDamage();
          e.takeDamage(damage);
          b.dead = true;
          events.onEnemyHit && events.onEnemyHit(e, damage, isCrit);
          if (e.dead) events.onEnemyKilled && events.onEnemyKilled(e);
          break;
        }
      }
    } else {
      // enemy projectile vs player
      if (!player.dead &&
          circlesOverlap(b.x, b.y, b.radius, player.x, player.y, player.radius)) {
        b.dead = true;
        player.takeDamage(b.damage ?? 8);
        events.onPlayerHit && events.onPlayerHit(b.damage ?? 8);
      }
    }
  }
}
