const CAL_PER_LB = 3500
const ACTIVITY_FACTOR = 1.2   // sedentary baseline
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

  // Normalise to lbs + metric for math.
  // The form always uses the field name "weightLbs"/"goalWeightLbs" regardless of unit;
  // when unit === 'metric' those fields actually hold kg values.
  let weightLbs, goalWeightLbs, weightKg, heightCm
  if (unit === 'imperial') {
    weightLbs    = parseFloat(profile.weightLbs)
    goalWeightLbs = parseFloat(profile.goalWeightLbs)
    weightKg     = lbsToKg(weightLbs)
    heightCm     = ftInToCm(profile.heightFt, profile.heightIn)
  } else {
    weightKg      = parseFloat(profile.weightLbs)
    const goalKg  = parseFloat(profile.goalWeightLbs)
    weightLbs     = weightKg * 2.20462
    goalWeightLbs = goalKg  * 2.20462
    heightCm      = parseFloat(profile.heightCm)
  }

  const poundsToLose = weightLbs - goalWeightLbs

  // BMR → TDEE
  const bmr  = mifflinBmr(weightKg, heightCm, age, sex)
  const tdee = Math.round(bmr * ACTIVITY_FACTOR)

  // Required vs safe daily deficit
  const totalCalDeficit     = poundsToLose * CAL_PER_LB
  const targetDays          = targetWeeks * 7
  const requiredDailyDeficit = totalCalDeficit / targetDays
  const maxSafeDeficit       = tdee - MIN_CAL[sex]

  let dailyDeficit, unsustainable, realisticEndDate, totalDays

  if (requiredDailyDeficit > maxSafeDeficit) {
    unsustainable  = true
    dailyDeficit   = Math.max(0, Math.round(maxSafeDeficit))
    totalDays      = dailyDeficit > 0 ? Math.ceil(totalCalDeficit / dailyDeficit) : 9999
    realisticEndDate = addDays(startDate, totalDays)
  } else {
    unsustainable    = false
    dailyDeficit     = Math.round(requiredDailyDeficit)
    totalDays        = targetDays
    realisticEndDate = null
  }

  // Food / exercise split
  const foodDeficit  = Math.round(dailyDeficit * FOOD_SPLIT)
  const exerciseBurn = Math.round(dailyDeficit * EXERCISE_SPLIT)
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
    const walkCal   = Math.round(exerciseBurn * 0.60)
    const resistCal = exerciseBurn - walkCal
    const walkMiles = parseFloat((walkCal / WALK_CAL_PER_MILE).toFixed(1))
    const resistMins = Math.max(5, Math.round(resistCal / RESIST_CAL_PER_MIN / 5) * 5)
    if (walkMiles > 0) movement.push(`Walk ${walkMiles} miles.`)
    if (resistMins > 0) movement.push(`${resistMins} min resistance training.`)
  } else {
    movement.push('30 min walking.')
  }

  // Day / timeline math
  const today      = new Date()
  const targetDate = addDays(startDate, totalDays)
  const dayNumber  = Math.max(1, daysBetween(startDate, today) + 1)
  const daysLeft   = Math.max(0, daysBetween(today, targetDate))
  const weekNumber = Math.ceil(dayNumber / 7)
  const pacePerWeek = daysLeft > 0
    ? parseFloat(((goalWeightLbs < weightLbs ? weightLbs - goalWeightLbs : 0) / daysLeft * 7).toFixed(1))
    : 0

  return {
    unsustainable,
    realisticEndDate,

    startWeight:   Math.round(weightLbs),
    currentWeight: Math.round(weightLbs),
    goalWeight:    Math.round(goalWeightLbs),
    poundsToLose:  Math.round(poundsToLose),

    date: today,
    startDate: new Date(startDate),
    targetDate,
    totalDays,
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
