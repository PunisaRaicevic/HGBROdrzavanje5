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
    // 🔴 UVEK logujem kada se hook pozove - i na web i na mobilnom
    const callTime = new Date().toLocaleTimeString();
    console.log(`📱 [useFCM:${callTime}] Hook called with userId:`, userId ? `${userId.substring(0, 8)}...` : 'UNDEFINED');
    console.log(`📱 [useFCM:${callTime}] Window location:`, typeof window !== 'undefined' ? window.location.href : 'NO WINDOW');
    
    if (!userId) {
      console.warn(`⚠️ [useFCM:${callTime}] Skipping FCM setup - no userId provided`);
      return;
    }

    console.log(`✅ [useFCM:${callTime}] userId is valid - proceeding with FCM setup`);

    let isMounted = true;
    let hasStarted = false;

    const setupFCM = async () => {
      if (hasStarted || !isMounted) return;
      hasStarted = true;
      const setupTime = new Date().toLocaleTimeString();

      try {
        // Detektuj platform - koristi getPlatform() umesto isNativePlatform()
        const platform = Capacitor.getPlatform();
        const isNative = platform !== 'web';
        
        console.log(`🚀 [FCM:${setupTime}] Platform DETECTED: ${platform}, Is Native: ${isNative}`);
        console.log(`🚀 [FCM:${setupTime}] Capacitor.isNativePlatform() = ${Capacitor.isNativePlatform()}`);

        // Proveravamo JWT token
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.warn(`⚠️ [FCM:${setupTime}] Nema JWT tokena!`);
          return;
        }

        console.log(`✅ [FCM:${setupTime}] JWT token dostupan`);

        if (!isNative) {
          // 🌐 WEB VERZIJA - Čekam pravi Firebase Web FCM token (Not implemented yet - čeka Firebase setup)
          console.log(`🌐 [FCM:${setupTime}] Web verzija detektovana - Web Firebase Messaging će biti iniciјalizovan iz App.tsx`);
          return;
        }

        // ========== MOBILNA VERZIJA - Android/iOS ==========
        console.log(`📱 [FCM:${setupTime}] MOBILNA VERZIJA DETEKTOVANA! Platform: ${platform}`);

        // 🔥 1. Kreiraj notification channel (samo Android)
        console.log(`📝 [FCM:${setupTime}] Kreiram notification channel...`);
        await createNotificationChannel();
        console.log(`✅ [FCM:${setupTime}] Notification channel kreiran`);

        // Dinamički import PushNotifications
        console.log(`📝 [FCM:${setupTime}] Importujem @capacitor/push-notifications...`);
        const { PushNotifications } = await import('@capacitor/push-notifications');
        console.log(`✅ [FCM:${setupTime}] PushNotifications importovan`);

        // 2. Tražimo dozvolu
        console.log(`📋 [FCM:${setupTime}] Zahtevam push dozvole...`);
        const permResult = await PushNotifications.requestPermissions();
        console.log(`✅ [FCM:${setupTime}] Permission result:`, permResult.receive);
        
        if (permResult.receive !== 'granted') {
          console.warn(`⚠️ [FCM:${setupTime}] Push dozvola nije odobrena - status:`, permResult.receive);
          console.error(`❌ [FCM:${setupTime}] FAIL: Push dozvola NIJE ODOBRENA`);
          return;
        }
        console.log(`✅ [FCM:${setupTime}] Push dozvola odobrena`);

        // 3. Registrujemo uređaj i čekamo token
        console.log(`📝 [FCM:${setupTime}] Registrujem uređaj...`);

        let tokenReceived = false;
        const tokenTimeout = setTimeout(() => {
          if (!tokenReceived && isMounted) {
            console.warn(`⚠️ [FCM:${setupTime}] Token nije primljen nakon 10s`);
          }
        }, 10000);

        PushNotifications.addListener('registration', async (fcmToken) => {
          const regTime = new Date().toLocaleTimeString();
          clearTimeout(tokenTimeout);
          tokenReceived = true;
          
          console.log(`🔥 [FCM:${regTime}] Token primljen:`, fcmToken.value?.substring(0, 50) + '...');

          if (!isMounted) return;

          try {
            console.log(`📤 [FCM:${regTime}] Slanje tokena na backend - Platform: ${platform}, Token length: ${fcmToken.value.length}...`);
            const payload = {
              token: fcmToken.value,
              platform: platform,
            };
            console.log(`📤 [FCM:${regTime}] Payload koji se šalje:`, { ...payload, token: payload.token.substring(0, 30) + '...' });
            const response = await apiRequest('POST', '/api/users/fcm-token', payload);
            console.log(`✅ [FCM:${regTime}] Token sačuvan na backend!`, response);
          } catch (err) {
            console.error(`❌ [FCM:${regTime}] Greška pri slanju tokena:`, err);
          }
        });

        PushNotifications.addListener('registrationError', (err: any) => {
          const errTime = new Date().toLocaleTimeString();
          clearTimeout(tokenTimeout);
          console.error(`❌ [FCM:${errTime}] Greška pri registraciji:`, err?.message || JSON.stringify(err));
        });

        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          const notifTime = new Date().toLocaleTimeString();
          console.log(`📥 [FCM:${notifTime}] Primljena notifikacija:`, notification);
          
          // 🔥 KLJUČNO: Prikaži LOCAL NOTIFICATION sa zvukom i vibracijom
          // Ovo će raditi i kada je app u background-u!
          try {
            const { LocalNotifications } = await import('@capacitor/local-notifications');
            
            // Tražimo dozvolu za local notifikacije
            const permResult = await LocalNotifications.requestPermissions();
            if (permResult.display !== 'granted') {
              console.warn(`⚠️ [FCM:${notifTime}] Local notification dozvola nije odobrena`);
              return;
            }
            
            // Prikaži notifikaciju SA ZVUKOM
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: notification.data?.title || notification.notification?.title || 'Novi zadatak',
                  body: notification.data?.body || notification.notification?.body || 'Imate novi zadatak',
                  id: Date.now(),
                  sound: 'default', // ZVUK!
                  smallIcon: 'ic_stat_icon_config_sample',
                  channelId: 'reklamacije-alert',
                  extra: notification.data,
                },
              ],
            });
            console.log(`✅ [FCM:${notifTime}] Local notification prikazana sa zvukom!`);
          } catch (error) {
            console.error(`❌ [FCM:${notifTime}] Greška pri prikazu local notifikacije:`, error);
          }
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const actionTime = new Date().toLocaleTimeString();
          console.log(`🔔 [FCM:${actionTime}] Korisnik kliknuo na notifikaciju`);
          const data = action.notification.data;
          if (data?.taskId) {
            console.log(`🔗 [FCM:${actionTime}] Task ID:`, data.taskId);
          }
        });

        // 4. Registruj uređaj
        console.log(`📝 [FCM:${setupTime}] Pozivam PushNotifications.register()...`);
        await PushNotifications.register();
        console.log(`✅ [FCM:${setupTime}] Uređaj registrovan - čekam token...`);

      } catch (error: any) {
        const errorTime = new Date().toLocaleTimeString();
        console.error(`❌ [FCM:${errorTime}] Greška pri inicijalizaciji:`, error?.message || error);
        console.error(`❌ [FCM:${errorTime}] Full stack:`, error);
      }
    };

    // Čekamo da se JWT token kešira pre nego što pokrenemo FCM
    console.log(`📝 [useFCM:${callTime}] Postavljam timeout od 500ms za setupFCM...`);
    const timer = setTimeout(() => {
      if (isMounted) {
        console.log(`📝 [useFCM] Pozivam setupFCM...`);
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