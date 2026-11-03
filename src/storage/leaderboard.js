// leaderboard.js — per-device top-N leaderboard in localStorage.
// Falls back to an in-memory list if localStorage is unavailable.
import { STORAGE_KEYS, LEADERBOARD_SIZE } from '../config.js';

let memoryFallback = null; // used only if localStorage throws

function load() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.leaderboard);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryFallback ? [...memoryFallback] : [];
  }
}

function save(list) {
  memoryFallback = [...list];
  try {
    window.localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(list));
  } catch {
    /* in-memory fallback already set */
  }
}

export function getScores() {
  return load().sort((a, b) => b.rounds - a.rounds).slice(0, LEADERBOARD_SIZE);
}

// Records a run. Returns { rank (1-based or null), isPersonalBest }.
export function addScore(rounds) {
  const list = load();
  const prevBest = list.reduce((m, e) => Math.max(m, e.rounds), 0);
  const entry = { rounds, date: new Date().toISOString() };
  list.push(entry);
  list.sort((a, b) => b.rounds - a.rounds);
  const trimmed = list.slice(0, LEADERBOARD_SIZE);
  save(trimmed);

  const rank = trimmed.indexOf(entry);
  return {
    rank: rank >= 0 ? rank + 1 : null,
    isPersonalBest: rounds > prevBest && rounds > 0,
  };
}
