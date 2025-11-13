# Hotel/Facility Management System

## Overview

A comprehensive hotel and facility management system designed for multi-role task tracking, maintenance operations, and real-time collaboration across various departments (reception, restaurant, pool, housekeeping, technical services, external contractors). It supports multiple user roles (administrators, receptionists, operators, supervisors, workers, service technicians, and managers) with tailored dashboards. The system facilitates efficient task creation, assignment, tracking, and completion with priority levels, status management, and real-time notifications. It features bilingual support (English/Serbian) and a Material Design 3-inspired interface optimized for productivity.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

**Frameworks**: React with TypeScript, Vite.
**UI/UX**: Shadcn/ui (Radix UI primitives), TailwindCSS, Material Design 3 principles, Roboto font.
**State Management**: React Context API for global state, TanStack Query for server state and caching.
**Routing**: Wouter.
**Internationalization**: i18next (English/Serbian) with localStorage persistence.
**Mobile**: Ionic React and Capacitor for hybrid mobile app, integrating native features (Camera, Haptics, Local/Push Notifications).
**Key Design Patterns**: Role-based dashboards, component composition, light/dark mode theme system, mobile-first responsive design.

### Backend

**Framework**: Express.js on Node.js.
**API Design**: RESTful with JSON.
**Authentication**: Session-based with HTTP-only cookies, username-based login (bcrypt for password hashing), server-side session validation.
**Error Handling**: Centralized logging.
**Build System**: esbuild.
**Real-time**: Socket.IO for notifications and task updates.

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