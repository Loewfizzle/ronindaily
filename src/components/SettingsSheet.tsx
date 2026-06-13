import { useState } from 'react'
import BottomSheet from './BottomSheet'

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
          <div
            key={opt.id}
            style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', padding: '1.1rem 0' }}
          >
            <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>
              {opt.label}
            </div>

            {confirming === opt.id ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 0.9rem' }}>
                  {opt.confirm}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <button
                    onClick={handleConfirm}
                    style={{
                      padding: '0.5rem 1.25rem',
                      background: 'var(--red)',
                      color: 'var(--text)',
                      border: 'none',
                      borderRadius: 0,
                      fontSize: '0.72rem',
                      letterSpacing: '0.3em',
                      fontWeight: 600,
                      fontFamily: 'Inter, sans-serif',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-2)',
                      fontSize: '0.72rem',
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      padding: 0,
                    }}
                  >
                    cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {opt.desc}
                </span>
                <button
                  onClick={() => setConfirming(opt.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: 0,
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </BottomSheet>
  )
}
