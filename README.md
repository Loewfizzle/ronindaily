# Ronin Daily

**A discipline-focused weight loss PWA for people who don't make excuses.**

Live at [ronindaily.app](https://ronindaily.app)

---

## What it is

Ronin Daily calculates a personalized daily calorie target and movement prescription based on your body stats and goal timeline. You commit once. The app gives you your mission for the day. No graphs, no gamification, no encouragement — just the math and a streak.

- Mifflin-St Jeor BMR with 70/30 food/exercise deficit split
- Weekly check-in adjusts the plan to your real weight
- Streak tracking across sessions via Supabase
- Works offline via PWA service worker
- Google OAuth and magic link sign-in

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18 + Vite |
| Styling | Tailwind CSS v4 |
| Auth + DB | Supabase (Postgres + Auth) |
| PWA | vite-plugin-pwa |
| Analytics | Vercel Analytics |
| Hosting | Vercel |

---

## Local Setup

```bash
git clone https://github.com/Loewfizzle/ronindaily.git
cd ronindaily
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Fill in your Supabase credentials in `.env` (see [Supabase Setup](#supabase-setup) below), then:

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)

2. Run the migration in the Supabase SQL editor:

   **Dashboard → SQL Editor → New query → paste contents of `supabase/migrations/001_initial_schema.sql` → Run**

3. Enable Google OAuth:
   - Dashboard → Authentication → Providers → Google
   - Add your Google OAuth client ID and secret
   - Add `https://your-project.supabase.co/auth/v1/callback` as an authorized redirect URI in Google Cloud Console

4. Enable magic link (email OTP):
   - Dashboard → Authentication → Providers → Email — enabled by default
   - Configure your SMTP or use Supabase's built-in email

5. Add your site URL to the allowed redirect URLs:
   - Dashboard → Authentication → URL Configuration
   - Add `http://localhost:5173` (dev) and `https://ronindaily.app` (prod)

6. Copy your project credentials:
   - Dashboard → Project Settings → API
   - Copy **Project URL** and **anon public** key into `.env`

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon (public) key |

These are safe to expose in frontend code. Never commit your actual `.env` file.

---

## Vercel Deployment

1. Import the repository in Vercel
2. Add both environment variables in **Project Settings → Environment Variables**
3. Set the production branch to `main`
4. Deploy — Vercel auto-deploys on every push to `main`

---

## Project Structure

```
src/
  App.jsx                  # Auth flow, screen routing, Supabase session
  components/
    Dashboard.jsx          # Main mission screen, streak, all sheets
    Onboarding.jsx         # Goal setup form
    CheckinSheet.jsx       # Weekly weight check-in
    SettingsSheet.jsx      # Sign out / adjust goal / start over
    ShareSheet.jsx         # Share progress
    BottomSheet.jsx        # Reusable bottom sheet modal
  utils/
    calculate.js           # BMR, TDEE, deficit math
  lib/
    supabase.js            # Supabase client
supabase/
  migrations/
    001_initial_schema.sql # Complete DB schema + RLS
public/
  favicon.svg
  pwa-192x192.png
  pwa-512x512.png
  apple-touch-icon.png
  og.png
```
