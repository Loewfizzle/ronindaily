export const config = { runtime: 'edge', maxDuration: 15 }

declare const process: { env: Record<string, string | undefined> }

import { checkAndIncrement, rateLimitExceededResponse } from './_rateLimit'

interface RequestBody {
  description: string
  userId: string
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  let description: string, userId: string
  try {
    const body = await req.json() as RequestBody
    description = body.description?.trim()
    userId      = body.userId
    if (!description || !userId) throw new Error('Missing fields')
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const { allowed } = await checkAndIncrement(userId, 'cheat_estimate')
  if (!allowed) return rateLimitExceededResponse()

  const apiKey: string | undefined = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  const prompt = `Estimate the total calorie count for the following food description. Return ONLY a JSON object with one field: {"calories": <integer>}. No explanation, no markdown, just the JSON.

Food: ${description}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 64,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const raw  = data.content?.[0]?.text ?? ''
    const s0 = raw.indexOf('{'), e0 = raw.lastIndexOf('}')
    if (s0 === -1 || e0 <= s0) throw new Error('No JSON in response')
    const parsed = JSON.parse(raw.slice(s0, e0 + 1)) as { calories: number }
    const calories = Math.round(Number(parsed.calories))
    if (!calories || calories < 0) throw new Error('Invalid calorie value')

    return new Response(JSON.stringify({ calories }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to estimate calories' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }
}
