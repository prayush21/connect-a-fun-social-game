// Audio and Vibration Notification System
// Handles audio playback and device vibration for game events

export type NotificationType =
  | "new_reference"
  | "game_start"
  | "game_end"
  | "player_joined"
  | "turn_change";

export interface NotificationPreferences {
  audioEnabled: boolean;
  vibrationEnabled: boolean;
  volume: number; // 0.0 to 1.0
}

export interface NotificationConfig {
  type: NotificationType;
  audioFile?: string;
  vibrationPattern?: number | number[];
  description: string;
}

// Default notification configurations
export const NOTIFICATION_CONFIGS: Record<
  NotificationType,
  NotificationConfig
> = {
  new_reference: {
    type: "new_reference",
    audioFile: "/sounds/new-clue.mp3",
    vibrationPattern: [200, 100, 200], // Vibrate 200ms, pause 100ms, vibrate 200ms
    description: "New clue available",
  },
  game_start: {
    type: "game_start",
    audioFile: "/sounds/game-start.mp3",
    vibrationPattern: 300,
    description: "Game started",
  },
  game_end: {
    type: "game_end",
    audioFile: "/sounds/game-end.mp3",
    vibrationPattern: [500, 200, 500],
    description: "Game ended",
  },
  player_joined: {
    type: "player_joined",
    audioFile: "/sounds/player-join.mp3",
    vibrationPattern: 150,
    description: "Player joined",
  },
  turn_change: {
    type: "turn_change",
    audioFile: "/sounds/turn-change.mp3",
    vibrationPattern: 100,
    description: "Turn changed",
  },
};

class NotificationManager {
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private preferences: NotificationPreferences;
  private isInitialized: boolean = false;
  private hasUserInteracted: boolean = false;

  constructor(preferences: NotificationPreferences) {
    this.preferences = preferences;
  }

  /**
   * Initialize the notification manager
   * Should be called after first user interaction to comply with autoplay policies
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Preload audio files
      await this.preloadAudioFiles();
      this.isInitialized = true;
      console.log("NotificationManager initialized successfully");
    } catch (error) {
      console.error("Failed to initialize NotificationManager:", error);
    }
  }

  /**
   * Mark that user has interacted with the page
   * This enables audio playback in browsers with autoplay restrictions
   */
  markUserInteraction(): void {
    this.hasUserInteracted = true;
    if (!this.isInitialized) {
      this.initialize();
    }
  }

  /**
   * Update notification preferences
   */
  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };

    // Update volume for all audio elements
    if (newPreferences.volume !== undefined) {
      this.audioElements.forEach((audio) => {
        audio.volume = this.preferences.volume;
      });
    }
  }

  /**
   * Play a notification
   */
  async notify(
    type: NotificationType,
    options?: { skipAudio?: boolean; skipVibration?: boolean }
  ): Promise<void> {
    const config = NOTIFICATION_CONFIGS[type];

    if (!config) {
      console.warn(`Unknown notification type: ${type}`);
      return;
    }

    // Play audio notification
    if (
      !options?.skipAudio &&
      this.preferences.audioEnabled &&
      this.hasUserInteracted
    ) {
      await this.playAudio(config);
    }

    // Trigger vibration
    if (!options?.skipVibration && this.preferences.vibrationEnabled) {
      this.vibrate(config.vibrationPattern);
    }
  }

  /**
   * Check if vibration is supported on this device
   */
  isVibrationSupported(): boolean {
    return "vibrate" in navigator && typeof navigator.vibrate === "function";
  }

  /**
   * Check if audio is ready to play
   */
  isAudioReady(): boolean {
    return this.isInitialized && this.hasUserInteracted;
  }

  /**
   * Get current preferences
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  /**
   * Preload all audio files
   */
  private async preloadAudioFiles(): Promise<void> {
    const loadPromises = Object.values(NOTIFICATION_CONFIGS)
      .filter((config) => config.audioFile)
      .map(async (config) => {
        try {
          await this.loadAudioFile(config.audioFile!);
        } catch (error) {
          // Continue loading other files even if one fails
          console.warn(
            `Skipping missing audio file: ${config.audioFile}`,
            error
          );
        }
      });

    await Promise.all(loadPromises);
  }

  /**
   * Load a single audio file
   */
  private async loadAudioFile(audioFile: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.audioElements.has(audioFile)) {
        resolve();
        return;
      }

      const audio = new Audio(audioFile);
      audio.volume = this.preferences.volume;
      audio.preload = "auto";

      audio.addEventListener("canplaythrough", () => {
        this.audioElements.set(audioFile, audio);
        resolve();
      });

      audio.addEventListener("error", (error) => {
        console.warn(`Failed to load audio file: ${audioFile}`, error);
        reject(error);
      });

      // Start loading
      audio.load();
    });
  }

  /**
   * Play audio for a notification
   */
  private async playAudio(config: NotificationConfig): Promise<void> {
    if (!config.audioFile) return;

    const audio = this.audioElements.get(config.audioFile);
    if (!audio) {
      console.warn(`Audio file not loaded: ${config.audioFile}`);
      return;
    }

    try {
      // Reset audio to beginning
      audio.currentTime = 0;
      await audio.play();
    } catch (error) {
      console.warn(`Failed to play audio: ${config.audioFile}`, error);
    }
  }

  /**
   * Trigger device vibration
   */
  private vibrate(pattern?: number | number[]): void {
    if (!this.isVibrationSupported() || !pattern) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn("Failed to trigger vibration:", error);
    }
  }
}

// Singleton instance
let notificationManager: NotificationManager | null = null;

/**
 * Get the global notification manager instance
 */
export function getNotificationManager(
  preferences?: NotificationPreferences
): NotificationManager {
  if (!notificationManager) {
    const defaultPreferences: NotificationPreferences = {
      audioEnabled: true,
      vibrationEnabled: true,
      volume: 0.7,
    };
    notificationManager = new NotificationManager(
      preferences || defaultPreferences
    );
  }
  return notificationManager;
}

/**
 * Initialize notifications after user interaction
 */
export function initializeNotifications(
  preferences?: NotificationPreferences
): void {
  const manager = getNotificationManager(preferences);
  manager.markUserInteraction();
}

/**
 * Quick notification function
 */
export async function notify(
  type: NotificationType,
  options?: { skipAudio?: boolean; skipVibration?: boolean }
): Promise<void> {
  const manager = getNotificationManager();
  await manager.notify(type, options);
}

/**
 * Update notification preferences
 */
export function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): void {
  const manager = getNotificationManager();
  manager.updatePreferences(preferences);
}

/**
 * Check device capabilities
 */
export function getNotificationCapabilities() {
  const manager = getNotificationManager();
  return {
    vibrationSupported: manager.isVibrationSupported(),
    audioReady: manager.isAudioReady(),
    hasUserInteracted: manager.isAudioReady(), // Same check for now
  };
}
