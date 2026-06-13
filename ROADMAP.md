# Ronin Daily — Roadmap

---

## PREPARE FOR BATTLE — ONBOARDING FLOW REDESIGN

After initial commit, app enters a preparation period instead of starting Day 1 immediately.

- AI generates a personalized weekly meal plan based on daily calorie target
- AI generates a weekly grocery list from the meal plan
- App displays: *"Your mission begins when you are ready. A warrior prepares before battle, not during it."*
- User shops and prepares
- User returns to app and hits **I am prepared. Begin.** button
- Day 1 starts the following morning
- Preparation period has no time limit — user controls when they start

---

## MEAL PLANNING — AI POWERED

Claude API integration to generate personalized weekly meal plans.

- Meal suggestions based on exact daily calorie target, food preferences, dietary restrictions
- Breakfast, lunch, dinner, and snacks with specific foods and portions — not just calorie numbers
- Rotates weekly so users don't eat the same things every week
- Accounts for calorie target changes after weekly check-ins

---

## GROCERY LIST GENERATION

AI generates a complete weekly shopping list from the meal plan.

- Quantities calculated for exactly one week
- Organized by grocery store section — produce, proteins, dairy, etc.
- Displayed in app as a checklist the user can check off while shopping

---

## GROCERY STORE INTEGRATION — PREMIUM

Instacart API integration.

- Works with Meijer and most major US grocery chains
- User selects their preferred store
- App sends grocery list directly to Instacart
- User checks out through Instacart for pickup or delivery
- In-app purchase flow for grocery order
- Tagline: *"A warrior prepares before battle, not during it."*

---

## ACTIVITY LOGGING

Users can log actual exercise completed vs planned.

- Example: planned 1 mile walk, actually walked 2.5 miles
- App recalculates remaining daily deficit in real time
- Surplus exercise carries forward as a small buffer — not a reward, just math

---

## SKIP DAY MECHANIC

Button on dashboard: **I skipped today**

- App response in brand voice: *"You have failed. You have dishonored your name and your family."*
- Streak resets to zero
- Plan recalculates forward from current weight
- No softening, no encouragement, no path back except starting again

---

## FORM UX IMPROVEMENT

- Auto-advance between onboarding form fields on mobile — hitting done or next on keyboard moves to the next field automatically

---

## DESKTOP LANDING PAGE

Simple one-screen explanation of Ronin Daily before the login screen.

- For strangers arriving on desktop who need context before committing to sign up
- Brand voice: austere, direct, no marketing fluff

---

## MONETIZATION — FREEMIUM MODEL

- **Free tier:** daily mission, math engine, streak tracking, weekly check-in
- **Premium tier ($9.99/month):** AI meal planning, weekly grocery list, Instacart integration, preparation period flow
- Premium tier unlocks after first week of free use

---

## APPLE HEALTH INTEGRATION

- Requires native iOS wrapper
- Real calorie burn data replaces estimates

---

## APPLE SIGN IN

- Requires Apple Developer account ($99/year)
- One session to implement once account is approved
