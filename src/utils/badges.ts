import { supabase } from '../lib/supabase'
import type { PlanResult } from '../types'

export interface BadgeDef {
  id: string
  name: string
  flavor: string
}

export const BADGE_DEFS: BadgeDef[] = [
  { id: 'streak_7',       name: 'Initiated',        flavor: 'Seven days without failure.' },
  { id: 'streak_30',      name: 'Ronin',             flavor: 'Thirty days. You are no longer a beginner.' },
  { id: 'streak_50',      name: 'Disciplined',       flavor: 'Fifty days. Discipline is no longer a choice. It is who you are.' },
  { id: 'streak_100',     name: 'Hardened',          flavor: 'One hundred days. You have outlasted most.' },
  { id: 'first_checkin',  name: 'Accountable',       flavor: 'You faced the scale. Most do not.' },
  { id: 'goal_reached',   name: 'Mission Complete',  flavor: 'The mission is over. Begin a new one.' },
  { id: 'first_meal_plan', name: 'Prepared',         flavor: 'A warrior prepares before battle.' },
]

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find(b => b.id === id)
}

interface CheckParams {
  userId: string
  streak: number
  plan: PlanResult
  hasCheckedIn: boolean
  hasMealPlan: boolean
}

export async function checkAndAwardBadges({
  userId, streak, plan, hasCheckedIn, hasMealPlan,
}: CheckParams): Promise<BadgeDef[]> {
  const earned: string[] = []

  if (streak >= 7)         earned.push('streak_7')
  if (streak >= 30)        earned.push('streak_30')
  if (streak >= 50)        earned.push('streak_50')
  if (streak >= 100)       earned.push('streak_100')
  if (hasCheckedIn)        earned.push('first_checkin')
  if (plan.poundsToLose <= 0) earned.push('goal_reached')
  if (hasMealPlan)         earned.push('first_meal_plan')

  if (earned.length === 0) return []

  try {
    const { data: existing } = await supabase
      .from('badges')
      .select('badge_id')
      .eq('user_id', userId)

    const existingIds = new Set((existing ?? []).map(r => r.badge_id))
    const newIds = earned.filter(id => !existingIds.has(id))

    if (newIds.length === 0) return []

    await supabase.from('badges').insert(
      newIds.map(badge_id => ({ user_id: userId, badge_id }))
    )

    return newIds.map(id => getBadgeDef(id)).filter((b): b is BadgeDef => !!b)
  } catch {
    return []
  }
}
