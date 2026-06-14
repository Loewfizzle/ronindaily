import type { User } from '@supabase/supabase-js'
import type { Tables } from './types/database.types'

export type UnitSystem = 'imperial' | 'metric'
export type Sex = 'M' | 'F'
export type Screen = 'loading' | 'landing' | 'login' | 'onboarding' | 'preparation' | 'dashboard'

/**
 * User profile — mirrors the profiles Supabase table plus all onboarding form fields.
 * NAMING QUIRK: weightLbs / goalWeightLbs / currentWeightLbs hold kg values when
 * unit === 'metric'. The field names were established early and changing them would
 * require a localStorage migration.
 */
export interface UserProfile {
  unit: UnitSystem
  sex: Sex
  age: string
  targetWeeks: string
  weightLbs: string         // start weight (lbs if imperial, kg if metric — see quirk above)
  goalWeightLbs: string     // goal weight (same unit quirk)
  heightCm: string          // metric height in cm
  heightFt: string          // imperial height feet component
  heightIn: string          // imperial height inches component
  currentWeightLbs?: string // latest check-in weight (same unit quirk); absent until first check-in
  activities?: string[]     // selected activity IDs e.g. ['walk', 'resistance']
}

export interface MovementItem {
  id: string
  text: string  // human-readable prescription e.g. "Walk 1.2 miles."
  cal: number
}

export interface Meal {
  name: string
  cal: number
}

/** Every property returned by calculatePlan. */
export interface PlanResult {
  unit: UnitSystem
  extremeMission: boolean
  startWeight: number
  currentWeight: number
  goalWeight: number
  poundsToLose: number
  date: Date
  startDate: Date
  targetDate: Date
  totalDays: number
  dayNumber: number
  daysLeft: number
  weekNumber: number
  maintenance: number
  dailyDeficit: number
  calorieTarget: number
  exerciseBurn: number
  meals: Meal[]
  movement: MovementItem[]
  movementCal: number
  pacePerWeek: number
}

/** Weekly weight check-in submitted by the user. */
export interface CheckinData {
  weekNumber: number
  weight: number
  checkedInAt: string
}

/** A single daily-app-open record used for streak tracking. */
export interface DailyLog {
  userId: string
  loggedDate: string
}

/** Auth state surface used by App. */
export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

// ── Supabase table row shapes (derived from generated database types) ─────────

export type ProfileRow  = Tables<'profiles'>
export type CheckinRow  = Tables<'checkins'>
export type DailyLogRow = Tables<'daily_logs'>

// ── Meal plan ─────────────────────────────────────────────────────────────────

export const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const
export type MealSlot = typeof MEAL_SLOTS[number]

export interface MealItem {
  name: string
  portion: string
  calories: number
}

export interface DayPlan {
  day: number
  breakfast: MealItem[]
  lunch: MealItem[]
  dinner: MealItem[]
  snacks: MealItem[]
  totalCalories: number
}

export interface MealPlanData {
  days: DayPlan[]
  calorieTarget: number
  generatedAt: string
}

export interface MealPrefs {
  budget: 'raw_materials' | 'budget' | 'standard' | 'flexible'
  restrictions: string[]
  equipment: string[]
  dislikes: string
  description?: string
}
