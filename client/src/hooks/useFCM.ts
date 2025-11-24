import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';

// 🔥 Kreiranje notification channel-a za Android
const createNotificationChannel = async () => {
  if (Capacitor.getPlatform() === 'android') {
    try {
      await PushNotifications.createChannel({
        id: 'reklamacije-alert', // 🔥 MORA SE POKLAPATI SA channelId u Firebase Cloud Function
        name: 'Reklamacije Notifikacije',
        description: 'Notifikacije za dodeljene reklamacije i zadatke',
        importance: 5, // 5 = Max importance (sa zvukom)
        sound: 'default',
        vibration: true,
        visibility: 1, // Public
      });
      console.log('✅ [FCM] Notification channel "reklamacije-alert" created');
    } catch (error) {
      console.error('❌ [FCM] Error creating notification channel:', error);
    }
  }
};

export const useFCM = (userId?: string) => {
  useEffect(() => {
    // SKIP - samo na mobilnim platformama
    if (!userId || !Capacitor.isNativePlatform()) {
      return;
    }

    const setupFCM = async () => {
      console.log('🚀 [FCM] Inicijalizujem push notifikacije...');

      // Proveravamo JWT token
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('⚠️ [FCM] Nema JWT tokena!');
        return;
      }

      try {
        // 🔥 1. Kreiraj notification channel (samo Android)
        await createNotificationChannel();

        // 2. Tražimo dozvolu
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          console.warn('⚠️ [FCM] Push dozvola nije odobrena.');
          return;
        }
        console.log('✅ [FCM] Push dozvola odobrena');

        // 3. Registrujemo uređaj
        await PushNotifications.register();
        console.log('✅ [FCM] Uređaj registrovan');

        // 4. Postavljamo listenere
        PushNotifications.addListener('registration', async (fcmToken) => {
          console.log('🔥 [FCM] Token uređaja:', fcmToken.value);

          if (userId) {
            try {
              console.log('[FCM] Slanje tokena na backend...');
              const response = await apiRequest('POST', '/api/users/fcm-token', {
                token: fcmToken.value,
              });
              console.log('✅ [FCM] Backend odgovorio:', response.status);
              console.log('💾 [FCM] Token sačuvan u bazi!');
            } catch (err) {
              console.error('❌ [FCM] Greška pri slanju tokena:', err);
            }
          }
        });

        PushNotifications.addListener('registrationError', (err: any) => {
          console.error('❌ [FCM] Greška pri registraciji:', err?.message || err);
        });

        PushNotifications.addListener('pushNotificationReceived', (notif) => {
          console.log('📥 [FCM] Primljena notifikacija:', notif);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('🔔 [FCM] Korisnik kliknuo na notifikaciju:', action);
          
          // Navigacija na task detail ako je potrebno
          const data = action.notification.data;
          if (data.type === 'task_assigned' && data.taskId) {
            console.log('🔗 [FCM] Navigiram na task:', data.taskId);
            // window.location.href = `/tasks/${data.taskId}`; // Primer navigacije
          }
        });

      } catch (error) {
        console.error('❌ [FCM] Greška pri inicijalizaciji:', error);
      }
    };

    // Čekamo 500ms da se JWT token čuva
    const timer = setTimeout(() => {
      setupFCM();
    }, 500);

    return () => {
      clearTimeout(timer);
      // Cleanup samo na mobilnim platformama
      if (Capacitor.isNativePlatform()) {
        PushNotifications.removeAllListeners();
      }
    };
  }, [userId]);
};