// bullet.js — projectiles for both the player and ranged enemies.
import { BULLET, RANGED } from '../config.js';

export class Bullet {
  constructor(x, y, angle, from) {
    this.x = x;
    this.y = y;
    this.from = from; // 'player' | 'enemy'
    const speed = from === 'player' ? BULLET.playerSpeed : BULLET.enemySpeed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = from === 'player' ? BULLET.playerRadius : BULLET.enemyRadius;
    this.life = from === 'player' ? BULLET.playerLifetime : BULLET.enemyLifetime;
    this.damage = from === 'player' ? 0 : RANGED.projectileDamage;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
}
