import { ORDER_ALERT_AUDIO_DATA_URI } from './orderAlertAudioBase64';

class AudioAlertService {
  private isAudioEnabled = true;
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private voiceAudioElement: HTMLAudioElement | null = null;

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

      // Pre-create and unlock the Thai spoken audio element on user gesture
      if (!this.voiceAudioElement && typeof window !== 'undefined') {
        try {
          const audio = new Audio('/order-alert.mp3');
          audio.preload = 'auto';
          this.voiceAudioElement = audio;
        } catch {
          // fallback
        }
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
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: C5 (523.25 Hz) after 0.18s
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.18);
      gain2.gain.setValueAtTime(0.4, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.65);

      // Note 3: G5 (783.99 Hz) short ping for attention
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(783.99, now + 0.4);
      gain3.gain.setValueAtTime(0.3, now + 0.4);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.4);
      osc3.stop(now + 0.85);
    } catch (err) {
      console.warn('Error playing chime:', err);
    }
  }

  /**
   * Play crystal clear Thai spoken voice: "มีออเดอร์เข้า"
   * Uses real MP3 audio recording with embedded base64 fallback,
   * then supplements with Web Speech API for table-specific numbers if present.
   */
  public playSpokenVoiceAudio(): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') {
        resolve(false);
        return;
      }

      const audio = new Audio('/order-alert.mp3');
      audio.volume = 1.0;

      let hasResolved = false;
      const onDone = () => {
        if (!hasResolved) {
          hasResolved = true;
          resolve(true);
        }
      };

      audio.onended = onDone;
      audio.onerror = () => {
        // Fallback to embedded base64 audio
        try {
          const fallbackAudio = new Audio(ORDER_ALERT_AUDIO_DATA_URI);
          fallbackAudio.volume = 1.0;
          fallbackAudio.onended = onDone;
          fallbackAudio.onerror = () => onDone();
          fallbackAudio.play().catch(() => onDone());
        } catch {
          onDone();
        }
      };

      audio.play().catch(() => {
        // Attempt fallback to base64
        try {
          const fallbackAudio = new Audio(ORDER_ALERT_AUDIO_DATA_URI);
          fallbackAudio.volume = 1.0;
          fallbackAudio.onended = onDone;
          fallbackAudio.onerror = () => onDone();
          fallbackAudio.play().catch(() => onDone());
        } catch {
          onDone();
        }
      });

      // Safety timeout
      setTimeout(onDone, 2500);
    });
  }

  /**
   * Speak supplementary text using Web Speech API (e.g. "โต๊ะ 1" or "รับกลับบ้าน")
   */
  public speakText(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;

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
   * Full alert: Play chime and announce "มีออเดอร์เข้า" with voice audio
   * plus optional table number announcement
   */
  public triggerNewOrderAlert(info?: { tableNumber?: number | string; deliveryType?: string }): void {
    if (!this.isAudioEnabled) return;

    this.unlock();
    this.playChime();

    // Play the clear spoken voice "มีออเดอร์เข้า"
    setTimeout(async () => {
      await this.playSpokenVoiceAudio();

      // If a specific table is specified (e.g. โต๊ะ 1), also announce the table
      if (info?.tableNumber) {
        setTimeout(() => {
          this.speakText(`โต๊ะ ${info.tableNumber}`);
        }, 200);
      } else if (info?.deliveryType === 'นัดรับอาหาร') {
        setTimeout(() => {
          this.speakText('นัดรับอาหาร');
        }, 200);
      }
    }, 280);
  }

  /**
   * Direct manual test method for Admin to verify sound and voice
   */
  public testVoiceAlert(tableNumber: number | string = 1): void {
    this.unlock();
    this.playChime();
    setTimeout(async () => {
      await this.playSpokenVoiceAudio();
      setTimeout(() => {
        this.speakText(`โต๊ะ ${tableNumber}`);
      }, 200);
    }, 280);
  }
}

export const audioAlert = new AudioAlertService();

