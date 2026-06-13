import { calculatePlan } from '../utils/calculate'
import type { UserProfile } from '../types'

interface PreparationScreenProps {
  onBegin: () => void
  onReset: () => void
}

export default function PreparationScreen({ onBegin, onReset }: PreparationScreenProps) {
  const profile = (() => {
    try { return JSON.parse(localStorage.getItem('ronin_profile') || 'null') as UserProfile | null }
    catch { return null }
  })()

  const plan = profile ? calculatePlan(profile, new Date()) : null

  if (!plan) {
    return (
      <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1.5rem' }}>
        <div className="font-jp" style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1 }}>備</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', textAlign: 'center', lineHeight: 1.75, maxWidth: '260px' }}>
          Mission data could not be loaded. Start over to reconfigure.
        </div>
        <button className="commit-btn" style={{ maxWidth: '200px' }} onClick={onReset}>
          Start Over
        </button>
      </div>
    )
  }

  const { unit, poundsToLose, calorieTarget } = plan
  const targetWeeks = parseInt(profile!.targetWeeks, 10)

  const loseDisplay = unit === 'metric'
    ? `${(poundsToLose / 2.20462).toFixed(1)} kg`
    : `${Math.round(poundsToLose)} lbs`

  const statBlocks = [
    { label: 'Daily Target', value: `${calorieTarget.toLocaleString()} cal` },
    { label: 'Duration',     value: `${targetWeeks} weeks` },
    { label: 'Start',        value: 'When you are ready' },
  ]

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 1.5rem',
      paddingTop: 'max(4rem, env(safe-area-inset-top))',
      paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
    }}>
      {/* Kanji — 備 means "prepare / ready" */}
      <div className="font-jp" style={{ fontSize: '4rem', color: 'var(--red)', lineHeight: 1, marginBottom: '1.5rem' }}>
        備
      </div>

      {/* Status label */}
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.32em', color: 'var(--text-2)', textTransform: 'uppercase', marginBottom: '2rem' }}>
        Your Mission Is Set
      </div>

      {/* Goal — cold and factual */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.9, letterSpacing: '0.02em' }}>
          Lose {loseDisplay}.<br />
          {targetWeeks} weeks.&nbsp; {calorieTarget.toLocaleString()} cal/day.
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: '100%', maxWidth: '320px', borderTop: '1px solid var(--border)', marginBottom: '2rem' }} />

      {/* Brand statement */}
      <div style={{ fontSize: '0.88rem', color: 'var(--text-2)', textAlign: 'center', maxWidth: '300px', lineHeight: 1.75, marginBottom: '1.5rem', letterSpacing: '0.02em' }}>
        A warrior prepares before battle, not during it.
      </div>

      {/* Instruction */}
      <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', textAlign: 'center', maxWidth: '280px', lineHeight: 1.85, marginBottom: '2.5rem' }}>
        Your mission begins when you are ready. Review your plan. Gather what you need. Return when prepared.
      </div>

      {/* Stat blocks */}
      <div style={{ display: 'flex', gap: '1px', width: '100%', maxWidth: '400px', marginBottom: '3.5rem' }}>
        {statBlocks.map(({ label, value }) => (
          <div key={label} style={{ flex: 1, background: 'var(--elevated)', padding: '1rem 0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.45rem' }}>
              {label}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 300, color: 'var(--text)', letterSpacing: '0.01em' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Spacer pushes button to bottom */}
      <div style={{ flex: 1 }} />

      {/* Begin */}
      <div style={{ width: '100%', maxWidth: '480px' }}>
        <button className="commit-btn" onClick={onBegin}>
          I am prepared. Begin.
        </button>
      </div>
    </div>
  )
}
