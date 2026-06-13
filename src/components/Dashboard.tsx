import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import SettingsSheet from './SettingsSheet'
import CheckinSheet from './CheckinSheet'
import ShareSheet from './ShareSheet'
import { calculatePlan } from '../utils/calculate'
import { supabase } from '../lib/supabase'
import type { PlanResult, Meal, UnitSystem } from '../types'

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
    const startDate = startRaw ? new Date(startRaw) : new Date()
    if (!profile) return null
    if (!profile.sex || !profile.weightLbs || !profile.age || !profile.targetWeeks) return null
    return calculatePlan(profile, startDate)
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
  return `${pace} lbs/wk`
}

function localDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  const [streak, setStreak]             = useState<number>(() => parseInt(localStorage.getItem('ronin_streak') || '1', 10))
  const [loggedDays, setLoggedDays]     = useState<Set<string>>(new Set())
  const plan = loadPlan()

  useEffect(() => {
    async function logAndCalcStreak() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = localDateStr()

        await supabase.from('daily_logs').upsert(
          { user_id: user.id, logged_date: today },
          { onConflict: 'user_id,logged_date', ignoreDuplicates: true },
        )

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

        setStreak(count)
        setLoggedDays(last7)
        localStorage.setItem('ronin_streak', String(count))
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

  const progressPct = Math.min(100, Math.max(1, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100))
  const lastCheckin  = parseInt(localStorage.getItem('ronin_last_checkin') || '0', 10)
  const showCheckin  = dayNumber % 7 === 0 && lastCheckin !== weekNumber

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.3rem' }}>
              {movement.map((m, i) => (
                <div key={i} style={{ fontSize: '1.05rem', color: 'var(--text)', fontWeight: 400 }}>{m}</div>
              ))}
            </div>
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
        </div>

        {/* Footer — mobile only (hidden on desktop) */}
        <div className="dash-footer dash-footer-mobile" style={{ padding: '1rem 1.5rem 0', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FooterContent {...footerProps} />
        </div>
      </div>

      {/* ── Sheets ──────────────────────────────────────────────────── */}
      <BottomSheet open={sheet === 'food'} onClose={() => setSheet(null)} title="Food">
        <FoodDetail data={{ target: calorieTarget, maintenance, deficit: dailyDeficit, meals }} />
      </BottomSheet>

      <BottomSheet open={sheet === 'movement'} onClose={() => setSheet(null)} title="Movement">
        <MovementDetail movement={movement} cal={movementCal} />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={() => setSheet(null)} title="Progress">
        <ProgressDetail plan={plan} />
      </BottomSheet>

      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} streak={streak} plan={plan} />
      <CheckinSheet open={checkinOpen} onClose={() => setCheckinOpen(false)} plan={plan} />
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} onAdjustGoal={onAdjustGoal} onReset={onReset} onSignOut={onSignOut} />
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

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

interface MovementDetailProps {
  movement: string[]
  cal: number
}

function MovementDetail({ movement, cal }: MovementDetailProps) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: '2.1rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1, marginBottom: '0.25rem' }}>
          {cal}<span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>cal burn</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Required. Not optional.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {movement.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ width: '1px', height: '1.15rem', background: 'var(--red)', marginTop: '0.15rem', flexShrink: 0 }} />
            <span style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.5 }}>{m}</span>
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
