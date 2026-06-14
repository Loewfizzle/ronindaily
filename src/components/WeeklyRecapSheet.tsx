interface WeeklyRecapSheetProps {
  open: boolean
  weekNumber: number
  complete: number
  partial: number
  failed: number
  patternMessage: string | null
  onDismiss: () => void
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0.9rem 0.5rem' }}>
      <div style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.15em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '0.4rem' }}>{label}</div>
    </div>
  )
}

function performanceCopy(complete: number): string {
  if (complete >= 7) return 'Seven days. No excuses. No exceptions. This is who you are.'
  if (complete >= 5) return 'Strong week. The gaps tell you where to focus.'
  if (complete >= 3) return 'More than half. Not enough. Raise the standard.'
  if (complete >= 1) return 'This week was a failure. Next week is a choice.'
  return 'Seven days of compromise. The mission does not wait.'
}

export default function WeeklyRecapSheet({
  open, weekNumber, complete, partial, failed, patternMessage, onDismiss,
}: WeeklyRecapSheetProps) {
  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
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
          borderTop: '2px solid var(--red)',
          padding: '2.5rem',
          maxWidth: '420px',
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
            style={{ fontSize: '3rem', color: 'var(--red)', lineHeight: 1, display: 'inline-block', animation: 'kanjiPulse 4s ease-in-out infinite' }}
          >
            侍
          </div>
        </div>

        {/* Label */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Week {weekNumber} Recap
        </div>

        {/* Red divider */}
        <div style={{ height: '1px', background: 'var(--red)', opacity: 0.5, marginBottom: '1.25rem' }} />

        {/* Stats */}
        <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <StatCell label="Complete" value={complete} />
          <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
          <StatCell label="Partial" value={partial} />
          <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
          <StatCell label="Failed" value={failed} />
        </div>

        {/* Pattern message */}
        {patternMessage && (
          <>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.18em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                Pattern Noticed
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.7 }}>{patternMessage}</div>
            </div>
            <div style={{ height: '1px', background: 'var(--red)', opacity: 0.3, marginBottom: '1.5rem' }} />
          </>
        )}

        {/* Performance copy */}
        <div style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '2rem', textAlign: 'center' }}>
          {performanceCopy(complete)}
        </div>

        {/* Acknowledge button */}
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
