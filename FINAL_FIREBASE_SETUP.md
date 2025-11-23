# Firebase Cloud Function + Supabase Webhook - Final Setup Guide

## Overview
Your Firebase Cloud Function is ready to receive Supabase webhooks and send FCM push notifications. The function reads FCM tokens from your Supabase `users` table and automatically sends notifications when tasks are created or assigned.

## Project Structure
```
firebase/
├── firebase.json              # Firebase config (functions source: "functions")
├── package.json               # Firebase project scripts
├── .firebaserc                # Firebase project: "hgbtapp"
├── .gitignore                 # Git ignore for Firebase
├── functions/                 # Cloud Functions folder
│   ├── src/
│   │   └── index.ts          # handleSupabaseWebhook Cloud Function
│   ├── dist/                 # Compiled JavaScript (ready)
│   ├── package.json          # Cloud Functions dependencies
│   └── tsconfig.json         # TypeScript configuration
└── public/                    # Firebase Hosting (optional)
```

## Deployment Steps (on your LOCAL machine)

### Step 1: Pull Latest Changes
```bash
git pull origin main
cd firebase
```

### Step 2: Set Firebase Environment Variables
From the **firebase/** directory:
```bash
firebase functions:config:set \
  supabase.url="https://dxgfgppdtgrgzxneludd.supabase.co" \
  supabase.service_role_key="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Z2ZncHBkdGdyZ3p4bmVsdWRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE4MjE4OCwiZXhwIjoyMDc3NzU4MTg4fQ.IYguTth1CKKzOzVYq9NI-qJv3KU9iH6j_WltE_w5iM8" \
  supabase.webhook_secret="neka_vrlo_tajna_rec_koju_samo_ti_znas_12345"
```

### Step 3: Deploy Cloud Function
```bash
firebase deploy --only functions:handleSupabaseWebhook
```

**Copy the HTTPS URL** from the deployment output, e.g.:
```
https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook
```

## Supabase Webhook Configuration

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Navigate to **Database** → **Webhooks**
3. Click **Create a new hook**
4. Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `tasks-webhook` |
| **Table** | `tasks` |
| **Events** | ✅ INSERT, ✅ UPDATE |
| **HTTP Method** | POST |
| **Webhook URL** | Paste your Cloud Function URL |

5. Add HTTP Header:
   - **Key**: `x-supabase-webhook-secret`
   - **Value**: `neka_vrlo_tajna_rec_koju_samo_ti_znas_12345`

6. Click **Create hook**

## How It Works

```
User creates/assigns task in React app
          ↓
Supabase triggers webhook (INSERT/UPDATE)
          ↓
Webhook sends HTTP POST to Cloud Function with x-supabase-webhook-secret header
          ↓
Cloud Function validates secret (security check)
          ↓
Cloud Function extracts: assigned_to (user ID), title, description, id
          ↓
Cloud Function queries Supabase for user's fcm_token
          ↓
Cloud Function sends FCM message via Firebase Admin SDK
          ↓
FCM delivers notification to user's mobile/web device with:
  - Sound: "default"
  - Android channel: "reklamacije-alert"
  - Vibration: enabled
  - Badge counter: 1
```

## Cloud Function Details

**Function Name**: `handleSupabaseWebhook`
**Trigger**: HTTP POST
**Source**: `firebase/functions/src/index.ts`
**Runtime**: Node.js 20

### Security Features
- ✅ Webhook secret validation (x-supabase-webhook-secret header)
- ✅ POST method only
- ✅ Request body validation
- ✅ Error handling with logging

### Supported Events
- **INSERT**: New task created → sends notification
- **UPDATE**: Task reassigned → sends notification to new recipient

### FCM Configuration
- **Android**: Priority "high", channel "reklamacije-alert", sound "default"
- **iOS (APNS)**: Sound "default", content-available: true
- **Data fields**: itemId, type ("new_task_or_message")

## Testing

1. In your React app, create a new task
2. Assign it to a user
3. In Supabase Dashboard → **Webhooks** → **Logs**, you should see:
   - HTTP POST request to your Cloud Function
   - Status: 200
   - Response: "Notification sent successfully!"
4. The assigned user should receive a push notification on their device 🔔

## Troubleshooting

### Webhook not triggering
- ✅ Verify webhook is **enabled** (green checkbox)
- ✅ Check **Logs** tab for errors
- ✅ Verify task table has **assigned_to** field with user ID

### Cloud Function returns 403 (Unauthorized)
- ✅ Check webhook header `x-supabase-webhook-secret` matches your config:set value
- ✅ Verify secret is exactly: `neka_vrlo_tajna_rec_koju_samo_ti_znas_12345`

### No FCM token found error
- ✅ Verify user has logged in (fcm_token is saved in users table)
- ✅ Check `users.fcm_token` field in Supabase
- ✅ Ensure assigned_to ID matches actual user ID in database

### View Cloud Function Logs
```bash
firebase functions:log
```

## Security Reminder

⚠️ **After successful deployment**:
- The webhook secret in this file should be changed in Supabase Dashboard
- Store actual secrets in Firebase environment config, not in code
- Never commit real Firebase credentials to GitHub

---

**Cloud Function Status**: ✅ Compiled and Ready to Deploy
**Next Steps**: Deploy locally with `firebase deploy --only functions:handleSupabaseWebhook`
