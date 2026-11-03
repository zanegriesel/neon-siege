// main.js — bootstrap: build the Game, wire DOM overlays, handle UI + audio init.
import { Game } from './game.js';
import { State } from './state.js';
import { AudioEngine } from './audio/audio.js';
import { getScores, addScore } from './storage/leaderboard.js';
import {
  isMuted, setMuted, hasSeenTutorial, markTutorialSeen,
  getName, setName, sanitizeName,
} from './storage/prefs.js';

const canvas = document.getElementById('game');
const overlays = {
  [State.MENU]: document.getElementById('menu'),
  [State.TUTORIAL]: document.getElementById('tutorial'),
  [State.PAUSED]: document.getElementById('pause'),
  [State.GAMEOVER]: document.getElementById('gameover'),
  [State.LEADERBOARD]: document.getElementById('leaderboard'),
};

const audio = new AudioEngine(isMuted());
let audioReady = false;
function ensureAudio() {
  if (!audioReady) {
    audio.init();
    audioReady = true;
  }
  audio.resume();
}

// --- UI helpers -------------------------------------------------------------
function hideAllOverlays() {
  for (const el of Object.values(overlays)) if (el) el.hidden = true;
}

function showOverlayFor(state) {
  hideAllOverlays();
  const el = overlays[state];
  if (el) el.hidden = false;
}

function updateMuteLabels() {
  const label = audio.muted ? 'Off' : 'On';
  document.querySelectorAll('[data-mute-label]').forEach((s) => { s.textContent = label; });
}

// --- Player name --------------------------------------------------------------
const nameInputs = document.querySelectorAll('[data-name-input]');

// Current name held in memory; persisted on change and when a run starts.
let playerName = getName();

function syncNameInputs(value) {
  nameInputs.forEach((el) => { if (el.value !== value) el.value = value; });
}

// Live-sync both inputs as the player types (without forcing cursor jumps),
// keeping the in-memory name current. Final sanitize happens on commit.
nameInputs.forEach((el) => {
  el.addEventListener('input', () => {
    playerName = el.value;
    nameInputs.forEach((other) => { if (other !== el) other.value = el.value; });
  });
  // Commit (sanitize + persist + normalize both fields) when focus leaves.
  el.addEventListener('change', commitName);
  el.addEventListener('blur', commitName);
});

function commitName() {
  playerName = setName(playerName);
  syncNameInputs(playerName);
}

// Escapes untrusted text before inserting into innerHTML.
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderLeaderboard() {
  const board = document.querySelector('[data-board]');
  const empty = document.querySelector('[data-board-empty]');
  const scores = getScores();
  board.innerHTML = '';
  if (scores.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  scores.forEach((s, i) => {
    const li = document.createElement('li');
    if (i === 0) li.classList.add('top');
    const date = new Date(s.date);
    const dateStr = Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const name = escapeHtml(sanitizeName(s.name));
    li.innerHTML =
      `<span class="name">${name}</span>` +
      `<span class="rounds">${s.rounds}</span>` +
      `<span>round${s.rounds === 1 ? '' : 's'}</span>` +
      `<span class="date">${dateStr}</span>`;
    board.appendChild(li);
  });
}

function showGameOver(rounds) {
  document.querySelector('[data-rounds]').textContent = rounds;
  const result = addScore(rounds, playerName);
  const bestEl = document.querySelector('[data-best]');
  const rankEl = document.querySelector('[data-rank]');
  bestEl.hidden = !result.isPersonalBest;
  if (result.rank) {
    rankEl.hidden = false;
    rankEl.textContent = `Ranked #${result.rank} on this device`;
  } else {
    rankEl.hidden = true;
  }
}

// --- Game wiring ------------------------------------------------------------
const game = new Game(canvas, audio, {
  onStateChange: (state) => showOverlayFor(state),
  onGameOver: (rounds) => showGameOver(rounds),
});

// Start a run, showing the tutorial first the first time this session.
function requestStart() {
  ensureAudio();
  commitName();
  if (!hasSeenTutorial()) {
    pendingStart = true;
    showOverlayFor(State.TUTORIAL);
    game.state = State.TUTORIAL; // park in tutorial; loop won't simulate
    return;
  }
  game.startRun();
}

let pendingStart = false;

// --- Button handling (event delegation) ------------------------------------
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  ensureAudio();

  switch (action) {
    case 'start':
      requestStart();
      break;
    case 'resume':
      game.resume();
      break;
    case 'quit':
      game.quitToMenu();
      break;
    case 'leaderboard':
      renderLeaderboard();
      showOverlayFor(State.LEADERBOARD);
      game.state = State.LEADERBOARD;
      break;
    case 'tutorial':
      pendingStart = false;
      showOverlayFor(State.TUTORIAL);
      game.state = State.TUTORIAL;
      break;
    case 'tutorial-dismiss':
      commitName();
      markTutorialSeen();
      if (pendingStart) {
        pendingStart = false;
        game.startRun();
      } else {
        game.quitToMenu(); // opened from menu "How to play"
      }
      break;
    case 'mute': {
      const next = !audio.muted;
      audio.setMuted(next);
      setMuted(next);
      updateMuteLabels();
      break;
    }
    default:
      break;
  }
});

// Keyboard handling for overlays, aware of text-input focus.
window.addEventListener('keydown', (e) => {
  const typing = e.target instanceof HTMLInputElement;

  if (game.state === State.TUTORIAL) {
    // While typing a name, let normal text editing happen; Enter confirms.
    if (typing) {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
        commitName();
        markTutorialSeen();
        if (pendingStart) { pendingStart = false; game.startRun(); }
        else { game.quitToMenu(); }
      }
      return;
    }
    // Any other key dismisses the tutorial.
    e.preventDefault();
    commitName();
    markTutorialSeen();
    if (pendingStart) { pendingStart = false; game.startRun(); }
    else { game.quitToMenu(); }
    return;
  }

  // On the menu, Enter in the name field starts a run.
  if (typing && e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
    if (game.state === State.MENU) requestStart();
    return;
  }

  // Don't fire shortcuts (mute) while editing text.
  if (typing) return;

  // Global mute toggle with M.
  if (e.key.toLowerCase() === 'm') {
    const next = !audio.muted;
    audio.setMuted(next);
    setMuted(next);
    updateMuteLabels();
  }
});

// --- Boot -------------------------------------------------------------------
updateMuteLabels();
syncNameInputs(playerName);
showOverlayFor(State.MENU);
game.state = State.MENU;

// Warm up the arcade webfont so the canvas HUD never flashes a fallback face.
if (document.fonts && document.fonts.load) {
  document.fonts.load("16px 'Press Start 2P'").catch(() => {});
}
