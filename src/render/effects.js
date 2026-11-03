// effects.js — particles, hit flashes, floating damage numbers, and CRT overlay.
import { COLORS, ARENA } from '../config.js';
import { TAU, randRange } from '../utils.js';

export class Effects {
  constructor() {
    this.particles = [];
    this.popups = [];   // floating damage numbers
    this.shake = 0;     // screen-shake magnitude
  }

  burst(x, y, color, count = 8, speed = 160) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = randRange(speed * 0.4, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: randRange(0.25, 0.5),
        maxLife: 0.5,
        color,
        size: randRange(1.5, 3.5),
      });
    }
  }

  damageNumber(x, y, amount, isCrit) {
    this.popups.push({
      x: x + randRange(-6, 6),
      y,
      text: isCrit ? `${amount}!` : `${amount}`,
      life: isCrit ? 0.9 : 0.6,
      maxLife: isCrit ? 0.9 : 0.6,
      crit: isCrit,
      vy: isCrit ? -46 : -34,
    });
  }

  addShake(mag) {
    this.shake = Math.min(this.shake + mag, 14);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const q = this.popups[i];
      q.y += q.vy * dt;
      q.vy *= 0.9;
      q.life -= dt;
      if (q.life <= 0) this.popups.splice(i, 1);
    }
    if (this.shake > 0) {
      this.shake -= dt * 40;
      if (this.shake < 0) this.shake = 0;
    }
  }

  // Returns {x, y} shake offset to apply to the camera before drawing the world.
  shakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return {
      x: randRange(-this.shake, this.shake),
      y: randRange(-this.shake, this.shake),
    };
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const a = p.life / p.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawPopups(ctx) {
    for (const q of this.popups) {
      const a = Math.min(1, q.life / q.maxLife + 0.1);
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      if (q.crit) {
        ctx.fillStyle = COLORS.danger;
        ctx.shadowColor = COLORS.danger;
        ctx.shadowBlur = 10;
        ctx.font = "16px 'Press Start 2P', monospace";
      } else {
        ctx.fillStyle = COLORS.white;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;
        ctx.font = "10px 'Press Start 2P', monospace";
      }
      ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.textAlign = 'start';
  }

  // Subtle scanlines + vignette drawn over the whole arena.
  drawCRT(ctx) {
    ctx.save();
    // scanlines
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#000';
    for (let y = 0; y < ARENA.height; y += 3) {
      ctx.fillRect(0, y, ARENA.width, 1);
    }
    ctx.globalAlpha = 1;
    // vignette
    const g = ctx.createRadialGradient(
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.3,
      ARENA.width / 2, ARENA.height / 2, ARENA.height * 0.75,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    ctx.restore();
  }

  reset() {
    this.particles.length = 0;
    this.popups.length = 0;
    this.shake = 0;
  }
}
