// prefs.js — mute preference (localStorage) + per-session tutorial flag (sessionStorage).
// All access is guarded so missing storage degrades gracefully.
import { STORAGE_KEYS } from '../config.js';

function safeLocalGet(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function safeLocalSet(key, value) {
  try { window.localStorage.setItem(key, value); } catch { /* ignore */ }
}
function safeSessionGet(key) {
  try { return window.sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key, value) {
  try { window.sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

export function isMuted() {
  return safeLocalGet(STORAGE_KEYS.mute) === '1';
}
export function setMuted(muted) {
  safeLocalSet(STORAGE_KEYS.mute, muted ? '1' : '0');
}

// Session-scoped: resets when the browser session/tab context ends.
export function hasSeenTutorial() {
  return safeSessionGet(STORAGE_KEYS.tutorialSeen) === '1';
}
export function markTutorialSeen() {
  safeSessionSet(STORAGE_KEYS.tutorialSeen, '1');
}
