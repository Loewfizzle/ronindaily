import { useState, useEffect } from 'react'
import BottomSheet from './BottomSheet'
import { supabase } from '../lib/supabase'
import { updateNotificationTime } from '../utils/push'

function ChevronIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 18 18"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ color: 'var(--text-3)', flexShrink: 0 }}
    >
      <polyline points="6 4 12 9 6 14" />
    </svg>
  )
}

// Shared cell style for hour / minute / AM-PM picker buttons
function pickerCell(selected: boolean): React.CSSProperties {
  return {
    minHeight: '44px',
    background: selected ? 'var(--red)' : 'var(--surface)',
    border: `1px solid ${selected ? 'var(--red)' : 'var(--border)'}`,
    color: selected ? 'var(--text)' : 'var(--text-3)',
    fontSize: '0.82rem',
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    transition: 'background 0.12s ease, color 0.12s ease, border-color 0.12s ease',
  }
}

type ConfirmId = 'adjust' | 'signout' | 'reset'

const CONFIRM: Record<ConfirmId, { label: string; message: string }> = {
  adjust:  { label: 'Adjust Goal', message: 'Start date is preserved. Only your goal changes. This cannot be undone.' },
  signout: { label: 'Sign Out',    message: 'You will be signed out. Your data will remain.' },
  reset:   { label: 'Start Over',  message: 'This ends your current mission permanently. Your profile, weight history, logs, and badges will be erased. You will return to the start to build a new mission. This cannot be undone.' },
}

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
  onAdjustGoal: () => void
  onReset: () => void
  onSignOut: () => void
  onSkip?: () => void   // only passed when dayNumber > 1; opens skip sheet in Dashboard
}

export default function SettingsSheet({ open, onClose, onAdjustGoal, onReset, onSignOut, onSkip }: SettingsSheetProps) {
  const [confirming, setConfirming]           = useState<ConfirmId | null>(null)
  const [notifTime, setNotifTime]             = useState('07:00')
  const [notifTimeSaved, setNotifTimeSaved]   = useState(false)
  const [hasSubscription, setHasSubscription] = useState(false)
  const [userId, setUserId]                   = useState<string | null>(null)

  // Custom picker state
  const [pickerOpen, setPickerOpen]   = useState(false)
  const [draftHour, setDraftHour]     = useState(7)
  const [draftMinute, setDraftMinute] = useState(0)
  const [draftAmPm, setDraftAmPm]     = useState<'AM' | 'PM'>('AM')

  useEffect(() => {
    if (!open) return
    setPickerOpen(false)
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
    setPickerOpen(false)
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

  const formatTime = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    const ampm = h < 12 ? 'AM' : 'PM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }

  const openPicker = () => {
    const [hStr, mStr] = notifTime.split(':')
    const h24 = parseInt(hStr, 10)
    const m   = parseInt(mStr, 10)
    setDraftHour(h24 % 12 || 12)
    setDraftMinute(Math.min(55, Math.round(m / 5) * 5))
    setDraftAmPm(h24 < 12 ? 'AM' : 'PM')
    setPickerOpen(true)
  }

  const applyPicker = () => {
    const h24 = draftAmPm === 'AM'
      ? (draftHour === 12 ? 0 : draftHour)
      : (draftHour === 12 ? 12 : draftHour + 12)
    setNotifTime(`${String(h24).padStart(2, '0')}:${String(draftMinute).padStart(2, '0')}`)
    setPickerOpen(false)
  }

  // ── Shared confirm panel ───────────────────────────────────────────────────
  const renderConfirm = (id: ConfirmId) => {
    const { label, message } = CONFIRM[id]
    return (
      <div style={{ padding: '1.25rem 0' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.65rem' }}>
          {label}
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 1rem' }}>
          {message}
        </p>
        <button className="commit-btn" onClick={handleConfirm}>Confirm</button>
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
    )
  }

  // ── Option row button ──────────────────────────────────────────────────────
  const renderRow = (
    id: ConfirmId,
    label: string,
    desc: string,
    opts: { hasBorderTop?: boolean; labelColor?: string; descColor?: string } = {},
  ) => {
    const { hasBorderTop = true, labelColor = 'var(--text)', descColor = 'var(--text-2)' } = opts
    if (confirming === id) return renderConfirm(id)
    return (
      <button
        onClick={() => setConfirming(id)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '1rem', width: '100%', background: 'none', border: 'none',
          borderTop: hasBorderTop ? '1px solid var(--border)' : 'none',
          cursor: 'pointer', padding: '1.25rem 0', textAlign: 'left', fontFamily: 'inherit',
        }}
      >
        <div>
          <div style={{ fontSize: '0.82rem', color: labelColor, letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '0.85rem', color: descColor, lineHeight: 1.5 }}>
            {desc}
          </div>
        </div>
        <ChevronIcon />
      </button>
    )
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="Settings">
      <div>

        {/* ── ROUTINE SECTION: Daily Reminder + Adjust Goal ────────────── */}

        {hasSubscription && (
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
            <div className="field-label" style={{ marginBottom: '0.75rem' }}>Daily Reminder</div>

            {/* Single control: displays current time, tapping opens the custom picker */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <button
                onClick={() => pickerOpen ? setPickerOpen(false) : openPicker()}
                aria-label="Change notification time"
                style={{
                  background: 'var(--elevated)',
                  border: `1px solid ${pickerOpen ? 'var(--red)' : 'var(--border-mid)'}`,
                  color: 'var(--text)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '0.9rem',
                  padding: '0.5rem 0.85rem',
                  minHeight: '44px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'border-color 0.15s ease',
                }}
              >
                {formatTime(notifTime)}
              </button>

              <button
                onClick={handleSaveTime}
                disabled={pickerOpen}
                style={{
                  background: notifTimeSaved ? 'var(--green)' : 'var(--elevated)',
                  border: '1px solid var(--border-mid)',
                  color: notifTimeSaved ? 'var(--text)' : 'var(--text-2)',
                  fontSize: '0.72rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  cursor: pickerOpen ? 'default' : 'pointer',
                  padding: '0 0.85rem',
                  fontFamily: 'Inter, sans-serif',
                  minHeight: '44px',
                  flexShrink: 0,
                  opacity: pickerOpen ? 0.45 : 1,
                  transition: 'background 0.2s ease, color 0.2s ease, opacity 0.15s ease',
                }}
              >
                {notifTimeSaved ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* ── Custom time picker ── */}
            {pickerOpen && (
              <div style={{
                marginBottom: '0.6rem',
                background: 'var(--bg)',
                border: '1px solid var(--border-mid)',
                borderTop: '2px solid var(--red)',
                padding: '1rem 0.85rem',
              }}>
                {/* Hours */}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Hour
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem', marginBottom: '0.85rem' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                    <button key={h} onClick={() => setDraftHour(h)} style={pickerCell(draftHour === h)}>
                      {h}
                    </button>
                  ))}
                </div>

                {/* Minutes */}
                <div style={{ fontSize: '0.65rem', color: 'var(--text-3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  Minute
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.3rem', marginBottom: '0.85rem' }}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                    <button key={m} onClick={() => setDraftMinute(m)} style={pickerCell(draftMinute === m)}>
                      :{String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>

                {/* AM/PM + actions row */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {(['AM', 'PM'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setDraftAmPm(p)}
                      style={{ ...pickerCell(draftAmPm === p), padding: '0 0.75rem', minWidth: '52px' }}
                    >
                      {p}
                    </button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button
                    onClick={() => setPickerOpen(false)}
                    style={{
                      background: 'none', border: 'none',
                      color: 'var(--text-3)',
                      fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      minHeight: '44px', padding: '0 0.5rem',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyPicker}
                    style={{
                      background: 'var(--elevated)',
                      border: '1px solid var(--border-mid)',
                      color: 'var(--text)',
                      fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                      minHeight: '44px', padding: '0 0.85rem',
                    }}
                  >
                    Set Time
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Adjust Goal */}
        {renderRow('adjust', 'Adjust Goal', 'Change your numbers. Start date is preserved.', {
          hasBorderTop: hasSubscription,
        })}

        {/* ── ACCOUNT SECTION: Sign Out ─────────────────────────────────── */}
        <div style={{ height: '1px', background: 'var(--border-mid)', margin: '0.5rem 0 0' }} />

        {renderRow('signout', 'Sign Out', 'Sign out of your account.', {
          hasBorderTop: false,
        })}

        {/* ── DANGER SECTION: Skip + Start Over ────────────────────────── */}
        {/* Faint red-tinted separator signals the weight of what's below */}
        <div style={{ height: '1px', background: 'rgba(139, 28, 28, 0.30)', margin: '0.25rem 0 0' }} />

        {/* I Skipped Today — only when onSkip is provided (dayNumber > 1 in Dashboard) */}
        {onSkip && (
          <button
            onClick={onSkip}
            style={{
              display: 'flex', justifyContent: 'flex-start', alignItems: 'center',
              gap: '1rem', width: '100%', background: 'none', border: 'none',
              borderTop: 'none',
              cursor: 'pointer', padding: '1.25rem 0', textAlign: 'left', fontFamily: 'inherit',
            }}
          >
            <div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>
                I Skipped Today
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-2)', lineHeight: 1.5 }}>
                Resets your streak to zero. Mission continues.
              </div>
            </div>
          </button>
        )}

        {onSkip && <div style={{ height: '1px', background: 'var(--border)' }} />}

        {renderRow('reset', 'Start Over', 'Ends the current mission. All data erased.', {
          hasBorderTop: false,
          labelColor: 'var(--text-2)',
          descColor: 'var(--text-3)',
        })}

      </div>
    </BottomSheet>
  )
}
