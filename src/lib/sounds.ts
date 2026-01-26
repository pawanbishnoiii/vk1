// Sound effect URLs - using free sounds
export const SOUNDS = {
  // Trade sounds
  tradeStart: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  tradeWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  tradeLoss: 'https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3',
  
  // UI sounds
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  
  // Timer sounds
  tick: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
  countdown: 'https://assets.mixkit.co/active_storage/sfx/2008/2008-preview.mp3',
};

// Sound manager with volume control
class SoundManager {
  private enabled: boolean = true;
  private volume: number = 0.5;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', String(enabled));
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', String(this.volume));
  }

  isEnabled() {
    const stored = localStorage.getItem('soundEnabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }
    return this.enabled;
  }

  getVolume() {
    const stored = localStorage.getItem('soundVolume');
    if (stored !== null) {
      this.volume = parseFloat(stored);
    }
    return this.volume;
  }

  play(soundUrl: string) {
    if (!this.isEnabled()) return;
    
    try {
      const audio = new Audio(soundUrl);
      audio.volume = this.getVolume();
      audio.play().catch(() => {
        // Silently fail if audio can't play
      });
    } catch (e) {
      // Silently fail
    }
  }
}

export const soundManager = new SoundManager();
