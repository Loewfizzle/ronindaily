import { supabase } from '../lib/supabase'
import type { PlanResult } from '../types'

export interface BadgeDef {
  id: string
  name: string
  flavor: string
  explanation: string
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    id: 'streak_7',
    name: 'Initiated',
    flavor: 'Seven days without failure.',
    explanation: 'You logged every day for seven consecutive days — no exceptions.',
  },
  {
    id: 'streak_30',
    name: 'Ronin',
    flavor: 'Thirty days. You are no longer a beginner.',
    explanation: 'You maintained a daily streak for thirty consecutive days.',
  },
  {
    id: 'streak_50',
    name: 'Disciplined',
    flavor: 'Fifty days. Discipline is no longer a choice. It is who you are.',
    explanation: 'Fifty consecutive days logged. At this point it is not a habit — it is identity.',
  },
  {
    id: 'streak_100',
    name: 'Hardened',
    flavor: 'One hundred days. You have outlasted most.',
    explanation: 'One hundred consecutive days. You have more commitment than nearly anyone who started.',
  },
  {
    id: 'first_checkin',
    name: 'Accountable',
    flavor: 'You faced the scale. Most do not.',
    explanation: 'You completed your first weekly weight check-in and logged the result honestly.',
  },
  {
    id: 'goal_reached',
    name: 'Mission Complete',
    flavor: 'The mission is over. Begin a new one.',
    explanation: 'Your current weight reached your goal weight. The mission you set is finished.',
  },
  {
    id: 'first_meal_plan',
    name: 'Prepared',
    flavor: 'A warrior prepares before battle.',
    explanation: 'You generated your first AI-powered weekly meal plan.',
  },
  {
    id: 'extreme_mission',
    name: 'Oni',
    flavor: 'You chose the path others refused. And you finished it.',
    explanation: 'You completed an extreme mission — a goal that exceeded the safe daily deficit threshold.',
  },
  {
    id: 'reborn',
    name: 'Reborn',
    flavor: 'You fell. You came back. You surpassed where you fell.',
    explanation: 'You skipped a day and reset your streak — then rebuilt past the streak you had when you quit.',
  },
  {
    id: 'dawn',
    name: 'Dawn',
    flavor: 'You showed up before the sun did.',
    explanation: 'You opened the app before 6 AM on three consecutive days.',
  },
  {
    id: 'indomitable',
    name: 'Indomitable',
    flavor: 'You hesitated. You began anyway.',
    explanation: 'You accepted an extreme mission after showing doubt at the final preparation step — and you began.',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    flavor: 'Seven days. No exceptions. No excuses.',
    explanation: 'You logged every single day for seven consecutive days without skipping once.',
  },
  {
    id: 'long_game',
    name: 'Long Game',
    flavor: 'Day one eighty. You are still here.',
    explanation: 'Your mission reached day 180. You have been at this longer than most ever try.',
  },
  {
    id: 'accountable',
    name: 'Vow',
    flavor: 'You indulged. You still delivered.',
    explanation: 'You logged a cheat meal and still completed your full movement target on the same day.',
  },
  {
    id: 'iron_week',
    name: 'Iron Week',
    flavor: 'Twenty-eight days. Four perfect weeks. Your resolve is iron.',
    explanation: 'You logged every day for 28 consecutive days without a single skip.',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    flavor: 'Five weeks. You never disappeared.',
    explanation: 'You completed five separate weekly weight check-ins.',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    flavor: 'No shortcuts. Only raw materials.',
    explanation: 'You generated a weekly meal plan on the Raw Materials budget — the strictest option available.',
  },
  {
    id: 'overcomer',
    name: 'Overcomer',
    flavor: 'The plan said this long. You are moving faster.',
    explanation: 'Your weekly check-in showed you are ahead of your projected weight-loss pace.',
  },
]

export const BADGE_KANJI: Record<string, string> = {
  streak_7:        '始',
  streak_30:       '侍',
  streak_50:       '律',
  streak_100:      '鋼',
  first_checkin:   '誠',
  goal_reached:    '完',
  first_meal_plan: '備',
  extreme_mission: '鬼',
  reborn:          '敗',
  dawn:            '暁',
  indomitable:     '剛',
  perfect_week:    '全',
  long_game:       '永',
  accountable:     '誓',
  iron_week:       '鉄',
  ghost:           '影',
  minimalist:      '無',
  overcomer:       '越',
}

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find(b => b.id === id)
}

export async function awardBadge(userId: string, badgeId: string): Promise<BadgeDef | null> {
  const def = getBadgeDef(badgeId)
  if (!def) return null
  try {
    const { data: existing } = await supabase
      .from('badges')
      .select('badge_id')
      .eq('user_id', userId)
      .eq('badge_id', badgeId)
      .maybeSingle()
    if (existing) return null
    await supabase.from('badges').insert({ user_id: userId, badge_id: badgeId })
    return def
  } catch {
    return null
  }
}

interface CheckParams {
  userId: string
  streak: number
  plan: PlanResult
  hasCheckedIn: boolean
  hasMealPlan: boolean
  dayNumber: number
}

export async function checkAndAwardBadges({
  userId, streak, plan, hasCheckedIn, hasMealPlan, dayNumber,
}: CheckParams): Promise<BadgeDef[]> {
  const earned: string[] = []

  if (streak >= 7)   earned.push('streak_7')
  if (streak >= 30)  earned.push('streak_30')
  if (streak >= 50)  earned.push('streak_50')
  if (streak >= 100) earned.push('streak_100')
  if (hasCheckedIn)  earned.push('first_checkin')
  if (plan.poundsToLose <= 0) {
    earned.push('goal_reached')
    if (localStorage.getItem('ronin_extreme_accepted')) earned.push('extreme_mission')
  }
  if (hasMealPlan)   earned.push('first_meal_plan')
  if (streak >= 7)   earned.push('perfect_week')
  if (streak >= 28)  earned.push('iron_week')
  if (dayNumber >= 180) earned.push('long_game')

  const preSkipStreak = parseInt(localStorage.getItem('ronin_pre_skip_streak') || '0', 10)
  if (preSkipStreak > 0 && streak >= preSkipStreak) earned.push('reborn')

  if (parseInt(localStorage.getItem('ronin_dawn_count') || '0', 10) >= 3) earned.push('dawn')

  if (localStorage.getItem('ronin_extreme_accepted') && localStorage.getItem('ronin_hesitated')) {
    earned.push('indomitable')
  }

  try {
    const [badgeRes, checkinRes] = await Promise.all([
      supabase.from('badges').select('badge_id').eq('user_id', userId),
      supabase.from('checkins').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    ])

    if ((checkinRes.count ?? 0) >= 5) earned.push('ghost')

    const existingIds = new Set((badgeRes.data ?? []).map(r => r.badge_id))
    const newIds = earned.filter(id => !existingIds.has(id))
    if (newIds.length === 0) return []

    await supabase.from('badges').insert(newIds.map(badge_id => ({ user_id: userId, badge_id })))
    return newIds.map(id => getBadgeDef(id)).filter((b): b is BadgeDef => !!b)
  } catch {
    return []
  }
}
