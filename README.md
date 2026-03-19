# Klaxtrix — Frontend

Modern School Management System frontend for Nigerian schools, built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **shadcn/ui**.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS Variables |
| UI Components | shadcn/ui + Radix UI |
| Auth / DB | Supabase (PostgreSQL) |
| Server State | TanStack Query (React Query) |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend API | sms-edu-backend (Express.js + MongoDB) |

## User Roles

- **Admin** — School setup, user management, analytics
- **Teacher** — Results entry, exam creation, attendance
- **Student** — MCQ exams, view results, fee status
- **Parent** — View child results, pay school fees

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase URL, anon key, and backend API URL

# 3. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/login/       # Login page
  dashboard/
    admin/            # Admin dashboard
    teacher/          # Teacher dashboard
    student/          # Student dashboard
    parent/           # Parent dashboard
components/
  providers/          # React context providers
  ui/                 # Reusable UI components
lib/
  supabase/           # Supabase client, server, middleware helpers
  api-client.ts       # Fetch wrapper for Express backend
  utils.ts            # Shared utilities (grading, currency, shuffle)
types/
  supabase.ts         # Database type definitions
  index.ts            # Shared app types
public/
  manifest.json       # PWA manifest
```

## Related Repositories

- **Backend**: [sms-edu-backend](https://github.com/eveshogweyore/sms-edu-backend) — Express.js + MongoDB Atlas
