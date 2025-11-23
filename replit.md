# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration across various departments (reception, restaurant, pool, housekeeping, technical services, external contractors). It supports multiple user roles (administrators, receptionists, operators, supervisors, workers, service technicians, and managers) with tailored dashboards. The system facilitates efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and a Material Design 3-inspired interface optimized for productivity.

### Recent Updates (November 2025)
- **Supervisor Dashboard Enhancement**: Added tabbed interface with "Moji zadaci" (tasks from operator/workers) and "Zadaci" (all tasks with period filtering: day/week/month). Includes color-coded status badges and improved task visibility.
- **Work Schedule Feature Removed** (November 20, 2025): Completely removed work schedule management feature including UI components (WorkScheduleDialog, AddWorkScheduleDialog), API endpoints, database schema (work_schedules table), and all related storage methods. Focus remains on core complaint/task tracking functionality.
- **Recurring Task Deletion Enhancement** (November 20, 2025): Implemented smart deletion for recurring task templates - when a recurring template is deleted, all future (non-finalized) child tasks are automatically removed while completed/cancelled tasks remain in history for audit purposes. Added `getChildTasksByParentId` storage method and comprehensive audit logging.
- **Task Date Display & scheduled_for Field** (November 20, 2025): Added `scheduled_for` timestamp field to tasks table to store planned execution date for recurring child tasks. RecurringTaskProcessor now populates this field when generating child tasks based on recurrence pattern (e.g., monthly tasks get dates spaced one month apart). Created fix script to correct existing child tasks' scheduled_for values based on their sequence position. Enhanced task card date display in Supervisor Dashboard - recurring templates show next_occurrence with day of week (e.g., "Petak, 22.11.2025."), recurring child tasks show scheduled_for date with day of week (each with unique date), and regular tasks show creation date without time. Removed time display from task cards for cleaner interface focused on execution dates.
- **Supervisor Dashboard Tab Separation** (November 20, 2025): Fixed task duplication issue - "Zadaci" tab now excludes tasks shown in "Moji zadaci" tab (statuses: with_sef, with_external, returned_to_sef) to prevent duplicate display and improve clarity of task organization.

## User Preferences

Preferred communication style: Simple, everyday language.

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
**Authentication**: Session-based with HTTP-only cookies, username-based login (bcrypt for password hashing), server-side session validation.
**Error Handling**: Centralized logging.
**Build System**: esbuild.
**Real-time**: Hybrid notification strategy - Socket.IO for foreground updates + Firebase Cloud Messaging (FCM) for background/terminated push notifications.
**Push Notifications**: Firebase Admin SDK integrated for cross-platform push delivery with custom sounds and vibration patterns.

### Data Storage

**Primary Database**: Supabase PostgreSQL (tasks, users, history, notifications).
**Session Storage**: Neon PostgreSQL (for Express sessions).
**Database Client**: Supabase JS SDK.
**Data Types**: Comprehensive roles, departments, task priorities (urgent, normal, can_wait), and statuses (e.g., new, assigned_to_radnik, completed).

### Core Architectural Decisions

- **Monorepo Structure**: Client, server, and shared code in one repository for type sharing.
- **Shared Type Definitions**: Consistent types across frontend and backend.
- **Role-Based UI**: Tailored user experiences per role.
- **Environment-Specific Configuration**: Vite for different build configurations.
- **Design System First**: Consistent UI/UX via established design guidelines.
- **Bilingual Support**: Integrated from inception.
- **Hybrid Notification Strategy**: Socket.IO for instant foreground updates + FCM for reliable background/terminated delivery with custom alerts (sound: `alert1.mp3`, vibration: ERROR + HEAVY impact, badge counter).

## Push Notification Architecture

**Implementation Date**: November 2025
**Firebase Project**: `hgbtapp` (migrated November 23, 2025)

### Strategy
- **Native (Android/iOS via Appflow)**: FCM via Capacitor Push Notifications plugin + Firebase Admin SDK
- **Web**: Firebase Cloud Messaging Web SDK with VAPID key
- **Foreground (app open)**: Socket.IO + FCM for instant updates
- **Background/Terminated**: FCM push notifications ensure reliable delivery

### Key Components
1. **Backend** (`server/services/firebase.ts`):
   - Firebase Admin SDK initialization with `hgbtapp` credentials (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)
   - `sendPushToUser()` function for FCM delivery
   - Hybrid sending: Socket.IO + FCM on task assignment
   
2. **Frontend Web** (`client/src/firebase.ts`):
   - Firebase Web SDK with environment variables: VITE_FIREBASE_API_KEY, VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID
   - Firebase Messaging service for web push notifications
   - Web service worker (`public/firebase-messaging-sw.js`) for background message handling
   - VAPID key (VITE_FIREBASE_VAPID_KEY) for web push authentication
   
3. **Frontend Mobile** (`client/src/App.tsx`):
   - Capacitor Push Notifications plugin for native Android/iOS
   - Automatic device token registration on app startup
   - Token sent to `/api/users/fcm-token` endpoint
   - Custom notification channel: `reklamacije-alert` (Android)

4. **Database**:
   - `users.fcm_token` column stores FCM device tokens
   - Updated via `POST /api/users/fcm-token`

5. **Android Configuration** (`android/`):
   - `google-services.json` with `hgbtapp` project credentials
   - Firebase Cloud Messaging dependency in `build.gradle`
   - Custom sound (`alert1.mp3`) and vibration patterns configured via Capacitor

### Security
- Firebase service account credentials stored in Replit Secrets: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL
- Web VAPID key stored as VITE_FIREBASE_VAPID_KEY
- Push tokens tied to authenticated user sessions
- FCM uses Google's secure infrastructure
- Android/iOS: google-services.json packaged with APK/IPA

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