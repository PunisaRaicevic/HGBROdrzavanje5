// Funkcija koja šalje notifikaciju preko OneSignal API-ja
export async function sendPushNotification(targetUserId: string, title: string, message: string) {
  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  // Provera da li postoje ključevi u Replit Secrets
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.warn("⚠️ OneSignal ključevi nisu podešeni u Secrets!");
    return;
  }

  if (!targetUserId) {
    console.warn("⚠️ Pokušaj slanja notifikacije bez ciljanog korisnika (targetUserId)");
    return;
  }

  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
  };

  const body = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title },
    contents: { en: message },
    // Ovo šalje notifikaciju tačno tom korisniku (podudara se sa OneSignal.login(user.id))
    include_aliases: {
      external_id: [targetUserId]
    },
    channel_for_external_user_ids: "push",
    android_channel_id: "default_channel_id", // Obavezno za Android
    priority: 10
  };

  try {
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });

    const responseData = await response.json();
    console.log(`🔔 Notifikacija poslata korisniku ${targetUserId}:`, responseData);
  } catch (error) {
    console.error("❌ Greška pri slanju OneSignal notifikacije:", error);
  }
}
