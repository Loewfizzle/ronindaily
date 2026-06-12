import { useState } from 'react'
import BottomSheet from './BottomSheet'
import SettingsSheet from './SettingsSheet'
import { calculatePlan } from '../utils/calculate'

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
    return calculatePlan(profile, startDate)
  } catch {
    return null
  }
}

export default function Dashboard({ onReset, onAdjustGoal }) {
  const [sheet, setSheet] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const plan = loadPlan()

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
    unsustainable, realisticEndDate,
    startWeight, currentWeight, goalWeight, poundsToLose,
    date, dayNumber, daysLeft, totalDays, weekNumber,
    maintenance, dailyDeficit, calorieTarget, exerciseBurn,
    meals, movement, movementCal, streak,
  } = plan

  const progressPct = Math.max(1, ((startWeight - currentWeight) / (startWeight - goalWeight)) * 100)

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
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-mid)',
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="font-jp" style={{ fontSize: '1.4rem', color: 'var(--red)', lineHeight: 1 }}>
            侍
          </span>
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
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
                fontSize: '0.55rem',
                fontWeight: 300,
                letterSpacing: '0.52em',
                color: 'var(--text-2)',
                textTransform: 'uppercase',
                lineHeight: 1.2,
                marginTop: '0.15rem',
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
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <line x1="0" y1="2" x2="16" y2="2" stroke="currentColor" strokeWidth="1"/>
            <circle cx="6" cy="2" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
            <line x1="0" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1"/>
            <circle cx="10" cy="10" r="2" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>

      {/* Date + heading */}
      <div style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: 'var(--text-2)', marginBottom: '0.2rem' }}>
          {formatDate(date)} — DAY {dayNumber}
        </div>
        <div style={{ fontSize: '0.65rem', letterSpacing: '0.28em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Mission Briefing
        </div>
      </div>

      {/* Progress blade */}
      <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>{startWeight} lbs</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text)' }}>
            {poundsToLose} lbs · {daysLeft} days
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-2)' }}>{goalWeight} lbs</span>
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
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              color: 'var(--red-bright)',
              textTransform: 'uppercase',
              marginBottom: '0.4rem',
            }}
          >
            Timeline Not Realistic
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
            Your timeline is not realistic. Adjusted completion:{' '}
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>
              {formatDate(realisticEndDate)}
            </span>
            . Commit to the math or change the goal.
          </p>
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
              fontSize: '1.9rem',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              color: 'var(--text)',
              marginBottom: '0.3rem',
            }}
          >
            {calorieTarget.toLocaleString()}
            <span style={{ fontSize: '0.78rem', color: 'var(--text-2)', fontWeight: 400, marginLeft: '0.35rem' }}>
              cal
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>
            Deficit: {dailyDeficit} cal below maintenance.
          </div>
        </div>

        {/* MOVEMENT */}
        <div className="mission-block" onClick={() => setSheet('movement')}>
          <BlockHeader label="Movement" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.3rem' }}>
            {movement.map((m, i) => (
              <div key={i} style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 400 }}>
                {m}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>
            {movementCal} cal burn required.
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mission-block" onClick={() => setSheet('progress')}>
          <BlockHeader label="Progress" />
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Stat label="Remaining" value={`${poundsToLose}`} unit="lbs" />
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
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className={`pip${i < streak ? '' : ' empty'}`} />
          ))}
        </div>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
          Week {weekNumber}
        </span>
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

      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onAdjustGoal={onAdjustGoal}
        onReset={onReset}
      />
    </div>
  )
}

function BlockHeader({ label }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
      <span style={{ fontSize: '0.68rem', letterSpacing: '0.26em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>›</span>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', letterSpacing: '0.12em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.15rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginLeft: '0.2rem' }}>{unit}</span>}
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
        <div style={{ fontSize: '0.68rem', color: 'var(--text-2)' }}>
          Maintenance: {data.maintenance.toLocaleString()} cal — you are {data.deficit} below.
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
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.18em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
              {meal.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 300, color: 'var(--text)' }}>{meal.cal}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>cal</span>
            </div>
          </div>
        ))}
      </div>

      <div className="note-box" style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
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
        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>Required. Not optional.</div>
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
            <span style={{ fontSize: '1rem', color: 'var(--text)', lineHeight: 1.5 }}>{m}</span>
          </div>
        ))}
      </div>

      <div className="note-box" style={{ marginTop: '1.5rem' }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          This is the minimum. Go beyond if you have the will.
        </p>
      </div>
    </div>
  )
}

function ProgressDetail({ plan }) {
  const { startWeight, currentWeight, goalWeight, poundsToLose, daysLeft, pacePerWeek } = plan

  const stats = [
    { label: 'Start',     value: `${startWeight} lbs`   },
    { label: 'Current',   value: `${currentWeight} lbs`  },
    { label: 'Goal',      value: `${goalWeight} lbs`     },
    { label: 'Remaining', value: `${poundsToLose} lbs`   },
    { label: 'Days Left', value: daysLeft                 },
    { label: 'Pace',      value: `${pacePerWeek} lbs/wk` },
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
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="note-box">
        <p style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Check in weekly. Weight logged every 7 days. The plan adjusts to reality.
        </p>
      </div>
    </div>
  )
}
