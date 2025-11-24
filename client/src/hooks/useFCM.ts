import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { apiRequest } from '@/lib/queryClient';
// NOTE: PushNotifications imported dynamically to avoid errors on web platform

// 🔥 Kreiranje notification channel-a za Android
const createNotificationChannel = async () => {
  const platform = Capacitor.getPlatform();
  if (platform !== 'android') {
    console.log(`⏭️ [FCM] Skipping notification channel - platform is ${platform}`);
    return;
  }
  
  try {
    // Dinamički import PushNotifications samo na native platformama
    const { PushNotifications: PN } = await import('@capacitor/push-notifications');
    await PN.createChannel({
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
};

export const useFCM = (userId?: string) => {
  useEffect(() => {
    // 🔴 UVEK logujem kada se hook pozove
    console.log(`📱 [useFCM] Hook called with userId:`, userId ? `${userId.substring(0, 8)}...` : 'UNDEFINED');
    
    if (!userId) {
      console.warn('⚠️ [useFCM] Skipping FCM setup - no userId provided');
      return;
    }

    console.log(`✅ [useFCM] userId is valid - proceeding with FCM setup`);

    let isMounted = true;
    let hasStarted = false;

    const setupFCM = async () => {
      if (hasStarted || !isMounted) return;
      hasStarted = true;

      try {
        // Detektuj platform - koristi getPlatform() umesto isNativePlatform()
        const platform = Capacitor.getPlatform();
        const isNative = platform !== 'web';
        
        console.log(`🚀 [FCM] Platform: ${platform}, Is Native: ${isNative}`);

        // Proveravamo JWT token
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn('⚠️ [FCM] Nema JWT tokena!');
          return;
        }

        if (!isNative) {
          // 🌐 WEB VERZIJA - Pošalji fallback token za testiranje
          console.log('🌐 [FCM] Web verzija - Slanje fallback FCM tokena...');
          try {
            const fallbackToken = `web-fcm-${userId}-${Date.now()}`;
            const response = await apiRequest('POST', '/api/users/fcm-token', {
              token: fallbackToken,
            });
            console.log('✅ [FCM] Web fallback token poslat:', response);
          } catch (err) {
            console.error('❌ [FCM] Greška pri slanju web fallback tokena:', err);
          }
          return;
        }

        console.log('✅ [FCM] JWT token dostupan');

        // 🔥 1. Kreiraj notification channel (samo Android)
        await createNotificationChannel();

        // Dinamički import PushNotifications
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // 2. Tražimo dozvolu
        console.log('📋 [FCM] Zahtevam push dozvole...');
        const permResult = await PushNotifications.requestPermissions();
        console.log('✅ [FCM] Permission result:', permResult.receive);
        
        if (permResult.receive !== 'granted') {
          console.warn('⚠️ [FCM] Push dozvola nije odobrena - status:', permResult.receive);
          return;
        }
        console.log('✅ [FCM] Push dozvola odobrena');

        // 3. Registrujemo uređaj i čekamo token
        console.log('📝 [FCM] Registrujem uređaj...');

        let tokenReceived = false;
        const tokenTimeout = setTimeout(() => {
          if (!tokenReceived && isMounted) {
            console.warn('⚠️ [FCM] Token nije primljen nakon 10s');
          }
        }, 10000);

        PushNotifications.addListener('registration', async (fcmToken) => {
          clearTimeout(tokenTimeout);
          tokenReceived = true;
          
          console.log('🔥 [FCM] Token primljen:', fcmToken.value?.substring(0, 50) + '...');

          if (!isMounted) return;

          try {
            console.log('[FCM] Slanje tokena na backend...');
            const response = await apiRequest('POST', '/api/users/fcm-token', {
              token: fcmToken.value,
            });
            console.log('✅ [FCM] Token sačuvan na backend!', response);
          } catch (err) {
            console.error('❌ [FCM] Greška pri slanju tokena:', err);
          }
        });

        PushNotifications.addListener('registrationError', (err: any) => {
          clearTimeout(tokenTimeout);
          console.error('❌ [FCM] Greška pri registraciji:', err?.message || JSON.stringify(err));
        });

        PushNotifications.addListener('pushNotificationReceived', (notif) => {
          console.log('📥 [FCM] Primljena notifikacija (foreground):', notif.notification.title);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('🔔 [FCM] Korisnik kliknuo na notifikaciju');
          const data = action.notification.data;
          if (data?.taskId) {
            console.log('🔗 [FCM] Task ID:', data.taskId);
          }
        });

        // 4. Registruj uređaj
        await PushNotifications.register();
        console.log('✅ [FCM] Uređaj registrovan - čekam token...');

      } catch (error: any) {
        console.error('❌ [FCM] Greška pri inicijalizaciji:', error?.message || error);
      }
    };

    // Čekamo da se JWT token kešira pre nego što pokrenemo FCM
    const timer = setTimeout(() => {
      if (isMounted) {
        setupFCM();
      }
    }, 500);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      try {
        const platform = Capacitor.getPlatform();
        if (platform !== 'web') {
          import('@capacitor/push-notifications').then(({ PushNotifications }) => {
            PushNotifications.removeAllListeners();
          });
        }
      } catch (e) {
        // Ignore cleanup errors
      }
    };
  }, [userId]);
};