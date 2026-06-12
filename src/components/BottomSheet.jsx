import { useEffect } from 'react'

export default function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return (
    <div
      className="sheet-backdrop"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="sheet-panel">
        {/* Drag handle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '0.7rem 0 0',
          }}
        >
          <div
            style={{
              width: '2.25rem',
              height: '2px',
              background: 'var(--border-mid)',
              borderRadius: '1px',
            }}
          />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span
            style={{
              fontSize: '0.58rem',
              letterSpacing: '0.28em',
              color: 'var(--text-2)',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: '1.1rem',
              padding: 0,
              fontFamily: 'inherit',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.5rem',
              height: '1.5rem',
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  )
}
