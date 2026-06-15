# Ronin Daily

A discipline-focused weight loss PWA for people who don't make excuses.

**Live:** [ronindaily.app](https://ronindaily.app)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS v4 |
| PWA | vite-plugin-pwa (service worker, installable, offline-capable) |
| Backend / Auth | Supabase (Postgres + Auth + Row Level Security) |
| Hosting | Vercel (static hosting + serverless functions + cron jobs) |
| AI | Anthropic API (claude-haiku-4-5-20251001) |
| Analytics | Vercel Analytics |

---

## Local Setup

```bash
git clone https://github.com/Loewfizzle/ronindaily.git
cd ronindaily
npm install
cp .env.example .env   # fill in real values (see below)
npm run dev
```

App runs at `http://localhost:5173`.

---

## Environment Variables

### Client-exposed (VITE_ prefix — bundled into the frontend)

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project REST URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/publishable key — respects RLS |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for the browser push subscription call |

### Server-only (Vercel environment variables — never in the bundle)

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Bypasses RLS; used only by serverless functions |
| `ANTHROPIC_API_KEY` | Anthropic API key for meal plan + calorie estimate calls |
| `VAPID_PUBLIC_KEY` | VAPID public key (server copy, same value as VITE_VAPID_PUBLIC_KEY) |
| `VAPID_PRIVATE_KEY` | VAPID private key for signing push notifications |
| `VAPID_SUBJECT` | VAPID contact URI, e.g. `mailto:admin@ronindaily.app` |
| `CRON_SECRET` | Shared secret — cron requests set `x-cron-secret` header; handlers verify it |

`.env` is gitignored and must never be committed. `.env.example` (with placeholder values) is committed.

---

## Supabase Setup

Migrations are run **manually** in the Supabase SQL Editor (Dashboard → SQL Editor → paste → Run). Run them **in order**:

| File | What it adds |
|---|---|
| `001_initial_schema.sql` | `profiles`, `checkins`, `daily_logs` tables + RLS policies |
| `002_badges.sql` | `badges` table + RLS |
| `003_activities.sql` | `profiles.activities text[]` column |
| `004_activity_logs.sql` | `activity_logs` table + RLS |
| `005_cheat_meals.sql` | `cheat_meals` table + RLS |
| `006_activity_totals.sql` | `activity_totals` table (cumulative per-user per-activity) + RLS |
| `007_daily_accountability.sql` | `daily_accountability` table + RLS |
| `008_api_usage.sql` | `api_usage` table for server-side rate limiting + RLS |
| `009_push_subscriptions.sql` | `push_subscriptions` table + RLS |
| `010_push_milestone_column.sql` | `push_subscriptions.milestone_notifications_sent text[]` |
| `011_push_timezone.sql` | `push_subscriptions.timezone text` |
| `012_meal_plans_table.sql` | `meal_plans` table + `profiles.meal_prefs jsonb` + RLS |

---

## Auth Providers

- **Google OAuth** — configured in Supabase Auth. Currently in Testing mode; submit for Google verification when ready for public launch.
- **Email magic link** — no additional setup required.
- **Apple Sign In** — OAuth secret expires approximately December 2026. Regenerate in the Apple Developer portal before expiry.

---

## Vercel Deploy

Deploys automatically on push to `main`. After adding or changing environment variables in Vercel, trigger a manual redeploy for the new values to take effect in serverless functions.

### Cron Jobs (from `vercel.json`)

| Path | Schedule | What it does |
|---|---|---|
| `/api/send-notifications` | `0 * * * *` (every hour) | Delivers daily reminder push notifications to users whose local time matches their chosen notification time |
| `/api/rotate-meal-plan` | `0 6 * * 1` (Mondays 06:00 UTC) | Regenerates 7-day meal plans for all users who have saved meal preferences, then sends a "new plan ready" push notification |

---

## Project Structure

```
src/
  components/       React components (one per screen or sheet)
    Dashboard.tsx
    Onboarding.tsx
    PreparationScreen.tsx
    MealPlanView.tsx
    MealPlanSheet.tsx
    GroceryListView.tsx
    GroceryListSheet.tsx
    CheckinSheet.tsx
    AccountabilitySheet.tsx
    WeeklyRecapSheet.tsx
    MonthlyRecapSheet.tsx
    SettingsSheet.tsx
    PushBanner.tsx
    BadgeBanner.tsx
    BadgeDetailSheet.tsx
    LandingPage.tsx
    PrivacyPolicy.tsx
    TermsOfService.tsx
    BottomSheet.tsx / FullSheet.tsx / ...
  utils/
    calculate.ts    Mifflin-St Jeor BMR → calorie target + movement prescription
    badges.ts       Badge definitions and unlock logic
    patterns.ts     Weekly pattern detection
    push.ts         Push subscription helpers
  lib/
    supabase.ts     Supabase client (anon key)
  types/
    database.types.ts  TypeScript types mirroring all Supabase tables

api/                Vercel serverless functions
  estimate-calories.ts   Edge — AI calorie estimate for cheat meals
  meal-plan.ts           Edge — AI 7-day meal plan generation
  grocery-list.ts        Edge — AI grocery list from meal plan
  send-notifications.ts  Node.js — hourly push notification cron
  rotate-meal-plan.ts    Node.js — Monday meal plan rotation cron
  test-notification.ts   Node.js — internal push test endpoint
  _rateLimit.ts          Shared rate-limit helper (Edge-compatible)

supabase/
  migrations/       SQL migration files 001–012 (run manually)
```
