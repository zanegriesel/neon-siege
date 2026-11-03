# Design — Neon Siege

## 1. Goal and approach

Neon Siege is a single-file-friendly, zero-backend, browser game. It renders to an HTML5
`<canvas>` with a fixed-timestep game loop. All sprites are drawn in code (vector/pixel shapes
on canvas) so there are no external image downloads. All audio — shooting SFX, hit/death cues,
new-wave stinger, and looping background music — is synthesized with the Web Audio API, so the
game is fully self-contained and works offline.

Design priorities, in order: (1) correct, readable gameplay; (2) obvious shooting feedback
(sound + muzzle flash + visible projectiles); (3) clean retro-arcade presentation; (4) graceful
degradation when `localStorage`/audio are unavailable.

## 2. Technology choices

- **Rendering:** HTML5 Canvas 2D context. Simplest path to crisp retro vector/pixel sprites and
  smooth motion; no build step or WebGL complexity required.
- **Language/tooling:** Plain ES modules + vanilla JavaScript, no framework and no bundler. This
  keeps the game runnable from a static server and avoids a toolchain. (A tiny dev server command
  is documented for browsers that restrict ES modules on `file://`.)
- **Audio:** Web Audio API. Oscillator/noise-based SFX and a short looping chiptune sequence —
  no audio files to ship.
- **Persistence:** `localStorage` for the leaderboard and the "mute" preference. Session flag for
  the tutorial uses an in-memory/`sessionStorage` value so it resets each session.

Rationale: the brief calls for a small, local, retro game. A framework or asset pipeline would add
weight without benefit. Vanilla + canvas + Web Audio is the most robust "runs anywhere locally"
choice.

## 3. Visual identity (retro-arcade CRT)

Deliberately avoiding generic AI-design defaults (cream/terracotta, SaaS cards). The look is a dark
CRT arcade cabinet with neon phosphor glow.

**Palette (named tokens):**
- `--void` `#0a0612` — near-black deep-purple background (play field).
- `--grid` `#1b1030` — subtle grid lines on the arena floor.
- `--cyan` `#36f9f6` — player + player bullets + primary UI accents (neon cyan).
- `--magenta` `#ff3caa` — melee enemy (hot pink, "heavy/aggressive").
- `--amber` `#ffca3a` — ranged enemy + ammo readout (caution amber).
- `--danger` `#ff4d4d` — damage, low-health, crit emphasis.
- `--mint` `#8affc1` — health bar / positive feedback.

**Type:**
- Display/title: `"Press Start 2P"` if available via a bundled/webfont fallback, otherwise a
  monospace stack (`"Courier New", monospace`) rendered chunky — used for the title and big round
  callouts only.
- HUD/body: system UI sans (`system-ui, "Segoe UI", sans-serif`) for readable small numbers and
  menu copy. Two clearly distinct roles: blocky arcade display vs. clean sans HUD.

**Signature treatment (spend boldness here):** a soft neon glow (canvas `shadowBlur`) on the player,
bullets, and the round-start banner, plus a faint scanline/vignette overlay on the canvas. One
orchestrated motion moment: the "ROUND N" banner punches in and fades at each wave start. Hit
feedback and crits are the other place color goes loud; the HUD stays quiet.

## 4. Sprite design (all code-drawn)

Each sprite is drawn by a function given `(ctx, x, y, angle, scale)`. Kept intentionally simple and
distinct so types are readable at a glance.

- **Player** — a neon-cyan rounded triangle/arrow ("ship/soldier") that rotates to face the cursor,
  with a short barrel line indicating aim direction and a glow. A small muzzle point at the barrel
  tip is where muzzle flash renders.
  ```
      /\        cyan body, points toward cursor
     /  \       barrel line + muzzle tip at front
    /____\      glow halo underneath
  ```
- **Melee enemy** — a magenta filled square/diamond with an angry inner notch; chunky to read as
  "heavy". Slightly larger. Moves steadily toward the player.
  ```
    [#]   solid magenta diamond, thick outline, slow + tanky
  ```
- **Ranged enemy** — an amber hollow circle/hexagon with a small aiming dot; lighter, "sniper".
  Mostly stationary, fires amber projectiles.
  ```
    (o)   amber ring with a center dot, fragile, shoots from afar
  ```
- **Bullets** — player bullets are short bright cyan capsules with a trail; enemy projectiles are
  small amber dots. Muzzle flash is a brief expanding cyan arc at the barrel tip.

## 5. Architecture

### 5.1 Module layout

```
neon-siege/
  index.html            # canvas, font links, entry <script type="module">
  styles.css            # page shell, CRT frame, fonts, non-canvas UI (menus/overlays)
  src/
    main.js             # bootstrap: create Game, wire DOM overlays, start loop
    game.js             # Game: state machine + fixed-timestep loop + orchestration
    state.js            # GameState enum: MENU, TUTORIAL, PLAYING, PAUSED, GAMEOVER, LEADERBOARD
    input.js            # keyboard + mouse tracking (keys set, mouse pos, buttons)
    entities/
      player.js         # Player: movement, aiming, shooting, ammo/reload, health
      enemy.js          # Enemy base + Melee + Ranged behaviors
      bullet.js         # Bullet (player + enemy), movement, lifetime
    systems/
      spawner.js        # round/wave logic: totals, gradual batched spawning on a timer,
                        # random-direction spawn placement, escalation
      collision.js      # circle-based hit tests (bullet↔enemy, enemy/proj↔player)
      combat.js         # damage calc incl. 15% crit → 3×, death resolution
    render/
      sprites.js        # code-drawn player/melee/ranged/bullet + muzzle flash
      hud.js            # round number, ammo/reload, player health bar, banners
      effects.js        # particles, hit flashes, crit popups, scanline overlay
    audio/
      audio.js          # Web Audio engine: SFX (shoot/hit/death/wave) + music loop, mute
    storage/
      leaderboard.js    # localStorage top-N read/write, personal-best check
      prefs.js          # mute preference persist; session tutorial flag
    config.js           # tunable constants (speeds, health, damage, crit, fire rate, scaling)
```

### 5.2 Game loop and state machine

- **Fixed timestep** accumulator (e.g. 60 updates/sec) for deterministic physics; render each
  animation frame via `requestAnimationFrame`. Delta clamped to avoid spiral-of-death on tab
  refocus.
- **States:** `MENU → TUTORIAL(optional) → PLAYING ⇄ PAUSED → GAMEOVER → (MENU | LEADERBOARD)`.
  Only `PLAYING` advances the simulation; other states render static overlays (DOM) over a frozen
  or dimmed canvas.
- DOM overlays (menu, tutorial, pause, game over, leaderboard) are plain HTML/CSS layered above the
  canvas and toggled by state, so text stays crisp and accessible; the arena itself is canvas.

### 5.3 Core data (per run)

- `player`: `{ x, y, angle, speed, hp, maxHp, magazine, magSize=10, reloading, reloadTimer,
  fireCooldown }`
- `enemies[]`, `bullets[]` (tagged player/enemy), `effects[]`
- `round`: current round number; `enemiesRemaining`; `betweenRounds` timer
- `stats`: `{ roundsSurvived }` (= highest round reached)

## 6. Key mechanics detail

### 6.1 Movement & aiming (Req 3)
- Velocity from WASD, normalized diagonal (`/√2`), multiplied by `player.speed` and dt. Position
  clamped to arena bounds minus radius.
- `angle = atan2(mouseY - player.y, mouseX - player.x)`; player sprite drawn rotated to `angle`.

### 6.2 Shooting, ammo, reload (Req 4)
- Fire on mouse-down and while held, gated by `fireCooldown` (fire rate). Each shot: spawn cyan
  bullet along `angle`, muzzle flash effect, shoot SFX, `magazine--`.
- When `magazine === 0` → auto reload: set `reloading=true`, `reloadTimer=RELOAD_TIME`; firing
  disabled; show reload indicator; on completion `magazine = magSize`, `reloading=false`.
- Manual reload (`R`) allowed when `magazine < magSize` and not already reloading.
- HUD shows magazine as `●●●●●●●●●●` pips + numeric, and a reload progress bar while reloading.

### 6.3 Damage & crits (Req 5)
- On bullet↔enemy hit: `dmg = 5`; `isCrit = Math.random() < 0.15` → `dmg = 15`.
- Spawn floating damage number (white for normal, large `--danger` for crit) + hit particles +
  hit SFX. Enemy `hp -= dmg`; if `hp <= 0` → death effect + death SFX + removed.

### 6.4 Enemies (Req 6) — tunable in `config.js`
| Type   | HP   | Speed  | Behavior                                            | Attack |
|--------|------|--------|-----------------------------------------------------|--------|
| Melee  | high | slow   | seeks player; strikes at close range on cooldown    | contact melee dmg, cooldown-gated |
| Ranged | low  | faster but short-range drift; mostly holds position | fires amber projectile toward player on cooldown |

- Melee: steer toward player each tick; when distance < `meleeRange`, apply melee damage subject to
  `attackCooldown` (not every frame).
- Ranged: maintain preferred distance (small repositioning only); on `shootCooldown` spawn an enemy
  projectile aimed at the player's current position.
- Enemy projectile↔player and melee↔player damage both respect cooldowns so HP isn't drained per
  frame.

### 6.5 Rounds & escalation (Req 7)
- `enemyCount(round) = BASE + round * PER_ROUND` (e.g. `3 + round*2`), with an optional cap and a
  rising ranged:melee ratio as rounds climb. This is the round's **total**, not a simultaneous
  spawn.
- **Gradual spawning:** the spawner holds a per-round "remaining to spawn" budget and releases
  enemies in small batches on a spawn timer (e.g. 1–3 enemies every `SPAWN_INTERVAL`), so a wave
  trickles in rather than appearing at once. Higher rounds may shorten the interval / enlarge the
  batch (tunable in `config.js`), but never dump the whole wave instantly.
- **Random-direction spawning:** each enemy spawns at a random angle `θ ∈ [0, 2π)` around the
  player at a spawn radius placed at/just beyond the arena perimeter (off-screen where possible),
  then clamped inside arena bounds. No fixed edge set — enemies can come from any direction.
- A round is cleared only when the spawn budget is exhausted **and** no enemies remain; then a short
  `betweenRounds` delay → `round++`, "ROUND N" banner + wave stinger, and the next wave's budget is
  set.
- `stats.roundsSurvived = max(roundsSurvived, round)` so game-over reports the highest round.

### 6.6 Health & game over (Req 8)
- Health bar drawn in canvas just above the player sprite (mint→danger gradient by ratio); also a
  mirrored HUD bar. Damage → flash + SFX. `hp <= 0` → GAMEOVER, record result.

### 6.7 Leaderboard & persistence (Req 9)
- `leaderboard.js`: key `neon-siege:leaderboard`, value JSON array of `{ rounds, date }`, sorted
  desc, trimmed to top 10. `addScore()` returns `{ rank, isPersonalBest }`.
- Game Over shows rounds survived, rank (if any), and a "NEW BEST" flag. Leaderboard screen lists
  entries or an empty-state. All wrapped in try/catch so missing `localStorage` degrades to
  in-memory only.

### 6.8 Tutorial (Req 2)
- On first entry to the game this session, if `sessionStorage['neon-siege:tutorialSeen']` is unset,
  show the static tutorial overlay before `PLAYING`. Dismiss sets the flag (session-scoped → shows
  again next session). Main Menu has a "How to play" button to reopen it anytime.

### 6.9 Audio (Req 10)
- `audio.js` lazily creates `AudioContext` on first user gesture (menu click) to satisfy autoplay
  policy. SFX: shoot (short square blip), hit (noise burst), crit (brighter), death (downward
  sweep), wave-start (two-note stinger). Music: a short looping arpeggio on a low-gain
  oscillator/sequence. Mute toggle (`M` and a UI button) persisted via `prefs.js`.

## 7. Error handling & edge cases

- `localStorage`/`sessionStorage` access wrapped in try/catch; failures fall back to in-memory and
  never crash gameplay.
- `AudioContext` creation failure → game runs silently.
- Tab blur / large frame gaps → dt clamp prevents physics explosions; optional auto-pause on blur.
- Window resize → canvas resizes to a fixed logical resolution scaled to fit (letterboxed) to keep
  gameplay consistent.
- Mouse leaving canvas → aim holds last angle; firing stops on mouse-up.

## 8. Testing strategy

Because the brief does not request automated tests, verification is primarily manual against the
acceptance criteria, with a few pure-function checks kept easy to add later:
- **Pure logic (manually verifiable / unit-friendly):** crit probability distribution (~15% over N
  rolls), `enemyCount(round)` escalation is monotonic, gradual-spawn budget never releases a whole
  wave at once (batch ≤ cap and total-over-time equals the round total), random spawn placement
  stays within arena bounds, leaderboard sort/trim/top-N and personal-best detection,
  diagonal-movement normalization.
- **Manual playtest checklist** mapped to requirements: tutorial shows once per session; WASD +
  aim; fire + muzzle flash + SFX; auto reload at 10 shots and manual `R`; crit visuals; melee vs.
  ranged behavior and stats; enemies trickle in gradually (not all at once) and arrive from random
  directions; round number updates and escalation; health bar + game over; score saved and shown;
  mute works and persists; runs offline/static.
- Cross-check in at least one Chromium and one Firefox build.

## 9. Mapping to requirements

| Requirement | Covered by |
|-------------|-----------|
| 1 Shell/screens | state.js, game.js, DOM overlays |
| 2 Tutorial | prefs.js (session flag), tutorial overlay, menu button |
| 3 Movement/aim | input.js, player.js |
| 4 Shooting/ammo/reload | player.js, hud.js, audio.js |
| 5 Damage/crit | combat.js, effects.js |
| 6 Enemies | enemy.js, spawner.js, collision.js |
| 7 Rounds/escalation | spawner.js, game.js, hud.js |
| 8 Health/game over | player.js, hud.js, game.js |
| 9 Leaderboard | leaderboard.js, overlays |
| 10 Art/audio | sprites.js, effects.js, audio.js |
| 11 Local/run/repo | index.html, README, git/gh setup |
