// audio.js — Web Audio engine. Procedural SFX + a subtle looping chiptune.
// Lazily initialized on first user gesture to satisfy autoplay policy.
// Degrades to a silent no-op if Web Audio is unavailable.
import { AUDIO } from '../config.js';

export class AudioEngine {
  constructor(muted = false) {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.muted = muted;
    this.musicTimer = null;
    this.musicStep = 0;
    this.started = false;
  }

  // Must be called from a user gesture handler.
  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : AUDIO.masterVolume;
      this.master.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = AUDIO.sfxVolume;
      this.sfxGain.connect(this.master);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = AUDIO.musicVolume;
      this.musicGain.connect(this.master);
    } catch {
      this.ctx = null;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.masterVolume, this.ctx.currentTime, 0.02);
    }
  }

  // --- SFX ---------------------------------------------------------------
  _tone({ type = 'square', freq = 440, dur = 0.1, gain = 0.3, slideTo = null, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.15, gain = 0.3, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 800;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
    src.stop(t0 + dur);
  }

  shoot() { this._tone({ type: 'square', freq: 720, slideTo: 180, dur: 0.09, gain: 0.22 }); }
  hit()   { this._noise({ dur: 0.08, gain: 0.18 }); }
  crit()  {
    this._tone({ type: 'sawtooth', freq: 300, slideTo: 900, dur: 0.12, gain: 0.25 });
    this._noise({ dur: 0.1, gain: 0.2 });
  }
  death() { this._tone({ type: 'sawtooth', freq: 400, slideTo: 60, dur: 0.35, gain: 0.3 }); }
  reload() {
    this._tone({ type: 'square', freq: 180, dur: 0.06, gain: 0.18 });
    this._tone({ type: 'square', freq: 320, dur: 0.08, gain: 0.2, delay: 0.14 });
  }
  wave() {
    this._tone({ type: 'triangle', freq: 440, dur: 0.14, gain: 0.3 });
    this._tone({ type: 'triangle', freq: 660, dur: 0.18, gain: 0.3, delay: 0.14 });
  }
  playerHurt() { this._tone({ type: 'sawtooth', freq: 160, slideTo: 90, dur: 0.18, gain: 0.28 }); }

  // --- Music: a short looping arpeggio -----------------------------------
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // minor-key arpeggio (A minor-ish), low gain, mellow triangle
    const seq = [220.0, 261.63, 329.63, 261.63, 293.66, 220.0, 196.0, 261.63];
    const stepDur = 0.32;
    this.musicStep = 0;
    const tick = () => {
      if (!this.ctx) return;
      const f = seq[this.musicStep % seq.length];
      // bass + lead
      this._music(f / 2, stepDur * 1.8, 0.14, 'triangle');
      this._music(f, stepDur * 0.9, 0.09, 'triangle');
      this.musicStep++;
      this.musicTimer = setTimeout(tick, stepDur * 1000);
    };
    tick();
  }

  _music(freq, dur, gain, type) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
