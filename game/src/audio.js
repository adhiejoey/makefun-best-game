// Emberlight Salvage — all sound, synthesised live with WebAudio.
// One clear job: every beep, chime and thud the game makes, with no audio
// files at all. Nothing here loads over the network; the context is only
// created after the player's first gesture, so browsers allow it.

/** Create the sound board. Call `unlock()` from a user gesture first. */
export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.22;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone({ frequency, endFrequency = null, duration, type = 'sine', volume = 1, delay = 0 }) {
    if (muted || !ensure() || !context || !master) return;
    if (context.state === 'suspended') void context.resume();
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  return {
    /** Create/resume the context from a key press or click. Safe to call often. */
    unlock() {
      if (ensure() && context && context.state === 'suspended') void context.resume();
    },
    get muted() {
      return muted;
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    shoot() {
      tone({ frequency: 720, endFrequency: 320, duration: 0.09, type: 'square', volume: 0.35 });
    },
    collect() {
      tone({ frequency: 880, duration: 0.1, volume: 0.5 });
      tone({ frequency: 1318, duration: 0.14, volume: 0.45, delay: 0.06 });
    },
    rockBreak() {
      tone({ frequency: 220, endFrequency: 70, duration: 0.16, type: 'triangle', volume: 0.5 });
    },
    hit() {
      tone({ frequency: 160, endFrequency: 40, duration: 0.35, type: 'sawtooth', volume: 0.7 });
      tone({ frequency: 90, endFrequency: 30, duration: 0.3, type: 'square', volume: 0.4, delay: 0.02 });
    },
    waveClear() {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone({ frequency, duration: 0.16, volume: 0.5, delay: index * 0.09 });
      });
    },
    win() {
      [523, 659, 784, 1046, 1318, 1568].forEach((frequency, index) => {
        tone({ frequency, duration: 0.22, volume: 0.5, delay: index * 0.11 });
      });
    },
    gameOver() {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone({ frequency, duration: 0.28, type: 'triangle', volume: 0.5, delay: index * 0.14 });
      });
    },
    click() {
      tone({ frequency: 980, duration: 0.06, volume: 0.4 });
    },
  };
}
