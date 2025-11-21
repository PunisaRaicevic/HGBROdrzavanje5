import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const capacitorHaptics = {
  /**
   * Check if Haptics is available
   */
  isAvailable: async (): Promise<boolean> => {
    try {
      // Haptics is available on iOS and Android
      // On web, it will fallback gracefully
      return true;
    } catch (error) {
      console.error('[HAPTICS] Not available:', error);
      return false;
    }
  },

  /**
   * Light impact - for subtle feedback (button taps, switches)
   */
  light: async (): Promise<void> => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (error) {
      console.warn('[HAPTICS] Light impact failed:', error);
      // Fallback to browser vibrate API
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  },

  /**
   * Medium impact - for normal interactions (selections, confirmations)
   */
  medium: async (): Promise<void> => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (error) {
      console.warn('[HAPTICS] Medium impact failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    }
  },

  /**
   * Heavy impact - for important actions (errors, critical alerts)
   */
  heavy: async (): Promise<void> => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('[HAPTICS] Heavy impact failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }
  },

  /**
   * Success notification - for successful actions
   */
  success: async (): Promise<void> => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch (error) {
      console.warn('[HAPTICS] Success notification failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  },

  /**
   * Warning notification - for warnings
   */
  warning: async (): Promise<void> => {
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch (error) {
      console.warn('[HAPTICS] Warning notification failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate([150, 100, 150]);
      }
    }
  },

  /**
   * Error notification - for errors
   */
  error: async (): Promise<void> => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch (error) {
      console.warn('[HAPTICS] Error notification failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
    }
  },

  /**
   * Custom vibration pattern
   */
  custom: async (pattern: number[]): Promise<void> => {
    try {
      // Capacitor doesn't support custom patterns directly
      // Use heavy impact as fallback
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('[HAPTICS] Custom pattern failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    }
  },

  /**
   * New task notification - special pattern for task assignment
   */
  taskAssigned: async (): Promise<void> => {
    try {
      // Double heavy impact for task assignment
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await new Promise(resolve => setTimeout(resolve, 100));
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch (error) {
      console.warn('[HAPTICS] Task assigned pattern failed:', error);
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
    }
  }
};
