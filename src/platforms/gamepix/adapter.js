// Loaded only by the GamePix entry, after the official SDK and before the game.
(() => {
  'use strict';
  const sdk = window.GamePix;
  if (!sdk?.lifecycle || !sdk.events) return;

  const surfaces = document.querySelectorAll('body > header, body > main, body > footer, #journey, #lookbook, #result, #feedback');
  let hostPaused = false;
  let waitingForPlayer = false;
  let adPending = false;
  let paused = false;
  let pauseListener;
  let soundMuted = false;
  let soundListener;
  let ready = false;
  let playRequested = false;
  let started = false;

  function startWhenPlayable() {
    if (ready && playRequested && !paused && !started) {
      started = true;
      sdk.lifecycle.gameStart();
    }
  }

  function syncPause() {
    const next = hostPaused || adPending || waitingForPlayer;
    if (paused === next) return;
    paused = next;
    // Leave the Player's own controls and local test ad overlay interactive.
    for (const surface of surfaces) surface.inert = paused;
    document.documentElement.toggleAttribute('data-gamepix-paused', paused);
    pauseListener?.(paused);
    startWhenPlayable();
  }

  function setSoundMuted(muted) {
    if (soundMuted === muted) return;
    soundMuted = muted;
    soundListener?.();
  }

  sdk.events.on('pause', () => { hostPaused = true; syncPause(); });
  sdk.events.on('resume', () => { hostPaused = false; syncPause(); });
  sdk.events.on('soundOff', () => setSoundMuted(true));
  sdk.events.on('soundOn', () => setSoundMuted(false));
  document.addEventListener('cancel', event => {
    if (paused && event.target.inert) event.preventDefault();
  }, true);

  window.MuseGamePix = {
    get paused() { return paused; },
    onPauseChange(listener) { pauseListener = listener; listener(paused); },
    get soundMuted() { return soundMuted; },
    onSoundChange(listener) { soundListener = listener; listener(); },
    loading(percent) { sdk.lifecycle.loading(percent); },
    async loaded() {
      waitingForPlayer = true;
      syncPause();
      try {
        await sdk.lifecycle.loaded();
        ready = true;
      } catch (error) {
        console.warn('GamePix could not acknowledge game readiness', error);
      } finally {
        waitingForPlayer = false;
        syncPause();
      }
    },
    start() { playRequested = true; startWhenPlayable(); },
    async betweenChallenges() {
      if (!ready || !sdk.ads?.interstitial || adPending) return;
      adPending = true;
      syncPause();
      try {
        await sdk.ads.interstitial();
      } catch (error) {
        console.warn('GamePix interstitial unavailable', error);
      } finally {
        adPending = false;
        syncPause();
      }
    }
  };
})();
