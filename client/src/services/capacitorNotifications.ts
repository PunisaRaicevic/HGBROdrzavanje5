import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export const capacitorNotifications = {
  /**
   * Check if Local Notifications are available
   */
  isAvailable: (): boolean => {
    return Capacitor.isNativePlatform();
  },

  /**
   * Request permission for local notifications
   */
  requestPermission: async (): Promise<boolean> => {
    try {
      if (!capacitorNotifications.isAvailable()) {
        console.log('[NOTIFICATIONS] Not available on web');
        return false;
      }

      const permission = await LocalNotifications.requestPermissions();
      return permission.display === 'granted';
    } catch (error) {
      console.error('[NOTIFICATIONS] Permission request failed:', error);
      return false;
    }
  },

  /**
   * Show instant notification with sound
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
    try {
      if (!capacitorNotifications.isAvailable()) {
        // Fallback to browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
        return;
      }

      const notificationId = options?.id || Date.now();

      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: notificationId,
            schedule: { at: new Date(Date.now() + 100) }, // Almost instant
            sound: options?.sound || undefined,
            smallIcon: options?.smallIcon || undefined,
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to show notification:', error);
    }
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
        vibrate: true
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
        vibrate: true
      }
    );
  },

  /**
   * Cancel all notifications
   */
  cancelAll: async (): Promise<void> => {
    try {
      if (!capacitorNotifications.isAvailable()) return;
      
      await LocalNotifications.cancel({ notifications: [] });
    } catch (error) {
      console.error('[NOTIFICATIONS] Failed to cancel all:', error);
    }
  },

  /**
   * Play notification sound using Audio API (works on web and native)
   */
  playSound: async (soundUrl?: string): Promise<void> => {
    try {
      const audio = new Audio(
        soundUrl || 'https://cdnjs.cloudflare.com/ajax/libs/ion-sound/3.0.7/sounds/bell_ring.mp3'
      );
      audio.volume = 0.7;
      await audio.play();
    } catch (error) {
      console.warn('[NOTIFICATIONS] Sound play failed:', error);
    }
  }
};
