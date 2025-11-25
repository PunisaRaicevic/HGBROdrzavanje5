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

} catch (error) {
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

/**
 * Send push notifications to multiple device tokens in BATCH using Firebase Multicast
 * Supports up to 500 tokens per call with automatic chunking
 */
export async function sendPushToDeviceTokens(
  tokens: string[],
  title: string,
  body: string,
  taskId?: string,
  priority?: 'urgent' | 'normal' | 'can_wait'
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
  if (!firebaseInitialized) {
    console.warn('⚠️ Firebase nije inicijalizovan - preskačem batch push');
    return { sent: 0, failed: tokens.length, invalidTokens: [] };
  }

  if (tokens.length === 0) {
    return { sent: 0, failed: 0, invalidTokens: [] };
  }

  const BATCH_SIZE = 500;
  const chunks = [];
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    chunks.push(tokens.slice(i, i + BATCH_SIZE));
  }

  let totalSent = 0;
  let totalFailed = 0;
  const invalidTokens: string[] = [];

  for (const chunk of chunks) {
    try {
      const message: admin.messaging.MulticastMessage = {
        tokens: chunk,
        
        notification: {
          title,
          body,
        },

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

        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true,
            },
          },
        },

        data: {
          taskId: taskId || '',
          priority: priority || 'normal',
          type: 'new_task',
          forceLocal: 'true',
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      totalSent += response.successCount;
      totalFailed += response.failureCount;

      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(chunk[idx]);
          }
        }
      });

      console.log(`📨 Batch ${chunks.indexOf(chunk) + 1}/${chunks.length}: ${response.successCount} sent, ${response.failureCount} failed`);

    } catch (error) {
      console.error('❌ Greška pri batch slanju FCM notifikacija:', error);
      totalFailed += chunk.length;
    }
  }

  return { sent: totalSent, failed: totalFailed, invalidTokens };
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

const { data: tokenRecords, error } = await supabase
.from('user_device_tokens')
.select('id, fcm_token')
.eq('user_id', userId)
.eq('is_active', true);

if (error || !tokenRecords || tokenRecords.length === 0) {
console.warn(`⚠️ Korisnik ${userId} nema aktivnih device tokena`);
return { sent: 0, failed: 0 };
}

console.log(`📱 Pronađeno ${tokenRecords.length} aktivnih tokena za korisnika ${userId}`);

const tokens = tokenRecords.map((t: any) => t.fcm_token);
const result = await sendPushToDeviceTokens(tokens, title, body, taskId, priority);

if (result.invalidTokens.length > 0) {
  console.warn(`🗑️ Deactivating ${result.invalidTokens.length} invalid tokens...`);
  const invalidIds = tokenRecords
    .filter((t: any) => result.invalidTokens.includes(t.fcm_token))
    .map((t: any) => t.id);

  if (invalidIds.length > 0) {
    await supabase
      .from('user_device_tokens')
      .update({ is_active: false })
      .in('id', invalidIds);
  }
}

console.log(`✅ Push notifikacije: ${result.sent} poslato, ${result.failed} neuspešno`);
return { sent: result.sent, failed: result.failed };

} catch (error) {
console.error('❌ Greška pri slanju push notifikacija:', error);
return { sent: 0, failed: 0 };
}
}