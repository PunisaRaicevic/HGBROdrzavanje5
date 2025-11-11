# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration. The application supports various user roles including administrators, receptionists, operators, supervisors, workers, service technicians, and managers, each with tailored dashboards and workflows for task management across different departments (reception, restaurant, pool, housekeeping, technical services, and external contractors).

The system enables efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and follows Material Design 3 principles for a clean, information-dense interface optimized for productivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (November 2025)

### Production Deployment Configuration (November 11, 2025)

**Health Check Endpoints for Replit Deployment**
- **Added Endpoints**:
  - `GET /health` - Minimal health check (returns `{"status":"ok"}`)
  - `GET /` - Root endpoint (returns `{"status":"ok","message":"Server is running"}`)
- **Important**: Health check endpoints do NOT query database for speed and reliability
- **Purpose**: Replit deployment provisioning and monitoring

**Cron Scheduler Production-Only Execution**
- **Configuration**: Cron scheduler (`startCronScheduler()`) now runs ONLY in production (`NODE_ENV=production`)
- **Reasoning**: 
  - Development environment doesn't need automatic recurring task creation
  - Reduces noise in development logs
  - Prevents unintended task creation during development
- **Location**: `server/index.ts` - called after server.listen() callback
- **Production Behavior**: Starts immediately and runs every 15 minutes
- **Development Behavior**: Does NOT start - must be triggered manually if needed

**Password Reset** (November 11, 2025)
- **All user passwords**: Changed from "password123" to "**1111**" (plaintext)
- **Auto-hashing**: Login endpoint automatically converts plaintext passwords to bcrypt hashes on first login
- **Test credentials**: Any username with password "1111" (e.g., `aleksandar / 1111`)

### Username-Based Authentication Migration (November 10, 2025)

**Complete Migration from Email-Based to Username-Based Login**
- **Objective**: Enable login with username instead of email since many hotel workers don't have email addresses
- **Implementation**:
  - Added `username` column to Supabase users table (TEXT, UNIQUE)
  - Auto-generated usernames from existing email addresses (e.g., aleksandar@hotel.me → aleksandar)
  - Created `getUserByUsername()` method in storage layer
  - Updated `/api/auth/login` endpoint to accept username instead of email
  - Updated `createUserSchema` to require username (minimum 3 characters)
  - Added username uniqueness validation before user creation
  - Updated frontend LoginPage to use username input field
  - Updated AuthContext to send `{ username, password }` with `credentials: 'include'`
  - Added AdminDashboard username field to user creation form
  - Added translations: "Username" (EN), "Korisničko ime" (SR)
- **Current Usernames**:
  - admin, aleksandar, petar, direktor, jovan, marko, milica, strahinja
- **Impact**: Users now login with simple usernames instead of email addresses
- **Test credentials**: aleksandar / password123 (all users have password: password123)
- **Status**: Production ready, architect reviewed and approved

### Critical Bug Fixes

**Mobile App Authentication - localStorage Migration** (November 8, 2025)
- **Issue**: Mobile app (APK) unable to persist user login - users logged out after app restart
- **Root Cause**: 
  - AuthContext used `sessionStorage` for user persistence
  - sessionStorage is unreliable in Capacitor mobile apps (iOS/Android)
  - Login was successful on backend but session wasn't retained on mobile
- **Fix**: 
  - Replaced all `sessionStorage` calls with `localStorage` in AuthContext
  - localStorage is stable across app restarts in Capacitor
  - Changed login(), logout(), and useEffect initialization
- **Impact**: Mobile app now properly retains user session across app restarts
- **Test credentials**: aleksandar / password123 (username-based login)

**Worker-to-Supervisor Task Forwarding** (November 8, 2025)
- **Issue**: When worker attempted to return task to supervisor with reason, task status wouldn't update
- **Root Cause**: 
  - WorkerDashboard Task interface only allowed 3 statuses ('new', 'in_progress', 'completed')
  - Backend used full TaskStatus with 9 statuses including 'returned_to_sef'
  - Status mapping logic converted all backend statuses to only 3 frontend values
  - React Query cache invalidation wasn't awaited before closing dialog
- **Fix**: 
  - Updated Task interface to use TaskStatus and Priority from shared/types.ts
  - Removed incorrect status mapping - now uses backend status directly
  - Changed status checks from 'new' to 'assigned_to_radnik' (actual status workers receive)
  - Added await to cache invalidation in updateTaskMutation.onSuccess
  - Updated activeTasks filter to check for correct statuses
- **Impact**: Workers can now successfully return tasks to supervisors with reason, task disappears from active list

### Feature Additions

**Ionic + Capacitor Mobile App Integration** (November 8, 2025)
- Implemented Hybrid mobile app approach using Ionic React + Capacitor
- Added native mobile capabilities via Capacitor plugins:
  - **Camera** (@capacitor/camera@7.0.2) - Native photo capture and gallery access
  - **Haptics** (@capacitor/haptics@7.0.2) - Native vibration feedback with pattern support
  - **Local Notifications** (@capacitor/local-notifications@7.0.3) - Native notifications with sound
  - **Push Notifications** (@capacitor/push-notifications@7.0.3) - Remote push capability
  - **App** (@capacitor/app@7.1.0) - App lifecycle and state management
- Created service layer for Capacitor integration:
  - `client/src/services/capacitorCamera.ts` - Native camera access with fallbacks
  - `client/src/services/capacitorHaptics.ts` - Native haptic feedback (light/medium/heavy/patterns)
  - `client/src/services/capacitorNotifications.ts` - Native notifications with permission handling
- Updated WorkerDashboard to use native mobile features:
  - Replaced `navigator.vibrate()` with `capacitorHaptics.taskAssigned()`
  - Added native notification support with sound for task assignments
  - Integrated permission requests for notifications
- Build configuration for AppFlow cloud builds:
  - Capacitor config: `capacitor.config.ts` (appId: com.budvanskarivijera.hotel)
  - webDir: `dist/public` (Vite build output)
  - Android platform added and synced
- Hybrid UI strategy: Keeps existing Shadcn/Tailwind components wrapped in IonApp for Capacitor compatibility
- AppFlow deployment ready: Code can be built to .apk/.ipa via Ionic AppFlow cloud service

**Dynamic Dropdown Selectors in CreateTaskDialog** (November 8, 2025)
- Added Hotel/Building dropdown with predefined options:
  - Hotel Slovenska plaža
  - Hotel Aleksandar
  - Hotel Mogren
  - Ostalo (custom input field appears)
- Added Block/Room dropdown with 12 villa options:
  - Vila Mirta A-blok through Vila Pinea O-blok
  - Ostalo (custom input field appears)
- Custom values save to database instead of "Ostalo" text
- Validation ensures custom fields are filled when "Ostalo" selected

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool

**UI Component System**: 
- Shadcn/ui components built on Radix UI primitives
- TailwindCSS for styling with custom design tokens
- Material Design 3 principles for layout and typography
- Design system defined in `design_guidelines.md` with Roboto font family

**State Management**:
- React Context API for global state (AuthContext, ThemeContext)
- TanStack Query (React Query) for server state management and caching
- localStorage for user authentication persistence (mobile-compatible, replaced sessionStorage)

**Routing**: Wouter for lightweight client-side routing

**Internationalization**: i18next for English/Serbian language support with localStorage persistence

**Key Design Patterns**:
- Role-based dashboard rendering with separate components for each user type
- Component composition with reusable UI primitives (StatCard, TaskCard, StatusBadge, PriorityBadge)
- Theme system supporting light/dark modes with CSS custom properties
- Mobile-first responsive design with Tailwind breakpoints

### Backend Architecture

**Server Framework**: Express.js running on Node.js

**API Design**: RESTful endpoints with JSON request/response bodies

**Authentication**:
- bcrypt for password hashing
- Session-based authentication with HTTP-only cookies (credentials: 'include')
- Username-based login (not email) for accessibility to workers without email addresses
- Password validation on login with user role and department context
- Server-side session validation via `/api/auth/me` endpoint

**Error Handling**: Centralized error logging with request/response tracking middleware

**Build System**: esbuild for production bundling with ESM module format

### Data Storage

**Primary Database**: Supabase PostgreSQL

**Database Client**: Supabase JS SDK (@supabase/supabase-js) for all data operations

**Session Storage**: Neon PostgreSQL (DATABASE_URL) via connect-pg-simple for Express session persistence

**Implementation**: 
- `server/storage.ts` implements `SupabaseStorage` class using Supabase client
- Type definitions in `shared/schema.ts` for TypeScript type safety
- Environment variables: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

**Database Tables** (Supabase PostgreSQL):
- departments - Department definitions
- users - User accounts with username (UNIQUE), email, roles, and preferences
- external_companies - Third-party service providers
- tasks - Task management with status workflow
- task_comments - Communication thread per task
- task_photos - Image attachments
- task_history - Audit trail
- notifications - User notification queue
- session - Express session store (stored in Neon PostgreSQL via DATABASE_URL)

**Data Types**:
- User roles: admin, recepcioner, operater, radnik, sef, serviser, menadzer
- Departments: recepcija, restoran, bazen, domacinstvo, tehnicka, eksterni
- Task priorities: urgent, normal, can_wait
- Task statuses: new, with_operator, assigned_to_radnik, with_sef, with_external, returned_to_operator, returned_to_sef, completed, cancelled

### External Dependencies

**Database**: 
- Supabase PostgreSQL for primary data storage (tasks, users, history, notifications)
- Neon Serverless PostgreSQL for session storage only (DATABASE_URL)
- Supabase JS SDK for database operations
- connect-pg-simple for Express session persistence

**Authentication Service**: 
- Local authentication using bcrypt password hashing
- Session persistence via Neon PostgreSQL (server-side sessions)
- User data persistence via localStorage (mobile-compatible, client-side)
- No external authentication service dependencies

**UI Component Libraries**:
- Radix UI primitives (@radix-ui/react-*) for accessible component foundations
- Shadcn/ui component patterns
- Lucide React for iconography

**Development Tools**:
- TypeScript for type safety across client/server/shared code
- Replit-specific plugins for development environment integration
- PostCSS with Autoprefixer for CSS processing

**Client-Side Libraries**:
- date-fns for date formatting and manipulation
- class-variance-authority for component variant management
- react-hook-form with @hookform/resolvers for form validation
- Zod for runtime schema validation

**Key Architectural Decisions**:

1. **Monorepo Structure**: Single repository with client/server/shared code organization for type sharing and simplified deployment

2. **Shared Type Definitions**: Common types defined in `shared/` directory used by both frontend and backend to ensure consistency

3. **Role-Based UI**: Separate dashboard components for each user role to provide tailored experiences and reduce complexity

4. **Real-time Capabilities**: Socket.IO integration enables real-time notifications and task updates

5. **Environment-Specific Configuration**: Vite handles different build configurations for development vs production, with Replit-specific plugins

6. **Design System First**: Comprehensive design guidelines established upfront to ensure consistency across the application

7. **Bilingual Support**: Built-in i18n from the start rather than as an afterthought, with locale stored in localStorage