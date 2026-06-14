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
  // ── Walking series (歩) ──────────────────────────────────────────────────────
  { id: 'walk_10',  name: 'First Steps',   flavor: 'Ten miles behind you. The road ahead is longer.',         explanation: 'Walked a cumulative total of 10 miles across your mission.'  },
  { id: 'walk_50',  name: 'Road Worn',     flavor: 'Fifty miles of pavement and discipline.',                  explanation: 'Walked a cumulative total of 50 miles across your mission.'  },
  { id: 'walk_100', name: 'The Long Road', flavor: 'One hundred miles. Most drove.',                           explanation: 'Walked a cumulative total of 100 miles across your mission.' },
  { id: 'walk_500', name: 'Endless',       flavor: 'Five hundred miles. You have become the road.',            explanation: 'Walked a cumulative total of 500 miles across your mission.' },
  // ── Cycling series (輪) ──────────────────────────────────────────────────────
  { id: 'bike_25',  name: 'Rolling',        flavor: 'Twenty-five miles. The wheels keep turning.',                        explanation: 'Cycled a cumulative total of 25 miles across your mission.'  },
  { id: 'bike_100', name: 'Distance Rider', flavor: 'One hundred miles on the bike. Earned.',                             explanation: 'Cycled a cumulative total of 100 miles across your mission.' },
  { id: 'bike_250', name: 'Iron Legs',      flavor: 'Two hundred fifty miles. Your legs are no longer your weakness.',    explanation: 'Cycled a cumulative total of 250 miles across your mission.' },
  { id: 'bike_500', name: 'Relentless',     flavor: 'Five hundred miles. There is no finish line.',                       explanation: 'Cycled a cumulative total of 500 miles across your mission.' },
  // ── Running series (走) ──────────────────────────────────────────────────────
  { id: 'run_10',  name: 'First Mile',   flavor: 'Ten miles of running. The lungs remember.',                        explanation: 'Run a cumulative total of 10 miles across your mission.'  },
  { id: 'run_50',  name: 'Road Runner',  flavor: 'Fifty miles. Pain became pace.',                                    explanation: 'Run a cumulative total of 50 miles across your mission.'  },
  { id: 'run_100', name: 'The Grind',    flavor: 'One hundred miles of running. Most stopped at ten.',                explanation: 'Run a cumulative total of 100 miles across your mission.' },
  { id: 'run_250', name: 'Unstoppable',  flavor: 'Two hundred fifty miles. You are no longer running from anything.', explanation: 'Run a cumulative total of 250 miles across your mission.' },
  // ── Gym / Weights series (力) ────────────────────────────────────────────────
  { id: 'resistance_5h',   name: 'Under the Bar', flavor: 'Five hours of iron. The work has begun.',                              explanation: 'Completed a cumulative total of 5 hours of gym and weight training.'   },
  { id: 'resistance_20h',  name: 'Committed',     flavor: 'Twenty hours under the bar. Commitment is no longer a question.',      explanation: 'Completed a cumulative total of 20 hours of gym and weight training.'  },
  { id: 'resistance_50h',  name: 'Devoted',       flavor: 'Fifty hours. The weight does not scare you anymore.',                  explanation: 'Completed a cumulative total of 50 hours of gym and weight training.'  },
  { id: 'resistance_100h', name: 'Consumed',      flavor: 'One hundred hours under iron. This is who you are now.',               explanation: 'Completed a cumulative total of 100 hours of gym and weight training.' },
  // ── Bodyweight series (体) ───────────────────────────────────────────────────
  { id: 'bodyweight_5h',   name: 'Floor Work', flavor: 'Five hours of bodyweight. No excuses. No equipment.',        explanation: 'Completed a cumulative total of 5 hours of bodyweight training.'   },
  { id: 'bodyweight_20h',  name: 'Self-Made',  flavor: 'Twenty hours built with nothing but your body.',             explanation: 'Completed a cumulative total of 20 hours of bodyweight training.'  },
  { id: 'bodyweight_50h',  name: 'The Weapon', flavor: 'Fifty hours. Your body is the weapon.',                      explanation: 'Completed a cumulative total of 50 hours of bodyweight training.'  },
  { id: 'bodyweight_100h', name: 'Forged',     flavor: 'One hundred hours. Forged without a gym.',                   explanation: 'Completed a cumulative total of 100 hours of bodyweight training.' },
  // ── Boxing / HIIT series (拳) ────────────────────────────────────────────────
  { id: 'boxing_5h',   name: 'First Round', flavor: 'Five hours in. The bell keeps ringing.',              explanation: 'Completed a cumulative total of 5 hours of boxing or HIIT training.'   },
  { id: 'boxing_20h',  name: 'Contender',   flavor: 'Twenty hours of sweat and impact.',                    explanation: 'Completed a cumulative total of 20 hours of boxing or HIIT training.'  },
  { id: 'boxing_50h',  name: 'Fighter',     flavor: 'Fifty hours. You hit back now.',                       explanation: 'Completed a cumulative total of 50 hours of boxing or HIIT training.'  },
  { id: 'boxing_100h', name: 'Warrior',     flavor: 'One hundred hours of combat training. Enough said.',   explanation: 'Completed a cumulative total of 100 hours of boxing or HIIT training.' },
  // ── Swimming series (泳) ────────────────────────────────────────────────────
  { id: 'swim_5h',   name: 'In the Water', flavor: 'Five hours in the water. Most sink.',              explanation: 'Completed a cumulative total of 5 hours of swimming.'   },
  { id: 'swim_20h',  name: 'Current',      flavor: 'Twenty hours. You move with the water now.',       explanation: 'Completed a cumulative total of 20 hours of swimming.'  },
  { id: 'swim_50h',  name: 'Deep',         flavor: 'Fifty hours submerged in discipline.',             explanation: 'Completed a cumulative total of 50 hours of swimming.'  },
  { id: 'swim_100h', name: 'Tidal',        flavor: 'One hundred hours. Unstoppable as water.',         explanation: 'Completed a cumulative total of 100 hours of swimming.' },
  // ── Yoga series (静) ─────────────────────────────────────────────────────────
  { id: 'yoga_5h',   name: 'Still',        flavor: 'Five hours of stillness in motion.',               explanation: 'Completed a cumulative total of 5 hours of yoga.'   },
  { id: 'yoga_20h',  name: 'Centered',     flavor: 'Twenty hours. The mind follows the body.',         explanation: 'Completed a cumulative total of 20 hours of yoga.'  },
  { id: 'yoga_50h',  name: 'Balanced',     flavor: 'Fifty hours of discipline through stillness.',     explanation: 'Completed a cumulative total of 50 hours of yoga.'  },
  { id: 'yoga_100h', name: 'Transcendent', flavor: 'One hundred hours. Beyond the physical.',          explanation: 'Completed a cumulative total of 100 hours of yoga.' },
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
  // Walking
  walk_10:  '歩', walk_50:  '歩', walk_100: '歩', walk_500: '歩',
  // Cycling
  bike_25:  '輪', bike_100: '輪', bike_250: '輪', bike_500: '輪',
  // Running
  run_10:   '走', run_50:   '走', run_100:  '走', run_250:  '走',
  // Gym / Weights
  resistance_5h:   '力', resistance_20h:  '力', resistance_50h:  '力', resistance_100h: '力',
  // Bodyweight
  bodyweight_5h:   '体', bodyweight_20h:  '体', bodyweight_50h:  '体', bodyweight_100h: '体',
  // Boxing / HIIT
  boxing_5h:   '拳', boxing_20h:  '拳', boxing_50h:  '拳', boxing_100h: '拳',
  // Swimming
  swim_5h:   '泳', swim_20h:  '泳', swim_50h:  '泳', swim_100h: '泳',
  // Yoga
  yoga_5h:   '静', yoga_20h:  '静', yoga_50h:  '静', yoga_100h: '静',
}

// Activity series: ordered from lowest → highest milestone per series.
// Used both for milestone badge checking (threshold order) and BadgeRow tier rendering.
export const ACTIVITY_SERIES: Record<string, Array<{ badgeId: string; threshold: number }>> = {
  walk:       [{ badgeId: 'walk_10', threshold: 10 }, { badgeId: 'walk_50', threshold: 50 }, { badgeId: 'walk_100', threshold: 100 }, { badgeId: 'walk_500', threshold: 500 }],
  bike:       [{ badgeId: 'bike_25', threshold: 25 }, { badgeId: 'bike_100', threshold: 100 }, { badgeId: 'bike_250', threshold: 250 }, { badgeId: 'bike_500', threshold: 500 }],
  run:        [{ badgeId: 'run_10', threshold: 10 }, { badgeId: 'run_50', threshold: 50 }, { badgeId: 'run_100', threshold: 100 }, { badgeId: 'run_250', threshold: 250 }],
  resistance: [{ badgeId: 'resistance_5h', threshold: 5 }, { badgeId: 'resistance_20h', threshold: 20 }, { badgeId: 'resistance_50h', threshold: 50 }, { badgeId: 'resistance_100h', threshold: 100 }],
  bodyweight: [{ badgeId: 'bodyweight_5h', threshold: 5 }, { badgeId: 'bodyweight_20h', threshold: 20 }, { badgeId: 'bodyweight_50h', threshold: 50 }, { badgeId: 'bodyweight_100h', threshold: 100 }],
  boxing:     [{ badgeId: 'boxing_5h', threshold: 5 }, { badgeId: 'boxing_20h', threshold: 20 }, { badgeId: 'boxing_50h', threshold: 50 }, { badgeId: 'boxing_100h', threshold: 100 }],
  swim:       [{ badgeId: 'swim_5h', threshold: 5 }, { badgeId: 'swim_20h', threshold: 20 }, { badgeId: 'swim_50h', threshold: 50 }, { badgeId: 'swim_100h', threshold: 100 }],
  yoga:       [{ badgeId: 'yoga_5h', threshold: 5 }, { badgeId: 'yoga_20h', threshold: 20 }, { badgeId: 'yoga_50h', threshold: 50 }, { badgeId: 'yoga_100h', threshold: 100 }],
}

// Flat badge ID arrays per series, in tier order. Used by BadgeRow for visual grouping.
export const ACTIVITY_SERIES_TIERS: Record<string, string[]> = Object.fromEntries(
  Object.entries(ACTIVITY_SERIES).map(([k, v]) => [k, v.map(m => m.badgeId)])
)

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

// Check which activity milestone badges have been crossed and award any new ones.
// unit is 'miles' for distance activities, 'minutes' for time activities.
export async function checkActivityMilestoneBadges(
  userId: string,
  activityId: string,
  totalAmount: number,
  unit: string,
): Promise<BadgeDef[]> {
  const series = ACTIVITY_SERIES[activityId]
  if (!series) return []

  const compareValue = unit === 'minutes' ? totalAmount / 60 : totalAmount
  const crossedIds = series.filter(m => compareValue >= m.threshold).map(m => m.badgeId)
  if (crossedIds.length === 0) return []

  try {
    const { data: existing } = await supabase
      .from('badges')
      .select('badge_id')
      .eq('user_id', userId)
      .in('badge_id', crossedIds)

    const existingSet = new Set((existing ?? []).map(r => r.badge_id))
    const newIds = crossedIds.filter(id => !existingSet.has(id))
    if (newIds.length === 0) return []

    await supabase.from('badges').insert(newIds.map(badge_id => ({ user_id: userId, badge_id })))
    return newIds.map(id => getBadgeDef(id)).filter((b): b is BadgeDef => !!b)
  } catch {
    return []
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
