// main.js — bootstrap: build the Game, wire DOM overlays, handle UI + audio init.
import { Game } from './game.js';
import { State } from './state.js';
import { AudioEngine } from './audio/audio.js';
import { getScores, addScore } from './storage/leaderboard.js';
import { isMuted, setMuted, hasSeenTutorial, markTutorialSeen } from './storage/prefs.js';

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
  const label = audio.muted ? 'off' : 'on';
  document.querySelectorAll('[data-mute-label]').forEach((s) => { s.textContent = label; });
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
    li.innerHTML =
      `<span class="rounds">${s.rounds}</span>` +
      `<span>round${s.rounds === 1 ? '' : 's'}</span>` +
      `<span class="date">${dateStr}</span>`;
    board.appendChild(li);
  });
}

function showGameOver(rounds) {
  document.querySelector('[data-rounds]').textContent = rounds;
  const result = addScore(rounds);
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

// Allow dismissing the tutorial with any key when it's showing.
window.addEventListener('keydown', (e) => {
  if (game.state === State.TUTORIAL) {
    e.preventDefault();
    markTutorialSeen();
    if (pendingStart) { pendingStart = false; game.startRun(); }
    else { game.quitToMenu(); }
    return;
  }
  // Global mute toggle with M (outside active typing).
  if (e.key.toLowerCase() === 'm') {
    const next = !audio.muted;
    audio.setMuted(next);
    setMuted(next);
    updateMuteLabels();
  }
});

// --- Boot -------------------------------------------------------------------
updateMuteLabels();
showOverlayFor(State.MENU);
game.state = State.MENU;
