# Neon Siege

A 2D, retro-style, top-down survival shooter that runs entirely in your browser. No backend,
no build step, no assets to download — every sprite is drawn in code and every sound is
synthesized with the Web Audio API. Hold the line as waves of enemies pour in from every
direction and get more intense each round.

![type: browser game](https://img.shields.io/badge/type-browser%20game-36f9f6)
![stack: vanilla JS + Canvas](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Canvas-ff3caa)

## How to play

| Control            | Action                                              |
| ------------------ | --------------------------------------------------- |
| **W A S D**        | Move your fighter                                   |
| **Mouse**          | Aim — your fighter always faces the cursor          |
| **Click / hold**   | Fire your gun                                       |
| **R**              | Reload (the gun also auto-reloads every 10 shots)   |
| **Esc / P**        | Pause / resume                                      |
| **M**              | Mute / unmute                                       |

**Goal:** survive as many rounds as you can. Each round spawns more enemies, trickling in
gradually from random directions. The game ends when your health runs out.

### Enemies

- **Rushers** (magenta diamonds) — tanky and slow. They charge you and strike at close range.
- **Snipers** (amber rings) — fragile and mostly stationary. They hold their distance and
  shoot at you from afar.

### Combat

- Each hit deals **5 damage**, with a **15% chance** of a **critical strike** for **3× damage** (15).
- The gun has a 10-round magazine and reloads automatically when empty, or manually with **R**.

## Running locally

The game uses ES modules, so it should be served over HTTP (most browsers block modules on
`file://`). Any static server works. This repo includes a tiny zero-dependency one:

```bash
node serve.mjs
# then open http://localhost:8173
```

Or use anything else you like, for example:

```bash
npx http-server -p 8173 .
# or
python -m http.server 8173
```

Then open `http://localhost:8173` in a modern desktop browser (Chrome/Edge/Firefox).

> Audio starts after your first click (browser autoplay policy). Click **Start run** and you're good.

## Leaderboard & privacy

Neon Siege keeps a **local leaderboard** of your best runs. It is stored only in your browser's
`localStorage` on this device — there is **no account, no server, and no global leaderboard**.
Clearing your browser data clears your scores. If storage is unavailable, the game still plays;
scores just won't persist.

## Project structure

```
index.html            # canvas + overlay screens
styles.css            # arcade/CRT page shell and menu styling
serve.mjs             # tiny static dev server (no dependencies)
src/
  main.js             # bootstrap: wires DOM overlays, audio, and the game
  game.js             # fixed-timestep loop + state machine + orchestration
  config.js           # all tunable constants
  state.js, input.js, utils.js
  entities/           # player, enemy (melee + ranged), bullet
  systems/            # spawner (gradual/random waves), collision, combat (crits)
  render/             # sprites, hud, effects (particles, CRT overlay)
  audio/              # Web Audio SFX + looping music
  storage/            # localStorage leaderboard + preferences
.kiro/specs/          # the requirements / design / tasks this was built from
```

## Tech

Vanilla JavaScript (ES modules), HTML5 Canvas 2D, and the Web Audio API. No frameworks, no
bundler, no external runtime assets.
