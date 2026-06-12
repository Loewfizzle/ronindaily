import { useState } from 'react'
import BottomSheet from './BottomSheet'

const MOCK = {
  date: new Date(2026, 5, 12),
  day: 1,
  totalDays: 47,
  currentWeight: 195,
  goalWeight: 175,
  startWeight: 195,
  calories: {
    target: 1847,
    maintenance: 2394,
    deficit: 547,
    meals: [
      { name: 'Breakfast', cal: 456 },
      { name: 'Lunch', cal: 612 },
      { name: 'Dinner', cal: 613 },
      { name: 'Snacks', cal: 166 },
    ],
  },
  movement: [
    'Walk 2.4 miles.',
    '15 min resistance training.',
  ],
  movementCal: 347,
  streak: 1,
}

function formatDate(d) {
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year = d.getFullYear()
  return `${day} ${month} ${year}`
}

export default function Dashboard({ onReset }) {
  const [sheet, setSheet] = useState(null)
  const d = MOCK

  const poundsLeft = d.currentWeight - d.goalWeight
  const daysLeft = d.totalDays - d.day
  const progressPct = Math.max(1, ((d.startWeight - d.currentWeight) / (d.startWeight - d.goalWeight)) * 100)

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
      {/* Nav */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span
          style={{
            fontSize: '0.58rem',
            letterSpacing: '0.3em',
            color: 'var(--text-2)',
            textTransform: 'uppercase',
          }}
        >
          Ronin Daily
        </span>
        <span className="font-jp" style={{ fontSize: '1rem', color: 'var(--red)', lineHeight: 1 }}>
          侍
        </span>
      </div>

      {/* Date + heading */}
      <div style={{ padding: '1.4rem 1.5rem 0.75rem' }}>
        <div
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.14em',
            color: 'var(--text-2)',
            marginBottom: '0.2rem',
          }}
        >
          {formatDate(d.date)} — DAY {d.day}
        </div>
        <div
          style={{
            fontSize: '0.5rem',
            letterSpacing: '0.32em',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
          }}
        >
          Mission Briefing
        </div>
      </div>

      {/* Progress blade */}
      <div style={{ padding: '0.5rem 1.5rem 1.5rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '0.45rem',
          }}
        >
          <span style={{ fontSize: '0.58rem', color: 'var(--text-2)' }}>
            {d.startWeight} lbs
          </span>
          <span style={{ fontSize: '0.58rem', color: 'var(--text)' }}>
            {poundsLeft} lbs · {daysLeft} days
          </span>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-2)' }}>
            {d.goalWeight} lbs
          </span>
        </div>

        <div className="blade-wrap">
          <div className="blade-fill" style={{ width: `${progressPct}%` }} />
          <div className="blade-dot start" />
          <div className="blade-dot end" />
        </div>
      </div>

      {/* Mission blocks */}
      <div style={{ padding: '0 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

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
            {d.calories.target.toLocaleString()}
            <span
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-2)',
                fontWeight: 400,
                marginLeft: '0.35rem',
              }}
            >
              cal
            </span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>
            Deficit: {d.calories.deficit} cal below maintenance.
          </div>
        </div>

        {/* MOVEMENT */}
        <div className="mission-block" onClick={() => setSheet('movement')}>
          <BlockHeader label="Movement" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.3rem' }}>
            {d.movement.map((m, i) => (
              <div key={i} style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 400 }}>
                {m}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>
            {d.movementCal} cal burn required.
          </div>
        </div>

        {/* PROGRESS */}
        <div className="mission-block" onClick={() => setSheet('progress')}>
          <BlockHeader label="Progress" />
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Stat label="Remaining" value={`${poundsLeft}`} unit="lbs" />
            <Stat label="Days Left" value={`${daysLeft}`} />
            <Stat label="Streak" value={`${d.streak}`} />
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
            <div key={i} className={`pip${i < d.streak ? '' : ' empty'}`} />
          ))}
        </div>
        <span
          style={{
            fontSize: '0.52rem',
            letterSpacing: '0.12em',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
          }}
        >
          Week 1
        </span>
      </div>

      {/* Bottom sheets */}
      <BottomSheet open={sheet === 'food'} onClose={() => setSheet(null)} title="Food">
        <FoodDetail data={d.calories} />
      </BottomSheet>

      <BottomSheet open={sheet === 'movement'} onClose={() => setSheet(null)} title="Movement">
        <MovementDetail movement={d.movement} cal={d.movementCal} />
      </BottomSheet>

      <BottomSheet open={sheet === 'progress'} onClose={() => setSheet(null)} title="Progress">
        <ProgressDetail data={d} poundsLeft={poundsLeft} daysLeft={daysLeft} />
      </BottomSheet>
    </div>
  )
}

function BlockHeader({ label }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.7rem',
      }}
    >
      <span
        style={{
          fontSize: '0.58rem',
          letterSpacing: '0.26em',
          color: 'var(--text-2)',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>›</span>
    </div>
  )
}

function Stat({ label, value, unit }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.52rem',
          letterSpacing: '0.12em',
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          marginBottom: '0.15rem',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>
        {value}
        {unit && (
          <span style={{ fontSize: '0.68rem', color: 'var(--text-2)', marginLeft: '0.2rem' }}>
            {unit}
          </span>
        )}
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
          <span
            style={{
              fontSize: '1rem',
              color: 'var(--text-2)',
              fontWeight: 400,
              marginLeft: '0.4rem',
            }}
          >
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
            <span
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.18em',
                color: 'var(--text-2)',
                textTransform: 'uppercase',
              }}
            >
              {meal.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 300, color: 'var(--text)' }}>
                {meal.cal}
              </span>
              <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>cal</span>
            </div>
          </div>
        ))}
      </div>

      <div className="note-box" style={{ marginTop: '1.25rem' }}>
        <p style={{ fontSize: '0.63rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Log every meal honestly. Deviation means recalculation next week.
        </p>
      </div>
    </div>
  )
}

function MovementDetail({ movement, cal }) {
  return (
    <div>
      <div
        style={{
          marginBottom: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
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
          <span
            style={{
              fontSize: '0.85rem',
              color: 'var(--text-2)',
              fontWeight: 400,
              marginLeft: '0.35rem',
            }}
          >
            cal burn
          </span>
        </div>
        <div style={{ fontSize: '0.63rem', color: 'var(--text-2)' }}>Required. Not optional.</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {movement.map((m, i) => (
          <div
            key={i}
            style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}
          >
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
        <p style={{ fontSize: '0.63rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          This is the minimum. Go beyond if you have the will.
        </p>
      </div>
    </div>
  )
}

function ProgressDetail({ data, poundsLeft, daysLeft }) {
  const paceNeeded = ((poundsLeft / daysLeft) * 7).toFixed(1)

  const stats = [
    { label: 'Start', value: `${data.startWeight} lbs` },
    { label: 'Current', value: `${data.currentWeight} lbs` },
    { label: 'Goal', value: `${data.goalWeight} lbs` },
    { label: 'Remaining', value: `${poundsLeft} lbs` },
    { label: 'Days Left', value: daysLeft },
    { label: 'Pace', value: `${paceNeeded} lbs/wk` },
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
            <div
              style={{
                fontSize: '0.52rem',
                letterSpacing: '0.14em',
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                marginBottom: '0.3rem',
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--text)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="note-box">
        <p style={{ fontSize: '0.63rem', color: 'var(--text-2)', lineHeight: 1.7, margin: 0 }}>
          Check in weekly. Weight logged every 7 days. The plan adjusts to reality.
        </p>
      </div>
    </div>
  )
}
