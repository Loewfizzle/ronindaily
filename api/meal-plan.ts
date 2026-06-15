export const config = { runtime: 'edge', maxDuration: 30 }

declare const process: { env: Record<string, string | undefined> }

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
  budget?: 'raw_materials' | 'budget' | 'standard' | 'flexible' | 'fast_food'
  restrictions?: string[]
  equipment?: string[]
  dislikes?: string
  description?: string
  activeMeals?: string[]
  mealAllocations?: Record<string, number>
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
    fast_food:     'FAST FOOD TIER — CRITICAL: All meals must come entirely from fast food chains and convenience sources. No cooking, no kitchen, no grocery store ingredients whatsoever. Every single food item must be a real, orderable menu item from a specific chain: McDonald\'s, Chipotle, Subway, Taco Bell, Wawa, Chick-fil-A, Burger King, Panera, 7-Eleven, or similar. For snacks use protein bars (Quest, RXBAR, Kind), energy drinks, or convenience store packaged items. Name the chain in the meal name (e.g. "Chipotle chicken bowl", "McDonald\'s Egg McMuffin", "Quest chocolate chip protein bar"). Still hit the daily calorie target. Still split across the active meal slots. Repeat the same fast food orders across multiple days exactly as the repetition rules require.',
  }
  if (prefs.budget && budgetMap[prefs.budget as keyof typeof budgetMap]) parts.push(budgetMap[prefs.budget as keyof typeof budgetMap])

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
    const allMeals = ['breakfast', 'lunch', 'dinner', 'snacks']
    const skipped = allMeals.filter(m => !prefs.activeMeals!.includes(m))
    const activeList = prefs.activeMeals.map(m => {
      const cal = prefs.mealAllocations?.[m]
      const name = m.charAt(0).toUpperCase() + m.slice(1)
      return cal ? `${name} (${cal} cal)` : name
    }).join(', ')
    const skippedList = skipped.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(' and ')
    parts.push(`ACTIVE MEALS ONLY — CRITICAL: Only generate food items for: ${activeList}. Do NOT generate ${skippedList} — output empty arrays [] for skipped meals. The day JSON must include all four slot keys but skipped meals get empty arrays []. This overrides rule 5.`)
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

    const slotPrompt = `You are a meal prep assistant. Regenerate ONLY the ${slotName.toUpperCase()} slot for one day of a 7-day meal prep plan.

CALORIE TARGET for ${slotName}: ${slotCalTarget} calories (±50 cal acceptable).
PORTIONS: Use ${portionSystem}.${prefsSection}

EXISTING MEALS ALREADY PLANNED FOR THIS DAY:
${contextLines}

RULES:
1. Specific real foods only — no vague labels like "lean protein" or "complex carb". Write: "chicken breast", "brown rice", "broccoli".
2. Every portion has an exact number.
3. Use simple meal prep ingredients (standard proteins, carbs, vegetables) — do not introduce exotic or specialty ingredients.
4. Choose a different main component from those already used today, but stay within the same family of simple meal prep staples.
5. 1–4 food items in this slot. Calories must sum to approximately ${slotCalTarget} (±50 cal).

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
    ? ` Regenerate only Day ${dayNumber} of an existing 7-day plan. Keep the same core proteins, carbs, and vegetables as the rest of the week — do not introduce new ingredients.`
    : ''

  const prompt = `You are a meal prep assistant. Generate a strict 7-day meal plan built around REPETITION, not variety. The user buys ingredients once and eats the same meals multiple times. Repetition is intentional and correct.${dayNumContext}

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

CALORIE TARGET: ${calorieTarget} calories per day. Each day's totalCalories must be within ±50 calories of this target.
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
    if (!Array.isArray(parsedDays) || parsedDays.length === 0) {
      throw new Error('Invalid response structure')
    }
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
