// ========================================================================
// LEGACY: Firebase Cloud Messaging (FCM) Push Notifications
// ========================================================================
// This service has been REPLACED by OneSignal (server/services/onesignal.ts)
// Keeping this file for historical reference and potential fallback.
// Last active: November 2025
// ========================================================================

import admin from 'firebase-admin';

let firebaseInitialized = false;

export function initializeFirebase() {
if (firebaseInitialized) {
return;
}

try {
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
console.warn('⚠️ Firebase credentials nisu postavljeni - FCM push notifikacije neće raditi!');
return;
}

admin.initializeApp({
credential: admin.credential.cert({
projectId,
clientEmail,
privateKey: privateKey.replace(/\\n/g, '\n'),
}),
});

firebaseInitialized = true;
console.log('✅ Firebase Admin SDK uspešno inicijalizovan');
console.log(`📱 FCM Project: ${projectId}`);
} catch (error) {
console.error('❌ Greška pri inicijalizaciji Firebase Admin SDK:', error);
}
}

export interface PushNotificationPayload {
token: string;
title: string;
body: string;
data?: Record<string, string>;
taskId?: string;
priority?: 'urgent' | 'normal' | 'can_wait';
}

export async function sendPushNotification(payload: PushNotificationPayload): Promise<boolean> {
if (!firebaseInitialized) {
console.warn('⚠️ Firebase nije inicijalizovan - preskačem slanje push notifikacije');
return false;
}

try {
const { token, title, body, data = {}, taskId, priority = 'normal' } = payload;

const message: admin.messaging.Message = {
token,

notification: {
title,
body,
},

// ---------- ANDROID KONFIGURACIJA (FIKSIRANA ZA ZVUK) ----------
android: {
priority: 'high',
notification: {
channelId: 'reklamacije-alert',
sound: 'default',
visibility: 'public',
priority: 'high',
        defaultVibrateTimings: true,
},
},

// ---------- iOS KONFIGURACIJA ----------
apns: {
payload: {
aps: {
sound: 'default', // Vraćeno na default dok se custom ne konfiguriše
badge: 1,
contentAvailable: true,
},
},
},

// ---------- DATA BLOK ----------
data: {
...data,
taskId: taskId || '',
priority: priority,
type: 'new_task',
forceLocal: 'true',
},
};

const response = await admin.messaging().send(message);
console.log('✅ FCM push notifikacija uspešno poslata:', response);
return true;

} catch (error: any) {
// Auto-cleanup invalid/expired FCM tokens
if (error?.errorInfo?.code === 'messaging/registration-token-not-registered' || 
    error?.errorInfo?.code === 'messaging/invalid-registration-token') {
  console.warn(`🗑️ Invalid FCM token detected, removing from database: ${payload.token.substring(0, 20)}...`);
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    await supabase
      .from('user_device_tokens')
      .delete()
      .eq('fcm_token', payload.token);
    
    console.log('✅ Invalid FCM token removed from database');
  } catch (cleanupError) {
    console.error('❌ Failed to cleanup invalid FCM token:', cleanupError);
  }
}

console.error('❌ Greška pri slanju FCM push notifikacije:', error);
return false;
}
}

export async function sendPushToUser(
userId: string,
title: string,
body: string,
taskId?: string,
priority?: 'urgent' | 'normal' | 'can_wait'
): Promise<boolean> {
try {
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: user, error } = await supabase
.from('users')
.select('fcm_token')
.eq('id', userId)
.single();

if (error || !user?.fcm_token) {
console.warn(`⚠️ User ${userId} nema registrovan push token - preskačem FCM slanje`);
return false;
}

return await sendPushNotification({
token: user.fcm_token,
title,
body,
taskId,
priority,
});

} catch (error) {
console.error('❌ Greška pri slanju push notifikacije korisniku:', error);
return false;
}
}

export async function sendPushToAllUserDevices(
userId: string,
title: string,
body: string,
taskId?: string,
priority?: 'urgent' | 'normal' | 'can_wait'
): Promise<{ sent: number; failed: number }> {
try {
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: tokens, error } = await supabase
.from('user_device_tokens')
.select('fcm_token')
.eq('user_id', userId)
.eq('is_active', true);

if (error || !tokens || tokens.length === 0) {
console.warn(`⚠️ Korisnik ${userId} nema aktivnih device tokena`);
return { sent: 0, failed: 0 };
}

console.log(`📱 Pronađeno ${tokens.length} aktivnih tokena za korisnika ${userId}`);

const results = await Promise.allSettled(
tokens.map((t: any) =>
sendPushNotification({
token: t.fcm_token,
title,
body,
taskId,
priority,
})
)
);

const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
const failed = results.length - sent;

console.log(`✅ Push notifikacije: ${sent} poslato, ${failed} neuspešno`);
return { sent, failed };

} catch (error) {
console.error('❌ Greška pri slanju push notifikacija:', error);
return { sent: 0, failed: 0 };
}
}