import type { UserProfile, PlanResult, Meal, Sex, MovementItem } from '../types'
import { computeCalorieTarget, addDays, daysBetween } from './calorieCore'
import type { CalorieProfile } from './calorieCore'

export const DEFAULT_ACTIVITIES = ['walk', 'resistance']

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
  resistance: { type: 'time',    rate: 8,   verb: '',       timeLabel: 'gym / weights'      },
  bodyweight: { type: 'time',    rate: 6,   verb: '',       timeLabel: 'no equipment'       },
  swim:       { type: 'time',    rate: 10,  verb: '',       timeLabel: 'swimming'           },
  boxing:     { type: 'time',    rate: 10,  verb: '',       timeLabel: 'boxing / HIIT'      },
  yoga:       { type: 'time',    rate: 4,   verb: '',       timeLabel: 'yoga'               },
}

/** Returns the calorie rate and type for an activity ID. */
export function getActivityInfo(id: string): { type: 'distance' | 'time'; rate: number } | null {
  const cfg = ACTIVITY_CONFIGS[id]
  if (!cfg) return null
  return { type: cfg.type, rate: cfg.rate }
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

function ftInToCm(ft: string, inches: string = ''): number {
  return (parseFloat(ft) * 12 + parseFloat(inches || '0')) * 2.54
}

/**
 * Calculates a complete daily mission plan from a user profile and start date.
 *
 * Methodology:
 *  1. Normalise body stats to metric and compute BMR via Mifflin-St Jeor.
 *  2. Multiply BMR by ACTIVITY_FACTOR (1.2) to get sedentary TDEE.
 *  3. Derive the required daily deficit from (pounds remaining × CAL_PER_LB) ÷ days left.
 *     Before the first check-in, days left = full timeline; after check-in, days left = remaining.
 *  4. If the required deficit exceeds (TDEE − calorie floor), the plan is an extreme mission:
 *     cap the deficit at the safe maximum (user accepted the challenge on the prep screen).
 *  5. Split the capped deficit FOOD_DEFICIT_SPLIT / EXERCISE_DEFICIT_SPLIT (70 / 30).
 *  6. Build meal breakdown and movement prescription from the resulting targets.
 *     Movement is split evenly across the user's selected activities.
 *
 * All calorie constants live in calorieCore.ts — this function delegates the
 * BMR/TDEE/deficit math to computeCalorieTarget() to stay in sync with the crons.
 */
export function calculatePlan(profile: UserProfile, startDate: Date = new Date()): PlanResult {
  const sex         = profile.sex as Sex
  const unit        = profile.unit
  const targetWeeks = parseInt(profile.targetWeeks, 10)

  // ── Normalise weights (client naming quirk: *Lbs fields hold kg when metric) ──
  let startWeightLbs: number, goalWeightLbs: number, heightCm: number

  if (unit === 'imperial') {
    startWeightLbs = parseFloat(profile.weightLbs)
    goalWeightLbs  = parseFloat(profile.goalWeightLbs)
    heightCm       = ftInToCm(profile.heightFt, profile.heightIn)
  } else {
    const startKg  = parseFloat(profile.weightLbs)   // stores kg despite name
    const goalKg   = parseFloat(profile.goalWeightLbs)
    startWeightLbs = startKg * 2.20462
    goalWeightLbs  = goalKg  * 2.20462
    heightCm       = parseFloat(profile.heightCm)
  }

  // Resolve currentWeight in native unit (null = no check-in yet).
  let currentWeightNative: number | null = null
  if (profile.currentWeightLbs != null) {
    const raw = parseFloat(profile.currentWeightLbs)
    if (!isNaN(raw) && raw > 0) currentWeightNative = raw
  }

  // ── Delegate calorie math to the single shared implementation ────────────────
  const calProfile: CalorieProfile = {
    sex,
    age:           parseInt(profile.age, 10),
    heightCm,
    startWeight:   parseFloat(profile.weightLbs),      // native unit (quirk handled inside)
    goalWeight:    parseFloat(profile.goalWeightLbs),  // native unit
    currentWeight: currentWeightNative,
    targetWeeks,
    unit,
    startDate:     startDate.toISOString().slice(0, 10),
  }

  const cal = computeCalorieTarget(calProfile)

  // ── Date display values (used in return shape; not part of calorie math) ──────
  const today             = new Date()
  const originalTotalDays = targetWeeks * 7
  const targetDate        = addDays(startDate, originalTotalDays)
  const dayNumber         = Math.max(1, daysBetween(startDate, today) + 1)
  const daysLeft          = Math.max(0, daysBetween(today, targetDate))
  const weekNumber        = Math.ceil(dayNumber / 7)

  // ── Meal breakdown (fixed proportions of calorieTarget) ─────────────────────
  const breakfast = Math.round(cal.calorieTarget * 0.25)
  const lunch     = Math.round(cal.calorieTarget * 0.33)
  const dinner    = Math.round(cal.calorieTarget * 0.33)
  const snacks    = cal.calorieTarget - breakfast - lunch - dinner
  const meals: Meal[] = [
    { name: 'Breakfast', cal: breakfast },
    { name: 'Lunch',     cal: lunch     },
    { name: 'Dinner',    cal: dinner    },
    { name: 'Snacks',    cal: snacks    },
  ]

  // ── Movement prescription — split burn target across selected activities ─────
  const selectedActivities = (profile.activities && profile.activities.length > 0)
    ? profile.activities
    : DEFAULT_ACTIVITIES

  const movement: MovementItem[] = []
  if (cal.exerciseBurn >= 50) {
    const perActivity = Math.round(cal.exerciseBurn / selectedActivities.length)
    for (const id of selectedActivities) {
      movement.push(formatMovementItem(id, perActivity))
    }
  } else {
    // Very low deficit — show minimum prescription from first selected activity.
    movement.push(formatMovementItem(selectedActivities[0], Math.max(50, cal.exerciseBurn)))
  }

  const pacePerWeek = daysLeft > 0
    ? parseFloat(((cal.poundsToLose / daysLeft) * 7).toFixed(1))
    : 0

  return {
    unit,
    extremeMission: cal.extremeMission,

    startWeight:   startWeightLbs,
    currentWeight: cal.currentWeightLbs,
    goalWeight:    goalWeightLbs,
    poundsToLose:  cal.poundsToLose,

    date: today,
    startDate: new Date(startDate),
    targetDate,
    totalDays: originalTotalDays,
    dayNumber,
    daysLeft,
    weekNumber,

    maintenance:   cal.tdee,
    dailyDeficit:  cal.dailyDeficit,
    calorieTarget: cal.calorieTarget,
    exerciseBurn:  cal.exerciseBurn,
    meals,

    movement,
    movementCal: cal.exerciseBurn,

    pacePerWeek,
  }
}
