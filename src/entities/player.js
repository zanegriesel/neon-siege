// player.js — movement, aiming, shooting, ammo/reload, and health.
import { PLAYER, ARENA } from '../config.js';
import { Bullet } from './bullet.js';
import { clamp, angleTo } from '../utils.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = ARENA.width / 2;
    this.y = ARENA.height / 2;
    this.angle = 0;
    this.radius = PLAYER.radius;
    this.hp = PLAYER.maxHp;
    this.maxHp = PLAYER.maxHp;
    this.magazine = PLAYER.magSize;
    this.reloading = false;
    this.reloadTimer = 0;
    this.fireTimer = 0;
    this.muzzleFlash = 0;   // 0..1 visual
    this.hitFlash = 0;      // red flash timer
    this.dead = false;
  }

  get healthRatio() {
    return clamp(this.hp / this.maxHp, 0, 1);
  }

  // Begins a reload if sensible. Returns true if a reload actually started.
  startReload() {
    if (this.reloading || this.magazine >= PLAYER.magSize) return false;
    this.reloading = true;
    this.reloadTimer = PLAYER.reloadTime;
    return true;
  }

  takeDamage(amount) {
    if (this.dead) return;
    this.hp -= amount;
    this.hitFlash = PLAYER.invulnFlash;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  // input: { moveX, moveY, aimX, aimY, firing }
  // callbacks: { onShoot(bullet), onReloadStart(), onReloadDone() }
  update(dt, input, callbacks) {
    // timers
    this.fireTimer = Math.max(0, this.fireTimer - dt);
    if (this.muzzleFlash > 0) this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 8);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);

    // aim
    this.angle = angleTo(this.x, this.y, input.aimX, input.aimY);

    // movement (normalized diagonal)
    let dx = input.moveX;
    let dy = input.moveY;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
      this.x += dx * PLAYER.speed * dt;
      this.y += dy * PLAYER.speed * dt;
    }
    // clamp to arena
    const pad = ARENA.padding + this.radius;
    this.x = clamp(this.x, pad, ARENA.width - pad);
    this.y = clamp(this.y, pad, ARENA.height - pad);

    // reload progress
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.reloadTimer = 0;
        this.magazine = PLAYER.magSize;
        callbacks.onReloadDone && callbacks.onReloadDone();
      }
    }

    // firing
    if (input.firing && !this.reloading && this.fireTimer <= 0 && this.magazine > 0) {
      this.fireTimer = PLAYER.fireCooldown;
      this.magazine -= 1;
      this.muzzleFlash = 1;
      const bx = this.x + Math.cos(this.angle) * (this.radius + 10);
      const by = this.y + Math.sin(this.angle) * (this.radius + 10);
      const bullet = new Bullet(bx, by, this.angle, 'player');
      callbacks.onShoot && callbacks.onShoot(bullet);

      // auto reload when empty
      if (this.magazine === 0) {
        this.startReload();
        callbacks.onReloadStart && callbacks.onReloadStart();
      }
    }
  }

  get reloadRatio() {
    if (!this.reloading) return 1;
    return clamp(1 - this.reloadTimer / PLAYER.reloadTime, 0, 1);
  }
}
