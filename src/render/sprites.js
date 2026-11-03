// sprites.js — all sprites are drawn in code (no external images).
import { COLORS, PLAYER, MELEE, RANGED, BULLET } from '../config.js';
import { TAU } from '../utils.js';

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
function clearGlow(ctx) {
  ctx.shadowBlur = 0;
}

// Player: neon-cyan arrow fighter that points toward `angle`, with a barrel + glow.
export function drawPlayer(ctx, p, muzzleFlash) {
  const r = PLAYER.radius;
  ctx.save();
  ctx.translate(p.x, p.y);

  // ground glow halo
  glow(ctx, COLORS.cyan, 18);
  ctx.fillStyle = 'rgba(54, 249, 246, 0.12)';
  ctx.beginPath();
  ctx.arc(0, 0, r + 6, 0, TAU);
  ctx.fill();
  clearGlow(ctx);

  ctx.rotate(p.angle);

  // barrel
  ctx.strokeStyle = COLORS.cyan;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  glow(ctx, COLORS.cyan, 10);
  ctx.beginPath();
  ctx.moveTo(r * 0.4, 0);
  ctx.lineTo(r + 10, 0);
  ctx.stroke();

  // body: rounded arrow/triangle
  ctx.fillStyle = COLORS.cyan;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(-r * 0.8, -r * 0.8);
  ctx.lineTo(-r * 0.4, 0);
  ctx.lineTo(-r * 0.8, r * 0.8);
  ctx.closePath();
  ctx.fill();

  // inner core
  ctx.fillStyle = COLORS.void;
  ctx.beginPath();
  ctx.arc(-r * 0.1, 0, r * 0.28, 0, TAU);
  ctx.fill();
  clearGlow(ctx);

  // muzzle flash at barrel tip
  if (muzzleFlash > 0) {
    const t = muzzleFlash; // 0..1
    glow(ctx, COLORS.white, 16);
    ctx.fillStyle = `rgba(244, 242, 255, ${0.9 * t})`;
    ctx.beginPath();
    ctx.moveTo(r + 10, 0);
    ctx.lineTo(r + 10 + 14 * t, -7 * t);
    ctx.lineTo(r + 10 + 20 * t, 0);
    ctx.lineTo(r + 10 + 14 * t, 7 * t);
    ctx.closePath();
    ctx.fill();
    clearGlow(ctx);
  }

  ctx.restore();
}

// Melee enemy: solid magenta diamond, thick outline, chunky. Larger + tankier.
export function drawMelee(ctx, e) {
  const r = MELEE.radius;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.rotate(e.spin || 0);
  glow(ctx, COLORS.magenta, 14);
  ctx.fillStyle = COLORS.magenta;
  ctx.strokeStyle = '#ff8fd0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  clearGlow(ctx);
  // angry inner notch
  ctx.fillStyle = COLORS.void;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.35);
  ctx.lineTo(r * 0.35, r * 0.1);
  ctx.lineTo(-r * 0.35, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Ranged enemy: amber hollow ring with a center dot ("sniper"). Lighter, fragile.
export function drawRanged(ctx, e) {
  const r = RANGED.radius;
  ctx.save();
  ctx.translate(e.x, e.y);
  glow(ctx, COLORS.amber, 12);
  ctx.strokeStyle = COLORS.amber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  // center dot
  ctx.fillStyle = COLORS.amber;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, TAU);
  ctx.fill();
  clearGlow(ctx);
  // aiming tick toward player
  if (typeof e.aimAngle === 'number') {
    ctx.rotate(e.aimAngle);
    ctx.strokeStyle = 'rgba(255, 202, 58, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r, 0);
    ctx.lineTo(r + 6, 0);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawBullet(ctx, b) {
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.from === 'player') {
    ctx.rotate(Math.atan2(b.vy, b.vx));
    glow(ctx, COLORS.cyan, 10);
    ctx.fillStyle = COLORS.cyan;
    // capsule
    const len = 12;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -BULLET.playerRadius, len, BULLET.playerRadius * 2, BULLET.playerRadius);
    ctx.fill();
  } else {
    glow(ctx, COLORS.amber, 10);
    ctx.fillStyle = COLORS.amber;
    ctx.beginPath();
    ctx.arc(0, 0, BULLET.enemyRadius, 0, TAU);
    ctx.fill();
  }
  clearGlow(ctx);
  ctx.restore();
}

// Health bar drawn above an entity (player). ratio 0..1.
export function drawHealthBar(ctx, x, y, width, ratio) {
  const h = 5;
  const w = width;
  const left = x - w / 2;
  const top = y;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(left - 1, top - 1, w + 2, h + 2);
  // color shifts mint -> amber -> danger as health drops
  let color = COLORS.mint;
  if (ratio < 0.3) color = COLORS.danger;
  else if (ratio < 0.6) color = COLORS.amber;
  ctx.fillStyle = color;
  glow(ctx, color, 6);
  ctx.fillRect(left, top, Math.max(0, w * ratio), h);
  clearGlow(ctx);
  ctx.restore();
}
