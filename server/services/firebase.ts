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

async function deactivateInvalidToken(fcmToken: string, userId: string): Promise<void> {
try {
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
process.env.SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { error } = await supabase
.from('user_device_tokens')
.update({ is_active: false })
.eq('fcm_token', fcmToken)
.eq('user_id', userId);

if (error) {
console.error(`❌ Greška pri deaktivaciji nevažećeg tokena:`, error);
} else {
console.log(`🗑️ Deaktiviran nevažeći FCM token za korisnika ${userId}`);
}
} catch (error) {
console.error('❌ Greška pri deaktivaciji tokena:', error);
}
}

export async function sendPushToDeviceTokens(
tokens: string[],
title: string,
body: string,
userId?: string,
taskId?: string,
priority?: 'urgent' | 'normal' | 'can_wait'
): Promise<{ sent: number; failed: number; invalidTokens: string[] }> {
if (!firebaseInitialized || tokens.length === 0) {
return { sent: 0, failed: 0, invalidTokens: [] };
}

try {
const message: admin.messaging.MulticastMessage = {
tokens: tokens.slice(0, 500),
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
console.log(`✅ Batch FCM: ${response.successCount} uspešno, ${response.failureCount} neuspešno`);

const invalidTokens: string[] = [];
if (response.failureCount > 0 && userId) {
for (let i = 0; i < response.responses.length; i++) {
const resp = response.responses[i];
if (!resp.success && resp.error) {
const errorCode = (resp.error as any).code;
if (errorCode === 'messaging/registration-token-not-registered' || 
errorCode === 'messaging/invalid-registration-token') {
const badToken = tokens[i];
invalidTokens.push(badToken);
await deactivateInvalidToken(badToken, userId);
}
}
}
}

return {
sent: response.successCount,
failed: response.failureCount,
invalidTokens,
};

} catch (error) {
console.error('❌ Greška pri batch slanju FCM:', error);
return { sent: 0, failed: tokens.length, invalidTokens: [] };
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

const fcmTokens = tokens.map((t: any) => t.fcm_token);
const result = await sendPushToDeviceTokens(fcmTokens, title, body, userId, taskId, priority);

console.log(`✅ Push notifikacije: ${result.sent} poslato, ${result.failed} neuspešno`);
if (result.invalidTokens.length > 0) {
console.log(`🗑️ Deaktivirano ${result.invalidTokens.length} nevažećih tokena`);
}

return { sent: result.sent, failed: result.failed };

} catch (error) {
console.error('❌ Greška pri slanju push notifikacija:', error);
return { sent: 0, failed: 0 };
}
}