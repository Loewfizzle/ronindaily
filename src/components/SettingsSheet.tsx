import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { updateNotificationTime } from '../utils/push'

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
  const [confirming, setConfirming]           = useState<SettingsOption['id'] | null>(null)
  const [notifTime, setNotifTime]             = useState('07:00')
  const [notifTimeSaved, setNotifTimeSaved]   = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [userId, setUserId]                   = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      supabase
        .from('push_subscriptions')
        .select('notification_time, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setHasSubscription(true)
            // DB stores HH:MM:SS — split and rejoin to get HH:MM for the time input
            const [h, m] = (data.notification_time as string).split(':')
            setNotifTime(`${h}:${m}`)
          } else {
            setHasSubscription(false)
          }
        })
    })
  }, [open])

  const handleClose = () => {
    setConfirming(null)
    setNotifTimeSaved(false)
    onClose()
  }

  const handleConfirm = () => {
    const action = confirming
    setConfirming(null)
    if (action === 'signout') onSignOut()
    else if (action === 'adjust') onAdjustGoal()
    else if (action === 'reset') onReset()
  }

  const handleSaveTime = async () => {
    if (!userId) return
    await updateNotificationTime(userId, `${notifTime}:00`)
    setNotifTimeSaved(true)
    setTimeout(() => setNotifTimeSaved(false), 2000)
  }

  // Convert 24h HH:MM to display string like "7:00 AM"
  const formatTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const ampm = h < 12 ? 'AM' : 'PM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Settings">
      <div>
        {/* Notification time — only shown if user has an active push subscription */}
        {hasSubscription && (
          <div style={{ paddingBottom: '1.25rem', marginBottom: '0.25rem', borderBottom: '1px solid var(--border)' }}>
            <div className="field-label" style={{ marginBottom: '0.75rem' }}>Daily Reminder</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="time"
                value={notifTime}
                onChange={e => { setNotifTime(e.target.value); setNotifTimeSaved(false) }}
                style={{
                  background: 'var(--elevated)', border: '1px solid var(--border-mid)',
                  color: 'var(--text)', fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                  padding: '0.5rem 0.65rem', borderRadius: 0, outline: 'none',
                  minHeight: '44px', cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
                {formatTime(notifTime)}
              </span>
              <button
                onClick={handleSaveTime}
                style={{
                  marginLeft: 'auto',
                  background: notifTimeSaved ? 'var(--green)' : 'none',
                  border: '1px solid var(--border-mid)',
                  color: notifTimeSaved ? 'var(--text)' : 'var(--text-2)',
                  fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer', padding: '0.5rem 0.85rem',
                  fontFamily: 'Inter, sans-serif', minHeight: '44px',
                  transition: 'background 0.2s ease, color 0.2s ease',
                }}
              >
                {notifTimeSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {OPTIONS.map((opt, i) => (
          confirming === opt.id ? (
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
                  width: '100%', padding: '0.85rem', marginTop: '0.5rem',
                  background: 'none', border: 'none', color: 'var(--text-3)',
                  fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              key={opt.id}
              onClick={() => setConfirming(opt.id)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: '1rem', width: '100%', background: 'none', border: 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', padding: '1.25rem 0', textAlign: 'left', fontFamily: 'inherit',
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
