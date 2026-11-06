import { ORDER_ALERT_AUDIO_DATA_URI } from './orderAlertAudioBase64';

class AudioAlertService {
  private isAudioEnabled = true;
  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;
  private voiceAudioElement: HTMLAudioElement | null = null;
  private backgroundLoopAudio: HTMLAudioElement | null = null;

  // Background and Tab Flashing state
  private originalDocumentTitle = '';
  private titleFlashTimer: any = null;
  private titleFlashState = false;

  private repeatTimer: any = null;
  private isAlertLooping = false;
  private pendingOrdersList: Array<{ tableNumber?: number | string; deliveryType?: string; orderNumber?: string }> = [];
  private currentCycleIndex = 0;

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
      this.originalDocumentTitle = document.title || 'บ้าน สเต็กออนไลน์ (Baan Steak Online)';

      const unlockHandler = () => {
        this.unlock();
      };
      window.addEventListener('click', unlockHandler, { passive: true });
      window.addEventListener('touchstart', unlockHandler, { passive: true });
      window.addEventListener('keydown', unlockHandler, { passive: true });

      // Stop title flash when user switches back to this tab
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !this.isAlertLooping) {
          this.stopTitleFlash();
        }
      });

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

  /**
   * Request system notification permission (for background tab Chrome alerts)
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    try {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
    } catch {
      // ignore
    }
    return false;
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

      // Request notification permission quietly on first user gesture
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
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
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.04);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2: C5 (523.25 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.22);
      gain2.gain.setValueAtTime(0, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.5, now + 0.26);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.9);
    } catch (err) {
      console.warn('AudioContext chime error:', err);
    }
  }

  /**
   * Play real Thai voice audio ("มีออเดอร์เข้า")
   * Uses HTMLAudioElement which continues playing even when Chrome tab is in background!
   */
  public playSpokenVoiceAudio(): Promise<void> {
    return new Promise((resolve) => {
      let resolved = false;
      const onDone = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      try {
        let audio = this.voiceAudioElement;
        if (!audio) {
          audio = new Audio('/order-alert.mp3');
          this.voiceAudioElement = audio;
        }

        audio.currentTime = 0;
        audio.volume = 1.0;
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

        const playPromise = audio.play();
        if (playPromise) {
          playPromise.catch(() => {
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
        }
      } catch {
        onDone();
      }

      // Safety timeout
      setTimeout(onDone, 2600);
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
   * Send background Chrome notification when tab is in background
   */
  public sendBackgroundNotification(orderInfoText: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      if (Notification.permission === 'granted') {
        const notif = new Notification('🚨 มีออเดอร์เข้าใหม่! (ร้านบ้าน สเต็ก)', {
          body: orderInfoText || 'มีออเดอร์ใหม่เข้ามา กรุณากดเพื่อดูและกดยืนยันรับออเดอร์',
          icon: '/IMG_20261007_161813.jpg',
          tag: 'incoming-order-alert',
          requireInteraction: true,
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch {
      // ignore
    }
  }

  /**
   * Start title flashing so other Chrome tabs see the alert in their tab bar
   */
  private startTitleFlash(count = 1): void {
    if (typeof window === 'undefined') return;
    if (this.titleFlashTimer) return;

    this.titleFlashState = false;
    this.titleFlashTimer = setInterval(() => {
      this.titleFlashState = !this.titleFlashState;
      if (this.titleFlashState) {
        document.title = `🚨 (${count}) มีออเดอร์เข้าใหม่! 🥩`;
      } else {
        document.title = `🔔 [กดรับออเดอร์] ร้านบ้านสเต็ก`;
      }
    }, 1000);
  }

  private stopTitleFlash(): void {
    if (this.titleFlashTimer) {
      clearInterval(this.titleFlashTimer);
      this.titleFlashTimer = null;
    }
    if (typeof window !== 'undefined' && this.originalDocumentTitle) {
      document.title = this.originalDocumentTitle;
    }
  }

  /**
   * Play single alert cycle: Chime -> Spoken "มีออเดอร์เข้า" -> "โต๊ะ X" / Delivery type
   */
  public playOneAlertCycle(): void {
    if (!this.isAudioEnabled) return;

    const targetOrder =
      this.pendingOrdersList.length > 0
        ? this.pendingOrdersList[this.currentCycleIndex % this.pendingOrdersList.length]
        : undefined;

    this.currentCycleIndex++;

    this.unlock();
    this.playChime();

    setTimeout(async () => {
      await this.playSpokenVoiceAudio();

      if (targetOrder?.tableNumber) {
        setTimeout(() => {
          this.speakText(`โต๊ะ ${targetOrder.tableNumber}`);
        }, 180);
      } else if (targetOrder?.deliveryType === 'นัดรับอาหาร') {
        setTimeout(() => {
          this.speakText('นัดรับอาหาร');
        }, 180);
      } else if (targetOrder?.deliveryType === 'ส่งอาหารที่บ้าน') {
        setTimeout(() => {
          this.speakText('ส่งอาหารที่บ้าน');
        }, 180);
      }
    }, 280);
  }

  /**
   * Start repeating alert loop until all pending incoming orders are accepted
   * Works both in active tab and background Google Chrome tabs!
   */
  public startRepeatingOrderAlert(
    orders: Array<{ tableNumber?: number | string; deliveryType?: string; orderNumber?: string }> = []
  ): void {
    this.pendingOrdersList = [...orders];

    if (this.pendingOrdersList.length === 0) {
      this.stopRepeatingOrderAlert();
      return;
    }

    // Determine target order details for notification & speech
    const firstOrder = this.pendingOrdersList[0];
    const orderDetailText = firstOrder?.tableNumber
      ? `มีออเดอร์เข้า โต๊ะ ${firstOrder.tableNumber}`
      : firstOrder?.deliveryType === 'นัดรับอาหาร'
      ? 'มีออเดอร์เข้า นัดรับอาหาร'
      : firstOrder?.deliveryType === 'ส่งอาหารที่บ้าน'
      ? 'มีออเดอร์เข้า ส่งอาหารที่บ้าน'
      : 'มีออเดอร์ใหม่เข้ามาในระบบ';

    // Start tab title flashing
    this.startTitleFlash(this.pendingOrdersList.length);

    // Send Chrome System Notification if tab is in background
    if (typeof document !== 'undefined' && document.hidden) {
      this.sendBackgroundNotification(orderDetailText);
    }

    if (this.isAlertLooping) {
      return;
    }

    this.isAlertLooping = true;
    this.currentCycleIndex = 0;

    // Play immediately first round
    this.playOneAlertCycle();

    // Background Audio Chaining
    const scheduleNextBackgroundPlay = () => {
      if (!this.isAlertLooping || this.pendingOrdersList.length === 0) {
        return;
      }

      try {
        if (!this.backgroundLoopAudio) {
          this.backgroundLoopAudio = new Audio('/order-alert.mp3');
          this.backgroundLoopAudio.volume = 1.0;
        }
      } catch {
        // ignore
      }
    };

    // Repeat every 5.5 seconds until stopped
    if (this.repeatTimer) {
      clearInterval(this.repeatTimer);
    }

    this.repeatTimer = setInterval(() => {
      if (!this.isAlertLooping || this.pendingOrdersList.length === 0) {
        this.stopRepeatingOrderAlert();
        return;
      }
      this.playOneAlertCycle();
      scheduleNextBackgroundPlay();
    }, 5500);
  }

  /**
   * Update active pending orders list during looping
   */
  public updateRepeatingOrders(
    orders: Array<{ tableNumber?: number | string; deliveryType?: string; orderNumber?: string }>
  ): void {
    this.pendingOrdersList = [...orders];
    if (this.pendingOrdersList.length === 0) {
      this.stopRepeatingOrderAlert();
    } else {
      this.startTitleFlash(this.pendingOrdersList.length);
      if (!this.isAlertLooping) {
        this.startRepeatingOrderAlert(orders);
      }
    }
  }

  /**
   * Stop repeating alert loop immediately (called when user presses "กดรับออเดอร์")
   */
  public stopRepeatingOrderAlert(): void {
    if (this.repeatTimer) {
      clearInterval(this.repeatTimer);
      this.repeatTimer = null;
    }
    this.isAlertLooping = false;
    this.pendingOrdersList = [];

    // Stop Title Flashing
    this.stopTitleFlash();

    // Stop Background audio
    if (this.backgroundLoopAudio) {
      try {
        this.backgroundLoopAudio.pause();
        this.backgroundLoopAudio.currentTime = 0;
      } catch {
        // ignore
      }
    }

    // Immediately stop any active speech
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public isLooping(): boolean {
    return this.isAlertLooping;
  }

  public triggerNewOrderAlert(info?: { tableNumber?: number | string; deliveryType?: string }): void {
    if (info) {
      this.startRepeatingOrderAlert([info]);
    } else {
      this.playOneAlertCycle();
    }
  }

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
