// enemy.js — melee and ranged enemy behaviors.
import { MELEE, RANGED, ARENA } from '../config.js';
import { Bullet } from './bullet.js';
import { clamp, dist, angleTo } from '../utils.js';

export class Enemy {
  constructor(type, x, y) {
    this.type = type; // 'melee' | 'ranged'
    this.x = x;
    this.y = y;
    const cfg = type === 'melee' ? MELEE : RANGED;
    this.radius = cfg.radius;
    this.hp = cfg.hp;
    this.maxHp = cfg.hp;
    this.speed = cfg.speed;
    this.dead = false;
    this.attackTimer = 0;
    this.hitFlash = 0;
    this.spin = 0;
    this.aimAngle = 0;
    // ranged enemies remember a loose anchor they drift around
    this.anchorX = x;
    this.anchorY = y;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.hitFlash = 0.1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  // callbacks: { onMeleeHit(damage), onEnemyShoot(bullet) }
  update(dt, player, callbacks) {
    this.attackTimer = Math.max(0, this.attackTimer - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    const d = dist(this.x, this.y, player.x, player.y);
    this.aimAngle = angleTo(this.x, this.y, player.x, player.y);

    if (this.type === 'melee') {
      this.updateMelee(dt, player, d, callbacks);
    } else {
      this.updateRanged(dt, player, d, callbacks);
    }

    // keep inside arena
    const pad = ARENA.padding + this.radius;
    this.x = clamp(this.x, pad, ARENA.width - pad);
    this.y = clamp(this.y, pad, ARENA.height - pad);
  }

  updateMelee(dt, player, d, callbacks) {
    this.spin += dt * 2;
    // seek the player
    if (d > 1) {
      const a = this.aimAngle;
      this.x += Math.cos(a) * this.speed * dt;
      this.y += Math.sin(a) * this.speed * dt;
    }
    // strike at close range on cooldown
    if (d <= MELEE.touchRange + player.radius && this.attackTimer <= 0) {
      this.attackTimer = MELEE.attackCooldown;
      callbacks.onMeleeHit && callbacks.onMeleeHit(MELEE.attackDamage);
    }
  }

  updateRanged(dt, player, d, callbacks) {
    // Ranged units mostly hold position: only nudge to keep preferred distance,
    // and stay near their anchor (driftRange).
    const tooClose = d < RANGED.preferredDistance - 40;
    const tooFar = d > RANGED.preferredDistance + 80;
    let move = 0;
    if (tooClose) move = -1;      // back away
    else if (tooFar) move = 0.5;  // approach slightly
    if (move !== 0) {
      const a = this.aimAngle;
      let nx = this.x + Math.cos(a) * this.speed * move * dt;
      let ny = this.y + Math.sin(a) * this.speed * move * dt;
      // clamp movement to a short drift around anchor
      if (dist(nx, ny, this.anchorX, this.anchorY) <= RANGED.driftRange) {
        this.x = nx;
        this.y = ny;
      }
    }
    // fire on cooldown
    if (this.attackTimer <= 0) {
      this.attackTimer = RANGED.shootCooldown;
      const bullet = new Bullet(this.x, this.y, this.aimAngle, 'enemy');
      callbacks.onEnemyShoot && callbacks.onEnemyShoot(bullet);
    }
  }
}
