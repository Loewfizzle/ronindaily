import { subscribeToPush } from '../utils/push'

interface PushBannerProps {
  userId: string
  onDismiss: () => void
}

export default function PushBanner({ userId, onDismiss }: PushBannerProps) {
  const handleAllow = async () => {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await subscribeToPush(userId)
    } else {
      localStorage.setItem('ronin_push_declined', '1')
    }
    onDismiss()
  }

  const handleDecline = () => {
    localStorage.setItem('ronin_push_declined', '1')
    onDismiss()
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'var(--surface)',
      borderTop: '1px solid var(--border-mid)',
      padding: '1rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
    }}>
      <span style={{ fontSize: '0.82rem', color: 'var(--text-2)', letterSpacing: '0.03em', lineHeight: 1.4 }}>
        Get your daily mission reminder.
      </span>
      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            background: 'none', border: '1px solid var(--border-mid)', color: 'var(--text-3)',
            fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '0.5rem 0.85rem', fontFamily: 'Inter, sans-serif',
            minHeight: '44px',
          }}
        >
          Not now
        </button>
        <button
          onClick={handleAllow}
          style={{
            background: 'var(--red)', border: 'none', color: 'var(--text)',
            fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: 'pointer', padding: '0.5rem 0.85rem', fontFamily: 'Inter, sans-serif',
            minHeight: '44px', fontWeight: 600,
          }}
        >
          Allow
        </button>
      </div>
    </div>
  )
}
