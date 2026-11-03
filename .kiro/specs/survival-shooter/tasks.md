# Implementation Plan — Neon Siege

- [ ] 1. Project scaffold and runnable shell
  - Create `index.html` (canvas + overlay containers + module entry), `styles.css` (CRT page
    shell, fonts, menu/overlay styling), and `src/main.js` bootstrap.
  - Add `config.js` with all tunable constants (sizes, speeds, hp, damage=5, crit=0.15, crit×3,
    fire rate, reload time, magazine=10, round scaling, spawn interval / batch size, spawn radius).
  - Add a minimal `src/game.js` with a `requestAnimationFrame` loop clearing the canvas so the
    page runs and shows the arena background + grid.
  - _Requirements: 11.1, 10.1_

- [ ] 2. State machine and screen overlays
  - Implement `state.js` (MENU, TUTORIAL, PLAYING, PAUSED, GAMEOVER, LEADERBOARD) and wire state
    switching in `game.js`.
  - Build DOM overlays: Main Menu (title, Start, Leaderboard, How-to-play, mute), Pause, Game Over,
    Leaderboard, Tutorial. Toggle visibility by state.
  - Implement pause/resume on Esc/P.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 3. Input handling
  - Implement `input.js`: track held keys (WASD, R, P, Esc, M), mouse position mapped to canvas
    logical coords, and mouse button down/up/held. Ignore input outside PLAYING where required.
  - _Requirements: 3.1, 3.2, 3.4, 4.1, 4.5_

- [ ] 4. Player entity: movement, aiming, health
  - Implement `player.js` with normalized WASD movement, bounds clamping, aim angle from cursor,
    hp/maxHp. Draw via `sprites.js` player sprite rotated to aim; draw health bar above player.
  - _Requirements: 3.1, 3.2, 3.3, 8.1_

- [ ] 5. Sprites and effects foundation
  - Implement `render/sprites.js`: code-drawn player (cyan arrow + barrel + glow), melee (magenta
    diamond), ranged (amber ring), player/enemy bullets, muzzle flash.
  - Implement `render/effects.js`: particle/hit-flash/crit-popup system and scanline/vignette
    overlay.
  - _Requirements: 10.1, 5.3, 4.2_

- [ ] 6. Shooting, ammo, and reload
  - Implement `bullet.js` and player firing in `player.js`: fire-rate-gated shooting on click/hold,
    spawn cyan bullets, muzzle flash, decrement magazine.
  - Auto reload at 0 ammo (reload timer, firing disabled, restore to 10); manual reload on R.
  - HUD ammo pips/numeric + reload progress in `render/hud.js`.
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 7. Enemies and spawner
  - Implement `enemy.js` with Melee (high hp, slow, seek + close-range strike on cooldown) and
    Ranged (low hp, faster/short-range, mostly stationary, fires projectiles on cooldown) using
    `config.js` values.
  - Implement `systems/spawner.js`: per-round enemy **total** escalation + composition; gradual
    batched spawning on a spawn timer (small batches over time, never the whole wave at once, with
    higher rounds optionally spawning faster); random-direction spawn placement around the player
    at the arena perimeter (clamped in bounds); round-clear detection (budget exhausted + no
    enemies left), between-round delay, round increment.
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 8. Collision and combat (damage + crits)
  - Implement `systems/collision.js` (circle hit tests: player-bullet↔enemy, enemy-proj↔player,
    melee↔player).
  - Implement `systems/combat.js`: 5 base damage, 15% crit → 15 damage, enemy death resolution;
    player damage from melee/projectiles respecting cooldowns. Hook effects + damage numbers.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.2, 6.3, 6.5, 6.6, 8.2_

- [ ] 9. HUD: round number, health, banners
  - In `render/hud.js` render the current round number, player health bar (HUD mirror), ammo, and
    the "ROUND N" punch-in banner + new-wave feedback.
  - _Requirements: 7.7, 7.8, 8.1, 4.6_

- [ ] 10. Game over flow and run stats
  - Detect `hp <= 0` → GAMEOVER; compute `roundsSurvived` as highest round reached; show Game Over
    overlay with rounds survived and personal-best flag.
  - _Requirements: 8.3, 8.4, 1.3_

- [ ] 11. Local leaderboard and preferences
  - Implement `storage/leaderboard.js` (localStorage top-10, sorted desc, personal-best check) and
    `storage/prefs.js` (mute persistence + session tutorial flag), all try/catch-guarded.
  - Wire Game Over to record scores; Leaderboard overlay lists entries or empty-state.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 12. First-run tutorial screen
  - Show static tutorial overlay on first game of the session when session flag unset; dismiss sets
    session flag; Main Menu "How to play" reopens it. Content: WASD, aim, click/hold to shoot, auto
    reload every 10, goal = survive rounds, death ends game.
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 13. Audio: SFX and background music
  - Implement `audio/audio.js` (Web Audio): init on first user gesture; shoot/hit/crit/death/
    wave-start SFX; subtle looping music; mute toggle (M + UI) persisted via prefs; graceful no-op
    if AudioContext unavailable.
  - _Requirements: 10.2, 10.3, 10.4_

- [ ] 14. Polish, edge cases, and loop robustness
  - Fixed-timestep accumulator with dt clamp; canvas resize/letterbox to fixed logical resolution;
    optional auto-pause on blur; mouse-leave aim hold. Tune constants for difficulty feel.
  - _Requirements: 10.5, 3.3, 3.4_

- [ ] 15. Manual verification pass against acceptance criteria
  - Run through the playtest checklist (tutorial once/session, movement+aim, fire+flash+SFX, reload
    auto+manual, crits, melee vs ranged, enemies spawn gradually from random directions, round
    escalation + display, health + game over, leaderboard save/show, mute persist, runs from static
    server). Fix issues found.
  - _Requirements: all_

- [ ] 16. Documentation and GitHub repository
  - Write `README.md` (title, controls, how to run locally / static server command, leaderboard
    privacy note, credits) and `.gitignore`.
  - Initialize git, commit, create the **private** GitHub repo via
    `gh repo create neon-siege --private`, and push.
  - _Requirements: 11.2, 11.3, 11.4_
