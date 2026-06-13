import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

// Reference-counted scroll lock so nested sheets don't release the lock
// when the inner one closes while the outer is still open.
let openSheetCount = 0

export default function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return
    openSheetCount++
    document.body.style.overflow = 'hidden'
    return () => {
      openSheetCount = Math.max(0, openSheetCount - 1)
      if (openSheetCount === 0) document.body.style.overflow = ''
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
        {/* Drag handle — hidden on desktop where sheets render as centered modals */}
        <div className="sheet-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '2.25rem', height: '2px', background: 'var(--border-mid)', borderRadius: '1px' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.58rem', letterSpacing: '0.28em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
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
