import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import SettingsSheet from './SettingsSheet'
import CheckinSheet from './CheckinSheet'
import { calculatePlan } from '../utils/calculate'
import { supabase } from '../lib/supabase'
import ShareSheet from './ShareSheet'

function formatDate(d) {
  const day   = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year  = d.getFullYear()
  return `${day} ${month} ${year}`
}

function loadPlan() {
  try {
    const profile   = JSON.parse(localStorage.getItem('ronin_profile') || 'null')
    const startRaw  = localStorage.getItem('ronin_start')
    const startDate = startRaw ? new Date(startRaw) : new Date()
    if (!profile) return null
    if (!profile.sex || !profile.weightLbs || !profile.age || !profile.targetWeeks) return null
    return calculatePlan(profile, startDate)
  } catch {
    return null
  }
}

function wtDisplay(lbs, unit) {
  if (unit === 'metric') return `${(lbs / 2.20462).toFixed(1)} kg`
  return `${lbs} lbs`
}

function wtVal(lbs, unit) {
  return unit === 'metric' ? (lbs / 2.20462).toFixed(1) : String(lbs)
}

function paceDisplay(pace, unit) {
  if (unit === 'metric') return `${(pace / 2.20462).toFixed(2)} kg/wk`
  return `${pace} lbs/wk`
}

export default function Dashboard({ onReset, onAdjustGoal, onSignOut }) {
  const [sheet, setSheet] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [checkinOpen, setCheckinOpen] = useState(false)
  const [streak, setStreak] = useState(() => parseInt(localStorage.getItem('ronin_streak') || '1', 10))
  const [loggedDays, setLoggedDays] = useState(new Set())
  const [shareOpen, setShareOpen] = useState(false)
  const plan = loadPlan()

  useEffect(() => {
    async function logAndCalcStreak() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const today = new Date().toISOString().split('T')[0]

        await supabase.from('daily_logs').upsert(
          { user_id: user.id, logged_date: today },
          { onConflict: 'user_id,logged_date', ignoreDuplicates: true }
        )

        const { data: logs } = await supabase
          .from('daily_logs')
          .select('logged_date')
          .eq('user_id', user.id)
          .order('logged_date', { ascending: false })
          .limit(365)

        if (!logs) return

        const dateSet = new Set(logs.map(r => r.logged_date))

        // Count consecutive days back from today
        let count = 0
        const cur = new Date()
        while (true) {
          const ds = cur.toISOString().split('T')[0]
          if (dateSet.has(ds)) {
            count++
            cur.setDate(cur.getDate() - 1)
          } else {
            break
          }
        }

        // Which of the last 7 days have entries
        const last7 = new Set()
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
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
    unit,
    unsustainable, realisticEndDate,
    startWeight, currentWeight, goalWeight, poundsToLose,
    date, dayNumber, daysLeft, totalDays, weekNumber,
    maintenance, dailyDeficit, calorieTarget, exerciseBurn,
    meals, movement, movementCal,
  } = plan

  const progressPct = Math.max(1, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100)

  const lastCheckin = parseInt(localStorage.getItem('ronin_last_checkin') || '0', 10)
  const showCheckin = dayNumber % 7 === 0 && lastCheckin !== weekNumber

  return (
    <div
      style={{
        minHeight: '100svh',
        background: 'var(--bg)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '480px',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.6rem 1.5rem',
          borderBottom: '1px solid var(--border-mid)',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <span className="font-jp" style={{ fontSize: '2.2rem', color: 'var(--red)', lineHeight: 1 }}>
            侍
          </span>
          <div>
            <div
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                letterSpacing: '0.22em',
                color: 'var(--text)',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              RONIN
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                fontWeight: 300,
                letterSpacing: '0.6em',
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                marginTop: '0.2rem',
              }}
            >
              DAILY
            </div>
          </div>
        </div>

        {/* Settings */}
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          style={{
            background: 'none',
            border: 'none',
            padding: '0.25rem',
            cursor: 'pointer',
            color: 'var(--text-3)',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          <svg width="20" height="15" viewBox="0 0 16 12" fill="none">
            <line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="1"/>
            <circle cx="6" cy="2" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
            <line x1="0" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1"/>
            <circle cx="10" cy="10" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>

      {/* Date + heading */}
      <div style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
        <div style={{ fontSize: '0.78rem', letterSpacing: '0.12em', color: 'var(--text-2)', marginBottom: '0.2rem' }}>
          {formatDate(date)} — DAY {dayNumber}
        </div>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Mission Briefing
        </div>
      </div>

      {/* Progress blade */}
      <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>{wtDisplay(startWeight, unit)}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text)' }}>
            {wtDisplay(poundsToLose, unit)} · {daysLeft} days
          </span>
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
        <div
          style={{
            margin: '0 1.5rem 1rem',
            padding: '0.9rem 1rem',
            borderLeft: '2px solid var(--red-bright)',
            background: 'var(--elevated)',
          }}
        >
          <div
            style={{
              fontSize: '0.72rem',
              letterSpacing: '0.18em',
              color: 'var(--red-bright)',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            Timeline Not Realistic
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
            Your timeline is not realistic. Adjusted completion:{' '}
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>
              {formatDate(realisticEndDate)}
            </span>
            . Commit to the math or change the goal.
          </p>
        </div>
      )}

      {/* Check-in banner */}
      {showCheckin && (
        <div
          onClick={() => setCheckinOpen(true)}
          style={{
            margin: '0 1.5rem 1rem',
            padding: '0.9rem 1rem',
            borderLeft: '2px solid var(--red)',
            background: 'var(--elevated)',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
            Week {weekNumber} complete. Log your weight.
          </span>
        </div>
      )}

      {/* Mission blocks */}
      <div
        style={{
          padding: '0 1.5rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* FOOD */}
        <div className="mission-block" onClick={() => setSheet('food')}>
          <BlockHeader label="Food" />
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text)',
              marginBottom: '0.3rem',
            }}
          >
            {calorieTarget.toLocaleString()}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>
              cal
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
            Deficit: {(maintenance - calorieTarget).toLocaleString()} cal below maintenance.
          </div>
        </div>

        {/* MOVEMENT */}
        <div className="mission-block" onClick={() => setSheet('movement')}>
          <BlockHeader label="Movement" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.3rem' }}>
            {movement.map((m, i) => (
              <div key={i} style={{ fontSize: '1.05rem', color: 'var(--text)', fontWeight: 400 }}>
                {m}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-2)' }}>
            {movementCal} cal burn required.
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mission-block" onClick={() => setSheet('progress')}>
          <BlockHeader label="Progress" />
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Stat label="Remaining" value={wtVal(poundsToLose, unit)} unit={unit === 'metric' ? 'kg' : 'lbs'} />
            <Stat label="Days Left" value={`${daysLeft}`} />
            <Stat label="Streak"    value={`${streak}`} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '1rem 1.5rem 0',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '3px' }}>
          {Array.from({ length: 7 }).map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            const ds = d.toISOString().split('T')[0]
            return <div key={i} className={`pip${loggedDays.has(ds) ? '' : ' empty'}`} />
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Week {weekNumber}
          </span>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share"
            style={{
              background: 'none',
              border: 'none',
              padding: '0.25rem',
              cursor: 'pointer',
              color: 'var(--text-3)',
              display: 'flex',
              alignItems: 'center',
              lineHeight: 1,
            }}
          >
            <svg width="11" height="13" viewBox="0 0 11 13" fill="none">
              <line x1="5.5" y1="9" x2="5.5" y2="1" stroke="currentColor" strokeWidth="1"/>
              <polyline points="2.5,4 5.5,1 8.5,4" stroke="currentColor" strokeWidth="1" fill="none"/>
              <polyline points="1,7 1,12 10,12 10,7" stroke="currentColor" strokeWidth="1" fill="none"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom sheets */}
      <BottomSheet open={sheet === 'food'} onClose={() => setSheet(null)} title="Food">
        <FoodDetail data={{ target: calorieTarget, maintenance, deficit: dailyDeficit, meals }} />
      </BottomSheet>

      <BottomSheet open={sheet === 'movement'} onClose={() => setSheet(null)} title="Movement">
        <MovementDetail movement={movement} cal={movementCal} />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={() => setSheet(null)} title="Progress">
        <ProgressDetail plan={plan} />
      </BottomSheet>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        streak={streak}
        plan={plan}
      />

      <CheckinSheet
        open={checkinOpen}
        onClose={() => setCheckinOpen(false)}
        plan={plan}
      />

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onAdjustGoal={onAdjustGoal}
        onReset={onReset}
        onSignOut={onSignOut}
      />
    </div>
  )
}

function BlockHeader({ label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
      <span style={{ fontSize: '0.75rem', letterSpacing: '0.26em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>›</span>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.55rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginLeft: '0.2rem' }}>{unit}</span>}
      </div>
    </div>
  )
}

function FoodDetail({ data }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div
          style={{
            fontSize: '2.6rem',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            lineHeight: 1,
            marginBottom: '0.3rem',
          }}
        >
          {data.target.toLocaleString()}
          <span style={{ fontSize: '1rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.4rem' }}>
            calories
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>
          Maintenance: {data.maintenance.toLocaleString()} cal — you are {(data.maintenance - data.target).toLocaleString()} below.
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }}>
        {data.meals.map((meal, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              padding: '0.9rem 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <span style={{ fontSize: '0.78rem', letterSpacing: '0.18em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
              {meal.name}
            </span>
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

function MovementDetail({ movement, cal }) {
  return (
    <div>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontSize: '2.1rem',
            fontWeight: 300,
            color: 'var(--text)',
            lineHeight: 1,
            marginBottom: '0.25rem',
          }}
        >
          {cal}
          <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>
            cal burn
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Required. Not optional.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {movement.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '1px',
                height: '1.15rem',
                background: 'var(--red)',
                marginTop: '0.15rem',
                flexShrink: 0,
              }}
            />
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

function ProgressDetail({ plan }) {
  const { unit, startWeight, currentWeight, goalWeight, poundsToLose, daysLeft, pacePerWeek } = plan

  const stats = [
    { label: 'Start',     value: wtDisplay(startWeight, unit)   },
    { label: 'Current',   value: wtDisplay(currentWeight, unit)  },
    { label: 'Goal',      value: wtDisplay(goalWeight, unit)     },
    { label: 'Remaining', value: wtDisplay(poundsToLose, unit)   },
    { label: 'Days Left', value: daysLeft                        },
    { label: 'Pace',      value: paceDisplay(pacePerWeek, unit)  },
  ]

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1px',
          background: 'var(--border)',
          marginBottom: '1.5rem',
        }}
      >
        {stats.map((s, i) => (
          <div key={i} style={{ background: 'var(--surface)', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--text)' }}>
              {s.value}
            </div>
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
