# Supabase Webhook + Firebase Cloud Function Setup

## Deo 1: Firebase Cloud Function Deployment

### Korak 1: Instaliraj Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### Korak 2: Initialize Firebase Project

```bash
cd firebase/functions
npm install
npm run build
```

### Korak 3: Deploy Cloud Function

```bash
firebase deploy --only functions
```

Nakon deployinga, beleži URL Cloud Function-a, npr:
```
https://us-central1-hgbtapp.cloudfunctions.net/supabaseWebhookHandler
```

---

## Deo 2: Supabase Webhook Konfiguracija

### Korak 1: Otvori Supabase Dashboard

1. Idi na [Supabase Console](https://app.supabase.com)
2. Otvori tvoj projekt (hotel-management)
3. Leva meni → **Database** → **Webhooks**

### Korak 2: Kreiraj novi Webhook

Klikni **Create a new hook** i popuni:

**Event name**: `tasks-webhook`

**Table**: Izaberi `tasks`

**Events**: Ozbeleži sve tri opcije:
- ✅ INSERT (Kada se task kreira)
- ✅ UPDATE (Kada se task menja/dodeljuje)
- ☐ DELETE (Opciono - za brisanje taskova)

**HTTP Method**: POST

**Webhook URL**: Ubaci URL Cloud Function-a koji si dobio:
```
https://us-central1-hgbtapp.cloudfunctions.net/supabaseWebhookHandler
```

**Headers** (opciono):
```
Authorization: Bearer YOUR_WEBHOOK_SECRET
```

### Korak 3: Testiraj Webhook

1. Kreiraj novi task u aplikaciji
2. Idi u Supabase Webhooks → Pogledaj **Logs** tab
3. Trebalo bi da vidš zahtev sa status kodom 200

---

## Deo 3: Kako Radi

```
┌─────────────────┐
│  Supabase DB    │
│  (Novi Task)    │
└────────┬────────┘
         │
         ├─→ Webhook trigger
         │
┌────────▼────────┐
│ Cloud Function  │
│ (Firebase)      │
└────────┬────────┘
         │
         ├─→ Dohvati FCM token
         │
┌────────▼────────┐
│ Firebase Cloud  │
│ Messaging (FCM) │
└────────┬────────┘
         │
         └─→ Push notifikacija na mobilni/web
```

---

## Troubleshooting

### Webhook se ne trigger-a
- Proveri da li je webhook aktivan (zelena chekboks)
- Pogledaj Logs tab za greške

### Cloud Function vraća greške
```bash
firebase functions:log
```

### FCM token nije dostupan
- Proveri da li je korisnik primio token nakon login-a
- Check `users.fcm_token` u Supabase

---

## Alternativa: Direktno iz Backend-a (Već Implementirano)

Ako Webhook/Cloud Function ne radiš, sistem već ima **direktne push notifikacije** iz backend-a (`server/services/notificationService.ts`) koje su instant i bez latency.

```typescript
// Iz server/routes.ts - Automatski se šalje notifikacija
await sendPushNotification(assignedToId, "Nova zadatka", "Pogledaj detalje");
```

---

## Environment Variables za Cloud Function

Ako koristiš Secrets u Cloud Function:

```bash
firebase functions:config:set \
  firebase.api_key="YOUR_KEY" \
  firebase.project_id="hgbtapp"
```

---

## Napomene

- Supabase Webhook URL mora biti **publicno dostupan** (Firebase Cloud Function je uvek dostupan)
- Cloud Function se hostuje na Firebase (besplatno do 125K poziva/mesec)
- Webhook se pokreće **za svaki red** - ako dodaš 100 tasks, biće 100 zahteva
