// Pure calorie math — no framework deps, no DOM, no Node-only APIs.
// Single source of truth for BMR, TDEE, deficit, and calorie-floor logic.
// Imported by:  src/utils/calculate.ts (Vite client)
//               api/rotate-meal-plan.ts (Node.js serverless)
//               api/send-notifications.ts (Node.js serverless)

export const CAL_PER_LB             = 3500
export const ACTIVITY_FACTOR        = 1.2
export const FOOD_DEFICIT_SPLIT     = 0.70
export const EXERCISE_DEFICIT_SPLIT = 0.30
export const MIN_CAL_MALE           = 1500
export const MIN_CAL_FEMALE         = 1200

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Normalised inputs accepted by computeCalorieTarget.
 *
 * Naming quirk carried forward from the client: for metric users the DB stores
 * start_weight / goal_weight in kg despite the column names. Pass the raw DB
 * value and set unit = 'metric' — this function handles the conversion.
 */
export interface CalorieProfile {
  sex: 'M' | 'F'
  age: number
  heightCm: number      // always cm (DB column height_cm)
  startWeight: number   // native unit: lbs if imperial, kg if metric
  goalWeight: number    // native unit
  /** Native-unit weight from the latest weekly check-in; null = no check-in yet. */
  currentWeight: number | null
  targetWeeks: number
  unit: 'imperial' | 'metric'
  startDate: string     // YYYY-MM-DD
}

export interface CalorieResult {
  calorieTarget: number
  tdee: number
  dailyDeficit: number
  foodDeficit: number
  exerciseBurn: number
  extremeMission: boolean
  poundsToLose: number
  currentWeightKg: number
  currentWeightLbs: number
}

// ── Date helpers (exported for reuse in calculate.ts) ─────────────────────────

export function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

export function daysBetween(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((bUtc - aUtc) / 86_400_000)
}

// ── BMR ───────────────────────────────────────────────────────────────────────

function mifflinBmr(weightKg: number, heightCm: number, age: number, sex: 'M' | 'F'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'M' ? base + 5 : base - 161
}

// ── Core computation ──────────────────────────────────────────────────────────

export function computeCalorieTarget(p: CalorieProfile): CalorieResult {
  // Normalise weights to both kg and lbs.
  let startWeightKg: number, startWeightLbs: number
  let goalWeightKg: number,  goalWeightLbs: number
  let currentWeightKg: number, currentWeightLbs: number

  if (p.unit === 'imperial') {
    startWeightLbs = p.startWeight
    startWeightKg  = p.startWeight / 2.20462
    goalWeightLbs  = p.goalWeight
    goalWeightKg   = p.goalWeight  / 2.20462
    if (p.currentWeight !== null) {
      currentWeightLbs = p.currentWeight
      currentWeightKg  = p.currentWeight / 2.20462
    } else {
      currentWeightLbs = startWeightLbs
      currentWeightKg  = startWeightKg
    }
  } else {
    // metric: stored values are already in kg
    startWeightKg  = p.startWeight
    startWeightLbs = p.startWeight * 2.20462
    goalWeightKg   = p.goalWeight
    goalWeightLbs  = p.goalWeight  * 2.20462
    if (p.currentWeight !== null) {
      currentWeightKg  = p.currentWeight
      currentWeightLbs = p.currentWeight * 2.20462
    } else {
      currentWeightKg  = startWeightKg
      currentWeightLbs = startWeightLbs
    }
  }

  // ── Timeline ─────────────────────────────────────────────────────────────
  const originalTotalDays = p.targetWeeks * 7
  const startDate         = new Date(p.startDate)
  const targetDate        = addDays(startDate, originalTotalDays)
  const today             = new Date()
  const daysLeft          = Math.max(0, daysBetween(today, targetDate))

  const hasCheckedIn = p.currentWeight !== null
  // Before first check-in: spread deficit over the full timeline.
  // After first check-in: re-compute against remaining days so the plan
  // adapts to the user's actual current weight.
  const deficitDays = hasCheckedIn ? Math.max(1, daysLeft) : originalTotalDays

  // ── Deficit ──────────────────────────────────────────────────────────────
  const poundsToLose         = Math.max(0, currentWeightLbs - goalWeightLbs)
  const totalCalDeficit      = poundsToLose * CAL_PER_LB
  const requiredDailyDeficit = deficitDays > 0 ? totalCalDeficit / deficitDays : 0

  // ── BMR → TDEE ──────────────────────────────────────────────────────────
  const bmr  = mifflinBmr(currentWeightKg, p.heightCm, p.age, p.sex)
  const tdee = Math.round(bmr * ACTIVITY_FACTOR)

  // ── Floors and extreme-mission cap ───────────────────────────────────────
  const minCal         = p.sex === 'M' ? MIN_CAL_MALE : MIN_CAL_FEMALE
  const maxSafeDeficit = tdee - minCal
  const extremeMission = requiredDailyDeficit > maxSafeDeficit

  const dailyDeficit = extremeMission
    ? Math.max(0, Math.round(maxSafeDeficit))
    : Math.round(requiredDailyDeficit)

  const foodDeficit   = Math.round(dailyDeficit * FOOD_DEFICIT_SPLIT)
  const exerciseBurn  = Math.round(dailyDeficit * EXERCISE_DEFICIT_SPLIT)
  const calorieTarget = Math.max(minCal, tdee - foodDeficit)

  // Suppress unused-variable warnings for the goal kg values (used only for
  // normalisation completeness; the deficit math uses lbs throughout).
  void goalWeightKg

  return {
    calorieTarget,
    tdee,
    dailyDeficit,
    foodDeficit,
    exerciseBurn,
    extremeMission,
    poundsToLose,
    currentWeightKg,
    currentWeightLbs,
  }
}
