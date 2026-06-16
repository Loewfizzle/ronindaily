export const BASE_PCT: Record<string, number> = {
  breakfast: 25,
  lunch:     33,
  dinner:    33,
  snacks:    9,
}

export function calcMealAllocations(meals: string[], target: number): Record<string, number> {
  const totalPct = meals.reduce((s, m) => s + (BASE_PCT[m] ?? 0), 0)
  const raws     = meals.map(m => (BASE_PCT[m] / totalPct) * target)
  const floors   = raws.map(Math.floor)
  let rem        = target - floors.reduce((a, b) => a + b, 0)
  const fracs    = raws.map((r, i) => ({ i, frac: r - floors[i] }))
  fracs.sort((a, b) => b.frac - a.frac)
  fracs.slice(0, rem).forEach(f => floors[f.i]++)
  const result: Record<string, number> = {}
  meals.forEach((m, i) => { result[m] = floors[i] })
  return result
}
