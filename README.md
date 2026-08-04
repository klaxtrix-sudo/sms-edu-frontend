# Klaxtrix — Frontend

Modern Multi-Tenant School Management System frontend for Nigerian schools, built with **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| UI Components | shadcn/ui + Radix UI |
| Auth / Data | Supabase (PostgreSQL) + Express Backend API |
| Data Hooks | Custom React hooks (`useTenant`, `useFetch`) |
| State Management | React Context Providers (`TenantProvider`, `AuthProvider`) |
| Forms & Validation | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts & Data Vis | Recharts |
| PDF Generation | `@react-pdf/renderer` (Student Result Slips) |
| PWA Support | `next-pwa` (Service workers & offline capabilities) |

## Multi-Tenancy & Subdomain Routing

The frontend utilizes Next.js Middleware (`middleware.ts`) to intercept incoming requests and extract tenant subdomains:

- **Root Domain** (`klaxtrix.com.ng` or `localhost:3000`): Serves landing pages, public registration (`/register`), documentation (`/resources`), and the Master Admin Console (`/console`).
- **School Subdomain** (`[subdomain].klaxtrix.com.ng` or `[subdomain].localhost:3000`): Automatically rewritten to `app/(schools)/[subdomain]/`, supporting tenant-isolated authentication and role-based sub-dashboards.

## User Roles & Dashboards

- **Master Console** (`/console`) — Infrastructure metrics, platform analytics, global tenant management, access codes, and system configuration.
- **School Admin** (`/[subdomain]/dashboard/admin`) — School configuration, academic sessions, teacher/student/parent management, fee structures, and school performance metrics.
- **Teacher** (`/[subdomain]/dashboard/teacher`) — Subject assignment, grade submission, CBT exam creation, attendance tracking, and timetable management.
- **Student** (`/[subdomain]/dashboard/student`) — Interactive CBT exam interface, assignment submission, timetable viewing, and result slip downloads.
- **Parent** (`/[subdomain]/dashboard/parent`) — Multi-child overview, academic performance monitoring, payment history, and school fee payment via Paystack.
- **Setup & Onboarding** (`/[subdomain]/dashboard/setup`) — Guided onboarding flow for newly registered schools.

## Verification & Build Commands

Run the following commands to confirm code quality and build validity:

```bash
# Code linting (Next.js ESLint rules)
npm run lint

# TypeScript type-checking (tsc --noEmit)
npm run typecheck

# Production build (next build)
npm run build
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in Supabase URL, anon key, service role key, backend API URL, encryption keys, etc.

# 3. Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) or test subdomains (e.g. `http://demo.localhost:3000`).

## Project Structure

```
app/
  (schools)/[subdomain]/
    (auth)/login/       # Tenant login page
    dashboard/
      admin/            # School Admin dashboard & management tools
      teacher/          # Teacher dashboard & grading suite
      student/          # Student dashboard & CBT portal
      parent/           # Parent portal (child results & fee payment)
      setup/            # Initial school setup wizard
      suspended/        # Tenant suspension notification page
    exams/              # CBT exam taking interface
  console/              # Master Admin Console (tenants, infrastructure, analytics)
  register/             # Public school onboarding flow
  resources/            # Documentation & resources
  actions/              # Next.js Server Actions (with S2S internal auth)
components/
  admin/                # Admin-specific UI components
  console/              # Master console management views
  dashboard/            # General dashboard layouts & navigation sidebar
  landing/              # Landing page sections
  providers/            # TenantProvider, AuthProvider, ThemeProvider
  shared/               # Shared result slip templates & widgets
  student/              # Assignment submission & CBT modal components
  teacher/              # Assignment creation & grading modals
  ui/                   # shadcn/ui primitive components
hooks/                  # Custom client hooks (useTenant, useFetch, etc.)
lib/
  supabase/             # Supabase browser, server, and middleware clients
  api-client.ts         # Axios/fetch wrapper for Express backend API
  console-auth.ts       # Master console session helpers
  utils.ts              # Shared utility functions (grading rules, currency formatting)
types/
  supabase.ts           # Generated Supabase database type definitions
  index.ts              # Shared application TypeScript interfaces
public/
  manifest.json         # Progressive Web App manifest
```

## Related Repositories

- **Backend**: `sms-edu-backend/` — Express.js + MongoDB Atlas + Supabase REST API
