import BottomSheet from './BottomSheet'
import { BADGE_DEFS, BADGE_KANJI } from '../utils/badges'

interface EarnedBadge {
  badge_id: string
  earned_at: string
}

interface BadgeDetailSheetProps {
  badge: EarnedBadge | null
  onClose: () => void
}

function formatEarnedDate(iso: string): string {
  const d = new Date(iso)
  const day   = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
  const year  = d.getFullYear()
  return `${day} ${month} ${year}`
}

export default function BadgeDetailSheet({ badge, onClose }: BadgeDetailSheetProps) {
  const def   = badge ? BADGE_DEFS.find(b => b.id === badge.badge_id) : null
  const kanji = badge ? (BADGE_KANJI[badge.badge_id] ?? '侍') : ''

  return (
    <BottomSheet open={!!badge && !!def} onClose={onClose} title="">
      {def && badge && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0 1rem' }}>

          <div className="font-jp" style={{
            fontSize: '5rem',
            lineHeight: 1,
            color: 'var(--red)',
            textShadow:
              '0 0 20px rgba(176,40,40,0.9), 0 0 50px rgba(176,40,40,0.5), 0 0 100px rgba(139,28,28,0.3)',
            marginBottom: '1.75rem',
          }}>
            {kanji}
          </div>

          <div style={{
            width: '100%',
            height: '1px',
            background: 'linear-gradient(to right, transparent, var(--gold), transparent)',
            marginBottom: '1.75rem',
          }} />

          <div style={{
            fontSize: '1.4rem',
            fontWeight: 200,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: 'var(--gold)',
            lineHeight: 1,
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            {def.name}
          </div>

          <div style={{
            fontSize: '0.82rem',
            color: 'var(--text-2)',
            lineHeight: 1.85,
            textAlign: 'center',
            maxWidth: '240px',
            marginBottom: '1.75rem',
          }}>
            {def.flavor}
          </div>

          <div style={{
            fontSize: '0.58rem',
            letterSpacing: '0.3em',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
          }}>
            Earned {formatEarnedDate(badge.earned_at)}
          </div>

        </div>
      )}
    </BottomSheet>
  )
}
