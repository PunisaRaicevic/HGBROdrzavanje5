importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDMaf507Om6Dq-RUKmaStCnrfQ9ywUdo44",
  authDomain: "hgbrodrzavanje-39543.firebaseapp.com",
  projectId: "hgbrodrzavanje-39543",
  storageBucket: "hgbrodrzavanje-39543.appspot.com",
  messagingSenderId: "227433602872",
  appId: "1:227433602872:web:3670adb0773591e68debcd",
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Primljena background notifikacija:', payload);
  
  const notificationTitle = payload.notification?.title || 'Nova notifikacija';
  const notificationOptions = {
    body: payload.notification?.body || 'Imate novu poruku',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    sound: 'alert1.mp3',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    tag: 'fcm-notification',
    requireInteraction: false,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Kliknuta notifikacija:', event.notification);
  event.notification.close();

  const taskId = event.notification.data?.taskId;
  if (taskId) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === `${self.location.origin}/tasks/${taskId}` && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(`/tasks/${taskId}`);
        }
      })
    );
  }
});
