# Ronin Daily — Roadmap

---

## CURRENT STATUS

**As of June 2026.** App is live at [ronindaily.app](https://ronindaily.app) and feature-complete through the push notifications / auto-rotating meal plan / Apple Sign In / cheat meal milestone.

The next planned feature is the **Weekly Progress Email**. Concept is drafted but not finalized — see the NEXT UP section before building.

---

## COMPLETED

- Landing page with login CTA
- Auth: Apple Sign In, Google OAuth (Testing mode), email magic link
- Onboarding: body stats, unit system (imperial/metric), activity selection
- 4-step preparation flow (commitment screen with extreme mission detection)
- Extreme mission system: automatic detection when required deficit exceeds safe maximum; user must accept the challenge
- Dynamic daily mission: Mifflin-St Jeor BMR → TDEE → deficit split 70/30 food/exercise → personalized calorie target and movement prescription
- 8 activity types with per-type calorie/distance or calorie/time conversion (walk, bike, run, resistance, bodyweight, swim, boxing, yoga)
- Daily activity logging with planned vs actual tracking
- Cumulative activity totals (lifetime miles walked, minutes trained, etc.)
- Weekly check-ins with weight re-entry and pace feedback
- Streak mechanic with skip-day option (one per week)
- Daily accountability overlay at 8 PM: complete / partial / failed with calories_hit and movement_hit tracking
- Weekly + monthly recap sheets
- 20+ badges including streak milestones, weight milestones, activity milestone series, dawn warrior (early logins), perfect week, and progressive 完 gold fill
- AI meal planning (Anthropic API): 5 budget tiers, dietary restrictions, equipment selection, active meal selection, per-slot regeneration, full plan regeneration
- AI grocery list generation from meal plan
- Cheat meal logging with AI calorie estimation
- Server-side rate limiting on all AI endpoints (per-user per-day)
- Push notifications: Web Push via VAPID, user-controlled notification time, timezone-aware delivery, milestone push alerts
- Auto-rotating weekly meal plan: Monday 06:00 UTC cron regenerates plans for all users with saved preferences; "new plan" dashboard banner on Mondays; MealPlanView background sync from Supabase
- Privacy policy + terms of service pages
- Vercel Analytics
- Apple Sign In (OAuth secret expires ~Dec 2026 — regenerate before then)

---

## NEXT UP — WEEKLY PROGRESS EMAIL

> ⚠️ **NOT FINALIZED — discuss and confirm the design below before building.**

### Concept

A cold, factual Sunday evening email. No cheerleading. Subject line:

> "Week N complete. Here is where you stand."

Content:
- Current streak
- Weight change this week (lbs/kg depending on user's unit)
- Days logged this week
- Next week's calorie target (recomputed from current weight)
- One line of brand voice ("You're on mission. Don't stop.")
- Unsubscribe link

### Design decisions leaning toward (not locked in)

- **Email provider**: Resend via plain `fetch` — no SDK dependency, no extra package.
- **Cron**: Vercel cron at `0 20 * * 0` (Sunday 20:00 UTC ≈ 4 PM Eastern) so the email lands before the 8 PM accountability overlay.
- **Calorie target**: Extract a shared calculation module from `src/utils/calculate.ts` so the serverless cron and the client compute the same number without drift.
- **Eligibility**: Send to users at least 7 days in (week 1 complete) who have not opted out.
- **Opt-out**: Add `weekly_email_opt_out boolean` column to `profiles` + a toggle in SettingsSheet. Default: opted in.
- **Premium gating**: Free for now; paywall later once Stripe exists.

### Open questions to resolve before building

1. Should the shared calc module be extracted now (clean) or should the cron duplicate the formula (faster to ship but risks drift)?
2. Does the opt-out toggle ship in the same batch as the email, or defer it to a follow-up?
3. Does the email include the meal plan for the coming week, or is that premium-only?

---

## ROADMAP AFTER EMAIL

### Stripe Monetization
- Plans: $6.99/month or $49.99/year
- Stripe webhook sets `is_premium boolean` on the `profiles` table
- Early/beta users set `is_premium` manually in Supabase
- Payment UI matches app aesthetic — no white Stripe defaults
- Web-only purchase flow to avoid Apple's 30% cut

### Google OAuth Verification
- Currently in Testing mode (limited to added test users)
- Submit for Google OAuth verification for unrestricted sign-in

### Wearable Sync

> ⚠️ **Critical platform note:** The legacy Fitbit Web API is being deprecated. Google is sunsetting it in September 2026; existing OAuth tokens do not carry over. **Do NOT build against the legacy Fitbit Web API** — it would stop syncing data within months of launch. The replacement is the **Google Health API** (`health.googleapis.com`), which launched in spring 2026 and is registered/managed through Google Cloud Console with Google OAuth2.

**Priority order:**
1. **Google Health API** — covers Fitbit devices AND Google Fit data through a single integration. One OAuth flow, one API, largest user slice. Register in Google Cloud Console; uses Google OAuth2 scopes.
2. **Garmin** — Garmin Connect API, OAuth. Dedicated fitness-first users with high-quality activity and calorie burn data.
3. **Whoop** — WHOOP API, OAuth. Whoop users are core target audience: disciplined, data-driven, recovery-obsessed. Strong premium signal.
4. **Apple Health / Apple Watch** — requires a native iOS wrapper with HealthKit entitlements. Gated behind the App Store build — cannot be done from the PWA.

**Primary value:** Replace estimated calorie burn with actual burn from device sensors. This makes the daily deficit real and is the primary justification for building wearables at all (and for gating it behind premium).

#### Sleep Data

Sleep is **not** a separate integration — it is an additional data type available through the same OAuth connection as activity and calorie burn. The Google Health API (and Garmin, Whoop) exposes sleep alongside heart rate, activity, body weight, and breathing rate through one consent grant. Available sleep data includes: stage breakdown (deep / light / REM / wake) at 30-second granularity, total minutes asleep and awake, time to fall asleep, and a sleep efficiency score.

Because the expensive work (OAuth, token storage and refresh, the daily morning pull cron) is shared with activity data, **sleep should be pulled from day one alongside burn data** once the wearable loop exists. Its marginal cost at that point is low.

**Design note (concept stage — discuss before building):** Sleep does NOT feed the calorie-deficit math (unlike burn data). So it needs a deliberate, on-brand use rather than being a raw dashboard stat. Ideas to explore: cold accountability-voice framing around recovery (treating recovery as part of the mission, not a luxury); a sleep-consistency streak shown alongside the discipline streak. Do not ship sleep data without a design decision on how it's presented.

**Build principle:** Get the burn loop tight first (OAuth → daily pull → replace estimated exercise burn on the dashboard). Sleep is a strong secondary signal layered on once the primary loop works. Do not ship multiple half-built data types.

### Evolving Completion Rank (完)

> Concept stage — discuss and design before building.

**Intent:** A user who completes a full mission should carry a permanent, visible mark — and it should evolve as they complete more missions over time (a tier or a visible count that grows with each completed mission), rather than being a one-time state that resets.

**Current behavior (confirmed from code):**
- When `progressPct >= 100`, Dashboard.tsx writes `ronin_goal_reached` to localStorage and awards the `goal_reached` badge (`完`) in the Supabase `badges` table.
- The `GoalBadgeCircle` component renders 完 with a progressive gold fill driven by `progressPct` — it fills as you approach the goal, then glows at 100%.
- On **Start Over** (`handleReset` in App.tsx): `clearLocal()` removes `ronin_goal_reached` from localStorage, AND `handleReset` also deletes the entire `badges` table for the user (`supabase.from('badges').delete().eq('user_id', user.id)`). The completion state is completely erased — both locally and in Supabase.
- The `goal_reached` badge does NOT survive a Start Over through any current path.

**Implementation direction (not finalized):**
- Track missions completed as a durable counter in Supabase (e.g. a `missions_completed integer` column on `profiles`, or a separate `completions` table), incremented when `goal_reached` is awarded and never deleted by Start Over.
- Drive an evolving 完 rank from this counter (e.g. 完 I, 完 II, or a visual tier system).
- This also enables Start Over to feel like a progression rather than an erasure.

### iOS App Store
- WKWebView wrapper around ronindaily.app
- Direct users to the web for Stripe purchases — no in-app purchase to avoid Apple's cut
- No additional native code required unless Apple Health sync is added

### Additional Movement Paths
- Maintain path (users who want to stay at current weight)
- Strength path (users bulking — calorie surplus with protein targets)

### Instacart Integration
- Export grocery list directly to Instacart cart

---

## MONETIZATION MODEL

### Free Tier
- Daily calorie target and meal breakdown
- Movement prescription
- Streak and skip-day mechanic
- Weekly check-ins
- Basic activity logging and cumulative totals
- 20+ badges
- Daily accountability

### Premium Tier
- AI meal planning (full plan + per-slot regeneration)
- Auto-rotating weekly meal plan
- Grocery list export
- Weekly progress email
- Push notifications
- Wearable sync
- Cheat meal AI calorie estimation

Stripe on web only — no in-app purchase on iOS to avoid Apple's 30% revenue cut.
