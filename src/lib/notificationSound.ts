/**
 * Web Audio API based notification sound synthesizer.
 * Provides crystal-clear, lag-free audio chimes without external mp3 dependencies.
 */

class NotificationSoundService {
  private ctx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtxClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass();
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume();
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public isMuted(): boolean {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("foodflow_sound_muted") === "true";
  }

  public toggleMute(): boolean {
    if (typeof window === "undefined") return false;
    const current = this.isMuted();
    const next = !current;
    localStorage.setItem("foodflow_sound_muted", String(next));
    return next;
  }

  public setMuted(muted: boolean): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("foodflow_sound_muted", String(muted));
  }

  /**
   * Play rich restaurant kitchen order alert chime (Chord progression C5 -> E5 -> G5 -> C6)
   */
  public playNewOrderSound(): void {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.35, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.65);
      });
    } catch (e) {
      console.warn("Could not play new order sound:", e);
    }
  }

  /**
   * Play high-energy rider delivery alert sound (Double beep / Ping-ping)
   */
  public playRiderAlertSound(): void {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bursts = [0, 0.18];

      bursts.forEach((startDelay) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(659.25, now + startDelay); // E5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + startDelay + 0.12); // D6

        gain.gain.setValueAtTime(0.3, now + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + startDelay + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + startDelay);
        osc.stop(now + startDelay + 0.25);
      });
    } catch (e) {
      console.warn("Could not play rider sound:", e);
    }
  }

  /**
   * Play gentle order status update ping (Customer / General alert)
   */
  public playStatusUpdateSound(): void {
    if (this.isMuted()) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {
      console.warn("Could not play status update sound:", e);
    }
  }
}

export const notificationSound = new NotificationSoundService();
