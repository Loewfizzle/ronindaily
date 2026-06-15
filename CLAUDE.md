# CLAUDE.md — Operational Rules for Ronin Daily

This file tells Claude how to build in this repo. Read it at the start of every session.

---

## Workflow

- All builds happen via Claude Code prompts in this repo.
- Always `git push` to `main` when a task is done.
- Supabase migrations are run **manually** by the user in the Supabase SQL Editor — never auto-applied.
- After adding or changing Vercel environment variables, remind the user to trigger a manual redeploy.
- After every major feature: run a full bug-audit + visual polish pass before calling the feature done.

---

## CRITICAL: Edge vs Node.js Runtime

Headers are read differently in each runtime. **Never mix them.**

| Runtime | Header access | Request/Response types |
|---|---|---|
| Edge | `req.headers.get('x-cron-secret')` | Web `Request` / `Response` |
| Node.js | `req.headers['x-cron-secret']` | `VercelRequest` / `VercelResponse` |

### Which functions use which runtime

| File | Runtime | Why |
|---|---|---|
| `api/estimate-calories.ts` | Edge | Has `export const config = { runtime: 'edge' }` |
| `api/meal-plan.ts` | Edge | Has `export const config = { runtime: 'edge' }` |
| `api/grocery-list.ts` | Edge | Has `export const config = { runtime: 'edge' }` |
| `api/send-notifications.ts` | Node.js | Uses `web-push` (requires Node crypto) |
| `api/test-notification.ts` | Node.js | Uses `web-push` (requires Node crypto) |
| `api/rotate-meal-plan.ts` | Node.js | Uses `web-push` (requires Node crypto) |
| `api/_rateLimit.ts` | Edge-compatible shared helper | Uses only `fetch` |

New functions that use `web-push` must be Node.js runtime (`VercelRequest`/`VercelResponse`, no `config` export).

---

## Security Rules

- `.env` is gitignored and must **never** be committed.
- `.env.example` (placeholder values only) IS committed.
- `ANTHROPIC_API_KEY` is server-side only — never reference it in frontend code.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — server-side only, never expose to client.
- `VITE_SUPABASE_ANON_KEY` is safe to expose — it's publishable and respects RLS.

---

## Data / State Rules

**localStorage is for UI state and offline cache only.** Anything enforced or auditable lives in Supabase.

Specific notes:
- `ronin_streak` is a local cache. The authoritative streak is computed from the `daily_logs` table.
- `ronin_best_progress` is a local cache. The authoritative value is in `profiles`.
- Calorie target is computed live by `src/utils/calculate.ts` (Mifflin-St Jeor) from profile + latest check-in weight. It is never stored durably — always recomputed.

**`ronin_goal_reached` and `ronin_personal_stats` — exact reset behavior (confirmed from App.tsx):**
- `ronin_goal_reached` is **removed** by `clearLocal()` (line 247 of App.tsx). It is NOT preserved on Start Over.
- Additionally, `handleReset` calls `supabase.from('badges').delete().eq('user_id', user.id)` — so the `goal_reached` badge row in Supabase is also wiped. Completion state is completely erased by Start Over through all paths.
- `ronin_personal_stats` survives a Start Over because `handleReset` explicitly writes it to localStorage *before* calling `clearLocal()`, and `clearLocal()` does not touch it. It is not exempted inside `clearLocal()` — it is re-saved around it.
- `ronin_personal_stats` is *not* preserved on Sign Out: `handleSignOut` calls `localStorage.removeItem('ronin_personal_stats')` explicitly after `clearLocal()`.
- Correction to an earlier handoff note: `clearLocal()` does **not** preserve `ronin_goal_reached`. Any doc or note claiming it does is wrong.

---

## Server-Side Rate Limits

Defined in `api/_rateLimit.ts`. Limits are per-user per-UTC-day:

| Action key | Limit | Used by |
|---|---|---|
| `meal_plan_full` | 3/day | Full meal plan regeneration |
| `meal_plan_slot` | 10/day | Per-slot meal regeneration |
| `grocery_list` | 3/day | Grocery list generation |
| `cheat_estimate` | 10/day | AI calorie estimate for cheat meals |

---

## Design System

### CSS Variables (from `src/index.css` `:root`)

```
--bg:          #0a0a0a   /* Page background — near black */
--surface:     #111111   /* Card/container background */
--elevated:    #181818   /* Elevated UI elements (modals, inputs) */
--border:      #1c1c1c   /* Subtle borders */
--border-mid:  #282828   /* Mid-weight borders */
--text:        #ddd8cf   /* Primary text */
--text-2:      #a09a94   /* Secondary text */
--text-3:      #6b6560   /* Tertiary / disabled text */
--red:         #8b1c1c   /* Primary brand red */
--red-bright:  #b02828   /* Hover / active red */
--gold:        #c9a84c   /* Sacred gold — badges, ranks, 完 only */
--green:       #4a7c59   /* Success / positive states */
```

### Rules

- **Hero kanji** (侍): `5rem`, `var(--red)`, `kanjiPulse` animation.
- **Wordmark** (RONIN DAILY): `1.1rem`, `0.44em` letter-spacing, `var(--text)`.
- **Minimum font size**: `0.75rem`. Never go smaller.
- **Minimum tap target**: `44px` height/width on all interactive elements.
- **Primary action buttons**: use `.commit-btn` class — never invent red button styles.
- **Login/auth buttons**: dark/elevated background (`var(--elevated)`), `var(--text)` — NOT red.
- **Close buttons**: SVG X icon at 44px tap target. Never text "✕" without a 44px container.
- **Bottom sheets**: full-screen on mobile; 2px red top stripe on sheet header.
- **Icons**: SVG only. No emoji in the UI.
- **Text hierarchy**: `var(--text)` → `var(--text-2)` → `var(--text-3)`.
- **GOLD IS SACRED**: `var(--gold)` is used ONLY for badges, rank labels, and the completion kanji 完. Never use it for UI chrome (borders, buttons, banners, labels).

---

## Calorie Calculation (src/utils/calculate.ts)

Formula: Mifflin-St Jeor BMR → TDEE → deficit → targets.

| Constant | Value |
|---|---|
| `CAL_PER_LB` | 3500 |
| `ACTIVITY_FACTOR` (sedentary TDEE multiplier) | 1.2 |
| `FOOD_DEFICIT_SPLIT` | 0.70 (70% of deficit from food) |
| `EXERCISE_DEFICIT_SPLIT` | 0.30 (30% of deficit from exercise) |
| `MIN_CAL_MALE` | 1500 |
| `MIN_CAL_FEMALE` | 1200 |

If the required daily deficit exceeds `TDEE − floor`, the plan is flagged as an **extreme mission** and the deficit is capped at the safe maximum.

---

## localStorage Key Reference

### Fixed keys (cleared by `clearLocal()` on sign-out/reset)

```
ronin_committed           — 'true' once user finishes onboarding
ronin_profile             — JSON UserProfile object
ronin_start               — ISO start date string
ronin_last_checkin        — ISO date of last weekly check-in
ronin_streak              — cached streak count (authoritative is daily_logs)
ronin_prepared            — 'false' during 4-step prep flow, 'true' after
ronin_meal_plan           — JSON cached meal plan
ronin_meal_prefs          — JSON saved meal preferences
ronin_grocery_list        — JSON cached grocery list
ronin_grocery_checked     — JSON checked-off grocery items
ronin_best_progress       — cached best progress percentage
ronin_goal_reached        — flag set when user hits goal weight
ronin_extreme_accepted    — flag: user accepted extreme mission warning
ronin_hesitated           — flag: user paused at commitment screen
ronin_pre_skip_streak     — streak value saved before a skip-day
ronin_dawn_count          — consecutive early-morning logins count
ronin_dawn_last_date      — date of last dawn login
ronin_activity_totals     — JSON cached cumulative activity totals
ronin_skipped             — date of current skip-day
ronin_plan_cache_version  — bust string ('2'); stale clients auto-clear meal plan
ronin_patterns            — JSON weekly pattern history
ronin_push_declined       — '1' if user dismissed the push banner
```

### Date/day-suffixed prefixes (cleared by `clearLocal()` via prefix scan)

```
ronin_dismissed_activities_<YYYY-MM-DD>   — dismissed activity cards for that day
ronin_activity_log_<YYYY-MM-DD>           — logged activity amounts for that day
ronin_cheat_meal_<YYYY-MM-DD>             — cheat meal entries for that day
ronin_accountability_<YYYY-MM-DD>         — accountability submission flag
ronin_weekly_recap_<N>                    — dismissed weekly recap for week N
ronin_monthly_recap_<N>                   — dismissed monthly recap for month N
ronin_new_plan_banner_<YYYY-MM-DD>        — dismissed Monday new-plan banner
```

### Keys NOT cleared by `clearLocal()` (preserved across sign-out)

```
ronin_personal_stats      — not in clearLocal(); persists across sessions
```

---

## Supabase Table Reference

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Core stats: sex, age, height_cm, start_weight, goal_weight, target_weeks, start_date, unit. Also has `activities text[]` (added 003) and `meal_prefs jsonb` (added 012). |
| `checkins` | Weekly weight check-ins. Used to recompute calorie target against remaining days. |
| `daily_logs` | One row per user per day they open the app. Authoritative source for streak computation. |
| `badges` | Earned badge records. `badge_id` matches definitions in `src/utils/badges.ts`. |
| `activity_logs` | Daily planned vs actual amounts per activity. |
| `activity_totals` | Cumulative totals per user per activity (unique on user_id + activity_id). |
| `cheat_meals` | Cheat meal entries with AI-estimated calorie count. |
| `daily_accountability` | End-of-day result (complete/partial/failed) with calories_hit and movement_hit flags. |
| `api_usage` | Rate limit tracking: (user_id, action, usage_date) → count. |
| `push_subscriptions` | Web Push subscription per user. Includes endpoint, keys, notification_time, timezone, is_active, and milestone_notifications_sent. |
| `meal_plans` | Auto-rotated 7-day meal plan per user (unique on user_id). Upserted every Monday by the cron. |

RLS is enabled on all tables. The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS and is used only in serverless functions (send-notifications, rotate-meal-plan).

---

## Before Building Anything — Checklist

1. Read the relevant component(s) and utility file(s) before making any changes.
2. Confirm Edge vs Node.js runtime for any API function you're touching.
3. Check whether new state belongs in Supabase (enforced/auditable) or localStorage (UI cache).
4. Match the design system: correct CSS variables, 44px tap targets, no gold in UI chrome.
5. Push to `main` when done.
6. If the feature is major, run a bug-audit + polish pass afterward.
