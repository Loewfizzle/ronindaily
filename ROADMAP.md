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

> ✅ **DESIGN FINALIZED + PHASED PLAN SET, NOT YET BUILT.** The decisions below are settled. No implementation has started. Do not re-litigate these choices during the build — open a new discussion if something material changes.

#### Architecture

A PWA cannot read a wearable device directly. The data path is always:

**wearable device → wearable company's cloud → our serverless backend pulls via their API → stored in Supabase → displayed in the app.**

We never communicate with the device. Everything goes through the provider's cloud API.

**Provider build order:**
1. **Google Health API** (`health.googleapis.com`) — registered and managed through Google Cloud Console, uses standard Google OAuth2. Covers both Fitbit devices and Google Fit in one integration. The legacy Fitbit Web API is sunset September 2026 and OAuth tokens do not carry over — do not build against it. Google Health API is the replacement and the correct target.
2. **Garmin** — Garmin Connect API, OAuth.
3. **Whoop** — WHOOP API, OAuth.
4. **Apple Health / Apple Watch** — requires a native iOS app with HealthKit entitlements. Deferred to the App Store build; cannot be done from the PWA.

Providers are sequenced one at a time because each has its own OAuth setup, scopes, and API quirks. This is not one "wearables" feature — it is a series of separate integrations.

**Sleep is not a separate integration.** It rides the same OAuth connection as activity and calorie burn. The Google Health API (and Garmin, Whoop) exposes sleep alongside activity data through one consent grant. Because the expensive work — OAuth, token storage and refresh, the daily cron — is shared, sleep is pulled from day one alongside burn data. Its marginal cost at that point is low.

#### Data Model: Once-Daily Pull (decided)

A dedicated morning cron pulls **yesterday's completed totals**: calories burned, steps, active minutes, and sleep duration/stages.

- **Cron timing:** Fixed run at **11:00 UTC** (≈ 6 AM US Eastern during EDT; note this shifts with daylight saving since Vercel crons are UTC). Chosen to run after the wearable has synced yesterday's data to its cloud and before most users open the app.
- **Future optimization (not v1):** Piggyback on the existing `send-notifications` cron so each user's wearable data refreshes right before their personal notification time. More elegant, more coupling — keep it a simple separate cron for v1.
- **Not live / not intraday.** Deliberately rejected. A PWA can't do live device reads, webhook infrastructure is significant complexity, and a calorie-burn target that updates throughout the day conflicts with the app's "the number doesn't negotiate" identity.

#### Display-Only — Does NOT Change the Daily Target (decided)

Real burn data shows **actual-vs-prescribed** progress on the dashboard (e.g. "340 of 400 cal movement target burned"). It replaces the estimated 1.2× TDEE burn figure with real sensor numbers. It does **not** recalculate or move the day's calorie target. The daily mission number is fixed — consistent with the brand.

**Where real data does feed the math:** the weekly check-in / next-week recalculation. `calculate.ts` already recomputes the plan from real weight each week; real weekly burn totals make that weekly adjustment more accurate than the 1.2× sedentary estimate. That is the high-value, low-chaos place to use the data.

#### First-Connect Backfill (decided)

On first OAuth connection, backfill recent history — target ~30 days, capped by each provider's API limits and rate limits. This is a one-time initial-sync path, separate from the daily pull, so the first experience is not empty and the weekly check-in is immediately useful.

#### OAuth / Plumbing (per provider — this is the bulk of the work)

Flow per provider:
1. User taps "Connect [provider]" in Settings.
2. Redirected to provider's login / consent screen.
3. User approves the requested scopes.
4. Provider returns an auth code to our callback URL.
5. Backend exchanges the auth code for access + refresh tokens.
6. Tokens stored **encrypted** in Supabase.
7. Daily cron uses the stored refresh token to pull data, refreshing tokens as they expire.

This is a **premium feature** per the monetization plan.

#### Build Strategy

**Build Google Health as a generic wearable layer, not a Google-specific one-off.** The data pipeline — OAuth flow, encrypted token storage, refresh handling, daily pull cron, backfill path — is built once with a provider abstraction. Burn, steps, active minutes, and sleep are normalized into our own Supabase shape. The dashboard reads from that normalized shape and knows nothing about which provider supplied the data. Garmin and Whoop plug into the same structure at Phase 0 of their own integrations rather than requiring three parallel implementations.

**Cost is front-loaded.** Google Health is roughly 70% of total wearable effort because it builds the shared foundation. Providers 2 and 3 mostly reuse it; their incremental cost is mostly the OAuth wiring and API-specific field mapping, not the core infrastructure.

**Timeline facts to keep straight:**
- The Google Health API is **live now** (launched spring 2026). There is no waiting for it.
- The **September 2026 date is only the death of the legacy Fitbit Web API** — a non-issue for us because we never build against the legacy API. Nothing to migrate, no expiration to worry about.
- Ignore any Fitbit Web API docs, tutorials, or code samples encountered during research; use Google Health API documentation exclusively.
- The Google Health API is new. Its documentation, client libraries, and community examples are thinner than a mature API. Expect an "early platform" build experience: more reading of raw API specs, fewer Stack Overflow answers, possible rough edges in the docs.

#### Phased Execution Plan

Each phase ends in something independently verifiable. Never build this as one giant diff.

**Phase 0 — Google Cloud setup + verification reconnaissance**
*Done by the user, not Claude Code — this requires touching the user's Google account.*

- Create a Google Cloud Console project.
- Enable the Google Health API.
- Configure the OAuth consent screen (app name, scopes, support email).
- Generate OAuth client credentials (client ID + secret).
- Register redirect URIs for local dev and production.

**Critical unknown to resolve in Phase 0:** Google Health scopes cover sensitive health data and likely require Google's verification/review before production use. The app's existing Google OAuth login is already in "Testing" mode. The outcome of Phase 0 is not "wearables work" — it is "we have credentials AND we know whether verification is required and how long it takes." That fact determines whether real health data is immediately usable or gated behind a Google review process that can take days to weeks. **Resolve this before writing any Phase 1 code.**

**Phase 1 — Data foundation**
- Supabase migration: a normalized, provider-agnostic `wearable_data` table (or similar) to hold daily totals per user: `logged_date`, `provider`, `calories_burned`, `steps`, `active_minutes`, `sleep_minutes`, `sleep_stages` (jsonb).
- No external dependencies. Fully testable in isolation by inserting mock rows and verifying the schema.

**Phase 2 — OAuth connect flow**
- "Connect Google Health" button in Settings.
- Redirect to Google consent screen → user approves scopes → Google returns auth code to our callback URL.
- Serverless callback handler: exchange auth code for access + refresh tokens, store **encrypted** in Supabase.
- Refresh token rotation handling.
- This is the gnarliest code phase. It stands alone so it can be tested in isolation: can a user connect, and do we receive valid, refreshable tokens? Verify before moving to Phase 3.

**Phase 3 — Daily pull cron + first-connect backfill**
- Daily cron at 11:00 UTC: for each connected user, use the stored refresh token to fetch yesterday's completed totals from the Google Health API and upsert into the normalized table.
- On first OAuth connect: one-time backfill of ~30 days of history (capped by provider API limits and rate limits), stored into the same normalized table.

**Phase 4 — Dashboard display**
- Show actual-vs-prescribed burn on the dashboard ("340 of 400 cal movement target burned").
- Replace the 1.2× TDEE sedentary estimate with real sensor data where available.
- Wire real weekly burn totals into the weekly check-in recalculation (this is display-only; the daily target does NOT move).

This is a **multi-session build**. Do not attempt to complete more than one phase per session.

### Evolving Completion Rank (完)

**Shipped.** A durable 完 mark appears in the dashboard header when a user completes a mission. It accumulates across Start Over and escalates visually with each completed mission.

**How it works:**
- `mission_completions` Supabase table (migration 013) holds one row per mission per user, keyed on `(user_id, mission_start_date)`. It is intentionally NOT deleted by `handleReset`.
- When `progressPct` first hits 100, a row is inserted and the mark appears immediately without a reload. A resilience check on mount catches any completion that was missed due to an offline session.
- `CompletionMark` component: gold deepens across three visual tiers (1 / 2–3 / 4+ missions); tier 2+ adds a bounded blurred halo (capped at blur 4px / opacity 0.42); `×N` count appears at 2+; the glyph itself is never blurred.
- Tapping the mark opens `MissionCompletionSheet` — a list of each mission's completion date and weight lost.
- Mobile: mark sits inboard of the settings gear. Desktop: mark appears below the RONIN/DAILY wordmark in the brand column.

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
