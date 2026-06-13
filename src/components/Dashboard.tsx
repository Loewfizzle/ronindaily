import React, { useState, useEffect, useRef, useCallback } from 'react'
import BottomSheet from './BottomSheet'
import SettingsSheet from './SettingsSheet'
import CheckinSheet from './CheckinSheet'
import ShareSheet from './ShareSheet'
import MealPlanSheet from './MealPlanSheet'
import BadgeBanner from './BadgeBanner'
import BadgeDetailSheet from './BadgeDetailSheet'
import { calculatePlan, formatMovementItem } from '../utils/calculate'
import { checkAndAwardBadges, BADGE_KANJI } from '../utils/badges'
import { supabase } from '../lib/supabase'
import type { PlanResult, Meal, UnitSystem, MovementItem } from '../types'
import type { BadgeDef } from '../utils/badges'

interface EarnedBadge {
  badge_id: string
  earned_at: string
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
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Week {weekNumber}
        </span>
        <button
          onClick={onShare}
          aria-label="Share"
          style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', lineHeight: 1 }}
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
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`ronin_dismissed_activities_${localDateStr()}`)
      return raw ? (JSON.parse(raw) as string[]) : []
    } catch { return [] }
  })
  const plan = loadPlan()
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

  // Persist progress milestones as a side-effect, not in the render body.
  useEffect(() => {
    const p = planRef.current
    if (!p) return
    if (showCheckin && progressPct > parseFloat(localStorage.getItem('ronin_best_progress') || '0')) {
      localStorage.setItem('ronin_best_progress', String(progressPct))
    }
    if (progressPct >= 100 && !localStorage.getItem('ronin_goal_reached')) {
      localStorage.setItem('ronin_goal_reached', 'true')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressPct, showCheckin])

  useEffect(() => {
    async function logAndCalcStreak() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = localDateStr()
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
          })
          if (newBadges.length > 0) {
            setBadgeQueue(newBadges)
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

  if (!plan) {
    return (
      <div style={{ minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-2)', letterSpacing: '0.1em' }}>
          No mission data found.{' '}
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', padding: 0 }}>
            Start over.
          </button>
        </div>
      </div>
    )
  }

  const {
    unit, unsustainable, realisticEndDate,
    startWeight, currentWeight, goalWeight, poundsToLose,
    date, dayNumber, daysLeft, totalDays, weekNumber,
    maintenance, dailyDeficit, calorieTarget, exerciseBurn,
    meals, movement, movementCal,
  } = plan

  // progressPct, lastCheckin, showCheckin, savedBest, bestProgress computed above the early return.

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

  const handleBadgeDismiss = useCallback(() => {
    setBadgeQueue(prev => prev.slice(1))
  }, [])

  const handleSkipConfirm = async () => {
    const today = localDateStr()
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
    setTimeout(() => setSkipConfirmed(false), 3000)
  }

  const footerProps = { loggedDays, weekNumber, onShare: () => setShareOpen(true) }

  return (
    <div className="dash-root">

      {/* ── LEFT COLUMN ─────────────────────────────────────────────── */}
      <div className="dash-left">

        {/* Header: branding + settings */}
        <div className="dash-header">
          <div className="dash-brand">
            <span className="font-jp dash-kanji">侍</span>
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
          <div style={{ padding: '0.6rem 1.5rem 0', fontSize: '0.7rem', color: 'var(--red-bright)', letterSpacing: '0.04em' }}>
            {connectionWarning}
          </div>
        )}

        {/* Date + day heading */}
        <div style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
          <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', color: 'var(--text-2)', marginBottom: '0.2rem' }}>
            {formatDate(date)} — DAY {dayNumber}
          </div>
          {/* "Mission Briefing" shows here on mobile; on desktop it moves to the right column */}
          <div className="dash-mobile-subtitle" style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Mission Briefing
          </div>
        </div>

        {/* Progress blade */}
        <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{wtDisplay(startWeight, unit)}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{wtDisplay(poundsToLose, unit)} · {daysLeft} days</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{wtDisplay(goalWeight, unit)}</span>
          </div>
          <div className="blade-wrap">
            <div className="blade-fill" style={{ width: `${progressPct}%` }} />
            <div className="blade-dot start" />
            <div className="blade-dot end" />
          </div>
        </div>

        {/* Unsustainable warning */}
        {unsustainable && realisticEndDate && (
          <div style={{ margin: '0 1.5rem 1rem', padding: '0.9rem 1rem', borderLeft: '2px solid var(--red-bright)', background: 'var(--elevated)' }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--red-bright)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              Timeline Not Realistic
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
              Your timeline is not realistic. Adjusted completion:{' '}
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{formatDate(realisticEndDate)}</span>.
              Commit to the math or change the goal.
            </p>
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
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
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
            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
              Deficit: {(maintenance - calorieTarget).toLocaleString()} cal below maintenance.
            </div>
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
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-3)',
                        cursor: 'pointer', fontSize: '0.65rem',
                        minWidth: '44px', minHeight: '44px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 0.25rem',
                      }}
                    >
                      ✕
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
                      fontSize: '0.7rem', letterSpacing: '0.04em',
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
                    fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: 'pointer', padding: '0.1rem 0', textAlign: 'left',
                    minHeight: '44px', fontFamily: 'Inter, sans-serif', display: 'block',
                  }}
                >
                  Reset
                </button>
              </div>
            )}
            <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>{movementCal} cal burn required.</div>
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
              style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.65rem', letterSpacing: '0.1em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif', opacity: 0.5 }}
            >
              I skipped today.
            </button>
          </div>
        )}
      </div>

      {/* ── Sheets ──────────────────────────────────────────────────── */}
      <BottomSheet open={sheet === 'food'} onClose={() => setSheet(null)} title="Food">
        <FoodDetail data={{ target: calorieTarget, maintenance, deficit: dailyDeficit, meals }} />
      </BottomSheet>

      <BottomSheet open={sheet === 'movement'} onClose={() => setSheet(null)} title="Movement">
        <MovementDetail movement={activePrescriptions} cal={movementCal} />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={() => setSheet(null)} title="Progress">
        <ProgressDetail plan={plan} />
      </BottomSheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} streak={streak} plan={plan} />
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} plan={plan} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onAdjustGoal={onAdjustGoal} onReset={onReset} onSignOut={onSignOut} />
      <MealPlanSheet open={mealPlanOpen} onClose={() => setMealPlanOpen(false)} calorieTarget={calorieTarget} unit={unit} />

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
            <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.85, marginBottom: '2.5rem' }}>
              You have dishonored your name and your family.
            </div>
            <button className="commit-btn" onClick={handleSkipConfirm} style={{ marginBottom: '1.5rem' }}>
              I Accept This Failure
            </button>
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setSkipOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.72rem', letterSpacing: '0.12em', cursor: 'pointer', padding: 0, fontFamily: 'Inter, sans-serif' }}
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
            fontSize: '0.78rem', color: '#ffffff',
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

function BadgeRow({
  badges,
  onSelect,
  progressPct,
}: {
  badges: EarnedBadge[]
  onSelect: (b: EarnedBadge) => void
  progressPct: number
}) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.5rem',
      overflowX: 'auto',
      padding: '0.75rem 1.5rem',
      scrollbarWidth: 'none',
    }}>
      {badges.map(b =>
        b.badge_id === 'goal_reached' ? (
          <GoalBadgeCircle key={b.badge_id} badge={b} onSelect={onSelect} progressPct={progressPct} />
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
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>Weekly plan ready.</div>
        </>
      ) : (
        <>
          <div style={{ fontSize: '1.05rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.3rem' }}>Generate your week.</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>AI meal plan for {calorieTarget.toLocaleString()} cal/day.</div>
        </>
      )}
    </div>
  )
}

function BlockHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.26em', color: 'var(--text-2)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>›</span>
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
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>{label}</div>
      <div style={{ fontSize: '1.55rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginLeft: '0.2rem' }}>{unit}</span>}
      </div>
    </div>
  )
}

interface FoodDetailProps {
  data: { target: number; maintenance: number; deficit: number; meals: Meal[] }
}

function FoodDetail({ data }: FoodDetailProps) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '2.6rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--text)', lineHeight: 1, marginBottom: '0.3rem' }}>
          {data.target.toLocaleString()}
          <span style={{ fontSize: '1rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.4rem' }}>calories</span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
          Maintenance: {data.maintenance.toLocaleString()} cal — you are {(data.maintenance - data.target).toLocaleString()} below.
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {data.meals.map((meal, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0.9rem 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', letterSpacing: '0.18em', color: 'var(--text-2)', textTransform: 'uppercase' }}>{meal.name}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--text)' }}>{meal.cal}</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>cal</span>
            </div>
          </div>
        ))}
      </div>
      <div className="note-box" style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Log every meal honestly. Deviation means recalculation next week.
        </p>
      </div>
    </div>
  )
}

function MovementDetail({ movement, cal }: { movement: MovementItem[]; cal: number }) {
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
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{s.label}</div>
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
