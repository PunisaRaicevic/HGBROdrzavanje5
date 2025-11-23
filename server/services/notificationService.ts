import { storage } from "../storage";
import { sendPushToUser } from "./firebase";

export async function sendPushNotification(targetUserId: string, title: string, message: string) {
  if (!targetUserId) {
    console.warn("⚠️ Pokušaj slanja notifikacije bez ciljanog korisnika (targetUserId)");
    return;
  }

  try {
    // Dohvati korisnika i njegov FCM token
    const user = await storage.getUserById(targetUserId);
    
    if (!user) {
      console.warn(`⚠️ Korisnik ${targetUserId} nije pronađen`);
      return;
    }

    if (!user.fcm_token) {
      console.warn(`⚠️ FCM token nije dostupan za korisnika ${targetUserId}`);
      return;
    }

    // Pošalji notifikaciju preko Firebase Cloud Messaging
    await sendPushToUser(user.fcm_token, title, message);
    console.log(`✅ Notifikacija poslata korisniku ${targetUserId}: "${title}"`);
  } catch (error) {
    console.error("❌ Greška pri slanju Firebase notifikacije:", error);
  }
}
