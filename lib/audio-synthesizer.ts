/**
 * Pure Web Audio API Sound Engine
 * Synthesizes crisp notification tones in real-time without requiring any external mp3/wav files.
 */

export type SoundPreset = 
  | 'CLASSIC_CHIME'
  | 'GENTLE_BELL'
  | 'DIGITAL_PING'
  | 'SUBTLE_POP'
  | 'ZEN_GONG'
  | 'MUTE';

export interface SoundOption {
  id: SoundPreset;
  name: string;
  description: string;
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: 'CLASSIC_CHIME', name: 'Classic Chime', description: 'Dual-harmonic ascending bell chime' },
  { id: 'GENTLE_BELL', name: 'Gentle Bell', description: 'Soft, resonant crystal tone' },
  { id: 'DIGITAL_PING', name: 'Digital Ping', description: 'Crisp, modern tech blip' },
  { id: 'SUBTLE_POP', name: 'Subtle Pop', description: 'Low, gentle bubble pluck' },
  { id: 'ZEN_GONG', name: 'Zen Gong', description: 'Deep, rich soothing resonance' },
  { id: 'MUTE', name: 'Mute / Silent', description: 'No sound on notifications' },
];

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a synthesized notification tone based on the chosen preset.
 */
export function playPresetSound(preset: SoundPreset | string, volume = 0.5): void {
  if (preset === 'MUTE') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), now);
    masterGain.connect(ctx.destination);

    switch (preset) {
      case 'GENTLE_BELL': {
        // Soft Crystal Bell (520Hz with soft exponential decay)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      case 'DIGITAL_PING': {
        // Crisp Modern Ping (1046Hz blip)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6

        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }

      case 'SUBTLE_POP': {
        // Short subtle pluck (380Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(190, now + 0.12);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      case 'ZEN_GONG': {
        // Deep soothing gong (300Hz with exponential swell)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(220, now); // A3
        osc2.frequency.setValueAtTime(330, now); // E4

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(masterGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.9);
        osc2.stop(now + 0.9);
        break;
      }

      case 'CLASSIC_CHIME':
      default: {
        // Ascending Dual Tone Chime (880Hz -> 1320Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        const gain2 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.08); // E6
        gain2.gain.setValueAtTime(0.01, now);
        gain2.gain.setValueAtTime(0.3, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gain1);
        gain1.connect(masterGain);

        osc2.connect(gain2);
        gain2.connect(masterGain);

        osc1.start(now);
        osc1.stop(now + 0.35);

        osc2.start(now + 0.08);
        osc2.stop(now + 0.45);
        break;
      }
    }
  } catch (e) {
    console.warn('[AudioSynthesizer] Failed to play synthesized tone:', e);
  }
}
