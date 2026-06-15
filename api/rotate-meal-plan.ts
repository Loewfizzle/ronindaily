// Node.js runtime — uses web-push (requires Node.js crypto) and Anthropic API
// Runs every Monday at 06:00 UTC to generate fresh 7-day meal plans for all active users.

export const config = { maxDuration: 300 }

import { VercelRequest, VercelResponse } from '@vercel/node'
import webpush from 'web-push'
import { computeCalorieTarget } from '../src/utils/calorieCore'
import type { CalorieProfile } from '../src/utils/calorieCore'

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  ?? process.env.SUPABASE_URL  ?? ''
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? ''

const SB_HEADERS = {
  apikey:         SUPABASE_KEY,
  Authorization:  `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MealPrefs {
  budget?: string
  restrictions?: string[]
  equipment?: string[]
  activeMeals?: string[]
  mealAllocations?: Record<string, number>
  dislikes?: string
  description?: string
}

interface ProfileRow {
  id: string
  sex: 'M' | 'F'
  age: number
  height_cm: number
  start_weight: number
  goal_weight: number
  target_weeks: number
  start_date: string
  unit: 'imperial' | 'metric'
  meal_prefs: MealPrefs | null
}

interface CheckinRow { weight: number }

interface PushSubRow {
  endpoint: string
  p256dh: string
  auth: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Copied from api/meal-plan.ts so rotate-meal-plan has no cross-function imports.
function buildPrefsSection(prefs: MealPrefs | undefined): string {
  if (!prefs) return ''
  const parts: string[] = []

  const budgetMap: Record<string, string> = {
    raw_materials: "RAW MATERIALS TIER — absolute bare minimum cost foods only. Canned tuna, eggs, rice, oats, frozen vegetables, peanut butter, whole wheat bread, bananas, beans, lentils, cottage cheese. Everything under $50 for the week. No cooking required beyond basic preparation. Purely functional fuel — no cuisine, no variety for variety's sake, just the cheapest most calorie-efficient whole foods available at any grocery store.",
    budget:        'BUDGET TIER — Use only affordable staple ingredients: rolled oats, eggs, canned beans, lentils, canned tuna, canned sardines, frozen vegetables (broccoli, spinach, mixed veg), chicken thighs, ground beef (80/20), rice, sweet potatoes, bananas, apples, peanut butter, whole milk, store-brand Greek yogurt. Prioritise cheap high-volume foods and repeat ingredients across days to keep the shopping list short and cheap.',
    standard:      'STANDARD TIER — Use common supermarket ingredients available at any grocery store: chicken breast, ground turkey, eggs, canned fish, fresh and frozen vegetables, seasonal fruits, brown rice, pasta, rolled oats, Greek yogurt, cottage cheese, milk, olive oil, cheddar cheese, whole wheat bread.',
    flexible:      'FLEXIBLE TIER — Any ingredients are acceptable including salmon, shrimp, steak, specialty produce, quinoa, almond butter, specialty cheeses, and premium items. Prioritise nutrition and variety.',
    fast_food:     "FAST FOOD TIER — CRITICAL: All meals must come entirely from fast food chains and convenience sources. No cooking, no kitchen, no grocery store ingredients whatsoever. Every single food item must be a real, orderable menu item from a specific national chain: McDonald's, Chipotle, Subway, Taco Bell, Chick-fil-A, Burger King, Panera, 7-Eleven, or similar nationally available chains. For snacks use protein bars (Quest, RXBAR, Kind), energy drinks, or convenience store packaged items. Name the chain in the meal name (e.g. \"Chipotle chicken bowl\", \"McDonald's Egg McMuffin\", \"Quest chocolate chip protein bar\"). Still hit the daily calorie target. Still split across the active meal slots. Repeat the same fast food orders across multiple days exactly as the repetition rules require.",
  }
  if (prefs.budget && budgetMap[prefs.budget]) parts.push(budgetMap[prefs.budget])

  const restrictionMap: Record<string, string> = {
    no_pork:     'No pork or pork products — no bacon, ham, sausage, prosciutto, lard, gelatin',
    no_beef:     'No beef or beef products — no hamburger, steak, ground beef, veal',
    no_seafood:  'No fish, shellfish, or seafood of any kind',
    vegetarian:  'Vegetarian — no meat, poultry, or seafood; eggs and dairy are allowed',
    vegan:       'Vegan — no animal products whatsoever: no meat, poultry, seafood, eggs, dairy, honey, gelatin',
    gluten_free: 'Gluten-free — no wheat, barley, rye, regular oats, regular bread, or regular pasta; use rice, potatoes, certified GF oats, or GF alternatives',
    dairy_free:  'Dairy-free — no milk, cheese, butter, cream, yogurt, or whey; use plant-based alternatives where needed',
  }
  const activeRestrictions = (prefs.restrictions ?? []).map(r => restrictionMap[r]).filter(Boolean)
  if (activeRestrictions.length > 0) {
    parts.push(`HARD DIETARY RESTRICTIONS — NEVER VIOLATE THESE:\n${activeRestrictions.map(r => `- ${r}`).join('\n')}`)
  }

  const equipmentList = prefs.equipment ?? []
  if (equipmentList.includes('no_equipment')) {
    parts.push('EQUIPMENT: NO EQUIPMENT AVAILABLE — no-cook items only. Canned food, deli items, pre-made meals, zero cooking required. Do not include any meal that requires a stove, oven, air fryer, or any heat source. This overrides all other equipment constraints.')
  } else if (equipmentList.length > 0) {
    const equipmentMap: Record<string, string> = {
      stovetop:  'Stovetop — pan-cooked meals, sautéed vegetables, scrambled eggs, soups',
      oven:      'Oven — baked chicken, roasted vegetables, baked fish, sheet pan meals',
      air_fryer: 'Air fryer — air fryer chicken breast, crispy vegetables, air fried fish, sweet potatoes',
      blender:   'Blender — protein shakes, smoothies, blended soups, meal replacement shakes',
      microwave: 'Microwave — microwaved meals, reheated leftovers, steamed vegetables',
    }
    const activeEquipment = equipmentList.map(e => equipmentMap[e]).filter(Boolean)
    if (activeEquipment.length > 0) {
      parts.push(`AVAILABLE EQUIPMENT — limit cooking methods to what these tools provide:\n${activeEquipment.map(e => `- ${e}`).join('\n')}`)
    }
  }

  if (prefs.dislikes?.trim()) {
    parts.push(`DISLIKED FOODS — never include these or dishes where they are a primary component: ${prefs.dislikes.trim()}`)
  }

  if (prefs.description?.trim()) {
    parts.push(`USER PREFERENCE OVERRIDE — the user has described their ideal meals as follows. Respect these preferences above all other constraints except hard dietary restrictions and calorie targets:\n${prefs.description.trim()}`)
  }

  if (prefs.activeMeals && prefs.activeMeals.length > 0 && prefs.activeMeals.length < 4) {
    const allMeals  = ['breakfast', 'lunch', 'dinner', 'snacks']
    const skipped   = allMeals.filter(m => !prefs.activeMeals!.includes(m))
    const activeList = prefs.activeMeals.map(m => {
      const cal  = prefs.mealAllocations?.[m]
      const name = m.charAt(0).toUpperCase() + m.slice(1)
      return cal ? `${name} (${cal} cal)` : name
    }).join(', ')
    const skippedList = skipped.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' and ')
    parts.push(`ACTIVE MEALS ONLY — CRITICAL: Only generate food items for: ${activeList}. Do NOT generate ${skippedList} — output empty arrays [] for skipped meals. The day JSON must include all four slot keys but skipped meals get empty arrays []. This overrides rule 5.`)
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : ''
}

function buildPrompt(cal: number, portionSystem: string, prefsSection: string): string {
  return `You are a meal prep assistant. Generate a strict 7-day meal plan built around REPETITION, not variety. The user buys ingredients once and eats the same meals multiple times. Repetition is intentional and correct.

INGREDIENT BUDGET — CHOOSE THESE FIRST, THEN BUILD THE ENTIRE PLAN USING ONLY THEM:
• PROTEINS: Pick exactly 2 or 3 proteins for the entire week. Use only these proteins, rotating them. No other protein sources may appear anywhere in the plan.
• CARBS: Pick exactly 2 or 3 carb sources for the entire week. Repeat across multiple days.
• VEGETABLES: Pick exactly 3 or 4 vegetables for the entire week. The same vegetables appear in multiple meals and multiple days.
• TOTAL unique grocery items across all 7 days: NO MORE THAN 15–20 items.

MEAL REPETITION RULES — ENFORCE EXACTLY:
• BREAKFAST: Must be IDENTICAL every day, OR alternate between exactly 2 options (Days 1, 3, 5, 7 = Option A; Days 2, 4, 6 = Option B). No other breakfast variation.
• LUNCH: Day 1 and Day 4 are IDENTICAL. Day 2 and Day 5 are IDENTICAL. Day 3 and Day 6 are IDENTICAL. Day 7 may match any of the above.
• DINNER: Day 1 and Day 4 are IDENTICAL. Day 2 and Day 5 are IDENTICAL. Day 3 and Day 6 are IDENTICAL. Day 7 may match any of the above.
• SNACKS: 1 or 2 options repeated all week.
• DO NOT introduce variety for variety's sake. If days 1 and 4 have identical dinner, copy them word for word. That is correct.

CALORIE TARGET: ${cal} calories per day. Each day's totalCalories must be within ±50 calories of this target.
PORTIONS: Use ${portionSystem} with exact amounts.${prefsSection}

RULES:
1. Specific real foods only — never write "protein source", "lean protein", "complex carb", or any category label. Write: "pan-fried chicken breast", "cooked brown rice", "scrambled eggs".
2. Every portion has an exact number: "6 oz chicken breast", "1 cup cooked brown rice", "2 large eggs", "1 tbsp olive oil".
3. Simple preparations only: pan-fried, scrambled, baked, roasted, microwaved, steamed, raw.
4. Standard supermarket ingredients only.
5. Each day: breakfast, lunch, dinner, snacks. Each slot 1–4 items.
6. Calorie counts must be accurate. All items in a day must sum to totalCalories ±50 cal.

Respond with ONLY raw JSON — no markdown, no backticks, no text before or after:
{"days":[{"day":1,"breakfast":[{"name":"string","portion":"string","calories":0}],"lunch":[{"name":"string","portion":"string","calories":0}],"dinner":[{"name":"string","portion":"string","calories":0}],"snacks":[{"name":"string","portion":"string","calories":0}],"totalCalories":0}]}`
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const secret = req.headers['x-cron-secret']
  if (!secret || secret !== process.env.CRON_SECRET) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (!ANTHROPIC_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
    return
  }

  if (!SUPABASE_KEY) {
    res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' })
    return
  }

  // Configure webpush — non-fatal if VAPID keys missing (push skipped per user)
  const vapidPub  = process.env.VAPID_PUBLIC_KEY  ?? ''
  const vapidPriv = process.env.VAPID_PRIVATE_KEY ?? ''
  const canPush   = !!(vapidPub && vapidPriv)
  if (canPush) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
      vapidPub,
      vapidPriv,
    )
  }

  // Fetch all active profiles that have saved meal preferences
  let profiles: ProfileRow[]
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?start_date=not.is.null&meal_prefs=not.is.null&select=id,sex,age,height_cm,start_weight,goal_weight,target_weeks,start_date,unit,meal_prefs`,
      { headers: SB_HEADERS },
    )
    if (!r.ok) {
      res.status(500).json({ error: 'Failed to fetch profiles' })
      return
    }
    profiles = await r.json() as ProfileRow[]
  } catch {
    res.status(500).json({ error: 'Database unreachable' })
    return
  }

  let generated = 0, failed = 0

  for (const profile of profiles) {
    try {
      // Latest check-in weight (fall back to start weight)
      const checkinR = await fetch(
        `${SUPABASE_URL}/rest/v1/checkins?user_id=eq.${profile.id}&select=weight&order=week_number.desc&limit=1`,
        { headers: SB_HEADERS },
      )
      const checkins      = checkinR.ok ? await checkinR.json() as CheckinRow[] : []
      const checkinWeight = checkins[0]?.weight != null ? Number(checkins[0].weight) : null
      if (!profile.start_weight || isNaN(Number(profile.start_weight))) { failed++; continue }

      const calProfile: CalorieProfile = {
        sex:           profile.sex,
        age:           profile.age,
        heightCm:      profile.height_cm,
        startWeight:   profile.start_weight,
        goalWeight:    profile.goal_weight,
        currentWeight: checkinWeight,
        targetWeeks:   profile.target_weeks,
        unit:          profile.unit,
        startDate:     profile.start_date,
      }
      const cal           = computeCalorieTarget(calProfile).calorieTarget
      const prefs         = profile.meal_prefs
      const portionSystem = profile.unit === 'metric'
        ? 'metric units (grams, ml) — e.g. "150g chicken breast", "200ml whole milk"'
        : 'imperial units (oz, cups, tbsp, tsp, or count-based) — e.g. "6 oz chicken breast", "1/2 cup rolled oats", "2 large eggs"'
      const prompt        = buildPrompt(cal, portionSystem, buildPrefsSection(prefs ?? undefined))

      // Generate plan via Anthropic
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':          ANTHROPIC_KEY,
          'anthropic-version':  '2023-06-01',
          'content-type':       'application/json',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 4096,
          messages:   [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (!aiRes.ok) { failed++; continue }

      const aiData = await aiRes.json() as { content: Array<{ type: string; text: string }> }
      const raw    = aiData.content?.[0]?.text ?? ''
      const s0 = raw.indexOf('{'), e0 = raw.lastIndexOf('}')
      if (s0 === -1 || e0 <= s0) { failed++; continue }
      const parsed = JSON.parse(raw.slice(s0, e0 + 1)) as { days: unknown[] }
      if (!Array.isArray(parsed.days) || parsed.days.length === 0) { failed++; continue }
      const validDays = (parsed.days as Array<Record<string, unknown>>).every(
        d => Array.isArray(d.breakfast) && Array.isArray(d.lunch) && Array.isArray(d.dinner) && Array.isArray(d.snacks),
      )
      if (!validDays) { failed++; continue }

      const generatedAt = new Date().toISOString()
      const planData    = { days: parsed.days, calorieTarget: cal, generatedAt }

      // Upsert to meal_plans (one row per user, unique on user_id)
      await fetch(`${SUPABASE_URL}/rest/v1/meal_plans`, {
        method:  'POST',
        headers: { ...SB_HEADERS, Prefer: 'resolution=merge-duplicates' },
        body:    JSON.stringify({ user_id: profile.id, plan: planData, generated_at: generatedAt }),
      })

      generated++

      // Push notification — non-fatal
      if (canPush) {
        try {
          const subR = await fetch(
            `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${profile.id}&is_active=eq.true&select=endpoint,p256dh,auth`,
            { headers: { ...SB_HEADERS, Accept: 'application/vnd.pgrst.object+json' } },
          )
          if (subR.ok) {
            const sub = await subR.json() as PushSubRow | null
            if (sub?.endpoint) {
              try {
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  JSON.stringify({ title: 'RONIN DAILY', body: 'New week. New plan. Ready.', url: 'https://ronindaily.app' }),
                )
              } catch (pushErr) {
                const status = (pushErr as { statusCode?: number }).statusCode
                if (status === 410) {
                  await fetch(
                    `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
                    { method: 'PATCH', headers: SB_HEADERS, body: JSON.stringify({ is_active: false }) },
                  )
                }
              }
            }
          }
        } catch { /* push failure is non-fatal */ }
      }
    } catch {
      failed++
    }
  }

  res.status(200).json({ generated, failed, total: profiles.length })
}
