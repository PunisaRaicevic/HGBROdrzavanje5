import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

export const useFCM = (userId?: string) => {
  useEffect(() => {
    if (!userId) return;

    const setupFCM = async () => {
      console.log('🚀 [FCM] Inicijalizujem push notifikacije...');

      // Proveravamo JWT token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ [FCM] Nema JWT tokena!');
        return;
      }

      try {
        // 1. Tražimo dozvolu
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          console.warn('⚠️ [FCM] Push dozvola nije odobrena.');
          return;
        }

        console.log('✅ [FCM] Push dozvola odobrena');

        // 2. Registrujemo uređaj
        await PushNotifications.register();
        console.log('✅ [FCM] Uređaj registrovan');

        // 3. Postavljamo listenere
        PushNotifications.addListener('registration', async (token) => {
          console.log('🔥 [FCM] Token uređaja:', token.value);

          if (userId) {
            try {
              console.log('[FCM] Slanje tokena na backend...');
              const response = await apiRequest('POST', '/api/users/fcm-token', {
                token: token.value,
              });
              console.log('✅ [FCM] Backend odgovorio:', response.status);
              console.log('💾 [FCM] Token sačuvan u bazi!');
            } catch (err) {
              console.error('❌ [FCM] Greška pri slanju tokena:', err);
            }
          }
        });

        PushNotifications.addListener('registrationError', (err) => {
          console.error('❌ [FCM] Greška pri registraciji:', err);
        });

        PushNotifications.addListener('pushNotificationReceived', (notif) => {
          console.log('📥 [FCM] Primljena notifikacija:', notif);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (notif) => {
          console.log('🔔 [FCM] Korisnik kliknuo na notifikaciju:', notif);
        });
      } catch (error) {
        console.error('❌ [FCM] Greška pri inicijalizaciji:', error);
      }
    };

    // Čekamo 500ms da se JWT token čuva
    const timer = setTimeout(() => {
      if (Capacitor.isNativePlatform()) {
        setupFCM();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [userId]);
};
