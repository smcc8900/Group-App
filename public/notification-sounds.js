// Notification Sounds Configuration
// This file handles audio feedback for different types of notifications

class NotificationSounds {
  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.enabled = true;
  }

  static getInstance() {
    if (!NotificationSounds.instance) {
      NotificationSounds.instance = new NotificationSounds();
    }
    return NotificationSounds.instance;
  }

  // Initialize audio context
  initAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  // Create a simple notification sound using Web Audio API
  createSimpleSound(frequency, duration = 300) {
    if (!this.enabled) return;
    
    try {
      this.initAudioContext();
      if (!this.audioContext) return;

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration / 1000);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }

  // Play success sound (payment approved)
  playSuccess() {
    this.createSimpleSound(800, 400); // Higher pitch, longer duration
  }

  // Play error sound (payment rejected)
  playError() {
    this.createSimpleSound(400, 600); // Lower pitch, longer duration
  }

  // Play info sound (payment submitted)
  playInfo() {
    this.createSimpleSound(600, 300); // Medium pitch, shorter duration
  }

  // Play general notification sound
  playNotification() {
    this.createSimpleSound(700, 350);
  }

  // Enable/disable sounds
  setEnabled(enabled) {
    this.enabled = enabled;
    localStorage.setItem('notification_sounds_enabled', enabled.toString());
  }

  // Check if sounds are enabled
  isEnabled() {
    if (localStorage.getItem('notification_sounds_enabled') === null) {
      // Default to enabled
      return true;
    }
    return localStorage.getItem('notification_sounds_enabled') === 'true';
  }

  // Initialize sounds
  init() {
    this.enabled = this.isEnabled();
  }
}

// Export for use in other files
window.NotificationSounds = NotificationSounds; 