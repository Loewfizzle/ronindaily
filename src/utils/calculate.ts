import type { UserProfile, PlanResult, Meal, Sex } from '../types'

// Calories in one pound of body fat — the universal deficit conversion constant
const CAL_PER_LB = 3500

// Sedentary TDEE multiplier (BMR × 1.2 for desk-job baseline with no exercise credit)
const ACTIVITY_FACTOR = 1.2

// Fraction of the daily deficit achieved through eating less
const FOOD_DEFICIT_SPLIT = 0.70

// Fraction of the daily deficit achieved through exercise
const EXERCISE_DEFICIT_SPLIT = 0.30

// Calories burned per mile of walking at a moderate pace (~3 mph)
const CAL_PER_MILE = 100

// Calories burned per minute of resistance training (compound lifts, moderate intensity)
const CAL_PER_MIN_RESISTANCE = 8

// Minimum safe daily calorie intake for males — below this risks muscle loss and metabolic adaptation
const MIN_CAL_MALE = 1500

// Minimum safe daily calorie intake for females
const MIN_CAL_FEMALE = 1200

function lbsToKg(lbs: number): number { return lbs / 2.20462 }

function ftInToCm(ft: string, inches: string = ''): number {
  return (parseFloat(ft) * 12 + parseFloat(inches || '0')) * 2.54
}

function mifflinBmr(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'M' ? base + 5 : base - 161
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/**
 * Calculates a complete daily mission plan from a user profile and start date.
 *
 * Methodology:
 *  1. Normalise body stats to metric and compute BMR via Mifflin-St Jeor.
 *  2. Multiply BMR by ACTIVITY_FACTOR (1.2) to get sedentary TDEE.
 *  3. Derive the required daily deficit from (pounds remaining × CAL_PER_LB) ÷ days left.
 *     Before the first check-in, days left = full timeline; after check-in, days left = remaining.
 *  4. If the required deficit exceeds (TDEE − calorie floor), the plan is unsustainable:
 *     cap the deficit at the safe maximum and project a realistic end date at that rate.
 *  5. Split the capped deficit FOOD_DEFICIT_SPLIT / EXERCISE_DEFICIT_SPLIT (70 / 30).
 *  6. Build meal breakdown and movement prescription from the resulting targets.
 *
 * @param profile    - User profile from localStorage / onboarding form.
 * @param startDate  - The local date the user committed to their goal.
 */
export function calculatePlan(profile: UserProfile, startDate: Date = new Date()): PlanResult {
  const sex        = profile.sex
  const age        = parseInt(profile.age, 10)
  const unit       = profile.unit
  const targetWeeks = parseInt(profile.targetWeeks, 10)

  // Normalise original (committed) weights.
  // Field naming quirk: weightLbs/goalWeightLbs hold kg values when unit === 'metric'.
  let startWeightLbs: number, goalWeightLbs: number, startWeightKg: number, heightCm: number

  if (unit === 'imperial') {
    startWeightLbs = parseFloat(profile.weightLbs)
    goalWeightLbs  = parseFloat(profile.goalWeightLbs)
    startWeightKg  = lbsToKg(startWeightLbs)
    heightCm       = ftInToCm(profile.heightFt, profile.heightIn)
  } else {
    startWeightKg  = parseFloat(profile.weightLbs)
    const goalKg   = parseFloat(profile.goalWeightLbs)
    startWeightLbs = startWeightKg * 2.20462
    goalWeightLbs  = goalKg * 2.20462
    heightCm       = parseFloat(profile.heightCm)
  }

  // Current weight — updated by weekly check-ins, stored under the same unit as weightLbs.
  // Falls back to original start weight when no check-in has occurred.
  let currentWeightLbs: number, currentWeightKg: number

  if (profile.currentWeightLbs != null) {
    const raw = parseFloat(profile.currentWeightLbs)
    if (unit === 'imperial') {
      currentWeightLbs = raw
      currentWeightKg  = lbsToKg(raw)
    } else {
      currentWeightKg  = raw
      currentWeightLbs = raw * 2.20462
    }
  } else {
    currentWeightLbs = startWeightLbs
    currentWeightKg  = startWeightKg
  }

  // Timeline — computed before deficit so daysLeft is available for post-check-in recalc.
  const today             = new Date()
  const originalTotalDays = targetWeeks * 7
  const targetDate        = addDays(startDate, originalTotalDays)
  const dayNumber         = Math.max(1, daysBetween(startDate, today) + 1)
  const daysLeft          = Math.max(0, daysBetween(today, targetDate))
  const weekNumber        = Math.ceil(dayNumber / 7)

  // Deficit: use remaining days after first check-in so the plan adapts to real weight.
  // Before any check-in, use the original full-timeline target to keep numbers stable.
  const poundsToLose         = Math.max(0, currentWeightLbs - goalWeightLbs)
  const totalCalDeficit      = poundsToLose * CAL_PER_LB
  const hasCheckedIn         = profile.currentWeightLbs != null
  const deficitDays          = hasCheckedIn ? Math.max(1, daysLeft) : originalTotalDays
  const requiredDailyDeficit = deficitDays > 0 ? totalCalDeficit / deficitDays : 0

  // BMR → TDEE uses current weight so the math stays accurate as the user loses weight.
  const bmr  = mifflinBmr(currentWeightKg, heightCm, age, sex)
  const tdee = Math.round(bmr * ACTIVITY_FACTOR)

  const minCal         = sex === 'M' ? MIN_CAL_MALE : MIN_CAL_FEMALE
  const maxSafeDeficit = tdee - minCal

  let dailyDeficit: number, unsustainable: boolean, realisticEndDate: Date | null

  if (requiredDailyDeficit > maxSafeDeficit) {
    unsustainable = true
    dailyDeficit  = Math.max(0, Math.round(maxSafeDeficit))
    const realisticDays = dailyDeficit > 0 ? Math.ceil(totalCalDeficit / dailyDeficit) : 9999
    realisticEndDate = addDays(today, realisticDays)
  } else {
    unsustainable    = false
    dailyDeficit     = Math.round(requiredDailyDeficit)
    realisticEndDate = null
  }

  // Food / exercise split
  const foodDeficit   = Math.round(dailyDeficit * FOOD_DEFICIT_SPLIT)
  const exerciseBurn  = Math.round(dailyDeficit * EXERCISE_DEFICIT_SPLIT)
  const calorieTarget = Math.max(minCal, tdee - foodDeficit)

  // Meal breakdown (fixed proportions)
  const breakfast = Math.round(calorieTarget * 0.25)
  const lunch     = Math.round(calorieTarget * 0.33)
  const dinner    = Math.round(calorieTarget * 0.33)
  const snacks    = calorieTarget - breakfast - lunch - dinner
  const meals: Meal[] = [
    { name: 'Breakfast', cal: breakfast },
    { name: 'Lunch',     cal: lunch     },
    { name: 'Dinner',    cal: dinner    },
    { name: 'Snacks',    cal: snacks    },
  ]

  // Movement prescription
  const movement: string[] = []
  if (exerciseBurn >= 50) {
    const walkCal    = Math.round(exerciseBurn * 0.60)
    const resistCal  = exerciseBurn - walkCal
    const walkMiles  = parseFloat((walkCal / CAL_PER_MILE).toFixed(1))
    const resistMins = Math.max(5, Math.round(resistCal / CAL_PER_MIN_RESISTANCE / 5) * 5)
    if (walkMiles > 0) movement.push(`Walk ${walkMiles} miles.`)
    if (resistMins > 0) movement.push(`${resistMins} min resistance training.`)
  } else {
    movement.push('30 min walking.')
  }

  // Pace needed to hit goal from current weight over remaining time
  const pacePerWeek = daysLeft > 0
    ? parseFloat(((poundsToLose / daysLeft) * 7).toFixed(1))
    : 0

  return {
    unit,
    unsustainable,
    realisticEndDate,

    startWeight:   Math.round(startWeightLbs),
    currentWeight: Math.round(currentWeightLbs),
    goalWeight:    Math.round(goalWeightLbs),
    poundsToLose:  Math.round(poundsToLose),

    date: today,
    startDate: new Date(startDate),
    targetDate,
    totalDays: originalTotalDays,
    dayNumber,
    daysLeft,
    weekNumber,

    maintenance:   tdee,
    dailyDeficit,
    calorieTarget,
    exerciseBurn,
    meals,

    movement,
    movementCal: exerciseBurn,

    streak: 1,
    pacePerWeek,
  }
}
