# Requirements — Neon Siege

## Overview

Neon Siege is a 2D, retro-style, top-down survival shooter that runs entirely in the
browser with no backend. A single player survives waves ("rounds") of enemies that grow
progressively more intense. The player aims with the mouse, moves with WASD, and shoots a
gun with unlimited ammo that reloads every 10 bullets. The game tracks how many rounds the
player survives and records results to a local (per-device) leaderboard. All assets —
sprites, sound effects, and background music — are generated procedurally or embedded so the
game is fully self-contained and runnable offline from `file://` or a static host.

## Terminology

- **Round / Wave** — a batch of enemies spawned together. Clearing all enemies in a round
  advances to the next round.
- **Local leaderboard** — a ranked list of best runs stored in the browser's `localStorage`,
  scoped to the player's device/browser. No network, no global ranking.
- **Session** — the lifetime of the loaded page until reload.

---

## Requirement 1 — Game shell and screens

**User story:** As a player, I want clear screens for starting, playing, and reviewing my
run so that I always understand what state the game is in.

### Acceptance Criteria

1. WHEN the game loads THEN the system SHALL display a Main Menu with the game title, a
   "Start" action, a "Leaderboard" action, and a visible control hint.
2. WHEN the player starts a game THEN the system SHALL transition to the Playing state and
   begin round 1.
3. WHEN the player dies THEN the system SHALL transition to a Game Over screen that shows the
   rounds survived and whether the run earned a leaderboard place.
4. WHEN the player is in any non-playing screen THEN the system SHALL provide a way to return
   to the Main Menu or start a new run.
5. WHEN the player presses a pause key (Esc or P) during play THEN the system SHALL pause the
   simulation and show a paused overlay, and resuming SHALL continue from the same state.

## Requirement 2 — First-run tutorial screen

**User story:** As a first-time player, I want a one-time visual explanation of the controls
and goal so that I know how to play before I start.

### Acceptance Criteria

1. WHEN the game is opened for the first time in a session AND no tutorial-seen flag exists
   for the session THEN the system SHALL display a static (non-interactive) tutorial screen
   before the first game starts.
2. WHEN the tutorial screen is shown THEN it SHALL describe: WASD to move, mouse to aim,
   click/hold to shoot, automatic reload every 10 bullets, the goal (survive rounds), and
   that the game ends on death.
3. WHEN the player dismisses the tutorial (e.g. "Got it" / any key) THEN the system SHALL set
   a session flag so the tutorial is not shown again during the same session.
4. WHEN a new session begins (page reloaded / reopened) THEN the tutorial SHALL be eligible to
   show again, because the flag is session-scoped not permanent.
5. WHEN the player wants to review controls later THEN the Main Menu SHALL offer a way to view
   the tutorial again on demand.

## Requirement 3 — Player movement and aiming

**User story:** As a player, I want responsive movement and aiming so that combat feels fair
and precise.

### Acceptance Criteria

1. WHEN the player holds W/A/S/D THEN the player sprite SHALL move up/left/down/right
   respectively, and diagonal movement SHALL be normalized so it is not faster than cardinal
   movement.
2. WHEN the mouse moves THEN the player sprite SHALL rotate/orient to face the cursor and the
   aim direction SHALL follow the cursor.
3. WHEN the player reaches the edge of the play area THEN the system SHALL clamp the player
   inside the bounds.
4. WHEN the game is paused or not in the Playing state THEN movement and aiming input SHALL be
   ignored.

## Requirement 4 — Shooting, ammo, and reload

**User story:** As a player, I want a satisfying gun with a reload cadence so that combat has
rhythm and feedback.

### Acceptance Criteria

1. WHEN the player clicks or holds the mouse button AND the magazine has ammo AND no reload is
   in progress THEN the system SHALL fire a bullet toward the aim direction at a fixed fire
   rate (rate-limited while held).
2. WHEN a bullet is fired THEN the system SHALL play a shooting sound effect and show a visual
   indicator (muzzle flash and/or visible projectile) so firing is obvious.
3. WHEN the magazine reaches 10 bullets fired (empty) THEN the system SHALL automatically begin
   a reload that takes a fixed duration, during which firing is disabled.
4. WHILE a reload is in progress THEN the system SHALL show a reload indicator (e.g. text,
   progress bar, or sound) and SHALL restore the magazine to full on completion.
5. WHEN the player manually presses the reload key (R) with a non-full magazine THEN the system
   SHALL begin a reload.
6. WHEN the current ammo state changes THEN an on-screen ammo/magazine readout SHALL reflect it.

## Requirement 5 — Damage model and critical strikes

**User story:** As a player, I want consistent damage with occasional big hits so that combat
has variety.

### Acceptance Criteria

1. WHEN a player bullet hits an enemy THEN it SHALL deal 5 base damage.
2. WHEN a hit occurs THEN it SHALL have a 15% chance to be a critical strike dealing 3× damage
   (15 damage).
3. WHEN a critical strike occurs THEN the system SHALL show a distinct visual indicator (e.g.
   larger/colored damage feedback) so crits are recognizable.
4. WHEN an enemy's health reaches 0 or below THEN the enemy SHALL be destroyed and removed from
   the round, with a death visual and sound.

## Requirement 6 — Enemies (melee and ranged)

**User story:** As a player, I want two distinct enemy types so that each round requires
different tactics.

### Acceptance Criteria

1. WHEN enemies are spawned THEN the system SHALL support two types: melee and ranged, each with
   a visually distinct sprite.
2. WHEN a melee enemy is active THEN it SHALL move toward the player and, at close range, strike
   the player for melee damage on a cooldown.
3. WHEN a ranged enemy is active THEN it SHALL remain relatively stationary (minimal movement),
   keep its distance, and fire projectiles at the player on a cooldown.
4. WHEN comparing the two types THEN melee enemies SHALL have higher health and lower movement
   speed, and ranged enemies SHALL have lower health and move faster but travel only short
   distances.
5. WHEN an enemy projectile hits the player THEN it SHALL reduce player health and SHALL be
   removed.
6. WHEN an enemy contacts or strikes the player THEN it SHALL reduce player health subject to the
   attack cooldown so damage is not applied every frame.

## Requirement 7 — Rounds and escalating difficulty

**User story:** As a player, I want rounds to get harder so that survival feels like an
achievement.

### Acceptance Criteria

1. WHEN a round begins THEN the system SHALL determine a total number of enemies to spawn for that
   round that increases with the round number.
2. WHEN the round number increases THEN enemy intensity SHALL escalate (more enemies and/or a
   higher share of enemies, scaling difficulty over time).
3. WHEN a round is in progress THEN the system SHALL spawn that round's enemies gradually over time
   in batches rather than all at once, until the round's total has been spawned.
4. WHEN the spawn rate or batch size is determined THEN higher rounds MAY spawn enemies faster, but
   the game SHALL NOT spawn an entire wave's enemies simultaneously.
5. WHEN an enemy spawns THEN its spawn position SHALL be chosen randomly around the player from any
   direction (not a fixed set of edges), at a distance far enough to be off-screen or at the arena
   perimeter, and SHALL be clamped inside the arena bounds.
6. WHEN all of the current round's enemies have been spawned AND all are destroyed THEN the system
   SHALL advance to the next round after a short interval.
7. WHEN the current round changes THEN the on-screen round number SHALL update immediately.
8. WHEN a new round starts THEN the system SHALL give brief visual/audio feedback that a new
   wave is beginning.

## Requirement 8 — Player health and game over

**User story:** As a player, I want to see my health and have the run end on death so that risk
is meaningful.

### Acceptance Criteria

1. WHEN the game is playing THEN a health bar SHALL be rendered above the player sprite and track
   the player's current health.
2. WHEN the player takes damage THEN the health bar SHALL update and brief hit feedback SHALL be
   shown (e.g. flash and/or sound).
3. WHEN player health reaches 0 THEN the game SHALL end and transition to Game Over.
4. WHEN the game ends THEN the final rounds-survived value SHALL be the highest round reached
   during the run.

## Requirement 9 — Local leaderboard and persistence

**User story:** As a player, I want my best runs saved on my device so that I can try to beat
them.

### Acceptance Criteria

1. WHEN a run ends THEN the system SHALL record the rounds survived (and timestamp) to a local
   leaderboard stored in `localStorage` on the player's device.
2. WHEN recording a result THEN the system SHALL keep a ranked top-N list (highest rounds first)
   and persist it across sessions.
3. WHEN the player opens the Leaderboard THEN the system SHALL display the stored ranked results.
4. WHEN no scores exist THEN the Leaderboard SHALL show an empty-state message inviting the
   player to start a run.
5. WHEN a run achieves a new best THEN the Game Over screen SHALL indicate a new personal best.
6. IF `localStorage` is unavailable THEN the game SHALL still be playable for the session and
   SHALL degrade gracefully without crashing.

## Requirement 10 — Art, audio, and retro presentation

**User story:** As a player, I want clear retro visuals and audio feedback so that the game is
readable and satisfying.

### Acceptance Criteria

1. WHEN the game renders THEN the player, melee enemy, and ranged enemy SHALL each use a simple,
   distinct, retro-style sprite defined within the project (no external image downloads required
   at runtime).
2. WHEN the player shoots THEN both a sound effect and a visual indicator SHALL make firing
   obvious.
3. WHEN the game is playing THEN subtle looping background music SHALL play.
4. WHEN the player wants silence THEN the system SHALL provide a mute/volume control, and audio
   SHALL respect the browser autoplay policy (starting after a user gesture).
5. WHEN rendered on a typical desktop browser THEN the game SHALL maintain smooth animation via a
   fixed-timestep or delta-timed game loop.

## Requirement 11 — Local build, run, and source control

**User story:** As the owner, I want the game to run locally and live in a GitHub repo so that
the code is versioned and shareable.

### Acceptance Criteria

1. WHEN the project is built THEN it SHALL run locally in a modern desktop browser from a static
   file server (and ideally directly from `file://`).
2. WHEN the repository is created THEN all source, assets-generation code, and a README with run
   instructions SHALL be committed to a new GitHub repository.
3. WHEN a visitor reads the README THEN it SHALL explain controls, how to run locally, and the
   leaderboard/privacy note (data stored only on the local device).
4. WHEN the code is committed THEN it SHALL not include secrets or credentials.
