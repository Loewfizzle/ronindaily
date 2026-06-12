const CAL_PER_LB = 3500
const ACTIVITY_FACTOR = 1.2
const FOOD_SPLIT = 0.70
const EXERCISE_SPLIT = 0.30
const WALK_CAL_PER_MILE = 100
const RESIST_CAL_PER_MIN = 8
const MIN_CAL = { M: 1500, F: 1200 }

function lbsToKg(lbs) { return lbs / 2.20462 }
function ftInToCm(ft, inches) { return (parseFloat(ft) * 12 + parseFloat(inches || 0)) * 2.54 }

function mifflinBmr(weightKg, heightCm, age, sex) {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'M' ? base + 5 : base - 161
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}

export function calculatePlan(profile, startDate = new Date()) {
  const sex = profile.sex
  const age = parseInt(profile.age, 10)
  const unit = profile.unit
  const targetWeeks = parseInt(profile.targetWeeks, 10)

  // Normalise original (committed) weights.
  // Field naming quirk: weightLbs/goalWeightLbs hold kg values when unit === 'metric'.
  let startWeightLbs, goalWeightLbs, startWeightKg, heightCm
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
  let currentWeightLbs, currentWeightKg
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
  const poundsToLose       = Math.max(0, currentWeightLbs - goalWeightLbs)
  const totalCalDeficit    = poundsToLose * CAL_PER_LB
  const hasCheckedIn       = profile.currentWeightLbs != null
  const deficitDays        = hasCheckedIn ? Math.max(1, daysLeft) : originalTotalDays
  const requiredDailyDeficit = deficitDays > 0 ? totalCalDeficit / deficitDays : 0

  // BMR → TDEE uses current weight so the math stays accurate as the user loses weight.
  const bmr  = mifflinBmr(currentWeightKg, heightCm, age, sex)
  const tdee = Math.round(bmr * ACTIVITY_FACTOR)

  const maxSafeDeficit = tdee - MIN_CAL[sex]

  let dailyDeficit, unsustainable, realisticEndDate

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
  const foodDeficit   = Math.round(dailyDeficit * FOOD_SPLIT)
  const exerciseBurn  = Math.round(dailyDeficit * EXERCISE_SPLIT)
  const calorieTarget = Math.max(MIN_CAL[sex], tdee - foodDeficit)

  // Meal breakdown (fixed proportions)
  const breakfast = Math.round(calorieTarget * 0.25)
  const lunch     = Math.round(calorieTarget * 0.33)
  const dinner    = Math.round(calorieTarget * 0.33)
  const snacks    = calorieTarget - breakfast - lunch - dinner
  const meals = [
    { name: 'Breakfast', cal: breakfast },
    { name: 'Lunch',     cal: lunch     },
    { name: 'Dinner',    cal: dinner    },
    { name: 'Snacks',    cal: snacks    },
  ]

  // Movement prescription
  const movement = []
  if (exerciseBurn >= 50) {
    const walkCal    = Math.round(exerciseBurn * 0.60)
    const resistCal  = exerciseBurn - walkCal
    const walkMiles  = parseFloat((walkCal / WALK_CAL_PER_MILE).toFixed(1))
    const resistMins = Math.max(5, Math.round(resistCal / RESIST_CAL_PER_MIN / 5) * 5)
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
