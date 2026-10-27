/**
 * Audio Alert Utility for Admin Orders & Incoming Order Alerts
 * Synthesizes doorbell chime with Web Audio API and speaks "มีออเดอร์เข้า" using Web Speech API (TTS)
 */

class AudioAlertService {
  private isAudioEnabled = true;
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    try {
      const saved = localStorage.getItem('baan_steak_audio_alert_enabled');
      if (saved !== null) {
        this.isAudioEnabled = saved === 'true';
      }
    } catch {
      this.isAudioEnabled = true;
    }

    if (typeof window !== 'undefined') {
      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });

      // Pre-warm SpeechSynthesis voices if available
      if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
  }

  public isEnabled(): boolean {
    return this.isAudioEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.isAudioEnabled = enabled;
    try {
      localStorage.setItem('baan_steak_audio_alert_enabled', String(enabled));
    } catch {
      // ignore
    }
  }

  public unlock(): void {
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      this.isUnlocked = true;
    } catch {
      // ignore
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Play alert tone: two-tone doorbell chime
   */
  public playChime(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Note 2: C5 (523.25 Hz) after 0.18s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.2);
      gain2.gain.setValueAtTime(0.4, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 0.75);

      // Note 3: G5 (783.99 Hz) short ping for attention
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.45);
      gain3.gain.setValueAtTime(0.3, now + 0.45);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.45);
      osc3.stop(now + 0.95);
    } catch (err) {
      console.warn('Error playing chime:', err);
    }
  }

  /**
   * Speak "มีออเดอร์เข้า" using Web Speech API
   */
  public speakAlert(text = 'มีออเดอร์เข้า'): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending utterance
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 0.95; // Clear natural pace
      utterance.pitch = 1.1;

      // Prefer Thai voice if available in browser
      const voices = window.speechSynthesis.getVoices();
      const thaiVoice = voices.find(
        (v) => v.lang.toLowerCase().includes('th') || v.name.toLowerCase().includes('thai')
      );
      if (thaiVoice) {
        utterance.voice = thaiVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('SpeechSynthesis error:', err);
    }
  }

  /**
   * Full alert: Play chime and announce "มีออเดอร์เข้า"
   */
  public triggerNewOrderAlert(): void {
    if (!this.isAudioEnabled) return;

    this.unlock();
    this.playChime();
    // Delay voice slightly so it plays right after the musical chime
    setTimeout(() => {
      this.speakAlert('มีออเดอร์เข้า');
    }, 300);
  }
}

export const audioAlert = new AudioAlertService();
