interface MonthlyRecapSheetProps {
  open: boolean
  dayNumber: number
  monthNumber: number
  complete: number
  partial: number
  failed: number
  streakHigh: number
  weightStart: number | null
  weightCurrent: number | null
  expectedLossLbs: number
  unit: 'imperial' | 'metric'
  strongestDay: string | null
  weakestDay: string | null
  onDismiss: () => void
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>
      <div style={{ fontSize: '1.9rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '0.35rem' }}>{label}</div>
    </div>
  )
}

function performanceCopy(complete: number): string {
  if (complete >= 25) return 'Thirty days of discipline. You are no longer who you were.'
  if (complete >= 20) return 'Strong month. The gaps are the lesson. Learn them.'
  if (complete >= 15) return 'Half a month of real effort. The other half is a question.'
  return 'This month exposed something. Face it before the next one begins.'
}

function fmtWeight(lbs: number, unit: 'imperial' | 'metric'): string {
  if (unit === 'metric') return `${(lbs / 2.20462).toFixed(1)} kg`
  return `${Math.round(lbs)} lbs`
}

function fmtChange(lbs: number, unit: 'imperial' | 'metric'): string {
  if (unit === 'metric') return `${(Math.abs(lbs) / 2.20462).toFixed(1)} kg`
  return `${Math.abs(lbs).toFixed(1)} lbs`
}

function Divider({ color = 'var(--red)' }: { color?: string }) {
  return <div style={{ height: '1px', background: color, opacity: 0.4, margin: '1.25rem 0' }} />
}

export default function MonthlyRecapSheet({
  open, dayNumber, monthNumber, complete, partial, failed, streakHigh,
  weightStart, weightCurrent, expectedLossLbs, unit, strongestDay, weakestDay, onDismiss,
}: MonthlyRecapSheetProps) {
  if (!open) return null

  const delta = weightStart !== null && weightCurrent !== null ? weightStart - weightCurrent : null
  const lost = delta !== null && delta > 0
  const gained = delta !== null && delta < 0
  const aheadOfPace = delta !== null && expectedLossLbs > 0 ? delta >= expectedLossLbs : null
  const showWeight = weightStart !== null && weightCurrent !== null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9996,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'accountabilityFadeIn 0.4s ease',
      }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          borderTop: '2px solid var(--gold)',
          padding: '2.5rem',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '90svh',
          overflowY: 'auto',
          animation: 'accountabilityCardIn 0.35s ease-out',
        }}
      >
        {/* Kanji */}
        <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
          <div
            className="font-jp"
            style={{ fontSize: '3rem', color: 'var(--gold)', lineHeight: 1, display: 'inline-block', animation: 'kanjiPulse 4s ease-in-out infinite' }}
          >
            完
          </div>
        </div>

        {/* Label */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Day {dayNumber} — Month {monthNumber} Complete
        </div>

        {/* Gold divider */}
        <div style={{ height: '1px', background: 'var(--gold)', opacity: 0.4, marginBottom: '1.25rem' }} />

        {/* Stats 2×2 grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid var(--border)' }}>
          <div style={{ borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            <StatCell label="Complete Days" value={complete} />
          </div>
          <div style={{ borderBottom: '1px solid var(--border)' }}>
            <StatCell label="Partial Days" value={partial} />
          </div>
          <div style={{ borderRight: '1px solid var(--border)' }}>
            <StatCell label="Failed Days" value={failed} />
          </div>
          <div>
            <StatCell label="Streak High" value={streakHigh} />
          </div>
        </div>

        {/* Weight progress */}
        {showWeight && (
          <>
            <Divider />
            <div>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Weight Progress
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Start</span>
                <span style={{ fontSize: '1rem', color: 'var(--text)' }}>{fmtWeight(weightStart!, unit)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Current</span>
                <span style={{ fontSize: '1rem', color: 'var(--text)' }}>{fmtWeight(weightCurrent!, unit)}</span>
              </div>
              {lost && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Lost this month</span>
                  <span style={{ fontSize: '1rem', color: 'var(--green)' }}>{fmtChange(delta!, unit)}</span>
                </div>
              )}
              {gained && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>Gained this month</span>
                  <span style={{ fontSize: '1rem', color: 'var(--red-bright)' }}>{fmtChange(delta!, unit)}</span>
                </div>
              )}
              {aheadOfPace !== null && (
                <div style={{ fontSize: '0.85rem', color: aheadOfPace ? 'var(--green)' : 'var(--text-2)', marginTop: '0.25rem' }}>
                  {aheadOfPace ? 'Ahead of pace.' : 'Behind pace. Recalibrate.'}
                </div>
              )}
            </div>
          </>
        )}

        {/* Strongest / weakest day */}
        {(strongestDay || weakestDay) && (
          <>
            <Divider />
            <div style={{ display: 'flex', gap: '1rem' }}>
              {strongestDay && (
                <div style={{ flex: 1, padding: '0.7rem 0.8rem', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Strongest Day</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{strongestDay}</div>
                </div>
              )}
              {weakestDay && (
                <div style={{ flex: 1, padding: '0.7rem 0.8rem', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Weakest Day</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--red-bright)' }}>{weakestDay}</div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Performance copy */}
        <Divider />
        <div style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'center' }}>
          {performanceCopy(complete)}
        </div>

        {/* Acknowledge */}
        <button
          className="commit-btn"
          onClick={onDismiss}
          style={{ width: '100%', letterSpacing: '0.18em' }}
        >
          Acknowledged
        </button>
      </div>
    </div>
  )
}
