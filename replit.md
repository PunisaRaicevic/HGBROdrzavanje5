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
- **POST `/api/admin/analyze`** - Analyzes task data using Gemini. Accepts `question` parameter. Returns detailed analysis of tasks, workload, and operational insights.

### Chat (Planned - Routes Registered)
- **GET `/api/conversations`** - List all conversations
- **GET `/api/conversations/:id`** - Get conversation with messages
- **POST `/api/conversations`** - Create new conversation
- **DELETE `/api/conversations/:id`** - Delete conversation
- **POST `/api/conversations/:id/messages`** - Send message and get AI response (streaming)

### Image Generation (Planned - Routes Registered)
- **POST `/api/generate-image`** - Generate image using Gemini 2.5 Flash Image model. Accepts `prompt` parameter.

## Recent Changes (Session 2026-03-07)

### Gemini AI Integration
- Installed `@google/genai` package for Gemini API access
- Installed batch processing utilities (`p-limit`, `p-retry`) for handling rate limits and concurrent requests
- Set up Replit AI Integrations with environment variables:
  - `AI_INTEGRATIONS_GEMINI_API_KEY`
  - `AI_INTEGRATIONS_GEMINI_BASE_URL`
- Created `/server/replit_integrations/batch/` utilities for batch processing with automatic retries
- Created `/server/replit_integrations/chat/` module for AI conversations (routes, storage, client)
- Created `/server/replit_integrations/image/` module for image generation
- Fixed AI Analysis endpoint to correctly extract text from Gemini response (`response.candidates[0].content.parts`)
- Registered chat and image routes in `server/index.ts`
- Created shared models (`shared/models/chat.ts`) for conversations and messages storage

### Database Schema
- Added `conversations` table (id, title, createdAt)
- Added `messages` table (id, conversationId, role, content, createdAt)

### Verified Working
- `/api/admin/analyze` endpoint successfully returns Gemini-generated analysis of task data
- Gemini 2.5 Flash model integration stable and functional
