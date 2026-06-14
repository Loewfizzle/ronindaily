import { useState } from 'react'
import BottomSheet from './BottomSheet'

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
      <polyline points="6 4 12 9 6 14" />
    </svg>
  )
}

interface SettingsOption {
  id: 'signout' | 'adjust' | 'reset'
  label: string
  desc: string
  confirm: string
}

const OPTIONS: SettingsOption[] = [
  {
    id: 'signout',
    label: 'Sign Out',
    desc: 'Sign out of your account.',
    confirm: 'You will be signed out. Your data will remain.',
  },
  {
    id: 'adjust',
    label: 'Adjust Goal',
    desc: 'Change your numbers. Start date is preserved.',
    confirm: 'Start date is preserved. Only your goal changes. This cannot be undone.',
  },
  {
    id: 'reset',
    label: 'Start Over',
    desc: 'Erase all data. Begin again.',
    confirm: 'All data will be erased. This cannot be undone.',
  },
]

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  onAdjustGoal: () => void
  onReset: () => void
  onSignOut: () => void
}

export default function SettingsSheet({ open, onClose, onAdjustGoal, onReset, onSignOut }: SettingsSheetProps) {
  const [confirming, setConfirming] = useState<SettingsOption['id'] | null>(null)

  const handleClose = () => {
    setConfirming(null)
    onClose()
  }

  const handleConfirm = () => {
    const action = confirming
    setConfirming(null)
    if (action === 'signout') onSignOut()
    else if (action === 'adjust') onAdjustGoal()
    else if (action === 'reset') onReset()
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Settings">
      <div>
        {OPTIONS.map((opt, i) => (
          confirming === opt.id ? (
            // Confirm state — cannot be a <button> (would contain buttons inside)
            <div
              key={opt.id}
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', padding: '1.25rem 0' }}
            >
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
                {opt.label}
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 1rem' }}>
                {opt.confirm}
              </p>
              <button className="commit-btn" onClick={handleConfirm}>
                Confirm
              </button>
              <button
                onClick={() => setConfirming(null)}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-3)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            // Normal state — entire row is the tap target
            <button
              key={opt.id}
              onClick={() => setConfirming(opt.id)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                width: '100%',
                background: 'none',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                padding: '1.25rem 0',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                  {opt.label}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {opt.desc}
                </div>
              </div>
              <ChevronIcon />
            </button>
          )
        ))}
      </div>
    </BottomSheet>
  )
}
