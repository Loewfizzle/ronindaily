import { BADGE_DEFS, BADGE_KANJI } from '../utils/badges'

interface EarnedBadge {
  badge_id: string
  earned_at: string
}

interface BadgeDetailSheetProps {
  badge: EarnedBadge | null
  onClose: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`
}

export default function BadgeDetailSheet({ badge, onClose }: BadgeDetailSheetProps) {
  if (!badge) return null

  const def   = BADGE_DEFS.find(b => b.id === badge.badge_id)
  const kanji = BADGE_KANJI[badge.badge_id] ?? '侍'

  if (!def) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '380px',
          background: 'var(--surface)',
          border: '1px solid var(--border-mid)',
          padding: '2.5rem',
          position: 'relative',
          animation: 'badgeCardIn 0.3s ease-out',
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 0, right: 0,
            minWidth: '44px', minHeight: '44px',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: '1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Kanji */}
        <div
          className="font-jp"
          style={{
            fontSize: '5rem', lineHeight: 1, color: 'var(--red)',
            animation: 'kanjiGlowPulse 3s ease-in-out infinite',
          }}
        >
          {kanji}
        </div>

        {/* Rank name */}
        <div style={{
          fontSize: '1.8rem', fontWeight: 700, color: 'var(--gold)',
          letterSpacing: '0.3em', textTransform: 'uppercase',
          marginTop: '1rem',
        }}>
          {def.name}
        </div>

        {/* Date */}
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>
          {formatDate(badge.earned_at)}
        </div>

        {/* Divider */}
        <div style={{
          height: '1px', background: 'var(--red)', opacity: 0.35,
          marginTop: '1rem',
        }} />

        {/* Flavor text */}
        <div style={{
          fontSize: '0.95rem', color: 'var(--text-2)',
          lineHeight: 1.8, fontStyle: 'italic',
          marginTop: '1rem',
        }}>
          {def.flavor}
        </div>

        {/* How you earned this */}
        <div style={{ marginTop: '1.5rem' }}>
          <div style={{
            fontSize: '0.72rem', color: 'var(--text-3)',
            letterSpacing: '0.22em', textTransform: 'uppercase',
            marginBottom: '0.5rem',
          }}>
            How You Earned This
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.7 }}>
            {def.explanation}
          </div>
        </div>
      </div>
    </div>
  )
}
