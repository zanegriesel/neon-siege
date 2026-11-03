// input.js — keyboard + mouse tracking mapped to the canvas logical coordinate space.
import { ARENA } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();          // currently held key codes (lowercased)
    this.pressed = new Set();       // keys pressed since last consume()
    this.mouse = { x: ARENA.width / 2, y: ARENA.height / 2 };
    this.mouseDown = false;

    // Keyboard
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      // prevent page scroll on space / arrows while playing
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        e.preventDefault();
      }
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    // Mouse — convert client coords to logical arena coords accounting for CSS scaling.
    const updateMouse = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = ARENA.width / rect.width;
      const scaleY = ARENA.height / rect.height;
      this.mouse.x = (e.clientX - rect.left) * scaleX;
      this.mouse.y = (e.clientY - rect.top) * scaleY;
    };
    canvas.addEventListener('mousemove', updateMouse);
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; updateMouse(e); }
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    });
    // Stop firing if the pointer leaves the canvas; aim angle is held by the player.
    canvas.addEventListener('mouseleave', () => { this.mouseDown = false; });
  }

  isDown(key) { return this.keys.has(key); }

  // Returns true once per physical key press.
  consumePress(key) {
    if (this.pressed.has(key)) { this.pressed.delete(key); return true; }
    return false;
  }

  clearPresses() { this.pressed.clear(); }

  // Release all held state (used on pause / state change).
  releaseAll() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseDown = false;
  }
}
