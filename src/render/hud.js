// hud.js — in-canvas HUD: round number, ammo/reload, health, and wave banner.
import { COLORS, ARENA, PLAYER } from '../config.js';
import { clamp } from '../utils.js';

export class Hud {
  constructor() {
    this.banner = null; // { text, life, maxLife }
  }

  showBanner(text, duration = 1.8) {
    this.banner = { text, life: duration, maxLife: duration };
  }

  update(dt) {
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
  }

  reset() { this.banner = null; }

  draw(ctx, { round, player }) {
    ctx.save();

    // --- Round number (top-center) ---
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.cyan;
    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 10;
    ctx.font = "16px 'Press Start 2P', monospace";
    ctx.fillText(`ROUND ${round}`, ARENA.width / 2, 30);
    ctx.shadowBlur = 0;

    // --- Health (top-left) ---
    ctx.textAlign = 'left';
    const hx = 20;
    const hy = 20;
    const hw = 180;
    const hh = 14;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(hx - 2, hy - 2, hw + 4, hh + 4);
    const ratio = clamp(player.hp / player.maxHp, 0, 1);
    let hcolor = COLORS.mint;
    if (ratio < 0.3) hcolor = COLORS.danger;
    else if (ratio < 0.6) hcolor = COLORS.amber;
    ctx.fillStyle = hcolor;
    ctx.shadowColor = hcolor;
    ctx.shadowBlur = 8;
    ctx.fillRect(hx, hy, hw * ratio, hh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(244,242,255,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx, hy, hw, hh);
    ctx.fillStyle = COLORS.white;
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillText(`HP ${Math.ceil(player.hp)}`, hx, hy + hh + 16);

    // --- Ammo (bottom-left) ---
    const ax = 20;
    const ay = ARENA.height - 34;
    ctx.font = "10px 'Press Start 2P', monospace";
    if (player.reloading) {
      ctx.fillStyle = COLORS.amber;
      ctx.fillText('RELOADING', ax, ay);
      // reload progress bar
      const bw = 140;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(ax, ay + 8, bw, 8);
      ctx.fillStyle = COLORS.amber;
      ctx.shadowColor = COLORS.amber;
      ctx.shadowBlur = 6;
      ctx.fillRect(ax, ay + 8, bw * player.reloadRatio, 8);
      ctx.shadowBlur = 0;
    } else {
      // magazine pips
      const pip = 11;
      const gap = 4;
      for (let i = 0; i < PLAYER.magSize; i++) {
        const filled = i < player.magazine;
        ctx.fillStyle = filled ? COLORS.cyan : 'rgba(54,249,246,0.18)';
        if (filled) { ctx.shadowColor = COLORS.cyan; ctx.shadowBlur = 5; }
        ctx.fillRect(ax + i * (pip + gap), ay, pip, pip);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = COLORS.white;
      ctx.fillText(`${player.magazine}/${PLAYER.magSize}`, ax, ay + pip + 14);
    }

    // --- Wave banner (center punch-in) ---
    if (this.banner) {
      const b = this.banner;
      const t = b.life / b.maxLife;          // 1 -> 0
      const appear = clamp((1 - t) * 4, 0, 1); // quick punch-in
      const fade = clamp(t * 2, 0, 1);
      const alpha = Math.min(appear, fade);
      const scale = 0.85 + 0.15 * appear;
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(ARENA.width / 2, ARENA.height / 2);
      ctx.scale(scale, scale);
      ctx.fillStyle = COLORS.magenta;
      ctx.shadowColor = COLORS.magenta;
      ctx.shadowBlur = 20;
      ctx.font = "32px 'Press Start 2P', monospace";
      ctx.fillText(b.text, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }
}
