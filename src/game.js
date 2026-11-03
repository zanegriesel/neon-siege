// game.js — the Game: fixed-timestep loop, state machine, and orchestration.
import { ARENA, COLORS } from './config.js';
import { State } from './state.js';
import { Input } from './input.js';
import { Player } from './entities/player.js';
import { Spawner } from './systems/spawner.js';
import { resolveCollisions } from './systems/collision.js';
import { Effects } from './render/effects.js';
import { Hud } from './render/hud.js';
import {
  drawPlayer, drawMelee, drawRanged, drawBullet, drawHealthBar,
} from './render/sprites.js';

const FIXED_DT = 1 / 60;
const MAX_FRAME = 0.25; // clamp big gaps (tab refocus)

export class Game {
  constructor(canvas, audio, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.hooks = hooks; // { onStateChange(state), onGameOver(rounds) }
    this.input = new Input(canvas);

    this.state = State.MENU;
    this.player = new Player();
    this.spawner = new Spawner();
    this.effects = new Effects();
    this.hud = new Hud();
    this.enemies = [];
    this.bullets = [];
    this.round = 1;
    this.roundsSurvived = 0;

    this.accumulator = 0;
    this.lastTime = 0;
    this.gridPattern = null;

    this.loop = this.loop.bind(this);
    requestAnimationFrame((t) => { this.lastTime = t; requestAnimationFrame(this.loop); });

    // Auto-pause on blur during play.
    window.addEventListener('blur', () => {
      if (this.state === State.PLAYING) this.setState(State.PAUSED);
    });
  }

  setState(next) {
    this.state = next;
    this.input.releaseAll();
    this.hooks.onStateChange && this.hooks.onStateChange(next);
  }

  startRun() {
    this.player.reset();
    this.spawner.start();
    this.effects.reset();
    this.hud.reset();
    this.enemies = [];
    this.bullets = [];
    this.round = 1;
    this.roundsSurvived = 1;
    this.hud.showBanner('ROUND 1');
    this.audio.wave();
    this.audio.startMusic();
    this.setState(State.PLAYING);
  }

  resume() {
    if (this.state === State.PAUSED) this.setState(State.PLAYING);
  }

  quitToMenu() {
    this.audio.stopMusic();
    this.setState(State.MENU);
  }

  // ---- Fixed-timestep loop ----
  loop(now) {
    let frame = (now - this.lastTime) / 1000;
    this.lastTime = now;
    if (frame > MAX_FRAME) frame = MAX_FRAME;

    if (this.state === State.PLAYING) {
      this.accumulator += frame;
      while (this.accumulator >= FIXED_DT) {
        this.update(FIXED_DT);
        this.accumulator -= FIXED_DT;
      }
    } else {
      this.accumulator = 0;
    }

    this.render();
    this.input.clearPresses();
    requestAnimationFrame(this.loop);
  }

  update(dt) {
    const input = this.input;

    // pause toggle
    if (input.consumePress('escape') || input.consumePress('p')) {
      this.setState(State.PAUSED);
      return;
    }
    // manual reload
    if (input.consumePress('r')) {
      if (this.player.startReload()) this.audio.reload();
    }

    // player
    const moveX = (input.isDown('d') ? 1 : 0) - (input.isDown('a') ? 1 : 0);
    const moveY = (input.isDown('s') ? 1 : 0) - (input.isDown('w') ? 1 : 0);
    this.player.update(dt, {
      moveX, moveY,
      aimX: input.mouse.x, aimY: input.mouse.y,
      firing: input.mouseDown,
    }, {
      onShoot: (b) => { this.bullets.push(b); this.audio.shoot(); },
      onReloadStart: () => this.audio.reload(),
    });

    // spawner (gradual, random-direction)
    const spawned = this.spawner.update(dt, this.player, this.enemies.length, (round) => {
      this.round = round;
      this.roundsSurvived = Math.max(this.roundsSurvived, round);
      this.hud.showBanner(`ROUND ${round}`);
      this.audio.wave();
    });
    if (spawned.length) this.enemies.push(...spawned);

    // enemies
    for (const e of this.enemies) {
      e.update(dt, this.player, {
        onMeleeHit: (dmg) => {
          this.player.takeDamage(dmg);
          this.audio.playerHurt();
          this.effects.addShake(5);
        },
        onEnemyShoot: (b) => this.bullets.push(b),
      });
    }

    // bullets
    for (const b of this.bullets) b.update(dt);

    // collisions
    resolveCollisions(this, {
      onEnemyHit: (e, dmg, isCrit) => {
        this.effects.damageNumber(e.x, e.y - e.radius - 6, dmg, isCrit);
        this.effects.burst(e.x, e.y, isCrit ? COLORS.danger : COLORS.white, isCrit ? 12 : 6, isCrit ? 220 : 150);
        if (isCrit) { this.audio.crit(); this.effects.addShake(3); } else { this.audio.hit(); }
      },
      onEnemyKilled: (e) => {
        this.effects.burst(e.x, e.y, e.type === 'melee' ? COLORS.magenta : COLORS.amber, 16, 240);
        this.audio.death();
      },
      onPlayerHit: () => {
        this.audio.playerHurt();
        this.effects.addShake(4);
      },
    });

    // cull dead
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.bullets = this.bullets.filter(
      (b) => !b.dead && b.x > -20 && b.x < ARENA.width + 20 && b.y > -20 && b.y < ARENA.height + 20,
    );

    // effects + hud timers
    this.effects.update(dt);
    this.hud.update(dt);

    // death → game over
    if (this.player.dead) {
      this.audio.stopMusic();
      this.hooks.onGameOver && this.hooks.onGameOver(this.roundsSurvived);
      this.setState(State.GAMEOVER);
    }
  }

  // ---- Rendering ----
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, ARENA.width, ARENA.height);

    // background
    ctx.fillStyle = COLORS.void;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
    this.drawGrid(ctx);

    // Only render the world for in-play-ish states.
    const showWorld = this.state === State.PLAYING ||
                      this.state === State.PAUSED ||
                      this.state === State.GAMEOVER;

    if (showWorld) {
      const shake = this.effects.shakeOffset();
      ctx.save();
      ctx.translate(shake.x, shake.y);

      for (const b of this.bullets) drawBullet(ctx, b);
      for (const e of this.enemies) {
        if (e.type === 'melee') drawMelee(ctx, e); else drawRanged(ctx, e);
        // enemy hit flash
        if (e.hitFlash > 0) {
          ctx.save();
          ctx.globalAlpha = e.hitFlash * 5;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      if (!this.player.dead) {
        drawPlayer(ctx, this.player, this.player.muzzleFlash);
        // health bar above player
        drawHealthBar(ctx, this.player.x, this.player.y - this.player.radius - 14, 40, this.player.healthRatio);
        // hit flash overlay
        if (this.player.hitFlash > 0) {
          ctx.save();
          ctx.globalAlpha = this.player.hitFlash * 4;
          ctx.fillStyle = COLORS.danger;
          ctx.beginPath();
          ctx.arc(this.player.x, this.player.y, this.player.radius + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      this.effects.drawParticles(ctx);
      this.effects.drawPopups(ctx);
      ctx.restore();

      // HUD (not shaken)
      this.hud.draw(ctx, { round: this.round, player: this.player });
    }

    // CRT overlay always
    this.effects.drawCRT(ctx);
  }

  drawGrid(ctx) {
    ctx.save();
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const step = 40;
    ctx.beginPath();
    for (let x = 0; x <= ARENA.width; x += step) {
      ctx.moveTo(x, 0); ctx.lineTo(x, ARENA.height);
    }
    for (let y = 0; y <= ARENA.height; y += step) {
      ctx.moveTo(0, y); ctx.lineTo(ARENA.width, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}
