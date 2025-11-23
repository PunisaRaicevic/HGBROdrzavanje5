import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicijalizuj Firebase Admin SDK
admin.initializeApp();

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id: string;
    title?: string;
    description?: string;
    assigned_to?: string;
    assigned_to_name?: string;
    created_by?: string;
    priority?: string;
    status?: string;
  };
  old_record?: Record<string, any>;
}

interface NotificationPayload {
  fcm_token: string;
  title: string;
  body: string;
  taskId: string;
  priority: string;
}

/**
 * Cloud Function: Supabase Webhook Handler za Task Notifikacije
 * 
 * Primanja HTTP zahtev od Supabase Webhook kada se task kreira ili menja
 * Automatski šalje FCM push notifikaciju korisniku kojem je task dodeljen
 */
export const supabaseWebhookHandler = functions.https.onRequest(
  async (req, res) => {
    console.log("[WEBHOOK] Primljen zahtev:", {
      method: req.method,
      path: req.path,
      type: req.body?.type,
      table: req.body?.table,
    });

    // Samo POST zahtevi su dozvoljeni
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    try {
      const payload: WebhookPayload = req.body;

      // Validacija payload-a
      if (!payload.type || !payload.table || !payload.record) {
        return res.status(400).json({ error: "Invalid payload structure" });
      }

      // Obradi samo task tabelu
      if (payload.table !== "tasks") {
        console.log(`[WEBHOOK] Ignorisanje non-task tabele: ${payload.table}`);
        return res.status(200).json({ message: "Not a task event" });
      }

      const { record, type, old_record } = payload;

      // Obradi različite tipove događaja
      switch (type) {
        case "INSERT":
          await handleTaskCreated(record);
          break;

        case "UPDATE":
          await handleTaskAssigned(record, old_record);
          break;

        case "DELETE":
          console.log(`[WEBHOOK] Task obrisan: ${record.id}`);
          break;

        default:
          console.log(`[WEBHOOK] Nepoznat tip događaja: ${type}`);
      }

      return res.status(200).json({ success: true, message: "Notification sent" });
    } catch (error) {
      console.error("[WEBHOOK ERROR]", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * Obradi kreirani task - pošalji notifikaciju korisniku koji je kreirao
 */
async function handleTaskCreated(record: WebhookPayload["record"]) {
  try {
    console.log(`[WEBHOOK] Nova task: ${record.id} - ${record.title}`);

    if (!record.assigned_to) {
      console.log(`[WEBHOOK] Task nema dodeljenog korisnika, preskaču notifikaciju`);
      return;
    }

    // Dohvati FCM token korisnika kojem je task dodeljen
    const userTokens = await getUserFcmTokens(record.assigned_to);

    if (userTokens.length === 0) {
      console.log(`[WEBHOOK] Korisnik ${record.assigned_to} nema FCM tokena`);
      return;
    }

    const notificationTitle = `Nova zadatka: ${record.title}`;
    const notificationBody =
      record.description?.substring(0, 100) || "Detaljnije: pogledaj u aplikaciji";

    // Pošalji notifikaciju svim uređajima korisnika
    for (const token of userTokens) {
      await sendPushNotification({
        fcm_token: token,
        title: notificationTitle,
        body: notificationBody,
        taskId: record.id,
        priority: record.priority || "normal",
      });
    }

    console.log(
      `[WEBHOOK] Notifikacija poslata za novu task: ${record.id} (${userTokens.length} tokeni)`
    );
  } catch (error) {
    console.error("[WEBHOOK ERROR - handleTaskCreated]", error);
  }
}

/**
 * Obradi dodelu task-a - pošalji notifikaciju novom koristniku
 */
async function handleTaskAssigned(
  record: WebhookPayload["record"],
  oldRecord?: Record<string, any>
) {
  try {
    // Proveri da li se assigned_to promenio
    if (!oldRecord || oldRecord.assigned_to === record.assigned_to) {
      console.log(`[WEBHOOK] Task ${record.id} nije promenio dodeljenost`);
      return;
    }

    console.log(
      `[WEBHOOK] Task ${record.id} dodeljena sa ${oldRecord.assigned_to} na ${record.assigned_to}`
    );

    if (!record.assigned_to) {
      console.log(`[WEBHOOK] Task više nije dodeljena nikome`);
      return;
    }

    // Dohvati FCM token novog korisnika
    const userTokens = await getUserFcmTokens(record.assigned_to);

    if (userTokens.length === 0) {
      console.log(`[WEBHOOK] Novi korisnik ${record.assigned_to} nema FCM tokena`);
      return;
    }

    const notificationTitle = `Zadatka dodeljena: ${record.title}`;
    const notificationBody = `${record.created_by_name || "Admin"} vam je dodelila zadatku`;

    // Pošalji notifikaciju
    for (const token of userTokens) {
      await sendPushNotification({
        fcm_token: token,
        title: notificationTitle,
        body: notificationBody,
        taskId: record.id,
        priority: record.priority || "normal",
      });
    }

    console.log(
      `[WEBHOOK] Notifikacija o dodeli poslata korisniku: ${record.assigned_to}`
    );
  } catch (error) {
    console.error("[WEBHOOK ERROR - handleTaskAssigned]", error);
  }
}

/**
 * Dohvati sve FCM tokene za korisnika (može biti na više uređaja)
 */
async function getUserFcmTokens(userId: string): Promise<string[]> {
  try {
    // Za sada koristimo mock - u produkciji bi se čitalo iz Supabase
    // jer je Cloud Function na Firebase-u, a podaci su u Supabase
    const tokens: string[] = [];
    console.log(`[WEBHOOK] Dohvatanje FCM tokena za korisnika: ${userId}`);
    return tokens;
  } catch (error) {
    console.error(`[WEBHOOK ERROR - getUserFcmTokens] userId: ${userId}`, error);
    return [];
  }
}

/**
 * Pošalji FCM push notifikaciju
 */
async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const { fcm_token, title, body, taskId, priority } = payload;

    const message: admin.messaging.Message = {
      token: fcm_token,
      notification: {
        title,
        body,
      },
      // Android specifična konfiguracija
      android: {
        priority: "high",
        notification: {
          channelId: "reklamacije-alert",
          sound: "alert1",
          priority: "high",
          defaultVibrateTimings: true,
        },
      },
      // iOS specifična konfiguracija
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            contentAvailable: true,
          },
        },
      },
      // Web specifična konfiguracija
      webpush: {
        notification: {
          title,
          body,
          icon: "https://via.placeholder.com/192",
          badge: "https://via.placeholder.com/72",
        },
      },
      data: {
        taskId,
        priority,
        type: "task_notification",
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[FCM] Notifikacija poslata uspešno: ${response}`);
    return true;
  } catch (error) {
    console.error("[FCM ERROR]", error);
    return false;
  }
}
