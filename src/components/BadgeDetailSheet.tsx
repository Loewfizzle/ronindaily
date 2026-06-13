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

interface GoalRecord {
  achievedAt: string
  lostLbs: number
  unit: string
  totalDays: number
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' }).toUpperCase()} ${d.getFullYear()}`
}

function loadGoalRecord(): GoalRecord | null {
  try { return JSON.parse(localStorage.getItem('ronin_goal_reached') || 'null') }
  catch { return null }
}

// ── Goal-reached special view ─────────────────────────────────────────────────

function GoalDetail({ badge }: { badge: EarnedBadge }) {
  const record = loadGoalRecord()

  const achievedDate = record ? formatDate(record.achievedAt) : formatDate(badge.earned_at)

  const lostLine = record
    ? record.unit === 'metric'
      ? `Lost ${(record.lostLbs / 2.20462).toFixed(1)} kg in ${Math.round(record.totalDays / 7)} weeks`
      : `Lost ${Math.round(record.lostLbs)} lbs in ${Math.round(record.totalDays / 7)} weeks`
    : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0 1rem' }}>

      <div className="font-jp goal-glow" style={{
        fontSize: '5rem',
        lineHeight: 1,
        color: 'var(--gold)',
        marginBottom: '1.75rem',
      }}>
        完
      </div>

      <div style={{
        width: '100%', height: '1px',
        background: 'linear-gradient(to right, transparent, var(--gold), transparent)',
        marginBottom: '1.75rem',
      }} />

      <div style={{
        fontSize: '1.4rem', fontWeight: 200,
        letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'var(--gold)', lineHeight: 1,
        marginBottom: '1rem', textAlign: 'center',
      }}>
        Mission Complete
      </div>

      <div style={{
        fontSize: '0.82rem', color: 'var(--text-2)',
        lineHeight: 1.85, textAlign: 'center',
        maxWidth: '240px', marginBottom: '1.5rem',
      }}>
        The mission is over. Begin a new one.
      </div>

      {lostLine && (
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-2)',
          letterSpacing: '0.06em', marginBottom: '0.85rem',
        }}>
          {lostLine}
        </div>
      )}

      <div style={{
        fontSize: '0.75rem', letterSpacing: '0.3em',
        color: 'var(--text-3)', textTransform: 'uppercase',
      }}>
        {achievedDate}
      </div>

    </div>
  )
}

// ── Default badge view ────────────────────────────────────────────────────────

function DefaultDetail({ badge }: { badge: EarnedBadge }) {
  const def   = BADGE_DEFS.find(b => b.id === badge.badge_id)
  const kanji = BADGE_KANJI[badge.badge_id] ?? '侍'
  if (!def) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0.5rem 0 1rem' }}>

      <div className="font-jp" style={{
        fontSize: '5rem', lineHeight: 1, color: 'var(--red)',
        textShadow: '0 0 20px rgba(176,40,40,0.9), 0 0 50px rgba(176,40,40,0.5), 0 0 100px rgba(139,28,28,0.3)',
        marginBottom: '1.75rem',
      }}>
        {kanji}
      </div>

      <div style={{
        width: '100%', height: '1px',
        background: 'linear-gradient(to right, transparent, var(--gold), transparent)',
        marginBottom: '1.75rem',
      }} />

      <div style={{
        fontSize: '1.4rem', fontWeight: 200,
        letterSpacing: '0.28em', textTransform: 'uppercase',
        color: 'var(--gold)', lineHeight: 1,
        marginBottom: '1rem', textAlign: 'center',
      }}>
        {def.name}
      </div>

      <div style={{
        fontSize: '0.82rem', color: 'var(--text-2)',
        lineHeight: 1.85, textAlign: 'center',
        maxWidth: '240px', marginBottom: '1.75rem',
      }}>
        {def.flavor}
      </div>

      <div style={{
        fontSize: '0.75rem', letterSpacing: '0.3em',
        color: 'var(--text-3)', textTransform: 'uppercase',
      }}>
        Earned {formatDate(badge.earned_at)}
      </div>

    </div>
  )
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export default function BadgeDetailSheet({ badge, onClose }: BadgeDetailSheetProps) {
  const isGoal = badge?.badge_id === 'goal_reached'

  return (
    <BottomSheet open={!!badge} onClose={onClose} title="">
      {badge && (
        isGoal
          ? <GoalDetail badge={badge} />
          : <DefaultDetail badge={badge} />
      )}
    </BottomSheet>
  )
}
