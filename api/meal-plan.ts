export const config = { runtime: 'edge' }

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let calorieTarget: number, unit: string, days: number
  try {
    const body = await req.json() as { calorieTarget: number; unit: string; days?: number }
    calorieTarget = body.calorieTarget
    unit = body.unit ?? 'imperial'
    days = body.days ?? 7
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
    ? 'metric units (grams, ml) — e.g. "150g chicken breast", "200ml 2% milk"'
    : 'imperial units (oz, cups, tbsp, tsp, or count) — e.g. "6 oz chicken breast", "1/2 cup rolled oats", "2 large eggs"'

  const prompt = `You are a meal planning assistant. Create a ${days}-day meal plan.

CALORIE TARGET: ${calorieTarget} calories per day. Each day's totalCalories must be within ±50 calories of this target.
PORTIONS: Use ${portionSystem}.

RULES:
1. Use SPECIFIC real foods only. Never write vague labels like "protein source", "lean protein", "complex carbohydrate", "healthy fat", or any category name. Write the actual food: "grilled chicken breast", "brown rice", "extra virgin olive oil", "unsalted almonds".
2. Every portion must be exact with a number: "150g chicken breast", "1/2 cup rolled oats", "2 large eggs", "1 tbsp almond butter", "1 medium banana (118g)".
3. No two meals within the same day can be the same dish.
4. Vary meaningfully across all ${days} days — each day should feel clearly different from the others.
5. Each day has: breakfast, lunch, dinner, and snacks. Each slot has 1–4 food items.
6. Calorie counts per item must be accurate. Item calories within each meal slot should sum close to that slot's contribution. All four slot totals for a day must sum to the day's totalCalories within ±50 cal.

Respond with ONLY raw JSON — no markdown fences, no backticks, no explanatory text before or after. Use this exact schema:
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
    // Strip accidental markdown fences if Claude adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
    const parsed = JSON.parse(cleaned) as { days: DayPlan[] }
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
