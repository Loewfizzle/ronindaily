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

interface MealPlanData {
  days: DayPlan[]
  calorieTarget: number
  generatedAt: string
}

interface GroceryItem {
  name: string
  quantity: string
}

interface RequestBody {
  mealPlan: MealPlanData
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let mealPlan: MealPlanData
  try {
    const body = await req.json() as RequestBody
    if (!body.mealPlan?.days?.length) throw new Error('No meal plan')
    mealPlan = body.mealPlan
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
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

  const allItems: string[] = []
  for (const day of mealPlan.days) {
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snacks'] as const) {
      for (const item of day[slot]) {
        allItems.push(`${item.name} — ${item.portion}`)
      }
    }
  }

  const prompt = `You are a grocery shopping assistant. Given every meal across a 7-day plan, create a consolidated weekly grocery list.

ALL MEALS (7 days):
${allItems.join('\n')}

RULES:
1. Extract the raw ingredient from each entry. Strip cooking methods and descriptors: "pan-fried chicken breast" → "chicken breast", "scrambled eggs" → "eggs", "roasted sweet potato" → "sweet potatoes", "2% cottage cheese" → "cottage cheese".
2. Combine identical or very similar ingredients across all meals. Sum their quantities across the full week.
3. Express quantities as practical, realistic shopping amounts:
   - Produce: weight or count (e.g. "2 lbs baby spinach", "6 bananas", "2 heads broccoli", "1 bag mixed greens")
   - Proteins: weight or count (e.g. "2 lbs chicken breast", "2 dozen eggs", "3 cans tuna (5 oz each)", "1.5 lbs ground beef")
   - Dairy: standard container size (e.g. "32 oz Greek yogurt", "half gallon whole milk", "8 oz shredded cheddar")
   - Grains: weight (e.g. "2 lbs rolled oats", "5 lbs brown rice", "1 lb whole wheat pasta")
   - Canned: count with size (e.g. "4 cans black beans (15 oz)", "2 cans diced tomatoes (14.5 oz)")
4. Assign each ingredient to exactly one section. If a section has no items, omit it entirely.
5. Only include condiments and spices that actually appear by name in the meal list above. Do not add pantry assumptions.
6. Sort items alphabetically within each section.

SECTIONS (use exactly these names in this order): Produce, Proteins, Dairy & Eggs, Grains & Bread, Canned & Dry Goods, Frozen, Condiments & Spices, Other

Respond with ONLY raw JSON — no markdown fences, no text before or after. Schema:
{"sections":[{"section":"Produce","items":[{"name":"string","quantity":"string"}]}]}`

  let sections: Array<{ section: string; items: GroceryItem[] }>
  try {
    // 25-second timeout leaves headroom before the 30s maxDuration limit
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('[grocery-list] Anthropic error:', anthropicRes.status, errText)
      return new Response(JSON.stringify({ error: `AI service error (${anthropicRes.status})` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await anthropicRes.json() as { content: Array<{ type: string; text: string }> }
    const raw = data.content?.[0]?.text ?? ''
    if (!raw) {
      console.error('[grocery-list] Empty text in Anthropic response:', JSON.stringify(data))
      return new Response(JSON.stringify({ error: 'Empty response from AI' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { sections: Array<{ section: string; items: GroceryItem[] }> }
    if (!Array.isArray(parsed.sections)) {
      console.error('[grocery-list] Unexpected response shape:', cleaned.slice(0, 200))
      return new Response(JSON.stringify({ error: 'Unexpected AI response format' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    sections = parsed.sections
  } catch (e) {
    console.error('[grocery-list] Parse or network error:', e)
    return new Response(JSON.stringify({ error: 'Failed to generate grocery list' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ sections, mealPlanTimestamp: mealPlan.generatedAt }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}
