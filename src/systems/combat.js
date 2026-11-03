// combat.js — damage calculation including critical strikes.
import { COMBAT } from '../config.js';

// Rolls damage for a player bullet hit.
// Returns { damage, isCrit }. 15% chance → 3× base damage.
export function rollPlayerDamage() {
  const isCrit = Math.random() < COMBAT.critChance;
  const damage = isCrit
    ? COMBAT.baseDamage * COMBAT.critMultiplier
    : COMBAT.baseDamage;
  return { damage, isCrit };
}
