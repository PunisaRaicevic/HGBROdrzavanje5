// --- Potrebni importi ---
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Import za Supabase klijenta
import { createClient } from "@supabase/supabase-js";

// --- Inicijalizacija Firebase Admin SDK ---
// Ovo omogućava vašoj funkciji da komunicira sa Firebase servisima (kao što je FCM)
admin.initializeApp();

// --- Supabase konfiguracija i klijent ---
// OVE VREDNOSTI ĆE BITI PREUZETE IZ FIREBASE ENVIRONMENT KONFIGURACIJE
// NE URAĐUJU SE DIREKTNO OVDE, VEĆ PREKO `firebase functions:config:set` KOMANDE
const SUPABASE_URL = functions.config().supabase?.url;
const SUPABASE_SERVICE_ROLE_KEY = functions.config().supabase?.service_role_key;
const WEBHOOK_SECRET = functions.config().supabase?.webhook_secret;

// Proverite da li su vrednosti definisane pre kreiranja klijenta
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Supabase URL or Service Role Key is not configured in Firebase Functions environment."
  );
}

const supabaseAdmin = createClient(
  SUPABASE_URL || "",
  SUPABASE_SERVICE_ROLE_KEY || ""
);

// --- Vaša Cloud Function: handleSupabaseWebhook ---
// Ova funkcija će se aktivirati svaki put kada Supabase Webhook pošalje HTTP POST zahtev
export const handleSupabaseWebhook = functions.https.onRequest(
  async (req, res): Promise<void> => {
    // --- 1. Sigurnosna provera: Proverite tajni ključ Webhook-a ---
    if (
      !WEBHOOK_SECRET ||
      req.headers["x-supabase-webhook-secret"] !== WEBHOOK_SECRET
    ) {
      console.error(
        "Unauthorized webhook access: Invalid or missing secret."
      );
      res.status(403).send("Unauthorized");
      return;
    }

    // --- 2. Proverite HTTP metodu i telo zahteva ---
    if (req.method !== "POST") {
      console.warn(
        "Webhook received non-POST request. Only POST is allowed."
      );
      res.status(405).send("Method Not Allowed");
      return;
    }
    if (!req.body) {
      console.error("Webhook received empty body. Bad Request.");
      res.status(400).send("Bad Request: Body missing");
      return;
    }

    try {
      const webhookData = req.body;
      console.log(
        "Received Supabase webhook data:",
        JSON.stringify(webhookData, null, 2)
      );

      // Supabase Webhook payload za INSERT događaj obično sadrži 'record' objekat sa novim podacima
      const newRecord = webhookData.record;

      if (!newRecord) {
        console.error(
          'Missing "record" in webhook data. Unexpected payload structure.'
        );
        res.status(400).send("Bad Request: Missing record data");
        return;
      }

      // --- Ekstrakcija podataka iz Webhook-a ---
      // PAŽNJA: Prilagodite ove linije vašem Supabase šemi!
      // Imena polja moraju odgovarati vašim Supabase kolonama.
      const recipientUserId =
        newRecord.assigned_to || newRecord.recipient_id;
      const notificationTitle = newRecord.title || "Novi zadatak!";
      const notificationBody =
        newRecord.description || "Pogledaj detalje u aplikaciji";
      const itemId = newRecord.id;

      if (!recipientUserId || !notificationBody) {
        console.warn(
          "Missing recipient ID or notification body in new record. Skipping notification."
        );
        res
          .status(200)
          .send("No recipient or content for notification.");
        return;
      }

      // --- 3. Dohvatite FCM token primaoca iz Supabase baze ---
      const { data: userData, error } = await supabaseAdmin
        .from("users")
        .select("fcm_token")
        .eq("id", recipientUserId)
        .single();

      if (error) {
        console.error(
          "Error fetching recipient FCM token from Supabase:",
          error
        );
        res.status(500).send("Error fetching recipient token.");
        return;
      }
      if (!userData || !userData.fcm_token) {
        console.warn(
          `No FCM token found for user ID: ${recipientUserId}. Notification not sent.`
        );
        res
          .status(200)
          .send("Recipient token not found, notification skipped.");
        return;
      }

      const recipientFCMToken = userData.fcm_token;

      // --- 4. Kreirajte FCM poruku ---
      const message: admin.messaging.Message = {
        notification: {
          title: notificationTitle,
          body:
            notificationBody.substring(0, 150) +
            (notificationBody.length > 150 ? "..." : ""),
        },
        data: {
          itemId: String(itemId),
          type: "new_task_or_message",
        },
        token: recipientFCMToken,
        android: {
          priority: "high",
          notification: {
            sound: "default",
            channelId: "reklamacije-alert",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              contentAvailable: true,
            },
          },
        },
      };

      // --- 5. Pošaljite poruku putem FCM-a ---
      const response = await admin.messaging().send(message);
      console.log("Successfully sent message:", response);

      res.status(200).send("Notification sent successfully!");
    } catch (error) {
      console.error("Error processing Supabase webhook or sending FCM:", error);
      res.status(500).send("Error processing webhook.");
    }
  }
);
