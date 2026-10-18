(function (root) {
  'use strict';
  let context, muted = false;
  function resume() {
    if (muted || document.hidden) return;
    try {
      if (!context) { const Audio = root.AudioContext || root.webkitAudioContext; if (Audio) context = new Audio(); }
      if (context && context.state !== 'running') context.resume().catch(() => {});
    } catch { /* Sound is optional; unsupported audio never blocks play. */ }
  }
  const notes = { click: [520], equip: [660, 880], unequip: [520, 390], submit: [440, 554, 660], rankS: [523, 659, 784, 1047], rankLow: [392, 523], unlock: [784, 988, 1175] };
  function play(name) {
    if (muted || document.hidden) return;
    resume(); if (!context || context.state !== 'running') return;
    (notes[name] || notes.click).forEach((note, i) => {
      const oscillator = context.createOscillator(), gain = context.createGain();
      const start = context.currentTime + i * .065;
      oscillator.type = 'sine'; oscillator.frequency.value = note;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(.045, start + .008);
      gain.gain.exponentialRampToValueAtTime(.001, start + .16);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + .18);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }
  function setMuted(value) { muted = value; if (muted && context) context.suspend().catch(() => {}); }
  document.addEventListener('visibilitychange', () => { if (document.hidden && context) context.suspend().catch(() => {}); });
  // Every gesture can recover iOS audio after an interruption.
  document.addEventListener('pointerdown', resume, { passive: true });
  document.addEventListener('keydown', resume);
  root.MuseAudio = { play, setMuted, resume };
})(globalThis);
