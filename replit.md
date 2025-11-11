# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration. The application supports various user roles including administrators, receptionists, operators, supervisors, workers, service technicians, and managers, each with tailored dashboards and workflows for task management across different departments (reception, restaurant, pool, housekeeping, technical services, and external contractors). The system enables efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and follows Material Design 3 principles for a clean, information-dense interface optimized for productivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript, using Vite as the build tool.
**UI Component System**: Shadcn/ui components built on Radix UI primitives, TailwindCSS for styling with custom design tokens, and Material Design 3 principles for layout and typography.
**State Management**: React Context API for global state, TanStack Query for server state management and caching, and localStorage for user authentication persistence.
**Routing**: Wouter for lightweight client-side routing.
**Internationalization**: i18next for English/Serbian language support.
**Key Design Patterns**: Role-based dashboard rendering, component composition, theme system (light/dark modes), and mobile-first responsive design.
**Hybrid Mobile App**: Implemented using Ionic React + Capacitor, integrating native mobile capabilities like Camera, Haptics, Local Notifications, and Push Notifications.

### Backend Architecture

**Server Framework**: Express.js running on Node.js.
**API Design**: RESTful endpoints with JSON request/response bodies.
**Authentication**: bcrypt for password hashing, session-based authentication with HTTP-only cookies, and username-based login (not email).
**Error Handling**: Centralized error logging.
**Build System**: esbuild for production bundling.

### Data Storage

**Primary Database**: Supabase PostgreSQL for all application data (users, tasks, task_history, notifications).
**Session Storage**: Neon PostgreSQL (separate DATABASE_URL) via connect-pg-simple for Express session persistence.
**Database Client**: Supabase JS SDK.
**Type Definitions**: `shared/schema.ts` for TypeScript type safety.
**Key Architectural Decisions**: Monorepo structure, shared type definitions, role-based UI, real-time capabilities via Socket.IO, environment-specific configuration, design system first, and bilingual support.

## External Dependencies

**Database**:
- Supabase PostgreSQL (primary data storage)
- Neon Serverless PostgreSQL (session storage)
- Supabase JS SDK (`@supabase/supabase-js`)
- `connect-pg-simple` (Express session persistence)

**UI Component Libraries**:
- Radix UI primitives (`@radix-ui/react-*`)
- Shadcn/ui
- Lucide React (iconography)

**Client-Side Libraries**:
- `date-fns`
- `class-variance-authority`
- `react-hook-form` with `@hookform/resolvers`
- Zod

**Mobile Development Libraries**:
- `@capacitor/camera`
- `@capacitor/haptics`
- `@capacitor/local-notifications`
- `@capacitor/push-notifications`
- `@capacitor/app`