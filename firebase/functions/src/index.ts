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

        // --- 3. Dohvatite FCM token primaoca iz Supabase baze ---
        const { data: userData, error } = await supabaseAdmin
            .from('users') // PAŽNJA: "users" je tabela gde se čuvaju korisnici i fcm_token!
            .select('fcm_token') // PAŽNJA: "fcm_token" je kolona gde se čuvaju tokeni!
            .eq('id', recipientUserId) // Pronađite korisnika po ID-u
            .single(); // Očekujemo samo jedan rezultat

        if (error) {
            console.error('Error fetching recipient FCM token from Supabase:', error);
            res.status(500).send('Error fetching recipient token.');
            return;
        }
        if (!userData || !userData.fcm_token) {
            console.warn(`No FCM token found for user ID: ${recipientUserId}. Notification not sent.`);
            res.status(200).send('Recipient token not found, notification skipped.');
            return;
        }

        const recipientFCMToken = userData.fcm_token;

        // --- 4. Kreirajte FCM poruku ---
        const message = {
            notification: {
                title: notificationTitle,
                body: notificationBody.substring(0, 150) + (notificationBody.length > 150 ? '...' : ''), // Skratite telo ako je predugo
                // sound: 'default', // Ovo aktivira default zvučnu notifikaciju na uređaju
            },
            data: {
                // Podaci koji će biti poslati vašoj aplikaciji i koje možete obraditi u kodu
                itemId: String(itemId), // Uvek šaljite kao string
                type: 'new_task_or_message',
                // Dodajte druge podatke koje želite da prosledite, npr. senderId, claimId
            },
            token: recipientFCMToken,
            // Specifična podešavanja za platforme (potrebno za zvuk i na nekim platformama)
            android: {
                priority: 'high', // Visoki prioritet za brzu isporuku
                notification: {
                    sound: 'default', // Ponavlja zvuk za Android specifičnosti
                    channelId: 'reklamacije-alert',
                },
            },
            apns: { // Apple Push Notification Service (za iOS)
                payload: {
                    aps: {
                        sound: 'default', // Ponavlja zvuk za iOS specifičnosti
                        contentAvailable: true,
                    },
                },
            },
        };

        // --- 5. Pošaljite poruku putem FCM-a ---
        const response = await admin.messaging().send(message as admin.messaging.Message);
        console.log('Successfully sent message:', response);

        res.status(200).send('Notification sent successfully!');

    } catch (error) {
        console.error('Error processing Supabase webhook or sending FCM:', error);
        res.status(500).send('Error processing webhook.');
    }
});
