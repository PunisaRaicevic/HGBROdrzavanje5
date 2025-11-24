// --- Potrebni importi ---
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Import za Supabase klijenta
import { createClient } from '@supabase/supabase-js';

// --- Inicijalizacija Firebase Admin SDK ---
// Ovo omogućava vašoj funkciji da komunicira sa Firebase servisima (kao što je FCM)
admin.initializeApp();

// --- Supabase konfiguracija i klijent ---
// OVE VREDNOSTI ĆE BITI PREUZETE IZ FIREBASE ENVIRONMENT KONFIGURACIJE
// NE URAĐUJU SE DIREKTNO OVDE, VEĆ PREKO `firebase functions:config:set` KOMANDE
const SUPABASE_URL = functions.config().supabase?.url; // ? znači da može biti undefined
const SUPABASE_SERVICE_ROLE_KEY = functions.config().supabase?.service_role_key;
const WEBHOOK_SECRET = functions.config().supabase?.webhook_secret; // Tajni ključ za Supabase Webhook

// Proverite da li su vrednosti definisane pre kreiranja klijenta
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Supabase URL or Service Role Key is not configured in Firebase Functions environment.');
    // Replit AI nas obaveštava da ovo treba da podesimo
}

const supabaseAdmin = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '');


// --- Vaša Cloud Function: handleSupabaseWebhook ---
// Ova funkcija će se aktivirati svaki put kada Supabase Webhook pošalje HTTP POST zahtev
export const handleSupabaseWebhook = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response): Promise<void> => {
    // --- 1. Sigurnosna provera: Proverite tajni ključ Webhook-a ---
    if (!WEBHOOK_SECRET || req.headers['x-supabase-webhook-secret'] !== WEBHOOK_SECRET) {
        console.error('Unauthorized webhook access: Invalid or missing secret.');
        res.status(403).send('Unauthorized');
        return;
    }

    // --- 2. Proverite HTTP metodu i telo zahteva ---
    if (req.method !== 'POST') {
        console.warn('Webhook received non-POST request. Only POST is allowed.');
        res.status(405).send('Method Not Allowed');
        return;
    }
    if (!req.body) {
        console.error('Webhook received empty body. Bad Request.');
        res.status(400).send('Bad Request: Body missing');
        return;
    }

    try {
        const webhookData = req.body;
        console.log('Received Supabase webhook data:', JSON.stringify(webhookData, null, 2));

        // Supabase Webhook payload za INSERT događaj obično sadrži 'record' objekat sa novim podacima
        const newRecord = webhookData.record;

        if (!newRecord) {
            console.error('Missing "record" in webhook data. Unexpected payload structure.');
            res.status(400).send('Bad Request: Missing record data');
            return;
        }

        // --- Ekstrakcija podataka iz Webhook-a ---
        // TABELA: tasks (Webhook će biti triggeran na INSERT/UPDATE ove tabele)
        // Ova polja odgovaraju tačnim kolonama u Supabase šemi:
        const recipientUserId = newRecord.assigned_to; // Kolona: tasks.assigned_to (TEXT - ID korisnika kojem je zadatak dodeljen)
        const notificationTitle = newRecord.title || 'Novi zadatak!'; // Kolona: tasks.title (naslov zadatka)
        const notificationBody = newRecord.description || 'Imate novi zadatak.'; // Kolona: tasks.description (detaljan opis zadatka)
        const itemId = newRecord.id; // Kolona: tasks.id (primarni ključ - ID zadatka)

        if (!recipientUserId || !notificationBody) {
            console.warn('Missing recipient ID or notification body in new record. Skipping notification.');
            res.status(200).send('No recipient or content for notification.');
            return;
        }

        // --- 3. Dohvatite AKTIVNE FCM tokene primaoca iz Supabase baze ---
        // BITNO: Koristimo user_device_tokens tabelu, ne users.fcm_token
        // Tražimo samo aktivne tokene (is_active = true)
        const { data: tokenData, error } = await supabaseAdmin
            .from('user_device_tokens')
            .select('fcm_token')
            .eq('user_id', recipientUserId)
            .eq('is_active', true);

        if (error) {
            console.error('Error fetching recipient FCM tokens from Supabase:', error);
            res.status(500).send('Error fetching recipient tokens.');
            return;
        }
        if (!tokenData || tokenData.length === 0) {
            console.warn(`No active FCM tokens found for user ID: ${recipientUserId}. Notification not sent.`);
            res.status(200).send('No active tokens found, notification skipped.');
            return;
        }

        // Korisnik može imati više aktivnih uređaja - šaljemo na SVE
        const recipientFCMTokens = tokenData.map((t: any) => t.fcm_token);
        console.log(`Found ${recipientFCMTokens.length} active token(s) for user ${recipientUserId}`);

        // --- 4. Kreirajte FCM poruku sa NOTIFICATION payload + android_channel_id ---
        // VAŽNO: Koristimo notification payload sa android_channel_id
        // Ovo omogućava Android OS-u da automatski prikaže notifikaciju
        // koristeći pre-konfigurisani notification channel sa custom zvukom i vibracijom

        // --- 5. Pošaljite poruku na SVE aktivne tokene ---
        // VAŽNO: DATA-ONLY payload (bez notification polja)
        // Ovo osigurava da se MyFirebaseMessagingService.onMessageReceived() UVEK poziva
        const sendPromises = recipientFCMTokens.map((token: string) => {
            const message = {
                // NEMA notification polja - samo data!
                data: {
                    title: notificationTitle,
                    body: notificationBody.substring(0, 500),
                    itemId: String(itemId),
                    type: 'task_assigned',
                    priority: 'urgent',
                },
                token: token,
                android: {
                    priority: 'high' as const, // Visoki prioritet za background delivery
                },
                apns: {
                    payload: {
                        aps: {
                            contentAvailable: true,
                            // iOS zahteva notification payload za background
                            // ali Android ne sme imati notification ako zelimo custom handling
                        },
                    },
                },
            };
            
            return admin.messaging().send(message as admin.messaging.Message);
        });

        const responses = await Promise.allSettled(sendPromises);
        const successCount = responses.filter(r => r.status === 'fulfilled').length;
        const failCount = responses.filter(r => r.status === 'rejected').length;
        
        console.log(`Notification results: ${successCount} sent, ${failCount} failed`);
        
        if (failCount > 0) {
            responses.forEach((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Failed to send to token ${index}:`, result.reason);
                }
            });
        }

        res.status(200).send(`Notifications sent: ${successCount} successful, ${failCount} failed`);

    } catch (error) {
        console.error('Error processing Supabase webhook or sending FCM:', error);
        res.status(500).send('Error processing webhook.');
    }
});
