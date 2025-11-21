import { Capacitor } from '@capacitor/core';

export const capacitorNotifications = {
  /**
   * Check if Local Notifications are available
   */
  isAvailable: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  /**
   * Request permission (handled by OneSignal now)
   */
  requestPermission: async (): Promise<boolean> => {
    console.log('[NOTIFICATIONS] Permission handled by OneSignal');
    return true;
  },

  /**
   * Show notification (handled by OneSignal now)
   */
  showNotification: async (
    title: string,
    body: string,
    options?: {
      id?: number;
      sound?: string;
      smallIcon?: string;
      vibrate?: boolean;
    }
  ): Promise<void> => {
    if (!capacitorNotifications.isAvailable()) {
      // Fallback to browser notification WITH SOUND for web
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body });
      }
      // Play sound on web browser
      await capacitorNotifications.playSound();
      return;
    }

    console.log('[NOTIFICATIONS] Native notifications handled by OneSignal');
  },

  /**
   * Show task assigned notification
   */
  showTaskAssigned: async (taskTitle: string, taskLocation: string): Promise<void> => {
    await capacitorNotifications.showNotification(
      'Nova reklamacija / New Task',
      `${taskTitle}\n${taskLocation}`,
      {
        id: Date.now(),
        vibrate: true,
        sound: 'default'
      }
    );
  },

  /**
   * Show task completed notification
   */
  showTaskCompleted: async (taskTitle: string): Promise<void> => {
    await capacitorNotifications.showNotification(
      'Zadatak završen / Task Completed',
      taskTitle,
      {
        id: Date.now(),
        vibrate: true,
        sound: 'default'
      }
    );
  },

  /**
   * Cancel all notifications
   */
  cancelAll: async (): Promise<void> => {
    console.log('[NOTIFICATIONS] OneSignal handles notification clearing');
  },

  /**
   * Play notification sound using Audio API (works on web and native as fallback)
   */
  playSound: async (soundUrl?: string): Promise<void> => {
    try {
      const audio = new Audio(
        soundUrl || 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3'
      );
      audio.volume = 1.0;
      await audio.play();
    } catch (error) {
      console.warn('[NOTIFICATIONS] Sound play failed:', error);
    }
  }
};
