# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration. The application supports various user roles, including administrators, receptionists, operators, supervisors, workers, service technicians, and managers, each with tailored dashboards and workflows across departments like reception, restaurant, pool, housekeeping, technical services, and external contractors. The system facilitates efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It supports English and Serbian languages and adheres to Material Design 3 principles for an optimized, information-dense user interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite.

**UI Component System**: Shadcn/ui components built on Radix UI primitives, TailwindCSS for styling, and Material Design 3 principles for design, layout, and typography (Roboto font).

**State Management**: React Context API for global state (AuthContext, ThemeContext) and TanStack Query (React Query) for server state management and caching. `localStorage` is used for user authentication persistence.

**Routing**: Wouter for client-side routing.

**Internationalization**: i18next for English/Serbian language support with `localStorage` persistence.

**Key Design Patterns**: Role-based dashboard rendering, component composition with reusable UI primitives, a theme system supporting light/dark modes, and mobile-first responsive design.

### Backend Architecture

**Server Framework**: Express.js running on Node.js.

**API Design**: RESTful endpoints with JSON request/response.

**Authentication**: bcrypt for password hashing, session-based authentication with HTTP-only cookies, and username-based login. Server-side session validation is handled via `/api/auth/me`.

**Error Handling**: Centralized error logging and request/response tracking middleware.

**Build System**: esbuild for production bundling with ESM.

### Data Storage

**Primary Database**: Supabase PostgreSQL.

**Database Client**: Supabase JS SDK.

**Session Storage**: Neon PostgreSQL via `connect-pg-simple` for Express session persistence.

**Implementation**: `server/storage.ts` implements `SupabaseStorage`. Type definitions in `shared/schema.ts` ensure type safety.

**Database Tables**: `departments`, `users`, `external_companies`, `tasks`, `task_comments`, `task_photos`, `task_history`, `notifications`, and `session`.

**Data Types**: Comprehensive user roles, departments, task priorities, and task statuses.

### System Design Choices

1.  **Monorepo Structure**: Client, server, and shared code organized in a single repository for type sharing and simplified deployment.
2.  **Shared Type Definitions**: Common types in `shared/` ensure consistency.
3.  **Role-Based UI**: Tailored dashboard components for each user role.
4.  **Real-time Capabilities**: Socket.IO integration for notifications and task updates.
5.  **Environment-Specific Configuration**: Vite manages build configurations, with Replit-specific plugins.
6.  **Design System First**: Comprehensive design guidelines ensure consistency.
7.  **Bilingual Support**: i18n built-in from the start with locale stored in `localStorage`.
8.  **Health Check Optimization**: Dedicated `/health` endpoint registered first, bypassing session middleware and database calls for ultra-fast responses (approx. 3.5ms).
9.  **Cron Scheduler Optimization**: Delayed startup (20 seconds) and non-immediate job execution prevent resource contention during deployment and server startup.
10. **Username-Based Authentication**: Full migration from email to username login to accommodate workers without email addresses.
11. **Mobile App Persistence**: Switched from `sessionStorage` to `localStorage` in AuthContext for reliable user session persistence in Capacitor mobile apps.
12. **Worker Task Forwarding**: Corrected task status mapping and cache invalidation to allow workers to return tasks to supervisors with reasons.
13. **Hybrid Mobile App**: Integration of Ionic React and Capacitor for native mobile features (camera, haptics, local/push notifications).
14. **Dynamic Dropdown Selectors**: Implemented dynamic dropdowns in `CreateTaskDialog` for hotel/building and block/room selection, with "Other" options allowing custom input.

## External Dependencies

**Database**: Supabase PostgreSQL (primary data), Neon Serverless PostgreSQL (session storage), Supabase JS SDK, `connect-pg-simple`.

**Authentication Service**: Local authentication using bcrypt.

**UI Component Libraries**: Radix UI primitives, Shadcn/ui, Lucide React (iconography), Ionic React (mobile UI).

**Development Tools**: TypeScript, Replit-specific plugins, PostCSS with Autoprefixer.

**Client-Side Libraries**: `date-fns`, `class-variance-authority`, `react-hook-form` with `@hookform/resolvers`, `Zod`.

**Mobile Development Libraries**: `@capacitor/camera`, `@capacitor/haptics`, `@capacitor/local-notifications`, `@capacitor/push-notifications`, `@capacitor/app`.