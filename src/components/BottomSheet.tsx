import { useEffect, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

let openSheetCount = 0

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}

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
        <div className="sheet-handle" style={{ display: 'flex', justifyContent: 'center', padding: '0.7rem 0 0' }}>
          <div style={{ width: '2.25rem', height: '2px', background: 'var(--border-mid)', borderRadius: '1px' }} />
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.5rem',
          borderBottom: '1px solid var(--border)',
        }}>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.28em', color: 'var(--text-2)', textTransform: 'uppercase' }}>
            {title}
          </span>
          <button onClick={onClose} aria-label="Close" className="close-btn">
            <CloseIcon />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>{children}</div>
      </div>
    </div>
  )
}
