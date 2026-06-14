import type { PatternReport } from '../utils/patterns'

interface PatternSheetProps {
  open: boolean
  report: PatternReport | null
  onClose: () => void
}

function StatCell({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '0.85rem 0.5rem' }}>
      <div style={{ fontSize: '2rem', fontWeight: 300, color: color ?? 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.72rem', letterSpacing: '0.14em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '0.4rem' }}>
        {label}
      </div>
    </div>
  )
}

export default function PatternSheet({ open, report, onClose }: PatternSheetProps) {
  if (!open) return null

  const hasData = report?.hasEnoughData ?? false

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9997,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
        animation: 'accountabilityFadeIn 0.35s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          borderTop: '2px solid var(--red)',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90svh',
          overflowY: 'auto',
          animation: 'accountabilityCardIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.72rem', letterSpacing: '0.22em', color: 'var(--text-3)', textTransform: 'uppercase' }}>
            Pattern Analysis
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              minWidth: '44px', minHeight: '44px',
              transition: 'color 0.12s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13" /><line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '0 1.5rem 2rem' }}>

          {!hasData ? (
            <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
                Not enough data yet. Check back after 14 days of accountability logs.
              </div>
            </div>
          ) : (
            <>
              {/* Red divider */}
              <div style={{ height: '1px', background: 'var(--red)', opacity: 0.5, marginTop: '1.5rem', marginBottom: '1.5rem' }} />

              {/* Stats block */}
              <div style={{ display: 'flex', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <StatCell label="Complete" value={report!.totalComplete} color="var(--text)" />
                <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
                <StatCell label="Partial" value={report!.totalPartial} color="var(--text-2)" />
                <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
                <StatCell label="Failed" value={report!.totalFailed} color="var(--text-3)" />
              </div>

              {/* Strongest / weakest day */}
              {(report!.strongestDayOfWeek || report!.weakestDayOfWeek) && (
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                  {report!.strongestDayOfWeek && (
                    <div style={{ flex: 1, padding: '0.75rem 0.85rem', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Strongest</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{report!.strongestDayOfWeek}</div>
                    </div>
                  )}
                  {report!.weakestDayOfWeek && (
                    <div style={{ flex: 1, padding: '0.75rem 0.85rem', background: 'var(--elevated)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.72rem', letterSpacing: '0.16em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Weakest</div>
                      <div style={{ fontSize: '0.95rem', color: 'var(--red-bright)' }}>{report!.weakestDayOfWeek}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Pattern messages */}
              {report!.patternMessages.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  {report!.patternMessages.map((msg, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '1rem 0',
                        borderTop: i === 0 ? '1px solid var(--border)' : undefined,
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>{msg}</div>
                    </div>
                  ))}
                </div>
              )}

              {report!.longestCompleteStreak > 0 && (
                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Longest complete streak</span>
                  <span style={{ fontSize: '1rem', color: 'var(--text-2)' }}>{report!.longestCompleteStreak} days</span>
                </div>
              )}
            </>
          )}

          {/* Bottom note */}
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', lineHeight: 1.6, textAlign: 'center' }}>
              Patterns update daily. Based on your accountability check-ins.
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
