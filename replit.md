# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration across various departments (reception, restaurant, pool, housekeeping, technical services, external contractors). It supports multiple user roles (administrators, receptionists, operators, supervisors, workers, service technicians, and managers) with tailored dashboards. The system facilitates efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and a Material Design 3-inspired interface optimized for productivity, aiming to streamline hotel and facility management, improve operational efficiency, and enhance communication across all staff levels.

## User Preferences

Preferred communication style: Simple, everyday language. NO EMOJI allowed.

## System Architecture

### Frontend

**Frameworks**: React with TypeScript, Vite.
**UI/UX**: Shadcn/ui (Radix UI primitives), TailwindCSS, Material Design 3 principles, Roboto font, "Calm Bay" light theme. Color palette is professional and WCAG AA compliant.
**State Management**: React Context API for global state, TanStack Query for server state and caching.
**Routing**: Wouter.
**Internationalization**: i18next (English/Serbian) with localStorage persistence.
**Mobile**: Ionic React and Capacitor for hybrid mobile app, integrating native features (Camera, Haptics, Local/Push Notifications).
**Key Design Patterns**: Role-based dashboards, component composition, light-only theme system, mobile-first responsive design.

### Backend

**Framework**: Express.js on Node.js.
**API Design**: RESTful with JSON.
**Authentication**: Session-based with HTTP-only cookies, username-based login (bcrypt for password hashing), server-side session validation, JWT tokens for mobile FCM token registration.
**Error Handling**: Centralized logging.
**Build System**: esbuild.
**Real-time**: Hybrid notification strategy utilizing Socket.IO for foreground updates and Firebase Cloud Messaging (FCM) via Supabase Webhook + Cloud Function for background/terminated delivery.
**Push Notifications**: Firebase Admin SDK for cross-platform push delivery with custom sounds and vibration patterns.
**AI Integration**: Gemini 2.5 Flash via Replit AI Integrations for task analysis and insights; available at `/api/admin/analyze` endpoint.

### Data Storage

**Primary Database**: Supabase PostgreSQL (tasks, users, history, notifications).
**Session Storage**: Neon PostgreSQL (for Express sessions).
**Chat/Conversation Storage**: PostgreSQL (conversations and messages tables).
**Database Client**: Supabase JS SDK, Drizzle ORM.
**Data Types**: Comprehensive roles, departments, task priorities (urgent, normal, can_wait), and statuses.

### Mobile Configuration

**Capacitor Config**: `cleartext: false` is critical to ensure Android Security Policy (API 28+) allows HTTPS communication to the Replit backend.

### Core Architectural Decisions

- **Monorepo Structure**: Client, server, and shared code in one repository for type sharing and consistency.
- **Shared Type Definitions**: Consistent types across frontend and backend.
- **Role-Based UI**: Tailored user experiences per role for optimal workflow.
- **Environment-Specific Configuration**: Vite for different build configurations.
- **Design System First**: Consistent UI/UX via established design guidelines.
- **Bilingual Support**: Integrated from inception for broader usability.
- **Hybrid Notification Strategy**: A robust system combining Socket.IO for instant foreground updates and FCM for reliable background/terminated delivery, including custom channels, sounds, and vibration for Android, and web support via Firebase Messaging.
- **AI-Powered Analytics**: Gemini integration for intelligent task analysis, providing insights on workload, bottlenecks, and operational efficiency.

## External Dependencies

- **Databases**: Supabase PostgreSQL, Neon Serverless PostgreSQL.
- **Database Clients**: `@supabase/supabase-js`, `connect-pg-simple`.
- **UI Component Libraries**: `@radix-ui/react-*` (Radix UI), Shadcn/ui patterns, `lucide-react` (Iconography).
- **Mobile Development**: `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/push-notifications`, `@capacitor/app`, `@capacitor/assets`.
- **Development Tools**: TypeScript, PostCSS with Autoprefixer.
- **Client-Side Libraries**: `date-fns`, `class-variance-authority`, `react-hook-form` with `@hookform/resolvers`, `zod`.
- **Authentication**: `bcrypt`.
- **Push Notifications**: `firebase-admin` (FCM server-side SDK), `firebase` (Web SDK for browser), `@capacitor/push-notifications` (Native push on Android/iOS).
    - Firebase project: `hgbtapp`, Package: `com.budvanskarivijera.hotel`.
    - Service Account: `firebase-adminsdk-fbsvc@hgbtapp.iam.gserviceaccount.com`.
    - Cloud Function endpoint: `https://us-central1-hgbtapp.cloudfunctions.net/handleSupabaseWebhook`.
- **AI Integration**: `@google/genai` (Gemini SDK via Replit AI Integrations), `p-limit`, `p-retry` (batch processing utilities), `drizzle-zod` (schema validation).

## API Endpoints

### AI Analysis
- **POST `/api/admin/analyze`** - Analyzes task data using Gemini 2.5 Flash. Accepts `question` parameter. Returns detailed analysis of tasks, workload, and operational insights. **Completely free via Replit AI Integrations**.

### Chat (Planned - Routes Registered)
- **GET `/api/conversations`** - List all conversations
- **GET `/api/conversations/:id`** - Get conversation with messages
- **POST `/api/conversations`** - Create new conversation
- **DELETE `/api/conversations/:id`** - Delete conversation
- **POST `/api/conversations/:id/messages`** - Send message and get AI response (streaming)

### Image Generation (Planned - Routes Registered)
- **POST `/api/generate-image`** - Generate image using Gemini 2.5 Flash Image model. Accepts `prompt` parameter.

## Recent Changes (Session 2026-04-23)

### Client-Side Image Compression - COMPLETE
- **Goal**: Reduce upload size and storage usage like Viber/WhatsApp do.
- **Helper**: `client/src/lib/imageCompressor.ts` - `compressImageDataUrl(dataUrl, opts)`, `fileToCompressedDataUrl(file, opts)`, `dataUrlSizeKB(...)`. Defaults: max dimension 1600px (longest side), JPEG quality 0.8, white background fill (handles PNG transparency). Returns original if compressed is larger.
- **Wired into**: `PhotoUpload.tsx` (file upload + Capacitor camera, native quality lowered 90→80), `WorkerDashboard.tsx` (worker photo upload), `TechnicianDashboard.tsx` (technician photo upload).
- **Skipped**: signature canvas in `TaskDetailsDialog.tsx` and document uploads (PDFs/Word) - those don't need image compression.
- **Result**: A typical 4MB phone photo (4032×3024) becomes ~250-400KB JPEG at 1600px wide. Original aspect ratio preserved. Compression happens entirely in the browser/WebView via `<canvas>` API - no server work.

### Image Migration to Supabase Storage - COMPLETE
- **Problem**: `tasks` table was 337 MB because `images` and `worker_images` columns stored Base64-encoded images directly in DB rows. Slowed every query that returned task data.
- **Solution**: Created Supabase Storage bucket `task-images` (public read, 10MB limit, image/* MIME types). Backend now uploads incoming Base64 images to storage and stores only the public URL string in DB columns.
- **Files**:
  - `server/lib/imageStorage.ts` (NEW): `uploadIfBase64`, `uploadImagesArray`, `fetchImageAsBuffer`, `ensureBucket` helpers.
  - `server/routes.ts`: POST `/api/tasks` and PATCH `/api/tasks/:id` now call `uploadImagesArray` before insert/update for both `images` (folder `reporter/{userId}`) and `worker_images` (folder `worker/{userId}`).
  - `server/pdfGenerator.ts`: `embedImages` now takes `Buffer[]` (not strings); `resolveImageBuffers` async-fetches HTTP URLs via `fetchImageAsBuffer` so PDFs still embed images. Pre-fetches buffers BEFORE entering Promise executor (avoids async-promise-executor anti-pattern).
  - `server/scripts/migrate-images-to-storage.ts` (NEW, kept for reference): one-shot script that walked all 412 tasks, uploaded each Base64 image to storage, replaced array contents with URLs.
- **Migration result**: 112 images migrated to Supabase Storage URLs, 0 Base64 remaining. Frontend renders unchanged - `<img src={url}>` works identically for `data:` and `https:` URLs.
- **Backward compatibility**: `uploadIfBase64` is idempotent - already-URL strings pass through unchanged. Mixed arrays handled correctly.
- **Security note**: Bucket is `public: true`. URLs use unguessable UUIDs but are not access-controlled. If hotel complaint photos require stricter privacy, switch to private bucket + signed URLs (see `createSignedUrl`).

## Recent Changes (Session 2026-04-08)

### White Screen on Android Fix - COMPLETE
- **Root cause**: `firebase.ts` called `getMessaging(app)` at module level. Firebase Web Messaging SDK requires Service Worker API which does NOT exist in Capacitor's Android/iOS WebView. This caused the entire module to crash at startup before React could render anything.
- **Fix**: `getMessaging()` is now wrapped in `!Capacitor.isNativePlatform()` guard. On native, `messaging = null` (correct: native push uses `@capacitor/push-notifications` not Web Firebase SDK).
- **Additional fix**: Added null check in `App.tsx` before calling `getToken(messaging, ...)`.
- **Vite base path**: Confirmed `base: process.env.NODE_ENV === "production" ? "./" : "/"` works correctly. Production builds output `./assets/...` (relative paths) required by Capacitor.
- **Critical rule**: `server/vite.ts` imports vite config as a plain object — NEVER use `defineConfig(async () => {})` form as it returns a Promise that can't be spread into `createViteServer()`.

## Recent Changes (Session 2026-03-30)

### Staff Location Tracking - COMPLETE
- Added 4 new columns to `users` table in Supabase: `latitude`, `longitude`, `location_updated_at`, `last_active_at`
- Updated `shared/schema.ts` with new location columns
- Added `GET /api/config/maps` endpoint (returns GOOGLE_API_KEY to authenticated users)
- Added `POST /api/users/location` (requireAuth) - saves GPS coordinates for logged-in user
- Added `GET /api/users/locations` (requireAdmin) - returns 3 lists: locations (GPS active < 60min), onlineNoGps (active < 30min, no GPS), offline
- Created `client/src/hooks/useGeolocation.ts` - sends GPS every 60s via navigator.geolocation
- Called `useGeolocation(user?.id)` in App.tsx Router component
- Created `client/src/pages/StaffLocationsPage.tsx` with Google Maps, colored markers by role, sidebar with 3 status lists, 30s auto-refresh
- Registered `/staff-locations` route in App.tsx; removed `p-6` padding for map page
- Added "Lokacije osoblja" link (MapPin icon) to AppSidebar.tsx, visible only to admin
- Installed `@googlemaps/js-api-loader` package; uses existing `GOOGLE_API_KEY` env var

### Vite Base URL Fix (Live Updates white screen fix)
- Set `base: process.env.NODE_ENV === "production" ? "./" : "/"` in vite.config.ts
- Fixes blank white screen in Appflow Live Updates (absolute asset paths → relative)

## Recent Changes (Session 2026-03-10)

### User Online/Last-Seen Status - COMPLETE
- Added `last_seen` timestamptz column to `users` table in Supabase
- Added throttled `updateLastSeenThrottled()` in `server/routes.ts` - updates DB max once per 30 seconds per user, fire-and-forget
- `requireAuth` middleware now calls `updateLastSeenThrottled` on every authenticated request (JWT + session)
- Updated `User` interface in `AdminDashboard.tsx` with `last_seen: string | null`
- Added `formatLastSeen()` helper: < 5 min = "Onlajn" (green), < 60 min = "Aktivan/na prije X min", < 24h = time, < 7d = days, older = DD.MM.
- Admin user list now shows avatar with initial letter, green/grey status dot, and last-seen text

### Fixed Mobile Speech Recognition (Session 2026-03-07)
- Added `RECORD_AUDIO` permission to `AndroidManifest.xml`
- Refactored `AdminAIChat` native speech recognition to use `addListener('partialResults')` and `addListener('listeningState')` event listeners instead of awaiting Promise result

## Recent Changes (Session 2026-03-07)

### Gemini AI Integration - COMPLETE
- Installed `@google/genai` package for Gemini API access
- Installed batch processing utilities (`p-limit`, `p-retry`) for handling rate limits and concurrent requests
- Set up Replit AI Integrations with environment variables
- Created `/server/replit_integrations/` modules for batch, chat, and image functionality
- Fixed AI Analysis endpoint for correct text extraction from Gemini response
- Registered chat and image routes in `server/index.ts`
- **Fixed AI Chat Dialog**: Expanded to `max-w-4xl h-[80vh]` for full visibility
- **Improved message display**: Added width constraints `max-w-[95%]` for AI responses, proper text wrapping with `break-words`
- **Fixed ScrollArea**: Added full width container and improved scrolling with `leading-relaxed` line height

### Verified Working
- `/api/admin/analyze` endpoint successfully returns Gemini-generated analysis on any question
- Dialog displays complete long-form analysis without truncation
- All scroll and text wrapping optimized for readability
- Zero cost - fully covered by Replit's free AI Integrations service
