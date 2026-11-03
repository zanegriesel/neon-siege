// prefs.js — mute preference + player name (localStorage) and a per-session
// tutorial flag (sessionStorage). All access is guarded so missing storage
// degrades gracefully.
import { STORAGE_KEYS, MAX_NAME_LENGTH, DEFAULT_NAME } from '../config.js';

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

// Normalizes a raw name: uppercase, allowed chars only, trimmed to max length.
// Empty / invalid input falls back to the default name.
export function sanitizeName(raw) {
  const cleaned = String(raw ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
  return cleaned || DEFAULT_NAME;
}

export function getName() {
  const stored = safeLocalGet(STORAGE_KEYS.name);
  return stored ? sanitizeName(stored) : DEFAULT_NAME;
}
export function setName(name) {
  const clean = sanitizeName(name);
  safeLocalSet(STORAGE_KEYS.name, clean);
  return clean;
}
