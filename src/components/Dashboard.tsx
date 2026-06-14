import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import BottomSheet from './BottomSheet'
import SettingsSheet from './SettingsSheet'
import CheckinSheet from './CheckinSheet'
import ShareSheet from './ShareSheet'
import MealPlanSheet from './MealPlanSheet'
import BadgeBanner from './BadgeBanner'
import BadgeDetailSheet from './BadgeDetailSheet'
import { calculatePlan, formatMovementItem, getActivityInfo } from '../utils/calculate'
import { checkAndAwardBadges, awardBadge, checkActivityMilestoneBadges, BADGE_KANJI, ACTIVITY_SERIES_TIERS } from '../utils/badges'
import { supabase } from '../lib/supabase'
import type { PlanResult, Meal, UnitSystem, MovementItem, MealPlanData } from '../types'
import type { BadgeDef } from '../utils/badges'

interface EarnedBadge {
  badge_id: string
  earned_at: string
}

interface CheatEntry {
  id: string
  description: string
  calories: number
  loggedAt: string
  supabaseId?: string
}

const CHEAT_PICKS: Array<{ group: string; items: Array<{ id: string; label: string; cal: number }> }> = [
  { group: 'DRINKS', items: [
    { id: 'beer',          label: 'Beer (12oz)',        cal: 150  },
    { id: 'wine',          label: 'Glass of wine',      cal: 125  },
    { id: 'cocktail',      label: 'Cocktail',            cal: 200  },
    { id: 'shot',          label: 'Shot of liquor',      cal: 100  },
    { id: 'energy_drink',  label: 'Energy drink',        cal: 160  },
    { id: 'soda',          label: 'Soda (12oz can)',      cal: 150  },
  ]},
  { group: 'FAST FOOD', items: [
    { id: 'burger',           label: 'Burger',            cal: 550  },
    { id: 'fries',            label: 'Large fries',       cal: 490  },
    { id: 'chicken_sandwich', label: 'Chicken sandwich',  cal: 500  },
    { id: 'combo',            label: 'Combo meal',        cal: 1100 },
  ]},
  { group: 'PIZZA', items: [
    { id: 'one_slice',  label: 'One slice',  cal: 300 },
    { id: 'two_slices', label: 'Two slices', cal: 600 },
  ]},
  { group: 'DESSERT', items: [
    { id: 'cake',      label: 'Slice of cake',      cal: 350 },
    { id: 'ice_cream', label: 'Ice cream (1 cup)',  cal: 300 },
    { id: 'cookies',   label: 'Cookies (3)',         cal: 250 },
  ]},
  { group: 'OTHER', items: [
    { id: 'chips',      label: 'Bag of chips',   cal: 300 },
    { id: 'candy',      label: 'Candy bar',       cal: 250 },
    { id: 'late_night', label: 'Late night run',  cal: 600 },
  ]},
]

function getCheatFeedback(totalCheatCal: number, dailyTarget: number): { text: string; color: string } {
  if (totalCheatCal >= dailyTarget * 2) {
    return { text: 'The mission is compromised. Recommit tomorrow.', color: 'var(--red-bright)' }
  }
  const remaining = dailyTarget - totalCheatCal
  if (remaining > 0) {
    return { text: `${remaining.toLocaleString()} calories remaining today. Stay on target.`, color: 'var(--text-2)' }
  }
  const over = Math.abs(remaining)
  if (over <= 200) return { text: 'You are at your limit. No more today.', color: 'var(--text-2)' }
  if (over <= 500) return { text: `You are ${over.toLocaleString()} calories over. Reduce tomorrow by ${over.toLocaleString()}.`, color: 'var(--text-2)' }
  return { text: 'That was not a cheat meal. That was a decision. Adjust the rest of the week.', color: 'var(--red-bright)' }
}

function formatDate(d: Date): string {
  const day   = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year  = d.getFullYear()
  return `${day} ${month} ${year}`
}

function loadPlan(): PlanResult | null {
  try {
    const profile  = JSON.parse(localStorage.getItem('ronin_profile') || 'null')
    const startRaw = localStorage.getItem('ronin_start')
    if (!profile) return null
    if (!startRaw) return null
    if (!profile.sex || !profile.weightLbs || !profile.age || !profile.targetWeeks) return null
    return calculatePlan(profile, new Date(startRaw))
  } catch {
    return null
  }
}

function wtDisplay(lbs: number, unit: UnitSystem): string {
  if (unit === 'metric') return `${(lbs / 2.20462).toFixed(1)} kg`
  return `${Math.round(lbs)} lbs`
}

function wtVal(lbs: number, unit: UnitSystem): string {
  return unit === 'metric' ? (lbs / 2.20462).toFixed(1) : String(Math.round(lbs))
}

function paceDisplay(pace: number, unit: UnitSystem): string {
  if (unit === 'metric') return `${(pace / 2.20462).toFixed(2)} kg/wk`
  return `${pace.toFixed(1)} lbs/wk`
}

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const ACTIVITY_LABEL: Record<string, string> = {
  walk: 'walking', bike: 'cycling', run: 'running',
  resistance: 'gym / weights', bodyweight: 'no equipment',
  swim: 'swimming', boxing: 'boxing / HIIT', yoga: 'yoga',
}

interface DashboardProps {
  onReset: () => void
  onAdjustGoal: () => void
  onSignOut: () => void
  connectionWarning: string | null
}

// Renders the streak pip row + week indicator + share button.
// Used in both the mobile footer and the desktop left-column footer.
function FooterContent({
  loggedDays,
  weekNumber,
  onShare,
}: {
  loggedDays: Set<string>
  weekNumber: number
  onShare: () => void
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: '3px' }}>
        {Array.from({ length: 7 }).map((_, i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6 - i))
          const ds = localDateStr(d)
          return <div key={i} className={`pip${loggedDays.has(ds) ? '' : ' empty'}`} />
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Week {weekNumber}
        </span>
        <button
          onClick={onShare}
          aria-label="Share"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, minWidth: '44px', minHeight: '44px' }}
        >
          <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
            <line x1="5.5" y1="9" x2="5.5" y2="1" stroke="currentColor" strokeWidth="1"/>
            <polyline points="2.5,4 5.5,1 8.5,4" stroke="currentColor" strokeWidth="1" fill="none"/>
            <polyline points="1,7 1,12 10,12 10,7" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        </button>
      </div>
    </>
  )
}

export default function Dashboard({ onReset, onAdjustGoal, onSignOut, connectionWarning }: DashboardProps) {
  const [refreshKey, setRefreshKey]      = useState(0)
  const [sheet, setSheet]               = useState<'food' | 'movement' | 'progress' | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [checkinOpen, setCheckinOpen]   = useState(false)
  const [shareOpen, setShareOpen]       = useState(false)
  const [mealPlanOpen, setMealPlanOpen] = useState(false)
  const [streak, setStreak]             = useState<number>(() => parseInt(localStorage.getItem('ronin_streak') || '1', 10))
  const [loggedDays, setLoggedDays]     = useState<Set<string>>(new Set())
  const [badgeQueue, setBadgeQueue]     = useState<BadgeDef[]>([])
  const activeBadge                     = badgeQueue[0] ?? null   // derived — no separate state needed
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadge[]>([])
  const [selectedBadge, setSelectedBadge] = useState<EarnedBadge | null>(null)
  const [skipOpen, setSkipOpen]           = useState(false)
  const [skipConfirmed, setSkipConfirmed] = useState(false)
  const [skipInput, setSkipInput]         = useState('')
  const skipConfirmTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logDebounceRef                    = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const activityPrevDailyRef             = useRef<Record<string, number>>({})
  const handleBadgesEarnedRef            = useRef<(badges: BadgeDef[]) => void>(() => {})
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`ronin_dismissed_activities_${localDateStr()}`)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch { return [] }
  })
  const [activityLog, setActivityLog] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(`ronin_activity_log_${localDateStr()}`)
      return raw ? (JSON.parse(raw) as Record<string, number>) : {}
    } catch { return {} }
  })
  const [cheatEntries, setCheatEntries] = useState<CheatEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`ronin_cheat_meal_${localDateStr()}`) || '[]') as CheatEntry[]
    } catch { return [] }
  })
  const plan = useMemo(() => loadPlan(), [refreshKey])
  const planRef = useRef(plan)
  planRef.current = plan

  // Compute progress metrics before the early return so they are available to hooks below.
  // (React requires all hooks to be called unconditionally, before any conditional return.)
  const progressPct = (() => {
    if (!plan) return 0
    const range = plan.startWeight - plan.goalWeight
    return range === 0 ? 100 : Math.min(100, Math.max(1, ((plan.startWeight - plan.currentWeight) / range) * 100))
  })()
  const lastCheckin  = parseInt(localStorage.getItem('ronin_last_checkin') || '0', 10)
  const showCheckin  = plan != null && plan.dayNumber % 7 === 0 && lastCheckin !== plan.weekNumber
  const savedBest    = parseFloat(localStorage.getItem('ronin_best_progress') || '0')
  const bestProgress = Math.max(progressPct, savedBest)

  useEffect(() => {
    localStorage.setItem(`ronin_dismissed_activities_${localDateStr()}`, JSON.stringify(dismissed))
  }, [dismissed])

  useEffect(() => () => {
    if (skipConfirmTimerRef.current) clearTimeout(skipConfirmTimerRef.current)
    Object.values(logDebounceRef.current).forEach(clearTimeout)
  }, [])

  useEffect(() => { if (!skipOpen) setSkipInput('') }, [skipOpen])

  useEffect(() => {
    if (sheet !== 'food') return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [sheet])

  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      try {
        const raw = localStorage.getItem(`ronin_dismissed_activities_${localDateStr()}`)
        setDismissed(raw ? (JSON.parse(raw) as string[]) : [])
      } catch { setDismissed([]) }
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // Re-read date-keyed state when the app returns to the foreground — handles midnight rollover.
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      const today = localDateStr()
      try {
        const raw = localStorage.getItem(`ronin_activity_log_${today}`)
        setActivityLog(raw ? (JSON.parse(raw) as Record<string, number>) : {})
      } catch { setActivityLog({}) }
      try {
        const raw = localStorage.getItem(`ronin_cheat_meal_${today}`)
        setCheatEntries(raw ? (JSON.parse(raw) as CheatEntry[]) : [])
      } catch { setCheatEntries([]) }
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  // Persist best progress whenever progressPct improves (not gated behind showCheckin).
  useEffect(() => {
    if (progressPct > parseFloat(localStorage.getItem('ronin_best_progress') || '0')) {
      localStorage.setItem('ronin_best_progress', String(progressPct))
    }
  }, [progressPct])

  // Persist progress milestones as a side-effect, not in the render body.
  useEffect(() => {
    const p = planRef.current
    if (!p) return
    if (progressPct >= 100 && !localStorage.getItem('ronin_goal_reached')) {
      localStorage.setItem('ronin_goal_reached', JSON.stringify({
        achievedAt: new Date().toISOString(),
        lostLbs: p.startWeight - p.currentWeight,
        unit: p.unit,
        totalDays: p.dayNumber,
      }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressPct])

  useEffect(() => {
    async function logAndCalcStreak() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = localDateStr()

        // Dawn badge — track early-morning opens (before 6 AM)
        const now = new Date()
        if (now.getHours() < 6) {
          const dawnLastDate = localStorage.getItem('ronin_dawn_last_date')
          if (dawnLastDate !== today) {
            const yesterday = localDateStr(new Date(now.getTime() - 86400000))
            const prevCount = parseInt(localStorage.getItem('ronin_dawn_count') || '0', 10)
            const newCount = dawnLastDate === yesterday ? prevCount + 1 : 1
            localStorage.setItem('ronin_dawn_count', String(Math.min(newCount, 3)))
            localStorage.setItem('ronin_dawn_last_date', today)
          }
        }

        const skippedDate = localStorage.getItem('ronin_skipped')
        const skippedToday = skippedDate === today

        if (!skippedToday) {
          await supabase.from('daily_logs').upsert(
            { user_id: user.id, logged_date: today },
            { onConflict: 'user_id,logged_date', ignoreDuplicates: true },
          )
        } else {
          await supabase.from('daily_logs').delete().eq('user_id', user.id).eq('logged_date', today)
        }

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('logged_date')
          .eq('user_id', user.id)
          .order('logged_date', { ascending: false })
          .limit(365)

        if (!logs) return

        const dateSet = new Set<string>(logs.map(r => r.logged_date))

        let count = 0
        const cur = new Date()
        while (true) {
          const ds = localDateStr(cur)
          if (dateSet.has(ds)) { count++; cur.setDate(cur.getDate() - 1) } else break
        }

        const last7 = new Set<string>()
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const ds = localDateStr(d)
          if (dateSet.has(ds)) last7.add(ds)
        }

        const finalStreak = skippedToday ? 0 : count
        setStreak(finalStreak)
        setLoggedDays(skippedToday ? new Set() : last7)
        localStorage.setItem('ronin_streak', String(finalStreak))

        const currentPlan = planRef.current
        if (currentPlan) {
          const hasCheckedIn = parseInt(localStorage.getItem('ronin_last_checkin') || '0', 10) > 0
          const hasMealPlan = localStorage.getItem('ronin_meal_plan') !== null
          const newBadges = await checkAndAwardBadges({
            userId: user.id,
            streak: count,
            plan: currentPlan,
            hasCheckedIn,
            hasMealPlan,
            dayNumber: currentPlan.dayNumber,
          })
          if (newBadges.length > 0) {
            setBadgeQueue(prev => [...prev, ...newBadges])
            setEarnedBadges(prev => [
              ...prev,
              ...newBadges.map(b => ({ badge_id: b.id, earned_at: new Date().toISOString() })),
            ])
          }
        }

        const { data: allBadges } = await supabase
          .from('badges')
          .select('badge_id, earned_at')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: true })
        if (allBadges) setEarnedBadges(allBadges)
      } catch {
        // Offline — keep localStorage streak, pips stay empty
      }
    }
    logAndCalcStreak()
  }, [])

  // Load today's activity log from Supabase on mount (Supabase wins over localStorage cache).
  useEffect(() => {
    async function loadActivityLog() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const today = localDateStr()
        const { data: logs } = await supabase
          .from('activity_logs')
          .select('activity_id, actual_amount')
          .eq('user_id', user.id)
          .eq('logged_date', today)
        if (!logs || logs.length === 0) return
        const loaded: Record<string, number> = {}
        for (const log of logs) loaded[log.activity_id] = Number(log.actual_amount)
        setActivityLog(prev => {
          const merged = { ...prev, ...loaded }
          localStorage.setItem(`ronin_activity_log_${today}`, JSON.stringify(merged))
          return merged
        })
      } catch { /* offline — localStorage cache stands */ }
    }
    loadActivityLog()
  }, [])

  // Load cumulative activity totals from Supabase on mount, merge with localStorage cache.
  useEffect(() => {
    async function loadActivityTotals() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: totals } = await supabase
          .from('activity_totals')
          .select('activity_id, total_amount')
          .eq('user_id', user.id)
        if (!totals || totals.length === 0) return
        const cached: Record<string, number> = {}
        try { Object.assign(cached, JSON.parse(localStorage.getItem('ronin_activity_totals') || '{}')) } catch {}
        for (const row of totals) cached[row.activity_id] = Number(row.total_amount)
        localStorage.setItem('ronin_activity_totals', JSON.stringify(cached))
      } catch { /* offline */ }
    }
    loadActivityTotals()
  }, [])

  const handleLogActivity = useCallback((id: string, amount: number) => {
    const today = localDateStr()
    // Capture pre-session daily amount once per debounce cycle (before state update)
    if (!logDebounceRef.current[id]) {
      try {
        const raw = localStorage.getItem(`ronin_activity_log_${today}`)
        activityPrevDailyRef.current[id] = raw
          ? ((JSON.parse(raw) as Record<string, number>)[id] ?? 0)
          : 0
      } catch { activityPrevDailyRef.current[id] = 0 }
    }
    setActivityLog(prev => {
      const next = { ...prev, [id]: amount }
      localStorage.setItem(`ronin_activity_log_${today}`, JSON.stringify(next))
      return next
    })
    if (logDebounceRef.current[id]) clearTimeout(logDebounceRef.current[id])
    logDebounceRef.current[id] = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !planRef.current) return
        const item = planRef.current.movement.find(m => m.id === id)
        const info = getActivityInfo(id)
        if (!info) return
        const plannedCal = item?.cal ?? 0
        const plannedAmount = Math.round(plannedCal / info.rate * 10) / 10
        const actUnit = info.type === 'distance' ? 'miles' : 'minutes'
        await supabase.from('activity_logs').upsert(
          { user_id: user.id, logged_date: today, activity_id: id, planned_amount: plannedAmount, actual_amount: amount, unit: actUnit },
          { onConflict: 'user_id,logged_date,activity_id' },
        )
        // Update cumulative total: only increment by the delta since last commit
        const prevDailyAmount = activityPrevDailyRef.current[id] ?? 0
        const delta = amount - prevDailyAmount
        let cachedTotals: Record<string, number> = {}
        try { cachedTotals = JSON.parse(localStorage.getItem('ronin_activity_totals') || '{}') } catch {}
        const newTotal = Math.max(0, (cachedTotals[id] ?? 0) + delta)
        const { error: totalError } = await supabase.from('activity_totals').upsert(
          { user_id: user.id, activity_id: id, total_amount: newTotal, unit: actUnit },
          { onConflict: 'user_id,activity_id' },
        )
        if (!totalError) {
          try {
            const fresh: Record<string, number> = JSON.parse(localStorage.getItem('ronin_activity_totals') || '{}')
            fresh[id] = newTotal
            localStorage.setItem('ronin_activity_totals', JSON.stringify(fresh))
          } catch {}
          activityPrevDailyRef.current[id] = amount
          delete logDebounceRef.current[id]
          const newBadges = await checkActivityMilestoneBadges(user.id, id, newTotal, actUnit)
          if (newBadges.length > 0) handleBadgesEarnedRef.current(newBadges)
        } else {
          delete logDebounceRef.current[id]
        }
      } catch { /* offline — localStorage cache is source of truth */ }
    }, 1000)
  }, [])

  const handleUnlogActivity = useCallback((id: string) => {
    const today = localDateStr()
    if (logDebounceRef.current[id]) {
      clearTimeout(logDebounceRef.current[id])
      delete logDebounceRef.current[id]
    }
    // Capture amount being removed before state update
    let prevDailyAmount = 0
    try {
      const raw = localStorage.getItem(`ronin_activity_log_${today}`)
      if (raw) prevDailyAmount = (JSON.parse(raw) as Record<string, number>)[id] ?? 0
    } catch {}
    delete activityPrevDailyRef.current[id]
    setActivityLog(prev => {
      const next = { ...prev }
      delete next[id]
      localStorage.setItem(`ronin_activity_log_${today}`, JSON.stringify(next))
      return next
    });
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from('activity_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('logged_date', today)
          .eq('activity_id', id)
        // Subtract unlogged amount from cumulative total
        if (prevDailyAmount > 0) {
          const info = getActivityInfo(id)
          const actUnit = info?.type === 'distance' ? 'miles' : 'minutes'
          try {
            const cached: Record<string, number> = JSON.parse(localStorage.getItem('ronin_activity_totals') || '{}')
            const newTotal = Math.max(0, (cached[id] ?? 0) - prevDailyAmount)
            await supabase.from('activity_totals').upsert(
              { user_id: user.id, activity_id: id, total_amount: newTotal, unit: actUnit },
              { onConflict: 'user_id,activity_id' },
            )
            cached[id] = newTotal
            localStorage.setItem('ronin_activity_totals', JSON.stringify(cached))
          } catch {}
        }
      } catch { /* offline */ }
    })()
  }, [])

  const handleBadgesEarned = useCallback((badges: BadgeDef[]) => {
    setBadgeQueue(prev => [...prev, ...badges])
    setEarnedBadges(prev => [
      ...prev,
      ...badges.map(b => ({ badge_id: b.id, earned_at: new Date().toISOString() })),
    ])
  }, [])
  useEffect(() => { handleBadgesEarnedRef.current = handleBadgesEarned }, [handleBadgesEarned])

  // Accountable badge — fires when both cheat meal and full movement target are logged
  useEffect(() => {
    if (cheatEntries.length === 0) return
    const p = planRef.current
    if (!p) return
    const actual = Object.entries(activityLog)
      .filter(([id]) => p.movement.some(m => m.id === id))
      .reduce((sum, [id, amount]) => {
        const info = getActivityInfo(id)
        return sum + (info ? Math.round(amount * info.rate) : 0)
      }, 0)
    if (actual < p.movementCal) return
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const newBadge = await awardBadge(user.id, 'accountable')
        if (newBadge) handleBadgesEarned([newBadge])
      } catch { /* offline */ }
    })()
  }, [activityLog, cheatEntries, handleBadgesEarned])

  const handleBadgeDismiss = useCallback(() => {
    setBadgeQueue(prev => prev.slice(1))
  }, [])

  const handleCheatChange = useCallback((entries: CheatEntry[]) => {
    setCheatEntries(entries)
  }, [])

  if (!plan) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', letterSpacing: '0.1em' }}>
          No mission data found.{' '}
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', padding: 0 }}>
            Start over.
          </button>
        </div>
      </div>
    )
  }

  const {
    unit, extremeMission,
    startWeight, currentWeight, goalWeight, poundsToLose,
    date, dayNumber, daysLeft, totalDays, weekNumber,
    maintenance, dailyDeficit, calorieTarget, exerciseBurn,
    meals, movement, movementCal,
  } = plan

  // progressPct, lastCheckin, showCheckin, savedBest, bestProgress computed above the early return.

  const todayCheatCal = cheatEntries.reduce((s, e) => s + e.calories, 0)

  // Actual cal burned from logged activities vs planned target.
  const actualCalBurned = Object.entries(activityLog)
    .filter(([id]) => movement.some(m => m.id === id))
    .reduce((sum, [id, amount]) => {
      const info = getActivityInfo(id)
      return sum + (info ? Math.round(amount * info.rate) : 0)
    }, 0)
  const hasActivityLog = Object.keys(activityLog).some(id => movement.some(m => m.id === id))
  const calSurplus = actualCalBurned - movementCal

  // Dismiss/restore movement activities for today.
  const activePrescriptions = (() => {
    const active = movement.filter(m => !dismissed.includes(m.id))
    if (active.length === 0) return movement
    const perCal = Math.round(exerciseBurn / active.length)
    return active.map(m => formatMovementItem(m.id, perCal))
  })()
  const dismissedItems = movement.filter(m => dismissed.includes(m.id))

  const handleDismiss = (id: string) => {
    const active = movement.filter(m => !dismissed.includes(m.id))
    if (active.length <= 1) return
    setDismissed(prev => [...prev, id])
  }
  const handleRestore = (id: string) => setDismissed(prev => prev.filter(d => d !== id))
  const handleResetDismissed = () => setDismissed([])

  const handleSkipConfirm = async () => {
    const today = localDateStr()
    localStorage.setItem('ronin_pre_skip_streak', String(streak))
    setSkipOpen(false)
    setStreak(0)
    setLoggedDays(new Set())
    localStorage.setItem('ronin_streak', '0')
    localStorage.setItem('ronin_skipped', today)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('daily_logs').delete().eq('user_id', user.id).eq('logged_date', today)
      }
    } catch { /* offline — streak already reset locally */ }
    setSkipConfirmed(true)
    skipConfirmTimerRef.current = setTimeout(() => setSkipConfirmed(false), 3000)
  }

  const footerProps = { loggedDays, weekNumber, onShare: () => setShareOpen(true) }

  return (
    <div className="dash-root">

      {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
      <div className="dash-left">

        {/* Header: branding + settings */}
        <div className="dash-header">
          <div className="dash-brand">
            <span className="font-jp dash-kanji" style={{ animation: 'kanjiPulse 4s ease-in-out infinite' }}>侍</span>
            <div>
              <div className="dash-ronin">RONIN</div>
              <div className="dash-daily">DAILY</div>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="dash-settings-btn"
          >
            <svg width="20" height="15" viewBox="0 0 16 12" fill="none">
              <line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="1"/>
              <circle cx="6" cy="2" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
              <line x1="0" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1"/>
              <circle cx="10" cy="10" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
            </svg>
          </button>
        </div>

        {/* Connection warning */}
        {connectionWarning && (
          <div style={{ padding: '0.6rem 1.5rem 0', fontSize: '0.8rem', color: 'var(--red-bright)', letterSpacing: '0.04em' }}>
            {connectionWarning}
          </div>
        )}

        {/* Date + day heading */}
        <div style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.85rem', letterSpacing: '0.12em', color: 'var(--text-2)', marginBottom: '0.35rem' }}>
            {formatDate(date)}
          </div>
          <div className="dash-day-number">DAY {dayNumber}</div>
          {/* "Mission Briefing" shows here on mobile; on desktop it moves to the right column */}
          <div className="dash-mobile-subtitle" style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Mission Briefing
          </div>
        </div>

        {/* Progress blade */}
        <div style={{ padding: '1rem 1.5rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{wtDisplay(startWeight, unit)}</span>
            <span style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{wtDisplay(poundsToLose, unit)} · {daysLeft} days</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>{wtDisplay(goalWeight, unit)}</span>
          </div>
          <div className="blade-wrap">
            <div className="blade-fill" style={{ width: `${progressPct}%` }} />
            <div className="blade-dot start" />
            <div className="blade-dot end" />
          </div>
        </div>

        {/* Extreme mission indicator */}
        {extremeMission && (
          <div style={{ padding: '0 1.5rem 0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', letterSpacing: '0.06em' }}>
              Extreme mission active.
            </span>
          </div>
        )}

        {/* Check-in banner */}
        {showCheckin && (
          <div
            onClick={() => setCheckinOpen(true)}
            style={{ margin: '0 1.5rem 1rem', padding: '0.9rem 1rem', borderLeft: '2px solid var(--red)', background: 'var(--elevated)', cursor: 'pointer' }}
          >
            <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>Week {weekNumber} complete. Log your weight.</span>
          </div>
        )}

        {/* Spacer — on desktop pushes footer to bottom of left column */}
        <div className="dash-left-spacer" />

        {earnedBadges.length > 0 && (
          <div className="badge-row-desktop">
            <BadgeRow badges={earnedBadges} onSelect={setSelectedBadge} progressPct={bestProgress} />
          </div>
        )}

        {/* Footer — desktop only (hidden on mobile) */}
        <div className="dash-footer dash-footer-desktop" style={{ padding: '1rem 1.5rem 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FooterContent {...footerProps} />
        </div>
      </div>

      {/* ── RIGHT COLUMN ────────────────────────────────────────────── */}
      <div className="dash-right">

        {/* "Mission Briefing" heading — desktop only */}
        <div className="dash-desktop-heading" style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Mission Briefing
          </div>
        </div>

        {/* Mission blocks */}
        <div className="dash-mission-blocks" style={{ padding: '0 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div className="mission-block" onClick={() => setSheet('food')}>
            <BlockHeader label="Food" />
            <div style={{ fontSize: '2.2rem', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '0.3rem' }}>
              {calorieTarget.toLocaleString()}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>cal</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>
              Deficit: {(maintenance - calorieTarget).toLocaleString()} cal below maintenance.
            </div>
            {todayCheatCal > 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '0.35rem', letterSpacing: '0.04em' }}>
                Cheat meal logged. {Math.max(0, calorieTarget - todayCheatCal).toLocaleString()} cal remaining.
              </div>
            )}
          </div>

          <div className="mission-block" onClick={() => setSheet('movement')}>
            <BlockHeader label="Movement" />
            {/* Active activities with X dismiss buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.25rem' }}>
              {activePrescriptions.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '1.05rem', color: 'var(--text)', fontWeight: 400 }}>{item.text}</div>
                  {activePrescriptions.length > 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDismiss(item.id) }}
                      aria-label={`Dismiss ${ACTIVITY_LABEL[item.id] ?? item.id}`}
                      className="close-btn"
                    >
                      <CloseIcon />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Dismissed — restore links */}
            {dismissedItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {dismissedItems.map(item => (
                  <button
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); handleRestore(item.id) }}
                    style={{
                      background: 'none', border: 'none', color: 'var(--text-3)',
                      fontSize: '0.8rem', letterSpacing: '0.04em',
                      cursor: 'pointer', padding: '0.4rem 0', textAlign: 'left',
                      minHeight: '44px', fontFamily: 'Inter, sans-serif', display: 'block',
                    }}
                  >
                    + Restore {ACTIVITY_LABEL[item.id] ?? item.id}
                  </button>
                ))}
                <button
                  onClick={(e) => { e.stopPropagation(); handleResetDismissed() }}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text-3)',
                    fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: 'pointer', padding: '0.1rem 0', textAlign: 'left',
                    minHeight: '44px', fontFamily: 'Inter, sans-serif', display: 'block',
                  }}
                >
                  Reset
                </button>
              </div>
            )}
            {hasActivityLog ? (
              <div style={{ fontSize: '0.8rem', color: calSurplus >= 10 ? 'var(--green)' : 'var(--text-2)' }}>
                {actualCalBurned.toLocaleString()} cal burned{Math.abs(calSurplus) >= 10
                  ? ` · ${calSurplus >= 0 ? `+${calSurplus.toLocaleString()} cal surplus` : `${Math.abs(calSurplus).toLocaleString()} cal shortfall`}`
                  : ''}.
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>{movementCal.toLocaleString()} cal burn required.</div>
            )}
          </div>

          <div className="mission-block" onClick={() => setSheet('progress')}>
            <BlockHeader label="Progress" />
            <div style={{ display: 'flex', gap: '2rem' }}>
              <Stat label="Remaining" value={wtVal(poundsToLose, unit)} unit={unit === 'metric' ? 'kg' : 'lbs'} />
              <Stat label="Days Left"  value={String(daysLeft)} />
              <Stat label="Streak"     value={String(streak)} />
            </div>
          </div>

          <MealPlanBlock calorieTarget={calorieTarget} onOpen={() => setMealPlanOpen(true)} />
        </div>

        {earnedBadges.length > 0 && (
          <div className="badge-row-mobile">
            <BadgeRow badges={earnedBadges} onSelect={setSelectedBadge} progressPct={bestProgress} />
          </div>
        )}

        {/* Footer — mobile only (hidden on desktop) */}
        <div className="dash-footer dash-footer-mobile" style={{ padding: '1rem 1.5rem 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FooterContent {...footerProps} />
        </div>

        {/* Skip button — only day 2+ onward, subtle and below the fold */}
        {dayNumber > 1 && (
          <div style={{ textAlign: 'center', paddingTop: '0.85rem', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setSkipOpen(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', opacity: 0.5, minHeight: '44px', minWidth: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              I skipped today.
            </button>
          </div>
        )}
      </div>

      {/* ── Sheets ──────────────────────────────────────────────────── */}
      {sheet === 'food' && (
        <div className="fullsheet-backdrop" onPointerDown={e => { if (e.target === e.currentTarget) setSheet(null) }}>
          <div className="fullsheet-panel">
            <div style={{ padding: '1.25rem 1.5rem 0', flexShrink: 0, background: 'var(--surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Food</div>
                  <div style={{ fontSize: '3rem', fontWeight: 300, color: 'var(--text)', letterSpacing: '0.05em', lineHeight: 1, marginTop: '0.35rem' }}>
                    Day {dayNumber}
                  </div>
                </div>
                <button onClick={() => setSheet(null)} aria-label="Close" className="close-btn">
                  <CloseIcon />
                </button>
              </div>
              <div style={{ height: '1px', background: 'var(--red)', opacity: 0.35, marginTop: '1rem' }} />
            </div>
            <div className="fullsheet-content">
              <FoodDetail data={{ target: calorieTarget, maintenance, deficit: dailyDeficit, meals }} dayNumber={dayNumber} cheatEntries={cheatEntries} onCheatChange={handleCheatChange} />
            </div>
          </div>
        </div>
      )}

      <BottomSheet open={sheet === 'movement'} onClose={() => setSheet(null)} title="Movement">
        <MovementDetail movement={activePrescriptions} cal={movementCal} activityLog={activityLog} onLog={handleLogActivity} onUnlog={handleUnlogActivity} />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={() => setSheet(null)} title="Progress">
        <ProgressDetail plan={plan} />
      </BottomSheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} streak={streak} plan={plan} />
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} plan={plan} onCheckin={() => setRefreshKey(k => k + 1)} onBadgesEarned={handleBadgesEarned} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onAdjustGoal={onAdjustGoal} onReset={onReset} onSignOut={onSignOut} />
      <MealPlanSheet open={mealPlanOpen} onClose={() => setMealPlanOpen(false)} calorieTarget={calorieTarget} unit={unit} onBadgesEarned={handleBadgesEarned} />

      <BadgeDetailSheet badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      <BadgeBanner badge={activeBadge} onDismiss={handleBadgeDismiss} />

      {/* ── Skip confirmation sheet ──────────────────────────────────── */}
      {skipOpen && (
        <div className="sheet-backdrop" onClick={() => setSkipOpen(false)}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()} style={{ padding: '0 1.5rem 2rem' }}>
            <div style={{ width: '32px', height: '3px', background: 'var(--border-mid)', margin: '1.25rem auto 2.5rem', borderRadius: '2px' }} />
            <div style={{ fontSize: '1.35rem', fontWeight: 300, color: 'var(--text)', letterSpacing: '0.02em', lineHeight: 1.3, marginBottom: '0.9rem' }}>
              You have failed.
            </div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.85, marginBottom: '1.5rem' }}>
              You have dishonored your name and your family.
            </div>
            <div style={{ marginBottom: '1.75rem' }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Type SKIP to confirm
              </div>
              <input
                className="input-bare"
                type="text"
                placeholder="SKIP"
                value={skipInput}
                onChange={e => setSkipInput(e.target.value)}
                autoComplete="off"
                style={{ width: '100%' }}
              />
            </div>
            <button
              className="commit-btn"
              onClick={handleSkipConfirm}
              disabled={skipInput !== 'SKIP'}
              style={{ marginBottom: '1.5rem', opacity: skipInput === 'SKIP' ? 1 : 0.4 }}
            >
              I Accept This Failure
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setSkipOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.8rem', letterSpacing: '0.12em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
              >
                I did not skip.
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Failure screen — 3 seconds, then returns to dashboard ────── */}
      {skipConfirmed && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            fontSize: '0.85rem', color: 'var(--text)',
            letterSpacing: '0.3em', textTransform: 'uppercase',
            textAlign: 'center', lineHeight: 2.6,
          }}>
            Streak reset.<br />Begin again tomorrow.
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

const CIRCLE_STYLE: React.CSSProperties = {
  width: '44px',
  height: '44px',
  flexShrink: 0,
  background: 'var(--elevated)',
  border: '1px solid var(--red)',
  borderRadius: '50%',
  position: 'relative',
  cursor: 'pointer',
  padding: 0,
  overflow: 'hidden',
}

function GoalBadgeCircle({ badge, onSelect, progressPct }: {
  badge: EarnedBadge
  onSelect: (b: EarnedBadge) => void
  progressPct: number
}) {
  const fillPct = Math.min(100, Math.max(0, progressPct))
  const isComplete = fillPct >= 100
  const maskVal = `linear-gradient(to top, black ${fillPct}%, transparent ${fillPct}%)`

  return (
    <button onClick={() => onSelect(badge)} style={CIRCLE_STYLE}>
      {/* Red baseline kanji */}
      <span className="font-jp" style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: 'var(--red)', lineHeight: 1,
      }}>完</span>
      {/* Gold fill from bottom, masked to progressPct */}
      <span className={`font-jp${isComplete ? ' goal-glow' : ''}`} style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.1rem', color: 'var(--gold)', lineHeight: 1,
        WebkitMaskImage: maskVal,
        maskImage: maskVal,
      }}>完</span>
    </button>
  )
}

const TIER_BORDERS = [
  '1px solid var(--red)',
  '1px solid var(--red-bright)',
  '1px solid rgba(201, 168, 76, 0.5)',
  '1px solid var(--gold)',
]

function BadgeRow({
  badges,
  onSelect,
  progressPct,
}: {
  badges: EarnedBadge[]
  onSelect: (b: EarnedBadge) => void
  progressPct: number
}) {
  const allMilestoneIds = new Set(Object.values(ACTIVITY_SERIES_TIERS).flat())

  // Find highest earned tier per activity series
  const seriesHighest: Record<string, { tierIndex: number; badge: EarnedBadge }> = {}
  for (const badge of badges) {
    for (const [series, tiers] of Object.entries(ACTIVITY_SERIES_TIERS)) {
      const tierIndex = tiers.indexOf(badge.badge_id)
      if (tierIndex === -1) continue
      const existing = seriesHighest[series]
      if (!existing || tierIndex > existing.tierIndex) {
        seriesHighest[series] = { tierIndex, badge }
      }
    }
  }

  const nonMilestoneBadges = badges.filter(b => !allMilestoneIds.has(b.badge_id))

  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      overflowX: 'auto',
      padding: '0.75rem 1.5rem',
      scrollbarWidth: 'none',
    }}>
      {nonMilestoneBadges.map(b =>
        b.badge_id === 'goal_reached' ? (
          <GoalBadgeCircle key={b.badge_id} badge={b} onSelect={onSelect} progressPct={progressPct} />
        ) : b.badge_id === 'extreme_mission' ? (
          <button
            key={b.badge_id}
            onClick={() => onSelect(b)}
            style={{ ...CIRCLE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'extremePulse 3s ease-in-out infinite' }}
          >
            <span className="font-jp" style={{ fontSize: '1.1rem', color: 'var(--red)', lineHeight: 1 }}>鬼</span>
          </button>
        ) : (
          <button
            key={b.badge_id}
            onClick={() => onSelect(b)}
            style={{ ...CIRCLE_STYLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <span className="font-jp" style={{ fontSize: '1.1rem', color: 'var(--red)', lineHeight: 1 }}>
              {BADGE_KANJI[b.badge_id] ?? '侍'}
            </span>
          </button>
        )
      )}
      {Object.entries(ACTIVITY_SERIES_TIERS).map(([series, tiers]) => {
        const highest = seriesHighest[series]
        if (!highest) return null
        const isTopTier = highest.tierIndex === tiers.length - 1
        return (
          <button
            key={`series-${series}`}
            onClick={() => onSelect(highest.badge)}
            style={{
              ...CIRCLE_STYLE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: TIER_BORDERS[highest.tierIndex] ?? TIER_BORDERS[0],
            }}
          >
            <span className="font-jp" style={{ fontSize: '1.1rem', color: isTopTier ? 'var(--gold)' : 'var(--red)', lineHeight: 1 }}>
              {BADGE_KANJI[highest.badge.badge_id] ?? '侍'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MealPlanBlock({ calorieTarget, onOpen }: { calorieTarget: number; onOpen: () => void }) {
  const cached = (() => {
    try { return JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as { calorieTarget: number } | null }
    catch { return null }
  })()
  const hasCurrentPlan = cached?.calorieTarget === calorieTarget

  return (
    <div className="mission-block" onClick={onOpen}>
      <BlockHeader label="Meal Plan" />
      {hasCurrentPlan ? (
        <>
          <div style={{ fontSize: '2.2rem', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--text)', marginBottom: '0.3rem' }}>
            7<span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>days</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Plan generated.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '1.05rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.3rem' }}>Generate your week.</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>AI meal plan for {calorieTarget.toLocaleString()} cal/day.</div>
        </>
      )}
    </div>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

function ChevronIcon({ open = false }: { open?: boolean }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 18 18"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{
        color: 'var(--text-3)', flexShrink: 0,
        transition: 'transform 0.2s ease',
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
      }}
    >
      <polyline points="6 4 12 9 6 14" />
    </svg>
  )
}

function BlockHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.26em', color: 'var(--text-2)', textTransform: 'uppercase' }}>{label}</span>
      <ChevronIcon />
    </div>
  )
}

interface StatProps {
  label: string
  value: string
  unit?: string
}

function Stat({ label, value, unit }: StatProps) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginLeft: '0.2rem' }}>{unit}</span>}
      </div>
    </div>
  )
}

interface FoodDetailProps {
  data: { target: number; maintenance: number; deficit: number; meals: Meal[] }
  dayNumber: number
  cheatEntries: CheatEntry[]
  onCheatChange: (entries: CheatEntry[]) => void
}

function FoodDetail({ data, dayNumber, cheatEntries, onCheatChange }: FoodDetailProps) {
  const [expanded, setExpanded]             = useState<Set<string>>(new Set())
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set())
  const [selectedPicks, setSelectedPicks]   = useState<Set<string>>(new Set())
  const [customItems, setCustomItems]       = useState<Array<{ id: string; desc: string; cal: number }>>([])
  const [customDesc, setCustomDesc]         = useState('')
  const [customCal, setCustomCal]           = useState('')

  const mealPlan = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('ronin_meal_plan') || 'null') as MealPlanData | null }
    catch { return null }
  }, [])

  const dayIndex = (dayNumber - 1) % 7
  const planDay  = mealPlan?.days?.[dayIndex] ?? mealPlan?.days?.[0] ?? null

  const toggle = (key: string) => setExpanded(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  const pickTotal   = Array.from(selectedPicks).reduce((sum, id) => {
    for (const g of CHEAT_PICKS) { const it = g.items.find(i => i.id === id); if (it) return sum + it.cal }
    return sum
  }, 0)
  const customTotal = customItems.reduce((s, i) => s + i.cal, 0)
  const sessionTotal = pickTotal + customTotal

  const togglePick = (id: string) => setSelectedPicks(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const handleAddCustom = () => {
    const cal = parseInt(customCal, 10)
    if (!customDesc.trim() || !cal) return
    setCustomItems(prev => [...prev, { id: `c-${Date.now()}`, desc: customDesc.trim(), cal }])
    setCustomDesc(''); setCustomCal('')
  }

  const handleLog = () => {
    if (!sessionTotal) return
    const today = localDateStr()
    const ts = Date.now()
    const newEntries: CheatEntry[] = [
      ...Array.from(selectedPicks).map((id, i) => {
        const item = CHEAT_PICKS.flatMap(g => g.items).find(it => it.id === id)!
        return { id: `${ts + i}-${id}`, description: item.label, calories: item.cal, loggedAt: new Date().toISOString() }
      }),
      ...customItems.map(item => ({ id: item.id, description: item.desc, calories: item.cal, loggedAt: new Date().toISOString() })),
    ]
    const allEntries = [...cheatEntries, ...newEntries]
    localStorage.setItem(`ronin_cheat_meal_${today}`, JSON.stringify(allEntries))
    onCheatChange(allEntries)
    setSelectedPicks(new Set())
    setCustomItems([])
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: inserted } = await supabase.from('cheat_meals').insert(
          newEntries.map(e => ({ user_id: user.id, logged_date: today, description: e.description, calories: e.calories }))
        ).select()
        if (!inserted?.length) return
        // Backfill Supabase UUIDs so removeEntry can issue deletes
        const withIds = [...cheatEntries, ...newEntries.map((e, i) => ({
          ...e,
          supabaseId: (inserted[i] as { id: string } | undefined)?.id,
        }))]
        localStorage.setItem(`ronin_cheat_meal_${today}`, JSON.stringify(withIds))
        onCheatChange(withIds)
      } catch { /* offline */ }
    })()
  }

  const removeEntry = (id: string) => {
    const today = localDateStr()
    const entry = cheatEntries.find(e => e.id === id)
    const updated = cheatEntries.filter(e => e.id !== id)
    localStorage.setItem(`ronin_cheat_meal_${today}`, JSON.stringify(updated))
    onCheatChange(updated)
    if (entry?.supabaseId) {
      const sid = entry.supabaseId
      ;(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return
          await supabase.from('cheat_meals').delete().eq('id', sid)
        } catch { /* offline */ }
      })()
    }
  }

  const todayTotal = cheatEntries.reduce((s, e) => s + e.calories, 0)
  const feedback   = todayTotal > 0 ? getCheatFeedback(todayTotal, data.target) : null

  const GROUP_LABEL: React.CSSProperties = {
    fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)',
    textTransform: 'uppercase', marginBottom: '0.5rem',
  }

  return (
    <div>
      {/* Calorie target header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.6rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1, marginBottom: '0.3rem' }}>
          {data.target.toLocaleString()}
          <span style={{ fontSize: '1rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.4rem' }}>calories</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
          Maintenance: {data.maintenance.toLocaleString()} cal — you are {(data.maintenance - data.target).toLocaleString()} below.
        </div>
      </div>

      {/* Meal breakdown accordion */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {data.meals.map((meal) => {
          const slotKey = meal.name.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snacks'
          const isOpen  = expanded.has(slotKey)
          const items   = planDay ? planDay[slotKey] : null

          return (
            <div key={slotKey} style={{ borderBottom: '1px solid var(--border)' }}>
              <button
                onClick={() => toggle(slotKey)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.9rem 0', fontFamily: 'Inter, sans-serif',
                }}
              >
                <span style={{ fontSize: '0.78rem', letterSpacing: '0.18em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
                  {meal.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--text)' }}>{meal.cal}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>cal</span>
                  </div>
                  <ChevronIcon open={isOpen} />
                </div>
              </button>

              <div style={{ overflow: 'hidden', maxHeight: isOpen ? '1200px' : '0', transition: 'max-height 0.25s ease' }}>
                <div style={{ paddingBottom: '0.75rem' }}>
                  {items && items.length > 0 ? items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.45rem 0' }}>
                      <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.4 }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{item.portion}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.2rem', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>{item.calories}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>cal</span>
                      </div>
                    </div>
                  )) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', lineHeight: 1.6, paddingTop: '0.1rem', paddingBottom: '0.25rem' }}>
                      No meal plan generated yet. Generate one from the Meal Plan block.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Cheat meal section ── */}
      <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
        <div className="field-label" style={{ marginBottom: '1.25rem' }}>Log a Cheat Meal</div>

        {/* Logged today */}
        {cheatEntries.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            {cheatEntries.map(entry => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.6rem 0.75rem', marginBottom: '0.4rem',
                  borderLeft: '2px solid var(--red)', background: 'var(--elevated)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.3 }}>{entry.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '0.1rem' }}>{entry.calories.toLocaleString()} cal</div>
                </div>
                <button onClick={() => removeEntry(entry.id)} aria-label="Remove" className="close-btn">
                  <CloseIcon />
                </button>
              </div>
            ))}
            {feedback && (
              <div style={{ fontSize: '0.85rem', color: feedback.color, letterSpacing: '0.04em', lineHeight: 1.65, marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                {feedback.text}
              </div>
            )}
          </div>
        )}

        {/* Quick picks — collapsible categories */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {CHEAT_PICKS.map(group => {
            const isCatOpen = openCategories.has(group.group)
            return (
              <div key={group.group}>
                <button
                  onClick={() => setOpenCategories(prev => {
                    const next = new Set(prev)
                    if (next.has(group.group)) next.delete(group.group)
                    else next.add(group.group)
                    return next
                  })}
                  style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.9rem 0', borderBottom: '1px solid var(--border)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{group.group}</span>
                  <ChevronIcon open={isCatOpen} />
                </button>
                <div style={{ overflow: 'hidden', maxHeight: isCatOpen ? '600px' : '0', transition: 'max-height 0.25s ease' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.75rem 0 1rem' }}>
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        className={`toggle-btn${selectedPicks.has(item.id) ? ' active' : ''}`}
                        onClick={() => togglePick(item.id)}
                        style={{ minHeight: '44px', lineHeight: 1.3 }}
                      >
                        {item.label} — {item.cal}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Running total */}
        <div style={{
          fontSize: '1rem', fontWeight: 400,
          color: sessionTotal > 0 ? 'var(--text)' : 'var(--text-3)',
          letterSpacing: '0.04em', paddingTop: '0.75rem', marginTop: '0.25rem', marginBottom: '1.25rem',
        }}>
          Total: {sessionTotal.toLocaleString()} cal
        </div>

        {/* Custom entry */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={GROUP_LABEL}>Add Custom</div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <input
              className="input-bare"
              type="text"
              placeholder="Description"
              value={customDesc}
              onChange={e => setCustomDesc(e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              className="input-bare"
              type="number"
              placeholder="cal"
              value={customCal}
              onChange={e => setCustomCal(e.target.value)}
              style={{ width: '64px' }}
              min="1"
            />
            <button
              onClick={handleAddCustom}
              style={{
                background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-2)',
                fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: 'pointer', padding: '0 0.75rem', fontFamily: 'Inter, sans-serif',
                minHeight: '44px', flexShrink: 0,
              }}
            >Add</button>
          </div>
          {customItems.length > 0 && (
            <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {customItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                  <span>{item.desc} — {item.cal} cal</span>
                  <button onClick={() => setCustomItems(prev => prev.filter(i => i.id !== item.id))} aria-label="Remove" className="close-btn">
                    <CloseIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LOG IT */}
        <button
          className="commit-btn"
          onClick={handleLog}
          style={{ opacity: sessionTotal > 0 ? 1 : 0.4 }}
        >
          Log It
        </button>
      </div>

      {/* Note box */}
      <div className="note-box" style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Log every meal honestly. Deviation means recalculation next week.
        </p>
      </div>
    </div>
  )
}

function MovementDetail({ movement, cal, activityLog, onLog, onUnlog }: {
  movement: MovementItem[]
  cal: number
  activityLog: Record<string, number>
  onLog: (id: string, amount: number) => void
  onUnlog: (id: string) => void
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set(Object.keys(activityLog)))
  const [extras, setExtras] = useState<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const [id, amount] of Object.entries(activityLog)) {
      const item = movement.find(m => m.id === id)
      if (!item) continue
      const info = getActivityInfo(id)
      if (!info) continue
      const planned = item.cal / info.rate
      if (amount > planned + 0.01) result[id] = +(amount - planned).toFixed(2)
    }
    return result
  })
  const [expandedExtra, setExpandedExtra] = useState<string | null>(null)
  const [extraDrafts, setExtraDrafts] = useState<Record<string, string>>({})

  const getPlannedAmount = (item: MovementItem): number => {
    const info = getActivityInfo(item.id)
    return info ? item.cal / info.rate : 0
  }

  const handleCheck = (item: MovementItem) => {
    if (checked.has(item.id)) {
      setChecked(prev => { const n = new Set(prev); n.delete(item.id); return n })
      setExtras(prev => { const n = { ...prev }; delete n[item.id]; return n })
      setExpandedExtra(prev => prev === item.id ? null : prev)
      onUnlog(item.id)
    } else {
      setChecked(prev => new Set([...prev, item.id]))
      onLog(item.id, getPlannedAmount(item))
    }
  }

  const handleExtraConfirm = (item: MovementItem) => {
    const extra = parseFloat(extraDrafts[item.id] ?? '')
    if (isNaN(extra) || extra <= 0) return
    setExtras(prev => ({ ...prev, [item.id]: extra }))
    setExpandedExtra(null)
    onLog(item.id, getPlannedAmount(item) + extra)
  }

  const totalSurplusCal = movement.reduce((sum, item) => {
    const extra = extras[item.id]
    if (!extra) return sum
    const info = getActivityInfo(item.id)
    return sum + Math.round(extra * (info?.rate ?? 0))
  }, 0)

  const allChecked = movement.length > 0 && checked.size === movement.length
  const summaryText = checked.size === 0
    ? { text: 'Log your movement below.', color: 'var(--text-3)' }
    : totalSurplusCal > 0
      ? { text: `${totalSurplusCal.toLocaleString()} cal above target today.`, color: 'var(--green)' }
      : allChecked
        ? { text: 'Mission complete.', color: 'var(--red)' }
        : null

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '2.1rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1, marginBottom: '0.25rem' }}>
          {cal}<span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>cal burn</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Required. Not optional.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {movement.map((item) => (
          <div key={item.id} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: '1px', height: '1.15rem', background: 'var(--red)', marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        {summaryText && (
          <div style={{ fontSize: '0.85rem', color: summaryText.color, marginBottom: '1.25rem' }}>
            {summaryText.text}
          </div>
        )}
        {movement.map((item) => {
          const isCheckedItem = checked.has(item.id)
          const info = getActivityInfo(item.id)
          const unitLabel = info?.type === 'distance' ? 'mi' : 'min'
          const isExpanded = expandedExtra === item.id
          const extraAmount = extras[item.id]
          const surplusCal = extraAmount && info ? Math.round(extraAmount * info.rate) : 0

          return (
            <div key={item.id} style={{ marginBottom: '0.75rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', minHeight: '44px',
                paddingLeft: isCheckedItem ? '0.75rem' : '0',
                borderLeft: isCheckedItem ? '2px solid var(--red)' : '2px solid transparent',
              }}>
                <button
                  onClick={() => handleCheck(item)}
                  aria-label={isCheckedItem ? 'Uncheck' : 'Check'}
                  style={{
                    width: '44px', height: '44px', flexShrink: 0,
                    background: 'none', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: 0,
                  }}
                >
                  <div style={{
                    width: '22px', height: '22px',
                    background: isCheckedItem ? 'var(--red)' : 'none',
                    border: `1px solid ${isCheckedItem ? 'var(--red)' : 'var(--border-mid)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.12s ease', flexShrink: 0,
                  }}>
                    {isCheckedItem && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
                <span style={{ flex: 1, fontSize: '0.9rem', color: isCheckedItem ? 'var(--text)' : 'var(--text-2)', lineHeight: 1.4 }}>
                  {ACTIVITY_LABEL[item.id] ?? item.id}
                </span>
                {isCheckedItem && !isExpanded && (
                  extraAmount ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--green)' }}>+{surplusCal} cal</span>
                      <button
                        onClick={() => setExpandedExtra(item.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', letterSpacing: '0.08em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', minHeight: '44px', minWidth: '44px' }}
                      >edit</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setExpandedExtra(item.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', letterSpacing: '0.08em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', minHeight: '44px', flexShrink: 0 }}
                    >I did more</button>
                  )
                )}
              </div>
              {isCheckedItem && isExpanded && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem', paddingLeft: '2.75rem' }}>
                  <input
                    className="input-bare"
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={extraDrafts[item.id] ?? (extraAmount ? String(extraAmount) : '')}
                    onChange={e => setExtraDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                    style={{ width: '60px', textAlign: 'right', fontSize: '0.85rem', padding: '0 0.25rem' }}
                    autoFocus
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', flexShrink: 0 }}>{unitLabel} extra</span>
                  <button
                    onClick={() => handleExtraConfirm(item)}
                    style={{
                      background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-2)',
                      fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                      cursor: 'pointer', padding: '0 0.6rem', fontFamily: 'Inter, sans-serif',
                      minHeight: '36px', flexShrink: 0,
                    }}
                  >Confirm</button>
                  <button
                    onClick={() => setExpandedExtra(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', minHeight: '36px' }}
                  >Cancel</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="note-box" style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          This is the minimum. Go beyond if you have the will.
        </p>
      </div>
    </div>
  )
}

function ProgressDetail({ plan }: { plan: PlanResult }) {
  const { unit, startWeight, currentWeight, goalWeight, poundsToLose, daysLeft, pacePerWeek } = plan
  const stats = [
    { label: 'Start',     value: wtDisplay(startWeight, unit)   },
    { label: 'Current',   value: wtDisplay(currentWeight, unit) },
    { label: 'Goal',      value: wtDisplay(goalWeight, unit)    },
    { label: 'Remaining', value: wtDisplay(poundsToLose, unit)  },
    { label: 'Days Left', value: String(daysLeft)               },
    { label: 'Pace',      value: paceDisplay(pacePerWeek, unit) },
  ]
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', marginBottom: '1.5rem' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{s.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text)' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div className="note-box">
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Check in weekly. Weight logged every 7 days. The plan adjusts to reality.
        </p>
      </div>
    </div>
  )
}
