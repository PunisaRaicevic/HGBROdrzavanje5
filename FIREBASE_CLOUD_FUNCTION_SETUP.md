# Firebase Cloud Function za Supabase Webhook + FCM

## Šta je urađeno:
- ✅ Instaliran `@supabase/supabase-js` paket
- ✅ Napisan `handleSupabaseWebhook` kod koji prima Supabase webhook events
- ✅ Automatski čita fcm_token iz Supabase users tabele
- ✅ Šalje FCM notifikaciju korisniku kojem je task dodeljen

---

## KORAK 1: Postavi Firebase Environment Config

U ROOT direktijumu projekta (~/workspace), pokreni:

```bash
firebase functions:config:set \
  supabase.url="https://YOUR_SUPABASE_URL.supabase.co" \
  supabase.service_role_key="YOUR_SERVICE_ROLE_KEY" \
  supabase.webhook_secret="YOUR_WEBHOOK_SECRET_12345"
```

### Gde preuzeti vrednosti:

1. **SUPABASE_URL** - Supabase Dashboard → Settings → API → Project URL
   - Nešto kao: `https://abcdefg.supabase.co`

2. **SERVICE_ROLE_KEY** - Supabase Dashboard → Settings → API → Service Role Secret
   - PAŽNJA: Ovo je tajni ključ - NIKADA ga ne commit-uj u kod!

3. **WEBHOOK_SECRET** - Bilo koja string vrednost koju ti izmisljaš
   - Npr: `my_webhook_secret_xyz123`
   - OVA VREDNOST mora da bude uključena u Supabase Webhook HTTP Header

---

## KORAK 2: Build Cloud Function

```bash
cd firebase/functions
npm run build
```

Trebalo bi da vidiš: `dist/` folder sa kompajliranim kodom

---

## KORAK 3: Deploy na Firebase

```bash
# Iz root direktijuma
firebase deploy --only functions:handleSupabaseWebhook
```

Nakon deployinga, beleži Cloud Function URL, npr:
```
https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook
```

---

## KORAK 4: Postavi Supabase Webhook

1. Otvori Supabase Dashboard
2. Idi na Database → Webhooks
3. Klikni "Create a new hook"
4. Popuni:
   - **Name**: `tasks-webhook`
   - **Table**: `tasks`
   - **Events**: Ozbeleži:
     - ✅ INSERT (nove taskove)
     - ✅ UPDATE (dodelu taskova)
   - **HTTP Method**: POST
   - **Webhook URL**: Ubaci Cloud Function URL
   - **Headers**: Dodaj custom header:
     ```
     Key: x-supabase-webhook-secret
     Value: YOUR_WEBHOOK_SECRET_12345
     ```
     (Ista vrednost što si postavio u Firebase config!)

---

## KORAK 5: Test Webhook

1. U aplikaciji kreiraj novi task
2. Dodeli ga nekom korisniku
3. U Supabase Webhooks → Logs, trebalo bi da vidiš zahtev sa status 200
4. Korisnik trebalo bi da dobije push notifikaciju sa zvukom

---

## Šta se dešava korak po korak:

```
1. Korisnik kreira/dodeljuje task u aplikaciji
                ↓
2. Supabase automatski trigger-a webhook
                ↓
3. Cloud Function prima zahtev
                ↓
4. Cloud Function proverava webhook_secret
                ↓
5. Cloud Function dohvata fcm_token iz users tabele
                ↓
6. Cloud Function šalje FCM notifikaciju
                ↓
7. Mobilni uređaj prima notifikaciju sa zvukom + vibracijom
```

---

## Troubleshooting

### Cloud Function vraća greške

```bash
firebase functions:log
```

### Webhook se ne trigger-a

- Proveri da li je webhook aktivan (zelena chekboks)
- Pogledaj Logs tab u Supabase za greške
- Proveri da li je URL ispravan

### FCM token nije dostupan

- Proveri da je korisnik primio token nakon login-a
- Proveri `users.fcm_token` kolonu u Supabase

### Webhook Secret greška

- Proveri da se `x-supabase-webhook-secret` header poklapla
- Vrednost mora biti IDENTIČNA u Firebase config i Supabase header

---

## Bezbednost

- ✅ Webhook je zaštićen sa secret ključem
- ✅ FCM tokeni se čitaju direktno iz Supabase
- ✅ Cloud Function koristi Firebase Admin SDK
- ✅ Service Role Key je čuvan u Firebase config (ne u kodu)

---

## Napomene

- Cloud Function je **besplatna** do 125,000 poziva mesečno
- Za production, preporuka je da dodaš rate limiting
- Ako korisnik nema fcm_token, notifikacija se preskače (bezopasno)
