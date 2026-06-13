import type { UserProfile, PlanResult, Meal, Sex, MovementItem } from '../types'

const CAL_PER_LB = 3500
const ACTIVITY_FACTOR = 1.2
const FOOD_DEFICIT_SPLIT = 0.70
const EXERCISE_DEFICIT_SPLIT = 0.30
const MIN_CAL_MALE = 1500
const MIN_CAL_FEMALE = 1200

const DEFAULT_ACTIVITIES = ['walk', 'resistance']

interface ActivityConfig {
  type: 'distance' | 'time'
  rate: number        // cal/mile (distance) or cal/min (time)
  verb: string        // "Walk", "Bike", "Run" — empty for time-based
  timeLabel: string   // "resistance training", "bodyweight" — empty for distance-based
}

const ACTIVITY_CONFIGS: Record<string, ActivityConfig> = {
  walk:       { type: 'distance', rate: 100, verb: 'Walk',  timeLabel: ''                  },
  bike:       { type: 'distance', rate: 50,  verb: 'Bike',  timeLabel: ''                  },
  run:        { type: 'distance', rate: 120, verb: 'Run',   timeLabel: ''                  },
  resistance: { type: 'time',    rate: 8,   verb: '',       timeLabel: 'resistance training' },
  bodyweight: { type: 'time',    rate: 6,   verb: '',       timeLabel: 'bodyweight'         },
  swim:       { type: 'time',    rate: 10,  verb: '',       timeLabel: 'swimming'           },
  boxing:     { type: 'time',    rate: 10,  verb: '',       timeLabel: 'boxing'             },
  yoga:       { type: 'time',    rate: 4,   verb: '',       timeLabel: 'yoga'               },
}

/**
 * Formats a single activity prescription into a human-readable MovementItem.
 * Exported for use in Dashboard's dismiss/restore recalculation.
 */
export function formatMovementItem(id: string, cal: number): MovementItem {
  const cfg = ACTIVITY_CONFIGS[id]
  if (!cfg) {
    const mins = Math.max(5, Math.round(cal / 6 / 5) * 5)
    return { id, text: `${mins} min exercise.`, cal }
  }
  if (cfg.type === 'distance') {
    const dist = Math.round(cal / cfg.rate * 10) / 10
    return { id, text: `${cfg.verb} ${dist} miles.`, cal }
  }
  const mins = Math.max(5, Math.round(cal / cfg.rate / 5) * 5)
  return { id, text: `${mins} min ${cfg.timeLabel}.`, cal }
}

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
  const msPerDay = 86400000
  const aUtc = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const bUtc = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((bUtc - aUtc) / msPerDay)
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
 *     Movement is split evenly across the user's selected activities.
 */
export function calculatePlan(profile: UserProfile, startDate: Date = new Date()): PlanResult {
  const sex         = profile.sex
  const age         = parseInt(profile.age, 10)
  const unit        = profile.unit
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
  let currentWeightLbs: number, currentWeightKg: number

  if (profile.currentWeightLbs != null) {
    const raw = parseFloat(profile.currentWeightLbs)
    if (isNaN(raw) || raw <= 0) {
      currentWeightLbs = startWeightLbs
      currentWeightKg  = startWeightKg
    } else if (unit === 'imperial') {
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

  // Timeline
  const today             = new Date()
  const originalTotalDays = targetWeeks * 7
  const targetDate        = addDays(startDate, originalTotalDays)
  const dayNumber         = Math.max(1, daysBetween(startDate, today) + 1)
  const daysLeft          = Math.max(0, daysBetween(today, targetDate))
  const weekNumber        = Math.ceil(dayNumber / 7)

  // Deficit: use remaining days after first check-in so the plan adapts to real weight.
  const poundsToLose         = Math.max(0, currentWeightLbs - goalWeightLbs)
  const totalCalDeficit      = poundsToLose * CAL_PER_LB
  const hasCheckedIn         = profile.currentWeightLbs != null
  const deficitDays          = hasCheckedIn ? Math.max(1, daysLeft) : originalTotalDays
  const requiredDailyDeficit = deficitDays > 0 ? totalCalDeficit / deficitDays : 0

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

  // Movement prescription — split burn target evenly across selected activities.
  // Falls back to DEFAULT_ACTIVITIES for users who pre-date this feature.
  const selectedActivities = (profile.activities && profile.activities.length > 0)
    ? profile.activities
    : DEFAULT_ACTIVITIES

  const movement: MovementItem[] = []
  if (exerciseBurn >= 50) {
    const perActivity = Math.round(exerciseBurn / selectedActivities.length)
    for (const id of selectedActivities) {
      movement.push(formatMovementItem(id, perActivity))
    }
  } else {
    // Very low deficit — show minimum prescription from first selected activity
    movement.push(formatMovementItem(selectedActivities[0], Math.max(50, exerciseBurn)))
  }

  const pacePerWeek = daysLeft > 0
    ? parseFloat(((poundsToLose / daysLeft) * 7).toFixed(1))
    : 0

  return {
    unit,
    unsustainable,
    realisticEndDate,

    startWeight:   startWeightLbs,
    currentWeight: currentWeightLbs,
    goalWeight:    goalWeightLbs,
    poundsToLose,

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

    pacePerWeek,
  }
}
