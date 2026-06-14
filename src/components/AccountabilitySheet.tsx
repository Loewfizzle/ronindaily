import { useState } from 'react'

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
      <polyline points="6 4 12 9 6 14" />
    </svg>
  )
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <div style={{
      width: '22px', height: '22px', flexShrink: 0,
      background: checked ? 'var(--red)' : 'none',
      border: `1px solid ${checked ? 'var(--red)' : 'var(--border-mid)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.12s ease',
    }}>
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

interface AccountabilitySheetProps {
  open: boolean
  dayNumber: number
  onLog: (result: 'complete' | 'partial', caloriesHit: boolean, movementHit: boolean) => void
  onFailed: () => void
}

export default function AccountabilitySheet({ open, dayNumber, onLog, onFailed }: AccountabilitySheetProps) {
  const [fadingOut, setFadingOut] = useState(false)
  const [partialExpanded, setPartialExpanded] = useState(false)
  const [caloriesHit, setCaloriesHit] = useState(false)
  const [movementHit, setMovementHit] = useState(false)

  if (!open) return null

  const commit = (result: 'complete' | 'partial', cal: boolean, mov: boolean) => {
    setFadingOut(true)
    setTimeout(() => onLog(result, cal, mov), 300)
  }

  const handleComplete = () => commit('complete', true, true)
  const handlePartialConfirm = () => commit('partial', caloriesHit, movementHit)
  const handleFailed = () => {
    // No fade — immediately hand off to skip flow
    onFailed()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: 'rgba(0,0,0,0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      opacity: fadingOut ? 0 : 1,
      transition: fadingOut ? 'opacity 0.3s ease' : undefined,
      animation: fadingOut ? undefined : 'accountabilityFadeIn 0.4s ease',
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-mid)',
        borderTop: '2px solid var(--red)',
        padding: '2.5rem',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90svh',
        overflowY: 'auto',
        animation: fadingOut ? undefined : 'accountabilityCardIn 0.35s ease-out',
      }}>

        {/* Kanji */}
        <div style={{ textAlign: 'center', marginBottom: '0.85rem' }}>
          <div
            className="font-jp"
            style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1, display: 'inline-block', animation: 'kanjiPulse 4s ease-in-out infinite' }}
          >侍</div>
        </div>

        {/* Day label */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Day {dayNumber} — Accountability
        </div>

        {/* Red divider */}
        <div style={{ height: '1px', background: 'var(--red)', opacity: 0.5, marginBottom: '1.5rem' }} />

        {/* Question */}
        <div style={{ textAlign: 'center', fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          How did today go?
        </div>

        {/* ── Option 1: Mission complete ── */}
        <div style={{ borderTop: '1px solid var(--border)' }}>
          <button className="accountability-option" onClick={handleComplete}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.2rem' }}>Mission complete.</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Full day. Everything done.</div>
            </div>
            <ChevronIcon />
          </button>
        </div>

        {/* ── Option 2: Partial ── */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <button
            className="accountability-option"
            onClick={() => setPartialExpanded(e => !e)}
          >
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: '0.2rem' }}>Partial.</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Did something. Not everything.</div>
            </div>
            <ChevronIcon />
          </button>

          {/* Expandable checkboxes */}
          <div style={{
            overflow: 'hidden',
            maxHeight: partialExpanded ? '240px' : '0',
            transition: 'max-height 0.25s ease',
          }}>
            <div style={{ paddingBottom: '1.25rem' }}>
              {/* Calories checkbox */}
              <button
                onClick={() => setCaloriesHit(v => !v)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.55rem 0', minHeight: '44px', fontFamily: 'Inter, sans-serif',
                }}
              >
                <CheckboxIcon checked={caloriesHit} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-2)', textAlign: 'left' }}>Hit my calorie target</span>
              </button>

              {/* Movement checkbox */}
              <button
                onClick={() => setMovementHit(v => !v)}
                style={{
                  width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.85rem',
                  padding: '0.55rem 0', minHeight: '44px', fontFamily: 'Inter, sans-serif',
                }}
              >
                <CheckboxIcon checked={movementHit} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-2)', textAlign: 'left' }}>Completed my movement</span>
              </button>

              {/* Confirm */}
              <button className="commit-btn" onClick={handlePartialConfirm} style={{ marginTop: '0.85rem' }}>
                Confirm
              </button>
            </div>
          </div>
        </div>

        {/* ── Option 3: I failed today ── */}
        <div style={{ borderBottom: '1px solid var(--border)' }}>
          <button className="accountability-option" onClick={handleFailed}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text-2)', marginBottom: '0.2rem' }}>I failed today.</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Streak resets. Begin again tomorrow.</div>
            </div>
            <ChevronIcon />
          </button>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingTop: '1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
            You can also log this later from settings.
          </div>
        </div>

      </div>
    </div>
  )
}
