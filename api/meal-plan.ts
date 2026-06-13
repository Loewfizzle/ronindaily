export const config = { runtime: 'edge', maxDuration: 30 }

interface MealItem {
  name: string
  portion: string
  calories: number
}

interface DayPlan {
  day: number
  breakfast: MealItem[]
  lunch: MealItem[]
  dinner: MealItem[]
  snacks: MealItem[]
  totalCalories: number
}

interface MealPrefs {
  budget?: 'raw_materials' | 'budget' | 'standard' | 'flexible'
  restrictions?: string[]
  equipment?: string[]
  dislikes?: string
  description?: string
}

interface RequestBody {
  calorieTarget: number
  unit: string
  days?: number
  dayNumber?: number
  prefs?: MealPrefs
  // Slot regeneration mode
  slotName?: 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  dayContext?: DayPlan
}

const SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const

function buildPrefsSection(prefs: MealPrefs | undefined): string {
  if (!prefs) return ''
  const parts: string[] = []

  const budgetMap = {
    raw_materials: 'RAW MATERIALS TIER — absolute bare minimum cost foods only. Canned tuna, eggs, rice, oats, frozen vegetables, peanut butter, whole wheat bread, bananas, beans, lentils, cottage cheese. Everything under $50 for the week. No cooking required beyond basic preparation. Purely functional fuel — no cuisine, no variety for variety\'s sake, just the cheapest most calorie-efficient whole foods available at any grocery store.',
    budget:        'BUDGET TIER — Use only affordable staple ingredients: rolled oats, eggs, canned beans, lentils, canned tuna, canned sardines, frozen vegetables (broccoli, spinach, mixed veg), chicken thighs, ground beef (80/20), rice, sweet potatoes, bananas, apples, peanut butter, whole milk, store-brand Greek yogurt. Prioritise cheap high-volume foods and repeat ingredients across days to keep the shopping list short and cheap.',
    standard:      'STANDARD TIER — Use common supermarket ingredients available at any grocery store: chicken breast, ground turkey, eggs, canned fish, fresh and frozen vegetables, seasonal fruits, brown rice, pasta, rolled oats, Greek yogurt, cottage cheese, milk, olive oil, cheddar cheese, whole wheat bread.',
    flexible:      'FLEXIBLE TIER — Any ingredients are acceptable including salmon, shrimp, steak, specialty produce, quinoa, almond butter, specialty cheeses, and premium items. Prioritise nutrition and variety.',
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

  const equipmentMap: Record<string, string> = {
    no_grill:       'No grill available — do not suggest any grilled items',
    no_oven:        'No oven available — do not suggest any baked or oven-roasted items',
    microwave_only: 'MICROWAVE ONLY — all meals must be microwavable or require no cooking whatsoever; no stovetop, no grill, no oven',
  }
  const activeEquipment = (prefs.equipment ?? []).map(e => equipmentMap[e]).filter(Boolean)
  if (activeEquipment.length > 0) {
    parts.push(`EQUIPMENT CONSTRAINTS:\n${activeEquipment.map(e => `- ${e}`).join('\n')}`)
  }

  if (prefs.dislikes?.trim()) {
    parts.push(`DISLIKED FOODS — never include these or dishes where they are a primary component: ${prefs.dislikes.trim()}`)
  }

  if (prefs.description?.trim()) {
    parts.push(`USER PREFERENCE OVERRIDE — the user has described their ideal meals as follows. Respect these preferences above all other constraints except hard dietary restrictions and calorie targets:\n${prefs.description.trim()}`)
  }

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : ''
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let calorieTarget: number, unit: string, days: number, dayNumber: number | undefined
  let prefs: MealPrefs | undefined, slotName: string | undefined, dayCtx: DayPlan | undefined
  try {
    const body = await req.json() as RequestBody
    calorieTarget = body.calorieTarget
    unit          = body.unit ?? 'imperial'
    days          = body.days ?? 7
    dayNumber     = body.dayNumber
    prefs         = body.prefs
    slotName      = body.slotName
    dayCtx        = body.dayContext
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!calorieTarget || calorieTarget < 500 || calorieTarget > 6000) {
    return new Response(JSON.stringify({ error: 'Invalid calorie target' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // @ts-ignore — process.env is available in Vercel Edge Runtime
  const apiKey: string | undefined = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const portionSystem = unit === 'metric'
    ? 'metric units (grams, ml) — e.g. "150g chicken breast", "200ml whole milk"'
    : 'imperial units (oz, cups, tbsp, tsp, or count-based) — e.g. "6 oz chicken breast", "1/2 cup rolled oats", "2 large eggs"'

  const prefsSection = buildPrefsSection(prefs)

  // ── SLOT REGENERATION MODE ──────────────────────────────────────────────────
  if (slotName && dayCtx) {
    const otherSlots = SLOTS.filter(s => s !== slotName)
    const otherCalTotal = otherSlots.reduce((sum, s) => {
      return sum + (dayCtx[s] ?? []).reduce((acc: number, it: MealItem) => acc + Number(it.calories), 0)
    }, 0)
    const slotCalTarget = Math.max(100, calorieTarget - otherCalTotal)

    const contextLines = otherSlots.map(s => {
      const items: MealItem[] = dayCtx[s] ?? []
      if (!items.length) return `${s.toUpperCase()}: (none)`
      return `${s.toUpperCase()}: ${items.map(i => `${i.name} (${i.portion})`).join(', ')}`
    }).join('\n')

    const slotPrompt = `You are a meal planning assistant. Regenerate ONLY the ${slotName.toUpperCase()} slot for one day of a 7-day meal plan.

CALORIE TARGET for ${slotName}: ${slotCalTarget} calories (±50 cal acceptable).
PORTIONS: Use ${portionSystem}.${prefsSection}

EXISTING MEALS ALREADY PLANNED FOR THIS DAY — do not duplicate their main protein or primary ingredient:
${contextLines}

RULES:
1. Specific real foods only — no vague category labels like "lean protein" or "complex carb".
2. Every portion needs an exact number.
3. Choose a clearly different main protein or primary ingredient from those already used today.
4. 1–4 food items in this slot. Calories must sum to approximately ${slotCalTarget} (±50 cal).
5. Standard supermarket ingredients only.

Respond with ONLY raw JSON — no markdown, no backticks, no text outside the JSON:
{"slot":[{"name":"string","portion":"string","calories":0}]}`

    try {
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          messages: [{ role: 'user', content: slotPrompt }],
        }),
        signal: AbortSignal.timeout(25000),
      })
      if (!anthropicRes.ok) {
        console.error('[meal-plan] slot regen Anthropic error:', anthropicRes.status)
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), { status: 502, headers: { 'Content-Type': 'application/json' } })
      }
      const data = await anthropicRes.json() as { content: Array<{ type: string; text: string }> }
      const raw = data.content?.[0]?.text ?? ''
      const s0 = raw.indexOf('{'), e0 = raw.lastIndexOf('}')
      if (s0 === -1 || e0 <= s0) throw new Error('No JSON in response')
      const parsed = JSON.parse(raw.slice(s0, e0 + 1)) as { slot: MealItem[] }
      return new Response(JSON.stringify({ slot: parsed.slot }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (e) {
      console.error('[meal-plan] slot regen error:', e)
      return new Response(JSON.stringify({ error: 'Failed to regenerate slot' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // ── FULL PLAN / SINGLE DAY REGEN MODE ───────────────────────────────────────

  const dayNumContext = days === 1 && dayNumber
    ? ` This is day ${dayNumber} of a 7-day plan — generate only this single day.`
    : ''

  const prompt = `You are a meal planning assistant. Create a ${days}-day meal plan.${dayNumContext}

CALORIE TARGET: ${calorieTarget} calories per day. Each day's totalCalories must be within ±50 calories of this target.
PORTIONS: Use ${portionSystem} with exact amounts.${prefsSection}

RULES:
1. Use SPECIFIC real foods only. Never write vague labels like "protein source", "lean protein", "complex carbohydrate", "healthy fat", or any category name. Write the actual food: "pan-fried chicken breast", "brown rice", "extra virgin olive oil", "unsalted almonds".
2. Every portion must have an exact number: "150g chicken breast", "1/2 cup rolled oats", "2 large eggs", "1 tbsp almond butter", "1 medium banana (118g)".
3. No two meals within the same day can be the same dish.
4. Vary meaningfully across all ${days} days — each day should feel clearly different from the others.
5. REPEAT CORE INGREDIENTS across multiple days to minimise the shopping list — one normal grocery trip should cover the entire week.
6. SIMPLE PREPARATIONS ONLY: pan-fried, scrambled, baked, roasted, microwaved, steamed, raw. No complex techniques.
7. All ingredients must be available at a standard supermarket.
8. Each day has: breakfast, lunch, dinner, and snacks. Each slot contains 1–4 food items.
9. Calorie counts per item must be accurate. All items within a day must sum to totalCalories within ±50 cal.

Respond with ONLY raw JSON — no markdown fences, no backticks, no text before or after. Use this exact schema:
{"days":[{"day":1,"breakfast":[{"name":"string","portion":"string","calories":0}],"lunch":[{"name":"string","portion":"string","calories":0}],"dinner":[{"name":"string","portion":"string","calories":0}],"snacks":[{"name":"string","portion":"string","calories":0}],"totalCalories":0}]}`

  let parsedDays: DayPlan[]
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('[meal-plan] Anthropic error:', anthropicRes.status, errText)
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicRes.json() as { content: Array<{ type: string; text: string }> }
    const raw = data.content?.[0]?.text ?? ''
    const s0 = raw.indexOf('{'), e0 = raw.lastIndexOf('}')
    if (s0 === -1 || e0 <= s0) throw new Error('No JSON in response')
    const parsed = JSON.parse(raw.slice(s0, e0 + 1)) as { days: DayPlan[] }
    parsedDays = parsed.days
  } catch (e) {
    console.error('[meal-plan] Parse or network error:', e)
    return new Response(JSON.stringify({ error: 'Failed to generate meal plan' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ days: parsedDays, calorieTarget, generatedAt: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
