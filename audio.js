// ==========================================================================
// AUTONOMOUS RACING LAB — MOTEUR ACOUSTIQUE FORMULE 1 & GT3 INTÉGRÉ (100% CODE)
// 0 fichier externe requis : 0 Mo dans GitHub, 0 latence, 100% compatible offline
// Modèle physique de combustion multi-cylindres, sifflement de boîte et résonance d'échappement
// ==========================================================================

const SoundSystem = (() => {
  let audioCtx = null;
  let masterGain = null;
  let compressor = null;
  let isMuted = false;
  let volume = 0.75;

  // Noeuds permanents pour le moteur en piste (zéro allocation en boucle, 60 FPS garantis)
  let engineRunning = false;
  let engineOsc1 = null;
  let engineOsc2 = null;
  let gearWhineOsc = null;
  let engineFilter = null;
  let engineGain = null;
  let noiseNode = null;
  let noiseGain = null;

  function initAudio() {
    if (audioCtx) {
      if (audioCtx.state === 'suspended' && !isMuted) {
        audioCtx.resume().catch(() => {});
      }
      return audioCtx;
    }

    const AudioContextClass = typeof window !== 'undefined'
      ? (window.AudioContext || window.webkitAudioContext)
      : null;

    if (!AudioContextClass) return null;

    try {
      audioCtx = new AudioContextClass();

      // Compresseur multibande pour mastering professionnel et basses percutantes
      compressor = audioCtx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      compressor.knee.setValueAtTime(12, audioCtx.currentTime);
      compressor.ratio.setValueAtTime(6, audioCtx.currentTime);
      compressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      compressor.release.setValueAtTime(0.15, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(isMuted ? 0 : volume, audioCtx.currentTime);

      compressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  // Bips officiels du portique de départ Formula 1 (5 feux)
  function playBeep(freqOrStep = 1, duration = 0.08, type = 'sine') {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(typeof freqOrStep === 'number' && freqOrStep > 50 ? freqOrStep : 780, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18 * volume, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + (duration || 0.08));
      osc.connect(gain);
      gain.connect(compressor || masterGain);
      osc.start(now);
      osc.stop(now + (duration || 0.08) + 0.02);
    } catch (e) {}
  }

  // Signal sonore officiel de départ ("LIGHTS OUT")
  function playLightsOut() {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(52, now + 0.22);
      gain.gain.setValueAtTime(0.22 * volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(compressor || masterGain);
      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {}
  }

  // Synthèse haute fidélité du départ de course : Launch Control, montée en régime F1 et passage de vitesse
  function playRaceStartEngine() {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Double oscillateur de combustion (V10 atmosphérique hurlant)
      const oscA = ctx.createOscillator();
      const oscB = ctx.createOscillator();
      const oscWhine = ctx.createOscillator();
      const launchGain = ctx.createGain();

      oscA.type = 'sawtooth';
      oscB.type = 'sawtooth';
      oscWhine.type = 'sine'; // Sifflement de boîte de vitesses séquentielle

      if (oscA.detune) oscA.detune.setValueAtTime(-8, now);
      if (oscB.detune) oscB.detune.setValueAtTime(12, now);

      // Phase 1 : Launch control / rupteur sur la grille (0.0s -> 0.35s) : oscillation nerveuse à 360-400 Hz
      oscA.frequency.setValueAtTime(360, now);
      oscB.frequency.setValueAtTime(363, now);
      oscWhine.frequency.setValueAtTime(540, now);

      oscA.frequency.exponentialRampToValueAtTime(420, now + 0.15);
      oscB.frequency.exponentialRampToValueAtTime(424, now + 0.15);
      oscA.frequency.exponentialRampToValueAtTime(380, now + 0.35);
      oscB.frequency.exponentialRampToValueAtTime(383, now + 0.35);

      // Phase 2 : 1ère vitesse en pleine accélération (0.35s -> 1.25s) : montée fulgurante vers 890 Hz
      oscA.frequency.exponentialRampToValueAtTime(890, now + 1.25);
      oscB.frequency.exponentialRampToValueAtTime(896, now + 1.25);
      oscWhine.frequency.exponentialRampToValueAtTime(1420, now + 1.25);

      // Phase 3 : Passage de rapport ultra-rapide (1.25s -> 1.38s) : coupure d'allumage & chute de régime
      oscA.frequency.setValueAtTime(890, now + 1.25);
      oscA.frequency.exponentialRampToValueAtTime(560, now + 1.38);
      oscB.frequency.exponentialRampToValueAtTime(564, now + 1.38);
      oscWhine.frequency.exponentialRampToValueAtTime(890, now + 1.38);

      // Phase 4 : 2ème vitesse pleine puissance (1.38s -> 2.4s) : envolée vers 980 Hz
      oscA.frequency.exponentialRampToValueAtTime(980, now + 2.4);
      oscB.frequency.exponentialRampToValueAtTime(986, now + 2.4);
      oscWhine.frequency.exponentialRampToValueAtTime(1560, now + 2.4);

      // Filtre résonant simulant la boîte à air en carbone et l'échappement libre
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(4.2, now);
      filter.frequency.setValueAtTime(750, now);
      filter.frequency.exponentialRampToValueAtTime(3400, now + 1.25);
      filter.frequency.exponentialRampToValueAtTime(2200, now + 1.38);
      filter.frequency.exponentialRampToValueAtTime(3800, now + 2.4);

      // Enveloppe d'amplitude
      launchGain.gain.setValueAtTime(0.001, now);
      launchGain.gain.linearRampToValueAtTime(0.40 * volume, now + 0.05);
      // Légère baisse lors du passage de rapport (coupure d'allumage)
      launchGain.gain.setValueAtTime(0.38 * volume, now + 1.24);
      launchGain.gain.linearRampToValueAtTime(0.12 * volume, now + 1.28);
      launchGain.gain.linearRampToValueAtTime(0.40 * volume, now + 1.38);
      launchGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

      oscA.connect(filter);
      oscB.connect(filter);
      oscWhine.connect(filter);
      filter.connect(launchGain);
      launchGain.connect(compressor || masterGain);

      oscA.start(now);
      oscB.start(now);
      oscWhine.start(now);
      oscA.stop(now + 2.65);
      oscB.stop(now + 2.65);
      oscWhine.stop(now + 2.65);

      // Souffle d'échappement et patinage initial des pneus slicks
      if (typeof ctx.createBuffer === 'function') {
        const noiseLen = Math.floor(ctx.sampleRate * 0.85);
        const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
        const out = noiseBuf.getChannelData(0);
        for (let i = 0; i < noiseLen; i++) {
          out[i] = Math.random() * 2 - 1;
        }
        const noiseSrc = ctx.createBufferSource();
        noiseSrc.buffer = noiseBuf;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1100, now);
        noiseFilter.Q.setValueAtTime(2.0, now);

        const nGain = ctx.createGain();
        nGain.gain.setValueAtTime(0.20 * volume, now);
        nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        noiseSrc.connect(noiseFilter);
        noiseFilter.connect(nGain);
        nGain.connect(compressor || masterGain);

        noiseSrc.start(now);
        noiseSrc.stop(now + 0.85);
      }
    } catch (e) {}
  }

  // Initialisation du synthétiseur de boucle moteur continue (en course)
  function setupContinuousEngine(ctx) {
    if (engineRunning || !ctx) return;
    try {
      const now = ctx.currentTime;
      engineOsc1 = ctx.createOscillator();
      engineOsc2 = ctx.createOscillator();
      gearWhineOsc = ctx.createOscillator();

      engineOsc1.type = 'sawtooth';
      engineOsc2.type = 'sawtooth';
      gearWhineOsc.type = 'sine';

      if (engineOsc1.detune) engineOsc1.detune.setValueAtTime(-10, now);
      if (engineOsc2.detune) engineOsc2.detune.setValueAtTime(14, now);

      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.Q.setValueAtTime(3.5, now);
      engineFilter.frequency.setValueAtTime(800, now);

      engineGain = ctx.createGain();
      engineGain.gain.setValueAtTime(0.001, now);

      engineOsc1.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      gearWhineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(compressor || masterGain);

      engineOsc1.start(now);
      engineOsc2.start(now);
      gearWhineOsc.start(now);

      engineRunning = true;
    } catch (e) {}
  }

  // Modulation dynamique continue du régime moteur selon la vitesse réelle du leader (en virage ou ligne droite)
  function updateEngineSound(speedRatio = 0, isRacing = false) {
    if (isMuted || volume <= 0) {
      if (engineGain && audioCtx) {
        try { engineGain.gain.setValueAtTime(0.0001, audioCtx.currentTime); } catch (e) {}
      }
      return;
    }

    const ctx = initAudio();
    if (!ctx) return;

    if (!engineRunning && isRacing) {
      setupContinuousEngine(ctx);
    }

    if (!engineRunning) return;

    try {
      const now = ctx.currentTime;
      if (isRacing) {
        const clampedRatio = Math.max(0, Math.min(1.0, speedRatio));
        // Fréquence fondamentale de combustion : de 160 Hz (virage lent) à 680 Hz (pleine ligne droite)
        const targetFreq = 160 + clampedRatio * 520;
        const whineFreq = targetFreq * 1.55;
        const targetFilter = 700 + clampedRatio * 2600;

        engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.08);
        engineOsc2.frequency.setTargetAtTime(targetFreq * 1.01, now, 0.08);
        gearWhineOsc.frequency.setTargetAtTime(whineFreq, now, 0.08);
        engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.08);

        // Volume lié à l'accélération
        const targetVol = (0.16 + clampedRatio * 0.18) * volume;
        engineGain.gain.setTargetAtTime(targetVol, now, 0.06);
      } else {
        // En attente ou pause : baisse progressive du son
        if (engineGain) engineGain.gain.setTargetAtTime(0.0001, now, 0.15);
      }
    } catch (e) {}
  }

  // Crépitement des pneus en dérapage ou freinage appuyé
  function playTireSqueal() {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.25), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer;
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(2400, now);
      bpf.Q.setValueAtTime(4.0, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.14 * volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      src.connect(bpf);
      bpf.connect(g);
      g.connect(compressor || masterGain);

      src.start(now);
      src.stop(now + 0.25);
    } catch (e) {}
  }

  // Choc physique / collision contre glissière de sécurité
  function playCollision() {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.16);

      g.gain.setValueAtTime(0.25 * volume, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(g);
      g.connect(compressor || masterGain);

      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  // Jingle de victoire à l'arrivée
  function playVictory() {
    if (isMuted || volume <= 0) return;
    const ctx = initAudio();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        const noteStart = now + idx * 0.11;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        g.gain.setValueAtTime(0.001, noteStart);
        g.gain.linearRampToValueAtTime(0.18 * volume, noteStart + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);
        osc.connect(g);
        g.connect(compressor || masterGain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.38);
      });
    } catch (e) {}
  }

  function playClick() {}
  function testAudio() {}

  function stopAllSounds() {
    if (engineGain && audioCtx) {
      try { engineGain.gain.setValueAtTime(0.0001, audioCtx.currentTime); } catch (e) {}
    }
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (isMuted) {
      stopAllSounds();
    }
    if (masterGain && audioCtx) {
      try {
        masterGain.gain.setValueAtTime(isMuted ? 0 : volume, audioCtx.currentTime);
      } catch (e) {}
    }
    updateMuteUI();
    return isMuted;
  }

  function toggleMute() {
    return setMuted(!isMuted);
  }

  function getIsMuted() {
    return isMuted;
  }

  function setVolume(val) {
    const v = parseFloat(val);
    volume = Math.max(0, Math.min(1, isNaN(v) ? 0 : v));
    if (masterGain && audioCtx && !isMuted) {
      try {
        masterGain.gain.setValueAtTime(volume, audioCtx.currentTime);
      } catch (e) {}
    }
    return volume;
  }

  function getVolume() {
    return volume;
  }

  function setMasterVolume(v) { return setVolume(v); }
  function getMasterVolume() { return getVolume(); }
  function setEngineVolume(v) { return 0; }
  function getEngineVolume() { return 0; }
  function setEffectsVolume(v) { return 0; }
  function getEffectsVolume() { return 0; }
  function openAudioModal() {}
  function closeAudioModal() {}

  function updateMuteUI() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('btn-topbar-mute');
    if (btn) {
      const icon = (typeof btn.querySelector === 'function') ? btn.querySelector('.mute-icon') : null;
      if (isMuted) {
        btn.classList.add('muted');
        btn.setAttribute('title', 'Son désactivé');
        if (icon) icon.textContent = '🔇';
        else btn.textContent = '🔇';
      } else {
        btn.classList.remove('muted');
        btn.setAttribute('title', 'Son actif');
        if (icon) icon.textContent = '🔊';
        else btn.textContent = '🔊';
      }
    }
  }

  return {
    initAudio,
    playBeep,
    playLightsOut,
    playRaceStartEngine,
    playVictory,
    playCollision,
    playTireSqueal,
    playClick,
    testAudio,
    updateEngineSound,
    stopAllSounds,
    setMuted,
    toggleMute,
    getIsMuted,
    setVolume,
    getVolume,
    setMasterVolume,
    getMasterVolume,
    setEngineVolume,
    getEngineVolume,
    setEffectsVolume,
    getEffectsVolume,
    updateMuteUI,
    openAudioModal,
    closeAudioModal
  };
})();

if (typeof globalThis !== 'undefined') {
  globalThis.SoundSystem = SoundSystem;
}

// Compatibilité Node.js pour les tests unitaires
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SoundSystem };
}
