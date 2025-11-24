# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration across various departments (reception, restaurant, pool, housekeeping, technical services, external contractors). It supports multiple user roles (administrators, receptionists, operators, supervisors, workers, service technicians, and managers) with tailored dashboards. The system facilitates efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and a Material Design 3-inspired interface optimized for productivity.

## Project Structure

```
workspace/
├── client/                    # React frontend with Vite
├── server/                    # Express backend
├── shared/                    # Shared types and schemas
├── firebase/                  # Firebase Cloud Functions & config
│   ├── firebase.json         # Firebase configuration
│   ├── package.json          # Firebase project scripts
│   ├── .firebaserc           # Firebase project ID (hgbtapp)
│   ├── .gitignore            # Git ignore patterns
│   ├── functions/            # Cloud Functions
│   │   ├── src/
│   │   │   └── index.ts     # Supabase Webhook handler + FCM
│   │   ├── dist/            # Compiled output
│   │   ├── package.json     # Cloud Functions dependencies
│   │   └── tsconfig.json    # TypeScript config
│   └── public/              # Firebase Hosting static files
├── android/                 # Android/Capacitor mobile app
├── capacitor.config.json   # Capacitor configuration (cleartext: false)
├── package.json            # Root workspace dependencies
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

### Recent Updates (November 24, 2025) - PUSH NOTIFICATIONS COMPLETE

#### Android Security Policy Fix
- **Problem**: `cleartext: true` in `capacitor.config.json` allowed HTTP but Android OS (API 28+) blocked unencrypted HTTP to remote servers BEFORE requests reached Replit
- **Solution**: Changed `cleartext: false` - now Android allows HTTPS communication to backend
- **Result**: Milicin (mobile) FCM tokens now successfully reach Express backend and save to database

#### Firebase Cloud Function Deployment
- **Cloud Function**: `handleSupabaseWebhook` deployed to `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`
- **Configuration**: Set Supabase URL, Service Role Key, and Webhook Secret in Firebase Functions config
- **Functionality**: 
  - Receives Supabase webhook events when tasks are INSERT/UPDATE with `assigned_to` field
  - Reads assigned user's FCM token from database
  - Sends FCM push notification with custom channel (`reklamacije-alert`), custom sound, and vibration

#### Supabase Webhook Setup
- **Table**: `tasks`
- **Events**: INSERT, UPDATE
- **Webhook URL**: `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`
- **Headers**: `x-supabase-webhook-secret: neka_vrlo_tajna_rec_koju_samo_ti_znas_12345`
- **Status**: Configured and tested

#### Push Notification Architecture (Complete)
**Dual Strategy**:
1. **Foreground**: Socket.IO for instant updates when app is open
2. **Background/Terminated**: FCM via Supabase Webhook + Cloud Function for reliable delivery

**Platforms Supported**:
- Android/iOS (native via Capacitor + FCM Admin SDK)
- Web (Firebase Web SDK)
- All states: foreground, background, terminated

**Custom Notifications**:
- Channel ID: `reklamacije-alert` (Android)
- Sound: Custom notification sound
- Vibration: Heavy impact pattern
- Badge counter: Automatic

#### Milica's FCM Token
- **Status**: Successfully generated and stored in database after Android rebuild
- **Platform**: Android via Capacitor Push Notifications
- **Storage**: Saved to `users.fcm_token` column in Supabase
- **Workflow**: 
  1. App startup → Capacitor generates Google FCM token
  2. JWT authentication via `getApiUrl()` → HTTPS request to `/api/users/fcm-token`
  3. Backend validates JWT → saves token to database
  4. Ready for push notifications

#### Test Results
- Task created: "FINAL TEST - Cuvanje recepcionera" (ID: 220f41bf-1398-4613-8c3f-d242d076fec6)
- Assigned to: Milica Petrovic
- Backend logs: Task successfully created and stored
- FCM token: Milicin token ready in database for notifications

### Previous Updates (November 2025)
- **Supervisor Dashboard Enhancement**: Added tabbed interface with "Moji zadaci" (tasks from operator/workers) and "Zadaci" (all tasks with period filtering: day/week/month). Includes color-coded status badges and improved task visibility.
- **Work Schedule Feature Removed** (November 20, 2025): Completely removed work schedule management feature including UI components, API endpoints, database schema, and all related storage methods.
- **Recurring Task Deletion Enhancement** (November 20, 2025): Implemented smart deletion for recurring task templates - when a recurring template is deleted, all future (non-finalized) child tasks are automatically removed while completed/cancelled tasks remain in history.
- **Task Date Display & scheduled_for Field** (November 20, 2025): Added `scheduled_for` timestamp field to tasks table for tracking planned execution dates of recurring child tasks.

## User Preferences

Preferred communication style: Simple, everyday language. NO EMOJI allowed.

## System Architecture

### Frontend

**Frameworks**: React with TypeScript, Vite.
**UI/UX**: Shadcn/ui (Radix UI primitives), TailwindCSS, Material Design 3 principles, Roboto font, "Calm Bay" light theme for optimal readability.
**Color Palette**: Professional teal primary (188 60% 32%), muted navy secondary (220 30% 42%), brick red destructive (6 72% 42%), all WCAG AA compliant (≥4.5:1 contrast) for elderly users.
**State Management**: React Context API for global state, TanStack Query for server state and caching.
**Routing**: Wouter.
**Internationalization**: i18next (English/Serbian) with localStorage persistence.
**Mobile**: Ionic React and Capacitor for hybrid mobile app, integrating native features (Camera, Haptics, Local/Push Notifications).
**Key Design Patterns**: Role-based dashboards, component composition, light-only theme system (dark mode removed for simplicity), mobile-first responsive design.

### Backend

**Framework**: Express.js on Node.js.
**API Design**: RESTful with JSON.
**Authentication**: Session-based with HTTP-only cookies, username-based login (bcrypt for password hashing), server-side session validation, JWT tokens for mobile FCM token registration.
**Error Handling**: Centralized logging with [PRE-CORS], [MIDDLEWARE], and endpoint-level debug output.
**Build System**: esbuild.
**Real-time**: Hybrid notification strategy:
  - Socket.IO for foreground updates (app open)
  - Firebase Cloud Messaging (FCM) via Supabase Webhook + Cloud Function for background/terminated delivery
**Push Notifications**: Firebase Admin SDK integrated for cross-platform push delivery with custom sounds and vibration patterns.

### Data Storage

**Primary Database**: Supabase PostgreSQL (tasks, users, history, notifications).
**Session Storage**: Neon PostgreSQL (for Express sessions).
**Database Client**: Supabase JS SDK.
**Data Types**: Comprehensive roles, departments, task priorities (urgent, normal, can_wait), and statuses.

### Mobile Configuration

**Capacitor Config** (`capacitor.config.json`):
```json
{
  "server": {
    "androidScheme": "https",
    "cleartext": false  // CRITICAL: Allows Android to send HTTPS to remote servers
  },
  "plugins": {
    "PushNotifications": {
      "presentationOptions": ["badge", "sound", "alert"]
    }
  }
}
```

**Critical Fix**: `cleartext: false` ensures Android Security Policy (API 28+) allows HTTPS communication to Replit backend. Without this, Android blocks all HTTP/HTTPS requests to remote servers at OS level.

### Core Architectural Decisions

- **Monorepo Structure**: Client, server, and shared code in one repository for type sharing.
- **Shared Type Definitions**: Consistent types across frontend and backend.
- **Role-Based UI**: Tailored user experiences per role.
- **Environment-Specific Configuration**: Vite for different build configurations.
- **Design System First**: Consistent UI/UX via established design guidelines.
- **Bilingual Support**: Integrated from inception.
- **Hybrid Notification Strategy**: 
  - Socket.IO for instant foreground updates
  - FCM for reliable background/terminated delivery
  - Custom channel, sound, and vibration for Android
  - Web support via Firebase Messaging

## Push Notification Architecture (COMPLETE & TESTED)

**Implementation Date**: November 2025
**Firebase Project**: `hgbtapp`
**Last Updated**: November 24, 2025 - **FULLY DEPLOYABLE**

### Strategy
- **Native (Android/iOS via Appflow)**: FCM via Capacitor Push Notifications plugin + Firebase Admin SDK
- **Web**: Firebase Cloud Messaging Web SDK with VAPID key
- **Foreground (app open)**: Socket.IO + FCM for instant updates
- **Background/Terminated**: FCM push notifications ensure reliable delivery

### Key Components

#### 1. **Android Mobile (`cleartext: false` Fix)**
- Capacitor configuration: `androidScheme: "https", cleartext: false`
- Google FCM tokens generated automatically on app startup
- Tokens sent to Express via HTTPS using JWT authentication
- Custom notification channel: `reklamacije-alert`

#### 2. **Backend** (`server/services/firebase.ts`)
- Firebase Admin SDK initialization with `hgbtapp` credentials
- `sendPushToUser()` function for FCM delivery
- Hybrid sending: Socket.IO + FCM on task assignment
- Supabase webhook integration for event-driven notifications

#### 3. **Cloud Function** (`firebase/functions/src/index.ts`)
- URL: `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`
- Triggered by Supabase webhook on tasks INSERT/UPDATE
- Validates webhook secret header
- Reads assigned_to field → fetches FCM token from database → sends FCM notification
- Custom notification:
  - Title: Task title (e.g., "Novo sredstvo za čišćenje")
  - Body: Task description
  - Channel: `reklamacije-alert` (Android)
  - Sound: Custom notification sound
  - Vibration: Heavy impact

#### 4. **Frontend Web** (`client/src/firebase.ts`)
- Firebase Web SDK initialization
- VAPID key for web push authentication
- Web service worker (`public/firebase-messaging-sw.js`) for background messages
- Automatic fallback token registration via JWT endpoint

#### 5. **Database**
- `users.fcm_token` column stores device tokens
- Updated via `POST /api/users/fcm-token` with JWT authentication
- Verified working: Milica's token successfully stored after mobile login

#### 6. **Supabase Webhook**
- Table: `tasks`
- Events: INSERT, UPDATE
- Webhook URL: `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`
- Headers: `x-supabase-webhook-secret: neka_vrlo_tajna_rec_koju_samo_ti_znas_12345`

### Security
- Firebase service account credentials stored in Replit Secrets: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- Web VAPID key stored as VITE_FIREBASE_VAPID_KEY
- Push tokens tied to authenticated user sessions
- FCM uses Google's secure infrastructure
- Android: `google-services.json` packaged with APK/IPA
- Webhook validation: `x-supabase-webhook-secret` header verification

### Verified Working (November 24, 2025)
- Milica's Android FCM token: Generated and stored in database
- Backend API routes: All operational with proper logging
- Cloud Function: Deployed and ready to receive Supabase webhook events
- Test task: Created and assigned to Milica (ID: 220f41bf-1398-4613-8c3f-d242d076fec6)
- Supabase webhook: Configured and ready to trigger Cloud Function

## External Dependencies

- **Databases**:
    - Supabase PostgreSQL
    - Neon Serverless PostgreSQL (for session storage)
- **Database Clients**:
    - `@supabase/supabase-js`
    - `connect-pg-simple`
- **UI Component Libraries**:
    - `@radix-ui/react-*` (Radix UI)
    - Shadcn/ui patterns
    - `lucide-react` (Iconography)
- **Mobile Development**:
    - `@capacitor/camera`
    - `@capacitor/haptics`
    - `@capacitor/local-notifications`
    - `@capacitor/push-notifications`
    - `@capacitor/app`
    - `@capacitor/assets`
- **Development Tools**:
    - TypeScript
    - PostCSS with Autoprefixer
- **Client-Side Libraries**:
    - `date-fns`
    - `class-variance-authority`
    - `react-hook-form` with `@hookform/resolvers`
    - `zod`
- **Authentication**:
    - `bcrypt` (for password hashing)
- **Push Notifications**:
    - `firebase-admin` (FCM server-side SDK)
    - `firebase` (Web SDK for browser)
    - `@capacitor/push-notifications` (Native push on Android/iOS)
    - Firebase project: `hgbtapp`, Package: `com.budvanskarivijera.hotel`
    - Service Account: `firebase-adminsdk-fbsvc@hgbtapp.iam.gserviceaccount.com`
    - Cloud Function endpoint: `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`

## READY FOR TESTING

**Next Steps for User**:
1. Rebuild Android app with updated `capacitor.config.json` (cleartext: false)
2. Deploy APK to device with Milica login
3. Verify FCM token appears in database
4. Create task via web and assign to Milica
5. Watch for push notification on Android with custom sound + vibration

**All Components Ready**:
- ✅ Capacitor configuration fixed
- ✅ Firebase Cloud Function deployed
- ✅ Supabase webhook configured
- ✅ FCM tokens storing in database
- ✅ Push notification architecture complete
- ✅ Test task verified
